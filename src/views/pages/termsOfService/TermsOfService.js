import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CContainer, CRow, CCol, CCard, CCardBody, CButton, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilHome } from '@coreui/icons'

const TermsOfService = () => {
  const [terms, setTerms] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/terms-of-service.json')
      .then((res) => res.json())
      .then((data) => {
        setTerms(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load terms of service', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <CSpinner color="primary" variant="grow" className="mb-3" />
          <p>Loading Terms of Service...</p>
        </div>
      </div>
    )
  }

  if (!terms) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <CCard>
          <CCardBody className="text-center p-5">
            <h3 className="text-danger mb-3">Error Loading Terms of Service</h3>
            <p className="text-muted mb-4">We couldn't load the terms of service at this time.</p>
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
      <div className="bg-success text-white py-4">
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
                  <h1 className="h2 mb-1">Terms of Service</h1>
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
                  <h2 className="text-success mb-3">Terms of Service</h2>
                  <div className="d-flex justify-content-center align-items-center flex-wrap gap-4">
                    <div className="text-center">
                      <small className="text-muted d-block">Effective Date</small>
                      <strong className="text-dark">{terms.effectiveDate}</strong>
                    </div>
                    <div className="text-center">
                      <small className="text-muted d-block">Company</small>
                      <strong className="text-dark">{terms.company.name}</strong>
                    </div>
                    <div className="text-center">
                      <small className="text-muted d-block">Contact</small>
                      <a href={`mailto:${terms.company.contactEmail}`} className="text-success text-decoration-none">
                        {terms.company.contactEmail}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Company Info */}
                <div className="mb-4 p-4 bg-light rounded">
                  <h5 className="text-success mb-3">Contact Information</h5>
                  <div className="row">
                    <div className="col-md-6">
                      <p className="mb-1"><strong>Company:</strong> {terms.company.name}</p>
                    </div>
                    <div className="col-md-6">
                      <p className="mb-1"><strong>Email:</strong> 
                        <a href={`mailto:${terms.company.contactEmail}`} className="ms-2 text-success">
                          {terms.company.contactEmail}
                        </a>
                      </p>
                    </div>
                  </div>
                </div>


                {/* Terms Sections */}
                <div className="mb-5">
                  {terms.sections.map((section, sIdx) => (
                    <div key={sIdx} className="mb-4">
                      <h4 className="text-success mb-3 border-bottom pb-2">{section.title}</h4>
                      {section.text && (
                        <p className="mb-3 text-justify">{section.text}</p>
                      )}
                      {section.items && (
                        <ul className="list-unstyled">
                          {section.items.map((item, iIdx) => (
                            <li key={iIdx} className="mb-2 d-flex">
                              <i className="text-success me-2 mt-1">•</i>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer Actions */}
                <div className="text-center mt-5 pt-4 border-top">
                  <div className="d-flex justify-content-center gap-3 flex-wrap">
                    <Link to="/home">
                      <CButton color="success">
                        <CIcon icon={cilHome} className="me-2" />
                        Back to Home
                      </CButton>
                    </Link>
                    <Link to="/privacy-policy">
                      <CButton color="secondary" variant="outline">
                        View Privacy Policy
                      </CButton>
                    </Link>
                  </div>
                  <p className="text-muted mt-3 mb-0 small">
                    Last updated: {terms.effectiveDate}
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

export default TermsOfService 