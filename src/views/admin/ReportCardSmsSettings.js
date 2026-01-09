import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CForm,
  CFormLabel,
  CFormSwitch,
  CButton,
  CSpinner,
  CAlert,
  CFormInput,
} from '@coreui/react'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '../../Firebase/firebase'
import useAuth from '../../Firebase/useAuth'
import { toast } from 'react-hot-toast'
import CIcon from '@coreui/icons-react'
import { cilSave, cilSettings } from '@coreui/icons'

/**
 * Report Cards SMS Settings Component
 * Admin settings for Report Cards functionality
 */
const ReportCardSmsSettings = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    disableEditing: false, // B9: Disable editing setting
    hideProgressReports: false, // B3: Hide progress reports from selection
    reportCardDate: '', // Autofill date for report cards
  })
  const [alert, setAlert] = useState({ show: false, message: '', color: 'success' })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const settingsDoc = await getDoc(doc(firestore, 'systemSettings', 'reportCardSms'))
      
      if (settingsDoc.exists()) {
        const loadedSettings = settingsDoc.data()
        // Ensure all settings have default values to prevent controlled/uncontrolled input warnings
        setSettings({
          disableEditing: loadedSettings.disableEditing ?? false,
          hideProgressReports: loadedSettings.hideProgressReports ?? false,
          reportCardDate: loadedSettings.reportCardDate || '',
        })
      } else {
        // Create default settings if they don't exist
        await setDoc(doc(firestore, 'systemSettings', 'reportCardSms'), settings)
      }
    } catch (error) {
      console.error('Error loading report card settings:', error)
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
    if (!user) return

    try {
      setSaving(true)
      await setDoc(
        doc(firestore, 'systemSettings', 'reportCardSms'),
        {
          ...settings,
          updatedAt: new Date(),
          updatedBy: user.uid,
        },
        { merge: true }
      )

      setAlert({
        show: true,
        message: 'Settings saved successfully!',
        color: 'success',
      })
      toast.success('Report Card settings saved')
    } catch (error) {
      console.error('Error saving settings:', error)
      setAlert({
        show: true,
        message: 'Error saving settings. Please try again.',
        color: 'danger',
      })
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <CCard>
        <CCardBody className="text-center">
          <CSpinner />
          <p className="mt-2">Loading settings...</p>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <div className="report-card-settings">
      <CCard className="shadow-sm">
        <CCardHeader className="bg-primary text-white">
          <div className="d-flex align-items-center">
            <CIcon icon={cilSettings} className="me-2" size="lg" />
            <h4 className="mb-0">Report Cards Settings</h4>
          </div>
        </CCardHeader>
        <CCardBody className="p-4">
          {alert.show && (
            <CAlert
              color={alert.color}
              dismissible
              onClose={() => setAlert({ ...alert, show: false })}
              className="mb-4"
            >
              {alert.message}
            </CAlert>
          )}

          <CForm>
            {/* B9: Disable editing setting */}
            <div className="mb-4 p-3 border rounded bg-light">
              <div className="d-flex align-items-start justify-content-between mb-2">
                <div className="flex-grow-1">
                  <CFormLabel className="fw-semibold mb-1" style={{ fontSize: '1.1rem' }}>
                    Disable Report Card Editing
                  </CFormLabel>
                  <p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>
                    When enabled, report cards become read-only. Users can view and navigate but cannot edit or save changes.
                  </p>
                </div>
                <div className="ms-3">
                  <CFormSwitch
                    id="disableEditing"
                    checked={settings.disableEditing ?? false}
                    onChange={(e) =>
                      setSettings({ ...settings, disableEditing: e.target.checked })
                    }
                    size="lg"
                  />
                </div>
              </div>
              <small className="text-muted d-block mt-2" style={{ fontSize: '0.85rem' }}>
                <CIcon icon={cilSettings} className="me-1" size="sm" />
                This setting applies globally to all report card forms.
              </small>
            </div>

            {/* B3: Hide progress reports setting */}
            <div className="mb-4 p-3 border rounded bg-light">
              <div className="d-flex align-items-start justify-content-between mb-2">
                <div className="flex-grow-1">
                  <CFormLabel className="fw-semibold mb-1" style={{ fontSize: '1.1rem' }}>
                    Hide Progress Reports
                  </CFormLabel>
                  <p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>
                    When enabled, progress reports (Initial Observations, 1-6 Progress, 7-8 Progress) will be hidden from the report card type selection dropdown. Only formal report cards will be available.
                  </p>
                </div>
                <div className="ms-3">
                  <CFormSwitch
                    id="hideProgressReports"
                    checked={settings.hideProgressReports ?? false}
                    onChange={(e) =>
                      setSettings({ ...settings, hideProgressReports: e.target.checked })
                    }
                    size="lg"
                  />
                </div>
              </div>
              <small className="text-muted d-block mt-2" style={{ fontSize: '0.85rem' }}>
                <CIcon icon={cilSettings} className="me-1" size="sm" />
                This affects which report card types teachers can select when creating new report cards.
              </small>
            </div>

            {/* Report Card Date Setting */}
            <div className="mb-4 p-3 border rounded bg-light">
              <div className="mb-3">
                <CFormLabel className="fw-semibold mb-1" style={{ fontSize: '1.1rem' }}>
                  Default Report Card Date
                </CFormLabel>
                <p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>
                  Set a default date that will be automatically filled in all report cards. Leave empty to use today's date.
                </p>
                <CFormInput
                  type="date"
                  id="reportCardDate"
                  value={settings.reportCardDate || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, reportCardDate: e.target.value })
                  }
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <small className="text-muted d-block mt-2" style={{ fontSize: '0.85rem' }}>
                <CIcon icon={cilSettings} className="me-1" size="sm" />
                This date will be used as the default for all report card date fields.
              </small>
            </div>

            <div className="d-flex justify-content-end mt-4 pt-3 border-top">
              <CButton
                color="primary"
                onClick={handleSave}
                disabled={saving}
                className="d-flex align-items-center px-4"
                size="lg"
              >
                {saving ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CIcon icon={cilSave} className="me-2" />
                    Save Settings
                  </>
                )}
              </CButton>
            </div>
          </CForm>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default ReportCardSmsSettings

