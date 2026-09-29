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

// Replaces the whole staffOverrides field. A deep merge would treat the dots in
// email keys as field paths and could never clear a removed override.
export const saveStaffOverrides = async (staffOverrides) => {
  await setDoc(
    doc(firestore, SETTINGS_DOC),
    { staffOverrides, lastUpdated: serverTimestamp() },
    { mergeFields: ['staffOverrides', 'lastUpdated'] },
  )
  cache = null
}

export const normalizeStaffEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : ''

// Firestore keys, in JS getDay() order so a Date maps straight onto one.
export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export const DAY_LABELS = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

// The school week. Weekends stay available through DAY_KEYS if ever needed.
export const SCHOOL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri']

export const dayKeyFor = (when) => {
  const d = when instanceof Date ? when : new Date(when)
  return Number.isNaN(d.getTime()) ? null : DAY_KEYS[d.getDay()]
}

const applyTimes = (target, source) => {
  if (!source) return
  if (source.expectedCheckInTime) target.expectedCheckInTime = source.expectedCheckInTime
  if (source.expectedCheckOutTime) target.expectedCheckOutTime = source.expectedCheckOutTime
  const grace = Number(source.graceMinutes)
  if (source.graceMinutes !== '' && source.graceMinutes != null && Number.isFinite(grace)) {
    target.graceMinutes = grace
  }
}

/**
 * Work out the hours one person is held to, for one day.
 *
 * Three layers, most specific first: the entry for that weekday, then the
 * person's own default, then the school default. Some staff work a short
 * Wednesday or do not come in on Friday at all, so a single pair of times per
 * person was never enough to judge them fairly.
 *
 * `when` is optional. Without it the per-day layer is skipped, which is what
 * callers that only want the person's usual hours should do.
 */
export const resolveStaffSettings = (settings, email, when) => {
  const base = settings || defaultTimekeepingSettings()
  const key = normalizeStaffEmail(email)
  const override = (key && base.staffOverrides && base.staffOverrides[key]) || null
  if (!override) return { ...base, scheduled: true }

  const resolved = { ...base, scheduled: true }
  applyTimes(resolved, override)

  const dayKey = when != null ? dayKeyFor(when) : null
  const dayEntry = dayKey && override.days ? override.days[dayKey] : null
  if (dayEntry) {
    if (dayEntry.off === true) resolved.scheduled = false
    applyTimes(resolved, dayEntry)
  }

  return resolved
}

export const computeStatus = ({ type, when, settings }) => {
  const s = settings || defaultTimekeepingSettings()
  // Nobody is late for a day they were never expected in.
  if (s.scheduled === false) return 'unscheduled'
  const moment = when instanceof Date ? when : new Date(when)
  const minutesNow = moment.getHours() * 60 + moment.getMinutes()
  const parse = (hhmm) => {
    const [h, m] = String(hhmm || '00:00')
      .split(':')
      .map(Number)
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
  }
  const graceValue = Number(s.graceMinutes)
  const grace = s.graceMinutes !== '' && Number.isFinite(graceValue)
    ? Math.max(0, graceValue)
    : 0

  if (type === 'in') {
    const cutoff = parse(s.expectedCheckInTime) + grace
    return minutesNow <= cutoff ? 'on-time' : 'late'
  }
  if (type === 'out') {
    const expected = parse(s.expectedCheckOutTime)
    return minutesNow >= expected - grace ? 'on-time' : 'early-departure'
  }
  return 'on-time'
}
