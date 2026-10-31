'use strict'
/**
 * Synthetic data for the SMS demo.
 *
 * Everything here is invented: names come from small word lists and are combined
 * at random, emails use the reserved `demo.example` domain, phone numbers use
 * the reserved 555-01xx range and addresses are made up. Nothing is read from
 * (or derived from) any real school record.
 *
 * generate() is pure and deterministic for a given `today`, so it can be unit
 * tested without Firebase. run.cjs does the writing.
 */
const crypto = require('node:crypto')
const accounts = require('../../src/config/demoAccounts.json')

const DOMAIN = 'demo.example'
const SCHOOL = 'Demo Academy'
const REGION_TZ = 'America/Toronto'
// Fictional location used for timekeeping geofencing.
const SCHOOL_LAT = 45.4215
const SCHOOL_LNG = -75.6972
const GRADES = ['JK', 'SK', '1', '2', '3', '4', '5', '6', '7', '8']
const STUDENTS_PER_GRADE = 6

const FIRST_F = ['Amina', 'Leila', 'Sofia', 'Maya', 'Noor', 'Hana', 'Zara', 'Yasmin', 'Layla', 'Iman', 'Sara', 'Emily', 'Olivia', 'Grace', 'Nadia', 'Farah', 'Mariam', 'Aisha', 'Lina', 'Dina']
const FIRST_M = ['Omar', 'Yusuf', 'Ibrahim', 'Adam', 'Ali', 'Hamza', 'Zayd', 'Idris', 'Bilal', 'Samir', 'Noah', 'Liam', 'Ethan', 'Daniel', 'Karim', 'Tariq', 'Rayan', 'Malik', 'Jamal', 'Eli']
const SURNAMES = ['Rahman', 'Haddad', 'Khalil', 'Siddiqui', 'Nasser', 'Farouk', 'Mansour', 'Qureshi', 'Barakat', 'Hussain', 'Ahmed', 'Malik', 'Sheikh', 'Aziz', 'Darwish', 'Saleh', 'Bashir', 'Chaudhry', 'Karimi', 'Rashid', 'Taylor', 'Morgan', 'Bennett', 'Carter', 'Hayes', 'Brooks', 'Fraser', 'Ellis', 'Nguyen', 'Patel', 'Costa', 'Novak', 'Ibrahim', 'Said', 'Yilmaz', 'Demir', 'Hashemi', 'Zaman', 'Abbasi', 'Memon']
const STREETS = ['Cedar Grove Ave', 'Maple Court', 'Willow Lane', 'Harbour View Rd', 'Pinecrest Drive', 'Elm Park Way', 'Lakeshore Blvd', 'Orchard Street', 'Birchwood Cres', 'Sunrise Terrace']
const AREAS = ['Demo Heights', 'Sample Park', 'Example Village', 'Mockton']
const ALLERGIES = ['None', 'None', 'None', 'None', 'Peanuts (EpiPen on file)', 'None', 'Dust mites', 'None', 'Shellfish', 'None']

// ---------------------------------------------------------------- utilities
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const iso = (d) => d.toISOString().slice(0, 10)
const addDays = (d, n) => new Date(d.getTime() + n * 86400000)
const isoToUtc = (s) => new Date(`${s}T00:00:00Z`)
const pad = (n, w) => String(n).padStart(w, '0')
const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex')
const slug = (s) => s.toLowerCase().replace(/[^a-z]/g, '')

/** School-year label and start date for `today`, matching src/utils/schoolYear.js (anchored on Sept 2). */
function schoolYearFor(today) {
  const y = today.getUTCFullYear()
  const start = isoToUtc(`${y}-09-02`)
  const sy = today < start ? y - 1 : y
  return { startYear: sy, label: `${sy}-${sy + 1}`, startDate: `${sy}-09-02` }
}

function nthWeekday(year, month, weekday, n) {
  // month is 0-based; weekday 0=Sun
  const first = new Date(Date.UTC(year, month, 1))
  const offset = (weekday - first.getUTCDay() + 7) % 7
  return new Date(Date.UTC(year, month, 1 + offset + (n - 1) * 7))
}

function holidays(sy) {
  const set = new Set()
  set.add(iso(nthWeekday(sy, 8, 1, 1))) // Labour Day
  set.add(iso(nthWeekday(sy, 9, 1, 2))) // Thanksgiving
  for (let d = isoToUtc(`${sy}-12-22`); iso(d) <= `${sy + 1}-01-04`; d = addDays(d, 1)) set.add(iso(d)) // winter break
  set.add(iso(nthWeekday(sy + 1, 1, 1, 3))) // Family Day
  for (let d = isoToUtc(`${sy + 1}-03-16`); iso(d) <= `${sy + 1}-03-20`; d = addDays(d, 1)) set.add(iso(d)) // spring break
  return set
}

