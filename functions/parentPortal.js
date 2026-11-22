// Parent portal API. Parents sign in with one of their children's school
// accounts. The family is every child linked to that child's guardians, and a
// link counts only when both records agree: the student names the guardian in
// students.parents.* and the guardian lists the student in parents.students.
// Every read is checked against that family on the server.
const { validateActAsSession } = require('./actAs')

const fail = (status, message) => Object.assign(new Error(message), { status })
const norm = (value) => String(value || '').trim().toLowerCase()
const ID = /^[A-Za-z0-9_-]{1,150}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_RANGE_DAYS = 400
const PUBLISHED = ['approved', 'published']

const usable = (snap) => snap.exists && snap.data()?.active !== false
const guardianIdsOf = (student) => Object.values(student?.parents || {})
  .map((link) => link && typeof link === 'object' ? link.tarbiyahId : null)
  .filter((id) => typeof id === 'string' && ID.test(id))
const childIdsOf = (guardian) => (Array.isArray(guardian?.students) ? guardian.students : [])
  .map((entry) => typeof entry === 'string' ? entry : entry?.studentId || entry?.studentID)
  .filter((id) => typeof id === 'string' && ID.test(id))
const nameOf = (id, data) => [data?.personalInfo?.firstName, data?.personalInfo?.lastName]
  .map((part) => String(part || '').trim()).filter(Boolean).join(' ') || id
const gradeOf = (data) => String(data?.schooling?.program || data?.grade || data?.personalInfo?.grade || '').trim()

// Timestamps do not survive JSON; send ISO strings the browser can parse.
const plain = (value) => {
  if (value == null) return value
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  if (typeof value === 'object' && typeof value._seconds === 'number') return new Date(value._seconds * 1000).toISOString()
  return value
}

async function resolveFamily(db, email) {
  const address = norm(email)
  if (!address) throw fail(403, 'Sign in with your child\'s school account.')
  const seeds = new Map()
  // Older records may keep the address with capital letters.
  for (const candidate of [...new Set([address, String(email).trim()])]) {
    const snap = await db.collection('students').where('contact.email', '==', candidate).get()
    for (const d of snap.docs) if (d.data()?.active !== false) seeds.set(d.id, d.data())
  }
  if (!seeds.size) throw fail(404, 'No student is linked to this account. Please contact the school.')

  const students = new Map(seeds)
  const guardians = new Map()
  const loadStudent = async (id) => {
    if (!students.has(id)) {
      const snap = await db.collection('students').doc(id).get()
      students.set(id, usable(snap) ? snap.data() : null)
    }
    return students.get(id)
  }
  const loadGuardian = async (id) => {
    if (!guardians.has(id)) {
      const snap = await db.collection('parents').doc(id).get()
      guardians.set(id, usable(snap) ? snap.data() : null)
    }
    return guardians.get(id)
  }

  const family = new Set(seeds.keys())
  for (const [seedId, seed] of seeds) {
    for (const guardianId of guardianIdsOf(seed)) {
      const guardian = await loadGuardian(guardianId)
      const children = childIdsOf(guardian)
      if (!children.includes(seedId)) continue
      for (const childId of children) {
        if (family.has(childId)) continue
        const child = await loadStudent(childId)
        if (child && guardianIdsOf(child).includes(guardianId)) family.add(childId)
      }
    }
  }
  const children = [...family].map((id) => ({ id, name: nameOf(id, students.get(id)), grade: gradeOf(students.get(id)) }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
  return { children, signedInStudentIds: [...seeds.keys()] }
}

function requireChild(family, studentId) {
  if (typeof studentId !== 'string' || !ID.test(studentId)) throw fail(400, 'Select a child.')
  const child = family.children.find((c) => c.id === studentId)
  if (!child) throw fail(403, 'This student is not linked to your family.')
  return child
}

async function attendanceFor(db, documentId, studentId, startDate, endDate) {
  if (!DATE.test(startDate || '') || !DATE.test(endDate || '') || startDate > endDate) throw fail(400, 'Choose a valid date range.')
  const days = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000
  if (!Number.isFinite(days) || days > MAX_RANGE_DAYS) throw fail(400, 'Choose a date range of one school year or less.')
  const snap = await db.collection('attendance').where(documentId, '>=', startDate).where(documentId, '<=', endDate).get()
  const records = []
  for (const daily of snap.docs) {
    const data = daily.data() || {}
    for (const course of data.courses || []) {
      for (const student of course.students || []) {
        if (student?.studentId !== studentId) continue
        records.push({ date: data.date || daily.id, class: course.courseTitle || 'Class', status: student.status || '—', note: student.note || '' })
      }
    }
  }
  return records.sort((a, b) => b.date.localeCompare(a.date))
}

const REPORT_FIELDS = ['schoolYear', 'term', 'type', 'reportCardType', 'reportCardTypeName', 'grade',
  'createdAt', 'createdAtMs', 'completedAt', 'approvedAt', 'status', 'url']
async function reportCardsFor(db, child) {
  let snap = await db.collection('reportCards').where('tarbiyahId', '==', child.id).where('status', 'in', PUBLISHED).get()
  let docs = snap.docs
  if (!docs.length) {
    // Legacy reports were keyed by a slug of the student's name. Never accept one
    // that names a different student.
    snap = await db.collection('reportCards').where('studentName', '==', child.name.replace(/\s+/g, '-'))
      .where('status', 'in', PUBLISHED).get()
    docs = snap.docs.filter((d) => !d.data()?.tarbiyahId || d.data().tarbiyahId === child.id)
  }
  return docs.map((d) => {
    const data = d.data() || {}
    const report = { id: d.id }
    for (const field of REPORT_FIELDS) if (data[field] !== undefined) report[field] = plain(data[field])
    return report
  })
}

function createHandler({ admin }) {
  const db = admin.firestore()
  const documentId = admin.firestore.FieldPath.documentId()
  return async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.set('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.status(204).send('')
    if (req.method !== 'POST') return res.status(405).json({ message: 'Only POST allowed.' })
    try {
      const token = /^Bearer (.+)$/.exec(req.headers?.authorization || '')?.[1]
      if (!token) throw fail(401, 'Sign in required.')
      let identity
      try { identity = await admin.auth().verifyIdToken(token, true) } catch { throw fail(401, 'Sign in again to continue.') }
      await validateActAsSession(admin, identity)
      if (identity.email_verified !== true) throw fail(403, 'Sign in with a verified school account.')
      const { action, studentId, startDate, endDate } = req.body || {}
      const family = await resolveFamily(db, identity.email)
      if (action === 'family') {
        const first = await db.collection('attendance').orderBy(documentId).limit(1).get()
        return res.status(200).json({ ...family, earliestAttendanceDate: first.docs[0]?.id || null })
      }
      if (action === 'attendance') {
        requireChild(family, studentId)
        return res.status(200).json({ records: await attendanceFor(db, documentId, studentId, startDate, endDate) })
      }
      if (action === 'reportCards') {
        return res.status(200).json({ reports: await reportCardsFor(db, requireChild(family, studentId)) })
      }
      throw fail(400, 'Unknown action.')
    } catch (error) {
      if (!error.status) console.error('parentPortal error:', error)
      return res.status(error.status || 500).json({ message: error.status ? error.message : 'Something went wrong. Please try again.' })
    }
  }
}

module.exports = { createHandler, resolveFamily }
