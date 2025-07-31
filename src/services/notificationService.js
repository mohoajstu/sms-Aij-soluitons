/**
 * A service for sending SMS notifications using Firebase Functions
 */

// Firebase Functions endpoint for sending SMS
const FIREBASE_FUNCTIONS_URL =
  'https://northamerica-northeast1-tarbiyah-sms.cloudfunctions.net/sendSmsHttp'

const NotificationService = {
  /**
   * Send an SMS notification about student absence
   *
   * @param {Object} data Notification data
   * @param {string} data.phoneNumber Parent's phone number
   * @param {string} data.studentName Student's name
   * @param {string} data.className Class name
   * @param {string} data.date Date of absence
   * @returns {Promise<Object>} Result of the API call
   */
  sendAbsenceNotification: async ({ phoneNumber, studentName, className, date }) => {
    try {
      // Format the phone number if needed
      const formattedPhoneNumber = formatPhoneNumber(phoneNumber)

      const message = `${studentName} absent from ${className || 'class'} on ${new Date(date).toLocaleDateString()}.`

      const response = await fetch(FIREBASE_FUNCTIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formattedPhoneNumber,
          message,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Firebase Function error:', result)
        throw new Error(result.message || 'Failed to send SMS notification')
      }

      console.log('SMS sent successfully:', result)
      return {
        success: true,
        sid: result.sid,
        message,
      }
    } catch (error) {
      console.error('Error sending SMS notification:', error)
      throw error
    }
  },

  /**
   * Send attendance reminder notification to admin
   *
   * @param {Object} data Notification data
   * @param {string} data.phoneNumber Admin's phone number
   * @param {string} data.adminName Admin's name
   * @param {string} data.courseName Course name
   * @param {string} data.teacherName Teacher's name
   * @param {string} data.reminderTime Reminder time (e.g., "9:15 AM")
   * @returns {Promise<Object>} Result of the API call
   */
  sendAdminAttendanceReminder: async ({ phoneNumber, adminName, courseName, teacherName, reminderTime }) => {
    try {
      const formattedPhoneNumber = formatPhoneNumber(phoneNumber)
      const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      const message = `${courseName} attendance not completed by ${reminderTime}. Teacher: ${teacherName}.`

      const response = await fetch(FIREBASE_FUNCTIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formattedPhoneNumber,
          message,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Firebase Function error:', result)
        throw new Error(result.message || 'Failed to send admin reminder notification')
      }

      console.log('Admin reminder SMS sent successfully:', result)
      return {
        success: true,
        sid: result.sid,
        message,
      }
    } catch (error) {
      console.error('Error sending admin reminder notification:', error)
      throw error
    }
  },

  /**
   * Send attendance reminder notification to teacher
   *
   * @param {Object} data Notification data
   * @param {string} data.phoneNumber Teacher's phone number
   * @param {string} data.teacherName Teacher's name
   * @param {string} data.courseName Course name
   * @param {string} data.reminderTime Reminder time (e.g., "9:15 AM")
   * @returns {Promise<Object>} Result of the API call
   */
  sendTeacherAttendanceReminder: async ({ phoneNumber, teacherName, courseName, reminderTime }) => {
    try {
      const formattedPhoneNumber = formatPhoneNumber(phoneNumber)
      const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      const message = `Attendance Reminder:  Please complete ${courseName} attendance by ${reminderTime}.`

      const response = await fetch(FIREBASE_FUNCTIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formattedPhoneNumber,
          message,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Firebase Function error:', result)
        throw new Error(result.message || 'Failed to send teacher reminder notification')
      }

      console.log('Teacher reminder SMS sent successfully:', result)
      return {
        success: true,
        sid: result.sid,
        message,
      }
    } catch (error) {
      console.error('Error sending teacher reminder notification:', error)
      throw error
    }
  },

  /**
   * Check if SMS configuration is valid
   *
   * @returns {Promise<boolean>} Whether SMS configuration is valid
   */
  checkSmsConfiguration: async () => {
    try {
      const response = await fetch(FIREBASE_FUNCTIONS_URL, {
        method: 'OPTIONS',
      })
      return response.ok || response.status === 204
    } catch (error) {
      console.error('Error checking SMS configuration:', error)
      return false
    }
  },
}

/**
 * Helper function to format phone numbers
 *
 * @param {string} phoneNumber Phone number to format
 * @returns {string} Formatted phone number
 */
function formatPhoneNumber(phoneNumber) {
  // Remove any non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '')

  // Add the + prefix if it's missing
  if (!phoneNumber.startsWith('+')) {
    // For US numbers, add +1 prefix if missing
    if (cleaned.length === 10) {
      cleaned = '1' + cleaned
    }
    cleaned = '+' + cleaned
  }

  return cleaned
}

export default NotificationService
