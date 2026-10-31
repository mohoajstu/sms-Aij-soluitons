'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { generate, schoolYearFor } = require('./generate.cjs')
const { assertSafeTarget } = require('./guard.cjs')
const accounts = require('../../src/config/demoAccounts.json')

const TODAY = new Date('2026-10-31T12:00:00Z')
const data = generate({ today: TODAY })
const C = data.collections

function* strings(value) {
  if (typeof value === 'string') yield value
  else if (Array.isArray(value)) for (const v of value) yield* strings(v)
  else if (value && typeof value === 'object' && !(value instanceof Date)) for (const v of Object.values(value)) yield* strings(v)
}

test('every email is on the reserved demo.example domain', () => {
  const emails = [...strings(C)].filter((s) => /\S+@\S+/.test(s))
  assert.ok(emails.length > 100)
  for (const e of emails) assert.match(e, /@demo\.example$/, e)
})

test('every phone number is in the reserved fictional 555-01xx range', () => {
  const phones = []
  for (const col of ['students', 'parents', 'faculty', 'admins', 'registrations']) {
    for (const doc of Object.values(C[col])) {
      for (const s of strings(doc.contact || {})) if (/\d{3}-\d{3}-\d{4}/.test(s)) phones.push(s)
      for (const g of [doc.primaryGuardian, doc.secondaryGuardian]) if (g?.phone) phones.push(g.phone)
    }
  }
  assert.ok(phones.length > 100)
  for (const p of phones) assert.match(p, /^613-555-01\d\d$/, p)
})

test('generation is deterministic for a given date', () => {
  assert.ok(JSON.stringify(generate({ today: TODAY }).collections) === JSON.stringify(data.collections))
})

test('no generated person shares a name with a real person in the committed CSV exports', () => {
  const dir = path.join(__dirname, '../../src/scripts')
  const real = new Set()
  const parseLine = (line) => { const out = []; let cur = ''; let q = false
    for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = '' } else cur += ch }
    out.push(cur); return out }
  for (const file of fs.readdirSync(dir).filter((f) => /Report.*\.csv$/.test(f))) {
    const [head, ...rows] = fs.readFileSync(path.join(dir, file), 'utf8').split(/\r?\n/)
    const cols = parseLine(head)
    const first = cols.indexOf('First Name'); const last = cols.indexOf('Last Name')
    if (first < 0 || last < 0) continue
    for (const r of rows) { const c = parseLine(r); if (c[first] && c[last]) real.add(`${c[first]} ${c[last]}`.toLowerCase().trim()) }
  }
  const generated = []
  for (const col of ['students', 'parents', 'faculty', 'admins']) for (const d of Object.values(C[col])) generated.push([d.personalInfo.firstName, d.personalInfo.lastName])
  for (const d of Object.values(C.registrations)) {
    generated.push([d.student.firstName, d.student.lastName], [d.primaryGuardian.firstName, d.primaryGuardian.lastName], [d.secondaryGuardian.firstName, d.secondaryGuardian.lastName])
  }
  const clashes = generated.map(([f, l]) => `${f} ${l}`).filter((n) => real.has(n.toLowerCase()))
  assert.deepEqual(clashes, [], 'edit the name lists in generate.cjs so these do not match real people')
})

test('references between collections resolve', () => {
  for (const s of Object.values(C.students)) {
    for (const p of Object.values(s.parents)) assert.ok(C.parents[p.tarbiyahId], `parent ${p.tarbiyahId}`)
    for (const c of s.enrolledCourses) assert.ok(C.courses[c], `course ${c}`)
  }
  for (const p of Object.values(C.parents)) for (const k of p.students) assert.ok(C.students[k.studentId])
  for (const c of Object.values(C.courses)) {
    for (const id of c.enrolledList) assert.ok(C.students[id], `student ${id}`)
    assert.deepEqual(c.students.map((s) => s.id), c.enrolledList)
    for (const t of c.teacherIds) assert.ok(C.faculty[t])
  }
  for (const f of Object.values(C.faculty)) for (const id of f.courses) assert.ok(C.courses[id])
  for (const day of Object.values(C.attendance)) for (const c of day.courses) {
    assert.ok(C.courses[c.courseId])
    for (const s of c.students) assert.ok(C.students[s.studentId])
  }
  for (const [id, r] of Object.entries(C.reportCards)) {
    assert.ok(C.reportCardDrafts[r.sourceDraftId]); assert.equal(id, `${r.sourceDraftId}_published`); assert.ok(r.url); assert.equal(r.status, 'approved')
  }
  const userIds = Object.keys(C.users)
  for (const id of [...Object.keys(C.students), ...Object.keys(C.parents), ...Object.keys(C.faculty), ...Object.keys(C.admins)]) assert.ok(userIds.includes(id), `users/${id}`)
})

