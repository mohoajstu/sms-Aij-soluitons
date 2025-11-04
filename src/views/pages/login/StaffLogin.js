import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore'
import { auth } from '../../../Firebase/firebase'
import { STAFF_AUTHORIZED_DOMAINS, isStaffEmailAuthorized, isAdminUser } from '../../../config/authConfig'
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
import { loadCurrentUserProfile } from '../../../utils/userProfile'
import { toast } from 'react-hot-toast'

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
      
      // First, check if user exists in faculty collection by email
      let existingFacultyDoc = null
      let normalizedRole = 'guest'
      let tarbiyahId = null
      
      try {
        // Check faculty collection first
        const facultyQuery = query(collection(db, 'faculty'), where('personalInfo.email', '==', user.email))
        const facultySnapshot = await getDocs(facultyQuery)
        
        if (!facultySnapshot.empty) {
          existingFacultyDoc = facultySnapshot.docs[0]
          tarbiyahId = existingFacultyDoc.id
          normalizedRole = 'faculty'
        } else {
          // Check users collection as fallback
          const profile = await loadCurrentUserProfile(db, user)
          if (profile) {
            const profileRole = profile.data?.personalInfo?.role || profile.data?.role || 'guest'
            normalizedRole = String(profileRole).toLowerCase()
            tarbiyahId = profile.id
          }
        }
      } catch (e) {
        console.warn('Could not load profile during staff login role check:', e)
      }

      const isAdminOrFaculty = isAdminUser(normalizedRole) || normalizedRole === 'faculty'

      // Allow access if either domain is authorized OR user is admin/faculty
      if (!isAuthorizedDomain && !isAdminOrFaculty) {
        // Sign out the user immediately
        await auth.signOut()
        const reason = `Access denied. Only staff with authorized email domains or admin/faculty users are allowed. Your email domain: ${user.email.split('@')[1]}`
        setError(reason)
        toast.error(reason)
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

      // If user exists in faculty collection, create/update user document with Tarbiyah ID
      if (existingFacultyDoc && tarbiyahId) {
        const userRef = doc(db, 'users', tarbiyahId)
        const userDoc = await getDoc(userRef)
        
        if (!userDoc.exists()) {
          // Create new user document with Tarbiyah ID
          await setDoc(userRef, {
            tarbiyahId: tarbiyahId,
            linkedCollection: 'faculty',
            personalInfo: {
              firstName: existingFacultyDoc.data()?.personalInfo?.firstName || user.displayName?.split(' ')[0] || '',
              lastName: existingFacultyDoc.data()?.personalInfo?.lastName || user.displayName?.split(' ').slice(1).join(' ') || '',
              email: user.email,
              role: 'Faculty'
            },
            role: 'Faculty',
            emailDomain: user.email.split('@')[1],
            isVerified: true,
            isAuthorizedDomain,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            loginCount: 1,
            active: true,
            dashboard: {
              theme: 'default'
            },
            stats: {
              lastLoginAt: serverTimestamp(),
              loginCount: 1
            }
          })
        } else {
          // Update existing user document
          await setDoc(userRef, {
            lastLogin: serverTimestamp(),
            loginCount: (userDoc.data().loginCount || 0) + 1,
            emailDomain: user.email.split('@')[1],
            isVerified: true,
            isAuthorizedDomain,
            'stats.lastLoginAt': serverTimestamp()
          }, { merge: true })
        }
      } else {
        // Fallback: Check if user document exists by Tarbiyah ID first (via email lookup)
        // to avoid creating duplicate documents
        // Search all users documents and check multiple email field locations
        const usersSnapshot = await getDocs(collection(db, 'users'))
        let existingTarbiyahUserRef = null
        let existingTarbiyahDoc = null
        
        usersSnapshot.docs.forEach(doc => {
          const data = doc.data()
          // Check email in multiple possible locations
          const docEmail = data.email || data.contact?.email || data.personalInfo?.email
          if (docEmail === user.email && !existingTarbiyahDoc) {
            // Found a Tarbiyah ID-based document by email - use that instead
            existingTarbiyahDoc = { id: doc.id, data }
            existingTarbiyahUserRef = doc(db, 'users', doc.id)
          }
        })
        
        if (existingTarbiyahUserRef && existingTarbiyahDoc) {
          // Update existing Tarbiyah ID-based document
          await setDoc(existingTarbiyahUserRef, {
            firebaseAuthUID: user.uid, // Link auth UID to Tarbiyah ID document
            lastLogin: serverTimestamp(),
            loginCount: (existingTarbiyahDoc.data.loginCount || existingTarbiyahDoc.data.stats?.loginCount || 0) + 1,
            emailDomain: user.email.split('@')[1],
            isVerified: true,
            isAuthorizedDomain,
            'stats.lastLoginAt': serverTimestamp()
          }, { merge: true })
          console.log(`✅ Updated existing Tarbiyah ID document ${existingTarbiyahDoc.id} for ${user.email}`)
          navigate('/')
          setLoading(false)
          return
        }
        
        // No Tarbiyah ID document found - fallback to UID-based document (for backward compatibility)
        // But store firebaseAuthUID reference in case we need to migrate later
        const userRef = doc(db, 'users', user.uid)
        const userDoc = await getDoc(userRef)

        if (!userDoc.exists()) {
          const [firstName, lastName] = user.displayName?.split(' ') || ['', '']
          // Set role based on domain authorization or existing profile role
          const userRole = isAuthorizedDomain ? 'staff' : (isAdminOrFaculty ? (isAdminUser(normalizedRole) ? 'admin' : normalizedRole) : 'staff')
          
          await setDoc(userRef, {
            firstName,
            lastName,
            email: user.email,
            role: userRole,
            emailDomain: user.email.split('@')[1],
            isVerified: true,
            isAuthorizedDomain,
            firebaseAuthUID: user.uid, // Mark this as UID-based for potential migration
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            loginCount: 1,
          })
          console.log(`⚠️ Created UID-based user document ${user.uid} for ${user.email} - consider creating via People Page with Tarbiyah ID`)
        } else {
          // Update last login and verify domain again
          await setDoc(userRef, {
            lastLogin: serverTimestamp(),
            loginCount: (userDoc.data().loginCount || 0) + 1,
            emailDomain: user.email.split('@')[1],
            isVerified: true,
            isAuthorizedDomain,
          }, { merge: true })
        }
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
                <CButton color="light" variant="outline" size="sm">
                  <CIcon icon={cilUser} className="me-2" />
                  Parent Portal
                </CButton>
              </Link>
            </div>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default StaffLogin 