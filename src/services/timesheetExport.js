import { resolveStaffSettings } from './timekeepingSettings'

/**
 * Bi-weekly staff timesheets, filled into the school's own Excel template.
 *
 * The template is a fortnight of ten weekday columns. It ships with its first
 * period starting Monday 17 August 2026, so every later period is that Monday
 * plus a multiple of fourteen days.
 */

export const PERIOD_ANCHOR = new Date(Date.UTC(2026, 7, 17))
const DAY_MS = 24 * 60 * 60 * 1000

export const periodIndexFor = (date) =>
  Math.floor(
    (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      PERIOD_ANCHOR.getTime()) /
      (14 * DAY_MS),
  )

export const periodStartFor = (index) => new Date(PERIOD_ANCHOR.getTime() + index * 14 * DAY_MS)

/** The ten Mon-to-Fri days of a period, both weekends skipped. */
export const periodWorkingDays = (index) => {
  const start = periodStartFor(index)
  const days = []
  for (let week = 0; week < 2; week += 1) {
    for (let d = 0; d < 5; d += 1) {
      days.push(new Date(start.getTime() + (week * 7 + d) * DAY_MS))
    }
  }
  return days
}

/** Period 0 covers weeks 1 and 2, period 1 weeks 3 and 4, and so on. */
export const periodLabel = (index) => `${index * 2 + 1}&${index * 2 + 2}`

const round2 = (n) => Math.round(n * 100) / 100
const roundQuarter = (hours) => Math.round(hours * 4) / 4

export const SCHOOL_TIME_ZONE = 'America/Toronto'

/** How far the given zone sits from UTC at that instant, in milliseconds. */
const zoneOffsetMs = (instant, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(instant)
    .reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {})
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  )
  return asUtc - instant.getTime()
}

/**
 * The instant at which the clock in `timeZone` reads hh:mm on the given day.
 *
 * Schedules are written in school time while check-ins are stored as UTC
 * instants, so comparing the two needs the offset for that particular date.
 * Applying the offset twice settles the answer across a daylight saving change.
 */
export const zonedTime = (date, hhmm, timeZone = SCHOOL_TIME_ZONE) => {
  const [h, m] = String(hhmm || '00:00')
    .split(':')
    .map(Number)
  const naive = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    Number.isFinite(h) ? h : 0,
    Number.isFinite(m) ? m : 0,
  )
  let instant = new Date(naive - zoneOffsetMs(new Date(naive), timeZone))
  instant = new Date(naive - zoneOffsetMs(instant, timeZone))
  return instant
}

/**
 * Hours for one person on one day.
 *
 * Roughly a quarter of days carry a check-in and no check-out, because staff
 * leave without tapping out. Those are completed from the schedule rather than
 * dropped, and flagged so the sheet can say which numbers were inferred.
 */
export const dayHours = ({ checkIn, checkOut, scheduledStart, scheduledEnd }) => {
  const scheduledHours = scheduledStart && scheduledEnd
    ? Math.max(0, (scheduledEnd - scheduledStart) / 3600000) : null
  const payable = (start, end) => {
    const rounded = roundQuarter(Math.max(0, (end - start) / 3600000))
    return scheduledHours == null ? rounded : Math.min(rounded, scheduledHours)
  }
  if (checkIn && checkOut) {
    return { hours: payable(checkIn, checkOut), inferred: false }
  }
  if (checkIn && scheduledEnd) {
    return {
      hours: payable(checkIn, scheduledEnd),
      inferred: true,
      reason: 'no check-out',
    }
  }
  if (checkOut && scheduledStart) {
    return {
      hours: payable(scheduledStart, checkOut),
      inferred: true,
      reason: 'no check-in',
    }
  }
  return { hours: null, inferred: false }
}

const isoDay = (d) => d.toISOString().slice(0, 10)

// Records carry a UTC instant; the school reads them in local time.
const localDayKey = (d, timeZone = 'America/Toronto') => d.toLocaleDateString('en-CA', { timeZone })

/**
 * Lay one person's fortnight out across the template's ten columns.
 *
 * @param {Object} args
 * @param {string} args.email
 * @param {number} args.periodIndex
 * @param {Array} args.records - { email, type: 'in'|'out', at: Date }
 * @param {Object} args.settings - the timekeeping settings document
 */
