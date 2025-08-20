// Authentication configuration for Tarbiyah Learning Academy

export const STAFF_AUTHORIZED_DOMAINS = [
  'tarbiyahlearning.ca',
  // Add more authorized domains here as needed
  // 'newdomain.com',
]

// Helper function to check if email domain is authorized for staff
export const isStaffEmailAuthorized = (email) => {
  if (!email || typeof email !== 'string') return false
  const domain = email.split('@')[1]?.toLowerCase()
  return STAFF_AUTHORIZED_DOMAINS.includes(domain)
}

// Helper function to check if user can access staff portal (domain OR admin role)
export const canAccessStaffPortal = async (user, db, doc, getDoc) => {
  if (!user || !user.email) return false
  
  // Check domain authorization first
  const isAuthorizedDomain = isStaffEmailAuthorized(user.email)
  if (isAuthorizedDomain) return true
  
  // Check admin role in Firestore
  try {
    const userRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userRef)
    
    if (userDoc.exists()) {
      const userData = userDoc.data()
      return userData.role === 'admin'
    }
  } catch (error) {
    console.error('Error checking user role:', error)
  }

  try {
    const userRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userRef)
    
    if (userDoc.exists()) {
      const userData = userDoc.data()
      return userData.role === 'faculty'
    }
  } catch (error) {
    console.error('Error checking user role:', error)
  }
  
  return false
}

// Parent login configuration
export const PARENT_EMAIL_DOMAIN = 'gmail.com'

// Helper function to format parent email from Tarbiyah ID
export const formatParentEmail = (tarbiyahId) => {
  if (!tarbiyahId || typeof tarbiyahId !== 'string') return ''
  return `${tarbiyahId.trim()}@${PARENT_EMAIL_DOMAIN}`
}

// Check if email is a valid parent email format
export const isParentEmailValid = (email) => {
  if (!email || typeof email !== 'string') return false
  return email.endsWith(`@${PARENT_EMAIL_DOMAIN}`)
} 