/**
 * Ensure formData student fields stay in sync with the selected student.
 * This prevents stale data from a previously selected student.
 */
export const mergeFormDataWithStudent = (formData, student) => {
  if (!student) return { ...(formData || {}) }

  const fullName = student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim()
  const oen = student.schooling?.oen || student.oen || student.OEN || ''
  const gradeValue = student.grade || student.program || ''
  const normalizedGrade = (() => {
    if (!gradeValue) return ''
    const gradeLower = gradeValue.toString().toLowerCase()
    if (gradeLower.includes('jk') || gradeLower === 'junior kindergarten') return 'JK'
    if (gradeLower.includes('sk') || gradeLower === 'senior kindergarten') return 'SK'
    const match = gradeValue.toString().match(/\d+/)
    return match ? match[0] : gradeValue
  })()

  return {
    ...(formData || {}),
    student: fullName,
    student_name: fullName,
    name: fullName, // Quran report uses "name"
    studentId: student.id || student.studentId || '',
    OEN: oen,
    oen: oen,
    grade: normalizedGrade,
    daysAbsent: student.currentTermAbsenceCount ?? formData?.daysAbsent ?? 0,
    totalDaysAbsent: student.yearAbsenceCount ?? formData?.totalDaysAbsent ?? 0,
    timesLate: student.currentTermLateCount ?? formData?.timesLate ?? 0,
    totalTimesLate: student.yearLateCount ?? formData?.totalTimesLate ?? 0,
  }
}
