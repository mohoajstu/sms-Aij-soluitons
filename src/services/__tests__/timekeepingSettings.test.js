import { describe, it, expect, vi } from 'vitest'

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'server-ts'),
}))
vi.mock('../../Firebase/firebase', () => ({ firestore: {} }))

import {
  resolveStaffSettings,
  computeStatus,
  defaultTimekeepingSettings,
} from '../timekeepingSettings'

const baseSettings = () => ({
  ...defaultTimekeepingSettings(),
  expectedCheckInTime: '08:00',
  expectedCheckOutTime: '16:00',
  graceMinutes: 10,
  staffOverrides: {
    'parttime@school.ca': {
      expectedCheckInTime: '12:30',
      expectedCheckOutTime: '15:30',
    },
    'strict@school.ca': { graceMinutes: 0 },
  },
})

describe('resolveStaffSettings', () => {
  it('returns global settings when the teacher has no override', () => {
    const resolved = resolveStaffSettings(baseSettings(), 'fulltime@school.ca')
    expect(resolved.expectedCheckInTime).toBe('08:00')
    expect(resolved.expectedCheckOutTime).toBe('16:00')
    expect(resolved.graceMinutes).toBe(10)
  })

  it('returns global settings when email is missing', () => {
    const resolved = resolveStaffSettings(baseSettings(), null)
    expect(resolved.expectedCheckInTime).toBe('08:00')
  })

  it('applies only the overridden fields', () => {
    const resolved = resolveStaffSettings(baseSettings(), 'parttime@school.ca')
    expect(resolved.expectedCheckInTime).toBe('12:30')
    expect(resolved.expectedCheckOutTime).toBe('15:30')
    expect(resolved.graceMinutes).toBe(10)
  })

  it('honors a zero-minute grace override', () => {
    const resolved = resolveStaffSettings(baseSettings(), 'strict@school.ca')
    expect(resolved.graceMinutes).toBe(0)
    expect(resolved.expectedCheckInTime).toBe('08:00')
  })

  it('matches emails case-insensitively and ignores surrounding whitespace', () => {
    const resolved = resolveStaffSettings(baseSettings(), '  PartTime@School.CA ')
    expect(resolved.expectedCheckInTime).toBe('12:30')
  })

  it('leaves geofence fields untouched', () => {
    const settings = baseSettings()
    const resolved = resolveStaffSettings(settings, 'parttime@school.ca')
    expect(resolved.latitude).toBe(settings.latitude)
    expect(resolved.longitude).toBe(settings.longitude)
    expect(resolved.radiusMeters).toBe(settings.radiusMeters)
  })

  it('falls back to defaults when settings are null', () => {
    const resolved = resolveStaffSettings(null, 'anyone@school.ca')
    expect(resolved.expectedCheckInTime).toBe(defaultTimekeepingSettings().expectedCheckInTime)
  })
})

describe('computeStatus with a resolved part-time schedule', () => {
  const resolved = () => resolveStaffSettings(baseSettings(), 'parttime@school.ca')

  it('marks a check-in inside the grace window on-time', () => {
    const status = computeStatus({
      type: 'in',
      when: new Date('2026-08-21T12:39:00'),
      settings: resolved(),
    })
    expect(status).toBe('on-time')
  })

  it('marks a check-in after the grace window late', () => {
    const status = computeStatus({
      type: 'in',
      when: new Date('2026-08-21T12:41:00'),
      settings: resolved(),
    })
    expect(status).toBe('late')
  })

  it('marks a check-out before the personal end time as early departure', () => {
    const status = computeStatus({
      type: 'out',
      when: new Date('2026-08-21T15:00:00'),
      settings: resolved(),
    })
    expect(status).toBe('early-departure')
  })

  it('marks a check-out at the personal end time on-time', () => {
    const status = computeStatus({
      type: 'out',
      when: new Date('2026-08-21T15:30:00'),
      settings: resolved(),
    })
    expect(status).toBe('on-time')
  })

  it('shows on-time for a check-out inside grace and early after it', () => {
    expect(computeStatus({
      type: 'out', when: new Date('2026-08-21T15:20:00'), settings: resolved(),
    })).toBe('on-time')
    expect(computeStatus({
      type: 'out', when: new Date('2026-08-21T15:19:00'), settings: resolved(),
    })).toBe('early-departure')
  })
})

