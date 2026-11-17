import { getReportYear, getReportTerm, UNKNOWN_YEAR } from '../ReportCard/utils/reportScope'

const timestamp = (value) => {
  if (value == null) return 0
  const date = value?.toDate ? value.toDate() : new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

// A revision replaces only the same report in the same reporting period.
export const groupParentReports = (records, currentYear) => {
  const latest = new Map()
  for (const record of records) {
    if (!record.url) continue
    const year = getReportYear(record, currentYear)
    const term = getReportTerm(record)
    const typeId = record.reportCardType || record.type || record.reportCardTypeName || 'unknown'
    const key = JSON.stringify([year, term, typeId])
    const approvedAt = timestamp(record.approvedAt) || timestamp(record.createdAt)
    const report = {
      ...record, year, term, typeId, approvedAt,
      name: record.reportCardTypeName || record.type || 'Report Card',
    }
    if (!latest.has(key) || approvedAt > latest.get(key).approvedAt) latest.set(key, report)
  }
  const years = new Map([[currentYear.label, []]])
  for (const report of latest.values()) {
    if (!years.has(report.year)) years.set(report.year, [])
    years.get(report.year).push(report)
  }
  return [...years].sort(([a], [b]) => {
    if (a === b) return 0
    if (a === currentYear.label) return -1
    if (b === currentYear.label) return 1
    if (a === UNKNOWN_YEAR) return 1
    if (b === UNKNOWN_YEAR) return -1
    return b.localeCompare(a)
  }).map(([year, reports]) => ({
    year, current: year === currentYear.label,
    reports: reports.sort((a, b) => b.approvedAt - a.approvedAt),
  }))
}

export const parentReportTermLabel = (term) =>
  term === 'term1' ? 'Term 1' : term === 'term2' ? 'Term 2' : 'Term not recorded'
