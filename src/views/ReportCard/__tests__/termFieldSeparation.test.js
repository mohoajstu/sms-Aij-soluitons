import { describe, it, expect } from 'vitest'
import {
  getFieldTerm,
  separateTermFields,
  copyTerm1ToTerm2,
} from '../utils/termFieldSeparation'
import report1to6Fields from '../Fields/1-6-elementary-report.json'
import report7to8Fields from '../Fields/7-8-elementary-report.json'
import quranReportFields from '../Fields/quran-report.json'

const allFieldSources = [
  { id: '1-6-report', fields: report1to6Fields },
  { id: '7-8-report', fields: report7to8Fields },
  { id: 'quran-report', fields: quranReportFields },
]

const detectExpectedTerm = (fieldKey) => {
  const lowerKey = fieldKey.toLowerCase()
  if (lowerKey.includes('report1') || lowerKey.endsWith('report1')) {
    return 'term1'
  }
  if (lowerKey.includes('term1') || lowerKey.endsWith('term1')) {
    return 'term1'
  }
  if (lowerKey.includes('report2') || lowerKey.endsWith('report2')) {
    return 'term2'
  }
  if (lowerKey.includes('term2') || lowerKey.endsWith('term2')) {
    return 'term2'
  }
  return null
}

describe('termFieldSeparation', () => {
  it('detects term-specific field names for Report and Quran formats', () => {
    expect(getFieldTerm('languageMarkReport1')).toBe('term1')
    expect(getFieldTerm('languageMarkReport2')).toBe('term2')
    expect(getFieldTerm('hifdhTerm1')).toBe('term1')
    expect(getFieldTerm('hifdhterm2')).toBe('term2')
    expect(getFieldTerm('teacher')).toBe(null)
  })

  it('separates form data into shared and term-specific buckets', () => {
    const formData = {
      student: 'Jane Doe',
      languageMarkReport1: 'A',
      languageMarkReport2: 'B',
      hifdhTerm1: 'Excellent',
      hifdhTerm2: 'Good',
    }

    const term1 = separateTermFields(formData, 'term1')
    expect(term1.termData).toEqual({
      languageMarkReport1: 'A',
      hifdhTerm1: 'Excellent',
    })
    expect(term1.sharedData).toEqual({ student: 'Jane Doe' })

    const term2 = separateTermFields(formData, 'term2')
    expect(term2.termData).toEqual({
      languageMarkReport2: 'B',
      hifdhTerm2: 'Good',
    })
    expect(term2.sharedData).toEqual({ student: 'Jane Doe' })
  })

  it('copies Term 1 data into Term 2 keys while preserving case', () => {
    const result = copyTerm1ToTerm2({
      languageMarkReport1: 'A',
      languagemarkreport1: 'B',
      hifdhTerm1: 'Excellent',
      hifdhterm1: 'Good',
      student: 'Jane Doe',
    })

    expect(result.languageMarkReport2).toBe('A')
    expect(result.languagemarkreport2).toBe('B')
    expect(result.hifdhTerm2).toBe('Excellent')
    expect(result.hifdhterm2).toBe('Good')
    expect(result.student).toBe('Jane Doe')
  })

  it('matches term-specific fields declared in each report field set', () => {
    for (const source of allFieldSources) {
      const fieldEntries = Object.values(source.fields)

      fieldEntries.forEach((field) => {
        const formKey = field.formDataKey || field.name
        if (!formKey) return

        const expectedTerm = detectExpectedTerm(formKey)
        if (!expectedTerm) return

        const detectedTerm = getFieldTerm(formKey)
        expect(detectedTerm).toBe(
          expectedTerm,
        )

        if (field.term === 1) {
          expect(detectedTerm).toBe('term1')
        }
        if (field.term === 2) {
          expect(detectedTerm).toBe('term2')
        }
      })
    }
  })
})

