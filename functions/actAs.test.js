const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHandler, validateActAsSession, SUPER_ADMIN_EMAIL } = require('./actAs')

const fixture = () => {
  let clock = 1000
  const records = new Map([['faculty/t1', { contact: { email: 'teacher@school.ca' }, personalInfo: { firstName: 'Ada', lastName: 'Teacher' } }]])
  const minted = []
  const accounts = { 'teacher@school.ca': { uid: 'teacher-uid', emailVerified: true, disabled: false } }
  const identities = {
    admin: { uid: 'admin-uid', email: SUPER_ADMIN_EMAIL, email_verified: true },
    other: { uid: 'other-uid', email: 'other@school.ca', email_verified: true, admin: true },
    unverified: { uid: 'admin-uid', email: SUPER_ADMIN_EMAIL, email_verified: false },
    nested: { uid: 'admin-uid', email: SUPER_ADMIN_EMAIL, email_verified: true, actAsSession: 'existing' },
  }
  const at = (data, key) => key.split('.').reduce((value, field) => value?.[field], data)
  const doc = (path) => ({ id: path.split('/').at(-1), get: async () => ({ exists: records.has(path), data: () => records.get(path) }),
    set: async (data) => records.set(path, data), update: async (data) => records.set(path, { ...records.get(path), ...data }) })
  const collection = (path, filters = []) => ({ doc: (id) => doc(`${path}/${id}`),
    where: (field, op, value) => collection(path, [...filters, { field, value }]),
    get: async () => ({ docs: [...records].filter(([key, data]) => key.startsWith(`${path}/`) && key.split('/').length === 2 &&
      filters.every(({ field, value }) => at(data, field) === value)).map(([key, data]) => ({ id: key.split('/').at(-1), data: () => data })) }) })
  const auth = { verifyIdToken: async (token, revoked) => {
    assert.equal(revoked, true)
    if (!identities[token]) throw new Error('Invalid token')
    return identities[token]
  }, getUserByEmail: async (email) => {
    if (!accounts[email]) throw Object.assign(new Error('Missing user'), { code: 'auth/user-not-found' })
    return accounts[email]
  }, createCustomToken: async (uid, claims) => { minted.push({ uid, claims }); return 'custom-token' } }
  const admin = { auth: () => auth, firestore: () => ({ collection }) }
  const handler = createHandler({ admin, now: () => clock })
  const call = async (token, body, method = 'POST') => {
    let code = 200, result
    const res = { set() {}, status(value) { code = value; return this }, json(value) { result = value }, send() {} }
    await handler({ method, headers: token ? { authorization: `Bearer ${token}` } : {}, body }, res)
    return { code, result }
  }
  return { records, minted, accounts, identities, auth, admin, call, tick: (value) => { clock = value } }
}

