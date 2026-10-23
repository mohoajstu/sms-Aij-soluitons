const { test } = require('node:test')
const assert = require('node:assert/strict')
const { planEnrollment, createHandler, homeroomsFor } = require('./registrationEnrollment')
const fixture = () => ({ applicationId: 'TLR-test', courseId: 'g7', actor: 'admin@example.com', now: '2026-09-29T12:00:00Z',
  application: { status: 'pending', grade: 'Grade 7', student: { firstName: 'Test', lastName: 'Student', dateOfBirth: '2014-01-02' },
    primaryGuardian: { firstName: 'Test', lastName: 'Parent', email: 'parent@example.com' } }, students: [], parents: [],
  courses: [{ id: 'g7', title: 'Homeroom Grade 7', students: [{ id: 'other', name: 'Other Student' }], enrolledList: ['other'] }] })
const dataAt = (plan, path) => plan.writes.find((w) => w.path === path)?.data
test('approval creates linked student and guardian records and enrolls without removing classmates', () => {
  const plan = planEnrollment(fixture()), id = plan.enrollment.studentId
  assert.equal(dataAt(plan, 'registrations/TLR-test').studentId, id)
  assert.equal(dataAt(plan, `students/${id}`).schooling.program, 'Grade 7')
  const parent = plan.writes.find((w) => w.path.startsWith('parents/'))
  assert.equal(parent.data.students[0].studentId, id)
  assert.equal(dataAt(plan, 'courses/g7').students.length, 2)
  assert.deepEqual(dataAt(plan, 'courses/g7').enrolledList, ['other', id])
})
test('retry reuses the same records and repairs a missing roster link', () => {
  const input = fixture(), first = planEnrollment(input), id = first.enrollment.studentId
  input.application = { ...input.application, ...dataAt(first, 'registrations/TLR-test') }
  input.students = [{ id, ...dataAt(first, `students/${id}`) }]
  input.parents = first.writes.filter((w) => w.path.startsWith('parents/')).map((w) => ({ id: w.path.split('/')[1], ...w.data }))
  input.courses[0] = { ...input.courses[0], ...dataAt(first, 'courses/g7') }
  const retry = planEnrollment(input)
  assert.equal(retry.enrollment.studentId, id)
  assert.equal(dataAt(retry, 'courses/g7').students.length, 2)
  assert.equal(retry.writes.find((w) => w.path.startsWith('parents/')).data.students.length, 1)
  input.courses[0].students = []; input.courses[0].enrolledList = []
  assert.deepEqual(dataAt(planEnrollment(input), 'courses/g7').enrolledList, [id])
})
test('approved applications with missing records can complete enrollment', () => {
  const input = fixture(); input.application.status = 'approved'
  assert.equal(planEnrollment(input).writes.at(-1).data.status, 'approved')
})
test('reuses a matching student and preserves existing student details and guardian children', () => {
  const input = fixture()
  input.students = [{ id: 'existing', personalInfo: { firstName: ' Test ', lastName: 'Student', dob: '2014-01-02' }, active: true }]
  input.parents = [{ id: 'parent1', contact: { email: 'PARENT@example.com' }, students: [{ studentId: 'sibling' }], personalInfo: { firstName: 'Real', lastName: 'Parent' } }]
  const plan = planEnrollment(input)
  assert.equal(plan.enrollment.studentId, 'existing')
  assert.equal(dataAt(plan, 'students/existing').personalInfo, undefined)
  assert.equal(dataAt(plan, 'parents/parent1').students.length, 2)
  assert.equal(dataAt(plan, 'parents/parent1').personalInfo.firstName, 'Real')
})
test('ambiguous matches require explicit selection and never silently create duplicates', () => {
  const input = fixture()
  input.students = ['one', 'two'].map((id) => ({ id, personalInfo: { firstName: 'Test', lastName: 'Student', dob: '2014-01-02' } }))
  assert.throws(() => planEnrollment(input), /Select the correct existing student/)
  assert.equal(planEnrollment({ ...input, selectedStudentId: 'two' }).enrollment.studentId, 'two')
  assert.throws(() => planEnrollment({ ...input, selectedStudentId: 'unrelated' }), /no longer matches/)
})
test('rejects wrong grade, archived class, invalid state, and conflicting homeroom', () => {
  const input = fixture()
  assert.throws(() => planEnrollment({ ...input, courseId: 'wrong' }), /homeroom/)
  assert.throws(() => planEnrollment({ ...input, application: { ...input.application, archived: true } }), /unarchived/)
  assert.throws(() => planEnrollment({ ...input, application: { ...input.application, status: 'denied' } }), /pending or approved/)
  const id = planEnrollment(input).enrollment.studentId
  input.courses.push({ id: 'other', title: 'Homeroom Grade 6', students: [{ id }] })
  assert.throws(() => planEnrollment(input), /already assigned/)
})
test('grade matching includes kindergarten and sectioned homerooms', () => {
  assert.equal(homeroomsFor({ grade: 'Jr Kindergarten' }, [{ id: 'jk', title: 'Homeroom JK' }]).length, 1)
  assert.equal(homeroomsFor({ grade: 'Grade 1' }, [{ id: '1b', title: 'Homeroom Gr.1 B' }]).length, 1)
})
test('endpoint rejects unauthenticated and non-admin requests without writes', async () => {
  let code, result
  const res = { set() {}, status(c) { code = c; return this }, json(r) { result = r }, send() {} }
  const admin = { auth: () => ({ verifyIdToken: async () => ({ email: 'staff@example.com', email_verified: true }) }),
    firestore: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: false }) }) }) }) }
  const handler = createHandler({ admin })
  await handler({ method: 'POST', headers: {}, body: {} }, res)
  assert.equal(code, 401)
  await handler({ method: 'POST', headers: { authorization: 'Bearer staff' }, body: {} }, res)
  assert.equal(code, 403)
  assert.match(result.message, /administrator/)
})
test('transaction endpoint persists linked enrollment, retries safely, and commits no partial data on failure', async () => {
  const input = fixture()
  const store = new Map([['registrations/TLR-test', input.application], ['courses/g7', input.courses[0]]])
  let rejectCommit = true
  const reads = []
  const ref = (path) => ({ path, get: async () => snap(path) })
  const snap = (path) => ({ id: path.split('/').at(-1), ref: ref(path), exists: store.has(path), data: () => store.get(path) })
  const db = { doc: ref, collection: (name) => ({ path: name, collection: true, doc: (id) => ref(`${name}/${id}`) }),
    runTransaction: async (callback) => {
      const writes = []
      const result = await callback({ get: async (r) => {
        reads.push(r.path)
        return r.collection ? { docs: [...store.keys()].filter((p) => p.startsWith(`${r.path}/`)).map(snap) } : snap(r.path)
      }, set: (r, data) => writes.push([r.path, data]) })
      if (rejectCommit) throw new Error('Simulated commit failure')
      writes.forEach(([path, data]) => store.set(path, { ...store.get(path), ...data }))
      return result
    } }
  const admin = { firestore: () => db, auth: () => ({ verifyIdToken: async () => ({ email: 'admin@example.com', email_verified: true }) }) }
  const handler = createHandler({ admin, reviewerEmails: ['admin@example.com'] })
  async function call() {
    let code = 200, result
    const res = { set() {}, status(c) { code = c; return this }, json(r) { result = r } }
    await handler({ method: 'POST', headers: { authorization: 'Bearer admin' }, body: { action: 'enroll', applicationId: 'TLR-test', courseId: 'g7' } }, res)
    return { code, result }
  }
  assert.equal((await call()).code, 500)
  assert.equal(store.size, 2)
  assert.equal(store.get('registrations/TLR-test').status, 'pending')
  rejectCommit = false
  const first = await call(), second = await call()
  assert.equal(first.code, 200); assert.equal(second.code, 200)
  assert.equal(first.result.enrollment.studentId, second.result.enrollment.studentId)
  assert.match(first.result.enrollment.studentId, /^TLS\d{6}$/)
  assert.equal([...store.keys()].filter((p) => p.startsWith('students/')).length, 1)
  assert.equal(store.get('courses/g7').students.length, 2)
  assert.ok(reads.includes('systemCounters/registrationEnrollment'))
})
