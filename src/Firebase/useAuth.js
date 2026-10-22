// hooks/useAuth.js
import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { auth, firestore } from './firebase'
import { loadCurrentUserProfile, resolveProfileRole } from '../utils/userProfile'
import { isActingAs, endActAs } from '../services/actAs'

const useAuth = () => {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null) // 'admin', 'parent', …
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    let version = 0
    // Listen for sign-in / sign-out
    const unsubAuth = onAuthStateChanged(auth, async (authUser) => {
      const currentVersion = ++version
      setLoading(true)
      setRole(null)
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
        if (!active || version !== currentVersion) return

        if (profile) {
          const normalizedRole = resolveProfileRole(profile)

          console.log('✅ Found user profile:', profile.collection, profile.id)
          console.log('🔑 Extracted role:', normalizedRole)

          setRole(normalizedRole)
        } else {
          console.warn('⚠️ No user profile found for:', authUser.email)
          console.warn('⚠️ User may need to be added via People Page first')
          setRole('guest')
        }
      } catch (error) {
        if (!active || version !== currentVersion) return
        console.error('Error loading user profile:', error)
        setRole('guest')
      } finally {
        if (active && version === currentVersion) setLoading(false)
      }
    })

    // cleanup
    return () => { active = false; version += 1; unsubAuth() }
  }, [])

  const signOut = async () => {
    try {
      if (isActingAs()) { await endActAs(); return }
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
