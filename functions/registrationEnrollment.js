const crypto = require('node:crypto')
const fail = (status, message) => Object.assign(new Error(message), { status })
const text = (v) => String(v || '').trim().replace(/\s+/g, ' ')
const norm = (v) => text(v).toLowerCase()
const hash = (v) => crypto.createHash('sha256').update(v).digest('hex')
const nameOf = (p) => text(`${p?.firstName || ''} ${p?.lastName || ''}`)
const studentName = (s) => nameOf(s.personalInfo || s)
const gradeOf = (value) => {
  const v = norm(value)
  if (/\bjk\b|junior kindergarten|jr kindergarten/.test(v)) return 'jk'
  if (/\bsk\b|senior kindergarten|sr kindergarten/.test(v)) return 'sk'
  return v.match(/(?:grade|gr\.?)\s*(\d+)/)?.[1] || null
}
const homeroomsFor = (app, courses) => courses.filter((c) => !c.archived &&
  /^(homeroom\b|jk\b|sk\b)/i.test(text(c.title || c.name)) && gradeOf(c.title || c.name) === gradeOf(app.grade))
const candidatesFor = (app, students) => students.filter((s) => norm(studentName(s)) === norm(nameOf(app.student)))
const nextId = (prefix, records) => {
  const used = new Set(records.flatMap((r) => [r.id, r.schoolId]).filter(Boolean))
  const numbers = [...used].filter((id) => new RegExp(`^${prefix}\\d{6}$`).test(id)).map((id) => Number(id.slice(prefix.length)))
  const next = Math.max(100000, ...numbers) + 1
  if (next > 999999) throw fail(409, 'School ID range is exhausted. Contact the administrator.')
  return `${prefix}${next}`
}

