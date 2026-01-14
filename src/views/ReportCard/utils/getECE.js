/**
 * Utility to get Early Childhood Educator (ECE) information for a student
 * Gets ECE from the student's homeroom course
 */
import { collection, query, where, getDocs } from 'firebase/firestore'
import { firestore } from '../../../Firebase/firebase'

/**
 * Hardcoded fallback mapping for ECEs by grade
 */
const HARDCODED_ECE_MAP = {
  'jk': 'Saniya Suleman',
  'sk': 'Saniya Suleman',
  'sk1': 'Saniya Suleman',
  'sk2': 'Saniya Suleman',
}

/**
 * Normalize grade for matching
 */
const normalizeGrade = (grade) => {
  if (!grade) return ''
  const gradeStr = grade.toString().trim().toLowerCase()
  
  if (gradeStr.includes('jk') || gradeStr === 'junior kindergarten') {
    return 'jk'
  }
  
  if (gradeStr.includes('sk')) {
    const skMatch = gradeStr.match(/sk\d*/i)
    if (skMatch) {
      return skMatch[0].toLowerCase()
    }
    return 'sk'
  }
  
  return gradeStr
}

/**
 * Extract ECE name from course data (handles multiple formats)
 */
const extractECEName = (courseData) => {
  if (!courseData) return ''

  // Format 1: ece object with name
  if (courseData.ece && courseData.ece.name) {
    return courseData.ece.name
  }

  // Format 2: ece as string
  if (typeof courseData.ece === 'string' && courseData.ece.trim()) {
    return courseData.ece.trim()
  }

  // Format 3: eces array
  if (Array.isArray(courseData.eces) && courseData.eces.length > 0) {
    const ece = courseData.eces[0]
    if (typeof ece === 'string') {
      return ece
    }
    if (ece.name) {
      return ece.name
    }
  }

  return ''
}

/**
 * Get ECE name for a student from their homeroom course
 * @param {Object} student - Student object with grade/program information
 * @returns {Promise<string>} ECE name or empty string if not found
 */
export const getECEName = async (student) => {
  if (!student) return ''

  try {
    // Get student's grade/program
    const grade = student.grade || student.program || ''
    if (!grade) {
      console.log('No grade found for student:', student.fullName)
      return ''
    }

    // Normalize grade
    const normalizedGrade = normalizeGrade(grade)
    if (!normalizedGrade) {
      console.log('Could not normalize grade for student:', student.fullName, grade)
      return ''
    }
    
    // Find homeroom course for this grade
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
      const courseName = (courseData.name || courseData.title || '').toLowerCase()
      const courseGrade = (courseData.grade || courseData.gradeLevel || '').toString().toLowerCase()
      
      // Check if it's a homeroom course
      const isHomeroom = courseName.includes('homeroom') || courseName.includes('home room')
      if (!isHomeroom) return
      
      // Match by grade
      const gradeMatches = 
        courseGrade === normalizedGrade ||
        courseName.includes(normalizedGrade)
      
      if (gradeMatches) {
        homeroomCourse = courseData
        homeroomCourseId = doc.id
        return
      }
    })

    // Try to extract ECE from course
    let eceName = ''
    if (homeroomCourse) {
      eceName = extractECEName(homeroomCourse)
      if (eceName) {
        console.log(`Found ECE for ${student.fullName} (${grade}): ${eceName} from course: ${homeroomCourseId}`)
        return eceName
      }
      console.log(`No ECE found in homeroom course for grade: ${grade} (course: ${homeroomCourseId})`)
    } else {
      console.log(`No homeroom course found for grade: ${grade} (normalized: ${normalizedGrade})`)
    }

    // Fallback to hardcoded mapping
    const fallbackECE = HARDCODED_ECE_MAP[normalizedGrade.toLowerCase()]
    if (fallbackECE) {
      console.log(`Using hardcoded fallback ECE for ${student.fullName} (${grade}): ${fallbackECE}`)
      return fallbackECE
    }

    console.log(`No ECE mapping found for grade: ${grade} (normalized: ${normalizedGrade})`)
    return ''
  } catch (error) {
    console.error('Error fetching ECE:', error)
    
    // Fallback to hardcoded mapping on error
    const grade = student.grade || student.program || ''
    if (grade) {
      const normalizedGrade = normalizeGrade(grade)
      const fallbackECE = HARDCODED_ECE_MAP[normalizedGrade?.toLowerCase()]
      if (fallbackECE) {
        console.log(`Using hardcoded fallback ECE (error case) for ${student.fullName} (${grade}): ${fallbackECE}`)
        return fallbackECE
      }
    }
    
    return ''
  }
}

