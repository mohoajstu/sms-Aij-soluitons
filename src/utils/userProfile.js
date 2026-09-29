import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { normalizeAdminRole } from '../config/authConfig'

/**
 * Person records do not agree on where the email lives. The People Management
 * form and uploadFaculty.js both write contact.email; some older users docs
 * carry personalInfo.email, and the docs StaffLogin mints carry a top-level
 * email. Look through all three, cheapest-first, so a staff member resolves no
 * matter which writer created their record.
 */
const EMAIL_FIELDS = ['contact.email', 'personalInfo.email', 'email']

/** Roles implied by the collection a person's record lives in. */
const COLLECTION_ROLES = {
  faculty: 'faculty',
  admins: 'admin',
  parents: 'parent',
  students: 'student',
}

async function findByEmail(db, collectionName, email) {
  for (const field of EMAIL_FIELDS) {
    const snap = await getDocs(query(collection(db, collectionName), where(field, '==', email)))
    // Dev and QA records share real emails; they must never win a real login.
    const match = snap.docs.find((d) => d.data()?.isTestAccount !== true && d.data()?.active !== false)
    if (match) return { id: match.id, data: match.data(), collection: collectionName }
  }
  return null
}

async function linkedStaffProfile(db, userData) {
  const collectionName = userData?.linkedCollection
  const id = userData?.tarbiyahId
  if (!['faculty', 'admins'].includes(collectionName) || !id) return null
  const snap = await getDoc(doc(db, collectionName, id))
  if (!snap.exists()) return null
  const data = snap.data()
  if (data?.isTestAccount === true || data?.active === false) return null
  return { id: snap.id, data, collection: collectionName }
}

/**
 * Load the current user's profile from Firestore using email lookup
 * This treats users/{tarbiyahId} as the source of truth, not auth.uid
 *
 * Staff (faculty/admins) are resolved first so that staff who are also
 * parents (same email in users as Parent) always get the staff portal.
 *
 * @param {*} db - Firestore database instance
 * @param {*} authUser - Firebase Auth user object
 * @returns {Object|null} - { id, data, collection } or null
 */
export async function loadCurrentUserProfile(db, authUser) {
  if (!authUser?.email) return null

  const email = authUser.email.toLowerCase()

  // Primary: faculty and admins first — staff who are also parents get staff portal
  const staff =
    (await findByEmail(db, 'faculty', email)) || (await findByEmail(db, 'admins', email))
  if (staff) return staff

  // Then users (parent/guest)
  const userRecord = await findByEmail(db, 'users', email)
  if (userRecord) {
    return (await linkedStaffProfile(db, userRecord.data)) || userRecord
  }

  // Legacy: users doc keyed by Firebase UID
  const byUidDoc = await getDoc(doc(db, 'users', authUser.uid))
  if (byUidDoc.exists()) {
    return (await linkedStaffProfile(db, byUidDoc.data())) ||
      { id: byUidDoc.id, data: byUidDoc.data(), collection: 'users' }
  }

  return null
}

/**
 * Resolve a profile to a lowercase role.
 *
 * Six of the live faculty docs carry no role field, so an explicit role is not
 * something we can rely on. When it is absent, the collection the record lives
 * in decides: a doc in faculty belongs to faculty, a doc in admins to an admin.
 *
 * @param {Object|null} profile - result of loadCurrentUserProfile
 * @returns {string} - lowercase role, 'guest' when unknown
 */
export function resolveProfileRole(profile) {
  if (!profile) return 'guest'

  // Collection membership is authoritative for staff. A faculty/admin record
  // may carry a stale "staff" or "parent" role from another login flow.
  if (profile.collection === 'faculty' || profile.collection === 'admins') {
    return COLLECTION_ROLES[profile.collection]
  }

  const explicit = profile.data?.personalInfo?.role || profile.data?.role ||
    profile.data?.personalInfo?.primaryRole || profile.data?.primaryRole
  if (explicit) return normalizeAdminRole(String(explicit))

  return COLLECTION_ROLES[profile.collection] || 'guest'
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
  return resolveProfileRole(await loadCurrentUserProfile(db, authUser))
}