// Pure plan, built from fresh transactional reads. Existing records are reused,
// never replaced with incomplete application data.
function planEnrollment({ application: app, applicationId, courseId, selectedStudentId, students, parents, courses, actor, now }) {
  if (app.archived || !['pending', 'approved'].includes(app.status)) throw fail(409, 'Only pending or approved, unarchived applications can be enrolled.')
  const student = app.student || {}
  if (!text(student.firstName) || !text(student.lastName) || !gradeOf(app.grade)) throw fail(400, 'Complete the student name and grade on the application first.')
  const course = homeroomsFor(app, courses).find((c) => c.id === courseId)
  if (!course) throw fail(400, 'Select an active homeroom for the application grade.')
  if (app.enrollment?.courseId && app.enrollment.courseId !== courseId) throw fail(409, 'This application is already enrolled in another homeroom. Use course management to transfer the student.')
  const candidates = candidatesFor(app, students)
  const linkedId = app.enrollment?.studentId || app.studentId
  let existing = linkedId ? students.find((s) => s.id === linkedId) : null
  if (existing && norm(studentName(existing)) !== norm(nameOf(student))) throw fail(409, 'The linked student name differs from the application. Review the link before proceeding.')
  if (selectedStudentId) {
    if (linkedId && selectedStudentId !== linkedId) throw fail(409, 'The application already links to a different student.')
    existing = candidates.find((s) => s.id === selectedStudentId)
    if (!existing) throw fail(409, 'The selected student no longer matches this application.')
  }
  if (!existing && candidates.length) {
    const exact = candidates.filter((s) => student.dateOfBirth && text(s.personalInfo?.dob) === text(student.dateOfBirth))
    if (exact.length === 1 && !linkedId) existing = exact[0]
    else throw fail(409, 'A student with this name already exists. Select the correct existing student before enrolling.')
  }
  if (existing?.active === false) throw fail(409, 'The matching student is inactive. Review their student record first.')
  const studentId = existing?.id || linkedId || nextId('TLS', students)
  if (!existing && students.some((s) => s.id === studentId)) throw fail(409, 'Student ID conflict; no records were changed.')
  const otherHomeroom = courses.find((c) => !c.archived && c.id !== courseId && /^(homeroom\b|jk\b|sk\b)/i.test(text(c.title || c.name)) &&
    [...(c.students || []), ...(c.enrolledList || [])].some((s) => (typeof s === 'object' ? s.id : s) === studentId))
  if (otherHomeroom) throw fail(409, `Student is already assigned to ${otherHomeroom.title || otherHomeroom.name}. Review that enrollment first.`)
  const writes = []
  const guardianLinks = { ...(existing?.parents || {}) }
  const parentPlans = new Map()
  for (const [key, slot] of [['primaryGuardian', 'mother'], ['secondaryGuardian', 'father']]) {
    const guardian = app[key] || {}
    if (!nameOf(guardian)) {
      if (key === 'primaryGuardian' && !existing) throw fail(400, 'Complete the primary guardian name first.')
      continue
    }
    const email = norm(guardian.email)
    const linkedParentId = guardian.schoolId || guardianLinks[slot]?.tarbiyahId
    let parent = linkedParentId ? parents.find((p) => p.id === linkedParentId) : null
    if (guardian.schoolId && !parent) throw fail(409, 'A linked guardian record is missing. Correct the guardian link first.')
    if (!parent && email) {
      const matches = parents.filter((p) => norm(p.contact?.email || p.personalInfo?.email || p.email) === email)
      if (matches.length > 1) throw fail(409, 'Multiple guardian records share this email. Select the correct guardian on the application first.')
      parent = matches[0]
    }
    const pendingParent = email && [...parentPlans].find(([, p]) => norm(p.contact?.email) === email)
    const id = parent?.id || pendingParent?.[0] || nextId('TP', [...parents, ...[...parentPlans].map(([id, p]) => ({ ...p, id }))])
    const prior = parentPlans.get(id) || parent
    if (!prior && parents.some((p) => p.id === id)) throw fail(409, 'Guardian ID conflict; no records were changed.')
    const children = [...(prior?.students || [])]
    if (!children.some((c) => c.studentId === studentId)) children.push({ studentId, studentName: nameOf(student), relationship: 'child' })
    const data = prior ? { ...prior, students: children } : {
      active: true, schoolId: id, primaryRole: 'Parent',
      personalInfo: { firstName: text(guardian.firstName), lastName: text(guardian.lastName) },
      contact: { email, phone1: guardian.phone || app.contact?.primaryPhone || '' },
      address: { streetAddress: guardian.address || app.contact?.studentAddress || '' },
      students: children, createdAt: now,
    }
    delete data.id
    parentPlans.set(id, data)
    guardianLinks[slot] = { name: nameOf(guardian), tarbiyahId: id }
  }
  for (const [id, data] of parentPlans) {
    writes.push({ path: `parents/${id}`, data })
    writes.push({ path: `users/${id}`, onlyIfMissing: true, data: { tarbiyahId: id, linkedCollection: 'parents', active: true,
      personalInfo: { ...data.personalInfo, role: 'Parent' }, createdAt: now } })
  }
  const studentData = existing ? { parents: guardianLinks, applicationIds: [...new Set([...(existing.applicationIds || []), applicationId])] } : {
    active: true, schoolId: studentId, primaryRole: 'Student', registrationId: applicationId, applicationIds: [applicationId],
    personalInfo: { firstName: text(student.firstName), middleName: text(student.middleName), lastName: text(student.lastName),
      dob: student.dateOfBirth || '', gender: student.gender || '', allergies: student.allergies || '' },
    schooling: { program: app.grade, returningStudentYear: app.schoolYear || '', oen: student.oen || '',
      previousSchool: student.previousSchool || '', photoPermission: student.photoPermission || '' },
    parents: guardianLinks, contact: { email: '', phone1: app.contact?.primaryPhone || '', emergencyPhone: app.contact?.emergencyPhone || '' },
    address: { streetAddress: app.contact?.studentAddress || '' },
    attendanceStats: { currentTermLateCount: 0, yearLateCount: 0, currentTermAbsenceCount: 0, yearAbsenceCount: 0 }, createdAt: now,
  }
  writes.push({ path: `students/${studentId}`, data: studentData })
  writes.push({ path: `users/${studentId}`, onlyIfMissing: true, data: { tarbiyahId: studentId, linkedCollection: 'students', active: true,
    personalInfo: { firstName: text(student.firstName), lastName: text(student.lastName), role: 'Student' }, createdAt: now } })
  const roster = [...(course.students || [])]
  if (!roster.some((s) => (typeof s === 'object' ? s.id : s) === studentId)) roster.push({ id: studentId, name: nameOf(student) })
  const enrolledList = [...(course.enrolledList || [])]
  if (!enrolledList.some((s) => (typeof s === 'object' ? s.id : s) === studentId)) enrolledList.push(studentId)
  writes.push({ path: `courses/${courseId}`, data: { students: roster, enrolledList, updatedAt: now } })
  const enrollment = { studentId, courseId, courseTitle: course.title || course.name, completedAt: app.enrollment?.completedAt || now,
    approvedBy: app.enrollment?.approvedBy || actor, lastVerifiedAt: now }
  writes.push({ path: `registrations/${applicationId}`, data: { status: 'approved', studentId, enrollment } })
  return { writes, enrollment, reusedStudent: !!existing }
}

