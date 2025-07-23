import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../../Firebase/firebase'
import { formatParentEmail } from '../../../config/authConfig'
import {
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser, cilHome } from '@coreui/icons'

const ParentLogin = () => {
  const [tarbiyahId, setTarbiyahId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Convert Tarbiyah ID to email format using centralized config
    const loginEmail = formatParentEmail(tarbiyahId)

    try {
      await signInWithEmailAndPassword(auth, loginEmail, password)
      navigate('/')
    } catch (err) {
      handleAuthError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAuthError = (error) => {
    switch (error.code) {
      case 'auth/user-not-found':
        setError('No account found with this Tarbiyah ID')
        break
      case 'auth/wrong-password':
        setError('Incorrect password')
        break
      case 'auth/invalid-email':
        setError('Invalid Tarbiyah ID format')
        break
      case 'auth/too-many-requests':
        setError('Too many failed attempts. Please try again later.')
        break
      default:
        setError('Login failed. Please check your credentials and try again.')
    }
  }

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header */}
      <div className="py-3 text-center text-white">
        <CContainer>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <Link to="/home" className="text-white text-decoration-none">
              <CButton color="light" variant="outline" size="sm">
                <CIcon icon={cilHome} className="me-2" />
                Back to Home
              </CButton>
            </Link>
          </div>
          <div className="d-flex align-items-center justify-content-center">
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
              <h1 className="h3 mb-1">Parent Portal</h1>
              <p className="mb-0 opacity-90">Tarbiyah Learning Academy</p>
            </div>
          </div>
        </CContainer>
      </div>

      {/* Main Content */}
      <CContainer className="flex-grow-1 d-flex align-items-center">
        <CRow className="justify-content-center w-100">
          <CCol md={8} lg={6} xl={5}>
            <CCardGroup>
              <CCard className="p-4">
                <CCardBody>
                  <CForm onSubmit={handleSubmit}>
                    <div className="text-center mb-4">
                      <h2 className="h4">Parent Login</h2>
                      <p className="text-body-secondary">Sign in with your Tarbiyah ID</p>
                    </div>
                    
                    {error && <CAlert color="danger">{error}</CAlert>}

                    <CInputGroup className="mb-3">
                      <CInputGroupText>
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput
                        type="text"
                        placeholder="Tarbiyah ID"
                        autoComplete="username"
                        value={tarbiyahId}
                        onChange={(e) => setTarbiyahId(e.target.value)}
                        required
                      />
                    </CInputGroup>

                    <CInputGroup className="mb-4">
                      <CInputGroupText>
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type="password"
                        placeholder="Password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </CInputGroup>

                    <CRow>
                      <CCol xs={12}>
                        <CButton 
                          color="primary" 
                          className="w-100 mb-3" 
                          type="submit" 
                          disabled={loading}
                        >
                          {loading ? 'Signing In...' : 'Sign In'}
                        </CButton>
                      </CCol>
                    </CRow>

                    <div className="text-center">
                      <CButton color="link" className="px-0 text-decoration-none">
                        Forgot your password?
                      </CButton>
                    </div>
                  </CForm>
                </CCardBody>
              </CCard>

              <CCard className="text-white bg-primary py-5" style={{ width: '44%' }}>
                <CCardBody className="text-center d-flex flex-column justify-content-center">
                  <div>
                    <h3>Welcome Back!</h3>
                    <p className="mb-4">
                      Access your child's academic progress, attendance records, and stay connected with teachers.
                    </p>
                    <div className="mb-3">
                      <small className="opacity-75">
                        Need help? Contact the school office or check our FAQ section.
                      </small>
                    </div>
                  </div>
                </CCardBody>
              </CCard>
            </CCardGroup>
            
            <div className="text-center mt-3">
              <Link to="/login/staff" className="text-white text-decoration-none">
                Are you a staff member? <strong>Click here for Staff Login</strong>
              </Link>
            </div>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default ParentLogin 