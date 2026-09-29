const crypto = require('node:crypto')
const COLLECTION = 'staffTimesheetCorrections'
const ANCHOR = Date.UTC(2026, 7, 17)
const DAY = 86400000
const fail = (status, message) => Object.assign(new Error(message), { status })
const ownerId = (email, period) => crypto.createHash('sha256').update(`${email}|${period}`).digest('hex')
const periodDates = (period) => Array.from({ length: 10 }, (_, i) =>
  new Date(ANCHOR + (period * 14 + Math.floor(i / 5) * 7 + i % 5) * DAY).toISOString().slice(0, 10))
const validateRows = (rows, period) => {
  if (!Array.isArray(rows) || rows.length > 10) throw fail(400, 'Invalid corrections.')
  const dates = new Set(periodDates(period))
  const seen = new Set()
  return rows.map((row) => {
    if (!row || !dates.has(row.date) || seen.has(row.date)) throw fail(400, 'Invalid or duplicate correction date.')
    seen.add(row.date)
    if (row.hours !== null && (typeof row.hours !== 'number' || !Number.isFinite(row.hours) ||
      row.hours < 0 || row.hours > 24 || Math.abs(row.hours * 4 - Math.round(row.hours * 4)) > 0.000001)) {
      throw fail(400, 'Corrected hours must be from 0 to 24 in 15-minute increments.')
    }
    if (row.note !== null && (typeof row.note !== 'string' || row.note.length > 500)) throw fail(400, 'Comment is too long.')
    if (typeof row.reason !== 'string' || row.reason.trim().length < 3 || row.reason.length > 500) {
      throw fail(400, 'Explain each correction (3–500 characters).')
    }
    if (row.hours === null && row.note === null) throw fail(400, 'Correction has no changes.')
    return { date: row.date, hours: row.hours, note: row.note, reason: row.reason.trim() }
  })
}

