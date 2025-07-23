import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CContainer, CRow, CCol, CCard, CCardBody, CButton, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilHome } from '@coreui/icons'

const PrivacyPolicy = () => {
  const [policy, setPolicy] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/privacy-policy.json')
      .then((res) => res.json())
      .then((data) => {
        setPolicy(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load privacy policy', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <CSpinner color="primary" variant="grow" className="mb-3" />
          <p>Loading Privacy Policy...</p>
        </div>
      </div>
    )
  }

  if (!policy) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <CCard>
          <CCardBody className="text-center p-5">
            <h3 className="text-danger mb-3">Error Loading Privacy Policy</h3>
            <p className="text-muted mb-4">We couldn't load the privacy policy at this time.</p>
            <Link to="/home">
              <CButton color="primary">
                <CIcon icon={cilHome} className="me-2" />
                Return Home
              </CButton>
            </Link>
          </CCardBody>
        </CCard>
      </div>
    )
  }

  return (
    <div className="min-vh-100" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      {/* Header */}
      <div className="bg-primary text-white py-4">
        <CContainer>
          <CRow className="align-items-center">
            <CCol>
              <div className="d-flex align-items-center mb-3">
                <Link to="/home" className="text-white text-decoration-none me-3">
                  <CButton color="light" variant="outline" size="sm">
                    <CIcon icon={cilArrowLeft} className="me-2" />
                    Back to Home
                  </CButton>
                </Link>
              </div>
              <div className="d-flex align-items-center">
                <img 
                  src="/assets/brand/TLA_logo_simple.svg" 
                  alt="Tarbiyah Learning Academy" 
                  style={{ height: '60px', width: 'auto' }}
                  className="me-3"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
                <div>
                  <h1 className="h2 mb-1">Privacy Policy</h1>
                  <p className="mb-0 opacity-90">Tarbiyah Learning Academy</p>
                </div>
              </div>
            </CCol>
          </CRow>
        </CContainer>
      </div>

      {/* Content */}
      <CContainer className="py-5">
        <CRow className="justify-content-center">
          <CCol lg={10} xl={8}>
            <CCard className="shadow-lg border-0">
              <CCardBody className="p-5">
                {/* Header Info */}
                <div className="text-center mb-5 pb-4 border-bottom">
                  <h2 className="text-primary mb-3">Privacy Policy</h2>
                  <div className="d-flex justify-content-center align-items-center flex-wrap gap-4">
                    <div className="text-center">
                      <small className="text-muted d-block">Effective Date</small>
                      <strong className="text-dark">{policy.effectiveDate}</strong>
                    </div>
                    <div className="text-center">
                      <small className="text-muted d-block">Company</small>
                      <strong className="text-dark">{policy.company.name}</strong>
                    </div>
                    <div className="text-center">
                      <small className="text-muted d-block">Contact</small>
                      <a href={`mailto:${policy.company.contactEmail}`} className="text-primary text-decoration-none">
                        {policy.company.contactEmail}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Company Info */}
                <div className="mb-4 p-4 bg-light rounded">
                  <h5 className="text-primary mb-3">Contact Information</h5>
                  <div className="row">
                    <div className="col-md-6">
                      <p className="mb-1"><strong>Company:</strong> {policy.company.name}</p>
                      <p className="mb-1"><strong>Address:</strong> {policy.company.address}</p>
                    </div>
                    <div className="col-md-6">
                      <p className="mb-1"><strong>Email:</strong> 
                        <a href={`mailto:${policy.company.contactEmail}`} className="ms-2 text-primary">
                          {policy.company.contactEmail}
                        </a>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Definitions */}
                {policy.definitions && (
                  <div className="mb-5">
                    <h4 className="text-primary mb-3">Key Definitions</h4>
                    <div className="row g-3">
                      {Object.entries(policy.definitions).map(([key, value]) => (
                        <div key={key} className="col-md-6">
                          <div className="p-3 border rounded">
                            <h6 className="text-capitalize fw-bold mb-2">{key.replace(/([A-Z])/g, ' $1').trim()}</h6>
                            <p className="mb-0 text-muted small">{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Policy Sections */}
                <div className="mb-5">
                  {policy.sections.map((section, sIdx) => (
                    <div key={sIdx} className="mb-4">
                      <h4 className="text-primary mb-3 border-bottom pb-2">{section.title}</h4>
                      {section.text && (
                        <p className="mb-3 text-justify">{section.text}</p>
                      )}
                      {section.items && (
                        <ul className="list-unstyled">
                          {section.items.map((item, iIdx) => (
                            <li key={iIdx} className="mb-2 d-flex">
                              <i className="text-primary me-2 mt-1">•</i>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                {/* Grievance Officer */}
                {policy.grievanceOfficer && (
                  <div className="p-4 bg-primary bg-opacity-10 rounded">
                    <h5 className="text-primary mb-3">Grievance Officer</h5>
                    <div className="row">
                      <div className="col-md-4">
                        <p className="mb-1"><strong>Name:</strong> {policy.grievanceOfficer.name}</p>
                      </div>
                      <div className="col-md-4">
                        <p className="mb-1"><strong>Email:</strong> 
                          <a href={`mailto:${policy.grievanceOfficer.email}`} className="ms-2 text-primary">
                            {policy.grievanceOfficer.email}
                          </a>
                        </p>
                      </div>
                      <div className="col-md-4">
                        <p className="mb-1"><strong>Phone:</strong> 
                          <a href={`tel:${policy.grievanceOfficer.phone}`} className="ms-2 text-primary">
                            {policy.grievanceOfficer.phone}
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="text-center mt-5 pt-4 border-top">
                  <div className="d-flex justify-content-center gap-3 flex-wrap">
                    <Link to="/home">
                      <CButton color="primary">
                        <CIcon icon={cilHome} className="me-2" />
                        Back to Home
                      </CButton>
                    </Link>
                    <Link to="/terms-of-service">
                      <CButton color="secondary" variant="outline">
                        View Terms of Service
                      </CButton>
                    </Link>
                  </div>
                  <p className="text-muted mt-3 mb-0 small">
                    Last updated: {policy.effectiveDate}
                  </p>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default PrivacyPolicy 