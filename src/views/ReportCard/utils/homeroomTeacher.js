/**
 * Utility to get homeroom teacher information for a student
 * B6: Homeroom teacher autofill
 *
 * IMPORTANT:
 * PRIMARY: Use official grade-to-teacher mapping
 * FALLBACK: Try course lookup, then hardcoded map
 */
import { collection, query, where, getDocs } from 'firebase/firestore'
import { firestore } from '../../../Firebase/firebase'
import { getTeacherForGrade, GRADE_TO_TEACHER_MAP } from './gradeToTeacherMap'

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
 * Pick the "best" course from a list of candidate courses for a student.
 * Prefer homeroom-labeled courses, then grade-matching courses, then first.
 */
const pickBestCourse = (courses, normalizedGrade) => {
  if (!Array.isArray(courses) || courses.length === 0) return null

  const grade = (normalizedGrade || '').toString().toLowerCase()

  const scoreCourse = (courseData) => {
    const name = (courseData?.name || courseData?.title || '').toString().toLowerCase()
    const courseGrade = (courseData?.grade || courseData?.gradeLevel || '').toString().toLowerCase()

    let score = 0
    if (name.includes('homeroom') || name.includes('home room')) score += 100
    if (courseGrade === grade) score += 50
    if (grade && name.includes(grade)) score += 20

    // Special: numeric grade matching like "grade 1"
    if (/^\d+$/.test(grade)) {
      const gradePattern = new RegExp(`grade\\s*${grade}|grade${grade}`, 'i')
      if (gradePattern.test(name)) score += 30
    }

    // Prefer active/non-archived if present (sometimes archived is missing)
    if (courseData?.archived === false) score += 10

    return score
  }

  const sorted = [...courses].sort((a, b) => scoreCourse(b) - scoreCourse(a))
  return sorted[0]
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
 * Legacy hardcoded fallback mapping (kept for backwards compatibility)
 * Now uses GRADE_TO_TEACHER_MAP from gradeToTeacherMap.js as primary source
 */
const HARDCODED_TEACHER_MAP = GRADE_TO_TEACHER_MAP

/**
 * Get homeroom teacher name for a student
 * PRIMARY: Uses official grade-to-teacher mapping
 * FALLBACK: Tries course lookup, then hardcoded map
 * @param {Object} student - Student object with grade/program information
 * @returns {Promise<string>} Homeroom teacher name or empty string if not found
 */
export const getHomeroomTeacherName = async (student) => {
  if (!student) {
    console.warn('⚠️ getHomeroomTeacherName called with no student')
    return ''
  }

  // Get student's grade/program from various possible locations
  const grade = 
    student.grade || 
    student.program || 
    student.schooling?.program || 
    student.personalInfo?.grade || 
    student.personalInfo?.program || 
    ''
  
  console.log('🔍 Getting homeroom teacher for:', student.fullName, '| Grade:', grade, '| Full student object:', {
    grade: student.grade,
    program: student.program,
    schoolingProgram: student.schooling?.program,
    personalInfoGrade: student.personalInfo?.grade,
    personalInfoProgram: student.personalInfo?.program
  })

  try {
    const studentId = student.id || student.studentId

    if (!grade) {
      console.warn('⚠️ No grade found for student:', student.fullName, '| Available fields:', Object.keys(student))
      return ''
    }

    // PRIMARY: Use official grade-to-teacher mapping FIRST
    const teacherFromMap = getTeacherForGrade(grade)
    if (teacherFromMap) {
      console.log(`✅ Using official grade-to-teacher mapping for ${student.fullName} (${grade}): ${teacherFromMap}`)
      return teacherFromMap
    }

    // Normalize grade for matching (for course lookup fallback)
    const normalizedGrade = normalizeGradeForMatching(grade)
    console.log(`📊 Grade normalized: "${grade}" → "${normalizedGrade}"`)
    
    if (!normalizedGrade) {
      console.warn('⚠️ Could not normalize grade for student:', student.fullName, grade)
      return ''
    }

    // 1) BEST PATH: find the student's enrolled course first (most reliable in real data)
    // Courses often don't include "homeroom" in the name, so grade-only matching can fail.
    if (studentId) {
      try {
        const coursesRef = collection(firestore, 'courses')

        // Try enrolledList first
        const enrolledListQuery = query(coursesRef, where('enrolledList', 'array-contains', studentId))
        const enrolledListSnap = await getDocs(enrolledListQuery)

        let candidateCourses = enrolledListSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

        // If none, try legacy "students" array
        if (candidateCourses.length === 0) {
          const studentsArrayQuery = query(coursesRef, where('students', 'array-contains', studentId))
          const studentsArraySnap = await getDocs(studentsArrayQuery)
          candidateCourses = studentsArraySnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        }

        // Filter archived in-memory (some docs don't have archived)
        candidateCourses = candidateCourses.filter((c) => c.archived !== true)

        if (candidateCourses.length > 0) {
          console.log(`📚 Found ${candidateCourses.length} enrolled course(s) for ${student.fullName}`)
          const bestCourse = pickBestCourse(candidateCourses, normalizedGrade)
          console.log(`🎯 Best course selected:`, {
            id: bestCourse.id,
            name: bestCourse.name || bestCourse.title,
            grade: bestCourse.grade || bestCourse.gradeLevel,
            teacher: bestCourse.teacher,
            teachers: bestCourse.teachers
          })
          const teacherFromEnrolledCourse = extractTeacherName(bestCourse)
          if (teacherFromEnrolledCourse) {
            console.log(
              `✅ Found teacher via enrolled course for ${student.fullName} (${grade}): ${teacherFromEnrolledCourse} (course: ${bestCourse.name || bestCourse.id})`,
            )
            return teacherFromEnrolledCourse
          }
          console.warn(
            `⚠️ Enrolled course(s) found for ${student.fullName} (${grade}) but no teacher extracted. Best course:`,
            { id: bestCourse.id, name: bestCourse.name || bestCourse.title, teacher: bestCourse.teacher, teachers: bestCourse.teachers }
          )
        } else {
          console.log(`ℹ️ No enrolled courses found for ${student.fullName} (${grade}). Falling back to grade-based lookup.`)
        }
      } catch (enrollmentErr) {
        console.warn('Error querying courses by enrollment (will fall back):', enrollmentErr)
      }
    }
    
    // 2) Fallback: Find homeroom course for this grade from courses collection
    console.log(`🔍 Searching for grade-based homeroom course (grade: ${normalizedGrade})...`)
    const coursesRef = collection(firestore, 'courses')
    const coursesQuery = query(
      coursesRef,
      where('archived', '==', false)
    )
    
    const coursesSnapshot = await getDocs(coursesQuery)
    console.log(`📚 Found ${coursesSnapshot.size} non-archived courses total`)
    
    // Find matching homeroom course
    let homeroomCourse = null
    let homeroomCourseId = null
    
    coursesSnapshot.forEach((doc) => {
      const courseData = doc.data()
      if (courseMatchesGrade(courseData, normalizedGrade)) {
        homeroomCourse = courseData
        homeroomCourseId = doc.id
        console.log(`✅ Found matching homeroom course:`, {
          id: doc.id,
          name: courseData.name || courseData.title,
          grade: courseData.grade || courseData.gradeLevel
        })
        return
      }
    })

    // Try to extract teacher name from course
    let teacherName = ''
    if (homeroomCourse) {
      teacherName = extractTeacherName(homeroomCourse)
      if (teacherName) {
        console.log(`✅ Found homeroom teacher for ${student.fullName} (${grade}): ${teacherName} from course: ${homeroomCourse.name || homeroomCourseId}`)
        return teacherName
      }
      console.warn(`⚠️ Homeroom course found but no teacher in course data for grade: ${grade} (course: ${homeroomCourse.name || homeroomCourseId})`)
    } else {
      console.warn(`⚠️ No homeroom course found for grade: ${grade} (normalized: ${normalizedGrade})`)
    }

    // Fallback to hardcoded mapping if course lookup failed or no teacher in course
    console.log(`🔄 Attempting hardcoded fallback for normalized grade: "${normalizedGrade}"`)
    const fallbackTeacher = HARDCODED_TEACHER_MAP[normalizedGrade.toLowerCase()]
    if (fallbackTeacher) {
      console.log(`✅ Using hardcoded fallback teacher for ${student.fullName} (${grade} → ${normalizedGrade}): ${fallbackTeacher}`)
      return fallbackTeacher
    }

    console.error(`❌ No teacher mapping found for grade: ${grade} (normalized: ${normalizedGrade})`)
    console.error(`❌ Available hardcoded grades:`, Object.keys(HARDCODED_TEACHER_MAP))
    return ''
  } catch (error) {
    console.error('❌ Error fetching homeroom teacher:', error)
    
    // Fallback to official mapping on error
    const grade = student.grade || student.program || ''
    if (grade) {
      const teacherFromMap = getTeacherForGrade(grade)
      if (teacherFromMap) {
        console.log(`✅ Using official mapping (error fallback) for ${student.fullName} (${grade}): ${teacherFromMap}`)
        return teacherFromMap
      }
    }
    
    console.error(`❌ Could not find teacher for ${student.fullName} even with official mapping`)
    return ''
  }
}

