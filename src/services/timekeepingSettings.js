import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { firestore } from '../Firebase/firebase'
import {
  SCHOOL_LATITUDE,
  SCHOOL_LONGITUDE,
  GEO_FENCE_RADIUS_METERS,
  GEO_FENCE_ENABLED,
} from '../config/geoFence'

const SETTINGS_DOC = 'systemSettings/timekeeping'

export const defaultTimekeepingSettings = () => ({
  enabled: GEO_FENCE_ENABLED,
  latitude: SCHOOL_LATITUDE,
  longitude: SCHOOL_LONGITUDE,
  radiusMeters: GEO_FENCE_RADIUS_METERS,
  expectedCheckInTime: '08:00',
  expectedCheckOutTime: '16:00',
  graceMinutes: 10,
})

let cache = null

export const getTimekeepingSettings = async ({ forceRefresh = false } = {}) => {
  if (cache && !forceRefresh) return cache
  try {
    const snap = await getDoc(doc(firestore, SETTINGS_DOC))
    const merged = { ...defaultTimekeepingSettings(), ...(snap.exists() ? snap.data() : {}) }
    cache = merged
    return merged
  } catch (err) {
    console.warn('Failed to load timekeeping settings, using defaults:', err)
    return defaultTimekeepingSettings()
  }
}

export const updateTimekeepingSettings = async (updates) => {
  await setDoc(
    doc(firestore, SETTINGS_DOC),
    { ...updates, lastUpdated: serverTimestamp() },
    { merge: true },
  )
  cache = null
}

export const computeStatus = ({ type, when, settings }) => {
  const s = settings || defaultTimekeepingSettings()
  const moment = when instanceof Date ? when : new Date(when)
  const minutesNow = moment.getHours() * 60 + moment.getMinutes()
  const parse = (hhmm) => {
    const [h, m] = String(hhmm || '00:00').split(':').map(Number)
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
  }
  const grace = Number.isFinite(s.graceMinutes) ? s.graceMinutes : 0

  if (type === 'in') {
    const cutoff = parse(s.expectedCheckInTime) + grace
    return minutesNow <= cutoff ? 'on-time' : 'late'
  }
  if (type === 'out') {
    const expected = parse(s.expectedCheckOutTime)
    return minutesNow >= expected ? 'on-time' : 'early-departure'
  }
  return 'on-time'
}
