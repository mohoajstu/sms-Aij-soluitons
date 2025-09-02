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

/**
 * Helper function to convert admin settings to cron schedule format
 * @param {Object} settings Admin SMS settings
 * @returns {string} Cron schedule string
 */
function getCronSchedule(settings) {
  if (!settings || !settings.schedule) {
    // Default schedule: 12:00 PM Monday-Friday
    return '0 12 * * 1-5'
  }

  const { time, daysOfWeek } = settings.schedule
  
  // Parse time (format: "HH:MM")
  const [hours, minutes] = (time || '12:00').split(':').map(Number)
  
  // Convert days of week to cron format (0=Sunday, 1=Monday, etc.)
  const enabledDays = []
  const dayMapping = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 }
  
  Object.entries(daysOfWeek || {}).forEach(([day, enabled]) => {
    if (enabled && dayMapping[day] !== undefined) {
      enabledDays.push(dayMapping[day])
    }
  })
  
  if (enabledDays.length === 0) {
    // If no days enabled, default to Monday-Friday
    enabledDays.push(1, 2, 3, 4, 5)
  }
  
  // Sort days and create cron string
  const daysString = enabledDays.sort((a, b) => a - b).join(',')
  
  return `${minutes} ${hours} * * ${daysString}`
}

/**
 * Helper function to check if SMS should be sent based on admin settings
 * @param {Object} settings Admin SMS settings
 * @param {Date} currentDate Current date
 * @returns {boolean} Whether SMS should be sent
 */
function shouldSendSms(settings, currentDate) {
  // Check if SMS is enabled
  if (!settings.enabled) {
    console.log('SMS notifications are disabled in admin settings')
    return false
  }

  // Format current date as YYYY-MM-DD without timezone issues
  const year = currentDate.getFullYear()
  const month = String(currentDate.getMonth() + 1).padStart(2, '0')
  const day = String(currentDate.getDate()).padStart(2, '0')
  const dateString = `${year}-${month}-${day}`
  
  console.log(`Checking SMS for date: ${dateString}`)
  console.log(`Excluded dates: ${JSON.stringify(settings.schedule?.excludedDates || [])}`)

  // Check if current date is excluded
  if (settings.schedule?.excludedDates && settings.schedule.excludedDates.includes(dateString)) {
    console.log(`❌ SMS notifications are excluded for date: ${dateString}`)
    return false
  }

  // Check if current day of week is enabled
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const currentDay = daysOfWeek[currentDate.getDay()]
  
  console.log(`Current day of week: ${currentDay}`)
  console.log(`Days enabled: ${JSON.stringify(settings.schedule?.daysOfWeek || {})}`)
  
  if (!settings.schedule?.daysOfWeek?.[currentDay]) {
    console.log(`❌ SMS notifications are disabled for ${currentDay}`)
    return false
  }

  console.log(`✅ SMS notifications are enabled for ${dateString} (${currentDay})`)
  return true
}

/**
 * Helper function to format message using template
 * @param {string} template Message template
 * @param {Object} data Data to substitute in template
 * @returns {string} Formatted message
 */
function formatMessage(template, data) {
  let message = template
  
  // Replace template variables
  message = message.replace(/{date}/g, data.date)
  message = message.replace(/{studentName}/g, data.studentName)
  message = message.replace(/{status}/g, data.status)
  message = message.replace(/{courseTitle}/g, data.courseTitle || 'class')
  
  return message
}

