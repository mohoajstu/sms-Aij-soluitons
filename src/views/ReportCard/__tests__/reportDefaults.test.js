import { describe, expect, it } from 'vitest'
import {
  FORMAL_REPORT_DATE,
  applyDefaultReportDate,
  applyKindergartenDefaultsForGrade,
  getDefaultReportDate,
} from '../utils/reportDefaults'

describe('reportDefaults', () => {
  it('uses June 25, 2026 for Quran and formal grade reports', () => {
    expect(getDefaultReportDate('quran-report', '2026-01-01', '2026-05-21')).toBe(FORMAL_REPORT_DATE)
    expect(getDefaultReportDate('1-6-report-card', '2026-01-01', '2026-05-21')).toBe(FORMAL_REPORT_DATE)
    expect(getDefaultReportDate('7-8-report-card', '2026-01-01', '2026-05-21')).toBe(FORMAL_REPORT_DATE)
  })

  it('does not force the June date onto other report types', () => {
    expect(getDefaultReportDate('kg-report', '2026-01-01', '2026-05-21')).toBe('2026-01-01')
    expect(getDefaultReportDate('1-6-progress', '', '2026-05-21')).toBe('2026-05-21')
  })

  it('overwrites stale formal report dates', () => {
    const result = applyDefaultReportDate({ date: '2026-05-21' }, 'quran-report', '', '2026-05-21')
    expect(result.date).toBe(FORMAL_REPORT_DATE)
  })

  it('sets JK to year 1 and Kindergarten Year 2 placement', () => {
    const result = applyKindergartenDefaultsForGrade({ grade: 'JK' })
    expect(result.year1).toBe(true)
    expect(result.year2).toBe(false)
    expect(result.placementInSeptemberKG2).toBe(true)
    expect(result.placementInSeptemberGrade1).toBe(false)
  })

  it('sets SK to year 2 and Grade 1 placement', () => {
    const result = applyKindergartenDefaultsForGrade({ grade: 'Senior Kindergarten' })
    expect(result.year1).toBe(false)
    expect(result.year2).toBe(true)
    expect(result.placementInSeptemberKG2).toBe(false)
    expect(result.placementInSeptemberGrade1).toBe(true)
  })
})
