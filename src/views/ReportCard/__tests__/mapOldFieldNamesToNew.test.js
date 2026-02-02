import { describe, it, expect } from 'vitest'
import { mapOldFieldNamesToNew } from '../utils/mapOldFieldNamesToNew'

describe('mapOldFieldNamesToNew', () => {
  it('maps language and native language comment variations both ways', () => {
    const input = {
      languageStrengthsAndStepsForImprovement: 'Language comment',
      nativeLanguageStrengthsAndNextStepsForImprovement: 'Arabic comment',
    }

    const mapped = mapOldFieldNamesToNew(input, '7-8-report-card')

    expect(mapped.languageStrengthsAndStepsForImprovement).toBe('Language comment')
    expect(mapped.languageStrengthsAndNextStepsForImprovement).toBe('Language comment')
    expect(mapped.nativeLanguageStrengthsAndStepsForImprovement).toBe('Arabic comment')
    expect(mapped.nativeLanguageStrengthsAndNextStepsForImprovement).toBe('Arabic comment')
  })

  it('maps attendance snake_case to camelCase', () => {
    const input = {
      days_absent: 3,
      total_days_absent: 10,
      times_late: 1,
      total_times_late: 2,
    }

    const mapped = mapOldFieldNamesToNew(input, '1-6-report-card')

    expect(mapped.daysAbsent).toBe(3)
    expect(mapped.totalDaysAbsent).toBe(10)
    expect(mapped.timesLate).toBe(1)
    expect(mapped.totalTimesLate).toBe(2)
  })
})
