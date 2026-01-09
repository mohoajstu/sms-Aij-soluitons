/**
 * Utility to get homeroom teacher information for a student
 * B6: Homeroom teacher autofill
 */
import { collection, query, where, getDocs } from 'firebase/firestore'
import { firestore } from '../../../Firebase/firebase'

/**
 * Get homeroom teacher name for a student
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

    // Normalize grade (e.g., "Grade 1" -> "1", "JK" -> "JK")
    const normalizedGrade = grade.toString().trim()
    
    // Find homeroom course for this grade
    const coursesRef = collection(firestore, 'courses')
    
    // Try multiple patterns to find homeroom course
    const patterns = [
      `Homeroom ${normalizedGrade}`,
      `HomeRoom ${normalizedGrade}`,
      `homeroom ${normalizedGrade}`,
      `Home Room ${normalizedGrade}`,
    ]

    // Query for homeroom courses
    const coursesQuery = query(
      coursesRef,
      where('archived', '==', false)
    )
    
    const coursesSnapshot = await getDocs(coursesQuery)
    
    // Find matching homeroom course
    let homeroomCourse = null
    coursesSnapshot.forEach((doc) => {
      const courseData = doc.data()
      const courseName = (courseData.name || courseData.title || '').toLowerCase()
      const courseGrade = courseData.grade || courseData.gradeLevel || ''
      
      // Check if it's a homeroom course for this grade
      const isHomeroom = courseName.includes('homeroom') || courseName.includes('home room')
      const gradeMatches = 
        courseGrade.toString().toLowerCase() === normalizedGrade.toLowerCase() ||
        courseName.includes(normalizedGrade.toLowerCase())
      
      if (isHomeroom && gradeMatches) {
        homeroomCourse = courseData
        return
      }
    })

    if (!homeroomCourse) {
      console.log(`No homeroom course found for grade: ${normalizedGrade}`)
      return ''
    }

    // Extract teacher name from course
    let teacherName = ''
    
    // Try new format first (teacher array with objects)
    if (Array.isArray(homeroomCourse.teacher) && homeroomCourse.teacher.length > 0) {
      const teacher = homeroomCourse.teacher[0]
      teacherName = teacher.name || (teacher.firstName && teacher.lastName 
        ? `${teacher.firstName} ${teacher.lastName}` 
        : '')
    }
    // Try teachers array (legacy)
    else if (Array.isArray(homeroomCourse.teachers) && homeroomCourse.teachers.length > 0) {
      teacherName = homeroomCourse.teachers[0]
    }
    // Try single teacher string
    else if (typeof homeroomCourse.teacher === 'string') {
      teacherName = homeroomCourse.teacher
    }

    if (teacherName) {
      console.log(`Found homeroom teacher for ${student.fullName}: ${teacherName}`)
      return teacherName
    }

    console.log(`No teacher found in homeroom course for grade: ${normalizedGrade}`)
    return ''
  } catch (error) {
    console.error('Error fetching homeroom teacher:', error)
    return ''
  }
}

