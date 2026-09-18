import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { firestore } from '../Firebase/firebase'
import {
  getTimekeepingSettings,
  computeStatus,
  defaultTimekeepingSettings,
  resolveStaffSettings,
} from './timekeepingSettings'

const COLLECTION = 'staffCheckins'

export const calculateDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  if ([lat1, lon1, lat2, lon2].some((c) => !Number.isFinite(c))) return null
  const R = 6371000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const createStaffCheckIn = async ({ user, role, location, type, notes }) => {
  if (!user?.uid || !location) throw new Error('Missing required check-in data.')
  if (type !== 'in' && type !== 'out') throw new Error('Invalid check-in type.')

  const globalSettings = (await getTimekeepingSettings()) || defaultTimekeepingSettings()
  const settings = resolveStaffSettings(globalSettings, user.email)
  const distanceMeters = calculateDistanceInMeters(
    location.latitude,
    location.longitude,
    settings.latitude,
    settings.longitude,
  )
  const inRange =
    !settings.enabled ||
    (Number.isFinite(distanceMeters) && distanceMeters <= settings.radiusMeters)

  const now = new Date()
  const status = computeStatus({ type, when: now, settings })
  const cleanNotes = typeof notes === 'string' ? notes.trim().slice(0, 500) : ''
  // A note is the staff member's explanation (prep at home, off-site errand,
  // parent meeting). It excuses the record on the timesheet; the raw status and
  // the note itself stay on the document so admins can still audit it.
  const excused = Boolean(cleanNotes) && (status !== 'on-time' || !inRange)

  const docRef = await addDoc(collection(firestore, COLLECTION), {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    role: role || '',
    type,
    notes: cleanNotes,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: Number.isFinite(location.accuracy) ? location.accuracy : null,
    distanceMeters: Number.isFinite(distanceMeters) ? Math.round(distanceMeters) : null,
    inRange: Boolean(inRange),
    radiusMeters: settings.radiusMeters,
    status,
    excused,
    expectedTime: type === 'in' ? settings.expectedCheckInTime : settings.expectedCheckOutTime,
    graceMinutes: settings.graceMinutes,
    createdAt: serverTimestamp(),
    clientCreatedAt: now.toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  })

  return {
    id: docRef.id,
    distanceMeters: Number.isFinite(distanceMeters) ? Math.round(distanceMeters) : null,
    inRange,
    status,
    excused,
    notes: cleanNotes,
  }
}

export const getRecentStaffCheckIns = async (max = 200) => {
  const q = query(collection(firestore, COLLECTION), orderBy('createdAt', 'desc'), limit(max))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Note: avoids a composite index by filtering by uid only and sorting client-side.
export const getUserRecentStaffCheckIns = async (uid, max = 25) => {
  if (!uid) return []
  const q = query(collection(firestore, COLLECTION), where('uid', '==', uid), limit(100))
  const snap = await getDocs(q)
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const ts = (r) => {
    const v = r.createdAt
    if (v && typeof v.toMillis === 'function') return v.toMillis()
    if (r.clientCreatedAt) return new Date(r.clientCreatedAt).getTime()
    return 0
  }
  docs.sort((a, b) => ts(b) - ts(a))
  return docs.slice(0, max)
}

// Records written before the excuse rule existed have no `excused` field, so a
// note on them still counts as the explanation.
export const isExcused = (record) => {
  if (!record) return false
  if (record.excused === true) return true
  if (record.excused === false) return false
  return Boolean(record.notes && String(record.notes).trim())
}

// What the timesheet should show: an explained late arrival or early departure
// reads as on time.
export const effectiveStatus = (record) =>
  isExcused(record) ? 'on-time' : record?.status || 'on-time'

export const isViolation = (record) =>
  !!record &&
  !isExcused(record) &&
  (record.inRange === false || (record.status && record.status !== 'on-time'))

export const formatStatusLabel = (status) => {
  switch (status) {
    case 'on-time':
      return 'On time'
    case 'late':
      return 'Late'
    case 'early-departure':
      return 'Early departure'
    default:
      return status || '—'
  }
}

// Label for a record rather than a bare status string, so an excused row reads
// "On time (noted)" instead of "Late".
export const formatRecordStatusLabel = (record) =>
  isExcused(record) && record?.status !== 'on-time'
    ? 'On time (noted)'
    : formatStatusLabel(effectiveStatus(record))

export const statusBadgeColor = (status) => {
  switch (status) {
    case 'on-time':
      return 'success'
    case 'late':
      return 'warning'
    case 'early-departure':
      return 'warning'
    default:
      return 'secondary'
  }
}
