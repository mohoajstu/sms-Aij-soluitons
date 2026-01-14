/**
 * Utility to get homeroom teacher information for a student
 * B6: Homeroom teacher autofill
 * Dynamically retrieves homeroom teacher from courses collection based on student's grade
 */
import { collection, query, where, getDocs } from 'firebase/firestore'
import { firestore } from '../../../Firebase/firebase'

/**
 * Extract teacher name from course data (handles multiple formats)
 * @param {Object} courseData - Course document data
 * @returns {string} Teacher name or empty string
 */
const extractTeacherName = (courseData) => {
  if (!courseData) return ''

  // Format 1: teacher array with objects (new format)
  // teacher: [{id, name, firstName, lastName, role, schoolId, source}, ...]
  if (Array.isArray(courseData.teacher) && courseData.teacher.length > 0) {
    const teacher = courseData.teacher[0]
    if (teacher.name) {
      return teacher.name
    }
    if (teacher.firstName && teacher.lastName) {
      return `${teacher.firstName} ${teacher.lastName}`
    }
    if (teacher.firstName) {
      return teacher.firstName
    }
  }

  // Format 2: teachers array (legacy - array of strings)
  // teachers: ["Teacher Name", ...]
  if (Array.isArray(courseData.teachers) && courseData.teachers.length > 0) {
    const name = courseData.teachers[0]
    if (name && typeof name === 'string') {
      return name
    }
  }

  // Format 3: single teacher string
  // teacher: "Teacher Name"
  if (typeof courseData.teacher === 'string' && courseData.teacher.trim()) {
    return courseData.teacher.trim()
  }

  return ''
}

/**
 * Normalize grade for matching (handles JK, SK, SK1, SK2, Grade 1, etc.)
 * @param {string} grade - Grade value from student
 * @returns {string} Normalized grade for matching
 */
const normalizeGradeForMatching = (grade) => {
  if (!grade) return ''
  const gradeStr = grade.toString().trim().toLowerCase()
  
  // Handle JK
  if (gradeStr.includes('jk') || gradeStr === 'junior kindergarten') {
    return 'jk'
  }
  
  // Handle SK, SK1, SK2
  if (gradeStr.includes('sk')) {
    // Extract SK variant (SK, SK1, SK2, etc.)
    const skMatch = gradeStr.match(/sk\d*/i)
    if (skMatch) {
      return skMatch[0].toLowerCase()
    }
    return 'sk'
  }
  
  // Extract numeric grade
  const numberMatch = gradeStr.match(/\d+/)
  if (numberMatch) {
    return numberMatch[0]
  }
  
  return gradeStr
}

/**
 * Check if course matches the student's grade
 * @param {Object} courseData - Course document data
 * @param {string} normalizedGrade - Normalized grade from student
 * @returns {boolean} True if course matches grade
 */
const courseMatchesGrade = (courseData, normalizedGrade) => {
  const courseName = (courseData.name || courseData.title || '').toLowerCase()
  const courseGrade = (courseData.grade || courseData.gradeLevel || '').toString().toLowerCase()
  
  // Check if it's a homeroom course
  const isHomeroom = courseName.includes('homeroom') || courseName.includes('home room')
  if (!isHomeroom) return false
  
  // Match by grade field (exact match)
  if (courseGrade === normalizedGrade) return true
  
  // Match by course name (e.g., "Homeroom Grade 1", "Homeroom SK1", "Homeroom Grade 7")
  if (courseName.includes(normalizedGrade)) return true
  
  // Special handling for numeric grades (1-8)
  // Match "Homeroom Grade 7" with "7", "Homeroom Grade 8" with "8", etc.
  if (/^\d+$/.test(normalizedGrade)) {
    // Check if course name contains "grade X" or "gradeX" where X matches normalizedGrade
    const gradePattern = new RegExp(`grade\\s*${normalizedGrade}|grade${normalizedGrade}`, 'i')
    if (gradePattern.test(courseName)) return true
    
    // Also check if course grade field matches (e.g., "7" matches "7")
    if (courseGrade === normalizedGrade) return true
  }
  
  // Special handling for SK variants
  if (normalizedGrade.startsWith('sk')) {
    // Match "Homeroom SK1" with "sk1", "Homeroom SK2" with "sk2", etc.
    if (courseName.includes('sk') && courseGrade.includes('sk')) {
      // Extract SK variant from course
      const courseSKMatch = courseName.match(/sk\d*/i) || courseGrade.match(/sk\d*/i)
      const studentSKMatch = normalizedGrade.match(/sk\d*/i)
      if (courseSKMatch && studentSKMatch) {
        return courseSKMatch[0].toLowerCase() === studentSKMatch[0].toLowerCase()
      }
      // If student has SK1/SK2 but course just has SK, still match
      if (normalizedGrade === 'sk1' || normalizedGrade === 'sk2') {
        return courseGrade === 'sk' || (courseName.includes('homeroom sk') && !courseName.match(/sk\d+/))
      }
    }
  }
  
  return false
}

