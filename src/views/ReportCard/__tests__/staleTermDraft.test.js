import { describe, it, expect } from 'vitest'
import { isStaleTerm2Draft, REPORT_TYPES_WITH_TERM_FIELDS } from '../utils/staleTermDraft'

const term1Field = 'languageMarkReport1'
const term2Field = 'languageMarkReport2'
const sharedField = 'sans2Language'

describe('isStaleTerm2Draft', () => {
  it('is never stale for Term 1 loads', () => {
    expect(
      isStaleTerm2Draft({
        term: 'term1',
        reportType: '1-6-report-card',
        formData: { [sharedField]: 'hi' },
        studentHasTerm1: true,
      }),
    ).toBe(false)
  })

  it('is never stale for report types without term fields', () => {
    expect(
      isStaleTerm2Draft({
        term: 'term2',
        reportType: 'kg-initial',
        formData: { [sharedField]: 'hi' },
        studentHasTerm1: true,
      }),
    ).toBe(false)
  })

  it('is stale when no Term 1 fields AND the student has Term 1 data (legacy pre-carryover draft)', () => {
    expect(
      isStaleTerm2Draft({
        term: 'term2',
        reportType: '1-6-report-card',
        formData: { [term2Field]: 'B', [sharedField]: 'comment' },
        studentHasTerm1: true,
      }),
    ).toBe(true)
  })

  it('is NOT stale for a legitimate no-Term-1 student (joined in Term 2)', () => {
    expect(
      isStaleTerm2Draft({
        term: 'term2',
        reportType: '1-6-report-card',
        formData: { [term2Field]: 'B', [sharedField]: 'comment' },
        studentHasTerm1: false,
      }),
    ).toBe(false)
  })

  it('is NOT stale when Term 1 fields are present (carried forward)', () => {
    expect(
      isStaleTerm2Draft({
        term: 'term2',
        reportType: '1-6-report-card',
        formData: { [term1Field]: 'A', [term2Field]: 'B' },
        studentHasTerm1: true,
      }),
    ).toBe(false)
  })

  it('exposes the term-field report types', () => {
    expect(REPORT_TYPES_WITH_TERM_FIELDS).toContain('1-6-report-card')
    expect(REPORT_TYPES_WITH_TERM_FIELDS).toContain('7-8-report-card')
    expect(REPORT_TYPES_WITH_TERM_FIELDS).toContain('quran-report')
  })
})
