import { zonedTime } from './timesheetExport'
export const approvedCorrectionFor = (correction, approveCurrent = false) => {
  const approved = approveCurrent ? { revision: correction.revision, rows: correction.rows }
    : correction.approved || (correction.status === 'approved' ? correction : null)
  return approved ? { ...correction, ...approved, status: 'approved' } : null
}
export const applyCommentCorrections = (records, corrections) => {
  let out = records.map((record) => ({ ...record }))
  corrections.forEach((correction) => correction.rows.forEach((row) => {
    if (row.note == null) return
    const email = correction.email.toLowerCase()
    out = out.map((record) => record.email.toLowerCase() === email &&
      record.at.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }) === row.date
      ? { ...record, notes: '' } : record)
    out.push({ id: `correction-${correction.id}-${row.date}`, email, type: 'comment', notes: row.note,
      at: zonedTime(new Date(`${row.date}T00:00:00Z`), '12:00') })
  }))
  return out
}
export const correctionAudit = (corrections, records = []) => corrections.flatMap((correction) => correction.rows.map((row) => ({
  email: correction.email, date: row.date,
  note: `Staff correction (revision ${correction.revision}): ${row.reason}${row.note != null
    ? `; original comments: ${records.filter((record) => record.email.toLowerCase() === correction.email.toLowerCase() && record.at.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }) === row.date).map((record) => record.notes).filter(Boolean).join(' / ') || '(none)'}; corrected comment: ${row.note || '(cleared)'}` : ''}`,
  resolution: `Admin approved${row.hours != null ? ` Main Role ${row.hours} h` : ' corrected comment'}`,
})))
