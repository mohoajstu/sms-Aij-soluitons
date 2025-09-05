// hooks/useAuth.js
import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { auth, firestore } from './firebase'
import { loadCurrentUserProfile } from '../utils/userProfile'
import { normalizeAdminRole } from '../config/authConfig'

const useAuth = () => {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null) // 'admin', 'parent', …
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Listen for sign-in / sign-out
    const unsubAuth = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        // signed out
        setUser(authUser)
        setRole(null)
        setLoading(false)
        return
      }

      // signed in - load profile by email lookup
      setUser(authUser)
      
      try {
        const profile = await loadCurrentUserProfile(firestore, authUser)
        
        if (profile) {
          // Extract role from profile data
          const userRole = profile.data?.personalInfo?.role || profile.data?.role || 'guest'
          const normalizedRole = normalizeAdminRole(userRole)
          
          console.log('✅ Found user profile:', profile.id)
          console.log('📄 User data:', profile.data)
          console.log('🔑 Extracted role:', normalizedRole)
          
          setRole(normalizedRole)
        } else {
          console.warn('⚠️ No user profile found for:', authUser.email)
          console.warn('⚠️ User may need to be added via People Page first')
          setRole('guest')
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
        setRole('guest')
      } finally {
        setLoading(false)
      }
    })

    // cleanup
    return unsubAuth
  }, [])

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return {
    user,
    role,
    loading,
    signOut,
  }
}

export default useAuth
