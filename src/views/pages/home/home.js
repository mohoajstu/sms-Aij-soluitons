import React from 'react'
import { Link } from 'react-router-dom'
import { CButton, CContainer, CRow, CCol, CFooter, CCard, CCardBody } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilUser, cilPeople } from '@coreui/icons'

const Home = () => {
  return (
    <div className="min-vh-100 d-flex flex-column" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header Section */}
      <div className="py-3 text-center text-white">
        <CContainer>
          {/* Logo */}
          <div className="mb-2">
            <img 
              src="/assets/brand/TLA_logo_simple.svg" 
              alt="Tarbiyah Learning Academy" 
              style={{ height: '80px', width: 'auto' }}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          </div>
          
          {/* School Title */}
          <h1 className="h2 fw-bold mb-1">Tarbiyah Learning Academy</h1>
          <h2 className="h5 mb-2 opacity-90">School Management System</h2>
          <p className="mb-3 opacity-80 small">
            Empowering education through innovative technology and comprehensive school management solutions
          </p>
        </CContainer>
      </div>

      {/* Main Content */}
      <CContainer className="flex-grow-1 d-flex align-items-center py-3">
        <CRow className="w-100 justify-content-center">
          <CCol lg={8} xl={7}>
            <CCard className="shadow-lg border-0">
              <CCardBody className="p-4 text-center">
                <h3 className="h5 mb-3 text-dark">Welcome! Please choose your login type</h3>
                <p className="text-muted mb-3 small">
                  Select the appropriate portal to access your personalized dashboard
                </p>
                
                <CRow className="g-3 mb-3">
                  <CCol md={6}>
                    <Link to="/login/parent" className="text-decoration-none">
                      <CCard className="h-100 border-2 border-primary login-card">
                        <CCardBody className="d-flex flex-column align-items-center p-3">
                          <div className="mb-2 p-2 bg-primary bg-opacity-10 rounded-circle">
                            <CIcon icon={cilUser} size="lg" className="text-primary" />
                          </div>
                          <h4 className="h6 text-primary mb-2">Parent Portal</h4>
                          <p className="text-muted text-center mb-2 small">
                            Access your child's progress and communicate with teachers
                          </p>
                          <CButton color="primary" size="sm" className="mt-auto">
                            Parent Login
                          </CButton>
                        </CCardBody>
                      </CCard>
                    </Link>
                  </CCol>
                  
                  <CCol md={6}>
                    <Link to="/login/staff" className="text-decoration-none">
                      <CCard className="h-100 border-2 border-success login-card">
                        <CCardBody className="d-flex flex-column align-items-center p-3">
                          <div className="mb-2 p-2 bg-success bg-opacity-10 rounded-circle">
                            <CIcon icon={cilPeople} size="lg" className="text-success" />
                          </div>
                          <h4 className="h6 text-success mb-2">Staff Portal</h4>
                          <p className="text-muted text-center mb-2 small">
                            Manage classes and access administrative tools
                          </p>
                          <CButton color="success" size="sm" className="mt-auto">
                            Staff Login
                          </CButton>
                        </CCardBody>
                      </CCard>
                    </Link>
                  </CCol>
                </CRow>
                
                <hr className="my-3" />
                
                <div className="text-center">

                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>

      {/* Footer */}
      <CFooter className="py-3 bg-dark text-white">
        <CContainer>
          <CRow className="align-items-center">
            <CCol md={6} className="text-center text-md-start mb-1 mb-md-0">
              <p className="mb-0 small">&copy; 2025 Tarbiyah Learning Academy. All rights reserved.</p>
            </CCol>
            <CCol md={6} className="text-center text-md-end">
              <Link to="/privacy-policy" className="text-white text-decoration-none me-3 small">
                Privacy Policy
              </Link>
              <Link to="/terms-of-service" className="text-white text-decoration-none small">
                Terms of Service
              </Link>
            </CCol>
          </CRow>
        </CContainer>
      </CFooter>
      
      <style jsx>{`
        .login-card {
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .login-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
        }
      `}</style>
    </div>
  )
}

export default Home
