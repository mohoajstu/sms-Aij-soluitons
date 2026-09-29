import React, { useEffect, useMemo, useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CButton,
  CAlert,
  CSpinner,
  CBadge,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from '@coreui/react'
import { saveAs } from 'file-saver'
import { getTimekeepingSettings, resolveStaffSettings } from '../../services/timekeepingSettings'
import { getStaffCheckInsBetween } from '../../services/staffCheckins'
import { loadFacultyAndAdmins } from '../Courses/staffDirectory'
import { firestore } from '../../firebase'
import {
  periodIndexFor,
  periodStartFor,
  periodWorkingDays,
  periodLabel,
} from '../../services/timesheetExport'
import { generateTimesheetZip } from '../../services/timesheetWorkbook'
import { interpretTimekeepingComments } from '../../services/timekeepingComments'
import { timesheetRequest } from '../../services/staffTimesheets'
import { applyCommentCorrections, correctionAudit, approvedCorrectionFor } from '../../services/timesheetCorrections'

const fmt = (d) =>
  d.toLocaleDateString('en-CA', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const schoolDay = (record) => record.at.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })

const parseHolidays = (input, days) => {
  const allowed = new Set(days.map((day) => day.toISOString().slice(0, 10)))
  return Object.fromEntries(String(input || '').split('\n').filter((line) => line.trim()).map((line) => {
    const match = /^(\d{4}-\d{2}-\d{2})\s*:\s*(.+)$/.exec(line.trim())
    if (!match || !allowed.has(match[1])) {
      throw new Error(`Holiday must be in this pay period, as YYYY-MM-DD: Name (${line.trim()}).`)
    }
    return [match[1], match[2].trim()]
  }))
}

const commentDecisionsFor = (records, suggestions, selected) => records
  .filter((record) => typeof record.notes === 'string' && record.notes.trim())
  .map((record) => {
    const entries = suggestions.map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.sourceId === record.id)
    const resolution = entries.length ? entries.map(({ entry, index }) => {
      const detail = entry.category === 'prepAtHome' ? 'prep at home to scheduled hours'
        : `${entry.category}${entry.hours == null ? '' : ` ${entry.hours} h`}`
      return selected.includes(index) ? `Applied ${detail}`
        : `Not applied ${detail}${entry.reviewReason ? ` (${entry.reviewReason})` : ' (reviewer did not select)'}`
    }).join('; ') : 'No time adjustment identified; no hours changed'
    return { email: record.email, date: schoolDay(record), note: record.notes.trim(), resolution }
  })

const canApplySuggestion = (entry, record, settings) => {
  if (!record || entry.reviewReason) return false
  if (entry.category === 'secondary') return Number.isFinite(entry.hours) && entry.hours > 0
  if (entry.category !== 'prepAtHome') return false
  const scheduled = resolveStaffSettings(settings, record.email, new Date(`${schoolDay(record)}T12:00:00`))
  return Boolean(scheduled && scheduled.scheduled !== false)
}

