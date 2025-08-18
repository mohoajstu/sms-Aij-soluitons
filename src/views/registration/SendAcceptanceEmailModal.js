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
import { collection, query, where, getDocs } from 'firebase/firestore'
import { firestore } from 'src/firebase'
import emailjs from 'emailjs-com'

// EmailJS configuration - Updated with correct credentials
const EMAILJS_SERVICE_ID = 'service_t6357f8'
const EMAILJS_TEMPLATE_ID = 'template_0gyltry'
const EMAILJS_PUBLIC_KEY = 'P7ScvinMmyJBD5d6T'

// Initialize EmailJS with the public key
emailjs.init(EMAILJS_PUBLIC_KEY)

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

    const emailPromises = validApplications.map(async (app) => {
      // Find the corresponding parent document to get the tlaID
      const parentsRef = collection(firestore, 'parents')
      const q = query(parentsRef, where('contact.email', '==', app.primaryGuardian.email))
      const querySnapshot = await getDocs(q)
      let parentId = null
      if (!querySnapshot.empty) {
        parentId = querySnapshot.docs[0].id
      } else {
        console.error(
          `Could not find parent document for email: ${app.primaryGuardian.email}. Skipping email.`,
        )
        setErrorCount((prev) => prev + 1)
        return // Skip this application
      }

      // Get the student's full name
      const studentName = app.student
        ? `${app.student.firstName || ''} ${app.student.lastName || ''}`
        : app.studentName || 'your child'

      // Get the guardian's full name
      const guardianName = app.primaryGuardian
        ? `${app.primaryGuardian.firstName || ''} ${app.primaryGuardian.lastName || ''}`.trim()
        : 'Parent'

      // Generate a simple password (you might want to make this more secure)
      const generatedPassword = `TLA${Math.random().toString(36).substring(2, 8).toUpperCase()}`

      // Construct the onboarding link
      const onboardingLink = `https://tlasms.com/#/onboarding`

      // Create the template parameters for the acceptance email
      // Using the exact variable names from your template
      const templateParams = {
        to_email: app.primaryGuardian.email,
        to_name: guardianName,
        name: guardianName,
        student_name: studentName,
        tarbiyah_id: parentId,
        onboarding_code: querySnapshot.docs[0].data().onboardingCode,
        onboarding_link: onboardingLink,
        school_year: selectedSchoolYear,
      }

      console.log('Sending email with these parameters:', templateParams)

      return emailjs
        .send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          templateParams,
          EMAILJS_PUBLIC_KEY,
        )
        .then(() => {
          console.log(`Acceptance email sent successfully to ${templateParams.to_email}`)
          setSentCount((prev) => prev + 1)
          
          // Update the application with the generated password
          // You might want to store this in your database
          console.log(`Generated password for ${studentName}: ${generatedPassword}`)
        })
        .catch((error) => {
          console.error(`Failed to send acceptance email to ${templateParams.to_email}:`, error)
          console.error('Template params that failed:', templateParams)
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
          <CModalTitle>Step 2: Review and Send Acceptance Emails for {selectedSchoolYear}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {isSending ? (
            <div className="text-center">
              <CSpinner />
              <p className="mt-2">
                Sending acceptance emails... ({sentCount} of {validApplications.length} sent)
              </p>
              {errorCount > 0 && <p className="text-danger">{errorCount} failed.</p>}
            </div>
          ) : (
            <>
              <CAlert color="success">
                <strong>Acceptance Email Details:</strong><br />
                • Parents will receive their Tarbiyah ID and generated password<br />
                • Login link will be provided to access the parent portal<br />
                • Student registration code will be included<br />
                • Email template: "Congratulations on joining Tarbiyah Learning Academy"
              </CAlert>
              <CAlert color="info">
                The following {validApplications.length} accepted students will receive an
                acceptance email with login credentials.
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
                    <CTableHeaderCell>Will Receive</CTableHeaderCell>
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
                      <CTableDataCell>
                        {app.primaryGuardian?.email ? (
                          <span className="text-success">✓ Acceptance Email</span>
                        ) : (
                          <span className="text-danger">✗ No Email</span>
                        )}
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
                Are you sure you want to send {validApplications.length} acceptance emails?
              </strong><br />
              This will send login credentials to parents and cannot be undone.
            </CAlert>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setStep(1)}>
            Back
          </CButton>
          {!showConfirmation && (
            <CButton
              color="success"
              onClick={() => setShowConfirmation(true)}
              disabled={validApplications.length === 0}
            >
              Send Acceptance Emails
            </CButton>
          )}
          {showConfirmation && (
            <CButton color="success" onClick={handleSendEmails} disabled={isSending}>
              {isSending ? 'Sending...' : `Confirm & Send ${validApplications.length} Acceptance Emails`}
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