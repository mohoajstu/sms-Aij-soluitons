import React, { useState, useEffect } from 'react'
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CFormSwitch,
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CFormInput,
  CAlert,
  CSpinner,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilChatBubble, cilBell, cilBellExclamation } from '@coreui/icons'
import NotificationService from '../../services/notificationService'
import { toast } from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router-dom'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '../../Firebase/firebase'
import useAuth from '../../Firebase/useAuth'
import './attendanceTable.css'

const AttendanceTable = () => {
  const location = useLocation()
  const selectedCourse = location.state?.selectedCourse
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [attendanceData, setAttendanceData] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [commentInput, setCommentInput] = useState('')
  const [allPresent, setAllPresent] = useState(false)
  const [attendanceDate, setAttendanceDate] = useState(new Date())
  const [smsSendingStatus, setSmsSendingStatus] = useState({})
  const [smsNotificationEnabled, setSmsNotificationEnabled] = useState(true)
  const [showSmsErrorModal, setShowSmsErrorModal] = useState(false)
  const [smsErrorDetails, setSmsErrorDetails] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()
  const [attendanceLoaded, setAttendanceLoaded] = useState(false)
  const [attendanceExists, setAttendanceExists] = useState(false)

  useEffect(() => {
    const fetchEnrolledStudents = async () => {
      if (selectedCourse && (selectedCourse.enrolledList || selectedCourse.students)) {
        setStudentsLoading(true)
        const ids = selectedCourse.enrolledList || selectedCourse.students || []
        try {
          const studentDocs = await Promise.all(
            ids.map(async (id) => {
              const docRef = doc(firestore, 'students', id)
              const docSnap = await getDoc(docRef)
              if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() }
              } else {
                return null
              }
            }),
          )
          setStudents(studentDocs.filter(Boolean))
        } catch (err) {
          setStudents([])
          console.error('Error fetching enrolled students:', err)
        } finally {
          setStudentsLoading(false)
        }
      } else {
        // fallback to hardcoded students if no course selected
        setStudents([
          {
            id: 1,
            name: 'Arthur Boucher',
            grade: 9,
            avatar: 'https://i.pravatar.cc/40?img=1',
            parentPhoneNumber: '+16812215667',
            parentName: 'Sarah Boucher',
          },
          {
            id: 2,
            name: 'Danny Anderson',
            grade: 9,
            avatar: 'https://i.pravatar.cc/40?img=2',
            parentPhoneNumber: '+16812215667',
            parentName: 'Michael Anderson',
          },
          {
            id: 3,
            name: 'Justin Aponte',
            grade: 9,
            avatar: 'https://i.pravatar.cc/40?img=3',
            parentPhoneNumber: '+16812215667',
            parentName: 'Maria Aponte',
          },
          {
            id: 4,
            name: 'Emily Johnson',
            grade: 9,
            avatar: 'https://i.pravatar.cc/40?img=4',
            parentPhoneNumber: '+16812215667',
            parentName: 'Robert Johnson',
          },
          {
            id: 5,
            name: 'Lucas Smith',
            grade: 9,
            avatar: 'https://i.pravatar.cc/40?img=5',
            parentPhoneNumber: '+16812215667',
            parentName: 'Jessica Smith',
          },
          {
            id: 6,
            name: 'Sophia Williams',
            grade: 9,
            avatar: 'https://i.pravatar.cc/40?img=6',
            parentPhoneNumber: '+16812215667',
            parentName: 'David Williams',
          },
        ])
      }
    }
    fetchEnrolledStudents()
  }, [selectedCourse])

  // Load existing attendance for this date/course
  useEffect(() => {
    const loadAttendance = async () => {
      setAttendanceLoaded(false)
      setAttendanceExists(false)
      if (!selectedCourse) return

      const dateId = attendanceDate.toISOString().split('T')[0]
      const courseId = selectedCourse.id
      const attendanceDocRef = doc(firestore, 'attendance', dateId)

      try {
        const docSnap = await getDoc(attendanceDocRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          const courseData = data.courses?.find((c) => c.courseId === courseId)

          if (courseData && courseData.students) {
            const loadedAttendance = {}
            courseData.students.forEach((student) => {
              loadedAttendance[student.studentId] = {
                status: student.status,
                comment: student.note || '',
              }
            })
            setAttendanceData(loadedAttendance)
            setAttendanceExists(true)
          } else {
            setAttendanceData({})
          }
        } else {
          setAttendanceData({})
        }
      } catch (err) {
        console.error('Error loading attendance:', err)
      } finally {
        setAttendanceLoaded(true)
      }
    }
    loadAttendance()
    // Only reload if course or date changes
  }, [selectedCourse, attendanceDate])

  useEffect(() => {
    // Check if SMS notification is properly configured
    const checkSmsConfig = async () => {
      try {
        const isConfigured = await NotificationService.checkSmsConfiguration()
        setSmsNotificationEnabled(isConfigured)
        if (!isConfigured) {
          console.warn('SMS notification is not properly configured')
        }
      } catch (error) {
        console.error('Error checking SMS configuration:', error)
        setSmsNotificationEnabled(false)
      }
    }

    checkSmsConfig()
  }, [])

  const handleSetAllPresent = (checked) => {
    const newAttendance = {}
    students.forEach((student) => {
      newAttendance[student.id] = {
        status: checked ? 'Present' : 'Absent',
        comment: attendanceData[student.id]?.comment || '',
      }
    })
    setAttendanceData(newAttendance)
    setAllPresent(checked)
  }

  const handleAttendanceChange = async (student, status) => {
    const previousStatus = attendanceData[student.id]?.status

    // Update attendance status
    setAttendanceData({
      ...attendanceData,
      [student.id]: {
        status,
        comment: attendanceData[student.id]?.comment || '',
      },
    })

    // If newly marked as absent AND SMS notifications are enabled, send notification
    if (status === 'Absent' && previousStatus !== 'Absent' && smsNotificationEnabled) {
      await sendAbsenceNotification(student)
    }
  }

  const sendAbsenceNotification = async (student) => {
    // Set the sending status for this student
    setSmsSendingStatus((prev) => ({
      ...prev,
      [student.id]: 'sending',
    }))

    try {
      const courseTitle = selectedCourse?.name || selectedCourse?.label || 'the class'
      const result = await NotificationService.sendAbsenceNotification({
        phoneNumber: student.parentPhoneNumber,
        studentName: student.name,
        className: courseTitle,
        date: attendanceDate.toISOString(),
      })

      // Update sending status
      setSmsSendingStatus((prev) => ({
        ...prev,
        [student.id]: 'sent',
      }))

      // Show success toast
      toast.success(`SMS notification sent to ${student.parentName}`)

      // Automatically clear the success status after 5 seconds
      setTimeout(() => {
        setSmsSendingStatus((prev) => {
          const newStatus = { ...prev }
          delete newStatus[student.id]
          return newStatus
        })
      }, 5000)
    } catch (error) {
      console.error('Error sending SMS notification:', error)

      // Update sending status to error
      setSmsSendingStatus((prev) => ({
        ...prev,
        [student.id]: 'error',
      }))

      // Show error toast
      toast.error('Failed to send SMS notification')

      // Store error details for modal
      setSmsErrorDetails(error.message || 'Unknown error occurred')
    }
  }

  const openCommentModal = (student) => {
    setSelectedStudent(student)
    setCommentInput(attendanceData[student.id]?.comment || '')
    setShowModal(true)
  }

  const saveComment = () => {
    setAttendanceData({
      ...attendanceData,
      [selectedStudent.id]: {
        status: attendanceData[selectedStudent.id]?.status || 'Absent',
        comment: commentInput,
      },
    })
    setShowModal(false)
  }

  const handleComplete = async () => {
    if (!selectedCourse) {
      toast.error('No course selected!')
      return
    }
    if (!user || !user.uid) {
      toast.error('You must be logged in to record attendance.')
      return
    }
    const dateId = attendanceDate.toISOString().split('T')[0] // YYYY-MM-DD
    const attendanceDocRef = doc(firestore, 'attendance', dateId)

    const studentRecords = Object.entries(attendanceData).map(([studentId, data]) => {
      const studentInfo = students.find((s) => s.id === studentId)
      const studentName = studentInfo?.personalInfo
        ? `${studentInfo.personalInfo.firstName || ''} ${studentInfo.personalInfo.lastName || ''}`.trim()
        : studentInfo?.name || 'Unknown Student'

      return {
        studentId,
        studentName,
        status: data.status,
        note: data.comment || '',
      }
    })

    const newCourseRecord = {
      courseId: selectedCourse.id,
      courseTitle: selectedCourse.name || selectedCourse.label || 'Untitled Course',
      recordedAt: new Date(),
      recordedBy: user.uid,
      students: studentRecords,
    }

    try {
      const docSnap = await getDoc(attendanceDocRef)

      if (docSnap.exists()) {
        const existingData = docSnap.data()
        const courses = existingData.courses || []
        const courseIndex = courses.findIndex((c) => c.courseId === selectedCourse.id)

        if (courseIndex > -1) {
          courses[courseIndex] = newCourseRecord
        } else {
          courses.push(newCourseRecord)
        }

        await updateDoc(attendanceDocRef, { courses })
      } else {
        await setDoc(attendanceDocRef, {
          date: dateId,
          courses: [newCourseRecord],
        })
      }

      toast.success('Attendance saved!')
      navigate('/attendance')
    } catch (err) {
      console.error('Error saving attendance:', err)
      toast.error('Failed to save attendance.')
    }
  }

  const getNotificationStatusIcon = (studentId) => {
    const status = smsSendingStatus[studentId]

    if (!status) return null

    switch (status) {
      case 'sending':
        return <CSpinner size="sm" color="info" />
      case 'sent':
        return (
          <CBadge color="success" shape="rounded-pill">
            SMS Sent
          </CBadge>
        )
      case 'error':
        return (
          <CBadge
            color="danger"
            shape="rounded-pill"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setSmsErrorDetails(smsErrorDetails || 'Error sending notification')
              setShowSmsErrorModal(true)
            }}
          >
            SMS Failed
          </CBadge>
        )
      default:
        return null
    }
  }

  return (
    <div style={{ position: 'relative', paddingBottom: '60px' }}>
      {/* Attendance already exists alert */}
      {attendanceExists && (
        <CAlert color="warning" className="d-flex align-items-center mb-3">
          <CIcon icon={cilBellExclamation} className="flex-shrink-0 me-2" />
          <div>
            Attendance for this class and date has already been taken. You may update and resubmit if
            needed.
          </div>
        </CAlert>
      )}

      {/* SMS Notification Status */}
      {!smsNotificationEnabled && (
        <CAlert color="warning" className="d-flex align-items-center mb-3">
          <CIcon icon={cilBellExclamation} className="flex-shrink-0 me-2" />
          <div>
            SMS notifications are not properly configured. Parents will not be notified of absences.
          </div>
        </CAlert>
      )}

      {/* Mark All Present Switch */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <CFormSwitch
          label="Mark All Present"
          checked={allPresent}
          onChange={(e) => handleSetAllPresent(e.target.checked)}
        />

        {smsNotificationEnabled && (
          <CFormSwitch
            label="Send SMS Notifications"
            checked={smsNotificationEnabled}
            onChange={(e) => setSmsNotificationEnabled(e.target.checked)}
          />
        )}
      </div>

      {/* Attendance Table */}
      <div className="attendance-table-container-fixed">
        <CTable bordered responsive className="attendance-fixed-table">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell style={{ width: '22%' }}>Students</CTableHeaderCell>
              <CTableHeaderCell style={{ width: '18%' }}>Attendance Codes</CTableHeaderCell>
              <CTableHeaderCell style={{ width: '18%' }}>Status</CTableHeaderCell>
              <CTableHeaderCell style={{ width: '42%' }}>Comments</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {students.map((student) => {
              // Prefer Firestore fields if present
              const fullName = student.personalInfo
                ? `${student.personalInfo.firstName || ''} ${
                    student.personalInfo.lastName || ''
                  }`.trim()
                : student.name
              const grade = student.schooling?.program || student.grade || ''
              const avatar = student.avatar || 'https://i.pravatar.cc/40?img=1'
              return (
                <CTableRow key={student.id} style={{ background: '#fff' }}>
                  <CTableDataCell style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* <img src={avatar} alt={fullName} style={{ borderRadius: '50%' }} /> */}
                    <div>
                      {fullName}
                      <br />
                      <small>
                        #{student.id} • {grade}
                      </small>
                    </div>
                  </CTableDataCell>

                  <CTableDataCell>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}>
                      <CButton
                        color="success"
                        variant="outline"
                        onClick={() => handleAttendanceChange(student, 'Present')}
                        style={{
                          width: 110,
                          backgroundColor:
                            attendanceData[student.id]?.status === 'Present' ? '#28a745' : 'white',
                          color:
                            attendanceData[student.id]?.status === 'Present' ? 'white' : 'black',
                          border: '1px solid #28a745',
                          borderRadius: '6px',
                        }}
                      >
                        ✅ Present
                      </CButton>

                      <CButton
                        color="danger"
                        variant="outline"
                        onClick={() => handleAttendanceChange(student, 'Absent')}
                        style={{
                          width: 110,
                          backgroundColor:
                            attendanceData[student.id]?.status === 'Absent' ? '#dc3545' : 'white',
                          color:
                            attendanceData[student.id]?.status === 'Absent' ? 'white' : 'black',
                          border: '1px solid #dc3545',
                          borderRadius: '6px',
                        }}
                      >
                        ❌ Absent
                      </CButton>

                      <CButton
                        color="warning"
                        variant="outline"
                        onClick={() => handleAttendanceChange(student, 'Late')}
                        style={{
                          width: 110,
                          backgroundColor:
                            attendanceData[student.id]?.status === 'Late' ? '#ffc107' : 'white',
                          color: attendanceData[student.id]?.status === 'Late' ? 'black' : 'black',
                          border: '1px solid #ffc107',
                          borderRadius: '6px',
                        }}
                      >
                        ⏳ Late
                      </CButton>

                      <CButton
                        color="info"
                        variant="outline"
                        onClick={() => handleAttendanceChange(student, 'Excused')}
                        style={{
                          width: 110,
                          backgroundColor:
                            attendanceData[student.id]?.status === 'Excused' ? '#2196f3' : 'white',
                          color:
                            attendanceData[student.id]?.status === 'Excused' ? 'white' : 'black',
                          border: '1px solid #2196f3',
                          borderRadius: '6px',
                        }}
                      >
                        📝 Excused
                      </CButton>
                    </div>
                  </CTableDataCell>
                  <CTableDataCell>
                    {attendanceData[student.id]?.status === 'Absent' && smsNotificationEnabled && (
                      <div className="d-flex align-items-center">
                        {getNotificationStatusIcon(student.id) || (
                          <CButton
                            color="info"
                            size="sm"
                            variant="ghost"
                            onClick={() => sendAbsenceNotification(student)}
                          >
                            <CIcon icon={cilBell} /> Notify
                          </CButton>
                        )}
                      </div>
                    )}
                    {attendanceData[student.id]?.status &&
                      attendanceData[student.id]?.status !== 'Absent' && (
                        <CBadge
                          color={
                            attendanceData[student.id]?.status === 'Present'
                              ? 'success'
                              : attendanceData[student.id]?.status === 'Late'
                              ? 'warning'
                              : 'primary'
                          }
                        >
                          {attendanceData[student.id]?.status}
                        </CBadge>
                      )}
                  </CTableDataCell>
                  <CTableDataCell
                    style={{
                      minWidth: 200,
                      maxWidth: 400,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    }}
                  >
                    <CIcon
                      icon={cilChatBubble}
                      size="lg"
                      style={{
                        color: attendanceData[student.id]?.comment ? 'green' : 'black',
                        cursor: 'pointer',
                      }}
                      onClick={() => openCommentModal(student)}
                    />
                    {attendanceData[student.id]?.comment && (
                      <small className="ms-2 text-muted">
                        {attendanceData[student.id]?.comment.substring(0, 120)}
                      </small>
                    )}
                  </CTableDataCell>
                </CTableRow>
              )
            })}
          </CTableBody>
        </CTable>
      </div>

      {/* Comment Modal */}
      <CModal visible={showModal} onClose={() => setShowModal(false)}>
        <CModalHeader closeButton>{selectedStudent?.name}'s Comment</CModalHeader>
        <CModalBody>
          <CFormInput
            type="text"
            placeholder="Enter comment..."
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={saveComment}>
            Save Comment
          </CButton>
        </CModalFooter>
      </CModal>

      {/* SMS Error Modal */}
      <CModal visible={showSmsErrorModal} onClose={() => setShowSmsErrorModal(false)}>
        <CModalHeader closeButton>SMS Notification Error</CModalHeader>
        <CModalBody>
          <p>There was an error sending the SMS notification:</p>
          <CAlert color="danger">{smsErrorDetails}</CAlert>
          <p>This could be due to:</p>
          <ul>
            <li>Invalid phone number format</li>
            <li>Twilio account issues</li>
            <li>Network connectivity problems</li>
          </ul>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowSmsErrorModal(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Complete Button at Bottom Right */}
      <CButton
        color="dark"
        style={{
          position: 'absolute',
          bottom: '10px',
          right: '20px',
          padding: '10px 20px',
          fontSize: '16px',
          borderRadius: '100px',
        }}
        onClick={handleComplete}
      >
        Complete Attendance
      </CButton>
    </div>
  )
}

export default AttendanceTable