const TimesheetExport = () => {
  const currentIndex = useMemo(() => Math.max(0, periodIndexFor(new Date())), [])
  const [periodIndex, setPeriodIndex] = useState(currentIndex)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [message, setMessage] = useState(null)
  const [summary, setSummary] = useState(null)
  const [review, setReview] = useState(null)
  const [selected, setSelected] = useState([])
  const [holidayInput, setHolidayInput] = useState('')
  const [correctionReview, setCorrectionReview] = useState(null)
  const [selectedCorrections, setSelectedCorrections] = useState([])

  const [staff, setStaff] = useState([])
  const [loadingStaff, setLoadingStaff] = useState(true)

  useEffect(() => {
    let cancelled = false
    loadFacultyAndAdmins(firestore)
      .then((list) => !cancelled && setStaff(list.filter((s) => s.email)))
      .catch(
        () => !cancelled && setMessage({ tone: 'danger', text: 'Could not load the staff list.' }),
      )
      .finally(() => !cancelled && setLoadingStaff(false))
    return () => {
      cancelled = true
    }
  }, [])

  // Every fortnight from the first up to the one in progress, newest first.
  const options = useMemo(() => {
    const out = []
    for (let i = currentIndex; i >= 0; i -= 1) {
      const days = periodWorkingDays(i)
      out.push({
        index: i,
        label: `Weeks ${periodLabel(i)} · ${fmt(days[0])} to ${fmt(days[9])}${
          i === currentIndex ? ' (current)' : ''
        }`,
      })
    }
    return out
  }, [currentIndex])

  const days = useMemo(() => periodWorkingDays(periodIndex), [periodIndex])

  const assertCorrectionsCurrent = async (corrections) => {
    if (!corrections.length) return
    const latest = await timesheetRequest('adminList', { periodIndex })
    if (corrections.some((correction) => !latest.corrections.some((item) => item.id === correction.id &&
      approvedCorrectionFor(item)?.revision === correction.revision))) {
      throw new Error('A staff correction changed after review. Restart the export and review the latest version.')
    }
  }

  const prepareExport = async (originalRecords, settings, holidays, corrections = []) => {
    const records = applyCommentCorrections(originalRecords, corrections)
    const suggestions = await interpretTimekeepingComments(records)
    if (records.some((record) => record.notes?.trim())) {
      setReview({ records, originalRecords, settings, suggestions, holidays, corrections })
      const byId = new Map(records.map((record) => [record.id, record]))
      setSelected(suggestions.flatMap((entry, index) => entry.category === 'prepAtHome' &&
        canApplySuggestion(entry, byId.get(entry.sourceId), settings) ? [index] : []))
      setMessage({ tone: 'info', text: 'Review interpreted notes before exporting timesheets.' })
      return
    }
    await assertCorrectionsCurrent(corrections)
    const result = await generateTimesheetZip({ people: staff, records, settings, periodIndex, holidays, corrections,
      commentDecisions: correctionAudit(corrections, originalRecords),
      onProgress: (done, total) => setProgress({ done, total }) })
    saveAs(result.blob, result.fileName)
    setSummary(result.summary)
    setMessage({ tone: 'success', text: `${result.summary.length} timesheets downloaded as ${result.fileName}.` })
  }

  const handleExport = async () => {
    setBusy(true)
    setMessage(null)
    setSummary(null)
    setReview(null)
    setCorrectionReview(null)
    setProgress({ done: 0, total: staff.length })
    try {
      const holidays = parseHolidays(holidayInput, days)
      // Widen by a day either side so a check-in near midnight is not lost to
      // the gap between the school's clock and UTC.
      const start = new Date(periodStartFor(periodIndex).getTime() - 24 * 3600 * 1000)
      const end = new Date(days[9].getTime() + 2 * 24 * 3600 * 1000)

      const [settings, raw, submissions] = await Promise.all([
        getTimekeepingSettings({ forceRefresh: true }),
        getStaffCheckInsBetween(start, end),
        timesheetRequest('adminList', { periodIndex }),
      ])

      const dayKeys = new Set(days.map((day) => day.toISOString().slice(0, 10)))
      const records = raw
        .filter((r) => r.createdAt)
        .map((r) => ({
          id: r.id,
          email: r.email,
          type: r.type,
          notes: r.notes,
          at: r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt),
        }))
        .filter((record) => dayKeys.has(schoolDay(record)))

      const corrections = submissions.corrections.filter((correction) => correction.rows.length || correction.approved?.rows.length)
      if (corrections.length) {
        setCorrectionReview({ records, settings, holidays, corrections })
        setSelectedCorrections(corrections.filter((correction) => correction.status !== 'rejected').map((correction) => correction.id))
        setMessage({ tone: 'info', text: 'Latest staff submissions are selected for this export. Review each change before continuing.' })
        return
      }
      await prepareExport(records, settings, holidays)
    } catch (err) {
      console.error('Timesheet export failed:', err)
      setMessage({ tone: 'danger', text: err.message || 'Could not build the timesheets.' })
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const reviewCorrections = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const decisions = correctionReview.corrections.map((correction) => ({ id: correction.id, revision: correction.revision,
        status: selectedCorrections.includes(correction.id) ? 'approved' : 'rejected' }))
      await timesheetRequest('review', { periodIndex, decisions })
      const approved = correctionReview.corrections.map((correction) =>
        approvedCorrectionFor(correction, selectedCorrections.includes(correction.id))).filter(Boolean)
      await prepareExport(correctionReview.records, correctionReview.settings, correctionReview.holidays, approved)
      setCorrectionReview(null)
    } catch (error) { setMessage({ tone: 'danger', text: error.message }) }
    finally { setBusy(false); setProgress(null) }
  }

  const exportReviewed = async () => {
    if (!review) return
    setBusy(true)
    setMessage(null)
    try {
      const byId = new Map(review.records.map((record) => [record.id, record]))
      let claims = review.suggestions
        .filter((_, index) => selected.includes(index))
        .map((entry) => {
          const record = byId.get(entry.sourceId)
          if (!record) throw new Error('A suggested entry has no source check-in.')
          return {
            ...entry,
            email: record.email,
            date: schoolDay(record),
            note: record.notes || '',
          }
        })
      const seenClaims = new Set()
      claims = claims.filter((claim) => {
        const key = `${claim.email.toLowerCase()}|${claim.date}|${claim.category}|${claim.hours ?? ''}`
        if (claim.category === 'prepAtHome') {
          const prepKey = `${claim.email.toLowerCase()}|${claim.date}|prepAtHome`
          if (seenClaims.has(prepKey)) return false
          seenClaims.add(prepKey)
          return true
        }
        if (seenClaims.has(key)) throw new Error('The same claim was selected twice for one staff member and day.')
        seenClaims.add(key)
        return true
      })
      await assertCorrectionsCurrent(review.corrections || [])
      const result = await generateTimesheetZip({
        people: staff,
        records: review.records,
        settings: review.settings,
        periodIndex,
        claims,
        corrections: review.corrections,
        commentDecisions: [...commentDecisionsFor(review.records, review.suggestions, selected),
          ...correctionAudit(review.corrections || [], review.originalRecords)],
        holidays: review.holidays,
        onProgress: (done, total) => setProgress({ done, total }),
      })
      saveAs(result.blob, result.fileName)
      setSummary(result.summary)
      setReview(null)
      setMessage({ tone: 'success', text: `${result.summary.length} timesheets downloaded as ${result.fileName}.` })
    } catch (err) {
      setMessage({ tone: 'danger', text: err.message || 'Could not build the timesheets.' })
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const withGaps = summary ? summary.filter((s) => s.inferred > 0).length : 0

  return (
    <CCard>
      <CCardHeader>Bi-weekly Timesheets</CCardHeader>
      <CCardBody>
        <p className="text-muted">
          Fills the school&apos;s own timesheet template from the check-in records, one file per
          person, bundled as a zip. A day with a missing tap is counted to that person&apos;s
          scheduled time and listed in the comments box of their sheet.
        </p>

        <CRow className="g-2 align-items-end mb-3">
          <CCol md={6}>
            <CFormLabel className="small mb-1">Pay period</CFormLabel>
            <CFormSelect
              value={periodIndex}
              disabled={busy}
              onChange={(e) => { setPeriodIndex(Number(e.target.value)); setReview(null); setCorrectionReview(null) }}
            >
              {options.map((o) => (
                <option key={o.index} value={o.index}>
                  {o.label}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol md={3}>
            <CButton
              color="primary"
              disabled={busy || loadingStaff || staff.length === 0}
              onClick={handleExport}
            >
              {busy ? <CSpinner size="sm" className="me-2" /> : null}
              {busy ? 'Building…' : 'Export timesheets'}
            </CButton>
          </CCol>
          <CCol md={3} className="text-muted small">
            {loadingStaff ? 'Loading staff…' : `${staff.length} staff`}
          </CCol>
        </CRow>

        <CFormLabel className="small mb-1">Holidays to show in week headings (optional)</CFormLabel>
        <CFormTextarea rows={2} value={holidayInput} disabled={busy}
          placeholder="2026-09-07: Labour Day"
          onChange={(event) => { setHolidayInput(event.target.value); setReview(null); setCorrectionReview(null) }} />
        <p className="small text-muted mt-1">One school-approved date and name per line. Each workbook will show its week number and any listed holiday.</p>

        {progress && (
          <p className="small text-muted">
            {progress.done} of {progress.total} sheets written…
          </p>
        )}

        {message && <CAlert color={message.tone}>{message.text}</CAlert>}

        {correctionReview && <>
          <h5>Staff-submitted corrections</h5>
          <p>Each person&apos;s latest submitted version is selected by default. Review the hours, comment, and reason; untick anything you do not approve. Only approved changes enter this export. A previously approved version stays in effect if a newer submission is rejected. Every decision is recorded in the workbook audit.</p>
          {correctionReview.corrections.map((correction) => <div key={correction.id} className="border rounded p-3 mb-2">
            <label><input type="checkbox" disabled={busy} checked={selectedCorrections.includes(correction.id)}
              onChange={(event) => setSelectedCorrections((previous) => event.target.checked
                ? [...previous, correction.id] : previous.filter((id) => id !== correction.id))} />{' '}
              {correction.email} · {correction.status} · revision {correction.revision}</label>
            {!correction.rows.length && <p>Requests removal of the previously approved corrections.</p>}
            <ul>{correction.rows.map((row) => <li key={row.date}>{row.date}
              {row.hours != null && ` · Main Role ${row.hours} h`}
              {row.note != null && ` · Comment: ${row.note || '(cleared)'}`}
              {` · Reason: ${row.reason}`}</li>)}</ul>
          </div>)}
          <CButton color="primary" disabled={busy} onClick={reviewCorrections}>Save review decisions and continue</CButton>
        </>}

        {review && (
          <>
            <p>Review every staff note. Tick only interpretations you approve. Each original note and its applied or unapplied resolution will appear in that person&apos;s timesheet comments.</p>
            <CTable small responsive>
              <CTableHead><CTableRow>
                <CTableHeaderCell>Use</CTableHeaderCell>
                <CTableHeaderCell>Staff / day</CTableHeaderCell>
                <CTableHeaderCell>Original note</CTableHeaderCell>
                <CTableHeaderCell>Interpretation</CTableHeaderCell>
              </CTableRow></CTableHead>
              <CTableBody>{review.suggestions.map((entry, index) => {
                const record = review.records.find((r) => r.id === entry.sourceId)
                return <CTableRow key={`${entry.sourceId}-${index}`}>
                  <CTableDataCell><input type="checkbox" checked={selected.includes(index)}
                    disabled={busy || !canApplySuggestion(entry, record, review.settings)}
                    onChange={(e) => setSelected((previous) => e.target.checked
                      ? [...previous, index] : previous.filter((value) => value !== index))} /></CTableDataCell>
                  <CTableDataCell>{record?.email}<br />{record ? schoolDay(record) : ''}</CTableDataCell>
                  <CTableDataCell>{record?.notes}</CTableDataCell>
                  <CTableDataCell>{entry.category === 'prepAtHome'
                    ? 'Prep at home · fill remainder to regular daily limit'
                    : `${entry.category} · ${entry.hours ?? 'hours unstated'} h`}
                    {entry.coveringFor && ` · covering ${entry.coveringFor}`}
                    {entry.reviewReason && ` · ${entry.reviewReason}`}
                    {!['secondary', 'prepAtHome'].includes(entry.category) &&
                      ' · category requires a separate payroll decision'}
                    {entry.category === 'prepAtHome' && !canApplySuggestion(entry, record, review.settings) &&
                      ' · cannot apply without an unambiguous scheduled day'}</CTableDataCell>
                </CTableRow>
              })}{review.records.filter((record) => record.notes?.trim() &&
                !review.suggestions.some((entry) => entry.sourceId === record.id)).map((record) =>
                <CTableRow key={`unmatched-${record.id}`}>
                  <CTableDataCell>—</CTableDataCell>
                  <CTableDataCell>{record.email}<br />{schoolDay(record)}</CTableDataCell>
                  <CTableDataCell>{record.notes}</CTableDataCell>
                  <CTableDataCell>No time adjustment identified; no hours changed</CTableDataCell>
                </CTableRow>)}</CTableBody>
            </CTable>
            <CButton color="primary" disabled={busy} onClick={exportReviewed}>
              {busy ? 'Building…' : 'Export reviewed timesheets'}
            </CButton>
          </>
        )}

        {summary && (
          <>
            <p className="small text-muted">
              {withGaps > 0
                ? `${withGaps} of ${summary.length} sheets contain at least one day completed from the schedule.`
                : 'Every day in this period had both a check-in and a check-out.'}
            </p>
            <CTable small responsive align="middle">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Staff</CTableHeaderCell>
                  <CTableHeaderCell>Total hours</CTableHeaderCell>
                  <CTableHeaderCell>Days completed from schedule</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {summary.map((s) => (
                  <CTableRow key={s.email}>
                    <CTableDataCell>{s.name}</CTableDataCell>
                    <CTableDataCell>{s.total.toFixed(2)}</CTableDataCell>
                    <CTableDataCell>
                      {s.inferred > 0 ? (
                        <CBadge color="warning">{s.inferred}</CBadge>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default TimesheetExport
