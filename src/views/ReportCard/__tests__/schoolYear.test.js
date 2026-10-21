import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetDoc = vi.fn()
const mockSetDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  doc: (...args) => ({ path: args.slice(1).join('/') }),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
}))

import {
  computeDefaultSchoolYear,
  fetchSchoolYearSettings,
  isOnOrAfterSchoolYearStart,
  isFromCurrentSchoolYear,
} from '../utils/schoolYear'

const fakeTimestamp = (isoString) => ({ toDate: () => new Date(isoString) })
const CURRENT = { label: '2026-2027', startDate: '2026-09-02' }

describe('computeDefaultSchoolYear', () => {
  it('uses the current calendar year once Sept 2 has passed', () => {
    expect(computeDefaultSchoolYear(new Date(2026, 9, 21))).toEqual({
      label: '2026-2027',
      startDate: '2026-09-02',
    })
  })

  it('treats Sept 2 itself as the first day of the new year', () => {
    expect(computeDefaultSchoolYear(new Date(2026, 8, 2)).label).toBe('2026-2027')
  })

  it('still uses the previous year on Sept 1 and in the spring', () => {
    expect(computeDefaultSchoolYear(new Date(2026, 8, 1)).label).toBe('2025-2026')
    expect(computeDefaultSchoolYear(new Date(2027, 2, 15))).toEqual({
      label: '2026-2027',
      startDate: '2026-09-02',
    })
  })
})

describe('fetchSchoolYearSettings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns saved settings when an admin has configured them', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ label: '2026-2027', startDate: '2026-09-03' }),
    })
    await expect(fetchSchoolYearSettings({})).resolves.toEqual({
      label: '2026-2027',
      startDate: '2026-09-03',
    })
  })

  it('falls back to the computed default when nothing is saved', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false })
    const result = await fetchSchoolYearSettings({})
    expect(result).toEqual(computeDefaultSchoolYear())
  })

  it('falls back to the computed default when the read fails, instead of throwing', async () => {
    mockGetDoc.mockRejectedValue(new Error('permission-denied'))
    const result = await fetchSchoolYearSettings({})
    expect(result).toEqual(computeDefaultSchoolYear())
  })
})

describe('isOnOrAfterSchoolYearStart', () => {
  it('accepts Firestore Timestamps, Dates, and ISO strings', () => {
    expect(isOnOrAfterSchoolYearStart(fakeTimestamp('2026-10-01T12:00:00Z'), '2026-09-02')).toBe(
      true,
    )
    expect(isOnOrAfterSchoolYearStart(new Date('2026-10-01T12:00:00Z'), '2026-09-02')).toBe(true)
    expect(isOnOrAfterSchoolYearStart('2026-10-01', '2026-09-02')).toBe(true)
  })

  it('rejects dates before the start of the school year', () => {
    expect(isOnOrAfterSchoolYearStart(fakeTimestamp('2026-06-20T12:00:00Z'), '2026-09-02')).toBe(
      false,
    )
  })

  it('rejects missing or unparseable values rather than throwing', () => {
    expect(isOnOrAfterSchoolYearStart(null, '2026-09-02')).toBe(false)
    expect(isOnOrAfterSchoolYearStart('not a date', '2026-09-02')).toBe(false)
    expect(isOnOrAfterSchoolYearStart(new Date(), '')).toBe(false)
  })
})

describe('isFromCurrentSchoolYear', () => {
  it('trusts an explicit schoolYear tag over timestamps', () => {
    expect(
      isFromCurrentSchoolYear(
        { schoolYear: '2026-2027', lastModified: fakeTimestamp('2020-01-01T00:00:00Z') },
        CURRENT,
      ),
    ).toBe(true)
    // An old draft someone touched this year is still last year's.
    expect(
      isFromCurrentSchoolYear(
        { schoolYear: '2025-2026', lastModified: fakeTimestamp('2026-10-01T00:00:00Z') },
        CURRENT,
      ),
    ).toBe(false)
  })

  it('keeps untagged drafts worked on this year (pre-existing current-year work)', () => {
    expect(
      isFromCurrentSchoolYear(
        {
          createdAt: fakeTimestamp('2025-11-01T00:00:00Z'),
          lastModified: fakeTimestamp('2026-10-15T00:00:00Z'),
        },
        CURRENT,
      ),
    ).toBe(true)
  })

  it('rejects untagged drafts last touched in a prior year (the Grade 8 carryover case)', () => {
    expect(
      isFromCurrentSchoolYear(
        {
          createdAt: fakeTimestamp('2025-11-01T00:00:00Z'),
          lastModified: fakeTimestamp('2026-06-20T00:00:00Z'),
        },
        CURRENT,
      ),
    ).toBe(false)
  })

  it('falls back to createdAt when lastModified is missing (completed reportCards docs)', () => {
    expect(
      isFromCurrentSchoolYear({ createdAt: fakeTimestamp('2026-12-10T00:00:00Z') }, CURRENT),
    ).toBe(true)
    expect(
      isFromCurrentSchoolYear({ createdAt: fakeTimestamp('2026-01-10T00:00:00Z') }, CURRENT),
    ).toBe(false)
  })

  it('ignores a null tag written before settings finished loading', () => {
    expect(
      isFromCurrentSchoolYear(
        { schoolYear: null, lastModified: fakeTimestamp('2026-10-15T00:00:00Z') },
        CURRENT,
      ),
    ).toBe(true)
  })
})
