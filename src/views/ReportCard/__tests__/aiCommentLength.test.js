import { describe, it, expect } from 'vitest'
import { fitTextToLimit } from '../utils/characterLimits'
import { createUserPrompt } from '../../../services/reportCardAI'

describe('fitTextToLimit', () => {
  it('leaves text that already fits untouched', () => {
    expect(fitTextToLimit('Great effort this term.', 150)).toBe('Great effort this term.')
  })

  it('handles empty input and a missing limit', () => {
    expect(fitTextToLimit('', 150)).toBe('')
    expect(fitTextToLimit(undefined, 150)).toBe('')
    expect(fitTextToLimit('Some text', undefined)).toBe('Some text')
  })

  it('cuts at the last full sentence that fits', () => {
    const text =
      'Ali reads fluently and with expression. He should practise summarizing longer chapters each week.'
    expect(fitTextToLimit(text, 60)).toBe('Ali reads fluently and with expression.')
  })

  it('falls back to a word boundary when no sentence ends late enough', () => {
    const result = fitTextToLimit(
      'Ali consistently participates in discussions and shares thoughtful ideas',
      40,
    )
    expect(result.length).toBeLessThanOrEqual(40)
    expect(result).toBe('Ali consistently participates in')
  })

  it('never exceeds the limit', () => {
    const long = 'Strong work. '.repeat(50)
    ;[90, 150, 250].forEach((limit) => {
      expect(fitTextToLimit(long, limit).length).toBeLessThanOrEqual(limit)
    })
  })
})

describe('AI prompt length instruction', () => {
  const base = {
    studentName: 'Noora',
    gradeLevel: '4',
    reportType: 'Elementary 1-6 Progress Report',
  }

  it('tells the model the field limit when one is given', () => {
    expect(createUserPrompt({ ...base, maxChars: 150 })).toMatch(/at most 150 characters/)
  })

  it('adds no length instruction when no limit is given', () => {
    expect(createUserPrompt(base)).not.toMatch(/characters \(including spaces\)/)
  })
})
