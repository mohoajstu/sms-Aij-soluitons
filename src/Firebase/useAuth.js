// hooks/useAuth.js
import { useState, useEffect } from 'react'
import { auth, firestore } from './firebase'
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'

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
          let tarbiyahId = null

          try {
            const userDocRef = doc(firestore, 'users', authUser.uid)
            const userDocSnap = await getDoc(userDocRef)
            if (userDocSnap.exists()) {
              const data = userDocSnap.data()
              
              // Handle role mapping from your actual data structure
              const userRole = data?.personalInfo?.role || data?.role
              if (userRole) {
                // Normalize role to lowercase for consistency
                docRole = userRole.toLowerCase() === 'parent' ? 'parent' : 
                         userRole.toLowerCase() === 'admin' ? 'admin' : 
                         userRole.toLowerCase() === 'faculty' ? 'faculty' : 'user'
              }
              
              // Get tarbiyahId for finding children
              tarbiyahId = data?.tarbiyahId
              
              // Check if children array exists directly in user doc
              docChildren = Array.isArray(data?.children) ? data.children : []
            }
          } catch (firestoreErr) {
            console.warn('useAuth: Could not read users doc for role fallback:', firestoreErr)
          }

          // If this is a parent and we have tarbiyahId but no children array, 
          // try to find children by looking for students with this parent
          if (docRole === 'parent' && tarbiyahId && docChildren.length === 0) {
            try {
              // Look for students where this parent's tarbiyahId matches father or mother tarbiyahId
              const studentsRef = collection(firestore, 'students')
              const studentsSnapshot = await getDocs(studentsRef)
              
              studentsSnapshot.forEach((doc) => {
                const studentData = doc.data()
                const parents = studentData.parents || {}
                
                // Check if this parent's tarbiyahId matches father or mother
                if (
                  (parents.father?.tarbiyahId === tarbiyahId) ||
                  (parents.mother?.tarbiyahId === tarbiyahId)
                ) {
                  docChildren.push(doc.id)
                }
              })
              
              console.log(`Auth: Found ${docChildren.length} children for parent with tarbiyahId: ${tarbiyahId}`)
            } catch (error) {
              console.warn('useAuth: Could not find children for parent:', error)
            }
          }

          const normalizedRole = customClaims.role || docRole || 'user'
          const normalizedChildren = customClaims.children || docChildren || []

          const normalizedClaims = {
            ...customClaims,
            role: normalizedRole,
            children: normalizedChildren,
            tarbiyahId: tarbiyahId,
          }

          setClaims(normalizedClaims)
          setRole(normalizedRole)
          setChildren(normalizedChildren)

          console.log('Auth: User authenticated with claims (normalized):', normalizedClaims)
          console.log('Auth: Found children:', normalizedChildren)
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