// Note: The actual cron schedule is still hardcoded in the function definition
// due to Firebase Functions limitations. The admin settings are checked at runtime.
exports.sendScheduledSms = functions
  .region('northamerica-northeast1')
  .pubsub.schedule('0 12 * * 1-5') // This remains hardcoded, but we check admin settings at runtime
  .timeZone('America/Toronto')
  .onRun(async (context) => {
    console.log('Running scheduled attendance SMS job.')

    const db = admin.firestore()
    const today = new Date()
    
    // Format today's date as YYYY-MM-DD without timezone issues
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const date = `${year}-${month}-${day}`

    console.log(`Processing SMS for date: ${date}`)

    try {
      // Always fetch the latest admin settings from Firebase
      console.log('Fetching latest admin SMS settings from Firebase...')
      const settingsDoc = await db.collection('systemSettings').doc('attendanceSms').get()
      
      if (!settingsDoc.exists) {
        console.log('No SMS settings found in Firebase. Using default behavior.')
        // Continue with default behavior if no settings exist
        return null
      }

      const settings = settingsDoc.data()
      console.log('Retrieved settings:', {
        enabled: settings.enabled,
        time: settings.schedule?.time,
        timezone: settings.schedule?.timezone,
        daysOfWeek: settings.schedule?.daysOfWeek,
        excludedDatesCount: settings.schedule?.excludedDates?.length || 0,
        lastUpdated: settings.lastUpdated
      })
      
      // Check if SMS should be sent based on admin settings
      if (!shouldSendSms(settings, today)) {
        console.log('SMS notifications are disabled or excluded for today.')
        return null
      }
      
      // Use admin settings for message template
      const messageTemplate = settings.messageTemplate?.template || 
        'Attendance Alert for {date}: {studentName} was marked as {status}. Please contact the school for more information at 613 421 1700. (Do not reply)'
      
      console.log('Using message template:', messageTemplate)
      
      // Get attendance data
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

      console.log(`Found ${Object.keys(notifications).length} students with attendance issues`)

      // Step 2: Send one consolidated SMS per student using admin template
      let successCount = 0
      let errorCount = 0

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

                // Use admin message template
                const message = formatMessage(messageTemplate, {
                  date: formattedDate,
                  studentName: studentInfo.studentName,
                  status: issuesString,
                  courseTitle: studentInfo.issues[0]?.courseTitle || 'class'
                })

                await client.messages.create({
                  body: message,
                  to: formattedPhoneNumber,
                  from: twilioNumber,
                })
                console.log(`✅ SMS sent to ${formattedPhoneNumber} for student ${studentId}`)
                successCount++
              } else {
                console.error(`❌ Invalid phone number format for student ${studentId}: ${phoneNumber}`)
                errorCount++
              }
            } else {
              console.error(`❌ No phone1 found for student ${studentId}`)
              errorCount++
            }
          } else {
            console.error(`❌ Student document not found for ID: ${studentId}`)
            errorCount++
          }
        } catch (err) {
          console.error(`❌ Error processing student ${studentId}:`, err)
          errorCount++
        }
      }

      console.log(`📊 SMS Job Summary: ${successCount} successful, ${errorCount} failed`)
      return null
    } catch (err) {
      console.error('❌ Error in scheduled SMS job:', err)
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

// Public config: expose non-secret client config
exports.getPublicConfig = functions.region('northamerica-northeast1').https.onRequest((req, res) => {
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type')
    res.set('Access-Control-Max-Age', '3600')
    return res.status(204).send('')
  }

  res.set('Access-Control-Allow-Origin', '*')

  const google = functions.config().google || {}
  const payload = {
    googleApiKey: process.env.GOOGLE_API_KEY || google.apikey || null,
    googleClientId: process.env.GOOGLE_CLIENT_ID || google.clientid || null,
  }
  return res.status(200).json(payload)
})

// OpenAI proxy to keep API key server-side
exports.generateReportCard = functions
  .region('northamerica-northeast1')
  .https.onRequest(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*')
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.set('Access-Control-Max-Age', '3600')
      return res.status(204).send('')
    }

    res.set('Access-Control-Allow-Origin', '*')

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Only POST allowed' })
    }

    try {
      const body = req.body || {}
      const { messages, model = 'gpt-4o-mini', temperature = 0.2, response_format, max_tokens } = body

      const apiKey = process.env.OPENAI_API_KEY || functions.config().openai?.apikey
      if (!apiKey) {
        return res.status(500).json({ success: false, message: 'Missing OpenAI API key' })
      }

      const payload = { model, messages, temperature }
      if (response_format) payload.response_format = response_format
      if (typeof max_tokens === 'number') payload.max_tokens = max_tokens

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return res.status(response.status).json({ success: false, message: errorText })
      }

      const json = await response.json()
      return res.status(200).json({ success: true, data: json })
    } catch (err) {
      console.error('OpenAI proxy error:', err)
      return res.status(500).json({ success: false, message: err.message || 'Internal error' })
    }
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

