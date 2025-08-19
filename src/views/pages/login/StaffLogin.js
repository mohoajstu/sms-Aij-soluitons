import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore'
import { auth } from '../../../Firebase/firebase'
import { STAFF_AUTHORIZED_DOMAINS, isStaffEmailAuthorized } from '../../../config/authConfig'
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

// Configure Google Provider for staff with additional scopes
const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('https://www.googleapis.com/auth/drive.file')
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly')
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events')


const db = getFirestore()
const SHARED_GOOGLE_AUTH_TOKEN_KEY = 'firebase_google_auth_token'

const StaffLogin = () => {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)

    try {
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user

      // Check if the email domain is authorized
      const isAuthorizedDomain = isStaffEmailAuthorized(user.email)
      
      // Check if user has admin role in Firestore
      let isAdmin = false
      let initialUserRef = doc(db, 'users', user.uid)
      let initialUserDoc = await getDoc(initialUserRef)
      
      if (initialUserDoc.exists()) {
        const userData = initialUserDoc.data()
        isAdmin = userData.role === 'admin'
      }

      // Allow access if either domain is authorized OR user is admin
      if (!isAuthorizedDomain && !isAdmin) {
        // Sign out the user immediately
        await auth.signOut()
        setError(`Access denied. Only staff members with authorized email domains or admin users are allowed. Your email domain: ${user.email.split('@')[1]}`)
        setLoading(false)
        return
      }

      // Store Google credentials for Calendar and other services access
      const credential = GoogleAuthProvider.credentialFromResult(result)
      if (credential) {
        const token = {
          accessToken: credential.accessToken,
          expiresAt: Date.now() + 3600000, // 1 hour expiration
        }
        localStorage.setItem(SHARED_GOOGLE_AUTH_TOKEN_KEY, JSON.stringify(token))
      }

      // Check/create user document in Firestore
      // First check if there's already a user document with this email (should be Tarbiyah ID-based)
      console.log('🔍 Searching for existing user document by email:', user.email)
      const usersSnapshot = await getDocs(collection(db, 'users'))
      let existingUserDoc = null
      let existingUserId = null
      
      usersSnapshot.docs.forEach(doc => {
        const data = doc.data()
        // Check both contact.email and root email fields
        const docEmail = data.contact?.email || data.email
        if (docEmail === user.email) {
          existingUserDoc = data
          existingUserId = doc.id
          console.log(`🎯 Found existing user document: ${doc.id} with email: ${docEmail}`)
        }
      })
      
      if (existingUserDoc && existingUserId) {
        console.log(`🔗 Found existing user document ${existingUserId} for email ${user.email}`)
        console.log('🔄 Updating existing Tarbiyah ID-based user document...')
        console.log('📄 Existing user data:', existingUserDoc)
        
        // Update the EXISTING Tarbiyah ID-based document (DO NOT create a new UID-based document)
        const tarbiyahUserRef = doc(db, 'users', existingUserId)
        await setDoc(tarbiyahUserRef, {
          ...existingUserDoc, // Preserve ALL existing data
          firebaseAuthUID: user.uid, // Store Firebase Auth UID for reference
          email: user.email, // Ensure email is at root level for compatibility
          lastLogin: serverTimestamp(),
          loginCount: (existingUserDoc.loginCount || existingUserDoc.stats?.loginCount || 0) + 1,
          emailDomain: user.email.split('@')[1],
          isVerified: true,
          isAuthorizedDomain,
          linkedAt: serverTimestamp(), // Track when linking occurred
          updatedAt: serverTimestamp(),
          // Update stats object if it exists
          ...(existingUserDoc.stats && {
            stats: {
              ...existingUserDoc.stats,
              loginCount: (existingUserDoc.stats.loginCount || 0) + 1,
              lastLoginAt: serverTimestamp(),
            }
          })
        }, { merge: true })
        
        console.log(`✅ Successfully updated Tarbiyah ID document ${existingUserId} with Auth UID ${user.uid}`)
        console.log(`✅ Preserved user role: ${existingUserDoc.role || existingUserDoc.personalInfo?.role}`)
      } else {
        // No existing user found, create new one with a temporary ID structure
        // This should rarely happen since People Page should create users first
        console.log('⚠️ No existing user document found for', user.email)
        console.log('📝 Creating new temporary user document - should be converted to Tarbiyah ID via People Page')
        
        const [firstName, lastName] = user.displayName?.split(' ') || ['', '']
        const userRole = isAuthorizedDomain ? 'Faculty' : (isAdmin ? 'Admin' : 'Faculty')
        
        // Generate a temporary Tarbiyah-style ID for new users
        // This should be properly assigned when they're added via People Page
        const tempTarbiyahId = `TEMP_${Date.now()}`
        const tempUserRef = doc(db, 'users', tempTarbiyahId)
        
        // Create user document with proper People Page structure using temp Tarbiyah ID
        await setDoc(tempUserRef, {
          tarbiyahId: tempTarbiyahId,
          schoolId: tempTarbiyahId,
          firebaseAuthUID: user.uid, // Store Firebase Auth UID for reference
          personalInfo: {
            firstName,
            lastName,
            role: userRole,
          },
          role: userRole,
          contact: {
            email: user.email,
            phone1: '',
            phone2: '',
            emergencyPhone: '',
          },
          emailDomain: user.email.split('@')[1],
          isVerified: true,
          isAuthorizedDomain,
          active: true,
          isTemporary: true, // Flag this as temporary
          dashboard: {
            theme: 'default',
          },
          stats: {
            loginCount: 1,
            lastLoginAt: serverTimestamp(),
          },
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        
        console.log(`📝 Created temporary user document ${tempTarbiyahId} - should be properly assigned via People Page`)
        console.log(`⚠️ User ${user.email} should be added to People Page with proper Tarbiyah ID`)
      }

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
        setError('Sign-in window was closed. Please try again.')
        break
      case 'auth/popup-blocked':
        setError('Popup was blocked by your browser. Please allow popups and try again.')
        break
      case 'auth/account-exists-with-different-credential':
        setError('An account already exists with a different sign-in method.')
        break
      case 'auth/cancelled-popup-request':
        setError('Sign-in was cancelled. Please try again.')
        break
      case 'auth/network-request-failed':
        setError('Network error. Please check your connection and try again.')
        break
      default:
        setError('Google sign-in failed. Please try again.')
        console.error('Google auth error:', error)
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
              <h1 className="h3 mb-1">Staff Portal</h1>
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
                <CCardBody className="text-center">
                  <div className="mb-4">
                    <h2 className="h4">Staff Login</h2>
                    <p className="text-body-secondary">Sign in with your Google account</p>
                  </div>
                  
                  {error && <CAlert color="danger">{error}</CAlert>}

                  <div className="mb-4">
                    <button
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="google-signin-btn w-100"
                      style={{
                        backgroundColor: '#4285f4',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(66, 133, 244, 0.3)',
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.target.style.backgroundColor = '#3367d6'
                          e.target.style.boxShadow = '0 4px 8px rgba(66, 133, 244, 0.4)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          e.target.style.backgroundColor = '#4285f4'
                          e.target.style.boxShadow = '0 2px 4px rgba(66, 133, 244, 0.3)'
                        }
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>{loading ? 'Signing In...' : 'Continue with Google'}</span>
                    </button>
                  </div>

                  <div className="text-center">
                    <small className="text-muted">
                      Only staff members with authorized email domains or admin users can access this portal.
                      <br />
                      <strong>Authorized domains:</strong> {STAFF_AUTHORIZED_DOMAINS.join(', ')}
                      <br />
                      <strong>Admin users:</strong> Users with admin role can access from any domain
                    </small>
                  </div>
                </CCardBody>
              </CCard>

              <CCard className="text-white py-5" style={{ width: '44%', backgroundColor: '#28a745' }}>
                <CCardBody className="text-center d-flex flex-column justify-content-center">
                  <div>
                    <h3>Staff Access</h3>
                    <p className="mb-4">
                      Access administrative tools, manage classes, track student progress, and collaborate with colleagues.
                    </p>
                    <div className="mb-3">
                      <small className="opacity-75">
                        <strong>Features included:</strong><br />
                        • Class Management<br />
                        • Student Records<br />
                        • Google Workspace Integration<br />
                        • Calendar & Scheduling<br />
                        • Report Generation
                      </small>
                    </div>
                  </div>
                </CCardBody>
              </CCard>
            </CCardGroup>
            
            <div className="text-center mt-3">
              <Link to="/login/parent" className="text-white text-decoration-none">
                Are you a parent? <strong>Click here for Parent Login</strong>
              </Link>
            </div>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default StaffLogin 