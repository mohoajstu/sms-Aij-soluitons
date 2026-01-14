/**
 * Grade to Teacher Mapping
 * Official mapping of grades to homeroom teachers
 * Used for auto-filling teacher name and teacher signature fields
 */

export const GRADE_TO_TEACHER_MAP = {
  'jk': 'Amera Syed',
  'sk1': 'Rafia Husain',
  'sk2': 'Huda Abdel-Baqi',
  '1': 'Wala Omorri',
  '2': 'Filiz Camlibel',
  '3': 'Nadia Rahim Mirza',
  '4': 'Saima Qureshi',
  '5': 'Sara Sultan',
  '6': 'Saba Alvi',
  '7': 'Hasna Charanek',
  '8': 'Saba Alvi',
}

/**
 * Get teacher name for a given grade
 * @param {string} grade - Student grade (e.g., 'JK', 'SK1', '1', '2', 'Grade 3', etc.)
 * @returns {string} Teacher name or empty string if not found
 */
export const getTeacherForGrade = (grade) => {
  if (!grade) {
    console.log('⚠️ getTeacherForGrade: No grade provided')
    return ''
  }
  
  // Normalize grade to lowercase and trim
  const normalizedGrade = grade.toString().toLowerCase().trim()
  console.log(`🔍 getTeacherForGrade: Looking up grade "${grade}" (normalized: "${normalizedGrade}")`)
  
  // Direct lookup first
  if (GRADE_TO_TEACHER_MAP[normalizedGrade]) {
    console.log(`✅ getTeacherForGrade: Direct match found: ${GRADE_TO_TEACHER_MAP[normalizedGrade]}`)
    return GRADE_TO_TEACHER_MAP[normalizedGrade]
  }
  
  // Handle SK without number (default to SK1)
  if (normalizedGrade === 'sk') {
    console.log(`✅ getTeacherForGrade: SK without number, defaulting to SK1: ${GRADE_TO_TEACHER_MAP['sk1']}`)
    return GRADE_TO_TEACHER_MAP['sk1']
  }
  
  // Handle "Grade X" format (e.g., "grade 3", "Grade 3", "grade3")
  const gradeMatch = normalizedGrade.match(/grade\s*(\d+)/i)
  if (gradeMatch) {
    const gradeNum = gradeMatch[1]
    const teacher = GRADE_TO_TEACHER_MAP[gradeNum]
    if (teacher) {
      console.log(`✅ getTeacherForGrade: Extracted grade number "${gradeNum}" from "${normalizedGrade}": ${teacher}`)
      return teacher
    } else {
      console.warn(`⚠️ getTeacherForGrade: Grade number "${gradeNum}" not found in map`)
    }
  }
  
  // Handle numeric grade as string (e.g., "3", "7", "8")
  if (/^\d+$/.test(normalizedGrade)) {
    const teacher = GRADE_TO_TEACHER_MAP[normalizedGrade]
    if (teacher) {
      console.log(`✅ getTeacherForGrade: Numeric grade match: ${teacher}`)
      return teacher
    } else {
      console.warn(`⚠️ getTeacherForGrade: Numeric grade "${normalizedGrade}" not found in map`)
    }
  }
  
  // Try extracting just the number from any string (e.g., "Grade 3" -> "3")
  const numberMatch = normalizedGrade.match(/\d+/)
  if (numberMatch) {
    const gradeNum = numberMatch[0]
    const teacher = GRADE_TO_TEACHER_MAP[gradeNum]
    if (teacher) {
      console.log(`✅ getTeacherForGrade: Extracted number "${gradeNum}" from "${normalizedGrade}": ${teacher}`)
      return teacher
    }
  }
  
  console.warn(`❌ getTeacherForGrade: No teacher found for grade "${grade}" (normalized: "${normalizedGrade}")`)
  console.warn(`Available grades in map:`, Object.keys(GRADE_TO_TEACHER_MAP))
  return ''
}

