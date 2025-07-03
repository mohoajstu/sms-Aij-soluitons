// hooks/useAuth.js
import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { auth, firestore } from './firebase' // ← add firestore
import { doc, onSnapshot } from 'firebase/firestore' // ← new imports

const useAuth = () => {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null) // 'admin', 'parent', …
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1️⃣ Listen for sign-in / sign-out
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) {
        // signed out
        setUser(null)
        setRole(null)
        setLoading(false)
        return
      }

      // signed in
      setUser(u)

      // 2️⃣ Attach a REAL-TIME listener to their Firestore user doc
      const ref = doc(firestore, 'users', u.uid)
      const unsubDoc = onSnapshot(
        ref,
        (snap) => {
          const data = snap.data()
          setRole(data?.role ?? 'guest') // default if field missing
          setLoading(false)
        },
        (err) => {
          console.error('Role listener error:', err)
          setRole('guest')
          setLoading(false)
        },
      )

      // 3️⃣ Clean up Firestore listener when auth state changes
      return () => unsubDoc()
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
