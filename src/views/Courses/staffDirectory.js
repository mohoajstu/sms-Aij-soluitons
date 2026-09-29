import { collection, getDocs } from 'firebase/firestore'

/**
 * Everyone who can be put on a course.
 *
 * Admins were missing from every course screen, which is why a Grade 8
 * homeroom could not be handed to the principal: the pickers read `faculty`
 * and a role-filtered slice of `users`, and an admin appears in neither.
 * School admins teach classes here, so they belong in the same list.
 */

const fullName = (data, fallback) => {
  const p = data.personalInfo || {}
  const first = p.firstName || data.firstName || ''
  const last = p.lastName || data.lastName || ''
  return `${first} ${last}`.trim() || fallback
}

const emailOf = (data) => data.contact?.email || data.personalInfo?.email || data.email || ''

// Faculty docs often carry no role field, and admins docs use primaryRole.
const roleOf = (data, fallback) =>
  data.personalInfo?.role || data.role || data.primaryRole || fallback

export const mapStaffDoc = (id, data, source, fallbackRole) => {
  const p = data.personalInfo || {}
  return {
    id,
    name: fullName(data, `Unnamed ${fallbackRole}`),
    firstName: p.firstName || data.firstName || '',
    lastName: p.lastName || data.lastName || '',
    email: emailOf(data),
    role: roleOf(data, fallbackRole),
    source,
    schoolId: data.schoolId || p.schoolId || id,
    active: data.active !== false,
  }
}

export const loadFacultyAndAdmins = async (firestore) => {
  const [facultySnap, adminsSnap] = await Promise.all([
    getDocs(collection(firestore, 'faculty')),
    getDocs(collection(firestore, 'admins')),
  ])

  // Deduped on the bare document id, not on source+id. Courses store a teacher
  // as `teacherIds: ['TLA0015']` with no collection alongside it, so an id has
  // to mean one person. faculty/TLA0008 is Naheda Nour while admins/TLA0008 is
  // Victor Glogovac; faculty wins, and the clash needs fixing in the data.
  const list = []
  const seen = new Set()
  const add = (docSnap, source, fallbackRole) => {
    const data = docSnap.data() || {}
    if (data.isTestAccount === true) return
    if (seen.has(docSnap.id)) return
    const mapped = mapStaffDoc(docSnap.id, data, source, fallbackRole)
    if (!mapped.active) return
    seen.add(docSnap.id)
    list.push(mapped)
  }

  facultySnap.docs.forEach((d) => add(d, 'faculty', 'Faculty'))
  adminsSnap.docs.forEach((d) => add(d, 'admins', 'Admin'))
  return list
}

export default loadFacultyAndAdmins
