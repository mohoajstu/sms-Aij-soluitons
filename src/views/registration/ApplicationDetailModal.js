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
    onStatusChange(application.id, 'approved')
    onClose()
  }

  const handleDeny = () => {
    onStatus_change(application.id, 'denied')
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
  const mother = application.mother || {}
  const father = application.father || {}
  const files = application.files || {}

  return (
    <CModal visible={true} onClose={onClose} size="xl" backdrop="static">
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

            {/* Mother's Information */}
            <div className="form-section">
              <h3 className="form-section-title">Mother's Information</h3>
              <div className="form-grid md-grid-cols-2">
                <FormField label="First Name" value={mother.firstName} />
                <FormField label="Last Name" value={mother.lastName} />
                <FormField label="Phone" value={mother.phone} />
                <FormField label="Email" value={mother.email} />
                <div className="md-col-span-2">
                  <FormField label="Address" value={mother.address} />
                </div>
              </div>
            </div>

            {/* Father's Information */}
            <div className="form-section">
              <h3 className="form-section-title">Father's Information</h3>
               <div className="form-grid md-grid-cols-2">
                <FormField label="First Name" value={father.firstName} />
                <FormField label="Last Name" value={father.lastName} />
                <FormField label="Phone" value={father.phone} />
                <FormField label="Email" value={father.email} />
                 <div className="md-col-span-2">
                  <FormField label="Address" value={father.address} />
                </div>
              </div>
            </div>
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
            }).map(([key, label]) => (
              <div key={key} className="d-flex align-items-center justify-content-between p-3 border rounded-lg">
                <div>
                  <p className="fw-bold mb-1">{label}</p>
                  <p className="text-medium-emphasis mb-0">
                    {files[key] ? (
                      <a href={files[key]} target="_blank" rel="noopener noreferrer">
                        {files[key].split('/').pop().split('?')[0]}
                      </a>
                    ) : (
                      'Not uploaded'
                    )}
                  </p>
                </div>
                {files[key] && (
                  <div className="d-flex gap-2">
                    <CButton variant="outline" color="secondary" size="sm" onClick={() => window.open(files[key], '_blank')}>
                      <CIcon icon={cilSearch} className="me-1" /> View
                    </CButton>
                    <CButton variant="outline" color="secondary" size="sm" onClick={() => alert('Download starts')}>
                      <CIcon icon={cilCloudDownload} className="me-1" /> Download
                    </CButton>
                  </div>
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
