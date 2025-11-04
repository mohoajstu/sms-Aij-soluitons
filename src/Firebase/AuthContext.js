// AuthContext.js - Single source of truth for auth state
import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { auth, firestore } from './firebase'
import { loadCurrentUserProfile } from '../utils/userProfile'
import { normalizeAdminRole } from '../config/authConfig'

const AuthContext = createContext({
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
})

export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}

// Cache for user profile to prevent redundant queries
const profileCache = {
  data: null,
  userId: null,
  timestamp: null,
  TTL: 5 * 60 * 1000, // 5 minutes
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const loadingRef = useRef(false) // Prevent concurrent loads

  useEffect(() => {
    // Only create ONE subscription for the entire app
    const unsubAuth = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        // Signed out - clear everything
        setUser(null)
        setRole(null)
        setLoading(false)
        profileCache.data = null
        profileCache.userId = null
        profileCache.timestamp = null
        loadingRef.current = false
        return
      }

      // Signed in - check cache first
      const now = Date.now()
      const cacheValid = 
        profileCache.userId === authUser.uid &&
        profileCache.data &&
        profileCache.timestamp &&
        (now - profileCache.timestamp) < profileCache.TTL

      if (cacheValid) {
        // Use cached data
        const cachedRole = profileCache.data.data?.personalInfo?.role || 
                          profileCache.data.data?.role || 
                          'guest'
        const normalizedRole = normalizeAdminRole(cachedRole)
        setUser(authUser)
        setRole(normalizedRole)
        setLoading(false)
        return
      }

      // Prevent concurrent loads
      if (loadingRef.current) return
      loadingRef.current = true

      // Set user immediately, load profile asynchronously
      setUser(authUser)
      
      try {
        const profile = await loadCurrentUserProfile(firestore, authUser)
        
        if (profile) {
          // Cache the profile
          profileCache.data = profile
          profileCache.userId = authUser.uid
          profileCache.timestamp = Date.now()

          // Extract role from profile data
          const userRole = profile.data?.personalInfo?.role || profile.data?.role || 'guest'
          const normalizedRole = normalizeAdminRole(userRole)
          
          setRole(normalizedRole)
        } else {
          console.warn('⚠️ No user profile found for:', authUser.email)
          setRole('guest')
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
        setRole('guest')
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    })

    // Cleanup
    return unsubAuth
  }, [])

  const signOut = async () => {
    try {
      // Clear cache on sign out
      profileCache.data = null
      profileCache.userId = null
      profileCache.timestamp = null
      await firebaseSignOut(auth)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const value = {
    user,
    role,
    loading,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

