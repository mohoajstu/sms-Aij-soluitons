import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'

/**
 * Load the current user's profile from Firestore using email lookup
 * This treats users/{tarbiyahId} as the source of truth, not auth.uid
 * 
 * @param {*} db - Firestore database instance
 * @param {*} authUser - Firebase Auth user object
 * @returns {Object|null} - { id: tarbiyahId, data: userData } or null
 */
export async function loadCurrentUserProfile(db, authUser) {
  if (!authUser?.email) return null
  
  const email = authUser.email.toLowerCase()
  
  // Primary lookup: by contact.email in users collection
  let q = query(collection(db, 'users'), where('contact.email', '==', email))
  let s = await getDocs(q)
  if (!s.empty) return { id: s.docs[0].id, data: s.docs[0].data() }

  // Fallback 1: by root email field in users collection
  q = query(collection(db, 'users'), where('email', '==', email))
  s = await getDocs(q)
  if (!s.empty) return { id: s.docs[0].id, data: s.docs[0].data() }

  // Fallback 2: by personalInfo.email in faculty collection
  q = query(collection(db, 'faculty'), where('personalInfo.email', '==', email))
  s = await getDocs(q)
  if (!s.empty) {
    const facultyDoc = s.docs[0]
    return { id: facultyDoc.id, data: facultyDoc.data() }
  }

  // Fallback 3: by personalInfo.email in admins collection
  q = query(collection(db, 'admins'), where('personalInfo.email', '==', email))
  s = await getDocs(q)
  if (!s.empty) {
    const adminDoc = s.docs[0]
    return { id: adminDoc.id, data: adminDoc.data() }
  }

  // Fallback 4: if you ever stored firebaseAuthUID (legacy support)
  const byUidDoc = await getDoc(doc(db, 'users', authUser.uid))
  if (byUidDoc.exists()) return { id: byUidDoc.id, data: byUidDoc.data() }

  return null
}

/**
 * Get the Tarbiyah ID for the current authenticated user
 * 
 * @param {*} db - Firestore database instance
 * @param {*} authUser - Firebase Auth user object
 * @returns {string|null} - Tarbiyah ID or null
 */
export async function getCurrentUserTarbiyahId(db, authUser) {
  const profile = await loadCurrentUserProfile(db, authUser)
  return profile?.data?.tarbiyahId || profile?.id || null
}

/**
 * Get the role for the current authenticated user
 * 
 * @param {*} db - Firestore database instance  
 * @param {*} authUser - Firebase Auth user object
 * @returns {string} - User role (lowercase)
 */
export async function getCurrentUserRole(db, authUser) {
  const profile = await loadCurrentUserProfile(db, authUser)
  if (!profile) return 'guest'
  
  const role = profile.data?.personalInfo?.role || profile.data?.role || 'guest'
  return role.toLowerCase()
} 