function schoolDays(startDate, endExclusive, sy) {
  const off = holidays(sy)
  const days = []
  for (let d = isoToUtc(startDate); d < endExclusive; d = addDays(d, 1)) {
    const wd = d.getUTCDay()
    if (wd === 0 || wd === 6 || off.has(iso(d))) continue
    days.push(iso(d))
  }
  return days
}

/** UTC instant for a wall-clock time in Toronto on a date. */
function torontoInstant(dateIso, hhmm) {
  const [y, m, d] = dateIso.split('-').map(Number)
  const [H, M] = hhmm.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, H, M)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: REGION_TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
  }).formatToParts(new Date(guess)).reduce((a, p) => ({ ...a, [p.type]: Number(p.value) }), {})
  const shown = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
  return new Date(guess - (shown - guess))
}

// --------------------------------------------------------------- generator
function generate({ today = new Date(), reportCardUrl = (p) => `https://example.invalid/${p}` } = {}) {
  today = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const rand = rng(20260901)
  const pick = (arr) => arr[Math.floor(rand() * arr.length)]
  const chance = (p) => rand() < p
  const between = (a, b) => a + Math.floor(rand() * (b - a + 1))
  const year = schoolYearFor(today)
  const sy = year.startYear
  const nowStamp = today // anchored to the seed date so output is reproducible

  const C = {} // collection -> { id: data }
  const put = (col, id, data) => {
    ;(C[col] ||= {})[id] = { ...data, isDemo: true }
  }

  const usedNames = new Set()
  const uniqueName = (firstPool, last) => {
    for (let i = 0; i < 200; i++) {
      const first = pick(firstPool)
      const surname = last || pick(SURNAMES)
      const key = `${first} ${surname}`
      if (!usedNames.has(key)) { usedNames.add(key); return { first, last: surname } }
    }
    throw new Error('Could not generate a unique name')
  }
  const phone = () => `613-555-01${pad(between(0, 99), 2)}`
  const address = () => ({ poBox: '', streetAddress: `${between(10, 998)} ${pick(STREETS)}`, residentialArea: pick(AREAS) })
  const person = ({ id, role, first, last, email, dob, gender, extra = {} }) => ({
    id, schoolId: id, active: true, primaryRole: role,
    personalInfo: { firstName: first, middleName: '', lastName: last, nickName: '', salutation: '', dob: dob || '', gender: gender || '' },
    citizenship: { nationality: 'Canadian', nationalId: `000-000-${pad(between(100, 999), 3)}`, nationalIdExpiry: '' },
    contact: { email, phone1: phone(), phone2: '', emergencyPhone: phone() },
    address: address(),
    language: { primary: 'English', secondary: pick(['Arabic', 'French', 'Urdu', '']) },
    createdAt: nowStamp, uploadedAt: nowStamp,
    ...extra,
  })

  const authUsers = []
  const accountByEmail = Object.fromEntries(accounts.map((a) => [a.email, a]))
  const accountById = Object.fromEntries(accounts.map((a) => [a.id, a]))
  const userDoc = ({ id, collection, role, first, last, email, extra = {} }) => put('users', id, {
    tarbiyahId: id, schoolId: id, linkedCollection: collection, active: true,
    personalInfo: { firstName: first, lastName: last, role },
    role, firstName: first, lastName: last, email, contact: { email },
    dashboard: { theme: 'default' },
    stats: { loginCount: between(1, 40), lastLoginAt: nowStamp },
    mustChangePassword: false,
    createdAt: nowStamp,
    ...extra,
  })
  const maybeAuth = (id, email, first, last) => {
    if (accountById[id]) authUsers.push({ uid: id, email, displayName: `${first} ${last}`, role: accountById[id].role })
  }

  // ---- families and students -------------------------------------------
  const slots = []
  GRADES.forEach((g, gi) => { for (let i = 0; i < STUDENTS_PER_GRADE; i++) slots.push(gi) })
  const take = (gi) => { const i = slots.indexOf(gi); if (i < 0) throw new Error('no slot'); slots.splice(i, 1); return gi }
  const gradeIdx = (g) => GRADES.indexOf(String(g))
  // Shuffle remaining slots (after reserving the demo families' children).
  const families = []
  const reserve = [[gradeIdx('3'), gradeIdx('1')], [gradeIdx('7'), gradeIdx('5')]]
  reserve.forEach((gs) => families.push(gs.map(take)))
  for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]] }
  while (slots.length) {
    const k = Math.min(slots.length, pick([1, 1, 2, 2, 3]))
    families.push(slots.splice(0, k))
  }

  let studentSeq = 900001
  let parentSeq = 900001
  const students = [] // { id, first, last, gradeIdx, parentIds[] }
  const parents = []
  const demoParentAccounts = accounts.filter((a) => a.role === 'parent')

  families.forEach((gradeIdxs, fi) => {
    const surname = pick(SURNAMES)
    usedNames.add(`family ${surname}`)
    // The two demo-login families have a single guardian so TP900001 / TP900002 are each family's login parent.
    const twoParents = fi < 2 ? false : chance(0.75)
    const guardians = []
    const mkParent = (rel, pool) => {
      const id = `TP${parentSeq++}`
      const acct = accountById[id]
      const n = uniqueName(pool, surname)
      const email = acct ? acct.email : `${slug(n.first)}.${slug(n.last)}.${id.toLowerCase()}@${DOMAIN}`
      guardians.push({ rel, id, first: n.first, last: n.last, email })
    }
    mkParent('mother', FIRST_F)
    if (twoParents) mkParent('father', FIRST_M)
    const kids = gradeIdxs.map((gi) => {
      const id = `TLS${studentSeq++}`
      const male = chance(0.5)
      const n = uniqueName(male ? FIRST_M : FIRST_F, surname)
      return { id, first: n.first, last: n.last, gi, male }
    })
    guardians.forEach((g) => parents.push({ ...g, kids }))
    kids.forEach((k) => students.push({ ...k, parentIds: guardians.map((g) => g.id), guardians }))
  })

  // Demo parents see their first child only (ParentDashboard matches on the child's email).
  const firstChildOf = (parentId) => students.find((s) => s.parentIds[0] === parentId)
  const loginChild = new Map(demoParentAccounts.map((a) => [firstChildOf(a.id).id, a.email]))

  students.forEach((s) => {
    const grade = GRADES[s.gi]
    const age = grade === 'JK' ? 4 : grade === 'SK' ? 5 : Number(grade) + 5
    const dob = `${sy - age}-${pad(between(1, 12), 2)}-${pad(between(1, 28), 2)}`
    const program = grade === 'JK' ? 'JK' : grade === 'SK' ? 'SK' : `Grade ${grade}`
    const email = loginChild.get(s.id) || `${slug(s.first)}.${slug(s.last)}.${s.id.toLowerCase()}@${DOMAIN}`
    const parentsField = {}
    s.guardians.forEach((g) => { parentsField[g.rel] = { name: `${g.first} ${g.last}`, tarbiyahId: g.id } })
    s.record = person({
      id: s.id, role: 'Student', first: s.first, last: s.last, email, dob, gender: s.male ? 'male' : 'female',
      extra: {
        parents: parentsField,
        schooling: {
          program, returningStudentYear: String(sy), custodyDetails: 'N/A', daySchoolEmployer: '', notes: '',
          oen: `999${pad(between(0, 999999), 6)}`, previousSchool: pick(['', 'Sample Elementary', 'Example Montessori', '']),
          photoPermission: pick(['yes', 'yes', 'no']),
        },
        attendanceStats: { currentTermLateCount: 0, yearLateCount: 0, currentTermAbsenceCount: 0, yearAbsenceCount: 0 },
        enrolledCourses: [],
      },
    })
    s.record.personalInfo.allergies = pick(ALLERGIES)
    s.grade = grade
    s.program = program
  })

  parents.forEach((p) => {
    const acct = accountById[p.id]
    const rec = person({
      id: p.id, role: 'Parent', first: p.first, last: p.last, email: p.email,
      extra: {
        students: p.kids.map((k) => ({ studentId: k.id, studentName: `${k.first} ${k.last}`, relationship: 'child' })),
        schooling: { custodyDetails: 'N/A', daySchoolEmployer: '', notes: '' },
        onboarding: true,
      },
    })
    rec.address = students.find((s) => s.id === p.kids[0].id).record.address
    put('parents', p.id, rec)
    userDoc({ id: p.id, collection: 'parents', role: 'Parent', first: p.first, last: p.last, email: p.email,
      extra: acct ? { studentId: p.kids[0].id } : {} })
    maybeAuth(p.id, p.email, p.first, p.last)
  })

  // ---- staff ------------------------------------------------------------
  const staff = [] // { id, first, last, email, collection, role }
  const adminCount = 2
  for (let i = 0; i < adminCount; i++) {
    const id = `TA${900001 + i}`
    const acct = accountById[id]
    const n = uniqueName(i === 0 ? FIRST_F : FIRST_M)
    const email = acct ? acct.email : `${slug(n.first)}.${slug(n.last)}.admin@${DOMAIN}`
    const rec = person({ id, role: 'SchoolAdmin', first: n.first, last: n.last, email,
      extra: { employment: { daySchoolEmployer: SCHOOL, program: '', notes: '' }, timestamps: { createdAt: nowStamp, uploadedAt: nowStamp } } })
    put('admins', id, rec)
    userDoc({ id, collection: 'admins', role: 'Admin', first: n.first, last: n.last, email })
    maybeAuth(id, email, n.first, n.last)
    staff.push({ id, first: n.first, last: n.last, email, collection: 'admins', role: 'admin' })
  }

  // Homeroom teachers: Grade 3 and Grade 7 are the demo logins, the rest are generated.
  const teacherIdByGrade = {}
  let teacherSeq = 90003
  GRADES.forEach((g) => { teacherIdByGrade[g] = g === '3' ? 'TLA90001' : g === '7' ? 'TLA90002' : `TLA${teacherSeq++}` })
  const specialistIds = ['quran', 'arabic', 'pe'].map(() => `TLA${teacherSeq++}`)
  const teacherPlan = [
    ...GRADES.map((g) => ({ id: teacherIdByGrade[g], kind: `homeroom ${g}` })),
    ...specialistIds.map((id, i) => ({ id, kind: ['quran', 'arabic', 'pe'][i] })),
  ]
  teacherPlan.forEach((t, i) => {
    const n = uniqueName(i % 2 ? FIRST_M : FIRST_F)
    const acct = accountById[t.id]
    const email = acct ? acct.email : `${slug(n.first)}.${slug(n.last)}@${DOMAIN}`
    t.first = n.first; t.last = n.last; t.email = email
    put('faculty', t.id, person({ id: t.id, role: 'Faculty', first: n.first, last: n.last, email,
      extra: { employment: { daySchoolEmployer: SCHOOL, program: '', notes: '' }, courses: [] } }))
    maybeAuth(t.id, email, n.first, n.last)
    staff.push({ id: t.id, first: n.first, last: n.last, email, collection: 'faculty', role: 'faculty' })
  })
  const teacherById = Object.fromEntries(teacherPlan.map((t) => [t.id, t]))

  // ---- courses ------------------------------------------------------------
  let courseSeq = 101
  const courses = []
  const mkCourse = ({ title, subject, grade, gradeLevel, teacherId, studentList, room }) => {
    const id = `TC${pad(courseSeq++, 6)}`
    const t = teacherById[teacherId]
    const name = `${t.first} ${t.last}`
    const sessions = Object.fromEntries(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      .map((d) => [d, { enabled: true, startTime: '08:30', endTime: '15:30', room }]))
    const course = {
      courseID: id, courseId: id, title, name: title, subject, grade, gradeLevel,
      description: `${title} at ${SCHOOL}`, archived: false, isActive: true,
      academicYear: year.label, term: 'Term 1', section: 1,
      capacity: 25, enrolledStudents: studentList.length,
      materials: [], resources: [],
      schedule: { classDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        startTime: '08:30', endTime: '15:30', room, location: room, sessions },
      teacher: [{ id: teacherId, name, role: 'teacher', schoolId: teacherId, source: 'faculty' }],
      teacherIds: [teacherId], teacherAuthUIDs: [teacherId], teacherTarbiyahIds: [teacherId], teachers: [name],
      students: studentList.map((s) => ({ id: s.id, name: `${s.first} ${s.last}` })),
      enrolledList: studentList.map((s) => s.id),
      budget: { totalBudget: 500, accumulatedCost: 0, itemList: [] },
      assignments: [], grades: {},
      createdBy: 'demo-seed', calendarEventIds: [],
      timestamps: { createdAt: nowStamp, updatedAt: nowStamp }, createdAt: nowStamp, updatedAt: nowStamp,
    }
    courses.push({ id, ...course, studentList })
    teacherById[teacherId].courses = [...(teacherById[teacherId].courses || []), id]
    studentList.forEach((s) => s.record.enrolledCourses.push(id))
    return course
  }

  GRADES.forEach((g, gi) => {
    const label = g === 'JK' || g === 'SK' ? `Homeroom ${g}` : `Homeroom Grade ${g}`
    mkCourse({ title: label, subject: 'Homeroom', grade: g === 'JK' || g === 'SK' ? g : `Grade ${g}`, gradeLevel: g.toLowerCase(),
      teacherId: teacherIdByGrade[g], studentList: students.filter((s) => s.gi === gi), room: `Room ${100 + gi}` })
  })
  const range = (a, b) => students.filter((s) => s.gi >= a && s.gi <= b)
  const [qT, aT, pT] = specialistIds
  mkCourse({ title: 'Quran – Grades 1 to 4', subject: 'Quran', grade: '1-4', gradeLevel: '1-4', teacherId: qT, studentList: range(2, 5), room: 'Room 201' })
  mkCourse({ title: 'Quran – Grades 5 to 8', subject: 'Quran', grade: '5-8', gradeLevel: '5-8', teacherId: qT, studentList: range(6, 9), room: 'Room 201' })
  mkCourse({ title: 'Arabic – Grades 1 to 8', subject: 'Arabic', grade: '1-8', gradeLevel: '1-8', teacherId: aT, studentList: range(2, 9), room: 'Room 202' })
  mkCourse({ title: 'French – Grades 4 to 8', subject: 'French', grade: '4-8', gradeLevel: '4-8', teacherId: aT, studentList: range(5, 9), room: 'Room 202' })
  mkCourse({ title: 'Physical Education – All Grades', subject: 'Physical Education', grade: 'All', gradeLevel: 'All', teacherId: pT, studentList: students, room: 'Gym' })

  // Gradebook content for homerooms.
  const ASSIGNMENTS = [['Unit 1 Quiz', 'Math'], ['Reading Response', 'Language'], ['Science Lab Report', 'Science'], ['Unit 2 Test', 'Math']]
  courses.filter((c) => c.subject === 'Homeroom').forEach((c) => {
    c.assignments = ASSIGNMENTS.map(([n, subject], i) => ({ id: `${c.id}-A${i + 1}`, name: n, subject }))
    c.studentList.forEach((s) => {
      c.grades[s.id] = Object.fromEntries(c.assignments.map((a) => [a.id, between(62, 98)]))
    })
    c.assignments.forEach((a, i) => {
      put('assignments', a.id, { title: a.name, name: a.name, courseId: c.id, dueDate: iso(addDays(today, (i - 2) * 6 + 3)),
        priority: ['low', 'medium', 'high'][i % 3] })
    })
  })
  courses.forEach((c) => {
    const { studentList, id: _id, ...data } = c
    put('courses', c.id, data)
  })

  // ---- attendance -----------------------------------------------------------
  const termStart = iso(today) >= `${sy + 1}-02-01` ? `${sy + 1}-02-01` : year.startDate
  const days = schoolDays(year.startDate, today, sy) // today is left empty so a presenter can take attendance live
  const homerooms = courses.filter((c) => c.subject === 'Homeroom')
  const stats = Object.fromEntries(students.map((s) => [s.id, { currentTermLateCount: 0, yearLateCount: 0, currentTermAbsenceCount: 0, yearAbsenceCount: 0 }]))
  const STATUSES = [['Present', 0.9], ['Late', 0.04], ['Absent', 0.03], ['Excused Absent', 0.02], ['Excused Late', 0.01]]
  const NOTES = { Absent: 'Called in sick', 'Excused Absent': 'Medical appointment', Late: 'Traffic', 'Excused Late': 'Appointment' }
  const rollStatus = () => { let r = rand(); for (const [s, p] of STATUSES) { if ((r -= p) < 0) return s } return 'Present' }
  days.forEach((day) => {
    const entries = homerooms.map((c) => ({
      courseId: c.id, courseTitle: c.title, recordedAt: torontoInstant(day, '09:05'), recordedBy: c.teacherIds[0],
      students: c.studentList.map((s) => {
        const status = rollStatus()
        const st = stats[s.id]
        if (status === 'Late' || status === 'Excused Late') { st.yearLateCount++; if (day >= termStart) st.currentTermLateCount++ }
        if (status === 'Absent' || status === 'Excused Absent') { st.yearAbsenceCount++; if (day >= termStart) st.currentTermAbsenceCount++ }
        return { studentId: s.id, studentName: `${s.first} ${s.last}`, status, note: NOTES[status] || '' }
      }),
    }))
    put('attendance', day, { date: day, courses: entries })
  })
  students.forEach((s) => { s.record.attendanceStats = stats[s.id]; put('students', s.id, s.record) })
  // Student user docs carry no email: a demo child shares the parent's login email on the students
  // record (ParentDashboard matches on it), and the profile lookup must resolve that email to the parent.
  students.forEach((s) => userDoc({ id: s.id, collection: 'students', role: 'Student', first: s.first, last: s.last, email: '' }))

  // ---- finish staff docs now that course lists are known ---------------------
  teacherPlan.forEach((t) => {
    C.faculty[t.id].courses = t.courses || []
    userDoc({ id: t.id, collection: 'faculty', role: 'Faculty', first: t.first, last: t.last, email: t.email,
      extra: { teacherProfile: { classesManaged: t.courses || [] } } })
  })

  // ---- announcements ------------------------------------------------------------
  const ANN = [
    ['Welcome back to Demo Academy', 'Classes are in full swing. Please review the updated drop-off procedures on the parent portal.', 'medium', -50],
    ['Picture Day', 'Individual and class photos will be taken next week. Uniforms required.', 'low', -12],
    ['Term 1 progress reports', 'Progress reports will be published to the parent portal after teacher and administrator review.', 'high', -3],
    ['Parent–teacher interviews', 'Interview booking opens on Monday. Each family can book one 15 minute slot per child.', 'high', 4],
    ['Professional development day', 'No classes for students. Staff are in training all day.', 'medium', 10],
    ['Fall bake sale', 'Proceeds support the school library. Volunteers welcome.', 'low', 17],
  ]
  ANN.forEach(([title, description, priority, offset], i) => {
    put('announcements', `demo-announcement-${i + 1}`, { title, description, priority, date: iso(addDays(today, offset)), createdAt: addDays(today, Math.min(offset, 0)) })
  })

  // ---- report cards -------------------------------------------------------------
  const typeFor = (g) => (g === 'JK' || g === 'SK' ? ['kg-initial-observations', 'Kindergarten – Communication of Learning (Initial Observations)']
    : Number(g) <= 6 ? ['1-6-progress', 'Grades 1–6 – Elementary Progress Report'] : ['7-8-progress', 'Grades 7–8 – Elementary Progress Report'])
  const reportPdfs = []
  const COMMENTS = [
    'works hard in every subject and contributes thoughtfully to class discussions.',
    'shows steady growth in reading and is encouraged to keep practising multi-step problems.',
    'is a kind and reliable classmate who is developing strong independent work habits.',
    'participates well in group work; next steps are checking work carefully before handing it in.',
  ]
  let idx = 0
  ;['3', '7'].forEach((g) => {
    const course = homerooms.find((c) => c.grade === `Grade ${g}`)
    const [type, typeName] = typeFor(g)
    const teacher = teacherById[teacherIdByGrade[g]]
    course.studentList.forEach((s, i) => {
      const draftId = `${s.id}_${type}_${year.label}_term1`
      // First child is published (visible to the demo parent), the rest cover the review workflow.
      const stage = i === 0 ? 'published' : ['complete-pending', 'complete-pending', 'needs_revision', 'draft', 'draft'][i - 1]
      const st = stats[s.id]
      const formData = {
        date: iso(addDays(today, -3)), OEN: s.record.schooling.oen, student: `${s.first} ${s.last}`, grade: g,
        teacher: `${teacher.first} ${teacher.last}`, school: SCHOOL,
        daysAbsent: String(st.currentTermAbsenceCount), totalDaysAbsent: String(st.yearAbsenceCount),
        timesLate: String(st.currentTermLateCount), totalTimesLate: String(st.yearLateCount),
        strengths_next_steps: stage === 'draft' ? '' : `${s.first} ${COMMENTS[idx++ % COMMENTS.length]}`,
        improvements: stage === 'draft' ? '' : 'Continue reading nightly and review multiplication facts.',
      }
      const base = {
        uid: teacher.id, teacherName: `${teacher.first} ${teacher.last}`, studentId: s.id, studentName: `${s.first} ${s.last}`, tarbiyahId: s.id,
        reportCardType: type, reportCardTypeName: typeName, term: 'term1', schoolYear: year.label, formData,
        selectedStudent: { id: s.id, fullName: `${s.first} ${s.last}`, grade: g, oen: s.record.schooling.oen, schoolId: s.id },
        versions: [], contributorIds: [teacher.id], lastEditedBy: teacher.id, lastEditedByName: `${teacher.first} ${teacher.last}`,
        originalTeacherId: teacher.id, originalTeacherName: `${teacher.first} ${teacher.last}`,
        createdAt: addDays(today, -10), lastModified: addDays(today, -2 - i), publishedToParents: false,
      }
      if (stage === 'draft') put('reportCardDrafts', draftId, { ...base, status: 'draft', adminReviewStatus: 'pending' })
      else if (stage === 'complete-pending') put('reportCardDrafts', draftId, { ...base, status: 'complete', adminReviewStatus: 'pending', completedAt: addDays(today, -2) })
      else if (stage === 'needs_revision') put('reportCardDrafts', draftId, { ...base, status: 'complete', adminReviewStatus: 'needs_revision', completedAt: addDays(today, -4), adminReviewedBy: 'TA900001', adminReviewedAt: addDays(today, -1) })
      else {
        const filePath = `reportCards/approved/demo/${draftId}.pdf`
        reportPdfs.push({ path: filePath, studentName: `${s.first} ${s.last}`, typeName, grade: g, schoolYear: year.label, comment: formData.strengths_next_steps })
        put('reportCardDrafts', draftId, { ...base, status: 'complete', adminReviewStatus: 'approved', completedAt: addDays(today, -5), adminReviewedBy: 'TA900001', adminReviewedAt: addDays(today, -4), publishedToParents: true, finalPdfPath: filePath })
        put('reportCards', `${draftId}_published`, {
          uid: teacher.id, type: type, reportCardType: type, reportCardTypeName: typeName, filePath, url: reportCardUrl(filePath),
          studentName: `${s.first} ${s.last}`, tarbiyahId: s.id, studentId: s.id, status: 'approved', grade: g,
          teacherName: `${teacher.first} ${teacher.last}`, approvedBy: 'TA900001', approvedAt: addDays(today, -4),
          schoolYear: year.label, term: 'term1', sourceDraftId: draftId, createdAt: addDays(today, -4),
        })
      }
    })
  })

  // ---- registrations --------------------------------------------------------------
  const regYear = String(sy + 1)
  const REG_GRADES = ['Jr Kindergarten', 'Sr Kindergarten', 'Grade 1', 'Grade 2', 'Grade 4', 'Grade 6', 'Grade 3', 'Grade 5']
  // Left pending so approving + enrolling can be shown live (the enrollment function creates the records).
  const REG_STATUS = ['pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'denied', 'pending']
  REG_GRADES.forEach((grade, i) => {
    const id = `TLR${pad(i, 5)}`
    const surname = pick(SURNAMES)
    const male = chance(0.5)
    const kid = uniqueName(male ? FIRST_M : FIRST_F, surname)
    const g1 = uniqueName(FIRST_F, surname)
    const g2 = uniqueName(FIRST_M, surname)
    const ageOf = grade.startsWith('Jr') ? 4 : grade.startsWith('Sr') ? 5 : Number(grade.split(' ')[1]) + 5
    const gEmail = (g) => `${slug(g.first)}.${slug(g.last)}.reg${i}@${DOMAIN}`
    const addr = `${between(10, 998)} ${pick(STREETS)}, ${pick(AREAS)}`
    const status = REG_STATUS[i]
    put('registrations', id, {
      registrationId: id, schoolYear: regYear, grade, status, archived: false,
      student: { firstName: kid.first, middleName: '', lastName: kid.last, gender: male ? 'male' : 'female', oen: '',
        dateOfBirth: `${sy + 1 - ageOf}-${pad(between(1, 12), 2)}-${pad(between(1, 28), 2)}`, previousSchool: '', allergies: pick(ALLERGIES), photoPermission: 'yes' },
      contact: { primaryPhone: phone(), emergencyPhone: phone(), primaryEmail: gEmail(g1), studentAddress: addr },
      primaryGuardian: { firstName: g1.first, middleName: '', lastName: g1.last, phone: phone(), email: gEmail(g1), address: addr },
      secondaryGuardian: { firstName: g2.first, middleName: '', lastName: g2.last, phone: phone(), email: `${slug(g2.first)}.${slug(g2.last)}.reg${i}b@${DOMAIN}`, address: addr },
      payment: { method: 'cash', status: 'pending', amount: 150 },
      feesAcknowledgement: true,
      uploadedFiles: { immunization: [], reportCard: [], osrPermission: [], governmentId: [] },
      timestamp: addDays(today, -(30 - i * 3)),
    })
  })
  put('counters', 'registrations', { currentCount: REG_GRADES.length })
  put('counters', 'courseCounter', { nextCourseNumber: 200, lastUpdated: nowStamp, description: 'Demo course counter' })

  // ---- timekeeping -----------------------------------------------------------------
  const recentDays = schoolDays(year.startDate, today, sy).slice(-10)
  staff.forEach((s) => {
    recentDays.forEach((day) => {
      const late = chance(0.1)
      const inTime = late ? `08:${pad(between(16, 40), 2)}` : `07:${pad(between(35, 59), 2)}`
      const outTime = `16:${pad(between(0, 25), 2)}`
      ;[['in', inTime, late ? 'late' : 'on-time'], ['out', outTime, 'on-time']].forEach(([type, time, status]) => {
        const at = torontoInstant(day, time)
        put('staffCheckins', `demo-${s.id}-${day}-${type}`, {
          uid: s.id, email: s.email, displayName: `${s.first} ${s.last}`, role: s.role, type, notes: '',
          latitude: SCHOOL_LAT + (rand() - 0.5) * 0.0008, longitude: SCHOOL_LNG + (rand() - 0.5) * 0.0008,
          accuracy: between(8, 30), positionTimestamp: at.getTime(), positionAgeMs: between(100, 900), locationSamples: 3,
          distanceMeters: between(5, 90), inRange: true, locationCertainty: 'confirmed', scheduled: true, radiusMeters: 500,
          status, expectedTime: type === 'in' ? '08:00' : '16:00', graceMinutes: 10,
          createdAt: at, clientCreatedAt: at.toISOString(), userAgent: 'Demo seed',
        })
      })
    })
  })

  // One pending timesheet correction, in the shape the staffTimesheets API stores.
  const ANCHOR = Date.UTC(2026, 7, 17)
  const currentPeriod = Math.floor((today.getTime() - ANCHOR) / (14 * 86400000))
  const demoTeacher = teacherById['TLA90001']
  const reviewPeriod = currentPeriod - 1
  if (reviewPeriod >= 0 && demoTeacher) {
    const date = new Date(ANCHOR + (reviewPeriod * 14 + 1) * 86400000).toISOString().slice(0, 10)
    put('staffTimesheetCorrections', sha256(`${demoTeacher.email}|${reviewPeriod}`), {
      uid: demoTeacher.id, email: demoTeacher.email, periodIndex: reviewPeriod,
      rows: [{ date, hours: 8.5, note: 'Stayed late for parent meetings', reason: 'Forgot to check out' }],
      revision: 1, status: 'pending', submittedAt: nowStamp.toISOString(), submittedBy: demoTeacher.email, approved: null,
    })
  }
  const reviewerEmail = accounts.find((a) => a.role === 'admin').email
  put('timekeepingAdminAccess', sha256(reviewerEmail), { email: reviewerEmail })

  // ---- settings ----------------------------------------------------------------------
  put('systemSettings', 'schoolYear', { label: year.label, startDate: year.startDate, updatedAt: nowStamp.toISOString() })
  put('systemSettings', 'registration', { eligibilityCutoffDate: `${sy - 3}-12-31`, schoolYear: regYear,
    availableGrades: ['Jr Kindergarten', 'Sr Kindergarten', ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `Grade ${n}`)], updatedAt: nowStamp, updatedBy: 'demo-seed' })
  put('systemSettings', 'reportCardSms', { disableEditing: false, hideProgressReports: false, defaultTerm: 'term1', reportCardDate: '', updatedAt: nowStamp, updatedBy: 'demo-seed' })
  // Attendance texts are switched off in the demo; nothing is ever sent.
  put('systemSettings', 'attendanceSms', { enabled: false, schedule: { time: '12:00', timezone: REGION_TZ,
    daysOfWeek: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false }, excludedDates: [] },
    messageTemplate: { enabled: true, template: 'Attendance Alert for {date}: {studentName} was marked as {status}.' }, lastUpdated: nowStamp, updatedBy: 'demo-seed' })
  put('systemSettings', 'timekeeping', { enabled: true, latitude: SCHOOL_LAT, longitude: SCHOOL_LNG, radiusMeters: 500,
    expectedCheckInTime: '08:00', expectedCheckOutTime: '16:00', graceMinutes: 10, staffOverrides: {}, lastUpdated: nowStamp })

  return { collections: C, authUsers, reportPdfs, schoolYear: year, counts: Object.fromEntries(Object.entries(C).map(([k, v]) => [k, Object.keys(v).length])) }
}

module.exports = { generate, schoolYearFor, schoolDays, torontoInstant, DOMAIN, SCHOOL }
