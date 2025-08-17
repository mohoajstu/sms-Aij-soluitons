// hooks/useAuth.js
import { useState, useEffect } from 'react'
import { auth, firestore } from './firebase'
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)
  const [children, setChildren] = useState([]) // For parent role
  const [claims, setClaims] = useState(undefined) // Start as undefined to indicate loading

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser)

      if (authUser) {
        try {
          // Get custom claims from the ID token (force refresh to capture updates)
          const tokenResult = await getIdTokenResult(authUser, true)
          const customClaims = tokenResult.claims || {}

          // Fallback to Firestore user doc if claims missing role/children
          let docRole = null
          let docChildren = []
          try {
            const userDocRef = doc(firestore, 'users', authUser.uid)
            const userDocSnap = await getDoc(userDocRef)
            if (userDocSnap.exists()) {
              const data = userDocSnap.data()
              docRole = data?.role || null
              docChildren = Array.isArray(data?.children) ? data.children : []
            }
          } catch (firestoreErr) {
            // Non-fatal
            console.warn('useAuth: Could not read users doc for role fallback:', firestoreErr)
          }

          const normalizedRole = customClaims.role || docRole || 'user'
          const normalizedChildren = customClaims.children || docChildren || []

          const normalizedClaims = {
            ...customClaims,
            role: normalizedRole,
            children: normalizedChildren,
          }

          setClaims(normalizedClaims)
          setRole(normalizedRole)
          setChildren(normalizedChildren)

          console.log('Auth: User authenticated with claims (normalized):', normalizedClaims)
        } catch (error) {
          console.error('Auth: Error getting custom claims:', error)
          setRole('user')
          setChildren([])
          setClaims({ role: 'user', children: [] })
        }
      } else {
        setRole(null)
        setChildren([])
        setClaims(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      await auth.signOut()
    } catch (error) {
      console.error('Auth: Error signing out:', error)
      throw error
    }
  }

  // Helper function to check if user has access to a specific student
  const canAccessStudent = (studentId) => {
    if (!user || !claims) return false

    // Admin and faculty can access all students
    if (claims.role === 'admin' || claims.role === 'faculty') {
      return true
    }

    // Parents can only access their children
    if (claims.role === 'parent' && Array.isArray(claims.children)) {
      return claims.children.includes(studentId)
    }

    return false
  }

  return {
    user,
    loading,
    role,
    children,
    claims,
    signOut,
    canAccessStudent,
    isAuthenticated: !!user,
  }
}

export default useAuth
