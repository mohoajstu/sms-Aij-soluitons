import { describe, it, expect } from 'vitest'
import { getReportYear, getReportTerm, matchesReportScope, draftDocumentId, assertDraftScope } from '../utils/reportScope'
const current = { label: '2026-2027', startDate: '2026-09-02' }
describe('report periods', () => {
  it('uses explicit year before dates and stable creation before modification for legacy reports', () => {
    expect(getReportYear({ schoolYear: '2025-2026', lastModified: '2026-10-23' }, current)).toBe('2025-2026')
    expect(getReportYear({ createdAt: '2026-06-15', lastModified: '2026-10-23' }, current)).toBe('2025-2026')
    expect(getReportYear({ createdAt: '2026-10-15' }, current)).toBe(current.label)
    expect(getReportYear({ createdAt: '2026-09-02' }, current)).toBe(current.label)
    expect(getReportYear({}, current)).toBe('unknown')
    expect(getReportYear({ lastModified: '2026-10-23' }, current)).toBe('unknown')
  })
  it('keeps ambiguous legacy terms separate instead of guessing', () => {
    expect(getReportTerm({ id: 'teacher_student_report_term2' })).toBe('term2')
    expect(getReportTerm({})).toBe('unknown')
    expect(matchesReportScope({ schoolYear: current.label }, current.label, 'term1', current)).toBe(false)
    expect(matchesReportScope({ schoolYear: current.label }, current.label, 'all', current)).toBe(true)
  })
  it('uses a shared draft identity isolated by school year and term', () => {
    const id = draftDocumentId('a', 'S1', 'kg-initial', 'term1', current.label)
    expect(id).toBe(draftDocumentId('b', 'S1', 'kg-initial', 'term1', current.label))
    expect(id).not.toBe(draftDocumentId('a', 'S1', 'kg-initial', 'term2', current.label))
    expect(id).not.toBe(draftDocumentId('a', 'S1', 'kg-initial', 'term1', '2025-2026'))
    expect(() => draftDocumentId('a', 'S1', 'kg-initial', 'term1', null)).toThrow()
  })
  it('rejects an existing draft from any different period or student', () => {
    const record = { studentId: 'S1', reportCardType: 'kg-initial', term: 'term1', schoolYear: current.label }
    const scope = { studentId: 'S1', type: 'kg-initial', term: 'term1', year: current.label, current }
    expect(() => assertDraftScope(record, scope)).not.toThrow()
    for (const patch of [{ studentId: 'S2' }, { schoolYear: '2025-2026' }, { term: 'term2' }]) {
      expect(() => assertDraftScope({ ...record, ...patch }, scope)).toThrow()
    }
  })
})
