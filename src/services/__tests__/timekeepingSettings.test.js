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
})