test('each demo login resolves to the right role the way the app looks people up', () => {
  const byEmail = (col, email) => Object.entries(C[col]).filter(([, d]) => d.contact?.email === email)
  for (const a of accounts) {
    const staff = byEmail('faculty', a.email)[0] || byEmail('admins', a.email)[0]
    const users = byEmail('users', a.email)
    if (a.role === 'admin') assert.equal(byEmail('admins', a.email)[0]?.[0], a.id)
    else if (a.role === 'faculty') assert.equal(byEmail('faculty', a.email)[0]?.[0], a.id)
    else {
      assert.equal(staff, undefined, 'a parent must not match a staff record')
      assert.equal(users.length, 1, 'exactly one users doc for the email')
      assert.equal(users[0][0], a.id)
      assert.equal(users[0][1].personalInfo.role, 'Parent')
      // ParentDashboard / attendance / report cards find the child by this email.
      assert.equal(Object.values(C.students).filter((s) => s.contact.email === a.email).length, 1)
    }
    assert.ok(data.authUsers.some((u) => u.uid === a.id && u.email === a.email), `auth user for ${a.email}`)
  }
})

test('courses are discoverable the way the app filters them', () => {
  for (const c of Object.values(C.courses)) assert.equal(c.archived, false)
  const grades = ['JK', 'SK', ...[1, 2, 3, 4, 5, 6, 7, 8].map(String)]
  for (const g of grades) {
    const title = g.length === 2 && isNaN(g) ? `Homeroom ${g}` : `Homeroom Grade ${g}`
    assert.equal(Object.values(C.courses).filter((c) => c.title === title).length, 1, title)
  }
  const ids = Object.keys(C.courses)
  assert.equal(new Set(ids).size, ids.length)
  assert.match(ids[0], /^TC\d{6}$/)
})

test('attendance is for past weekday school days only, leaving today open to be taken live', () => {
  const dates = Object.keys(C.attendance)
  assert.ok(dates.length > 20)
  for (const d of dates) {
    assert.ok(d < '2026-10-31' && d >= '2026-09-02', d)
    assert.ok(![0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay()), `${d} is a weekend`)
  }
  assert.ok(!dates.includes('2026-10-12'), 'Thanksgiving is not a school day')
  const stats = Object.values(C.students).map((s) => s.attendanceStats)
  assert.ok(stats.some((s) => s.yearAbsenceCount > 0) && stats.some((s) => s.yearLateCount > 0))
})

test('school year follows the Sept 2 anchor', () => {
  assert.equal(schoolYearFor(new Date('2026-09-01T00:00:00Z')).label, '2025-2026')
  assert.equal(schoolYearFor(new Date('2026-09-02T00:00:00Z')).label, '2026-2027')
  assert.equal(schoolYearFor(new Date('2027-03-10T00:00:00Z')).label, '2026-2027')
  assert.equal(C.systemSettings.schoolYear.label, '2026-2027')
})

test('texts and emails cannot be sent from the demo data', () => {
  assert.equal(C.systemSettings.attendanceSms.enabled, false)
})

test('every document is tagged as demo data', () => {
  for (const docs of Object.values(C)) for (const d of Object.values(docs)) assert.equal(d.isDemo, true)
})

test('seed guard only accepts demo targets', () => {
  assert.throws(() => assertSafeTarget({ projectId: 'tarbiyah-sms', env: {} }), /real school project/)
  assert.throws(() => assertSafeTarget({ projectId: 'tarbiyah-sms-staging', env: {} }), /real school project/)
  assert.throws(() => assertSafeTarget({ projectId: 'something-else', env: {} }), /must contain "demo"/)
  assert.throws(() => assertSafeTarget({ projectId: '', env: {} }), /--project/)
  assert.throws(() => assertSafeTarget({ projectId: 'demo-x', env: { FIRESTORE_EMULATOR_HOST: 'h:1' } }), /both/)
  assert.deepEqual(assertSafeTarget({ projectId: 'tarbiyah-sms-demo', env: {} }), { emulator: false, storageEmulator: false })
  assert.equal(assertSafeTarget({ projectId: 'demo-x', env: { FIRESTORE_EMULATOR_HOST: 'h:1', FIREBASE_AUTH_EMULATOR_HOST: 'h:2' } }).emulator, true)
})
