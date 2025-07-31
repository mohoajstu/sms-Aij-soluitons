import React, { useState } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CButton,
  CSpinner,
  CAlert,
  CRow,
  CCol,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBell, cilTestTube } from '@coreui/icons'
import AttendanceReminderService from '../../services/attendanceReminderService'
import { toast } from 'react-hot-toast'

const AttendanceReminderTest = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [testResults, setTestResults] = useState(null)

  const runTestReminder = async () => {
    setIsLoading(true)
    try {
      // Test with a sample course
      const sampleCourse = {
        id: 'test-course-001',
        name: 'Test Course',
        label: 'Test Course'
      }

      const result = await AttendanceReminderService.triggerManualReminders(sampleCourse, '9:15 AM')
      setTestResults(result)
      
      if (result.success) {
        toast.success('Test reminder sent successfully!')
      } else {
        toast.error(result.message || 'Test reminder failed')
      }
    } catch (error) {
      console.error('Test reminder error:', error)
      toast.error('Test reminder failed: ' + error.message)
      setTestResults({ success: false, message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const runBulkTest = async () => {
    setIsLoading(true)
    try {
      const result = await AttendanceReminderService.checkAndSendReminders('9:15 AM')
      setTestResults(result)
      
      if (result.remindersSent > 0) {
        toast.success(`Test completed: ${result.remindersSent} reminders sent`)
      } else {
        toast.info('Test completed: No reminders needed')
      }
    } catch (error) {
      console.error('Bulk test error:', error)
      toast.error('Bulk test failed: ' + error.message)
      setTestResults({ success: false, message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="attendance-reminder-test">
      <CCard>
        <CCardHeader>
          <h4 className="mb-0">
            <CIcon icon={cilTestTube} className="me-2" />
            Attendance Reminder Test
          </h4>
        </CCardHeader>
        <CCardBody>
          <CAlert color="info">
            <strong>Test the attendance reminder functionality:</strong>
            <br />
            • Single Course Test: Tests reminder for a specific course
            <br />
            • Bulk Test: Tests reminders for all incomplete courses
            <br />
            • Check the console for detailed logs
          </CAlert>

          <CRow className="mt-3">
            <CCol md={6}>
              <CButton
                color="primary"
                onClick={runTestReminder}
                disabled={isLoading}
                className="w-100 mb-2"
              >
                {isLoading ? <CSpinner size="sm" /> : <CIcon icon={cilBell} />}
                Test Single Course Reminder
              </CButton>
            </CCol>
            <CCol md={6}>
              <CButton
                color="info"
                onClick={runBulkTest}
                disabled={isLoading}
                className="w-100 mb-2"
              >
                {isLoading ? <CSpinner size="sm" /> : <CIcon icon={cilTestTube} />}
                Test Bulk Reminders
              </CButton>
            </CCol>
          </CRow>

          {testResults && (
            <div className="mt-4">
              <h5>Test Results:</h5>
              <pre className="bg-light p-3 rounded">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </div>
          )}
        </CCardBody>
      </CCard>
    </div>
  )
}

export default AttendanceReminderTest 