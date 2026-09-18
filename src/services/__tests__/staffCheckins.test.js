import { describe, it, expect, vi } from 'vitest'

vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(() => 'server-ts'),
  where: vi.fn(),
}))
vi.mock('../../Firebase/firebase', () => ({ firestore: {} }))

import {
  isExcused,
  effectiveStatus,
  isViolation,
  formatRecordStatusLabel,
  formatStatusLabel,
} from '../staffCheckins'

const record = (overrides) => ({
  type: 'in',
  status: 'on-time',
  inRange: true,
  notes: '',
  excused: false,
  ...overrides,
})

describe('isExcused', () => {
  it('is false for a clean record', () => {
    expect(isExcused(record())).toBe(false)
  })

  it('is false for a flagged record with no note', () => {
    expect(isExcused(record({ status: 'late' }))).toBe(false)
  })

  it('is true when the check-in was saved with an explanation', () => {
    expect(isExcused(record({ status: 'late', excused: true, notes: 'prep at home' }))).toBe(true)
  })

  it('falls back to the note for records written before the excuse rule', () => {
    const legacy = { status: 'early-departure', inRange: true, notes: 'marking at home' }
    expect(isExcused(legacy)).toBe(true)
  })

  it('ignores a whitespace-only note on a legacy record', () => {
    expect(isExcused({ status: 'late', notes: '   ' })).toBe(false)
  })

  it('is false for a missing record', () => {
    expect(isExcused(null)).toBe(false)
  })
})

describe('effectiveStatus', () => {
  it('reports an explained late arrival as on time', () => {
    expect(effectiveStatus(record({ status: 'late', excused: true, notes: 'prep at home' }))).toBe(
      'on-time',
    )
  })

  it('leaves an unexplained early departure flagged', () => {
    expect(effectiveStatus(record({ type: 'out', status: 'early-departure' }))).toBe(
      'early-departure',
    )
  })
})

describe('isViolation', () => {
  it('flags an unexplained late arrival', () => {
    expect(isViolation(record({ status: 'late' }))).toBe(true)
  })

  it('flags an unexplained out-of-range check-in', () => {
    expect(isViolation(record({ inRange: false }))).toBe(true)
  })

  it('clears a late arrival that carries a note', () => {
    expect(isViolation(record({ status: 'late', excused: true, notes: 'prep at home' }))).toBe(
      false,
    )
  })

  it('clears an off-site check-in that carries a note', () => {
    expect(
      isViolation(record({ inRange: false, excused: true, notes: 'prep at home this morning' })),
    ).toBe(false)
  })
})

describe('formatRecordStatusLabel', () => {
  it('names an explained record as on time with the note flagged', () => {
    expect(
      formatRecordStatusLabel(record({ status: 'late', excused: true, notes: 'prep at home' })),
    ).toBe('On time (noted)')
  })

  it('keeps the plain label for an on-time record with a note', () => {
    expect(formatRecordStatusLabel(record({ notes: 'ran a club' }))).toBe('On time')
  })

  it('keeps the flag when there is no note', () => {
    expect(formatRecordStatusLabel(record({ type: 'out', status: 'early-departure' }))).toBe(
      'Early departure',
    )
  })

  it('matches formatStatusLabel for an unexplained record', () => {
    const r = record({ status: 'late' })
    expect(formatRecordStatusLabel(r)).toBe(formatStatusLabel(r.status))
  })
})
