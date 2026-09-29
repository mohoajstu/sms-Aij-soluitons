const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHandler, validateRows, periodDates, ownerId } = require('./staffTimesheets')
const email = 'teacher@tarbiyahlearning.ca'
const row = { date: '2026-09-14', hours: 7.5, note: 'Prep at home', reason: 'Forgot my comment' }
const fixture = () => {
  const store = new Map([
    ['faculty/t1', { contact: { email }, personalInfo: { firstName: 'Teacher' } }],
    ['staffCheckins/own', { email, uid: 'teacher', type: 'in', notes: 'Original', createdAt: { toDate: () => new Date('2026-09-14T12:00:00Z') } }],
    ['staffCheckins/other', { email: 'other@tarbiyahlearning.ca', uid: 'other', type: 'in', notes: 'Private', createdAt: { toDate: () => new Date('2026-09-14T12:00:00Z') } }],
    ['systemSettings/timekeeping', { expectedCheckInTime: '08:00', expectedCheckOutTime: '15:30', staffOverrides: { 'other@tarbiyahlearning.ca': { secret: true } } }],
  ])
  let id = 0
  const valueAt = (data, field) => field.split('.').reduce((acc, key) => acc?.[key], data)
  const snapshot = (path) => ({ id: path.split('/').at(-1), ref: doc(path), exists: store.has(path), data: () => store.get(path) })
  const collection = (path, filters = []) => ({
    doc: (key = `history-${++id}`) => doc(`${path}/${key}`),
    where: (field, op, value) => collection(path, [...filters, { field, value }]),
    get: async () => ({ docs: [...store.keys()].filter((key) => key.startsWith(`${path}/`) &&
      key.split('/').length === path.split('/').length + 1 && filters.every((filter) =>
        valueAt(store.get(key), filter.field) === filter.value)).map(snapshot) }),
  })
  const doc = (path) => ({ path, collection: (name) => collection(`${path}/${name}`), get: async () => snapshot(path) })
  const db = { doc, collection, runTransaction: async (callback) => {
    const writes = []
    await callback({ get: async (ref) => snapshot(ref.path), set: (ref, data) => writes.push(() => store.set(ref.path, data)),
      update: (ref, data) => writes.push(() => store.set(ref.path, { ...store.get(ref.path), ...data })) })
    writes.forEach((write) => write())
  } }
  const identities = { teacher: { uid: 'teacher', email, email_verified: true },
    unverified: { uid: 'x', email, email_verified: false },
    reviewer: { uid: 'reviewer', email: 'reviewer@tarbiyahlearning.ca', email_verified: true },
    testStaff: { uid: 'test-staff', email: 'test.staff@example.com', email_verified: true },
    outsider: { uid: 'other', email: 'outside@gmail.com', email_verified: true } }
  const admin = { firestore: () => db, auth: () => ({ verifyIdToken: async (token) => {
    if (!identities[token]) throw new Error('Bad token')
    return identities[token]
  } }) }
  const call = async (token, body, reviewers = []) => {
    let code = 200
    let result
    const res = { set: () => {}, status: (status) => { code = status; return res },
      json: (value) => { result = value }, send: () => {} }
    await createHandler({ admin, reviewerEmails: reviewers })({ method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body }, res)
    return { code, result }
  }
  return { call, store }
}
test('validates dates, duplicate days, quarter hours, reasons, and numeric types', () => {
  assert.equal(periodDates(2)[9], '2026-09-25')
  assert.equal(validateRows([row], 2)[0].hours, 7.5)
  for (const invalid of [{ ...row, hours: '7.5' }, { ...row, hours: 7.1 }, { ...row, hours: -1 },
    { ...row, date: '2026-09-19' }, { ...row, reason: '' }, { ...row, note: 'x'.repeat(501) }]) {
    assert.throws(() => validateRows([invalid], 2))
  }
  assert.throws(() => validateRows([row, row], 2))
})
test('rejects missing auth, unverified email, and unconfigured reviewers', async () => {
  const { call } = fixture()
  assert.equal((await call(null, { action: 'load', periodIndex: 2 })).code, 401)
  assert.equal((await call('unverified', { action: 'load', periodIndex: 2 })).code, 403)
  assert.equal((await call('teacher', { action: 'adminList', periodIndex: 2 })).code, 403)
})
test('missing or inactive roster records do not block own data or grant access to others', async () => {
  const { call, store } = fixture()
  store.delete('faculty/t1')
  for (const inactive of [false, true]) {
    if (inactive) store.set('faculty/t1', { email, active: false })
    const loaded = await call('teacher', { action: 'load', periodIndex: 2, email: 'other@tarbiyahlearning.ca', uid: 'other' })
    assert.equal(loaded.code, 200)
    assert.deepEqual(loaded.result.records.map((record) => record.id), ['own'])
    assert.deepEqual(loaded.result.settings.staffOverrides, {})
  }
  assert.equal((await call('teacher', { action: 'save', periodIndex: 2, revision: 0, rows: [row], email: 'other@tarbiyahlearning.ca' })).code, 200)
  assert.equal(store.get(`staffTimesheetCorrections/${ownerId(email, 2)}`).email, email)
  for (const action of ['adminList', 'review', 'summarize']) {
    assert.equal((await call('teacher', { action, periodIndex: 2 })).code, 403)
  }
  const outsider = await call('outsider', { action: 'load', periodIndex: 2, email })
  assert.equal(outsider.code, 200)
  assert.deepEqual(outsider.result.records.map((record) => record.id), ['other'])
  assert.equal(outsider.result.correction, null)
})
test('returns only authenticated owner data and strips other staff schedules', async () => {
  const { call } = fixture()
  const { code, result } = await call('teacher', { action: 'load', periodIndex: 2, email: 'other@tarbiyahlearning.ca', uid: 'other' })
  assert.equal(code, 200)
  assert.equal(result.email, email)
  assert.deepEqual(result.records.map((record) => record.id), ['own'])
  assert.deepEqual(result.settings.staffOverrides, {})
})
test('allows a verified test faculty account to view and correct only its own timesheet', async () => {
  const { call, store } = fixture()
  store.set('faculty/test-staff', { contact: { email: 'test.staff@example.com' },
    personalInfo: { firstName: 'Test' }, isTestAccount: true })
  store.set('staffCheckins/test-own', { email: 'test.staff@example.com', uid: 'test-staff',
    type: 'in', notes: 'My test note', createdAt: { toDate: () => new Date('2026-09-14T12:00:00Z') } })
  const loaded = await call('testStaff', { action: 'load', periodIndex: 2, email })
  assert.equal(loaded.code, 200)
  assert.equal(loaded.result.email, 'test.staff@example.com')
  assert.deepEqual(loaded.result.records.map((record) => record.id), ['test-own'])
  assert.equal((await call('testStaff', { action: 'save', periodIndex: 2, revision: 0,
    rows: [{ ...row, note: 'Corrected test note' }] })).code, 200)
  assert.equal((await call('testStaff', { action: 'adminList', periodIndex: 2 })).code, 403)
})
test('saves owner corrections, preserves original taps, and detects stale saves', async () => {
  const { call, store } = fixture()
  const body = { action: 'save', periodIndex: 2, revision: 0, rows: [row], email: 'other@tarbiyahlearning.ca', uid: 'other' }
  assert.equal((await call('teacher', body)).code, 200)
  const saved = store.get(`staffTimesheetCorrections/${ownerId(email, 2)}`)
  assert.equal(saved.email, email)
  assert.equal(saved.uid, 'teacher')
  assert.equal(saved.status, 'pending')
  assert.equal(saved.revision, 1)
  assert.equal(store.get('staffCheckins/own').notes, 'Original')
  assert.equal((await call('teacher', body)).code, 409)
  assert.equal([...store.keys()].filter((key) => key.includes('/history/')).length, 1)
})
test('reviewers must be allowlisted and approve the exact current revision', async () => {
  const { call, store } = fixture()
  await call('teacher', { action: 'save', periodIndex: 2, revision: 0, rows: [row] })
  const body = { action: 'review', periodIndex: 2, decisions: [{ id: ownerId(email, 2), revision: 1, status: 'approved' }] }
  assert.equal((await call('reviewer', body)).code, 403)
  const reviewers = ['reviewer@tarbiyahlearning.ca']
  assert.equal((await call('reviewer', { ...body, decisions: [{ ...body.decisions[0], revision: 0 }] }, reviewers)).code, 409)
  assert.equal((await call('reviewer', body, reviewers)).code, 200)
  assert.equal(store.get(`staffTimesheetCorrections/${ownerId(email, 2)}`).status, 'approved')
  await call('teacher', { action: 'save', periodIndex: 2, revision: 1, rows: [{ ...row, hours: 7.25 }] })
  assert.equal(store.get(`staffTimesheetCorrections/${ownerId(email, 2)}`).status, 'pending')
  assert.equal(store.get(`staffTimesheetCorrections/${ownerId(email, 2)}`).approved.revision, 1)
  assert.equal(store.get(`staffTimesheetCorrections/${ownerId(email, 2)}`).approved.rows[0].hours, 7.5)
  assert.equal((await call('reviewer', body, reviewers)).code, 409)
  await call('reviewer', { ...body, decisions: [{ ...body.decisions[0], revision: 2, status: 'rejected' }] }, reviewers)
  assert.equal(store.get(`staffTimesheetCorrections/${ownerId(email, 2)}`).approved.rows[0].hours, 7.5)
})
test('a server-managed admin access record grants review without a manual email allowlist', async () => {
  const { call, store } = fixture()
  const reviewerEmail = 'reviewer@tarbiyahlearning.ca'
  const crypto = require('node:crypto')
  const accessId = crypto.createHash('sha256').update(reviewerEmail).digest('hex')
  store.set(`timekeepingAdminAccess/${accessId}`, { email: reviewerEmail })
  assert.equal((await call('reviewer', { action: 'adminList', periodIndex: 2 })).code, 200)
  store.set(`timekeepingAdminAccess/${accessId}`, { email: 'someoneelse@tarbiyahlearning.ca' })
  assert.equal((await call('reviewer', { action: 'adminList', periodIndex: 2 })).code, 403)
})
