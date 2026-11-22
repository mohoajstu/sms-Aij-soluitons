const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHandler } = require('./parentPortal')

const ID_FIELD = '__name__'
const fixture = () => {
  const records = new Map([
    // Test TestParent's family: two children who share guardian TP1.
    ['students/TLS1', { contact: { email: 'older@tarbiyahlearning.ca' }, personalInfo: { firstName: 'Older', lastName: 'Child' },
      schooling: { program: 'Grade 5' }, parents: { mother: { tarbiyahId: 'TP1' } } }],
    ['students/TLS992671', { contact: { email: '' }, personalInfo: { firstName: 'Test', lastName: 'Student' },
      schooling: { program: 'Grade 8' }, parents: { father: { tarbiyahId: 'TP2' }, mother: { tarbiyahId: 'TP1' } } }],
    ['parents/TP1', { students: [{ studentId: 'TLS1' }, { studentId: 'TLS992671' }, { studentID: 'TLS-ONE-WAY' }, { studentId: 'TLS-GONE' }] }],
    ['parents/TP2', { students: [{ studentId: 'TLS992671' }] }],
    // Lists TP1, but TP1's record does not claim it back.
    ['students/TLS-ONE-WAY', { personalInfo: { firstName: 'One', lastName: 'Way' }, parents: { mother: { tarbiyahId: 'TP9' } } }],
    ['students/TLS-GONE', { personalInfo: { firstName: 'Gone' }, active: false, parents: { mother: { tarbiyahId: 'TP1' } } }],
    // An unrelated family.
    ['students/OTHER', { contact: { email: 'other@tarbiyahlearning.ca' }, personalInfo: { firstName: 'Other', lastName: 'Kid' },
      parents: { mother: { tarbiyahId: 'TP3' } } }],
    ['parents/TP3', { students: [{ studentId: 'OTHER' }] }],
    // A student who claims TP1 without TP1 listing them must not see TP1's children.
    ['students/INTRUDER', { contact: { email: 'intruder@tarbiyahlearning.ca' }, personalInfo: { firstName: 'In', lastName: 'Truder' },
      parents: { mother: { tarbiyahId: 'TP1' } } }],
    ['attendance/2026-09-03', { date: '2026-09-03', courses: [{ courseTitle: 'Grade 8', students: [
      { studentId: 'TLS992671', status: 'Late', note: 'Bus' }, { studentId: 'OTHER', status: 'Absent' }] }] }],
    ['attendance/2026-09-04', { date: '2026-09-04', courses: [{ courseTitle: 'Grade 5', students: [{ studentId: 'TLS1', status: 'Present' }] }] }],
    ['reportCards/r1', { tarbiyahId: 'TLS992671', status: 'published', url: 'https://example.com/r1.pdf', term: 'term1',
      approvedAt: { toDate: () => new Date('2026-11-02T00:00:00Z') }, uid: 'teacher-uid', formData: { secret: true } }],
    ['reportCards/r2', { tarbiyahId: 'TLS992671', status: 'draft', url: 'https://example.com/r2.pdf' }],
    ['reportCards/legacy-mine', { studentName: 'Older-Child', status: 'approved', url: 'https://example.com/l1.pdf' }],
    ['reportCards/legacy-other', { studentName: 'Older-Child', tarbiyahId: 'SOMEONE-ELSE', status: 'approved', url: 'https://example.com/l2.pdf' }],
  ])
  const identities = {
    older: { uid: 'u1', email: 'older@tarbiyahlearning.ca', email_verified: true },
    olderCaps: { uid: 'u1', email: 'Older@TarbiyahLearning.ca', email_verified: true },
    other: { uid: 'u2', email: 'other@tarbiyahlearning.ca', email_verified: true },
    intruder: { uid: 'u3', email: 'intruder@tarbiyahlearning.ca', email_verified: true },
    unverified: { uid: 'u1', email: 'older@tarbiyahlearning.ca', email_verified: false },
    stranger: { uid: 'u4', email: 'nobody@tarbiyahlearning.ca', email_verified: true },
  }
  const at = (data, key, id) => key === ID_FIELD ? id : key.split('.').reduce((value, field) => value?.[field], data)
  const ops = { '==': (a, b) => a === b, '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, in: (a, b) => b.includes(a) }
  const doc = (path) => ({ get: async () => ({ exists: records.has(path), data: () => records.get(path) }) })
  const collection = (path, filters = [], order = null, max = Infinity) => ({
    doc: (id) => doc(`${path}/${id}`),
    where: (field, op, value) => collection(path, [...filters, { field, op, value }], order, max),
    orderBy: (field) => collection(path, filters, field, max),
    limit: (n) => collection(path, filters, order, n),
    get: async () => {
      let docs = [...records].filter(([key]) => key.startsWith(`${path}/`) && key.split('/').length === 2)
        .map(([key, data]) => ({ id: key.split('/')[1], data: () => data }))
        .filter((d) => filters.every(({ field, op, value }) => ops[op](at(d.data(), field, d.id), value)))
      if (order) docs.sort((a, b) => String(at(a.data(), order, a.id)).localeCompare(String(at(b.data(), order, b.id))))
      docs = docs.slice(0, max)
      return { docs, empty: !docs.length }
    },
  })
  const firestore = () => ({ collection })
  firestore.FieldPath = { documentId: () => ID_FIELD }
  const admin = { firestore, auth: () => ({ verifyIdToken: async (token, revoked) => {
    assert.equal(revoked, true)
    if (!identities[token]) throw new Error('Invalid token')
    return identities[token]
  } }) }
  const handler = createHandler({ admin })
  const call = async (token, body, method = 'POST') => {
    let code = 200, result
    const res = { set() {}, status(value) { code = value; return this }, json(value) { result = value }, send() {} }
    await handler({ method, headers: token ? { authorization: `Bearer ${token}` } : {}, body }, res)
    return { code, result }
  }
  return { records, call }
}

test('signing in with a child\'s account shows every mutually linked sibling', async () => {
  const f = fixture()
  const { code, result } = await f.call('older', { action: 'family' })
  assert.equal(code, 200)
  assert.deepEqual(result.children, [
    { id: 'TLS1', name: 'Older Child', grade: 'Grade 5' },
    { id: 'TLS992671', name: 'Test Student', grade: 'Grade 8' },
  ])
  assert.deepEqual(result.signedInStudentIds, ['TLS1'])
  assert.equal(result.earliestAttendanceDate, '2026-09-03')
})

test('the same family resolves from the younger child\'s login and from a capitalized address', async () => {
  const f = fixture()
  f.records.get('students/TLS992671').contact.email = 'older@tarbiyahlearning.ca'
  f.records.get('students/TLS1').contact.email = 'someone-else@tarbiyahlearning.ca'
  const viaYounger = await f.call('older', { action: 'family' })
  assert.deepEqual(viaYounger.result.children.map((c) => c.id), ['TLS1', 'TLS992671'])
  assert.deepEqual(viaYounger.result.signedInStudentIds, ['TLS992671'])
  const g = fixture()
  assert.deepEqual((await g.call('olderCaps', { action: 'family' })).result.children.map((c) => c.id), ['TLS1', 'TLS992671'])
})

test('one-sided and inactive links never add a child', async () => {
  const f = fixture()
  const ids = (await f.call('older', { action: 'family' })).result.children.map((c) => c.id)
  assert.ok(!ids.includes('TLS-ONE-WAY'))
  assert.ok(!ids.includes('TLS-GONE'))
  const intruder = await f.call('intruder', { action: 'family' })
  assert.deepEqual(intruder.result.children.map((c) => c.id), ['INTRUDER'])
})

test('removing the guardian link revokes the sibling for every login', async () => {
  const f = fixture()
  f.records.get('parents/TP1').students = [{ studentId: 'TLS1' }]
  assert.deepEqual((await f.call('older', { action: 'family' })).result.children.map((c) => c.id), ['TLS1'])
  assert.equal((await f.call('older', { action: 'reportCards', studentId: 'TLS992671' })).code, 403)
})

test('attendance is returned only for a linked child and only that child\'s rows', async () => {
  const f = fixture()
  const ok = await f.call('older', { action: 'attendance', studentId: 'TLS992671', startDate: '2026-09-02', endDate: '2026-09-30' })
  assert.equal(ok.code, 200)
  assert.deepEqual(ok.result.records, [{ date: '2026-09-03', class: 'Grade 8', status: 'Late', note: 'Bus' }])
  const denied = await f.call('other', { action: 'attendance', studentId: 'TLS992671', startDate: '2026-09-02', endDate: '2026-09-30' })
  assert.equal(denied.code, 403)
  for (const range of [{ startDate: '2026-09-30', endDate: '2026-09-02' }, { startDate: '2024-09-02', endDate: '2026-09-30' }, { startDate: 'x', endDate: 'y' }]) {
    assert.equal((await f.call('older', { action: 'attendance', studentId: 'TLS992671', ...range })).code, 400)
  }
})

test('report cards: published only, safe fields only, legacy slug cannot leak another student', async () => {
  const f = fixture()
  const { code, result } = await f.call('older', { action: 'reportCards', studentId: 'TLS992671' })
  assert.equal(code, 200)
  assert.deepEqual(result.reports, [{ id: 'r1', status: 'published', url: 'https://example.com/r1.pdf', term: 'term1', approvedAt: '2026-11-02T00:00:00.000Z' }])
  const legacy = await f.call('older', { action: 'reportCards', studentId: 'TLS1' })
  assert.deepEqual(legacy.result.reports.map((r) => r.id), ['legacy-mine'])
  assert.equal((await f.call('other', { action: 'reportCards', studentId: 'TLS992671' })).code, 403)
  assert.equal((await f.call('older', { action: 'reportCards', studentId: '../x' })).code, 400)
})

test('requires a verified, signed-in account that belongs to a student', async () => {
  const f = fixture()
  assert.equal((await f.call(null, { action: 'family' })).code, 401)
  assert.equal((await f.call('bad', { action: 'family' })).code, 401)
  assert.equal((await f.call('unverified', { action: 'family' })).code, 403)
  assert.equal((await f.call('stranger', { action: 'family' })).code, 404)
  assert.equal((await f.call('older', { action: 'nope' })).code, 400)
  assert.equal((await f.call('older', {}, 'GET')).code, 405)
})
