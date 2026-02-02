export const normalizeGradeForClassMatch = (gradeValue) => {
  if (!gradeValue) return ''
  const gradeLower = gradeValue.toString().trim().toLowerCase()
  if (gradeLower.includes('jk') || gradeLower === 'junior kindergarten') return 'jk'
  if (gradeLower === 'senior kindergarten') return 'sk'
  if (gradeLower.includes('sk')) {
    const skMatch = gradeLower.match(/sk\d*/i)
    return skMatch ? skMatch[0].toLowerCase() : 'sk'
  }
  const numberMatch = gradeLower.match(/\d+/)
  return numberMatch ? numberMatch[0] : gradeLower
}

export const courseMatchesGrade = (courseData, normalizedGrade) => {
  if (!courseData || !normalizedGrade) return false
  const name = (courseData.name || courseData.title || '').toString().toLowerCase()
  const courseGrade = (courseData.grade || courseData.gradeLevel || '').toString().toLowerCase()
  const isHomeroom = name.includes('homeroom') || name.includes('home room')
  if (!isHomeroom) return false
  if (courseGrade === normalizedGrade) return true
  if (name.includes(normalizedGrade)) return true
  if (/^\d+$/.test(normalizedGrade)) {
    const gradePattern = new RegExp(`grade\\s*${normalizedGrade}|grade${normalizedGrade}`, 'i')
    return gradePattern.test(name) || courseGrade === normalizedGrade
  }
  if (normalizedGrade.startsWith('sk')) {
    const courseSKMatch = name.match(/sk\d*/i) || courseGrade.match(/sk\d*/i)
    const studentSKMatch = normalizedGrade.match(/sk\d*/i)
    if (courseSKMatch && studentSKMatch) {
      return courseSKMatch[0].toLowerCase() === studentSKMatch[0].toLowerCase()
    }
    if (normalizedGrade === 'sk1' || normalizedGrade === 'sk2') {
      return courseGrade === 'sk' || (name.includes('homeroom sk') && !name.match(/sk\d+/))
    }
  }
  return false
}

export const pickHomeroomCourseByGrade = (courseDocs, normalizedGrade) => {
  if (!Array.isArray(courseDocs)) return null
  for (const course of courseDocs) {
    const data = course?.data ? course.data() : course
    if (courseMatchesGrade(data, normalizedGrade)) {
      return course
    }
  }
  return null
}
