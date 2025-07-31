import React, { useState } from 'react'
import {
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CAlert,
  CSpinner,
  CFormSelect,
} from '@coreui/react'
import emailjs from 'emailjs-com'

// EmailJS configuration
const EMAILJS_SERVICE_ID = 'service_rpg9tsq'
const EMAILJS_TEMPLATE_ID = 'template_t06rk76'
const EMAILJS_USER_ID = '2c0CoID2ucNYaKVFe'

const SendAcceptanceEmailModal = ({
  visible,
  onClose,
  applications,
  onEmailsSent,
}) => {
  const [step, setStep] = useState(1)
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const schoolYears = [...new Set(applications.map((app) => app.schoolYear).filter(Boolean))]

  const handleYearSelection = (year) => {
    setSelectedSchoolYear(year)
    setStep(2)
  }

  const handleSendEmails = async () => {
    setShowConfirmation(false)
    setIsSending(true)
    setSentCount(0)
    setErrorCount(0)

    const filteredApplications = acceptedApplications.filter(
      (app) => app.schoolYear === selectedSchoolYear,
    )
    const validApplications = filteredApplications.filter(
      (app) => app.primaryGuardian && app.primaryGuardian.email,
    )

    const emailPromises = validApplications.map((app) => {
      // Get the student's full name
      const studentName = app.student 
        ? `${app.student.firstName || ''} ${app.student.lastName || ''}`
        : app.studentName || 'your child'

      const templateParams = {
        to_email: app.primaryGuardian.email,
        to_name: `${app.primaryGuardian.firstName || ''} ${app.primaryGuardian.lastName || ''}`.trim(),
        student_name: studentName,
        registration_code: app.registrationCode,
        onboarding_link: `${window.location.origin}/onboarding`,
        school_year: selectedSchoolYear,
      }

      return emailjs
        .send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          templateParams,
          EMAILJS_USER_ID,
        )
        .then(() => {
          console.log(`Email sent successfully to ${templateParams.to_email}`)
          setSentCount((prev) => prev + 1)
        })
        .catch((error) => {
          console.error(`Failed to send email to ${templateParams.to_email}:`, error)
          setErrorCount((prev) => prev + 1)
        })
    })

    await Promise.all(emailPromises)
    setIsSending(false)
    onEmailsSent()
  }

  const acceptedApplications = applications.filter(
    (app) => app.status === 'approved' && app.registrationCode,
  )

  const renderStepOne = () => (
    <>
      <CModalHeader>
        <CModalTitle>Step 1: Select School Year</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CAlert color="info">Please select the school year for which you want to send acceptance emails.</CAlert>
        <CFormSelect
          value={selectedSchoolYear}
          onChange={(e) => handleYearSelection(e.target.value)}
        >
          <option value="">Choose a school year</option>
          {schoolYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </CFormSelect>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Cancel
        </CButton>
      </CModalFooter>
    </>
  )

  const renderStepTwo = () => {
    const filteredApplications = acceptedApplications.filter(
      (app) => app.schoolYear === selectedSchoolYear,
    )
    const validApplications = filteredApplications.filter(
      (app) => app.primaryGuardian && app.primaryGuardian.email,
    )
    const invalidApplications = filteredApplications.filter(
      (app) => !app.primaryGuardian || !app.primaryGuardian.email,
    )

    return (
      <>
        <CModalHeader>
          <CModalTitle>Step 2: Review and Send Emails for {selectedSchoolYear}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {isSending ? (
            <div className="text-center">
              <CSpinner />
              <p className="mt-2">
                Sending emails... ({sentCount} of {validApplications.length} sent)
              </p>
              {errorCount > 0 && <p className="text-danger">{errorCount} failed.</p>}
            </div>
          ) : (
            <>
              <CAlert color="info">
                The following {validApplications.length} accepted students will receive an
                acceptance email.
              </CAlert>
              {invalidApplications.length > 0 && (
                <CAlert color="warning">
                  <strong>{invalidApplications.length} application(s)</strong> are missing guardian
                  email addresses and will be skipped.
                </CAlert>
              )}
              <CTable>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Student Name</CTableHeaderCell>
                    <CTableHeaderCell>Guardian Name</CTableHeaderCell>
                    <CTableHeaderCell>Guardian Email</CTableHeaderCell>
                    <CTableHeaderCell>Registration Code</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {filteredApplications.map((app) => (
                    <CTableRow key={app.id}>
                      <CTableDataCell>{app.studentName || 'N/A'}</CTableDataCell>
                      <CTableDataCell>
                        {app.primaryGuardian
                          ? `${app.primaryGuardian.firstName || ''} ${
                              app.primaryGuardian.lastName || ''
                            }`.trim()
                          : 'N/A'}
                      </CTableDataCell>
                      <CTableDataCell>{app.primaryGuardian?.email || 'Missing Email'}</CTableDataCell>
                      <CTableDataCell>
                        <strong>{app.registrationCode}</strong>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </>
          )}
          {showConfirmation && (
            <CAlert color="warning" className="mt-3">
              <strong>
                Are you sure you want to send {validApplications.length} emails?
              </strong>{' '}
              This action cannot be undone.
            </CAlert>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setStep(1)}>
            Back
          </CButton>
          {!showConfirmation && (
            <CButton
              color="primary"
              onClick={() => setShowConfirmation(true)}
              disabled={validApplications.length === 0}
            >
              Send All Emails
            </CButton>
          )}
          {showConfirmation && (
            <CButton color="success" onClick={handleSendEmails} disabled={isSending}>
              {isSending ? 'Sending...' : `Confirm & Send ${validApplications.length} Emails`}
            </CButton>
          )}
        </CModalFooter>
      </>
    )
  }

  return (
    <CModal visible={visible} onClose={onClose} size="lg">
      {step === 1 ? renderStepOne() : renderStepTwo()}
    </CModal>
  )
}

export default SendAcceptanceEmailModal 