import React from 'react'
import { Link } from 'react-router-dom'
import { CButton, CContainer, CRow, CCol, CFooter, CCard, CCardBody, CCardHeader } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { 
  cilUser, 
  cilPeople, 
  cilSchool, 
  cilCalendar, 
  cilChartLine, 
  cilEnvelopeClosed,
  cilShieldAlt,
  cilLockLocked,
  cilInfo,
  cilStar
} from '@coreui/icons'

const Home = () => {
  return (
    <div className="min-vh-100 d-flex flex-column" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header Section */}
      <div className="py-4 text-center text-white">
        <CContainer>
          {/* Logo */}
          <div className="mb-3">
            <img 
              src="/assets/brand/TLA_logo_simple.svg" 
              alt="Tarbiyah Learning Academy" 
              style={{ height: '100px', width: 'auto' }}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          </div>
          
          {/* School Title */}
          <h1 className="h1 fw-bold mb-2">Tarbiyah Learning Academy</h1>
          <h2 className="h4 mb-3 opacity-90">School Management System (SMS)</h2>
          <p className="mb-4 opacity-80 lead">
            Comprehensive educational technology platform empowering schools with modern management solutions
          </p>
        </CContainer>
      </div>

      {/* Main Content */}
      <CContainer className="flex-grow-1 py-4">
        <CRow className="justify-content-center">
          <CCol lg={10} xl={9}>
            
            {/* Login Portal Section - Moved to Top */}
            <CCard className="shadow-lg border-0 mb-4">
              <CCardHeader className="bg-success text-white">
                <h3 className="h4 mb-0">
                  <CIcon icon={cilStar} className="me-2" />
                  Access Your Portal
                </h3>
              </CCardHeader>
              <CCardBody className="p-4">
                <div className="text-center mb-4">
                  <h5 className="text-dark mb-3">Choose Your Login Portal</h5>
                  <p className="text-muted">
                    Select the appropriate portal to access your personalized dashboard and educational tools
                  </p>
                </div>
                
                <CRow className="g-4">
                  <CCol md={6}>
                    <Link to="/login/parent" className="text-decoration-none">
                      <CCard className="h-100 border-2 border-primary login-card">
                        <CCardBody className="d-flex flex-column align-items-center p-4">
                          <div className="mb-3 p-3 bg-primary bg-opacity-10 rounded-circle">
                            <CIcon icon={cilUser} size="xl" className="text-primary" />
                          </div>
                          <h4 className="h5 text-primary mb-3">Parent Portal</h4>
                          <p className="text-muted text-center mb-3">
                            Access your child's academic progress, communicate with teachers, 
                            view attendance records, and stay updated on school activities
                          </p>
                          <ul className="text-muted small mb-3 text-start w-100">
                            <li>View academic progress and grades</li>
                            <li>Communicate with teachers</li>
                            <li>Access attendance records</li>
                            <li>Receive school notifications</li>
                          </ul>
                          <CButton color="primary" size="lg" className="mt-auto w-100">
                            Parent Login
                          </CButton>
                        </CCardBody>
                      </CCard>
                    </Link>
                  </CCol>
                  
                  <CCol md={6}>
                    <Link to="/login/staff" className="text-decoration-none">
                      <CCard className="h-100 border-2 border-success login-card">
                        <CCardBody className="d-flex flex-column align-items-center p-4">
                          <div className="mb-3 p-3 bg-success bg-opacity-10 rounded-circle">
                            <CIcon icon={cilPeople} size="xl" className="text-success" />
                          </div>
                          <h4 className="h5 text-success mb-3">Staff Portal</h4>
                          <p className="text-muted text-center mb-3">
                            Manage classes, update student records, communicate with parents, 
                            and access administrative tools for effective school management
                          </p>
                          <ul className="text-muted small mb-3 text-start w-100">
                            <li>Manage student records and grades</li>
                            <li>Update attendance and schedules</li>
                            <li>Communicate with parents</li>
                            <li>Access administrative tools</li>
                          </ul>
                          <CButton color="success" size="lg" className="mt-auto w-100">
                            Staff Login
                          </CButton>
                        </CCardBody>
                      </CCard>
                    </Link>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>

            {/* App Description Section - Moved to Second */}
            <CCard className="shadow-lg border-0 mb-4">
              <CCardHeader className="bg-primary text-white">
                <h3 className="h4 mb-0">
                  <CIcon icon={cilInfo} className="me-2" />
                  About Our Application
                </h3>
              </CCardHeader>
              <CCardBody className="p-4">
                <CRow>
                  <CCol md={6}>
                    <h5 className="text-primary mb-3">What We Do</h5>
                    <p className="text-muted mb-3">
                      Tarbiyah Learning Academy SMS is a comprehensive school management system designed to streamline 
                      educational operations and enhance communication between parents, teachers, and administrators.
                    </p>
                    <p className="text-muted mb-0">
                      Our platform provides secure access to student records, academic progress tracking, 
                      communication tools, and administrative functions for modern educational institutions.
                    </p>
                  </CCol>
                  <CCol md={6}>
                    <h5 className="text-primary mb-3">Key Features</h5>
                    <ul className="list-unstyled">
                      <li className="mb-2 d-flex align-items-center">
                        <CIcon icon={cilSchool} className="text-primary me-2" />
                        <span>Student Management & Records</span>
                      </li>
                      <li className="mb-2 d-flex align-items-center">
                        <CIcon icon={cilChartLine} className="text-primary me-2" />
                        <span>Academic Progress Tracking</span>
                      </li>
                      <li className="mb-2 d-flex align-items-center">
                        <CIcon icon={cilCalendar} className="text-primary me-2" />
                        <span>Attendance & Scheduling</span>
                      </li>
                      <li className="mb-2 d-flex align-items-center">
                        <CIcon icon={cilEnvelopeClosed} className="text-primary me-2" />
                        <span>Parent-Teacher Communication</span>
                      </li>
                    </ul>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>

            {/* Data Usage Transparency Section - Moved to Third */}
            <CCard className="shadow-lg border-0 mb-4">
              <CCardHeader className="bg-info text-white">
                <h3 className="h4 mb-0">
                  <CIcon icon={cilShieldAlt} className="me-2" />
                  Data Usage & Privacy
                </h3>
              </CCardHeader>
              <CCardBody className="p-4">
                <div className="text-center mb-4">
                  <p className="text-muted mb-3">
                    We collect and use your data exclusively for educational purposes to provide our school management services.
                  </p>
                  <div className="d-flex justify-content-center align-items-center mb-3">
                    <CIcon icon={cilLockLocked} className="text-success me-2" />
                    <strong className="text-success">All data is encrypted and securely stored</strong>
                  </div>
                  <p className="text-muted small mb-0">
                    We never sell or share your personal information with third parties for commercial purposes.
                  </p>
                </div>
                
                {/* Google OAuth Data Usage */}
                <div className="mt-4 p-3 bg-light rounded">
                  <h6 className="text-info mb-3">
                    <CIcon icon={cilEnvelopeClosed} className="me-2" />
                    Google OAuth Data Usage (Staff Only)
                  </h6>
                  <p className="text-muted small mb-2">
                    Staff members who sign in with Google OAuth grant us access to:
                  </p>
                  <ul className="text-muted small mb-3">
                    <li><strong>Email address:</strong> To create and manage staff accounts, send important school notifications, and facilitate communication between staff and parents</li>
                    <li><strong>Basic profile information:</strong> To personalize the staff experience and display names in the school management system</li>
                    <li><strong>Google Calendar access:</strong> To sync school events, parent-teacher meetings, and academic schedules with staff calendars</li>
                  </ul>
                  <p className="text-muted small mb-0">
                    This Google data is used exclusively for educational purposes and school management functions. We do not use this data for any commercial purposes or share it with third parties.
                  </p>
                </div>
                
                <div className="text-center mt-3">
                  <Link to="/privacy-policy">
                    <CButton color="info" variant="outline" size="sm">
                      View Full Privacy Policy
                    </CButton>
                  </Link>
                </div>
              </CCardBody>
            </CCard>

            {/* Company Information */}
            <CCard className="shadow-lg border-0 mb-4">
              <CCardBody className="p-4 text-center">
                <h5 className="text-primary mb-3">About AIJ Solutions</h5>
                <p className="text-muted mb-3">
                  Tarbiyah Learning Academy SMS is developed and maintained by AIJ Solutions, 
                  a technology company dedicated to creating innovative educational solutions.
                </p>
                <div className="row text-center">
                  <div className="col-md-4">
                    <h6 className="text-primary">Contact</h6>
                    <p className="text-muted small">aijsolutions.co@gmail.com</p>
                  </div>
                  <div className="col-md-4">
                    <h6 className="text-primary">Service</h6>
                    <p className="text-muted small">School Management System</p>
                  </div>
                  <div className="col-md-4">
                    <h6 className="text-primary">Purpose</h6>
                    <p className="text-muted small">Educational Technology</p>
                  </div>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>

      {/* Footer */}
      <CFooter className="py-4 bg-dark text-white">
        <CContainer>
          <CRow className="align-items-center">
            <CCol md={6} className="text-center text-md-start mb-3 mb-md-0">
              <p className="mb-0">
                <strong>&copy; 2025 Tarbiyah Learning Academy.</strong> 
                <span className="ms-2">Powered by AIJ Solutions. All rights reserved.</span>
              </p>
            </CCol>
            <CCol md={6} className="text-center text-md-end">
              <Link to="/privacy-policy" className="text-white text-decoration-none me-4">
                Privacy Policy
              </Link>
              <Link to="/terms-of-service" className="text-white text-decoration-none">
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
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.2) !important;
        }
      `}</style>
    </div>
  )
}

export default Home