// Manual SMS trigger for testing and immediate sending
exports.triggerAttendanceSms = functions
  .region('northamerica-northeast1')
  .https.onRequest((req, res) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*')
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.set('Access-Control-Max-Age', '3600')
      return res.status(204).send('')
    }

    const corsHandler = cors({ origin: true })

    return corsHandler(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Only POST allowed' })
      }

      try {
        const { date, adminUid } = req.body

        if (!adminUid) {
          return res.status(400).json({ success: false, message: 'Admin UID required' })
        }

        // Verify admin status
        const adminDoc = await admin.firestore().collection('users').doc(adminUid).get()
        if (!adminDoc.exists) {
          return res.status(403).json({ success: false, message: 'Admin not found' })
        }

        const adminData = adminDoc.data()
        const role = adminData.personalInfo?.role || adminData.role || ''
        if (role.toLowerCase() !== 'admin') {
          return res.status(403).json({ success: false, message: 'Admin access required' })
        }

        // Use the same logic as the scheduled function
        const db = admin.firestore()
        const targetDate = date || new Date().toISOString().split('T')[0]

        console.log(`Manual SMS trigger requested for date: ${targetDate} by admin: ${adminUid}`)

        // Fetch latest admin settings from Firebase
        console.log('Fetching latest admin SMS settings from Firebase...')
        const settingsDoc = await db.collection('systemSettings').doc('attendanceSms').get()
        
        if (!settingsDoc.exists) {
          return res.status(400).json({ success: false, message: 'SMS settings not configured' })
        }

        const settings = settingsDoc.data()
        console.log('Retrieved settings:', {
          enabled: settings.enabled,
          time: settings.schedule?.time,
          timezone: settings.schedule?.timezone,
          daysOfWeek: settings.schedule?.daysOfWeek,
          excludedDatesCount: settings.schedule?.excludedDates?.length || 0,
          lastUpdated: settings.lastUpdated
        })
        
        if (!settings.enabled) {
          return res.status(400).json({ success: false, message: 'SMS notifications are disabled' })
        }

        // Check if the target date is excluded
        if (settings.schedule?.excludedDates?.includes(targetDate)) {
          return res.status(400).json({ 
            success: false, 
            message: `SMS notifications are excluded for date: ${targetDate}` 
          })
        }

        // Get attendance data
        const attendanceRef = db.collection('attendance').doc(targetDate)
        const attendanceDoc = await attendanceRef.get()

        if (!attendanceDoc.exists) {
          return res.status(404).json({ success: false, message: `No attendance record found for date: ${targetDate}` })
        }

        const attendanceData = attendanceDoc.data()
        const courses = attendanceData.courses || []
        const notifications = {}

        // Consolidate attendance issues
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
          return res.status(200).json({ success: true, message: 'No absent or late students to notify' })
        }

        console.log(`Found ${Object.keys(notifications).length} students with attendance issues`)

        // Send SMS
        const messageTemplate = settings.messageTemplate?.template || 
          'Attendance Alert for {date}: {studentName} was marked as {status}. Please contact the school for more information at 613 421 1700. (Do not reply)'

        const results = []
        const today = new Date()

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

                  const message = formatMessage(messageTemplate, {
                    date: formattedDate,
                    studentName: studentInfo.studentName,
                    status: issuesString,
                    courseTitle: studentInfo.issues[0]?.courseTitle || 'class'
                  })

                  const twilioResponse = await client.messages.create({
                    body: message,
                    to: formattedPhoneNumber,
                    from: twilioNumber,
                  })

                  results.push({
                    studentId,
                    studentName: studentInfo.studentName,
                    phoneNumber: formattedPhoneNumber,
                    success: true,
                    sid: twilioResponse.sid
                  })
                } else {
                  results.push({
                    studentId,
                    studentName: notifications[studentId].studentName,
                    phoneNumber,
                    success: false,
                    error: 'Invalid phone number format'
                  })
                }
              } else {
                results.push({
                  studentId,
                  studentName: notifications[studentId].studentName,
                  success: false,
                  error: 'No phone number found'
                })
              }
            } else {
              results.push({
                studentId,
                success: false,
                error: 'Student not found'
              })
            }
          } catch (err) {
            results.push({
              studentId,
              success: false,
              error: err.message
            })
          }
        }

        const totalSent = results.filter(r => r.success).length
        const totalFailed = results.filter(r => !r.success).length

        console.log(`📊 Manual SMS Summary: ${totalSent} successful, ${totalFailed} failed`)

        return res.status(200).json({
          success: true,
          message: `SMS notifications sent for ${targetDate}`,
          results,
          totalSent,
          totalFailed
        })

      } catch (error) {
        console.error('❌ Error in manual SMS trigger:', error)
        return res.status(500).json({ success: false, message: error.message })
      }
    })
  })
