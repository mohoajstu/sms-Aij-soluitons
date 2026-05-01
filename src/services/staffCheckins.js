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

  const settings = (await getTimekeepingSettings()) || defaultTimekeepingSettings()
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

  const docRef = await addDoc(collection(firestore, COLLECTION), {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    role: role || '',
    type,
    notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : '',
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: Number.isFinite(location.accuracy) ? location.accuracy : null,
    distanceMeters: Number.isFinite(distanceMeters) ? Math.round(distanceMeters) : null,
    inRange: Boolean(inRange),
    radiusMeters: settings.radiusMeters,
    status,
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

export const isViolation = (record) =>
  !!record &&
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
