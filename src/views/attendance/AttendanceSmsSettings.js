import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CForm,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CFormSelect,
  CButton,
  CSpinner,
  CAlert,
  CRow,
  CCol,
  CFormCheck,
  CFormSwitch,
  CInputGroup,
  CInputGroupText,
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import { Checkbox, FormControlLabel } from '@mui/material'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '../../Firebase/firebase'
import useAuth from '../../Firebase/useAuth'
import { toast } from 'react-hot-toast'
import CIcon from '@coreui/icons-react'
import { cilSave, cilSettings, cilBell, cilCalendar } from '@coreui/icons'
import CalendarPicker from './CalendarPicker'

function formatPhoneE164First(input) {
  if (!input || typeof input !== 'string') return null
  const first = input.split(',')[0].trim()
  if (!first) return null
  let cleaned = first.replace(/\D/g, '')
  if (!cleaned) return null
  if (cleaned.length === 10 && cleaned.charAt(0) !== '1') {
    cleaned = '1' + cleaned
  }
  if (!cleaned.startsWith('+')) cleaned = '+' + cleaned
  return cleaned
}

const AttendanceSmsSettings = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    enabled: true,
    schedule: {
      time: '12:00',
      timezone: 'America/Toronto',
      daysOfWeek: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      },
      excludedDates: [], // Professional development days, holidays, etc.
    },
    messageTemplate: {
      enabled: true,
      template: 'Attendance Alert for {date}: {studentName} was marked as {status}. Please contact the school for more information at 613 421 1700. (Do not reply)',
    },
  })
  const [alert, setAlert] = useState({ show: false, message: '', color: 'success' })

  // Check if user is admin
  const [isAdmin, setIsAdmin] = useState(false)

  // Weekend confirmation modal
  const [showWeekendModal, setShowWeekendModal] = useState(false)
  const [weekendToToggle, setWeekendToToggle] = useState(null)

  // Calendar modal
  const [showCalendarModal, setShowCalendarModal] = useState(false)

  // Test SMS modal
  const [showTestSmsModal, setShowTestSmsModal] = useState(false)
  const [testPhoneNumber, setTestPhoneNumber] = useState('')
  const [testMessage, setTestMessage] = useState('')

  // Days of week in correct order
  const DAYS_OF_WEEK = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ]

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return
      
      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          const role = userData.personalInfo?.role || userData.role || ''
          setIsAdmin(role.toLowerCase() === 'admin')
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
      }
    }

    checkAdminStatus()
  }, [user])

  useEffect(() => {
    if (isAdmin) {
      loadSettings()
    }
  }, [isAdmin])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const settingsDoc = await getDoc(doc(firestore, 'systemSettings', 'attendanceSms'))
      
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data())
      } else {
        // Create default settings if they don't exist
        await setDoc(doc(firestore, 'systemSettings', 'attendanceSms'), settings)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setAlert({
        show: true,
        message: 'Error loading settings. Please try again.',
        color: 'danger',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!isAdmin) return

    try {
      setSaving(true)
      setAlert({ show: false, message: '', color: 'success' })

      await updateDoc(doc(firestore, 'systemSettings', 'attendanceSms'), {
        ...settings,
        lastUpdated: new Date(),
        updatedBy: user.uid,
      })

      setAlert({
        show: true,
        message: 'Attendance SMS settings saved successfully!',
        color: 'success',
      })
      toast.success('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      setAlert({
        show: true,
        message: 'Error saving settings. Please try again.',
        color: 'danger',
      })
      toast.error('Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTestSms = async () => {
    if (!isAdmin) return

    // Open test SMS modal instead of sending directly
    setShowTestSmsModal(true)
    
    // Pre-fill the test message with current template
    const currentTemplate = settings.messageTemplate?.template || 
      'Attendance Alert for {date}: {studentName} was marked as {status}. Please contact the school for more information at 613 421 1700. (Do not reply)'
    
    // Replace template variables with test values
    const testDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    
    const testMessageText = currentTemplate
      .replace(/{date}/g, testDate)
      .replace(/{studentName}/g, 'Test Student')
      .replace(/{status}/g, 'Absent')
      .replace(/{courseTitle}/g, 'Test Class')
    
    setTestMessage(testMessageText)
  }

  const sendTestSms = async () => {
    if (!isAdmin || !testPhoneNumber.trim()) return

    try {
      setSaving(true)
      setAlert({ show: false, message: '', color: 'success' })

      // Validate phone number format (take only first if comma-separated)
      const formattedPhone = formatPhoneE164First(testPhoneNumber)
      const phoneRegex = /^\+?[1-9]\d{1,14}$/
      if (!formattedPhone || !phoneRegex.test(formattedPhone)) {
        throw new Error('Please enter a valid phone number in E.164 format (e.g., +1XXXXXXXXXX)')
      }

      const response = await fetch('https://northamerica-northeast1-tarbiyah-sms.cloudfunctions.net/sendSmsHttp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          message: testMessage,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setAlert({
          show: true,
          message: `Test SMS sent successfully to ${formattedPhone}!`,
          color: 'success',
        })
        toast.success(`Test SMS sent to ${formattedPhone}!`)
        setShowTestSmsModal(false)
        setTestPhoneNumber('')
      } else {
        throw new Error(result.message || 'Failed to send test SMS')
      }
    } catch (error) {
      console.error('Error sending test SMS:', error)
      setAlert({
        show: true,
        message: `Error sending test SMS: ${error.message}`,
        color: 'danger',
      })
      toast.error('Error sending test SMS')
    } finally {
      setSaving(false)
    }
  }

  // Helper function to check if today would be excluded
  const checkTodayStatus = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayString = `${year}-${month}-${day}`
    
    const isExcluded = settings.schedule?.excludedDates?.includes(todayString)
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.getDay()]
    const isDayEnabled = settings.schedule?.daysOfWeek?.[currentDay]
    
    return {
      todayString,
      isExcluded,
      currentDay,
      isDayEnabled,
      wouldSend: settings.enabled && !isExcluded && isDayEnabled
    }
  }

  const handleToggle = (field) => {
    setSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handleScheduleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [field]: value
      }
    }))
  }

  const handleDayToggle = (day) => {
    // Check if it's a weekend day
    if ((day === 'saturday' || day === 'sunday') && !settings.schedule.daysOfWeek[day]) {
      // Show confirmation modal for enabling weekend
      setWeekendToToggle(day)
      setShowWeekendModal(true)
      return
    }

    // For weekdays or disabling weekends, proceed normally
    setSettings(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        daysOfWeek: {
          ...prev.schedule.daysOfWeek,
          [day]: !prev.schedule.daysOfWeek[day]
        }
      }
    }))
  }

  const confirmWeekendToggle = () => {
    if (weekendToToggle) {
      setSettings(prev => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          daysOfWeek: {
            ...prev.schedule.daysOfWeek,
            [weekendToToggle]: true
          }
        }
      }))
    }
    setShowWeekendModal(false)
    setWeekendToToggle(null)
  }

  const cancelWeekendToggle = () => {
    setShowWeekendModal(false)
    setWeekendToToggle(null)
  }

  const handleTemplateChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      messageTemplate: {
        ...prev.messageTemplate,
        [field]: value
      }
    }))
  }

  const handleDateToggle = (dateString) => {
    // Ensure the dateString is in the correct format (YYYY-MM-DD)
    // The dateString should already be correct from the calendar component
    setSettings(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        excludedDates: prev.schedule.excludedDates.includes(dateString)
          ? prev.schedule.excludedDates.filter(date => date !== dateString)
          : [...prev.schedule.excludedDates, dateString]
      }
    }))
  }

  const removeExcludedDate = (dateToRemove) => {
    setSettings(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        excludedDates: prev.schedule.excludedDates.filter(date => date !== dateToRemove)
      }
    }))
  }

  // If not admin, don't render anything
  if (!isAdmin) {
    return null
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <CSpinner color="primary" />
      </div>
    )
  }

  return (
    <>
      <CCard>
        <CCardHeader>
          <div className="d-flex align-items-center">
            <CIcon icon={cilBell} className="me-2" />
            <h4 className="mb-0">Attendance SMS Settings</h4>
          </div>
          <small className="text-muted">
            Configure automatic attendance SMS notifications for parents
          </small>
        </CCardHeader>
        <CCardBody>
          {alert.show && (
            <CAlert color={alert.color} dismissible onClose={() => setAlert({ show: false, message: '', color: 'success' })}>
              {alert.message}
            </CAlert>
          )}

          <CForm>
            {/* Main Toggle */}
            <CRow className="mb-4">
              <CCol md={12}>
                <div className="d-flex align-items-center justify-content-between p-3 border rounded">
                  <div>
                    <h5 className="mb-1">Enable Automatic SMS Notifications</h5>
                    <small className="text-muted">
                      When enabled, parents will automatically receive SMS notifications when their child is marked absent or late
                    </small>
              </div>
                  <CFormSwitch
                    id="enableSms"
                    checked={settings.enabled}
                    onChange={() => handleToggle('enabled')}
                    size="lg"
                  />
                </div>
              </CCol>
            </CRow>

            {/* Today's Status */}
            <CRow className="mb-4">
              <CCol md={12}>
                <div className="p-3 border rounded bg-light">
                  <h6 className="mb-2">Today's SMS Status</h6>
                  {(() => {
                    const status = checkTodayStatus()
                    return (
                      <div className="d-flex align-items-center gap-3">
                        <div className="d-flex align-items-center">
                          <span className="me-2">Date:</span>
                          <strong>{status.todayString}</strong>
                        </div>
                        <div className="d-flex align-items-center">
                          <span className="me-2">Day:</span>
                          <strong className="text-capitalize">{status.currentDay}</strong>
                        </div>
                        <div className="d-flex align-items-center">
                          <span className="me-2">Status:</span>
                          {status.wouldSend ? (
                            <span className="badge bg-success">✅ SMS Would Send</span>
                          ) : (
                            <span className="badge bg-warning">❌ SMS Would NOT Send</span>
                          )}
                        </div>
                        {!status.wouldSend && (
                          <div className="text-muted small">
                            {!settings.enabled && "SMS is disabled"}
                            {settings.enabled && status.isExcluded && `Date ${status.todayString} is excluded`}
                            {settings.enabled && !status.isExcluded && !status.isDayEnabled && `${status.currentDay} is disabled`}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </CCol>
            </CRow>

            {/* Schedule Settings */}
            <CRow className="mb-4">
              <CCol md={12}>
                <h5 className="mb-3">
                  <CIcon icon={cilSettings} className="me-2" />
                  Schedule Configuration
                </h5>
              </CCol>
              
              <CCol md={6}>
                <CFormLabel>Notification Time</CFormLabel>
                <CFormInput
                  type="time"
                  value={settings.schedule.time}
                  onChange={(e) => handleScheduleChange('time', e.target.value)}
                  disabled={!settings.enabled}
                />
                <small className="text-muted">Time when SMS notifications will be sent</small>
              </CCol>

              <CCol md={6}>
                <CFormLabel>Timezone</CFormLabel>
                <CFormSelect
                  value={settings.schedule.timezone}
                  onChange={(e) => handleScheduleChange('timezone', e.target.value)}
                  disabled={!settings.enabled}
                >
                  <option value="America/Toronto">Eastern Standard Time </option>
                  <option value="America/Chicago">Central Standard Time</option>
                  <option value="America/Denver">Mountain Standard Time</option>
                  <option value="America/Los_Angeles">Pacific Standard Time</option>
                </CFormSelect>
              </CCol>
            </CRow>

            {/* Days of Week */}
            <CRow className="mb-4">
              <CCol md={12}>
                <CFormLabel>Days to Send Notifications</CFormLabel>
                <div className="days-selection-container">
                  {DAYS_OF_WEEK.map(({ key, label }) => {
                    const isWeekend = key === 'saturday' || key === 'sunday'
                    const isEnabled = settings.schedule.daysOfWeek[key]
                    
                    return (
                      <div key={key} className={`day-selection-item ${isWeekend ? 'weekend' : 'weekday'}`}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={isEnabled}
                              onChange={() => handleDayToggle(key)}
                              disabled={!settings.enabled}
                              sx={{
                                color: isWeekend ? '#6c757d' : '#212631',
                                '&.Mui-checked': {
                                  color: isWeekend ? '#dc3545' : '#212631',
                                },
                                '&.Mui-disabled': {
                                  color: '#adb5bd',
                                },
                              }}
                            />
                          }
                          label={
                            <div className="day-label">
                              <span className={`day-name ${isWeekend ? 'weekend' : 'weekday'}`}>
                                {label}
                              </span>
                              {isWeekend && <span className="weekend-indicator">(Weekend)</span>}
                            </div>
                          }
                          sx={{
                            margin: 0,
                            '& .MuiFormControlLabel-label': {
                              fontSize: isWeekend ? '0.9rem' : '1rem',
                              fontWeight: isWeekend ? 'normal' : '600',
                              color: isWeekend ? '#6c757d' : '#212631',
                            },
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
                <small className="text-muted">Select which days of the week to send attendance notifications</small>
              </CCol>
            </CRow>

            {/* Excluded Dates */}
            <CRow className="mb-4">
              <CCol md={12}>
                <CFormLabel>Excluded Dates (Holidays, PD Days, etc.)</CFormLabel>
                <div className="d-flex gap-2 mb-3">
                  <CButton
                    color="outline-primary"
                    onClick={() => setShowCalendarModal(true)}
                    disabled={!settings.enabled}
                  >
                    <CIcon icon={cilCalendar} className="me-2" />
                    Open Calendar
                  </CButton>
                  <small className="text-muted align-self-center">
                    {settings.schedule.excludedDates.length} date(s) excluded
                  </small>
                </div>
                
                {settings.schedule.excludedDates.length > 0 && (
                  <div className="d-flex flex-wrap gap-2">
                    {settings.schedule.excludedDates.map((date) => {
                      // Parse the date string safely to avoid timezone issues
                      const [year, month, day] = date.split('-').map(Number)
                      const displayDate = new Date(year, month - 1, day)
                      
                      return (
                        <div key={date} className="badge bg-danger d-flex align-items-center">
                          {displayDate.toLocaleDateString()}
                          <button
                            type="button"
                            className="btn-close btn-close-white ms-2"
                            onClick={() => removeExcludedDate(date)}
                            style={{ fontSize: '0.5rem' }}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
                <small className="text-muted">Dates when attendance SMS notifications should not be sent</small>
              </CCol>
            </CRow>

            {/* Message Template */}
            <CRow className="mb-4">
              <CCol md={12}>
                <h5 className="mb-3">Message Template</h5>
                <CFormLabel>Customize the SMS message template</CFormLabel>
                <CFormTextarea
                  rows={4}
                  value={settings.messageTemplate.template}
                  onChange={(e) => handleTemplateChange('template', e.target.value)}
                  disabled={!settings.enabled}
                  placeholder="Enter your custom message template..."
                />
                <small className="text-muted">
                  Available variables: {'{date}'}, {'{studentName}'}, {'{status}'}, {'{courseTitle}'}
                </small>
              </CCol>
            </CRow>

            {/* Save Button */}
            <CRow>
              <CCol md={12}>
                <div className="d-flex justify-content-end gap-2">
                  <CButton
                    color="warning"
                    onClick={handleTestSms}
                    disabled={saving || !settings.enabled}
                  >
                    <CIcon icon={saving ? undefined : cilBell} className="me-2" />
                    {saving ? <CSpinner size="sm" /> : 'Test SMS'}
                  </CButton>
                  <CButton
                    color="primary"
                    onClick={handleSave}
                    disabled={saving || !settings.enabled}
                  >
                    <CIcon icon={saving ? undefined : cilSave} className="me-2" />
                    {saving ? <CSpinner size="sm" /> : 'Save Settings'}
                  </CButton>
                </div>
              </CCol>
            </CRow>
          </CForm>
        </CCardBody>
      </CCard>

      {/* Weekend Confirmation Modal */}
      <CModal visible={showWeekendModal} onClose={cancelWeekendToggle}>
        <CModalHeader>
          <h5>Confirm Weekend SMS Notifications</h5>
        </CModalHeader>
        <CModalBody>
          <p>
            Are you sure you want to enable SMS notifications for {weekendToToggle === 'saturday' ? 'Saturday' : 'Sunday'}?
          </p>
          <p className="text-muted">
            <strong>Note:</strong> Students typically don't have school on weekends. 
            This should only be enabled for special circumstances like weekend programs or events.
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={cancelWeekendToggle}>
            Cancel
          </CButton>
          <CButton color="warning" onClick={confirmWeekendToggle}>
            Enable Anyway
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Test SMS Modal */}
      <CModal visible={showTestSmsModal} onClose={() => setShowTestSmsModal(false)} size="lg">
        <CModalHeader>
          <h5>Send Test SMS</h5>
        </CModalHeader>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel>Phone Number</CFormLabel>
            <CFormInput
              type="tel"
              value={testPhoneNumber}
              onChange={(e) => setTestPhoneNumber(e.target.value)}
              placeholder="+1XXXXXXXXXX"
              className="mb-2"
            />
            <small className="text-muted">
              Enter the phone number where you want to receive the test SMS (E.164 format)
            </small>
          </div>
          
          <div className="mb-3">
            <CFormLabel>Test Message</CFormLabel>
            <CFormTextarea
              rows={4}
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Test message content..."
            />
            <small className="text-muted">
              This message will be sent to the phone number above. You can edit it to test different content.
            </small>
          </div>

          <div className="alert alert-info">
            <strong>Note:</strong> This will send a real SMS to the phone number you enter. 
            Make sure to use your own phone number for testing.
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowTestSmsModal(false)}>
            Cancel
          </CButton>
          <CButton 
            color="primary" 
            onClick={sendTestSms}
            disabled={saving || !testPhoneNumber.trim()}
          >
            <CIcon icon={saving ? undefined : cilBell} className="me-2" />
            {saving ? <CSpinner size="sm" /> : 'Send Test SMS'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Calendar Picker Modal */}
      <CalendarPicker
        excludedDates={settings.schedule.excludedDates}
        onDateToggle={handleDateToggle}
        disabled={!settings.enabled}
        visible={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
      />
    </>
  )
}

export default AttendanceSmsSettings
