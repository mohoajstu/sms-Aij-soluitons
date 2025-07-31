const functions = require('firebase-functions/v1')
const admin = require('firebase-admin')
const twilio = require('twilio')
const cors = require('cors')

admin.initializeApp()

const accountSid = functions.config().twilio.accountsid
const authToken = functions.config().twilio.authtoken
const twilioNumber = functions.config().twilio.phonenumber

const client = new twilio(accountSid, authToken)

/**
 * Helper function to format phone numbers into E.164 format.
 * @param {string} phoneNumber The phone number to format.
 * @returns {string} The formatted phone number.
 */
function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return null
  }
  // Remove any non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '')

  // If the number is 10 digits and doesn't start with 1, assume it's a US/Canada number and add +1
  if (cleaned.length === 10 && cleaned.charAt(0) !== '1') {
    cleaned = '1' + cleaned
  }

  // Add the + prefix if it's missing
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  }

  return cleaned
}

/**
 * Check if attendance is completed for a specific course and date
 * @param {Object} db Firestore database instance
 * @param {string} courseId Course ID
 * @param {string} date Date in YYYY-MM-DD format
 * @returns {Promise<boolean>} Whether attendance is completed
 */
async function isAttendanceCompleted(db, courseId, date) {
  try {
    const attendanceRef = db.collection('attendance').doc(date)
    const attendanceDoc = await attendanceRef.get()
    
    if (!attendanceDoc.exists) {
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
}

/**
 * Get all admins with phone numbers
 * @param {Object} db Firestore database instance
 * @returns {Promise<Array>} Array of admin objects with phone numbers
 */
async function getAdminsWithPhoneNumbers(db) {
  try {
    const adminsRef = db.collection('admins')
    const adminsSnapshot = await adminsRef.get()
    
    const admins = []
    adminsSnapshot.forEach(doc => {
      const adminData = doc.data()
      if (adminData.personalInfo?.phone1 || adminData.contact?.phone1) {
        admins.push({
          id: doc.id,
          name: `${adminData.personalInfo?.firstName || ''} ${adminData.personalInfo?.lastName || ''}`.trim(),
          phoneNumber: adminData.personalInfo?.phone1 || adminData.contact?.phone1,
          ...adminData
        })
      }
    })
    
    return admins
  } catch (error) {
    console.error('Error fetching admins:', error)
    return []
  }
}

/**
 * Get teacher information for a specific course
 * @param {Object} db Firestore database instance
 * @param {string} courseId Course ID
 * @returns {Promise<Object|null>} Teacher object or null
 */
async function getTeacherForCourse(db, courseId) {
  try {
    const courseRef = db.collection('courses').doc(courseId)
    const courseDoc = await courseRef.get()
    
    if (!courseDoc.exists) {
      return null
    }
    
    const courseData = courseDoc.data()
    const teacherId = courseData.teacherId || courseData.teacher?.id
    
    if (!teacherId) {
      return null
    }
    
    // Try to get teacher from faculty collection
    const facultyRef = db.collection('faculty').doc(teacherId)
    const facultyDoc = await facultyRef.get()
    
    if (facultyDoc.exists) {
      const facultyData = facultyDoc.data()
      return {
        id: teacherId,
        name: `${facultyData.personalInfo?.firstName || ''} ${facultyData.personalInfo?.lastName || ''}`.trim(),
        phoneNumber: facultyData.personalInfo?.phone1 || facultyData.contact?.phone1,
        ...facultyData
      }
    }
    
    return null
  } catch (error) {
    console.error('Error fetching teacher for course:', error)
    return null
  }
}

exports.sendScheduledSms = functions
  .region('northamerica-northeast1')
  .pubsub.schedule('0 12 * * 1-5')
  .timeZone('America/Toronto')
  .onRun(async (context) => {
    console.log('Running scheduled attendance SMS job.')

    const db = admin.firestore()
    const today = new Date()
    const date = today.toISOString().split('T')[0] // Format as YYYY-MM-DD

    try {
      const attendanceRef = db.collection('attendance').doc(date)
      const attendanceDoc = await attendanceRef.get()

      if (!attendanceDoc.exists) {
        console.log(`No attendance record found for date: ${date}`)
        return null
      }

      const attendanceData = attendanceDoc.data()
      const courses = attendanceData.courses || []
      const notifications = {} // Key: studentId, Value: { studentName, issues: [] }

      // Step 1: Consolidate all attendance issues for each student
      for (const course of courses) {
        const students = course.students || []
        for (const student of students) {
          if (student.status === 'Absent' || student.status === 'Late') {
            if (!notifications[student.studentId]) {
              notifications[student.studentId] = {
                studentName: student.studentName,
                issues: [],
              }
            }
            notifications[student.studentId].issues.push({
              status: student.status,
              courseTitle: course.courseTitle || 'Unnamed Course',
            })
          }
        }
      }

      if (Object.keys(notifications).length === 0) {
        console.log('No absent or late students to notify.')
        return null
      }

      // Step 2: Send one consolidated SMS per student
      for (const studentId in notifications) {
        try {
          const studentRef = db.collection('students').doc(studentId)
          const studentDoc = await studentRef.get()

          if (studentDoc.exists) {
            const studentData = studentDoc.data()
            const phoneNumber = studentData.contact?.phone1

            if (phoneNumber) {
              const formattedPhoneNumber = formatPhoneNumber(phoneNumber)
              if (formattedPhoneNumber) {
                const studentInfo = notifications[studentId]
                const issuesString = studentInfo.issues.map((issue) => issue.status).join(', ')
                const formattedDate = today.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })

                const message = `Attendance Alert for ${formattedDate}: ${studentInfo.studentName} was marked as ${issuesString}. Please contact the school for more information at 613 421 1700. (Do not reply)`

                await client.messages.create({
                  body: message,
                  to: formattedPhoneNumber,
                  from: twilioNumber,
                })
                console.log(`SMS sent to ${formattedPhoneNumber} for student ${studentId}`)
              } else {
                console.error(`Invalid phone number format for student ${studentId}: ${phoneNumber}`)
              }
            } else {
              console.error(`No phone1 found for student ${studentId}`)
            }
          } else {
            console.error(`Student document not found for ID: ${studentId}`)
          }
        } catch (err) {
          console.error(`Error processing student ${studentId}:`, err)
        }
      }
      return null
    } catch (err) {
      console.error('Error fetching attendance data:', err)
      return null
    }
  })

