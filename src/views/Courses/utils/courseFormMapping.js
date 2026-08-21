// Pure mapping between Firestore course documents and the CourseForm state.
//
// Course docs come from several generations of tooling (this form, CSV import
// scripts, manual fixes), so every field needs a fallback. The update payload
// is diff-based on purpose: an admin renaming a course must not rewrite
// teacher lookup arrays or student enrollment that other views depend on.

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const defaultSessions = () =>
  DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = { enabled: false, startTime: '08:00', endTime: '09:00', room: '' }
    return acc
  }, {})

const staffIdOf = (t) => t?.tarbiyahId || t?.schoolId || t?.authUID || t?.id || ''

const sessionsFromDoc = (schedule) => {
  const sessions = defaultSessions()
  if (!schedule) return sessions
  if (schedule.sessions && typeof schedule.sessions === 'object') {
    for (const day of DAYS_OF_WEEK) {
      const s = schedule.sessions[day]
      if (s && typeof s === 'object') sessions[day] = { ...sessions[day], ...s }
    }
    return sessions
  }
  const legacyDays = schedule.classDays || schedule.days || []
  for (const day of legacyDays) {
    if (!sessions[day]) continue
    sessions[day] = {
      enabled: true,
      startTime: schedule.startTime || '08:00',
      endTime: schedule.endTime || '09:00',
      room: schedule.room || schedule.location || '',
    }
  }
  return sessions
}

export const mapCourseDocToFormData = (id, data) => {
  const doc = data || {}
  return {
    id,
    title: doc.title || doc.name || '',
    subject: doc.subject || '',
    grade: doc.grade || doc.gradeLevel || '',
    description: doc.description || '',
    staff: Array.isArray(doc.teacher)
      ? doc.teacher.map((t) => ({ id: staffIdOf(t), name: t?.name || '' }))
      : [],
    students: Array.isArray(doc.students) ? doc.students : [],
    schedule: { sessions: sessionsFromDoc(doc.schedule) },
    capacity: Number.isFinite(doc.capacity) ? doc.capacity : 25,
    enrolledStudents: Number.isFinite(doc.enrolledStudents) ? doc.enrolledStudents : 0,
    materials: Array.isArray(doc.materials) ? doc.materials : [],
    addToCalendar: false,
    isActive: doc.isActive !== false,
  }
}

export const staffListChanged = (originalDoc, staffList) => {
  const originalIds = (Array.isArray(originalDoc?.teacher) ? originalDoc.teacher : [])
    .map(staffIdOf)
    .filter(Boolean)
    .sort()
  const currentIds = (staffList || [])
    .map((s) => s?.id)
    .filter(Boolean)
    .sort()
  return JSON.stringify(originalIds) !== JSON.stringify(currentIds)
}

const legacyScheduleFrom = (sessions, enabledDays) => ({
  classDays: enabledDays,
  days: enabledDays,
  startTime: sessions[enabledDays[0]]?.startTime || '08:00',
  endTime: sessions[enabledDays[0]]?.endTime || '09:00',
  room: sessions[enabledDays[0]]?.room || '',
  location: sessions[enabledDays[0]]?.room || '',
  sessions,
})

const differs = (a, b) => JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)

export const buildCourseUpdatePayload = ({ original, formData, enabledDays, enhancedStaffData }) => {
  const doc = original || {}
  const payload = {}

  if (formData.title !== (doc.title || doc.name || '')) {
    payload.title = formData.title
    payload.name = formData.title
  }
  if (formData.subject !== (doc.subject || '')) payload.subject = formData.subject
  if (formData.grade !== (doc.grade || doc.gradeLevel || '')) {
    payload.grade = formData.grade
    payload.gradeLevel = formData.grade
  }
  if (formData.description !== (doc.description || '')) payload.description = formData.description
  if (formData.capacity !== (Number.isFinite(doc.capacity) ? doc.capacity : 25)) {
    payload.capacity = formData.capacity
  }
  if (differs(formData.materials, Array.isArray(doc.materials) ? doc.materials : [])) {
    payload.materials = formData.materials
  }
  if (formData.isActive !== (doc.isActive !== false)) payload.isActive = formData.isActive

  if (enabledDays.length > 0) {
    const schedule = legacyScheduleFrom(formData.schedule.sessions, enabledDays)
    // Round-trip the stored schedule through the same canonical form; comparing
    // against the raw doc would flag every legacy-format course as changed.
    const originalSessions = sessionsFromDoc(doc.schedule)
    const originalEnabled = DAYS_OF_WEEK.filter((d) => originalSessions[d].enabled)
    const originalCanonical =
      originalEnabled.length > 0 ? legacyScheduleFrom(originalSessions, originalEnabled) : null
    if (differs(schedule, originalCanonical)) payload.schedule = schedule
  }

  if (enhancedStaffData) {
    payload.teacher = enhancedStaffData
    payload.teacherIds = [
      ...new Set(enhancedStaffData.flatMap((s) => [s.authUID, s.tarbiyahId]).filter(Boolean)),
    ]
    payload.teacherAuthUIDs = enhancedStaffData.map((s) => s.authUID)
    payload.teacherTarbiyahIds = enhancedStaffData.map((s) => s.tarbiyahId)
    payload.teachers = enhancedStaffData.map((s) => s.name)
  }

  if (differs(formData.students, Array.isArray(doc.students) ? doc.students : [])) {
    payload.students = formData.students
    payload.enrolledList = formData.students.map((s) => s?.id || s)
  }

  return payload
}
