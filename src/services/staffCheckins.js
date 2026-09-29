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

// Older taps retain the status saved at check-in time. Reconcile those made
// inside the grace window so the staff and admin views agree with today's rule.
export const statusWithinGrace = (record) => {
  if (!record || !['late', 'early-departure'].includes(record.status)) return record?.status
  const grace = Number(record.graceMinutes)
  const [hour, minute] = String(record.expectedTime || '').split(':').map(Number)
  const instant = record.clientCreatedAt
    ? new Date(record.clientCreatedAt)
    : record.createdAt?.toDate?.() || new Date(record.createdAt)
  if (!Number.isFinite(grace) || grace < 0 || !Number.isFinite(hour) ||
      !Number.isFinite(minute) || Number.isNaN(instant?.getTime())) return record.status
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', hour12: false, hour: '2-digit', minute: '2-digit',
  }).formatToParts(instant)
  const actualHour = Number(parts.find((part) => part.type === 'hour')?.value) % 24
  const actualMinute = Number(parts.find((part) => part.type === 'minute')?.value)
  const actual = actualHour * 60 + actualMinute
  const expected = hour * 60 + minute
  if (record.status === 'late' && actual <= expected + grace) return 'on-time'
  if (record.status === 'early-departure' && actual >= expected - grace) return 'on-time'
  return record.status
}

const withEffectiveStatus = (record) => ({ ...record, status: statusWithinGrace(record) })

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

/**
 * Judge a fix against the fence, allowing for how sure the device is.
 *
 * A phone indoors can answer with a wifi or cell-tower position whose accuracy
 * is measured in kilometres. Comparing the centre of that circle to a 200m
 * fence is meaningless: a teacher standing in the hallway came back 1229m out
 * with an accuracy of 2000m and was recorded as a violation. Only call someone
 * outside when the whole accuracy circle sits beyond the fence.
 */
export const evaluateFence = ({ distanceMeters, accuracy, radiusMeters, enabled }) => {
  if (!enabled) return { inRange: true, certainty: 'disabled' }
  if (!Number.isFinite(distanceMeters)) return { inRange: true, certainty: 'unknown' }

  const margin = Number.isFinite(accuracy) && accuracy > 0 ? accuracy : 0
  if (distanceMeters + margin <= radiusMeters) return { inRange: true, certainty: 'confirmed' }
  if (distanceMeters - margin <= radiusMeters) return { inRange: true, certainty: 'uncertain' }
  return { inRange: false, certainty: 'outside' }
}

export const createStaffCheckIn = async ({
  user,
  role,
  location,
  type,
  notes,
  locationSamples,
}) => {
  if (!user?.uid || !location) throw new Error('Missing required check-in data.')
  if (type !== 'in' && type !== 'out') throw new Error('Invalid check-in type.')

  const now = new Date()
  const globalSettings = (await getTimekeepingSettings()) || defaultTimekeepingSettings()
  // Hours can differ by weekday, so the schedule is resolved against today.
  const settings = resolveStaffSettings(globalSettings, user.email, now)
  const distanceMeters = calculateDistanceInMeters(
    location.latitude,
    location.longitude,
    settings.latitude,
    settings.longitude,
  )
  const { inRange, certainty } = evaluateFence({
    distanceMeters,
    accuracy: location.accuracy,
    radiusMeters: settings.radiusMeters,
    enabled: settings.enabled,
  })

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
    positionTimestamp: Number.isFinite(location.timestamp)
      ? new Date(location.timestamp).toISOString()
      : null,
    positionAgeMs: Number.isFinite(location.timestamp)
      ? Math.max(0, now.getTime() - location.timestamp)
      : null,
    locationSamples: Number.isFinite(locationSamples) ? locationSamples : null,
    distanceMeters: Number.isFinite(distanceMeters) ? Math.round(distanceMeters) : null,
    inRange: Boolean(inRange),
    locationCertainty: certainty,
    scheduled: settings.scheduled !== false,
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
    locationCertainty: certainty,
    status,
  }
}

/**
 * Every check-in inside a date range, oldest first.
 *
 * The recent-N query cannot be trusted for an export: a busy fortnight runs to
 * a few hundred records and the period being exported may not be the latest.
 */
export const getStaffCheckInsBetween = async (start, end) => {
  const q = query(
    collection(firestore, COLLECTION),
    where('createdAt', '>=', start),
    where('createdAt', '<=', end),
    orderBy('createdAt', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => withEffectiveStatus({ id: d.id, ...d.data() }))
}

export const getRecentStaffCheckIns = async (max = 200) => {
  const q = query(collection(firestore, COLLECTION), orderBy('createdAt', 'desc'), limit(max))
  const snap = await getDocs(q)
  return snap.docs.map((d) => withEffectiveStatus({ id: d.id, ...d.data() }))
}

// Note: avoids a composite index by filtering by uid only and sorting client-side.
export const getUserRecentStaffCheckIns = async (uid, max = 25) => {
  if (!uid) return []
  const q = query(collection(firestore, COLLECTION), where('uid', '==', uid), limit(100))
  const snap = await getDocs(q)
  const docs = snap.docs.map((d) => withEffectiveStatus({ id: d.id, ...d.data() }))
  const ts = (r) => {
    const v = r.createdAt
    if (v && typeof v.toMillis === 'function') return v.toMillis()
    if (r.clientCreatedAt) return new Date(r.clientCreatedAt).getTime()
    return 0
  }
  docs.sort((a, b) => ts(b) - ts(a))
  return docs.slice(0, max)
}

// An unconfirmed fix is not an offence. Only a position that is certainly
// outside the fence, or a genuinely late or early record, counts.
export const isViolation = (record) =>
  !!record &&
  (record.inRange === false ||
    (record.status && record.status !== 'on-time' && record.status !== 'unscheduled'))

export const formatStatusLabel = (status) => {
  switch (status) {
    case 'on-time':
      return 'On time'
    case 'late':
      return 'Late'
    case 'early-departure':
      return 'Early departure'
    case 'unscheduled':
      return 'Not scheduled'
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
    case 'unscheduled':
      return 'info'
    default:
      return 'secondary'
  }
}
