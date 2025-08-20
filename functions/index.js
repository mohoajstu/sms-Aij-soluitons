const functions = require('firebase-functions/v1')
const admin = require('firebase-admin')
const twilio = require('twilio')
const cors = require('cors')

admin.initializeApp()

const accountSid = process.env.TWILIO_ACCOUNT_SID || functions.config().twilio?.accountsid
const authToken = process.env.TWILIO_AUTH_TOKEN || functions.config().twilio?.authtoken
const twilioNumber = process.env.TWILIO_PHONE_NUMBER || functions.config().twilio?.phonenumber

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

// Set a parent's temp password using Admin Auth. Requires an authenticated caller with admin/staff role.
exports.setParentTempPassword = functions
  .region('northamerica-northeast1')
  .https.onRequest(async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*')
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.set('Access-Control-Max-Age', '3600')
      return res.status(204).send('')
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Only POST allowed' })
    }

    const authHeader = req.headers.authorization || ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null
    if (!idToken) {
      return res.status(401).json({ success: false, message: 'Missing Authorization token' })
    }

    try {
      const decoded = await admin.auth().verifyIdToken(idToken)
      const callerUid = decoded.uid
      const db = admin.firestore()
      const callerSnap = await db.collection('users').doc(callerUid).get()
      const callerData = callerSnap.exists ? callerSnap.data() : {}
      const role = (callerData?.role || callerData?.personalInfo?.role || '').toString().toLowerCase()
      const allowed = role === 'admin' || role === 'schooladmin' || role === 'staff'
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'Insufficient permissions' })
      }

      const { tarbiyahId } = req.body || {}
      if (!tarbiyahId || typeof tarbiyahId !== 'string') {
        return res.status(400).json({ success: false, message: 'Missing tarbiyahId' })
      }

      const authSvc = admin.auth()
      const email = `${tarbiyahId}@gmail.com`

      // Ensure auth user exists; create if not
      try {
        await authSvc.getUser(tarbiyahId)
      } catch (e) {
        if (e.code === 'auth/user-not-found') {
          await authSvc.createUser({ uid: tarbiyahId, email, password: '2BeChanged', displayName: tarbiyahId })
        } else {
          throw e
        }
      }

      // Set temp password
      await authSvc.updateUser(tarbiyahId, { password: '2BeChanged', email })

      // Flag in Firestore
      await db.collection('users').doc(tarbiyahId).set({ mustChangePassword: true }, { merge: true })

      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('setParentTempPassword error:', err)
      return res.status(500).json({ success: false, message: err.message || 'Internal error' })
    }
  })
