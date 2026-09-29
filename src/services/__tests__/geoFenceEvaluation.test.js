import { describe, it, expect, vi } from 'vitest'

vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  where: vi.fn(),
}))
vi.mock('../../Firebase/firebase', () => ({ firestore: {} }))

import { evaluateFence, isViolation, statusWithinGrace } from '../staffCheckins'

const RADIUS = 200

describe('evaluateFence', () => {
  it('confirms a tight fix well inside the fence', () => {
    // Typical good check-in: 8m away, 11m accuracy.
    const r = evaluateFence({
      distanceMeters: 8,
      accuracy: 11.4,
      radiusMeters: RADIUS,
      enabled: true,
    })
    expect(r).toEqual({ inRange: true, certainty: 'confirmed' })
  })

  it('confirms when distance plus accuracy still fits inside the fence', () => {
    // nadia.mirza: 52m out with a 147m accuracy circle, worst case 199m.
    const r = evaluateFence({
      distanceMeters: 52,
      accuracy: 147,
      radiusMeters: RADIUS,
      enabled: true,
    })
    expect(r.certainty).toBe('confirmed')
  })

  it('does not call a fix outside when its accuracy is wider than the fence', () => {
    // iyad.futainah, in the hallway: 1229m reported, plus or minus 2000m.
    const r = evaluateFence({
      distanceMeters: 1229,
      accuracy: 2000,
      radiusMeters: RADIUS,
      enabled: true,
    })
    expect(r.inRange).toBe(true)
    expect(r.certainty).toBe('uncertain')
  })

  it('still flags a precise fix that is genuinely far away', () => {
    // filiz.camlibel: 8732m out with 14.8m accuracy. No doubt about it.
    const r = evaluateFence({
      distanceMeters: 8732,
      accuracy: 14.807,
      radiusMeters: RADIUS,
      enabled: true,
    })
    expect(r).toEqual({ inRange: false, certainty: 'outside' })
  })

  it('still flags a tight fix a few hundred metres out', () => {
    // tasneem.shaikhali: 981m out, 4m accuracy.
    const r = evaluateFence({
      distanceMeters: 981,
      accuracy: 4.09,
      radiusMeters: RADIUS,
      enabled: true,
    })
    expect(r.inRange).toBe(false)
  })

  it('treats a missing accuracy as no margin', () => {
    const r = evaluateFence({
      distanceMeters: 500,
      accuracy: null,
      radiusMeters: RADIUS,
      enabled: true,
    })
    expect(r).toEqual({ inRange: false, certainty: 'outside' })
  })

  it('passes everything when the fence is off', () => {
    const r = evaluateFence({
      distanceMeters: 999999,
      accuracy: 5,
      radiusMeters: RADIUS,
      enabled: false,
    })
    expect(r.inRange).toBe(true)
    expect(r.certainty).toBe('disabled')
  })

  it('does not fail a check-in when the distance could not be computed', () => {
    const r = evaluateFence({
      distanceMeters: null,
      accuracy: 10,
      radiusMeters: RADIUS,
      enabled: true,
    })
    expect(r.inRange).toBe(true)
    expect(r.certainty).toBe('unknown')
  })
})

describe('isViolation', () => {
  it('flags a record that is genuinely outside the fence', () => {
    expect(isViolation({ inRange: false, status: 'on-time' })).toBe(true)
  })

  it('does not flag an on-time record whose fix was merely imprecise', () => {
    expect(isViolation({ inRange: true, locationCertainty: 'uncertain', status: 'on-time' })).toBe(
      false,
    )
  })

  it('still flags a late record', () => {
    expect(isViolation({ inRange: true, status: 'late' })).toBe(true)
  })
})

describe('isViolation on an unscheduled day', () => {
  it('does not flag a check-in made on a day the person was not due in', () => {
    expect(isViolation({ inRange: true, status: 'unscheduled' })).toBe(false)
  })

  it('still flags one made outside the fence', () => {
    expect(isViolation({ inRange: false, status: 'unscheduled' })).toBe(true)
  })
})

describe('stored check-in status within grace', () => {
  it('shows an older early-departure record as on-time inside the window', () => {
    expect(statusWithinGrace({
      status: 'early-departure', expectedTime: '16:00', graceMinutes: 10,
      clientCreatedAt: '2026-09-24T19:55:00.000Z',
    })).toBe('on-time')
    expect(statusWithinGrace({
      status: 'early-departure', expectedTime: '16:00', graceMinutes: 10,
      clientCreatedAt: '2026-09-24T19:49:00.000Z',
    })).toBe('early-departure')
  })
})
