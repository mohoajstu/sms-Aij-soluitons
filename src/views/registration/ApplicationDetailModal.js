import React, { useState } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilX,
  cilCloudDownload,
  cilSearch,
  cilCheck,
  cilXCircle,
  cilFindInPage,
} from '@coreui/icons'
import './registrationPage.css' // Import the shared CSS

// A helper component to display form data in a consistent, read-only format
const FormField = ({ label, value }) => (
  <div>
    <label className="form-label">{label}</label>
    <div className="form-input-read-only">{value || 'N/A'}</div>
  </div>
)

const ApplicationDetailModal = ({ application, onClose, onStatusChange }) => {
  const [notes, setNotes] = useState('')

  const handleApprove = () => {
    onStatusChange(application, 'approved')
    onClose()
  }

  const handleDeny = () => {
    onStatusChange(application, 'denied')
    onClose()
  }

  const getStatusBadgeColor = (status) => {
    const variants = {
      pending: 'warning',
      approved: 'success',
      denied: 'danger',
    }
    return variants[status] || 'secondary'
  }

  // Safely access nested properties
  const student = application.student || {}
  const contact = application.contact || {}
  const primaryGuardian = application.primaryGuardian || {}
  const secondaryGuardian = application.secondaryGuardian || {}
  const files = application.files || {}

  return (
    <CModal visible={true} onClose={onClose} size="xl" backdrop={true}>
      <div className="form-card-header d-flex justify-content-between align-items-center">
        <CModalTitle className="form-card-title m-0">
          Application Details ({application.id})
        </CModalTitle>
        <div className="d-flex align-items-center">
          <CBadge color={getStatusBadgeColor(application.status)} shape="rounded-pill" className="px-3 py-1 me-3">
            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
          </CBadge>
          <button className="btn-close btn-close-white" onClick={onClose}></button>
        </div>
      </div>
      <CModalBody className="registration-form-container p-4">
        {/* Application Information */}
        <div className="form-card">
          <div className="form-card-header">
            <h2 className="form-card-title">Application Information</h2>
          </div>
          <div className="form-card-content form-grid md-grid-cols-2">
            <FormField label="School Year" value={application.schoolYear} />
            <FormField label="Grade Applying For" value={application.grade} />
          </div>
        </div>

        {/* Student Information */}
        <div className="form-card">
          <div className="form-card-header">
            <h2 className="form-card-title">Student Information</h2>
          </div>
          <div className="form-card-content form-grid md-grid-cols-2">
            <FormField label="First Name" value={student.firstName || application.studentName?.split(' ')[0]} />
            <FormField label="Last Name" value={student.lastName || application.studentName?.split(' ')[1]} />
            <FormField label="Gender" value={student.gender} />
            <FormField label="Date of Birth" value={student.dateOfBirth} />
            <FormField label="OEN" value={student.oen} />
            <FormField label="Previous School" value={student.previousSchool} />
            <div className="md-col-span-2">
              <FormField label="Allergies/Medical Conditions" value={student.allergies} />
            </div>
            <FormField label="Photo Permission" value={student.photoPermission} />
          </div>
        </div>

        {/* Parent & Contact Information */}
        <div className="form-card">
          <div className="form-card-header">
            <h2 className="form-card-title">Parent & Contact Information</h2>
          </div>
          <div className="form-card-content">
            {/* Contact Details */}
            <div className="form-section">
              <h3 className="form-section-title">Contact Details</h3>
              <div className="form-grid md-grid-cols-2">
                <FormField label="Primary Phone" value={contact.primaryPhone} />
                <FormField label="Emergency Phone" value={contact.emergencyPhone} />
                <FormField label="Primary Email" value={contact.primaryEmail || application.parentEmail} />
                <div className="md-col-span-2">
                 <FormField label="Address" value={contact.studentAddress} />
                </div>
              </div>
            </div>

            {/* Primary Guardian Information */}
            <div className="form-section">
              <h3 className="form-section-title">Primary Guardian Information</h3>
              <div className="form-grid md-grid-cols-2">
                <FormField label="First Name" value={primaryGuardian.firstName} />
                <FormField label="Last Name" value={primaryGuardian.lastName} />
                <FormField label="Phone" value={primaryGuardian.phone} />
                <FormField label="Email" value={primaryGuardian.email} />
                <div className="md-col-span-2">
                  <FormField label="Address" value={primaryGuardian.address} />
                </div>
              </div>
            </div>

            {/* Secondary Guardian Information (Conditional) */}
            {secondaryGuardian && secondaryGuardian.firstName && (
              <div className="form-section">
                <h3 className="form-section-title">Secondary Guardian Information</h3>
                <div className="form-grid md-grid-cols-2">
                  <FormField label="First Name" value={secondaryGuardian.firstName} />
                  <FormField label="Last Name" value={secondaryGuardian.lastName} />
                  <FormField label="Phone" value={secondaryGuardian.phone} />
                  <FormField label="Email" value={secondaryGuardian.email} />
                  <div className="md-col-span-2">
                    <FormField label="Address" value={secondaryGuardian.address} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Uploaded Files */}
        <div className="form-card">
          <div className="form-card-header">
            <h2 className="form-card-title">Uploaded Files</h2>
          </div>
          <div className="form-card-content">
            {Object.entries({
              immunization: 'Immunization Records',
              reportCard: 'Report Card',
              osrPermission: 'OSR Permission',
              governmentId: 'Government ID',
            }).map(([category, label]) => (
              <div key={category} className="mb-3">
                <p className="fw-bold mb-2">{label}</p>
                {files[category] && files[category].length > 0 ? (
                  <ul className="list-group">
                    {files[category].map((file, index) => (
                      <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                          {file.name}
                        </a>
                        <div>
                          <CButton variant="outline" color="secondary" size="sm" onClick={() => window.open(file.url, '_blank')}>
                            <CIcon icon={cilFindInPage} className="me-1" /> View
                          </CButton>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-medium-emphasis mb-0">No files uploaded for this category.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </CModalBody>
      
      {application.status === 'pending' && (
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={onClose}>
            Cancel
          </CButton>
          <CButton color="danger" variant="outline" onClick={handleDeny}>
            <CIcon icon={cilXCircle} className="me-2" />
            Deny Application
          </CButton>
          <CButton color="success" onClick={handleApprove}>
            <CIcon icon={cilCheck} className="me-2" />
            Approve Application
          </CButton>
        </CModalFooter>
      )}
    </CModal>
  )
}

export default ApplicationDetailModal