const createHandler = ({ admin, reviewerEmails = [], apiKey }) => async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).send('')
  if (req.method !== 'POST') return res.status(405).json({ message: 'Only POST allowed.' })
  try {
    const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1]
    if (!token) throw fail(401, 'Sign in required.')
    let identity
    try { identity = await admin.auth().verifyIdToken(token, true) } catch { throw fail(401, 'Sign in again.') }
    const email = String(identity.email || '').trim().toLowerCase()
    if (!email || identity.email_verified !== true) throw fail(403, 'Use a verified staff email account.')
    const { action, periodIndex, revision } = req.body || {}
    const currentPeriod = Math.floor((Date.now() - ANCHOR) / (14 * DAY))
    if (!Number.isInteger(periodIndex) || periodIndex < 0 || periodIndex > currentPeriod) throw fail(400, 'Invalid pay period.')
    const db = admin.firestore()
    const reviewerRecord = await db.collection('timekeepingAdminAccess').doc(crypto.createHash('sha256').update(email).digest('hex')).get()
    const isReviewer = identity.timekeepingAdmin === true || reviewerEmails.map((e) => e.toLowerCase()).includes(email) ||
      (reviewerRecord.exists && reviewerRecord.data().email === email)
    if (['adminList', 'review', 'summarize'].includes(action)) {
      // Legacy Firestore roles are client-writable. Never use them to grant
      // access to another person\'s correction records.
      if (!isReviewer) throw fail(403, 'Timesheet review access must be configured by the school administrator.')
      if (action === 'adminList') {
        const snap = await db.collection(COLLECTION).where('periodIndex', '==', periodIndex).get()
        return res.json({ corrections: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })
      }
      if (action === 'summarize') {
        if (!apiKey) throw fail(503, 'AI summaries are not configured.')
        const snap = await db.collection(COLLECTION).where('periodIndex', '==', periodIndex).get()
        const pending = snap.docs.filter((d) => d.data().status === 'pending')
        const entries = await require('./timekeepingCorrectionSummary').summarizeCorrections(
          pending.map((d) => ({ id: d.id, ...d.data() })), apiKey)
        return res.json({ entries })
      }
      const decisions = req.body.decisions
      if (!Array.isArray(decisions) || decisions.length > 100 || new Set(decisions.map((d) => d.id)).size !== decisions.length ||
        decisions.some((d) => typeof d.id !== 'string' || !/^[a-f0-9]{64}$/.test(d.id) ||
          !Number.isInteger(d.revision) || !['approved', 'rejected'].includes(d.status))) throw fail(400, 'Invalid review decisions.')
      await db.runTransaction(async (transaction) => {
        const docs = await Promise.all(decisions.map((d) => transaction.get(db.collection(COLLECTION).doc(d.id))))
        docs.forEach((snap, i) => {
          const decision = decisions[i]
          if (!snap.exists || snap.data().periodIndex !== periodIndex || snap.data().revision !== decision.revision) {
            throw fail(409, 'A correction changed. Reload before approving it.')
          }
        })
        docs.forEach((snap, i) => {
          const change = { status: decisions[i].status, reviewedBy: email, reviewedAt: new Date().toISOString() }
          if (change.status === 'approved') {
            change.approved = { revision: snap.data().revision, rows: snap.data().rows,
              reviewedBy: email, reviewedAt: change.reviewedAt }
          }
          transaction.update(snap.ref, change)
          transaction.set(snap.ref.collection('history').doc(), { ...change, revision: decisions[i].revision, action: 'review' })
        })
      })
      return res.json({ saved: true })
    }
    if (!['load', 'save'].includes(action)) throw fail(400, 'Invalid action.')
    let person = null
    for (const collection of ['faculty', 'admins']) {
      for (const field of ['contact.email', 'personalInfo.email', 'email']) {
        const snap = await db.collection(collection).where(field, '==', email).get()
        const found = snap.docs.find((d) => d.data().active !== false)
        if (found) { person = found.data(); break }
      }
      if (person) break
    }
    // The verified sign-in owns this timesheet. Roster matches only enrich the
    // display name; missing or stale roster emails must not block own access.
    person ||= { firstName: identity.name || '' }
    const ref = db.collection(COLLECTION).doc(ownerId(email, periodIndex))
    if (action === 'save') {
      if (!Number.isInteger(revision) || revision < 0) throw fail(400, 'Invalid correction version.')
      const rows = validateRows(req.body.rows, periodIndex)
      await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(ref)
        const previous = snap.exists ? snap.data() : null
        if ((previous?.revision || 0) !== revision) throw fail(409, 'This timesheet changed in another session. Reload before saving.')
        const change = { uid: identity.uid, email, periodIndex, rows, revision: revision + 1,
          status: 'pending', submittedAt: new Date().toISOString(), submittedBy: email,
          approved: previous?.approved || null }
        transaction.set(ref, change)
        transaction.set(ref.collection('history').doc(), { action: 'submit', before: previous, after: change })
      })
      return res.json({ saved: true, revision: revision + 1 })
    }
    const [settingsSnap, correctionSnap, byEmail, byUid] = await Promise.all([
      db.doc('systemSettings/timekeeping').get(), ref.get(),
      db.collection('staffCheckins').where('email', '==', email).get(),
      db.collection('staffCheckins').where('uid', '==', identity.uid).get(),
    ])
    const settings = settingsSnap.data() || {}
    const ownOverride = settings.staffOverrides?.[email]
    const days = new Set(periodDates(periodIndex))
    const records = [...new Map([...byEmail.docs, ...byUid.docs].map((d) => [d.id, d])).values()].flatMap((doc) => {
      const data = doc.data()
      const at = data.createdAt?.toDate?.() || new Date(data.clientCreatedAt)
      if (Number.isNaN(at.getTime()) || !days.has(at.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }))) return []
      return [{ id: doc.id, email, type: data.type, notes: data.notes || '', at: at.toISOString() }]
    })
    return res.json({ email, person: { firstName: person.personalInfo?.firstName || person.firstName || '',
      lastName: person.personalInfo?.lastName || person.lastName || '' },
      settings: { expectedCheckInTime: settings.expectedCheckInTime || '08:00',
        expectedCheckOutTime: settings.expectedCheckOutTime || '16:00', graceMinutes: settings.graceMinutes ?? 10,
        staffOverrides: ownOverride ? { [email]: ownOverride } : {} }, records,
      correction: correctionSnap.exists ? { id: ref.id, ...correctionSnap.data() } : null })
  } catch (error) {
    if (!error.status) console.error('Staff timesheet request failed', error.message)
    return res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not load or save the timesheet.' })
  }
}
module.exports = { createHandler, validateRows, periodDates, ownerId }
