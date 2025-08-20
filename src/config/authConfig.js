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
export const canAccessStaffPortal = async (user, db, doc, getDoc, loadCurrentUserProfile) => {
  if (!user || !user.email) return false
  
  // Check domain authorization first
  const isAuthorizedDomain = isStaffEmailAuthorized(user.email)
  if (isAuthorizedDomain) return true
  
  // Check role via email-based profile lookup
  try {
    const profile = await loadCurrentUserProfile(db, user)
    if (profile) {
      const role = (profile.data?.personalInfo?.role || profile.data?.role || 'guest').toLowerCase()
      if (role === 'admin' || role === 'faculty') return true
    }
  } catch (error) {
    console.error('Error checking user role via profile lookup:', error)
  }
  
  // Fallback: check by uid document if present
  try {
    const userRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userRef)
    if (userDoc.exists()) {
      const userData = userDoc.data()
      const role = String(userData.role || 'guest').toLowerCase()
      return role === 'admin' || role === 'faculty'
    }
  } catch (error) {
    console.error('Error checking user role (uid fallback):', error)
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