function createHandler({ admin, reviewerEmails = [] }) {
  return async (req, res) => {
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
      await require('./actAs').validateActAsSession(admin, identity)
    const email = norm(identity.email)
      if (!email || identity.email_verified !== true) throw fail(403, 'Use a verified administrator account.')
      const db = admin.firestore()
      // Reuse the existing protected, server-managed school administrator registry.
      const access = await db.collection('timekeepingAdminAccess').doc(hash(email)).get()
      if (!reviewerEmails.map(norm).includes(email) && !(access.exists && access.data().email === email)) throw fail(403, 'School administrator access is required.')
      const { action, applicationId, courseId, selectedStudentId } = req.body || {}
      if (!['preview', 'enroll'].includes(action) || typeof applicationId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(applicationId)) throw fail(400, 'Invalid enrollment request.')
      const result = await db.runTransaction(async (tx) => {
        const appRef = db.collection('registrations').doc(applicationId)
        const sequenceRef = db.doc('systemCounters/registrationEnrollment')
        const [appSnap, studentSnap, parentSnap, courseSnap, sequenceSnap] = await Promise.all([
          tx.get(appRef), tx.get(db.collection('students')), tx.get(db.collection('parents')), tx.get(db.collection('courses')),
          tx.get(sequenceRef),
        ])
        if (!appSnap.exists) throw fail(404, 'Application not found.')
        const application = appSnap.data()
        const map = (snap) => snap.docs.map((d) => ({ ...d.data(), id: d.id }))
        const students = map(studentSnap), parents = map(parentSnap), courses = map(courseSnap)
        if (action === 'preview') return { name: nameOf(application.student), grade: application.grade, status: application.status,
          homerooms: homeroomsFor(application, courses).map((c) => ({ id: c.id, title: c.title || c.name })),
          candidates: candidatesFor(application, students).map((s) => ({ id: s.id, name: studentName(s), dob: s.personalInfo?.dob || '', grade: s.schooling?.program || '', active: s.active !== false })),
          enrollment: application.enrollment || null }
        const plan = planEnrollment({ application, applicationId, courseId, selectedStudentId, students, parents, courses, actor: email, now: new Date().toISOString() })
        const userWrites = plan.writes.filter((w) => w.onlyIfMissing)
        const userDocs = await Promise.all(userWrites.map((w) => tx.get(db.doc(w.path))))
        const existingUsers = new Set(userDocs.filter((d) => d.exists).map((d) => d.ref.path))
        // All approvals contend on this document, so concurrent applications
        // cannot allocate the same legacy-compatible six-digit school IDs.
        tx.set(sequenceRef, { revision: (Number(sequenceSnap.data()?.revision) || 0) + 1 }, { merge: true })
        for (const write of plan.writes) {
          if (write.onlyIfMissing && existingUsers.has(write.path)) continue
          const data = { ...write.data }
          for (const field of ['createdAt', 'updatedAt']) {
            if (typeof data[field] === 'string' && admin.firestore.FieldValue) data[field] = admin.firestore.FieldValue.serverTimestamp()
          }
          tx.set(db.doc(write.path), data, { merge: true })
        }
        return { enrollment: plan.enrollment, reusedStudent: plan.reusedStudent, status: 'approved' }
      })
      return res.json(result)
    } catch (error) {
      if (!error.status) console.error('Enrollment failed:', error.message)
      return res.status(error.status || 500).json({ message: error.status ? error.message : 'Enrollment could not be completed. No partial enrollment was saved. Retry or contact an administrator.' })
    }
  }
}
module.exports = { createHandler, planEnrollment, homeroomsFor, candidatesFor }