test('only the verified allowlisted administrator can list or start; nested sessions are rejected', async () => {
  const f = fixture()
  for (const token of [null, 'bad', 'other', 'unverified', 'nested']) {
    assert.ok([401, 403].includes((await f.call(token, { action: 'start', profileId: 't1' })).code))
    assert.ok([401, 403].includes((await f.call(token, { action: 'list' })).code))
  }
  assert.equal(f.minted.length, 0)
  assert.equal((await f.call('admin', {}, 'GET')).code, 405)
})
test('teacher directory excludes inactive, test and administrative profiles', async () => {
  const f = fixture()
  f.records.set('faculty/inactive', { email: 'a@school.ca', active: false })
  f.records.set('faculty/test', { email: 'b@school.ca', isTestAccount: true })
  f.records.set('faculty/admin', { email: 'c@school.ca', role: 'Admin' })
  assert.deepEqual((await f.call('admin', { action: 'list' })).result.teachers,
    [{ id: 't1', email: 'teacher@school.ca', name: 'Ada Teacher' }])
})
test('every Act as action rejects other administrators and spoofed request-body identities', async () => {
  const f = fixture()
  f.identities.alias = { uid: 'alias-uid', email: 'nuralhuda.co+alias@gmail.com', email_verified: true }
  f.identities.lookalike = { uid: 'lookalike-uid', email: 'nuralhuda.co@gmail.com.example.com', email_verified: true }
  for (const token of ['other', 'alias', 'lookalike', 'unverified', 'nested']) {
    for (const action of ['list', 'start', 'resume', 'end']) {
      const response = await f.call(token, { action, profileId: 't1', sessionId: '11111111-1111-1111-1111-111111111111',
        email: SUPER_ADMIN_EMAIL, actorEmail: SUPER_ADMIN_EMAIL, role: 'admin' })
      assert.equal(response.code, 403)
      assert.equal(response.result.teachers, undefined)
      assert.equal(response.result.customToken, undefined)
    }
  }
  assert.equal(f.minted.length, 0)
  assert.equal(f.records.size, 1)
})
test('start mints the real teacher UID and records the actor with a bounded lifetime', async () => {
  const f = fixture()
  const { code, result } = await f.call('admin', { action: 'start', profileId: 't1', targetUid: 'attacker' })
  assert.equal(code, 200)
  assert.equal(result.session.targetUid, 'teacher-uid')
  assert.equal(result.session.actorUid, 'admin-uid')
  assert.equal(result.session.expiresAt, 1801000)
  assert.equal(result.session.status, 'active')
  assert.deepEqual(f.minted[0], { uid: 'teacher-uid', claims: { actAsSession: result.session.id, actAsActor: 'admin-uid' } })
  assert.equal(f.records.get(`actAsSessions/${result.session.id}`).actorEmail, SUPER_ADMIN_EMAIL)
})
test('rejects nonexistent, inactive, unverified, disabled, duplicate and administrative targets', async () => {
  for (const mutation of [
    (f) => f.records.delete('faculty/t1'),
    (f) => { f.records.get('faculty/t1').active = false },
    (f) => { f.accounts['teacher@school.ca'].emailVerified = false },
    (f) => { f.accounts['teacher@school.ca'].disabled = true },
    (f) => f.records.set('faculty/t2', { email: 'teacher@school.ca' }),
    (f) => f.records.set('admins/a', { email: 'teacher@school.ca' }),
    (f) => f.records.set('users/teacher-uid', { role: 'schoolAdmin' }),
    (f) => { f.accounts['teacher@school.ca'].customClaims = { superAdmin: true } },
    (f) => { delete f.accounts['teacher@school.ca'] },
  ]) {
    const f = fixture(); mutation(f)
    assert.ok((await f.call('admin', { action: 'start', profileId: 't1' })).code >= 400)
    assert.equal(f.minted.length, 0)
  }
  assert.equal((await fixture().call('admin', { action: 'start', profileId: '../users' })).code, 400)
})
test('resume revalidates the teacher and cannot change the target or renew the deadline', async () => {
  const f = fixture()
  const { session } = (await f.call('admin', { action: 'start', profileId: 't1' })).result
  f.tick(50000)
  const resumed = await f.call('admin', { action: 'resume', sessionId: session.id, profileId: 'other' })
  assert.equal(resumed.code, 200)
  assert.equal(resumed.result.session.expiresAt, session.expiresAt)
  f.accounts['teacher@school.ca'].uid = 'changed'
  assert.equal((await f.call('admin', { action: 'resume', sessionId: session.id })).code, 403)
})
test('end blocks further teacher access without revoking the actual teacher login', async () => {
  const f = fixture()
  const { session } = (await f.call('admin', { action: 'start', profileId: 't1' })).result
  const identity = { uid: session.targetUid, actAsSession: session.id, actAsActor: session.actorUid }
  await validateActAsSession(f.admin, identity, 1000)
  await assert.rejects(validateActAsSession(f.admin, { ...identity, uid: 'other' }, 1000))
  await assert.rejects(validateActAsSession(f.admin, { ...identity, actAsActor: 'other' }, 1000))
  await assert.rejects(validateActAsSession(f.admin, identity, session.expiresAt))
  f.identities.admin.uid = 'different-admin'
  assert.equal((await f.call('admin', { action: 'end', sessionId: session.id })).code, 403)
  f.identities.admin.uid = session.actorUid
  assert.equal((await f.call('admin', { action: 'end', sessionId: session.id })).code, 200)
  await assert.rejects(validateActAsSession(f.admin, identity, 1000))
  assert.equal((await f.call('admin', { action: 'resume', sessionId: session.id })).code, 403)
  assert.equal((await f.call('admin', { action: 'end', sessionId: session.id })).code, 200)
  await validateActAsSession(f.admin, { uid: 'teacher-uid' }, 1000)
})
test('expired sessions cannot resume', async () => {
  const f = fixture()
  const { session } = (await f.call('admin', { action: 'start', profileId: 't1' })).result
  f.tick(session.expiresAt)
  assert.equal((await f.call('admin', { action: 'resume', sessionId: session.id })).code, 403)
})
test('token signing failures close the audit session', async () => {
  const f = fixture()
  f.auth.createCustomToken = async () => { throw Object.assign(new Error('Cannot sign'), { code: 'auth/insufficient-permission' }) }
  assert.equal((await f.call('admin', { action: 'start', profileId: 't1' })).code, 500)
  assert.equal([...f.records].find(([key]) => key.startsWith('actAsSessions/'))[1].status, 'failed')
})
