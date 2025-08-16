import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CButton,
  CSpinner,
  CAlert,
  CRow,
  CCol,
  CBadge,
} from '@coreui/react'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { firestore } from '../../firebase'
import NotificationService from '../../services/notificationService'
import { toast } from 'react-hot-toast'
import Select from 'react-select'

const ManualSmsNotification = () => {
  const [formData, setFormData] = useState({
    phoneNumber: '',
    message: '',
    selectedParent: '',
  })

  const [parents, setParents] = useState([])
  const [isSending, setIsSending] = useState(false)
  const [isLoadingParents, setIsLoadingParents] = useState(false)
  const [isConfigChecking, setIsConfigChecking] = useState(false)
  const [smsConfigured, setSmsConfigured] = useState(null)
  const [alert, setAlert] = useState({ show: false, message: '', color: 'success' })
  const [errorMessage, setErrorMessage] = useState('')
  const [parentStudentOptions, setParentStudentOptions] = useState([])

  // Check SMS configuration on component mount
  useEffect(() => {
    const checkConfig = async () => {
      setIsConfigChecking(true)
      try {
        const isConfigured = await NotificationService.checkSmsConfiguration()
        setSmsConfigured(isConfigured)
        if (!isConfigured) {
          setAlert({
            show: true,
            message: 'SMS service is not properly configured.',
            color: 'warning',
          })
        }
      } catch (error) {
        console.error('Error checking SMS configuration:', error)
        setSmsConfigured(false)
        setAlert({
          show: true,
          message: 'Error checking SMS configuration.',
          color: 'warning',
        })
      } finally {
        setIsConfigChecking(false)
      }
    }

    checkConfig()
  }, [])

  // Fetch all students and cross-reference parents for phone numbers
  useEffect(() => {
    const fetchStudentParentOptions = async () => {
      setIsLoadingParents(true)
      try {
        // 1. Fetch all students
        const studentsCol = collection(firestore, 'students')
        const studentSnapshot = await getDocs(studentsCol)
        const students = studentSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

        // 2. Fetch all parents ONCE
        const parentsCol = collection(firestore, 'parents')
        const parentSnapshot = await getDocs(parentsCol)
        const parentMap = new Map()
        parentSnapshot.forEach((doc) => {
          parentMap.set(doc.id, doc.data())
        })

        // 3. For each student, get their parent(s) and build options
        const options = []
        for (const student of students) {
          const studentName = student.personalInfo
            ? `${student.personalInfo.firstName || ''} ${student.personalInfo.lastName || ''}`.trim()
            : student.name || ''
          let foundParent = false
          if (student.parents) {
            for (const key of Object.keys(student.parents)) {
              const parentInfo = student.parents[key]
              if (parentInfo && parentInfo.tarbiyahId) {
                const parentData = parentMap.get(parentInfo.tarbiyahId)
                if (parentData) {
                  const parentName = parentData.personalInfo
                    ? `${parentData.personalInfo.firstName || ''} ${parentData.personalInfo.lastName || ''}`.trim()
                    : parentInfo.name || ''
                  // Fallback order: phone1, phone2, emergencyPhone
                  const phone1 = parentData.contact?.phone1?.trim()
                  const phone2 = parentData.contact?.phone2?.trim()
                  const emergencyPhone = parentData.contact?.emergencyPhone?.trim()
                  const phoneNumber = phone1 || phone2 || emergencyPhone || 'No phone on file'
                  options.push({
                    label: `${studentName} – ${parentName} – ${phoneNumber}`,
                    value: `${student.id}-${parentInfo.tarbiyahId}`,
                    parentId: parentInfo.tarbiyahId,
                    studentId: student.id,
                    phoneNumber,
                    parentName,
                    studentName,
                  })
                  foundParent = true
                } else {
                  // Parent doc missing or not accessible
                  options.push({
                    label: `${studentName} – ${parentInfo.name || 'Unknown Parent'} – No phone on file`,
                    value: `${student.id}-${parentInfo.tarbiyahId}-missing`,
                    parentId: parentInfo.tarbiyahId,
                    studentId: student.id,
                    phoneNumber: 'No phone on file',
                    parentName: parentInfo.name || 'Unknown Parent',
                    studentName,
                  })
                  foundParent = true
                }
              }
            }
          }
          if (!foundParent) {
            // No parent info or could not fetch parent
            options.push({
              label: `${studentName} – No parent on file – No phone on file`,
              value: `${student.id}-no-parent`,
              parentId: '',
              studentId: student.id,
              phoneNumber: 'No phone on file',
              parentName: 'No parent on file',
              studentName,
            })
          }
        }
        // Sort alphabetically by student name
        options.sort((a, b) => a.studentName.localeCompare(b.studentName))
        setParentStudentOptions(options)
      } catch (error) {
        console.error('Error fetching students/parents:', error)
        toast.error('Failed to load student/parent list')
      } finally {
        setIsLoadingParents(false)
      }
    }
    fetchStudentParentOptions()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }))

    // Clear any error messages when user modifies the form
    if (errorMessage) {
      setErrorMessage('')
    }
    if (alert.show) {
      setAlert({ show: false, message: '', color: 'success' })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSending(true)
    setAlert({ show: false, message: '', color: 'success' })
    setErrorMessage('')

    try {
      // Validate the phone number
      const phoneRegex = /^\+?[1-9]\d{1,14}$/
      if (!phoneRegex.test(formData.phoneNumber)) {
        throw new Error('Please enter a valid phone number in E.164 format (e.g., +1XXXXXXXXXX)')
      }

      // Validate message
      if (!formData.message.trim()) {
        throw new Error('Please enter a message to send')
      }

      // Check if SMS configuration is working first
      const isConfigured = await NotificationService.checkSmsConfiguration()
      if (!isConfigured) {
        throw new Error(
          'SMS service is not properly configured. Please check network connectivity and CORS settings.',
        )
      }

      // Send SMS using the updated notification service
      const response = await fetch('https://northamerica-northeast1-tarbiyah-sms.cloudfunctions.net/sendSmsHttp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formData.phoneNumber,
          message: formData.message,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setAlert({
          show: true,
          message: `Manual SMS sent successfully!`,
          color: 'success',
        })
        toast.success('Manual SMS sent successfully!')
        
        // Clear the form
        setFormData({
          phoneNumber: '',
          message: '',
          selectedParent: '',
        })
      } else {
        throw new Error(result?.message || 'Failed to send SMS')
      }
    } catch (error) {
      console.error('Error sending SMS:', error)

      // Handle different types of errors
      if (
        error.message &&
        (error.message.includes('CORS') ||
          error.message.includes('Cross-Origin') ||
          error.message.includes('Access-Control-Allow-Origin'))
      ) {
        setErrorMessage(
          'Cross-Origin (CORS) error: The SMS service is not accessible from this domain. Please check your CORS configuration in the backend.',
        )
        toast.error('CORS error: Cannot connect to SMS service')
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        setErrorMessage(
          'Network error: Could not connect to the SMS service. Please check your internet connection or the service endpoint.',
        )
        toast.error('Network error: Could not connect to SMS service')
      } else {
        setErrorMessage(error.message || 'Failed to send SMS. Please try again later.')
        toast.error('Failed to send SMS')
      }

      setAlert({
        show: true,
        message: 'Failed to send SMS. See details below.',
        color: 'danger',
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <h4>Send Manual SMS</h4>
        <div>
          {isConfigChecking ? (
            <CBadge color="secondary">
              Checking SMS configuration... <CSpinner size="sm" />
            </CBadge>
          ) : smsConfigured === true ? (
            <CBadge color="success">SMS Service Ready</CBadge>
          ) : smsConfigured === false ? (
            <CBadge color="danger">SMS Service Unavailable</CBadge>
          ) : (
            <CBadge color="primary">Direct API Connection</CBadge>
          )}
        </div>
      </CCardHeader>
      <CCardBody>
        {alert.show && (
          <CAlert
            color={alert.color}
            dismissible
            onClose={() => setAlert({ ...alert, show: false })}
          >
            {alert.message}
          </CAlert>
        )}

        <div className="mb-4 p-3 bg-light rounded">
          <h5 className="text-primary">📱 Manual SMS Notification</h5>
          <p className="mb-0">
            Use this form to send custom SMS messages. You can select a parent from the dropdown to auto-fill 
            their phone number, or manually enter any phone number and custom message.
          </p>
        </div>

        {errorMessage && (
          <CAlert color="danger" className="mb-4">
            <h5>Error Details:</h5>
            <p className="mb-0">{errorMessage}</p>
            {errorMessage.includes('CORS') && (
              <div className="mt-2">
                <strong>Possible solutions:</strong>
                <ul className="mt-1 mb-0">
                  <li>Configure CORS headers on your backend server</li>
                  <li>Use a server-side proxy to make the API request</li>
                  <li>Make sure Twilio allows requests from this domain</li>
                </ul>
              </div>
            )}
          </CAlert>
        )}

        <CForm onSubmit={handleSubmit}>
          <CRow className="mb-3">
            <CCol md={12}>
              <CFormLabel htmlFor="selectedParent">Select Student/Parent (Searchable)</CFormLabel>
              {isLoadingParents ? (
                <div className="d-flex align-items-center">
                  <CSpinner size="sm" className="me-2" />
                  <span>Loading students/parents...</span>
                </div>
              ) : (
                <Select
                  inputId="selectedParent"
                  name="selectedParent"
                  options={parentStudentOptions}
                  isClearable
                  isSearchable
                  value={parentStudentOptions.find(opt => opt.value === formData.selectedParent) || null}
                  onChange={selected => {
                    setFormData(prev => ({
                      ...prev,
                      selectedParent: selected ? selected.value : '',
                      phoneNumber: selected ? selected.phoneNumber : '',
                    }))
                    if (errorMessage) setErrorMessage('')
                    if (alert.show) setAlert({ show: false, message: '', color: 'success' })
                  }}
                  isDisabled={isSending}
                  placeholder="Search by student name..."
                  styles={{ menu: base => ({ ...base, zIndex: 9999 }) }}
                />
              )}
              <small className="form-text text-muted">
                Search and select a student to auto-fill their parent's phone number below.
              </small>
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={12}>
              <CFormLabel htmlFor="phoneNumber">Phone Number</CFormLabel>
              <CFormInput
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="+1XXXXXXXXXX"
                required
                disabled={isSending}
              />
              <small className="form-text text-muted">
                Enter phone number in E.164 format (e.g., +1XXXXXXXXXX) or select a parent above to auto-fill.
              </small>
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={12}>
              <CFormLabel htmlFor="message">Custom Message</CFormLabel>
              <CFormTextarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Enter your custom SMS message here..."
                rows={4}
                required
                disabled={isSending}
              />
              <small className="form-text text-muted">
                Enter the message you want to send. Keep it concise and clear.
              </small>
            </CCol>
          </CRow>

          {formData.message && formData.phoneNumber && (
            <div className="bg-light p-3 mb-3 rounded">
              <h5>SMS Preview</h5>
              <p className="mb-1">
                <strong>To:</strong> {formData.phoneNumber}
              </p>
              <p className="mb-1">
                <strong>Message:</strong> {formData.message}
              </p>
              <p className="mb-0 text-muted">
                <strong>Character count:</strong> {formData.message.length}/160 
                {formData.message.length > 160 && ' (This will be sent as multiple SMS messages)'}
              </p>
            </div>
          )}

          <div className="d-grid gap-2 d-md-flex justify-content-md-end">
            <CButton
              type="submit"
              color="primary"
              disabled={isSending || isConfigChecking || smsConfigured === false || !formData.message.trim() || !formData.phoneNumber.trim()}
            >
              {isSending ? (
                <>
                  <CSpinner size="sm" className="me-2" /> Sending...
                </>
              ) : (
                'Send Manual SMS'
              )}
            </CButton>
          </div>
        </CForm>
      </CCardBody>
    </CCard>
  )
}

export default ManualSmsNotification
