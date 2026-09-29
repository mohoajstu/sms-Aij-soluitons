import React, { useEffect, useMemo, useState } from 'react'
import { CCard, CCardBody, CCardHeader, CAlert, CButton, CFormSelect, CFormInput,
  CFormTextarea, CSpinner, CTable, CTableHead, CTableBody, CTableRow, CTableHeaderCell, CTableDataCell } from '@coreui/react'
import { saveAs } from 'file-saver'
import useAuth from '../../Firebase/useAuth'
import { timesheetRequest } from '../../services/staffTimesheets'
import { buildStaffTimesheet, periodIndexFor, periodLabel, periodWorkingDays, timesheetFileName } from '../../services/timesheetExport'
import { fetchTemplate, fillTimesheet } from '../../services/timesheetWorkbook'
import { applyCommentCorrections } from '../../services/timesheetCorrections'

const schoolDate = (record) => record.at.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
export const changedRows = (rows, baseline) => rows.flatMap((row, i) => {
  const hours = row.hours === '' ? null : Number(row.hours)
  const hoursChanged = hours !== baseline.hours[i]
  const noteChanged = row.note !== baseline.notes[row.date]
  if (!hoursChanged && !noteChanged) return []
  if (hoursChanged && (hours == null || !Number.isFinite(hours) || hours < 0 || hours > 24 ||
    Math.abs(hours * 4 - Math.round(hours * 4)) > 0.000001)) throw new Error('Enter corrected hours from 0 to 24 in 15-minute increments. Use 0 for no paid hours.')
  if (row.reason.trim().length < 3) throw new Error(`Explain the correction for ${row.date}.`)
  if (noteChanged && row.note.length > 500) throw new Error('Corrected comments cannot exceed 500 characters.')
  return [{ date: row.date, hours: hoursChanged ? hours : null, note: noteChanged ? row.note : null, reason: row.reason.trim() }]
})

