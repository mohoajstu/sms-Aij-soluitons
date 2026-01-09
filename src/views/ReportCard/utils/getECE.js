/**
 * Utility to get Early Childhood Educator (ECE) information for a student
 * Gets ECE from the student's homeroom course
 */
import { collection, query, where, getDocs } from 'firebase/firestore'
import { firestore } from '../../../Firebase/firebase'

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

    // Normalize grade (e.g., "Grade 1" -> "1", "JK" -> "JK")
    const normalizedGrade = grade.toString().trim()
    
    // Find homeroom course for this grade
    const coursesRef = collection(firestore, 'courses')
    
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

    // Extract ECE name from course
    if (homeroomCourse.ece && homeroomCourse.ece.name) {
      const eceName = homeroomCourse.ece.name
      console.log(`Found ECE for ${student.fullName}: ${eceName}`)
      return eceName
    }

    console.log(`No ECE found in homeroom course for grade: ${normalizedGrade}`)
    return ''
  } catch (error) {
    console.error('Error fetching ECE:', error)
    return ''
  }
}

