import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CForm,
  CFormLabel,
  CButton,
  CSpinner,
  CAlert,
  CFormInput,
  CFormCheck,
} from '@coreui/react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { firestore } from '../../Firebase/firebase'
import useAuth from '../../Firebase/useAuth'
import { toast } from 'react-hot-toast'
import CIcon from '@coreui/icons-react'
import { cilSave, cilSettings } from '@coreui/icons'

/**
 * Registration Settings Component
 * Admin settings for Registration functionality
 */
const RegistrationSettings = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    eligibilityCutoffDate: '2022-12-31', // Default: Must be 4 years old by DEC 31st 2022
    schoolYear: '2026', // Default school year
    availableGrades: [
      'Jr Kindergarten',
      'Sr Kindergarten',
      'Grade 1',
      'Grade 2',
      'Grade 3',
      'Grade 4',
      'Grade 5',
      'Grade 6',
      'Grade 7',
      'Grade 8',
    ],
  })
  const [alert, setAlert] = useState({ show: false, message: '', color: 'success' })

  // All possible grade levels
  const allGrades = [
    'Jr Kindergarten',
    'Sr Kindergarten',
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
    'Grade 6',
    'Grade 7',
    'Grade 8',
  ]

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const settingsDoc = await getDoc(doc(firestore, 'systemSettings', 'registration'))
      
      if (settingsDoc.exists()) {
        const loadedSettings = settingsDoc.data()
        setSettings({
          eligibilityCutoffDate: loadedSettings.eligibilityCutoffDate || '2022-12-31',
          schoolYear: loadedSettings.schoolYear || '2026',
          availableGrades: loadedSettings.availableGrades || allGrades,
        })
      } else {
        // Create default settings if they don't exist
        await setDoc(doc(firestore, 'systemSettings', 'registration'), settings)
      }
    } catch (error) {
      console.error('Error loading registration settings:', error)
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
        doc(firestore, 'systemSettings', 'registration'),
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
      toast.success('Registration settings saved')
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

  const handleGradeToggle = (grade) => {
    setSettings((prev) => {
      const currentGrades = prev.availableGrades || []
      if (currentGrades.includes(grade)) {
        return {
          ...prev,
          availableGrades: currentGrades.filter((g) => g !== grade),
        }
      } else {
        return {
          ...prev,
          availableGrades: [...currentGrades, grade],
        }
      }
    })
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
    <div className="registration-settings">
      <CCard className="shadow-sm">
        <CCardHeader className="bg-primary text-white">
          <div className="d-flex align-items-center">
            <CIcon icon={cilSettings} className="me-2" size="lg" />
            <h4 className="mb-0">Registration Settings</h4>
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
            {/* Eligibility Cutoff Date */}
            <div className="mb-4 p-3 border rounded bg-light">
              <div className="mb-3">
                <CFormLabel className="fw-semibold mb-1" style={{ fontSize: '1.1rem' }}>
                  Eligibility Cutoff Date
                </CFormLabel>
                <p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>
                  Students must be 4 years old by this date to be eligible for registration. 
                  This date will be used to validate date of birth on the registration form.
                </p>
                <CFormInput
                  type="date"
                  id="eligibilityCutoffDate"
                  value={settings.eligibilityCutoffDate || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, eligibilityCutoffDate: e.target.value })
                  }
                  placeholder="YYYY-MM-DD"
                />
                <small className="text-muted d-block mt-2" style={{ fontSize: '0.85rem' }}>
                  <CIcon icon={cilSettings} className="me-1" size="sm" />
                  Example: 2022-12-31 means "Must be 4 years old by December 31st, 2022"
                </small>
              </div>
            </div>

            {/* School Year */}
            <div className="mb-4 p-3 border rounded bg-light">
              <div className="mb-3">
                <CFormLabel className="fw-semibold mb-1" style={{ fontSize: '1.1rem' }}>
                  School Year
                </CFormLabel>
                <p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>
                  The school year for which students are applying (e.g., "2026").
                </p>
                <CFormInput
                  type="text"
                  id="schoolYear"
                  value={settings.schoolYear || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, schoolYear: e.target.value })
                  }
                  placeholder="2026"
                />
                <small className="text-muted d-block mt-2" style={{ fontSize: '0.85rem' }}>
                  <CIcon icon={cilSettings} className="me-1" size="sm" />
                  This will be displayed on the registration form and in confirmation messages.
                </small>
              </div>
            </div>

            {/* Available Grade Levels */}
            <div className="mb-4 p-3 border rounded bg-light">
              <div className="mb-3">
                <CFormLabel className="fw-semibold mb-1" style={{ fontSize: '1.1rem' }}>
                  Available Grade Levels
                </CFormLabel>
                <p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>
                  Select which grade levels are available for registration. Only selected grades will appear in the registration form dropdown.
                </p>
                <div className="row mt-3">
                  {allGrades.map((grade) => (
                    <div key={grade} className="col-md-6 col-lg-4 mb-2">
                      <CFormCheck
                        id={`grade-${grade}`}
                        label={grade}
                        checked={settings.availableGrades?.includes(grade) || false}
                        onChange={() => handleGradeToggle(grade)}
                      />
                    </div>
                  ))}
                </div>
                <small className="text-muted d-block mt-2" style={{ fontSize: '0.85rem' }}>
                  <CIcon icon={cilSettings} className="me-1" size="sm" />
                  Unselected grades will not appear in the registration form.
                </small>
              </div>
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

export default RegistrationSettings