export const buildStaffTimesheet = ({ email, periodIndex, records, settings, timeZone, claims = [], commentDecisions = [], corrections = [] }) => {
  const days = periodWorkingDays(periodIndex)
  const wanted = new Map(days.map((d) => [isoDay(d), d]))
  const key = String(email || '')
    .trim()
    .toLowerCase()

  // Earliest check-in and latest check-out win, so a double tap cannot shrink a day.
  const byDay = new Map()
  records
    .filter(
      (r) =>
        String(r.email || '')
          .trim()
          .toLowerCase() === key && r.at,
    )
    .forEach((r) => {
      const dayId = timeZone === 'UTC' ? isoDay(r.at) : localDayKey(r.at, timeZone)
      if (!wanted.has(dayId)) return
      const cell = byDay.get(dayId) || {}
      if (r.type === 'in' && (!cell.in || r.at < cell.in)) cell.in = r.at
      if (r.type === 'out' && (!cell.out || r.at > cell.out)) cell.out = r.at
      byDay.set(dayId, cell)
    })

  const hours = []
  const inferred = []
  const prepAtHome = []
  const categoryHours = {}
  let total = 0
  const zone = timeZone && timeZone !== 'UTC' ? timeZone : SCHOOL_TIME_ZONE

  days.forEach((date) => {
    const cell = byDay.get(isoDay(date)) || {}
    // Period dates are UTC midnights; resolve weekday overrides using a local
    // noon on that calendar day so western time zones cannot pick yesterday.
    const scheduleDay = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12)
    const scheduled = resolveStaffSettings(settings, email, scheduleDay)
    const result = dayHours({
      checkIn: cell.in,
      checkOut: cell.out,
      scheduledStart: scheduled && scheduled.scheduled !== false ? zonedTime(date, scheduled.expectedCheckInTime, zone) : null,
      scheduledEnd: scheduled && scheduled.scheduled !== false ? zonedTime(date, scheduled.expectedCheckOutTime, zone) : null,
    })
    const dayClaims = claims.filter((claim) =>
      String(claim.email || '').trim().toLowerCase() === key && claim.date === isoDay(date),
    )
    const prepClaim = dayClaims.find((claim) => claim.category === 'prepAtHome')
    if (prepClaim && scheduled && scheduled.scheduled !== false) {
      const scheduledHours = round2(
        (zonedTime(date, scheduled.expectedCheckOutTime, zone) -
          zonedTime(date, scheduled.expectedCheckInTime, zone)) / 3600000,
      )
      if (scheduledHours > 0) {
        const workedHours = result.hours || 0
        result.hours = scheduledHours
        result.inferred = false
        prepAtHome.push({ date: isoDay(date), hours: scheduledHours,
          addedHours: round2(Math.max(0, scheduledHours - workedHours)), note: prepClaim.note || '' })
      }
    }
    dayClaims.forEach((claim) => {
      if (claim.category === 'prepAtHome' || !Number.isFinite(claim.hours) || claim.hours <= 0) return
      if (!categoryHours[claim.category]) categoryHours[claim.category] = Array(days.length).fill(null)
      const index = hours.length
      categoryHours[claim.category][index] = roundQuarter((categoryHours[claim.category][index] || 0) + claim.hours)
    })
    const correction = corrections.find((item) => item.status === 'approved' && String(item.email).toLowerCase() === key)?.rows
      .find((row) => row.date === isoDay(date) && row.hours != null)
    if (correction) {
      result.hours = correction.hours
      result.inferred = false
      // An approved explicit correction supersedes automatic prep top-up.
      const prepIndex = prepAtHome.findIndex((item) => item.date === isoDay(date))
      if (prepIndex >= 0) prepAtHome.splice(prepIndex, 1)
    }
    hours.push(result.hours)
    if (result.hours != null) total += result.hours
    if (result.inferred) {
      inferred.push({ date: isoDay(date), reason: result.reason, hours: result.hours })
    }
  })

  const extraTotal = Object.values(categoryHours).flat().reduce((sum, value) => sum + (value || 0), 0)
  return { email, periodIndex, days: days.map(isoDay), hours, categoryHours, inferred, prepAtHome,
    commentDecisions: commentDecisions.filter((decision) => String(decision.email || '').trim().toLowerCase() === key)
      .map((decision) => {
        const prep = prepAtHome.find((item) => item.date === decision.date)
        return prep && decision.resolution.startsWith('Applied prep at home')
          ? { ...decision, resolution: `Applied prep at home: added ${prep.addedHours} h to Main Role, total ${prep.hours} h (regular daily limit)` }
          : decision
      }),
    total: round2(total + extraTotal) }
}

const SCHOOL_YEAR = '26-27'

// Name fields carry stray and doubled spaces ("Choudhary , Hafsa"), which would
// otherwise reach the filename and the sheet itself.
const tidy = (v) => String(v || '').replace(/\s+/g, ' ').trim()

export const personDisplayName = (person) => {
  const last = tidy(person?.lastName)
  const first = tidy(person?.firstName)
  if (last && first) return `${last}, ${first}`
  return last || first || 'Unnamed'
}

export const timesheetFileName = (person, periodIndex) =>
  `${personDisplayName(person)} - TLA_TS_${SCHOOL_YEAR}_Weeks${periodLabel(periodIndex)}.xlsx`

/**
 * One person, one timesheet.
 *
 * Several staff have more than one faculty document under the same address
 * (Saima Qureshi and Hanaa Alanqar both do). Left alone they produce two
 * identical sheets that then collide on the same name inside the zip.
 */
export const dedupePeopleByEmail = (people) => {
  const seen = new Set()
  return (people || []).filter((p) => {
    const key = String(p?.email || '').trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}
