import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CButton,
  CSpinner,
  CAlert,
  CRow,
  CCol,
  CBadge,
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CProgress,
  CFormTextarea,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBell, cilClock, cilCheck, cilX, cilReload, cilPhone, cilUser } from '@coreui/icons'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { firestore } from '../../firebase'
import AttendanceReminderService from '../../services/attendanceReminderService'
import NotificationService from '../../services/notificationService'
import fcmService from '../../services/fcmService'
import { toast } from 'react-hot-toast'
import './attendanceReminderManager.css'

const AttendanceReminderManager = () => {
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [reminderTime, setReminderTime] = useState('09:15')
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAttendance, setIsCheckingAttendance] = useState(false)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [reminderResults, setReminderResults] = useState(null)
  const [attendanceStatus, setAttendanceStatus] = useState({})
  const [admins, setAdmins] = useState([])
  const [teachers, setTeachers] = useState([])

  // Load courses on component mount
  useEffect(() => {
    const loadCourses = async () => {
      try {
        console.log('Loading homeroom courses...')
        // Load only homeroom courses
        const homeroomCourses = await AttendanceReminderService.getHomeroomCourses()
        console.log('Loaded homeroom courses:', homeroomCourses)
        
        if (homeroomCourses.length === 0) {
          console.log('No homeroom courses found, loading all courses for debugging...')
          // Fallback: load all courses for debugging
        const coursesRef = collection(firestore, 'courses')
        const coursesSnapshot = await getDocs(coursesRef)
          const allCourses = coursesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
          console.log('All courses found:', allCourses.map(c => ({
            id: c.id,
            name: c.name || c.label || c.title || 'Unnamed',
            subject: c.subject,
            teacherId: c.teacherId,
            teacher: c.teacher,
            teachers: c.teachers,
            staff: c.staff
          })))
          setCourses(allCourses)
        } else {
          console.log('Homeroom courses structure:', homeroomCourses.map(c => ({
            id: c.id,
            name: c.name || c.label || c.title || 'Unnamed',
            subject: c.subject,
            teacherId: c.teacherId,
            teacher: c.teacher,
            teachers: c.teachers,
            staff: c.staff
          })))
          setCourses(homeroomCourses)
        }
      } catch (error) {
        console.error('Error loading homeroom courses:', error)
        toast.error('Failed to load homeroom courses')
      }
    }

    loadCourses()
  }, [])

  // Load admins and teachers
  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Load admins
        const adminsRef = collection(firestore, 'admins')
        const adminsSnapshot = await getDocs(adminsRef)
        const adminsData = adminsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setAdmins(adminsData)

        // Load faculty (teachers)
        const facultyRef = collection(firestore, 'faculty')
        const facultySnapshot = await getDocs(facultyRef)
        const facultyData = facultySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        console.log('Loaded faculty data:', facultyData.map(f => ({
          id: f.id,
          name: `${f.personalInfo?.firstName || ''} ${f.personalInfo?.lastName || ''}`.trim(),
          personalInfo: f.personalInfo
        })))
        setTeachers(facultyData)
      } catch (error) {
        console.error('Error loading users:', error)
      }
    }

    loadUsers()
  }, [])

  // Check attendance status for all courses
  const checkAttendanceStatus = async () => {
    setIsCheckingAttendance(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const status = {}

      for (const course of courses) {
        const isCompleted = await AttendanceReminderService.isAttendanceCompleted(course.id, today)
        status[course.id] = isCompleted
      }

      setAttendanceStatus(status)
    } catch (error) {
      console.error('Error checking attendance status:', error)
      toast.error('Failed to check attendance status')
    } finally {
      setIsCheckingAttendance(false)
    }
  }

  // Send manual reminder for selected course
  const sendManualReminder = async () => {
    if (!selectedCourse) {
      toast.error('Please select a course')
      return
    }

    setIsLoading(true)
    try {
      const course = courses.find(c => c.id === selectedCourse)
      if (!course) {
        toast.error('Selected course not found')
        return
      }

      const timeString = reminderTime
      const [hours, minutes] = timeString.split(':')
      const reminderTimeFormatted = `${hours}:${minutes} ${parseInt(hours) >= 12 ? 'PM' : 'AM'}`

      const result = await AttendanceReminderService.triggerManualReminders(course, reminderTimeFormatted)
      
      setReminderResults(result)
      setShowResultsModal(true)

      if (result.success) {
        toast.success('Admin notifications sent successfully')
      } else {
        toast.error(result.message || 'Failed to send admin notifications')
      }
    } catch (error) {
      console.error('Error sending manual reminder:', error)
      toast.error('Failed to send reminder')
    } finally {
      setIsLoading(false)
    }
  }

  // Send reminders for all incomplete courses
  const sendBulkReminders = async () => {
    setIsLoading(true)
    try {
      const timeString = reminderTime
      const [hours, minutes] = timeString.split(':')
      const reminderTimeFormatted = `${hours}:${minutes} ${parseInt(hours) >= 12 ? 'PM' : 'AM'}`

      const result = await AttendanceReminderService.checkAndSendReminders(reminderTimeFormatted)
      
      setReminderResults(result)
      setShowResultsModal(true)

      if (result.remindersSent > 0) {
        toast.success(`Sent ${result.remindersSent} admin notifications`)
      } else {
        toast.info('No admin notifications needed - all homeroom attendance is complete')
      }
    } catch (error) {
      console.error('Error sending bulk admin notifications:', error)
      toast.error('Failed to send bulk admin notifications')
    } finally {
      setIsLoading(false)
    }
  }

  const getAttendanceStatusBadge = (courseId) => {
    const isCompleted = attendanceStatus[courseId]
    return isCompleted ? (
      <CBadge color="success">Completed</CBadge>
    ) : (
      <CBadge color="warning">Pending</CBadge>
    )
  }

  const getTeacherName = (course) => {
    console.log('Getting teacher name for course:', course.id, course)
    
    // First, check if course has teachers array with names (this is the primary source)
    if (course.teachers && Array.isArray(course.teachers)) {
      const teacherNames = course.teachers.map(teacher => 
        typeof teacher === 'string' ? teacher : teacher.name
      ).join(', ')
      console.log('Found teacher names in course.teachers:', teacherNames)
      return teacherNames || 'Unknown Teacher'
    }
    
    // Check if course has teacher array with objects
    if (course.teacher && Array.isArray(course.teacher)) {
      const teacherNames = course.teacher.map(teacher => 
        typeof teacher === 'string' ? teacher : teacher.name
      ).join(', ')
      console.log('Found teacher names in course.teacher:', teacherNames)
      return teacherNames || 'Unknown Teacher'
    }
    
    // Check for single teacher as string
    if (course.teacher && typeof course.teacher === 'string') {
      console.log('Found teacher name as string:', course.teacher)
      return course.teacher
    }
    
    // Fallback to teacherId lookup in teachers array
    const teacherId = course.teacherId || course.teacher?.id || course.staff?.[0]
    
    if (!teacherId) {
      console.log('No teacherId found for course:', course.id)
      return 'No teacher assigned'
    }
    
    // Try to find teacher in the teachers array
    const teacher = teachers.find(t => t.id === teacherId)
    
    if (teacher) {
      const teacherName = `${teacher.personalInfo?.firstName || ''} ${teacher.personalInfo?.lastName || ''}`.trim()
      console.log('Found teacher:', teacherName, 'for course:', course.id)
      return teacherName || 'Unknown Teacher'
    }
    
    console.log('No teacher found for course:', course.id, 'teacherId:', teacherId)
    return 'Unknown Teacher'
  }

  // Get teacher for selected course
  const getTeacherForCourse = async (courseId) => {
    console.log('🔍 getTeacherForCourse called for courseId:', courseId)
    
    try {
      const courseRef = doc(firestore, 'courses', courseId)
      const courseDoc = await getDoc(courseRef)
      
      if (!courseDoc.exists()) {
        console.log('❌ Course document not found for courseId:', courseId)
        return null
      }
      
      const courseData = courseDoc.data()
      console.log('📋 Course data retrieved:', {
        id: courseId,
        name: courseData.name || courseData.label || courseData.title,
        teachers: courseData.teachers,
        teacher: courseData.teacher,
        teacherId: courseData.teacherId,
        staff: courseData.staff
      })
      
      // First, check if course has teachers array with names
      if (courseData.teachers && Array.isArray(courseData.teachers)) {
        console.log('👥 Found teachers array in course data:', courseData.teachers)
        
        // Try to find the first teacher in the faculty collection
        const teachersRef = collection(firestore, 'faculty')
        const teachersSnapshot = await getDocs(teachersRef)
        console.log(`🔍 Checking ${teachersSnapshot.docs.length} faculty members against course teachers`)
        
        for (const teacherDoc of teachersSnapshot.docs) {
          const teacherData = teacherDoc.data()
          const teacherName = `${teacherData.personalInfo?.firstName || ''} ${teacherData.personalInfo?.lastName || ''}`.trim()
          
          // Check if this teacher is in the course's teachers array
          const isTeacherInCourse = courseData.teachers.some(courseTeacher => {
            const courseTeacherName = typeof courseTeacher === 'string' ? courseTeacher : courseTeacher.name
            const match = courseTeacherName.toLowerCase() === teacherName.toLowerCase()
            if (match) {
              console.log(`✅ Found matching teacher: "${teacherName}" in course teachers`)
            }
            return match
          })
          
          if (isTeacherInCourse) {
            console.log('🎯 Teacher found in faculty collection:', {
              teacherId: teacherDoc.id,
              teacherName,
              fcmTokensCount: teacherData.fcmTokens?.length || 0,
              phoneNumber: teacherData.personalInfo?.phone1 || teacherData.contact?.phone1
            })
            
            return {
              id: teacherDoc.id,
              name: teacherName,
              phoneNumber: teacherData.personalInfo?.phone1 || teacherData.contact?.phone1,
              fcmTokens: teacherData.fcmTokens || [], // Get all FCM tokens
              fcmToken: teacherData.fcmTokens?.[0] || null, // Use first token for backward compatibility
              ...teacherData
            }
          }
        }
        
        // If no teacher found in faculty, return with courseId as fallback
        const teacherNames = courseData.teachers.map(teacher => 
          typeof teacher === 'string' ? teacher : teacher.name
        ).join(', ')
        
        console.log('⚠️ Teacher not found in faculty collection, using fallback:', teacherNames)
        
        return {
          id: courseId, // Use courseId as fallback
          name: teacherNames,
          phoneNumber: null, // Will need to be looked up separately
          fcmToken: null, // No FCM token found
          courseData
        }
      }
      
      // Check if course has teacher array with objects
      if (courseData.teacher && Array.isArray(courseData.teacher)) {
        console.log('👤 Found teacher array in course data:', courseData.teacher)
        
        // Try to find the first teacher in the faculty collection
        const teachersRef = collection(firestore, 'faculty')
        const teachersSnapshot = await getDocs(teachersRef)
        
        for (const teacherDoc of teachersSnapshot.docs) {
          const teacherData = teacherDoc.data()
          const teacherName = `${teacherData.personalInfo?.firstName || ''} ${teacherData.personalInfo?.lastName || ''}`.trim()
          
          // Check if this teacher is in the course's teacher array
          const isTeacherInCourse = courseData.teacher.some(courseTeacher => {
            const courseTeacherName = typeof courseTeacher === 'string' ? courseTeacher : courseTeacher.name
            return courseTeacherName.toLowerCase() === teacherName.toLowerCase()
          })
          
          if (isTeacherInCourse) {
            console.log('🎯 Teacher found in faculty collection (teacher array):', {
              teacherId: teacherDoc.id,
              teacherName,
              fcmTokensCount: teacherData.fcmTokens?.length || 0
            })
            
            return {
              id: teacherDoc.id,
              name: teacherName,
              phoneNumber: teacherData.personalInfo?.phone1 || teacherData.contact?.phone1,
              fcmTokens: teacherData.fcmTokens || [], // Get all FCM tokens
              fcmToken: teacherData.fcmTokens?.[0] || null, // Use first token for backward compatibility
              ...teacherData
            }
          }
        }
        
        // If no teacher found in faculty, return with courseId as fallback
        const teacherNames = courseData.teacher.map(teacher => 
          typeof teacher === 'string' ? teacher : teacher.name
        ).join(', ')
        
        console.log('⚠️ Teacher not found in faculty collection (teacher array), using fallback:', teacherNames)
        
        return {
          id: courseId,
          name: teacherNames,
          phoneNumber: null,
          fcmToken: null, // No FCM token found
          courseData
        }
      }
      
      // Fallback to teacherId lookup
      const teacherId = courseData.teacherId || courseData.teacher?.id
      console.log('🔍 Using teacherId lookup:', teacherId)
      
      if (!teacherId) {
        console.log('❌ No teacherId found in course data')
        return null
      }
      
      // Try to get teacher from faculty collection
      const facultyRef = doc(firestore, 'faculty', teacherId)
      const facultyDoc = await getDoc(facultyRef)
      
      if (facultyDoc.exists()) {
        const facultyData = facultyDoc.data()
        const teacherName = `${facultyData.personalInfo?.firstName || ''} ${facultyData.personalInfo?.lastName || ''}`.trim()
        
        console.log('🎯 Teacher found via teacherId:', {
          teacherId,
          teacherName,
          fcmTokensCount: facultyData.fcmTokens?.length || 0
        })
        
        return {
          id: teacherId,
          name: teacherName,
          phoneNumber: facultyData.personalInfo?.phone1 || facultyData.contact?.phone1,
          fcmTokens: facultyData.fcmTokens || [], // Get all FCM tokens
          fcmToken: facultyData.fcmTokens?.[0] || null, // Use first token for backward compatibility
          ...facultyData
        }
      }
      
      console.log('❌ Teacher not found in faculty collection via teacherId:', teacherId)
      return null
    } catch (error) {
      console.error('💥 Error in getTeacherForCourse:', error)
      console.error('💥 Error stack:', error.stack)
      return null
    }
  }

  // Look up teacher phone number by name
  const getTeacherPhoneByName = (teacherName) => {
    const teacher = teachers.find(t => {
      const fullName = `${t.personalInfo?.firstName || ''} ${t.personalInfo?.lastName || ''}`.trim()
      return fullName.toLowerCase() === teacherName.toLowerCase()
    })
    
    if (teacher) {
      return teacher.personalInfo?.phone1 || teacher.contact?.phone1
    }
    
    return null
  }

  // Send notification to teacher for a specific course (both in-app and SMS)
  const notifyTeacherForCourse = async (course) => {
    if (!course) {
      toast.error('No course selected')
      return
    }

    console.log('🎯 Starting teacher notification process for course:', course.id, course.name)
    setIsLoading(true)
    
    try {
      console.log('🔍 Fetching teacher information for course:', course.id)
      const teacher = await getTeacherForCourse(course.id)
      
      if (!teacher) {
        console.error('❌ No teacher found for course:', course.id)
        toast.error('No teacher found for this course')
        return
      }

      console.log('✅ Teacher found:', {
        id: teacher.id,
        name: teacher.name,
        phoneNumber: teacher.phoneNumber,
        fcmTokensCount: teacher.fcmTokens?.length || 0,
        fcmTokens: teacher.fcmTokens
      })

      const courseName = course.name || course.label || course.title || 'Unknown Course'
      console.log('📚 Course name for notification:', courseName)
      
      // Send FCM notification to teacher
      let fcmSuccess = false
      if (teacher.fcmTokens && teacher.fcmTokens.length > 0) {
        console.log(`📱 Starting FCM campaign to ${teacher.fcmTokens.length} devices for teacher: ${teacher.name}`)
        
        try {
          // Send FCM notification to all teacher devices
          const fcmPromises = teacher.fcmTokens.map(async (token, index) => {
            console.log(`📤 Sending FCM notification to device ${index + 1}/${teacher.fcmTokens.length}`)
            console.log(`🔑 Token (first 50 chars): ${token.substring(0, 50)}...`)
            
            const messagePayload = {
              token: token,
              notification: {
                title: 'Attendance Reminder',
                body: `Please complete ${courseName} attendance by 9:15 AM`,
              },
              data: {
                type: 'attendance_reminder',
                courseName,
                teacherName: teacher.name,
                reminderTime: '9:15 AM',
                timestamp: new Date().toISOString(),
              },
            }
            
            console.log('📨 FCM Message Payload:', JSON.stringify(messagePayload, null, 2))
            
            const response = await fetch('https://northamerica-northeast1-tarbiyah-sms.cloudfunctions.net/sendFcmNotification', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(messagePayload),
            })
            
            console.log(`📡 FCM Response status: ${response.status} ${response.statusText}`)
            
            const result = await response.json()
            console.log(`📋 FCM Response body:`, result)
            
            return { 
              success: response.ok, 
              message: result.message,
              deviceIndex: index + 1,
              statusCode: response.status
            };
          })
          
          console.log('⏳ Waiting for all FCM notifications to complete...')
          const results = await Promise.all(fcmPromises)
          
          console.log('📊 FCM Campaign Results:', results)
          
          const successfulSends = results.filter(r => r.success).length
          const failedSends = results.filter(r => !r.success)
          
          console.log(`✅ FCM Campaign Summary: ${successfulSends}/${teacher.fcmTokens.length} devices successful`)
          
          if (failedSends.length > 0) {
            console.log('❌ Failed FCM sends:', failedSends)
          }
          
          if (successfulSends > 0) {
            console.log(`🎉 FCM notification sent successfully to ${successfulSends}/${teacher.fcmTokens.length} devices`)
            fcmSuccess = true
          } else {
            console.log('💥 FCM notification failed on all devices')
          }
        } catch (error) {
          console.error('🔥 Error sending FCM notification:', error)
          console.error('🔥 Error stack:', error.stack)
        }
      } else {
        console.log('⚠️ Skipping FCM notification - no FCM tokens found for teacher:', teacher.name)
      }

      // Send SMS notification
      console.log('📞 Starting SMS notification process...')
      let phoneNumber = teacher.phoneNumber
      if (!phoneNumber && teacher.name) {
        console.log('🔍 Looking up phone number for teacher:', teacher.name)
        phoneNumber = getTeacherPhoneByName(teacher.name)
      }

      console.log('📱 Teacher phone number:', phoneNumber)

      let smsSuccess = false
      if (phoneNumber) {
        const message = `Complete ${courseName} attendance by 9:15 AM.`
        console.log('📨 SMS message:', message)

        try {
          console.log('📤 Sending SMS via NotificationService...')
          const result = await NotificationService.sendTeacherAttendanceReminder({
            phoneNumber: phoneNumber,
            teacherName: teacher.name,
            courseName,
            reminderTime: '9:15 AM'
          })

          console.log('📋 SMS result:', result)

          if (result.success) {
            console.log('✅ SMS sent successfully')
            smsSuccess = true
          } else {
            console.log('❌ SMS failed:', result.message)
          }
        } catch (error) {
          console.error('🔥 Error sending SMS:', error)
        }
      } else {
        console.log('⚠️ No phone number available for SMS')
      }

      // Show appropriate success message
      console.log('📢 Final notification results:', {
        fcmSuccess,
        smsSuccess,
        teacherName: teacher.name,
        devicesCount: teacher.fcmTokens?.length || 0
      })

      if (fcmSuccess && smsSuccess) {
        toast.success(`Notification sent to ${teacher.name} (${teacher.fcmTokens?.length || 0} devices + SMS)`)
      } else if (fcmSuccess) {
        toast.success(`In-app notification sent to ${teacher.name} (${teacher.fcmTokens?.length || 0} devices)`)
      } else if (smsSuccess) {
        toast.success(`SMS notification sent to ${teacher.name}`)
      } else {
        if (teacher.id === course.id) {
          toast.error(`Failed to send notifications to ${teacher.name}. Teacher may not be properly linked in the system.`)
        } else {
          toast.error(`Failed to send notifications to ${teacher.name}`)
        }
      }
    } catch (error) {
      console.error('💥 Error in notifyTeacherForCourse:', error)
      console.error('💥 Error stack:', error.stack)
      toast.error('Failed to notify teacher')
    } finally {
      console.log('🏁 Teacher notification process completed')
      setIsLoading(false)
    }
  }

  return (
    <div className="attendance-reminder-manager">
      <CCard>
        <CCardHeader>
          <h4 className="mb-0">
            <CIcon icon={cilBell} className="me-2" />
            Automated Admin Notifications
          </h4>
          <small className="text-white">
            Manual notifications can be sent to teachers for specific homeroom classes. Click "Notify Teacher" to send both in-app notification and SMS to the teacher of that class.
          </small>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={6}>
              <CForm>
                <div className="mb-3">
                  <CFormLabel>Reminder Time</CFormLabel>
                  <CFormInput
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                  />
                  <small className="text-muted">
                    Set the time when reminders should be sent (e.g., 9:15 AM)
                  </small>
                </div>

                <div className="d-flex gap-2">
                  <CButton
                    color="secondary"
                    onClick={checkAttendanceStatus}
                    disabled={isCheckingAttendance}
                  >
                    {isCheckingAttendance ? <CSpinner size="sm" /> : <CIcon icon={cilCheck} />}
                    Check Status
                  </CButton>
                </div>
              </CForm>
            </CCol>

            <CCol md={6}>
              <div className="status-summary">
                <h5>Quick Stats</h5>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-number">{courses.length}</span>
                    <span className="stat-label">Homeroom Classes</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">
                      {Object.values(attendanceStatus).filter(Boolean).length}
                    </span>
                    <span className="stat-label">Completed</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">
                      {Object.values(attendanceStatus).filter(v => !v).length}
                    </span>
                    <span className="stat-label">Pending</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{admins.length}</span>
                    <span className="stat-label">Admins</span>
                  </div>
                </div>
              </div>
            </CCol>
          </CRow>

          {/* Course Status Table */}
          <div className="mt-4">
            <h5>Homeroom Class Attendance Status</h5>
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Homeroom Class</CTableHeaderCell>
                  <CTableHeaderCell>Teacher</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {courses.map(course => (
                  <CTableRow key={course.id}>
                    <CTableDataCell>
                      {course.name || course.label || course.title || 'Unnamed Course'}
                    </CTableDataCell>
                    <CTableDataCell>
                      {getTeacherName(course)}
                    </CTableDataCell>
                    <CTableDataCell>
                      {getAttendanceStatusBadge(course.id)}
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex gap-1">
                      <CButton
                        size="sm"
                          color="info"
                          onClick={() => notifyTeacherForCourse(course)}
                          disabled={isLoading}
                        >
                          <CIcon icon={cilPhone} /> Notify Teacher
                      </CButton>
                      </div>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </div>
        </CCardBody>
      </CCard>

      {/* Results Modal */}
      <CModal
        visible={showResultsModal}
        onClose={() => setShowResultsModal(false)}
        size="lg"
      >
        <CModalHeader>
          <h5>Notification Results</h5>
        </CModalHeader>
        <CModalBody>
          {reminderResults && (
            <div>
              {reminderResults.success ? (
                <CAlert color="success">
                  <h6>Admin Notifications Sent Successfully</h6>
                  <p>{reminderResults.message}</p>
                </CAlert>
              ) : (
                <CAlert color="warning">
                  <h6>No Admin Notifications Sent</h6>
                  <p>{reminderResults.message}</p>
                </CAlert>
              )}

              {reminderResults.adminResult && (
                <div className="mb-3">
                  <h6>Admin Notifications</h6>
                  <p>{reminderResults.adminResult.message}</p>
                  {reminderResults.adminResult.results && (
                    <ul>
                      {reminderResults.adminResult.results.map((result, index) => (
                        <li key={index}>
                          {result.adminName}: {result.success ? 'Sent' : 'Failed'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {reminderResults.coursesChecked && (
                <div className="mb-3">
                  <h6>Summary</h6>
                  <ul>
                    <li>Homeroom classes checked: {reminderResults.coursesChecked}</li>
                    <li>Admin notifications sent: {reminderResults.remindersSent}</li>
                    <li>Note: Teachers are notified manually by admins using the "Manual Teacher SMS" tab</li>
                  </ul>
                </div>
              )}

              {reminderResults.errors && reminderResults.errors.length > 0 && (
                <div className="mb-3">
                  <h6>Errors</h6>
                  <ul>
                    {reminderResults.errors.map((error, index) => (
                      <li key={index}>
                        {error.courseName}: {error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowResultsModal(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default AttendanceReminderManager 