/**
 * Hardcoded fallback mapping for homeroom teachers by grade
 * Used when course lookup fails or course doesn't have teacher info
 */
const HARDCODED_TEACHER_MAP = {
  'jk': 'Amera Syed',
  'sk': 'Rafia Husain', // Default SK
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
 * Get homeroom teacher name for a student
 * Dynamically retrieves from courses collection based on student's grade
 * Falls back to hardcoded mapping if course lookup fails
 * @param {Object} student - Student object with grade/program information
 * @returns {Promise<string>} Homeroom teacher name or empty string if not found
 */
export const getHomeroomTeacherName = async (student) => {
  if (!student) return ''

  try {
    // Get student's grade/program
    const grade = student.grade || student.program || ''
    if (!grade) {
      console.log('No grade found for student:', student.fullName)
      return ''
    }

    // Normalize grade for matching
    const normalizedGrade = normalizeGradeForMatching(grade)
    if (!normalizedGrade) {
      console.log('Could not normalize grade for student:', student.fullName, grade)
      return ''
    }
    
    // Find homeroom course for this grade from courses collection
    const coursesRef = collection(firestore, 'courses')
    const coursesQuery = query(
      coursesRef,
      where('archived', '==', false)
    )
    
    const coursesSnapshot = await getDocs(coursesQuery)
    
    // Find matching homeroom course
    let homeroomCourse = null
    let homeroomCourseId = null
    
    coursesSnapshot.forEach((doc) => {
      const courseData = doc.data()
      if (courseMatchesGrade(courseData, normalizedGrade)) {
        homeroomCourse = courseData
        homeroomCourseId = doc.id
        return
      }
    })

    // Try to extract teacher name from course
    let teacherName = ''
    if (homeroomCourse) {
      teacherName = extractTeacherName(homeroomCourse)
      if (teacherName) {
        console.log(`Found homeroom teacher for ${student.fullName} (${grade}): ${teacherName} from course: ${homeroomCourseId}`)
        return teacherName
      }
      console.log(`No teacher found in homeroom course for grade: ${grade} (course: ${homeroomCourseId})`)
    } else {
      console.log(`No homeroom course found for grade: ${grade} (normalized: ${normalizedGrade})`)
    }

    // Fallback to hardcoded mapping if course lookup failed or no teacher in course
    const fallbackTeacher = HARDCODED_TEACHER_MAP[normalizedGrade.toLowerCase()]
    if (fallbackTeacher) {
      console.log(`Using hardcoded fallback teacher for ${student.fullName} (${grade}): ${fallbackTeacher}`)
      return fallbackTeacher
    }

    console.log(`No teacher mapping found for grade: ${grade} (normalized: ${normalizedGrade})`)
    return ''
  } catch (error) {
    console.error('Error fetching homeroom teacher:', error)
    
    // Fallback to hardcoded mapping on error
    const grade = student.grade || student.program || ''
    if (grade) {
      const normalizedGrade = normalizeGradeForMatching(grade)
      const fallbackTeacher = HARDCODED_TEACHER_MAP[normalizedGrade?.toLowerCase()]
      if (fallbackTeacher) {
        console.log(`Using hardcoded fallback teacher (error case) for ${student.fullName} (${grade}): ${fallbackTeacher}`)
        return fallbackTeacher
      }
    }
    
    return ''
  }
}

