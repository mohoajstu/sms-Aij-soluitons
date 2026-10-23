export const UNKNOWN_YEAR = 'unknown'
export const UNKNOWN_TERM = 'unknown'
const asDate = (value) => value?.toDate ? value.toDate() : new Date(value)
export const getReportYear = (record, current) => {
  if (record.schoolYear) return record.schoolYear
  // Creation is stable; approvals and metadata edits must not move a legacy report into a new year.
  const stamp = record.createdAt || (record.status === 'draft' ? null : record.createdAtMs) || record.completedAt
  if (!stamp) return UNKNOWN_YEAR
  const date = asDate(stamp)
  if (Number.isNaN(date.getTime())) return UNKNOWN_YEAR
  const iso = typeof stamp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(stamp)
    ? stamp : date.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
  const start = Number(iso.slice(0, 4)) - (iso.slice(5) < '09-02' ? 1 : 0)
  if (current && iso >= current.startDate && iso < `${Number(current.label.slice(0, 4)) + 1}-09-02`) return current.label
  return `${start}-${start + 1}`
}
export const getReportTerm = (record) => {
  if (['term1', 'term2'].includes(record.term)) return record.term
  const match = String(record.id || '').match(/_(term[12])$/)
  return match?.[1] || UNKNOWN_TERM
}
export const matchesReportScope = (record, year, term, current) =>
  getReportYear(record, current) === year && (term === 'all' || getReportTerm(record) === term)
export const draftDocumentId = (uid, studentId, type, term, year) => {
  if (!uid || !studentId || !type || !['term1', 'term2'].includes(term) || !/^\d{4}-\d{4}$/.test(year || '')) {
    throw new Error('A student, report type, school year and term are required before saving.')
  }
  return `${studentId}_${type}_${year}_${term}`
}
export const assertDraftScope = (record, { studentId, type, term, year, current }) => {
  if ((record.studentId || record.selectedStudent?.id) !== studentId || record.reportCardType !== type ||
      !matchesReportScope(record, year, term, current)) {
    throw new Error('This draft belongs to a different student, school year or term. Reopen the correct report before saving.')
  }
}