exports.sendSmsHttp = functions.region('northamerica-northeast1').https.onRequest((req, res) => {
  // ✅ Handle preflight OPTIONS manually
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type')
    res.set('Access-Control-Max-Age', '3600')
    return res.status(204).send('')
  }

  // ✅ Use cors() only for POST
  const corsHandler = cors({ origin: true })

  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Only POST allowed' })
    }

    const { phoneNumber, message } = req.body

    if (!phoneNumber || !message) {
      return res.status(400).json({ success: false, message: 'Missing phone number or message' })
    }

    const e164Regex = /^\+?[1-9]\d{1,14}$/
    if (!e164Regex.test(phoneNumber)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid phone number format (E.164 required)' })
    }

    try {
      const twilioResponse = await client.messages.create({
        body: message,
        to: phoneNumber,
        from: twilioNumber,
      })

      return res.status(200).json({ success: true, sid: twilioResponse.sid })
    } catch (err) {
      console.error('Twilio error:', err.message)
      return res.status(500).json({ success: false, message: err.message })
    }
  })
})

exports.sendAttendanceReminders = functions
  .region('northamerica-northeast1')
  .pubsub.schedule('15 9 * * 1-5') // Run at 9:15 AM on weekdays
  .timeZone('America/Toronto')
  .onRun(async (context) => {
    console.log('Running scheduled attendance reminder job.')

    const db = admin.firestore()
    const today = new Date()
    const date = today.toISOString().split('T')[0] // Format as YYYY-MM-DD
    const reminderTime = '9:15 AM'

    try {
      // Get all courses
      const coursesRef = db.collection('courses')
      const coursesSnapshot = await coursesRef.get()
      
      const results = {
        coursesChecked: 0,
        remindersSent: 0,
        adminReminders: 0,
        teacherReminders: 0,
        errors: []
      }
      
      for (const courseDoc of coursesSnapshot.docs) {
        const course = { id: courseDoc.id, ...courseDoc.data() }
        results.coursesChecked++
        
        try {
          // Check if attendance is completed for this course
          const isCompleted = await isAttendanceCompleted(db, course.id, date)
          
          if (!isCompleted) {
            console.log(`Attendance not completed for course: ${course.name || course.label}`)
            
            // Send admin reminders
            const admins = await getAdminsWithPhoneNumbers(db)
            if (admins.length > 0) {
              for (const admin of admins) {
                try {
                  const teacher = await getTeacherForCourse(db, course.id)
                  const currentDate = today.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })

                  const message = `Attendance Reminder: ${course.name || course.label || 'Unknown Course'} attendance has not been completed by ${reminderTime} on ${currentDate}. Teacher: ${teacher?.name || 'Unknown Teacher'}. Please follow up.`

                  const formattedPhoneNumber = formatPhoneNumber(admin.phoneNumber)
                  if (formattedPhoneNumber) {
                    await client.messages.create({
                      body: message,
                      to: formattedPhoneNumber,
                      from: twilioNumber,
                    })
                    console.log(`Admin reminder SMS sent to ${admin.name} for course ${course.name}`)
                    results.adminReminders++
                  }
                } catch (error) {
                  console.error(`Error sending reminder to admin ${admin.name}:`, error)
                  results.errors.push({
                    type: 'admin',
                    adminName: admin.name,
                    courseName: course.name || course.label,
                    error: error.message
                  })
                }
              }
            }
            
            // Send teacher reminder
            const teacher = await getTeacherForCourse(db, course.id)
            if (teacher && teacher.phoneNumber) {
              try {
                const currentDate = today.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })

                const message = `Attendance Reminder: Please complete attendance for ${course.name || course.label || 'Unknown Course'} by ${reminderTime} on ${currentDate}. This is a friendly reminder to mark your class attendance.`

                const formattedPhoneNumber = formatPhoneNumber(teacher.phoneNumber)
                if (formattedPhoneNumber) {
                  await client.messages.create({
                    body: message,
                    to: formattedPhoneNumber,
                    from: twilioNumber,
                  })
                  console.log(`Teacher reminder SMS sent to ${teacher.name} for course ${course.name}`)
                  results.teacherReminders++
                }
              } catch (error) {
                console.error(`Error sending reminder to teacher ${teacher.name}:`, error)
                results.errors.push({
                  type: 'teacher',
                  teacherName: teacher.name,
                  courseName: course.name || course.label,
                  error: error.message
                })
              }
            }
            
            results.remindersSent++
          }
        } catch (error) {
          console.error(`Error processing course ${course.id}:`, error)
          results.errors.push({
            courseId: course.id,
            courseName: course.name || course.label,
            error: error.message
          })
        }
      }
      
      console.log('Attendance reminder job completed:', results)
      return results
    } catch (error) {
      console.error('Error in attendance reminder job:', error)
      return { error: error.message }
    }
  })
