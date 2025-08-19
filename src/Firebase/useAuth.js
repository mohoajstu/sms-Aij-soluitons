// hooks/useAuth.js
import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { auth, firestore } from './firebase' // ← add firestore
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore' // ← updated imports

const useAuth = () => {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null) // 'admin', 'parent', …
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1️⃣ Listen for sign-in / sign-out
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        // signed out
        setUser(null)
        setRole(null)
        setLoading(false)
        return
      }

      // signed in
      setUser(u)

      // 2️⃣ Find user document by firebaseAuthUID field (not by document ID)
      console.log('🔍 Looking for user document with firebaseAuthUID:', u.uid)
      
      try {
        // Query users collection for document where firebaseAuthUID equals current user's UID
        const usersRef = collection(firestore, 'users')
        const q = query(usersRef, where('firebaseAuthUID', '==', u.uid))
        const querySnapshot = await getDocs(q)
        
        if (!querySnapshot.empty) {
          // Found user document with matching firebaseAuthUID
          const userDoc = querySnapshot.docs[0]
          const data = userDoc.data()
          const tarbiyahId = userDoc.id
          
          console.log('✅ Found user document:', tarbiyahId)
          console.log('📄 User data:', data)
          
          // Handle different role storage patterns
          let userRole = data?.role || data?.personalInfo?.role || 'guest'
          
          // Convert role to lowercase for consistency
          userRole = userRole.toLowerCase()
          
          // Debug logging
          console.log('useAuth: User data:', data)
          console.log('useAuth: Extracted role:', userRole)
          console.log('useAuth: Tarbiyah ID:', tarbiyahId)
          
          setRole(userRole)
          setLoading(false)
          
          // 3️⃣ Set up real-time listener for this specific document
          const unsubDoc = onSnapshot(
            userDoc.ref,
            (snap) => {
              const updatedData = snap.data()
              let updatedRole = updatedData?.role || updatedData?.personalInfo?.role || 'guest'
              updatedRole = updatedRole.toLowerCase()
              
              console.log('🔄 User document updated:', updatedData)
              console.log('🔄 Updated role:', updatedRole)
              
              setRole(updatedRole)
            },
            (err) => {
              console.error('User document listener error:', err)
              setRole('guest')
            }
          )
          
          // Return cleanup function for document listener
          return () => unsubDoc()
        } else {
          // No user document found with this firebaseAuthUID
          console.warn('⚠️ No user document found for firebaseAuthUID:', u.uid)
          console.warn('⚠️ User may need to be added via People Page first')
          setRole('guest')
          setLoading(false)
        }
      } catch (err) {
        console.error('Error finding user document:', err)
        setRole('guest')
        setLoading(false)
      }
    })

    return () => unsubAuth()
  }, [])

  // same sign-out helper you already had
  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  return { user, role, loading, signOut }
}

export default useAuth
