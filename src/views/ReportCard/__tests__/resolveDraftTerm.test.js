import { describe, it, expect } from 'vitest'
import { resolveDraftTerm } from '../utils/resolveDraftTerm'

describe('resolveDraftTerm', () => {
  it('prefers an explicit valid stored term', () => {
    expect(resolveDraftTerm('term2', 'uid_stu_1-6-report-card_term1')).toBe('term2')
    expect(resolveDraftTerm('term1', 'uid_stu_1-6-report-card_term2')).toBe('term1')
  })

  it('falls back to the term encoded in the draft id when no stored term', () => {
    expect(resolveDraftTerm(null, 'uid_stu_1-6-report-card_term2')).toBe('term2')
    expect(resolveDraftTerm(undefined, 'uid_stu_1-6-report-card_term1')).toBe('term1')
    expect(resolveDraftTerm('', 'abc_def_7-8-report-card_term2')).toBe('term2')
  })

  it('ignores invalid stored term values and uses the id suffix', () => {
    expect(resolveDraftTerm('garbage', 'uid_stu_1-6-report-card_term2')).toBe('term2')
  })

  it('defaults to term1 when neither source is conclusive', () => {
    expect(resolveDraftTerm(null, 'legacy-draft-id-without-term')).toBe('term1')
    expect(resolveDraftTerm(null, null)).toBe('term1')
    expect(resolveDraftTerm(undefined, undefined)).toBe('term1')
  })
})
