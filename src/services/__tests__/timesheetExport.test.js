import { describe, it, expect, vi } from 'vitest'

// timesheetExport reaches timekeepingSettings, which imports the Firebase app.
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'server-ts'),
}))
vi.mock('../../Firebase/firebase', () => ({ firestore: {} }))

import {
  PERIOD_ANCHOR,
  periodIndexFor,
  periodStartFor,
  periodWorkingDays,
  periodLabel,
  zonedTime,
  dayHours,
  buildStaffTimesheet,
  timesheetFileName,
  personDisplayName,
  dedupePeopleByEmail,
} from '../timesheetExport'

const utc = (y, m, d, hh = 0, mm = 0) => new Date(Date.UTC(y, m - 1, d, hh, mm))

describe('bi-weekly periods', () => {
  it('anchors on the Monday the template ships with', () => {
    expect(PERIOD_ANCHOR.toISOString().slice(0, 10)).toBe('2026-08-17')
  })

  it('puts the anchor fortnight at index 0', () => {
    expect(periodIndexFor(utc(2026, 8, 17))).toBe(0)
    expect(periodIndexFor(utc(2026, 8, 28))).toBe(0)
  })

  it('rolls to the next period after fourteen days', () => {
    expect(periodIndexFor(utc(2026, 8, 31))).toBe(1)
    expect(periodIndexFor(utc(2026, 9, 11))).toBe(1)
    expect(periodIndexFor(utc(2026, 9, 14))).toBe(2)
  })

  it('gives back the Monday a period starts on', () => {
    expect(periodStartFor(1).toISOString().slice(0, 10)).toBe('2026-08-31')
  })

  it('lists ten working days, skipping both weekends', () => {
    const days = periodWorkingDays(1).map((d) => d.toISOString().slice(0, 10))
    expect(days).toEqual([
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
    ])
  })

  it('numbers the weeks the way the template does', () => {
    expect(periodLabel(0)).toBe('1&2')
    expect(periodLabel(1)).toBe('3&4')
    expect(periodLabel(5)).toBe('11&12')
  })
})

describe('zonedTime', () => {
  it('reads a schedule time as school time, not UTC', () => {
    // 2 Sep 2026 is daylight time in Toronto, so 15:30 local is 19:30 UTC.
    expect(zonedTime(utc(2026, 9, 2), '15:30').toISOString()).toBe('2026-09-02T19:30:00.000Z')
  })

  it('follows the clock change into standard time', () => {
    // 2 Dec 2026 is standard time, so 15:30 local is 20:30 UTC.
    expect(zonedTime(utc(2026, 12, 2), '15:30').toISOString()).toBe('2026-12-02T20:30:00.000Z')
  })
})

describe('dayHours', () => {
  const start = zonedTime(utc(2026, 9, 2), '08:00')
  const end = zonedTime(utc(2026, 9, 2), '15:30')

  it('measures a complete day from the two stamps', () => {
    const r = dayHours({
      checkIn: zonedTime(utc(2026, 9, 2), '08:05'),
      checkOut: zonedTime(utc(2026, 9, 2), '16:08'),
      scheduledStart: start,
      scheduledEnd: end,
    })
    expect(r.hours).toBe(7.5) // nearest quarter-hour, capped at scheduled hours
    expect(r.inferred).toBe(false)
  })

  it('runs a missing check-out on to the scheduled finish', () => {
    const r = dayHours({
      checkIn: zonedTime(utc(2026, 9, 2), '08:00'),
      checkOut: null,
      scheduledStart: start,
      scheduledEnd: end,
    })
    expect(r.hours).toBe(7.5)
    expect(r.inferred).toBe(true)
    expect(r.reason).toBe('no check-out')
  })

  it('counts a late arrival from when they actually arrived', () => {
    // Arriving at 08:30 with a 15:30 finish is seven hours, not the full 7.5.
    const r = dayHours({
      checkIn: zonedTime(utc(2026, 9, 2), '08:30'),
      checkOut: null,
      scheduledStart: start,
      scheduledEnd: end,
    })
    expect(r.hours).toBe(7)
  })

  it('runs a missing check-in back to the scheduled start', () => {
    const r = dayHours({
      checkIn: null,
      checkOut: zonedTime(utc(2026, 9, 2), '15:30'),
      scheduledStart: start,
      scheduledEnd: end,
    })
    expect(r.hours).toBe(7.5)
    expect(r.reason).toBe('no check-in')
  })

  it('leaves a day with neither stamp blank', () => {
    expect(
      dayHours({ checkIn: null, checkOut: null, scheduledStart: start, scheduledEnd: end }).hours,
    ).toBeNull()
  })

  it('rounds a measured day to the nearest 15 minutes without a schedule', () => {
    const r = dayHours({
      checkIn: zonedTime(utc(2026, 9, 2), '08:00'),
      checkOut: zonedTime(utc(2026, 9, 2), '15:08'),
    })
    expect(r.hours).toBe(7.25)
  })

  it('never returns negative hours when someone arrived after their scheduled end', () => {
    const r = dayHours({
      checkIn: zonedTime(utc(2026, 9, 2), '17:00'),
      checkOut: null,
      scheduledStart: start,
      scheduledEnd: end,
    })
    expect(r.hours).toBe(0)
  })

  it('caps a long real day at scheduled hours', () => {
    // naheda.nour checked out at 21:23 after forgetting earlier.
    const r = dayHours({
      checkIn: zonedTime(utc(2026, 9, 3), '08:10'),
      checkOut: zonedTime(utc(2026, 9, 3), '21:23'),
      scheduledStart: start,
      scheduledEnd: end,
    })
    expect(r.hours).toBe(7.5)
    expect(r.inferred).toBe(false)
  })
})

