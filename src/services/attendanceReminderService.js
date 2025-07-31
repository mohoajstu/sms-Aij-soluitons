import { collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '../firebase'
import fcmService from './fcmService'
import { toast } from 'react-hot-toast'

// Define homeroom class patterns
const homeroomPatterns = [
  /^jk$/i,                    // JK
  /^sk.*rafia$/i,            // SK - Tr. Rafia
  /^sk.*huda$/i,             // SK - Tr. Huda
  /^homeroom\s+junior\s+kindergarten$/i,  // HomeRoom Junior Kindergarten
  /^homeroom\s+senior\s+kindergarten$/i,  // HomeRoom Senior Kindergarten
  /^homeroom\s+grade\s*[1-8]$/i,  // HomeRoom Grade 1-8
  /^homeroom.*junior.*kindergarten$/i,  // More flexible HomeRoom Junior Kindergarten
  /^homeroom.*senior.*kindergarten$/i,  // More flexible HomeRoom Senior Kindergarten
  /^homeroom.*grade\s*[1-8]$/i,  // More flexible HomeRoom Grade 1-8
  /^home\s*room.*junior.*kindergarten$/i,  // Alternative spacing
  /^home\s*room.*senior.*kindergarten$/i,  // Alternative spacing
  /^home\s*room.*grade\s*[1-8]$/i,  // Alternative spacing
  /^homer\s*oom.*junior.*kindergarten$/i,  // Typo variations
  /^homer\s*oom.*senior.*kindergarten$/i,  // Typo variations
  /^homer\s*oom.*grade\s*[1-8]$/i,  // Typo variations
  /^homer\s*oom\s+junior\s+kindergarten$/i,  // Typo variations
  /^homer\s*oom\s+senior\s+kindergarten$/i,  // Typo variations
  /^homer\s*oom\s+grade\s*[1-8]$/i,  // Typo variations
  /^homer\s*oom.*$/i,  // Any course with "homer oom" (typo)
  /^home\s*room.*$/i,  // Any course with "home room"
  /^homeroom.*$/i,  // Any course with "homeroom"
  /^homer\s*oom.*$/i,  // Any course with "homer oom"
]

// Function to check if a course is a homeroom class
const isHomeroomClass = (course) => {
  const title = course.name || course.label || course.title || ''
  
  // Check title patterns
  for (const pattern of homeroomPatterns) {
    if (pattern.test(title)) {
      return true
    }
  }
  
  // Additional check for courses that might have "HomeRoom" in the title
  if (title.toLowerCase().includes('homer') || title.toLowerCase().includes('homeroom')) {
    console.log('Found potential homeroom class:', title)
    return true
  }
  
  return false
}

const AttendanceReminderService = {
  /**
   * Check if attendance is completed for a specific course and date
   * @param {string} courseId Course ID
   * @param {string} date Date in YYYY-MM-DD format
   * @returns {Promise<boolean>} Whether attendance is completed
   */
  isAttendanceCompleted: async (courseId, date) => {
    try {
      const attendanceRef = doc(firestore, 'attendance', date)
      const attendanceDoc = await getDoc(attendanceRef)
      
      if (!attendanceDoc.exists()) {
        return false
      }
      
      const attendanceData = attendanceDoc.data()
      const courses = attendanceData.courses || []
      
      // Check if the specific course has attendance marked
      const courseAttendance = courses.find(course => course.courseId === courseId)
      return courseAttendance && courseAttendance.students && courseAttendance.students.length > 0
    } catch (error) {
      console.error('Error checking attendance completion:', error)
      return false
    }
  },

  /**
   * Get all admins
   * @returns {Promise<Array>} Array of admin objects
   */
  getAdmins: async () => {
    try {
      const adminsRef = collection(firestore, 'admins')
      const adminsSnapshot = await getDocs(adminsRef)
      
      const admins = []
      adminsSnapshot.forEach(doc => {
        const adminData = doc.data()
        admins.push({
          id: doc.id,
          name: `${adminData.personalInfo?.firstName || ''} ${adminData.personalInfo?.lastName || ''}`.trim(),
          ...adminData
        })
      })
      
      return admins
    } catch (error) {
      console.error('Error fetching admins:', error)
      return []
    }
  },

  /**
   * Get teacher information for a specific course
   * @param {string} courseId Course ID
   * @returns {Promise<Object|null>} Teacher object or null
   */
  getTeacherForCourse: async (courseId) => {
    try {
      const courseRef = doc(firestore, 'courses', courseId)
      const courseDoc = await getDoc(courseRef)
      
      if (!courseDoc.exists()) {
        return null
      }
      
      const courseData = courseDoc.data()
      const teacherId = courseData.teacherId || courseData.teacher?.id
      
      if (!teacherId) {
        return null
      }
      
      // Try to get teacher from faculty collection
      const facultyRef = doc(firestore, 'faculty', teacherId)
      const facultyDoc = await getDoc(facultyRef)
      
      if (facultyDoc.exists()) {
        const facultyData = facultyDoc.data()
        return {
          id: teacherId,
          name: `${facultyData.personalInfo?.firstName || ''} ${facultyData.personalInfo?.lastName || ''}`.trim(),
          ...facultyData
        }
      }
      
      return null
    } catch (error) {
      console.error('Error fetching teacher for course:', error)
      return null
    }
  },

  /**
   * Get all homeroom courses
   * @returns {Promise<Array>} Array of homeroom course objects
   */
  getHomeroomCourses: async () => {
    try {
      const coursesRef = collection(firestore, 'courses')
      const coursesSnapshot = await getDocs(coursesRef)
      
      const allCourses = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      console.log('All courses found:', allCourses.map(c => ({
        id: c.id,
        name: c.name || c.label || c.title || 'Unnamed',
        subject: c.subject
      })))
      
      // Filter to only homeroom classes
      const homeroomCourses = allCourses.filter(isHomeroomClass)
      
      console.log('Found', allCourses.length, 'total courses')
      console.log('Filtered to', homeroomCourses.length, 'homeroom courses')
      console.log('Homeroom courses:', homeroomCourses.map(c => c.name || c.label || c.title))
      
      return homeroomCourses
    } catch (error) {
      console.error('Error fetching homeroom courses:', error)
      return []
    }
  },

  /**
   * Send attendance reminder to admins via in-app notifications
   * @param {Object} course Course object
   * @param {string} reminderTime Reminder time (e.g., "9:15 AM")
   * @returns {Promise<Object>} Result of sending reminders
   */
  sendAdminReminders: async (course, reminderTime) => {
    try {
      const teacher = await AttendanceReminderService.getTeacherForCourse(course.id)
      
      const result = await fcmService.sendAdminAttendanceReminder({
        courseName: course.name || course.label || course.title || 'Unknown Course',
        teacherName: teacher?.name || 'Unknown Teacher',
        reminderTime
      })
      
      return result
    } catch (error) {
      console.error('Error sending admin reminders:', error)
      throw error
    }
  },

  /**
   * Check and send attendance reminders for homeroom classes at a specific time
   * @param {string} reminderTime Reminder time (e.g., "9:15 AM")
   * @returns {Promise<Object>} Result of the reminder check
   */
  checkAndSendReminders: async (reminderTime = '9:15 AM') => {
    try {
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      
      // Get only homeroom courses
      const homeroomCourses = await AttendanceReminderService.getHomeroomCourses()
      
      const results = {
        coursesChecked: 0,
        remindersSent: 0,
        adminReminders: 0,
        errors: []
      }
      
      for (const course of homeroomCourses) {
        results.coursesChecked++
        
        try {
          // Check if attendance is completed for this course
          const isCompleted = await AttendanceReminderService.isAttendanceCompleted(course.id, today)
          
          if (!isCompleted) {
            // Send admin reminders only (automated)
            const adminResult = await AttendanceReminderService.sendAdminReminders(course, reminderTime)
            if (adminResult.success) {
              results.adminReminders++
              results.remindersSent++
            }
          }
        } catch (error) {
          console.error(`Error processing course ${course.id}:`, error)
          results.errors.push({
            courseId: course.id,
            courseName: course.name || course.label || course.title,
            error: error.message
          })
        }
      }
      
      return results
    } catch (error) {
      console.error('Error checking and sending reminders:', error)
      throw error
    }
  },

  /**
   * Manually trigger reminders for a specific course
   * @param {Object} course Course object
   * @param {string} reminderTime Reminder time (e.g., "9:15 AM")
   * @returns {Promise<Object>} Result of sending reminders
   */
  triggerManualReminders: async (course, reminderTime = '9:15 AM') => {
    try {
      // Check if this is a homeroom class
      if (!isHomeroomClass(course)) {
        return {
          success: false,
          message: 'This course is not a homeroom class. Only homeroom classes are eligible for attendance reminders.'
        }
      }
      
      const today = new Date().toISOString().split('T')[0]
      const isCompleted = await AttendanceReminderService.isAttendanceCompleted(course.id, today)
      
      if (isCompleted) {
        return {
          success: false,
          message: 'Attendance is already completed for this course today'
        }
      }
      
      // Send admin reminders only (automated)
      const adminResult = await AttendanceReminderService.sendAdminReminders(course, reminderTime)
      
      return {
        success: adminResult.success,
        adminResult,
        message: `Admin notifications sent for ${course.name || course.label || course.title}. Teachers will be notified manually by admins.`
      }
    } catch (error) {
      console.error('Error triggering manual reminders:', error)
      throw error
    }
  }
}

export default AttendanceReminderService 