// Some staff work different hours on different days. A per-day entry beats the
// staff's own default, which in turn beats the school default.
const dayScheduleSettings = () => ({
  ...defaultTimekeepingSettings(),
  expectedCheckInTime: '08:00',
  expectedCheckOutTime: '16:00',
  graceMinutes: 10,
  staffOverrides: {
    'aisha@school.ca': {
      expectedCheckInTime: '11:30',
      expectedCheckOutTime: '14:00',
      days: {
        tue: { expectedCheckInTime: '08:00', expectedCheckOutTime: '15:00' },
        wed: { expectedCheckOutTime: '12:00' },
        fri: { off: true },
      },
    },
    'everyday@school.ca': { expectedCheckInTime: '09:00' },
  },
})

// 2026-09-07 is a Monday, so this week runs Mon 07 through Sun 13.
const MON = new Date('2026-09-07T09:00:00')
const TUE = new Date('2026-09-08T09:00:00')
const WED = new Date('2026-09-09T09:00:00')
const FRI = new Date('2026-09-11T09:00:00')

describe('resolveStaffSettings with per-day hours', () => {
  it('uses the staff default on a day with no entry', () => {
    const r = resolveStaffSettings(dayScheduleSettings(), 'aisha@school.ca', MON)
    expect(r.expectedCheckInTime).toBe('11:30')
    expect(r.expectedCheckOutTime).toBe('14:00')
  })

  it('uses the per-day hours when that day is configured', () => {
    const r = resolveStaffSettings(dayScheduleSettings(), 'aisha@school.ca', TUE)
    expect(r.expectedCheckInTime).toBe('08:00')
    expect(r.expectedCheckOutTime).toBe('15:00')
  })

  it('lets a day override just one of the two times', () => {
    const r = resolveStaffSettings(dayScheduleSettings(), 'aisha@school.ca', WED)
    expect(r.expectedCheckInTime).toBe('11:30')
    expect(r.expectedCheckOutTime).toBe('12:00')
  })

  it('reports a day marked off as not scheduled', () => {
    const r = resolveStaffSettings(dayScheduleSettings(), 'aisha@school.ca', FRI)
    expect(r.scheduled).toBe(false)
  })

  it('reports an ordinary working day as scheduled', () => {
    expect(resolveStaffSettings(dayScheduleSettings(), 'aisha@school.ca', MON).scheduled).toBe(true)
  })

  it('keeps working for staff with no per-day entries at all', () => {
    const r = resolveStaffSettings(dayScheduleSettings(), 'everyday@school.ca', TUE)
    expect(r.expectedCheckInTime).toBe('09:00')
    expect(r.expectedCheckOutTime).toBe('16:00')
    expect(r.scheduled).toBe(true)
  })

  it('ignores per-day hours when no date is supplied', () => {
    const r = resolveStaffSettings(dayScheduleSettings(), 'aisha@school.ca')
    expect(r.expectedCheckInTime).toBe('11:30')
    expect(r.expectedCheckOutTime).toBe('14:00')
  })

  it('inherits a per-day grace override', () => {
    const s = dayScheduleSettings()
    s.staffOverrides['aisha@school.ca'].days.tue.graceMinutes = 0
    expect(resolveStaffSettings(s, 'aisha@school.ca', TUE).graceMinutes).toBe(0)
  })
})

describe('computeStatus on an unscheduled day', () => {
  it('does not call a check-in late when the person is not due in', () => {
    const settings = resolveStaffSettings(dayScheduleSettings(), 'aisha@school.ca', FRI)
    const status = computeStatus({ type: 'in', when: FRI, settings })
    expect(status).toBe('unscheduled')
  })

  it('does not call a check-out early when the person is not due in', () => {
    const settings = resolveStaffSettings(dayScheduleSettings(), 'aisha@school.ca', FRI)
    const status = computeStatus({ type: 'out', when: FRI, settings })
    expect(status).toBe('unscheduled')
  })

  it('still judges a normal day normally', () => {
    const settings = resolveStaffSettings(dayScheduleSettings(), 'aisha@school.ca', TUE)
    const late = computeStatus({ type: 'in', when: new Date('2026-09-08T08:11:00'), settings })
    expect(late).toBe('late')
  })
})