describe('buildStaffTimesheet', () => {
  const settings = {
    expectedCheckInTime: '08:20',
    expectedCheckOutTime: '15:20',
    graceMinutes: 5,
    staffOverrides: {
      'rafia.husain@tarbiyahlearning.ca': {
        expectedCheckInTime: '08:00',
        expectedCheckOutTime: '15:30',
      },
    },
  }

  const at = (d, hhmm) => zonedTime(utc(2026, 9, d), hhmm)
  const records = [
    { email: 'rafia.husain@tarbiyahlearning.ca', type: 'in', at: at(2, '08:11') },
    { email: 'rafia.husain@tarbiyahlearning.ca', type: 'in', at: at(3, '08:03') },
    { email: 'rafia.husain@tarbiyahlearning.ca', type: 'in', at: at(4, '08:05') },
    { email: 'rafia.husain@tarbiyahlearning.ca', type: 'out', at: at(4, '15:35') },
  ]

  it('lays hours out across the ten columns in order', () => {
    const sheet = buildStaffTimesheet({
      email: 'rafia.husain@tarbiyahlearning.ca',
      periodIndex: 1,
      records,
      settings,
    })
    expect(sheet.hours).toHaveLength(10)
    expect(sheet.hours[0]).toBeNull() // Mon 31 Aug, nothing recorded
    expect(sheet.hours[2]).toBe(7.25) // Wed 2 Sep, rounded to nearest quarter-hour
    expect(sheet.hours[4]).toBe(7.5) // Fri 4 Sep, both stamps
  })

  it('reports every inferred day so the principal can see them', () => {
    const sheet = buildStaffTimesheet({
      email: 'rafia.husain@tarbiyahlearning.ca',
      periodIndex: 1,
      records,
      settings,
    })
    expect(sheet.inferred).toHaveLength(2)
    expect(sheet.inferred[0]).toMatchObject({ date: '2026-09-02', reason: 'no check-out' })
  })

  it('totals only what it placed', () => {
    const sheet = buildStaffTimesheet({
      email: 'rafia.husain@tarbiyahlearning.ca',
      periodIndex: 1,
      records,
      settings,
    })
    expect(sheet.total).toBe(7.25 + 7.5 + 7.5)
  })

  it('ignores records outside the period', () => {
    const sheet = buildStaffTimesheet({
      email: 'rafia.husain@tarbiyahlearning.ca',
      periodIndex: 0,
      records,
      settings,
    })
    expect(sheet.total).toBe(0)
  })
})

describe('timesheetFileName', () => {
  it('matches the naming the school already uses', () => {
    expect(timesheetFileName({ firstName: 'Rafia', lastName: 'Husain' }, 1)).toBe(
      'Husain, Rafia - TLA_TS_26-27_Weeks3&4.xlsx',
    )
  })

  it('copes with a missing name', () => {
    expect(timesheetFileName({ firstName: '', lastName: '' }, 0)).toBe(
      'Unnamed - TLA_TS_26-27_Weeks1&2.xlsx',
    )
  })
})

describe('dedupePeopleByEmail', () => {
  it('keeps one entry per address', () => {
    // Saima Qureshi holds two faculty documents under the same email.
    const people = [
      { email: 'saima.qureshi@tarbiyahlearning.ca', firstName: 'Saima', lastName: 'Qureshi' },
      { email: 'SAIMA.QURESHI@tarbiyahlearning.ca', firstName: 'Saima', lastName: ' Qureshi' },
      { email: 'awo.ahmed@tarbiyahlearning.ca', firstName: 'Awo', lastName: 'Ahmed' },
    ]
    expect(dedupePeopleByEmail(people)).toHaveLength(2)
  })

  it('drops anyone with no email, since they cannot be matched to check-ins', () => {
    expect(dedupePeopleByEmail([{ firstName: 'No', lastName: 'Email' }])).toHaveLength(0)
  })
})

describe('personDisplayName', () => {
  it('collapses the stray spaces sitting in the name fields', () => {
    expect(personDisplayName({ firstName: 'Hafsa', lastName: 'Choudhary ' })).toBe(
      'Choudhary, Hafsa',
    )
    expect(personDisplayName({ firstName: ' Rahaf', lastName: 'Hamad' })).toBe('Hamad, Rahaf')
  })
})
