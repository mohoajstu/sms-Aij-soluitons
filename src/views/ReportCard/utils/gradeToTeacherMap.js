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
 * Quran Teacher Mapping
 * Mapping of grades to Quran Studies teachers
 * Used for auto-filling teacher name in Quran Report Cards
 */
export const QURAN_TEACHER_MAP = {
  // Grade-specific Quran teachers
  '1': 'Naheda Nour',
  '2': 'Najat Shallouf',
  '3': 'Rana Issa',
  '4': 'Rima Zarka',
  '5': 'Soha Amri',
  '6': 'Amani Alkoujak',
  '7': 'Rima Zarka',      // Gr 4 and 7 share same teacher
  '8': 'Rana Issa',       // Gr 3 and 8 share same teacher
  // Default for kindergarten or unmatched grades
  'default': '',
}

/**
 * Get Quran teacher name for a given grade
 * @param {string} grade - Student grade (e.g., 'JK', 'SK1', '1', '2', etc.)
 * @returns {string} Quran teacher name
 */
export const getQuranTeacherForGrade = (grade) => {
  if (!grade) {
    return QURAN_TEACHER_MAP['default'] || ''
  }
  
  const normalizedGrade = grade.toString().toLowerCase().trim()
  console.log(`🕌 getQuranTeacherForGrade: Looking up grade "${grade}" (normalized: "${normalizedGrade}")`)
  
  // Check for grade-specific Quran teacher first (direct match)
  if (QURAN_TEACHER_MAP[normalizedGrade]) {
    console.log(`✅ getQuranTeacherForGrade: Direct match found: ${QURAN_TEACHER_MAP[normalizedGrade]}`)
    return QURAN_TEACHER_MAP[normalizedGrade]
  }
  
  // Handle "Grade X" format (e.g., "Grade 3", "grade 7")
  const gradeMatch = normalizedGrade.match(/grade\s*(\d+)/i)
  if (gradeMatch && QURAN_TEACHER_MAP[gradeMatch[1]]) {
    console.log(`✅ getQuranTeacherForGrade: Extracted grade "${gradeMatch[1]}": ${QURAN_TEACHER_MAP[gradeMatch[1]]}`)
    return QURAN_TEACHER_MAP[gradeMatch[1]]
  }
  
  // Try extracting just the number from any string
  const numberMatch = normalizedGrade.match(/\d+/)
  if (numberMatch && QURAN_TEACHER_MAP[numberMatch[0]]) {
    console.log(`✅ getQuranTeacherForGrade: Extracted number "${numberMatch[0]}": ${QURAN_TEACHER_MAP[numberMatch[0]]}`)
    return QURAN_TEACHER_MAP[numberMatch[0]]
  }
  
  // Return default (empty for kindergarten - they may not have Quran reports)
  console.log(`ℹ️ getQuranTeacherForGrade: No Quran teacher mapping for grade "${grade}"`)
  return QURAN_TEACHER_MAP['default'] || ''
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
  
  // Handle SK without number - DON'T default to SK1
  // Let it fall through to course-based lookup which can determine SK1 vs SK2
  // based on course name (e.g., "Homeroom SK - Tr. Rafia" vs "Homeroom SK - Tr. Huda")
  if (normalizedGrade === 'sk') {
    console.log(`⚠️ getTeacherForGrade: SK without number - cannot determine SK1 vs SK2, returning empty to trigger course lookup`)
    return ''
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

