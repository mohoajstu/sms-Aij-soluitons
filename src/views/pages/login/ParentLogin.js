import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, firestore } from '../../../Firebase/firebase'
import {
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CContainer,
  CRow,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilUser, cilHome } from '@coreui/icons'

// Configure Google Provider for parent login
const googleProvider = new GoogleAuthProvider()

const ParentLogin = () => {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)

    try {
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user

      // Check if the email is a Tarbiyah student email
      if (!user.email || !user.email.endsWith('@tarbiyahlearning.ca')) {
        await auth.signOut()
        setError('Please sign in with your child\'s Tarbiyah email (@tarbiyahlearning.ca)')
        setLoading(false)
        return
      }

      // Find the student document by email
      const studentsQuery = query(
        collection(firestore, 'students'),
        where('contact.email', '==', user.email)
      )
      const studentsSnapshot = await getDocs(studentsQuery)

      if (studentsSnapshot.empty) {
        await auth.signOut()
        setError(`No student found with email: ${user.email}. Please contact the school if this is an error.`)
        setLoading(false)
        return
      }

      // Get the student document (should be only one)
      const studentDoc = studentsSnapshot.docs[0]
      const studentId = studentDoc.id
      const studentData = studentDoc.data()

      // Create or update user document to link to the student
      const userDocRef = doc(firestore, 'users', user.uid)
      await setDoc(userDocRef, {
        firebaseAuthUID: user.uid,
        email: user.email,
        studentId: studentId, // Link to student
        personalInfo: {
          firstName: studentData?.personalInfo?.firstName || '',
          lastName: studentData?.personalInfo?.lastName || '',
          role: 'Parent',
        },
        role: 'Parent',
        contact: {
          email: user.email,
        },
        active: true,
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true })

      // Navigate to dashboard
      navigate('/')
    } catch (err) {
      handleAuthError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAuthError = (error) => {
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        setError('Sign-in popup was closed. Please try again.')
        break
      case 'auth/popup-blocked':
        setError('Popup was blocked. Please allow popups for this site and try again.')
        break
      case 'auth/network-request-failed':
        setError('Network error. Please check your connection and try again.')
        break
      default:
        setError(`Login failed: ${error.message || 'Please try again.'}`)
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
                  <div className="text-center mb-4">
                    <h2 className="h4">Parent Login</h2>
                    <p className="text-body-secondary">Sign in with your child's Tarbiyah email</p>
                    <p className="text-muted small mt-2">
                      Use your child's school email (e.g., firstname.lastname@tarbiyahlearning.ca)
                    </p>
                  </div>
                    
                  {error && <CAlert color="danger">{error}</CAlert>}

                  <CRow>
                    <CCol xs={12}>
                      <CButton 
                        color="primary" 
                        className="w-100 mb-3" 
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        {loading ? (
                          'Signing In...'
                        ) : (
                          <>
                            <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: '4px' }}>
                              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.96-2.184l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
                            </svg>
                            Sign in with Google
                          </>
                        )}
                      </CButton>
                    </CCol>
                  </CRow>
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






