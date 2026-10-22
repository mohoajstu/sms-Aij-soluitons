const crypto = require('node:crypto')
const SUPER_ADMIN_EMAIL = 'nuralhuda.co@gmail.com'
const SESSION_COLLECTION = 'actAsSessions'
const SESSION_DURATION = 30 * 60 * 1000
const fail = (status, message) => Object.assign(new Error(message), { status })
const norm = (value) => String(value || '').trim().toLowerCase()
const emailOf = (data) => norm(data.contact?.email || data.personalInfo?.email || data.email)
const adminRole = (value) => ['admin', 'schooladmin', 'school_admin', 'school-admin', 'superadmin', 'super_admin'].includes(norm(value))
const privileged = (data) => [data.role, data.primaryRole, data.personalInfo?.role,
  data.personalInfo?.primaryRole].some(adminRole)

// Never revoke the teacher's refresh tokens when ending an administrator's session.
// Rules and server APIs check this separate session instead.
async function validateActAsSession(admin, identity, now = Date.now()) {
  if (!identity.actAsSession) return
  const snap = await admin.firestore().collection(SESSION_COLLECTION).doc(identity.actAsSession).get()
  const session = snap.data()
  if (!snap.exists || session.status !== 'active' || session.targetUid !== identity.uid ||
    session.actorUid !== identity.actAsActor || session.expiresAt <= now) {
    throw fail(403, 'Your Act as session has ended. Return to your admin account.')
  }
}

function createHandler({ admin, now = Date.now }) {
  const db = admin.firestore()
  const auth = admin.auth()
  async function teacher(profileId) {
    if (typeof profileId !== 'string' || !/^[a-zA-Z0-9_-]{1,150}$/.test(profileId)) throw fail(400, 'Select a teacher.')
    const snap = await db.collection('faculty').doc(profileId).get()
    const data = snap.data()
    if (!snap.exists || data.active === false || data.isTestAccount === true || privileged(data)) throw fail(403, 'Select an active teacher account.')
    const email = emailOf(data)
    if (!email || email === SUPER_ADMIN_EMAIL) throw fail(403, 'Select a teacher account other than your own.')
    let user
    try { user = await auth.getUserByEmail(email) } catch (error) {
      if (error.code === 'auth/user-not-found') throw fail(409, 'This teacher must sign in once before you can act as them.')
      throw error
    }
    if (user.disabled || !user.emailVerified) throw fail(403, 'This teacher needs an enabled, verified account.')
    if (user.customClaims?.admin || user.customClaims?.superAdmin) throw fail(403, 'Administrator accounts cannot be selected.')
    const userProfile = await db.collection('users').doc(user.uid).get()
    if (privileged(userProfile.data() || {})) throw fail(403, 'Administrator accounts cannot be selected.')
    for (const field of ['contact.email', 'personalInfo.email', 'email']) {
      const admins = await db.collection('admins').where(field, '==', email).get()
      if (admins.docs.some((d) => d.data().active !== false && d.data().isTestAccount !== true)) throw fail(403, 'Administrator accounts cannot be selected.')
      const faculty = await db.collection('faculty').where(field, '==', email).get()
      const active = faculty.docs.filter((d) => d.data().active !== false && d.data().isTestAccount !== true)
      if (active.some((d) => d.id !== profileId)) throw fail(409, 'This email belongs to multiple teacher profiles. Resolve the duplicate first.')
    }
    const name = [data.personalInfo?.firstName || data.firstName, data.personalInfo?.lastName || data.lastName].filter(Boolean).join(' ') || email
    return { targetUid: user.uid, targetEmail: email, targetName: name, profileId }
  }
  return async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.set('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.status(204).send('')
    if (req.method !== 'POST') return res.status(405).json({ message: 'Only POST allowed.' })
    try {
      const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1]
      if (!token) throw fail(401, 'Sign in required.')
      let actor
      try { actor = await auth.verifyIdToken(token, true) } catch { throw fail(401, 'Sign in again.') }
      if (actor.actAsSession || norm(actor.email) !== SUPER_ADMIN_EMAIL || actor.email_verified !== true) throw fail(403, 'Super-admin access required.')
      const { action, profileId, sessionId } = req.body || {}
      if (action === 'list') {
        const snap = await db.collection('faculty').get()
        const teachers = snap.docs.filter((d) => d.data().active !== false && d.data().isTestAccount !== true && !privileged(d.data()) && emailOf(d.data()) && emailOf(d.data()) !== SUPER_ADMIN_EMAIL)
          .map((d) => ({ id: d.id, email: emailOf(d.data()), name: [d.data().personalInfo?.firstName || d.data().firstName,
            d.data().personalInfo?.lastName || d.data().lastName].filter(Boolean).join(' ') || emailOf(d.data()) }))
          .sort((a, b) => a.name.localeCompare(b.name))
        return res.json({ teachers })
      }
      if (action === 'start') {
        const target = await teacher(profileId)
        const ref = db.collection(SESSION_COLLECTION).doc(crypto.randomUUID())
        const session = { ...target, actorUid: actor.uid, actorEmail: norm(actor.email), status: 'active',
          startedAt: now(), expiresAt: now() + SESSION_DURATION }
        await ref.set(session)
        try {
          const customToken = await auth.createCustomToken(target.targetUid, { actAsSession: ref.id, actAsActor: actor.uid })
          return res.json({ customToken, session: { id: ref.id, ...session } })
        } catch (error) { await ref.update({ status: 'failed', endedAt: now() }); throw error }
      }
      if (!['resume', 'end'].includes(action) || typeof sessionId !== 'string' || !/^[a-f0-9-]{36}$/.test(sessionId)) throw fail(400, 'Invalid Act as request.')
      const ref = db.collection(SESSION_COLLECTION).doc(sessionId)
      const snap = await ref.get()
      const session = snap.data()
      if (!snap.exists || session.actorUid !== actor.uid) throw fail(403, 'This session does not belong to you.')
      if (action === 'end') {
        if (session.status === 'active') await ref.update({ status: 'ended', endedAt: now() })
        return res.json({ ended: true })
      }
      if (session.status !== 'active' || session.expiresAt <= now()) throw fail(403, 'Your Act as session has ended. Return to your admin account.')
      const target = await teacher(session.profileId)
      if (target.targetUid !== session.targetUid || target.targetEmail !== session.targetEmail) throw fail(403, 'This teacher account has changed. Start a new session.')
      const customToken = await auth.createCustomToken(session.targetUid, { actAsSession: ref.id, actAsActor: actor.uid })
      return res.json({ customToken, session: { id: ref.id, ...session } })
    } catch (error) {
      if (!error.status) console.error('Act as request failed:', error.code || error.message)
      return res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not start or update Act as. Try again.' })
    }
  }
}
module.exports = { createHandler, validateActAsSession, SUPER_ADMIN_EMAIL, SESSION_COLLECTION }
