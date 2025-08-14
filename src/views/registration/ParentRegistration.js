import React, { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CAlert,
  CBadge,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilUser,
  cilCalendar,
  cilInfo,
  cilWarning,
  cilCheckCircle,
  cilClock,
} from '@coreui/icons'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { firestore } from '../../Firebase/firebase'
import useAuth from '../../Firebase/useAuth'

const ParentRegistration = () => {
  const { selectedChild } = useOutletContext()
  const { canAccessStudent } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [registrations, setRegistrations] = useState([])

  useEffect(() => {
    const loadRegistrations = async () => {
      if (!selectedChild) {
        setLoading(false)
        return
      }

      // Check if user has access to this child
      if (!canAccessStudent(selectedChild.id)) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        // Query registrations for the selected child from the per-student subcollection
        const registrationsQuery = query(
          collection(firestore, `students/${selectedChild.id}/registrations`),
          orderBy('submittedAt', 'desc')
        )
        
        const registrationsSnapshot = await getDocs(registrationsQuery)
        const regs = registrationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          submittedAt: doc.data().submittedAt?.toDate?.() || new Date(),
        }))
        
        setRegistrations(regs)
        
      } catch (error) {
        console.error('Error loading registrations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRegistrations()
  }, [selectedChild, canAccessStudent])

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'enrolled':
        return <CBadge color="success">Approved</CBadge>
      case 'pending':
      case 'submitted':
        return <CBadge color="warning">Pending Review</CBadge>
      case 'rejected':
      case 'declined':
        return <CBadge color="danger">Declined</CBadge>
      case 'incomplete':
        return <CBadge color="secondary">Incomplete</CBadge>
      default:
        return <CBadge color="secondary">{status || 'Unknown'}</CBadge>
    }
  }

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'enrolled':
        return <CIcon icon={cilCheckCircle} className="text-success" />
      case 'pending':
      case 'submitted':
        return <CIcon icon={cilClock} className="text-warning" />
      case 'rejected':
      case 'declined':
        return <CIcon icon={cilWarning} className="text-danger" />
      default:
        return <CIcon icon={cilInfo} className="text-secondary" />
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <CSpinner color="primary" />
      </div>
    )
  }

  if (!selectedChild) {
    return (
      <CAlert color="info">
        <CIcon icon={cilInfo} className="me-2" />
        Please select a child to view their registration status.
      </CAlert>
    )
  }

  if (!canAccessStudent(selectedChild.id)) {
    return (
      <CAlert color="danger">
        <CIcon icon={cilWarning} className="me-2" />
        You don't have permission to view registration information for this child.
      </CAlert>
    )
  }

  const currentRegistration = registrations[0] // Most recent registration

  return (
    <div>
      {/* Header */}
      <CCard className="mb-4">
        <CCardBody>
          <h2>Registration Status</h2>
          <p className="text-muted mb-0">
            View registration information for {selectedChild.name} ({selectedChild.grade})
          </p>
        </CCardBody>
      </CCard>

      {/* Current Registration Status */}
      {currentRegistration ? (
        <CRow className="mb-4">
          <CCol md={6}>
            <CCard>
              <CCardHeader>
                <div className="d-flex align-items-center">
                  <CIcon icon={cilUser} className="me-2" />
                  <strong>Current Status</strong>
                </div>
              </CCardHeader>
              <CCardBody>
                <div className="d-flex align-items-center mb-3">
                  {getStatusIcon(currentRegistration.status)}
                  <span className="ms-2">{getStatusBadge(currentRegistration.status)}</span>
                </div>
                <div className="mb-2">
                  <strong>Academic Year:</strong> {currentRegistration.academicYear || 'N/A'}
                </div>
                <div className="mb-2">
                  <strong>Grade Level:</strong> {currentRegistration.gradeLevel || selectedChild.grade}
                </div>
                <div>
                  <strong>Submitted:</strong>{' '}
                  {currentRegistration.submittedAt.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </CCardBody>
            </CCard>
          </CCol>
          
          <CCol md={6}>
            <CCard>
              <CCardHeader>
                <div className="d-flex align-items-center">
                  <CIcon icon={cilInfo} className="me-2" />
                  <strong>Important Information</strong>
                </div>
              </CCardHeader>
              <CCardBody>
                {currentRegistration.status?.toLowerCase() === 'approved' && (
                  <CAlert color="success" className="mb-0">
                    <strong>Enrollment Confirmed!</strong><br />
                    Your child is successfully enrolled for the current academic year.
                  </CAlert>
                )}
                
                {currentRegistration.status?.toLowerCase() === 'pending' && (
                  <CAlert color="warning" className="mb-0">
                    <strong>Application Under Review</strong><br />
                    We are reviewing your registration. You will be notified of any updates.
                  </CAlert>
                )}
                
                {currentRegistration.status?.toLowerCase() === 'incomplete' && (
                  <CAlert color="info" className="mb-0">
                    <strong>Additional Information Required</strong><br />
                    Please contact the school office to complete your registration.
                  </CAlert>
                )}
                
                {!['approved', 'pending', 'incomplete'].includes(currentRegistration.status?.toLowerCase()) && (
                  <CAlert color="secondary" className="mb-0">
                    <strong>Status Update</strong><br />
                    For questions about your registration, please contact the school office.
                  </CAlert>
                )}
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      ) : null}

      {/* Registration History */}
      <CCard>
        <CCardHeader>
          <div className="d-flex align-items-center">
            <CIcon icon={cilCalendar} className="me-2" />
            <strong>Registration History</strong>
          </div>
        </CCardHeader>
        <CCardBody>
          {registrations.length > 0 ? (
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Academic Year</CTableHeaderCell>
                  <CTableHeaderCell>Grade Level</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Submitted Date</CTableHeaderCell>
                  <CTableHeaderCell>Notes</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {registrations.map((registration) => (
                  <CTableRow key={registration.id}>
                    <CTableDataCell>
                      <strong>{registration.academicYear || 'N/A'}</strong>
                    </CTableDataCell>
                    <CTableDataCell>
                      {registration.gradeLevel || selectedChild.grade}
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex align-items-center">
                        {getStatusIcon(registration.status)}
                        <span className="ms-2">{getStatusBadge(registration.status)}</span>
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>
                      {registration.submittedAt.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </CTableDataCell>
                    <CTableDataCell>
                      <span className="text-muted">
                        {registration.notes || 'No additional notes'}
                      </span>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          ) : (
            <div className="text-center py-5">
              <CIcon icon={cilUser} size="3xl" className="text-muted mb-3" />
              <h5 className="text-muted">No Registration Records</h5>
              <p className="text-muted">
                No registration records found for this student. Contact the school office if you believe this is an error.
              </p>
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* Contact Information */}
      <CCard className="mt-4">
        <CCardHeader>
          <div className="d-flex align-items-center">
            <CIcon icon={cilInfo} className="me-2" />
            <strong>Need Help?</strong>
          </div>
        </CCardHeader>
        <CCardBody>
          <p className="mb-2">
            <strong>For registration questions or updates, please contact:</strong>
          </p>
          <p className="mb-1">
            <strong>School Office:</strong> (555) 123-4567
          </p>
          <p className="mb-1">
            <strong>Email:</strong> registrar@tarbiyahlearning.com
          </p>
          <p className="mb-0">
            <strong>Office Hours:</strong> Monday - Friday, 8:00 AM - 4:00 PM
          </p>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default ParentRegistration 