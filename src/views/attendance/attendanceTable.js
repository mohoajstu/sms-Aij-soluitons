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

// Enhanced students data with parent phone numbers
const students = [
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
]

const AttendanceTable = () => {
  const [attendanceData, setAttendanceData] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [commentInput, setCommentInput] = useState('')
  const [allPresent, setAllPresent] = useState(false)
  const [className, setClassName] = useState('Mathematics 101')
  const [attendanceDate, setAttendanceDate] = useState(new Date())
  const [smsSendingStatus, setSmsSendingStatus] = useState({})
  const [smsNotificationEnabled, setSmsNotificationEnabled] = useState(true)
  const [showSmsErrorModal, setShowSmsErrorModal] = useState(false)
  const [smsErrorDetails, setSmsErrorDetails] = useState('')

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
      const result = await NotificationService.sendAbsenceNotification({
        phoneNumber: student.parentPhoneNumber,
        studentName: student.name,
        className: className,
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

  const handleComplete = () => {
    // Count how many students are marked absent
    const absentCount = Object.values(attendanceData).filter(
      (data) => data.status === 'Absent',
    ).length

    // Prepare a summary message
    let summaryMessage = `Attendance complete: ${students.length - absentCount} present, ${absentCount} absent`

    // Display summary in toast notification
    toast.success(summaryMessage)

    console.log('Attendance Completed:', attendanceData)
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
      <CTable striped bordered responsive>
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Students</CTableHeaderCell>
            <CTableHeaderCell>Attendance Codes</CTableHeaderCell>
            <CTableHeaderCell>Status</CTableHeaderCell>
            <CTableHeaderCell>Comments</CTableHeaderCell>
          </CTableRow>
        </CTableHead>

        <CTableBody>
          {students.map((student) => (
            <CTableRow key={student.id}>
              <CTableDataCell style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={student.avatar} alt={student.name} style={{ borderRadius: '50%' }} />
                <div>
                  {student.name}
                  <br />
                  <small>
                    #{student.id} • Grade {student.grade}
                  </small>
                </div>
              </CTableDataCell>

              <CTableDataCell>
                <CButton
                  color="success"
                  variant="outline"
                  onClick={() => handleAttendanceChange(student, 'Present')}
                  style={{
                    marginRight: '5px',
                    backgroundColor:
                      attendanceData[student.id]?.status === 'Present' ? '#28a745' : 'white',
                    color: attendanceData[student.id]?.status === 'Present' ? 'white' : 'black',
                    border: '1px solid #28a745',
                  }}
                >
                  ✅ Present
                </CButton>

                <CButton
                  color="danger"
                  variant="outline"
                  onClick={() => handleAttendanceChange(student, 'Absent')}
                  style={{
                    marginRight: '5px',
                    backgroundColor:
                      attendanceData[student.id]?.status === 'Absent' ? '#dc3545' : 'white',
                    color: attendanceData[student.id]?.status === 'Absent' ? 'white' : 'black',
                    border: '1px solid #dc3545',
                  }}
                >
                  ❌ Absent
                </CButton>

                <CButton
                  color="warning"
                  variant="outline"
                  onClick={() => handleAttendanceChange(student, 'Late')}
                  style={{
                    backgroundColor:
                      attendanceData[student.id]?.status === 'Late' ? '#ffc107' : 'white',
                    color: attendanceData[student.id]?.status === 'Late' ? 'black' : 'black',
                    border: '1px solid #ffc107',
                  }}
                >
                  ⏳ Late
                </CButton>
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

              <CTableDataCell>
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
                    {attendanceData[student.id]?.comment.substring(0, 20)}...
                  </small>
                )}
              </CTableDataCell>
            </CTableRow>
          ))}
        </CTableBody>
      </CTable>

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
