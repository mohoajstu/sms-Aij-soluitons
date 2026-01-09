/**
 * Utility to sync grades from report cards to course grades
 * Extracts marks from report card formData and adds them as assignments to the course
 */
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore'
import { firestore } from '../../../Firebase/firebase'

/**
 * Subject mapping from report card field names to course subject names
 */
const SUBJECT_MAPPING = {
  'languageMarkReport1': 'Language',
  'languageMarkReport2': 'Language',
  'mathMarkReport1': 'Mathematics',
  'mathMarkReport2': 'Mathematics',
  'scienceMarkReport1': 'Science',
  'scienceMarkReport2': 'Science',
  'frenchListeningMarkReport1': 'French',
  'frenchListeningMarkReport2': 'French',
  'frenchSpeakingMarkReport1': 'French',
  'frenchSpeakingMarkReport2': 'French',
  'frenchReadingMarkReport1': 'French',
  'frenchReadingMarkReport2': 'French',
  'frenchWritingMarkReport1': 'French',
  'frenchWritingMarkReport2': 'French',
  'nativeLanguageMarkReport1': 'Arabic Studies',
  'nativeLanguageMarkReport2': 'Arabic Studies',
  'socialStudiesMarkReport1': 'Social Studies',
  'socialStudiesMarkReport2': 'Social Studies',
  'healthMarkReport1': 'Health Education',
  'healthMarkReport2': 'Health Education',
  'peMarkReport1': 'Physical Education',
  'peMarkReport2': 'Physical Education',
  'danceMarkReport1': 'Dance',
  'danceMarkReport2': 'Dance',
  'dramaMarkReport1': 'Drama',
  'dramaMarkReport2': 'Drama',
  'musicMarkReport1': 'Music',
  'musicMarkReport2': 'Music',
  'visualArtsMarkReport1': 'Visual Arts',
  'visualArtsMarkReport2': 'Visual Arts',
}

/**
 * Sync grades from a completed report card to course grades
 * @param {Object} reportCardData - The report card draft/formData
 * @param {string} studentId - Student ID
 * @param {string} term - Term (term1 or term2)
 * @param {string} reportCardType - Type of report card
 */
export const syncGradesToCourse = async (reportCardData, studentId, term, reportCardType) => {
  if (!reportCardData || !studentId) {
    console.warn('Cannot sync grades: missing reportCardData or studentId')
    return
  }

  try {
    // Find the student's homeroom course
    const studentRef = doc(firestore, 'students', studentId)
    const studentSnap = await getDoc(studentRef)
    
    if (!studentSnap.exists()) {
      console.warn('Student not found:', studentId)
      return
    }

    const studentData = studentSnap.data()
    const grade = studentData.grade || studentData.program || ''
    
    // Find homeroom course for this grade
    const coursesRef = collection(firestore, 'courses')
    const coursesQuery = query(
      coursesRef,
      where('archived', '==', false)
    )
    
    const coursesSnapshot = await getDocs(coursesQuery)
    let homeroomCourse = null
    let homeroomCourseId = null
    
    coursesSnapshot.forEach((doc) => {
      const courseData = doc.data()
      const courseName = (courseData.name || courseData.title || '').toLowerCase()
      const courseGrade = courseData.grade || courseData.gradeLevel || ''
      
      const isHomeroom = courseName.includes('homeroom') || courseName.includes('home room')
      const gradeMatches = 
        courseGrade.toString().toLowerCase() === grade.toString().toLowerCase() ||
        courseName.includes(grade.toString().toLowerCase())
      
      if (isHomeroom && gradeMatches) {
        homeroomCourse = courseData
        homeroomCourseId = doc.id
        return
      }
    })

    if (!homeroomCourse || !homeroomCourseId) {
      console.log('No homeroom course found for grade:', grade)
      return
    }

    // Extract grades from report card formData
    const gradesToSync = {}
    const assignmentsToAdd = []
    
    Object.keys(SUBJECT_MAPPING).forEach((markField) => {
      const markValue = reportCardData[markField]
      if (markValue && markValue.toString().trim() !== '') {
        const subject = SUBJECT_MAPPING[markField]
        const assignmentName = `${subject} - ${term === 'term1' ? 'Term 1' : 'Term 2'} - ${reportCardType}`
        
        // Create assignment ID
        const assignmentId = `assignment_${subject}_${term}_${reportCardType}_${Date.now()}`
        
        // Check if assignment already exists
        const existingAssignments = homeroomCourse.assignments || []
        let assignment = existingAssignments.find(a => 
          a.name === assignmentName && a.subject === subject
        )
        
        if (!assignment) {
          assignment = {
            id: assignmentId,
            name: assignmentName,
            subject: subject,
          }
          assignmentsToAdd.push(assignment)
        }
        
        // Add grade for this student
        if (!gradesToSync[studentId]) {
          gradesToSync[studentId] = {}
        }
        gradesToSync[studentId][assignment.id] = parseFloat(markValue) || 0
      }
    })

    if (Object.keys(gradesToSync).length === 0) {
      console.log('No grades to sync')
      return
    }

    // Update course with new assignments and grades
    const courseRef = doc(firestore, 'courses', homeroomCourseId)
    const currentAssignments = homeroomCourse.assignments || []
    const currentGrades = homeroomCourse.grades || {}
    
    // Merge assignments (avoid duplicates)
    const mergedAssignments = [...currentAssignments]
    assignmentsToAdd.forEach((newAssignment) => {
      if (!mergedAssignments.find(a => a.id === newAssignment.id)) {
        mergedAssignments.push(newAssignment)
      }
    })
    
    // Merge grades
    const mergedGrades = { ...currentGrades }
    Object.keys(gradesToSync).forEach((studentId) => {
      if (!mergedGrades[studentId]) {
        mergedGrades[studentId] = {}
      }
      Object.assign(mergedGrades[studentId], gradesToSync[studentId])
    })
    
    await updateDoc(courseRef, {
      assignments: mergedAssignments,
      grades: mergedGrades,
      updatedAt: serverTimestamp(),
    })
    
    console.log('✅ Synced grades to course:', {
      courseId: homeroomCourseId,
      assignmentsAdded: assignmentsToAdd.length,
      gradesSynced: Object.keys(gradesToSync).length,
    })
  } catch (error) {
    console.error('Error syncing grades to course:', error)
  }
}