const MyTimesheets = () => {
  const { user, role, loading: authLoading } = useAuth()
  const current = useMemo(() => Math.max(0, periodIndexFor(new Date())), [])
  const [periodIndex, setPeriodIndex] = useState(current)
  const [data, setData] = useState(null)
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [reload, setReload] = useState(0)
  const allowed = ['admin', 'faculty', 'teacher'].includes(role)
  useEffect(() => {
    if (authLoading || !allowed) return
    let active = true
    setLoading(true)
    setData(null)
    timesheetRequest('load', { periodIndex }).then((result) => {
      if (!active) return
      const records = result.records.map((record) => ({ ...record, at: new Date(record.at) }))
      const baseline = buildStaffTimesheet({ email: result.email, periodIndex, records, settings: result.settings })
      const notes = Object.fromEntries(baseline.days.map((date) => [date,
        records.filter((record) => schoolDate(record) === date && record.notes.trim())
          .map((record) => record.notes).join('\n')]))
      const initialRows = baseline.days.map((date, i) => {
        const saved = result.correction?.rows.find((row) => row.date === date)
        return { date, hours: saved?.hours ?? baseline.hours[i] ?? '', note: saved?.note ?? notes[date], reason: saved?.reason || '' }
      })
      setData({ ...result, records, baseline: { ...baseline, notes }, initialRows })
      setRows(initialRows)
    }).catch((error) => active && setMessage({ tone: 'danger', text: error.message }))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [authLoading, allowed, user?.uid, periodIndex, reload])
  const update = (index, field, value) => setRows((previous) => previous.map((row, i) => i === index ? { ...row, [field]: value } : row))
  const dirty = Boolean(data && rows.some((row, i) => String(row.hours) !== String(data.initialRows[i].hours) ||
    row.note !== data.initialRows[i].note || row.reason !== data.initialRows[i].reason))
  const save = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const changes = changedRows(rows, data.baseline)
      await timesheetRequest('save', { periodIndex, revision: data.correction?.revision || 0, rows: changes })
      setMessage({ tone: 'success', text: 'Corrections submitted for admin review. Original check-in records are unchanged.' })
      setReload((value) => value + 1)
    } catch (error) { setMessage({ tone: 'danger', text: error.message }) }
    finally { setBusy(false) }
  }
  const download = async () => {
    setBusy(true)
    try {
      const changes = changedRows(rows, data.baseline)
      // Local preview only: payroll receives only server-approved submissions.
      const correction = { id: data.correction?.id || 'draft', email: data.email, rows: changes, status: 'approved' }
      const records = applyCommentCorrections(data.records, [correction])
      const sheet = buildStaffTimesheet({ email: data.email, periodIndex, records, settings: data.settings,
        corrections: [correction], commentDecisions: [...data.records.filter((record) => record.notes.trim()).map((record) => ({
          email: data.email, date: schoolDate(record), note: record.notes,
          resolution: 'Original staff comment; admin comment interpretation is not included in this review copy.',
        })), ...changes.map((row) => ({ email: data.email, date: row.date,
          note: `${row.reason}${row.note != null ? `; corrected comment: ${row.note}` : ''}`,
          resolution: 'Staff review copy. These changes require admin approval for payroll.' }))] })
      const buffer = await fillTimesheet(await fetchTemplate(), sheet, data.person)
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        timesheetFileName(data.person, periodIndex).replace('.xlsx', ' - Staff review copy.xlsx'))
    } catch (error) { setMessage({ tone: 'danger', text: error.message }) }
    finally { setBusy(false) }
  }
  if (authLoading) return <CSpinner />
  if (!allowed) return <CAlert color="danger">Use your staff account to access your timesheets ({user?.email || 'not signed in'}).</CAlert>
  return <CCard>
    <CCardHeader>My Timesheets</CCardHeader>
    <CCardBody>
      <p>Review your own daily hours and comments. Explain any correction, then submit it for admin review. Original check-ins are preserved. Comment-based prep or leave adjustments are finalized by admin.</p>
      <CFormSelect aria-label="Pay period" value={periodIndex} disabled={busy} onChange={(event) => { setPeriodIndex(Number(event.target.value)); setMessage(null) }}>
        {Array.from({ length: current + 1 }, (_, i) => current - i).map((index) => {
          const days = periodWorkingDays(index)
          return <option key={index} value={index}>Weeks {periodLabel(index)} · {days[0].toISOString().slice(0, 10)} to {days[9].toISOString().slice(0, 10)}</option>
        })}
      </CFormSelect>
      {message && <CAlert color={message.tone} className="mt-3">{message.text}</CAlert>}
      {loading ? <CSpinner className="mt-3" /> : data && <>
        <p className="mt-3">{data.email} · Status: {data.correction?.status || 'No corrections submitted'} · Revision {data.correction?.revision || 0}</p>
        {!data.records.length && !data.correction && <CAlert color="info">
          No check-ins or submitted corrections were found for your account in this pay period. Try another period if you expected hours here. Days without a check-in are left blank rather than counted as worked time.
        </CAlert>}
        {data.correction?.approved && <p>Last approved revision: {data.correction.approved.revision}. A new submission does not replace it until admin approval.</p>}
        <CTable responsive small>
          <CTableHead><CTableRow>{['Day', 'Calculated Main Role hours', 'Your Main Role hours', 'Original comments', 'Your comments', 'Reason for correction'].map((label) =>
            <CTableHeaderCell key={label}>{label}</CTableHeaderCell>)}</CTableRow></CTableHead>
          <CTableBody>{rows.map((row, i) => <CTableRow key={row.date}>
            <CTableDataCell>{row.date}</CTableDataCell>
            <CTableDataCell>{data.baseline.hours[i] ?? '—'}</CTableDataCell>
            <CTableDataCell><CFormInput type="number" min="0" max="24" step="0.25" aria-label={`Hours ${row.date}`}
              value={row.hours} disabled={busy} onChange={(event) => update(i, 'hours', event.target.value)} /></CTableDataCell>
            <CTableDataCell style={{ whiteSpace: 'pre-wrap', minWidth: 180 }}>{data.baseline.notes[row.date] || '—'}</CTableDataCell>
            <CTableDataCell><CFormTextarea rows={3} maxLength={500} aria-label={`Comment ${row.date}`} value={row.note} disabled={busy}
              onChange={(event) => update(i, 'note', event.target.value)} /></CTableDataCell>
            <CTableDataCell><CFormTextarea rows={3} maxLength={500} aria-label={`Reason ${row.date}`} value={row.reason} disabled={busy}
              onChange={(event) => update(i, 'reason', event.target.value)} /></CTableDataCell>
          </CTableRow>)}</CTableBody>
        </CTable>
        <p>Calculated total: {data.baseline.total.toFixed(2)} h. Your review total: {rows.reduce((sum, row) => sum + (Number(row.hours) || 0), 0).toFixed(2)} h.</p>
        <CButton color="primary" disabled={busy || loading || !dirty} onClick={save}>{busy ? 'Working…' : 'Submit corrections'}</CButton>
        <CButton color="secondary" className="ms-2" disabled={busy || loading} onClick={download}>Download review copy</CButton>
        <CButton color="secondary" variant="outline" className="ms-2" disabled={busy} onClick={() => { setMessage(null); setReload((value) => value + 1) }}>Reload saved version</CButton>
      </>}
    </CCardBody>
  </CCard>
}
export default MyTimesheets
