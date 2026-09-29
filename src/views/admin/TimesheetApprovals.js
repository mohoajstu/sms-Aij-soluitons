import React, { useEffect, useMemo, useState } from 'react'
import { CAlert, CButton, CCard, CCardBody, CFormSelect, CSpinner } from '@coreui/react'
import { timesheetRequest } from '../../services/staffTimesheets'
import { getTimekeepingSettings } from '../../services/timekeepingSettings'
import { getStaffCheckInsBetween } from '../../services/staffCheckins'
import { buildStaffTimesheet, periodIndexFor, periodLabel, periodStartFor, periodWorkingDays } from '../../services/timesheetExport'

const schoolDay = (at) => at.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
const sourceValues = (correction, periodIndex, records, settings) => {
  const email = correction.email.toLowerCase()
  const own = records.filter((record) => record.email?.toLowerCase() === email)
  const sheet = buildStaffTimesheet({ email, periodIndex, records: own, settings })
  return Object.fromEntries(sheet.days.map((date, index) => [date, {
    hours: sheet.hours[index],
    note: own.filter((record) => schoolDay(record.at) === date && record.notes?.trim())
      .map((record) => record.notes.trim()).join(' / '),
  }]))
}

const fallbackSummary = (correction) => correction.rows.length
  ? `${correction.rows.length} changed day${correction.rows.length === 1 ? '' : 's'}; review the exact hours, comments, and staff reasons below.`
  : 'Staff requests removal of their previous corrections.'

const TimesheetApprovals = () => {
  const current = useMemo(() => Math.max(0, periodIndexFor(new Date())), [])
  const [periodIndex, setPeriodIndex] = useState(current)
  const [pending, setPending] = useState([])
  const [summaries, setSummaries] = useState({})
  const [baselines, setBaselines] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setPending([])
    setSummaries({})
    setBaselines({})
    setMessage(null)
    const days = periodWorkingDays(periodIndex)
    const start = new Date(periodStartFor(periodIndex).getTime() - 24 * 3600 * 1000)
    const end = new Date(days[9].getTime() + 2 * 24 * 3600 * 1000)
    Promise.all([timesheetRequest('adminList', { periodIndex }),
      getTimekeepingSettings({ forceRefresh: true }), getStaffCheckInsBetween(start, end)]).then(([result, settings, raw]) => {
      if (!active) return
      const waiting = (result.corrections || []).filter((item) => item.status === 'pending')
      setPending(waiting)
      const dayKeys = new Set(days.map((date) => date.toISOString().slice(0, 10)))
      const records = raw.filter((record) => record.createdAt).map((record) => ({
        email: record.email, type: record.type, notes: record.notes,
        at: record.createdAt.toDate ? record.createdAt.toDate() : new Date(record.createdAt),
      })).filter((record) => dayKeys.has(schoolDay(record.at)))
      setBaselines(Object.fromEntries(waiting.map((item) =>
        [item.id, sourceValues(item, periodIndex, records, settings)])))
      if (!waiting.length) return
      return timesheetRequest('summarize', { periodIndex }).then((summary) => {
        if (active) setSummaries(Object.fromEntries((summary.entries || []).map((entry) => [entry.id, entry.summary])))
      }).catch(() => {
        if (active) setMessage({ tone: 'warning', text: 'AI summaries are unavailable. Review the exact changes below.' })
      })
    }).catch((error) => active && setMessage({ tone: 'danger', text: error.message }))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [periodIndex, version])

  const decide = async (corrections, status) => {
    if (!corrections.length) return
    setBusy(true)
    setMessage(null)
    try {
      await timesheetRequest('review', { periodIndex, decisions: corrections.map((item) => ({
        id: item.id, revision: item.revision, status,
      })) })
      setMessage({ tone: 'success', text: `${corrections.length} submission${corrections.length === 1 ? '' : 's'} ${status}.` })
      setVersion((value) => value + 1)
    } catch (error) { setMessage({ tone: 'danger', text: error.message }) }
    finally { setBusy(false) }
  }

  return <CCard>
    <CCardBody>
      <h4>Staff timesheet approvals</h4>
      <p>Each submission is the staff member&apos;s latest version. AI summaries are advisory; the exact changes and reasons below control your decision. Approvals enter the next generated timesheet.</p>
      <CFormSelect aria-label="Approval pay period" value={periodIndex} disabled={busy} onChange={(event) => setPeriodIndex(Number(event.target.value))}>
        {Array.from({ length: current + 1 }, (_, i) => current - i).map((index) => {
          const days = periodWorkingDays(index)
          return <option key={index} value={index}>Weeks {periodLabel(index)} · {days[0].toISOString().slice(0, 10)} to {days[9].toISOString().slice(0, 10)}</option>
        })}
      </CFormSelect>
      {message && <CAlert color={message.tone} className="mt-3">{message.text}</CAlert>}
      {loading ? <CSpinner className="mt-3" /> : <>
        <div className="d-flex align-items-center justify-content-between mt-3 mb-2">
          <strong>{pending.length} unapproved submission{pending.length === 1 ? '' : 's'}</strong>
          <CButton color="success" disabled={busy || !pending.length} onClick={() => decide(pending, 'approved')}>Approve all pending</CButton>
        </div>
        {pending.map((item) => <div key={item.id} className="border rounded p-3 mb-3">
          <div className="d-flex justify-content-between align-items-start">
            <strong>{item.email} · revision {item.revision}</strong>
            <small>Submitted {item.submittedAt ? new Date(item.submittedAt).toLocaleString('en-CA') : 'recently'}</small>
          </div>
          <p className="mt-2 mb-1"><em>AI summary:</em> {summaries[item.id] || fallbackSummary(item)}</p>
          {item.rows.length ? <ul>{item.rows.map((row) => {
            const earlier = item.approved?.rows?.find((old) => old.date === row.date)
            const baseline = baselines[item.id]?.[row.date]
            return <li key={row.date}>{row.date}: {row.hours != null && `Main Role ${earlier?.hours ?? baseline?.hours ?? '—'} → ${row.hours} h. `}
              {row.note != null && `Comment ${earlier?.note ?? baseline?.note ?? '(none)'} → ${row.note || '(cleared)'}. `}
              Reason: {row.reason}</li>
          })}</ul> : <p>Requests removal of previously approved corrections.</p>}
          <CButton color="success" size="sm" disabled={busy} onClick={() => decide([item], 'approved')}>Approve</CButton>
          <CButton color="secondary" size="sm" className="ms-2" disabled={busy} onClick={() => decide([item], 'rejected')}>Reject</CButton>
        </div>)}
      </>}
    </CCardBody>
  </CCard>
}

export default TimesheetApprovals
