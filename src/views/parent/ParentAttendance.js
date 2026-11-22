import React, { useEffect, useState } from 'react'
import { CCard, CCardBody, CCardHeader, CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell, CSpinner, CAlert, CButton } from '@coreui/react'
import dayjs from 'dayjs'
import { firestore } from '../../Firebase/firebase'
import { parentPortal } from '../../services/parentPortal'
import { computeDefaultSchoolYear, fetchSchoolYearSettings } from '../ReportCard/utils/schoolYear'
import useParentFamily from './useParentFamily'
import ChildSelector from './ChildSelector'
import './ParentReportCards.css'

export const attendanceSchoolYears = (earliestDate, current, today = dayjs().format('YYYY-MM-DD')) => {
  const currentStart = Number(current.label.slice(0, 4))
  const earliest = /^\d{4}-\d{2}-\d{2}$/.test(earliestDate || '')
    ? Number(computeDefaultSchoolYear(new Date(`${earliestDate}T12:00:00`)).label.slice(0, 4))
    : currentStart
  const years = []
  for (let start = currentStart; start >= Math.min(earliest, currentStart); start -= 1) {
    const isCurrent = start === currentStart
    // Use the configured start for this year and keep the preceding year adjacent.
    const end = start === currentStart - 1 ? dayjs(current.startDate).subtract(1, 'day').format('YYYY-MM-DD')
      : `${start + 1}-09-01`
    years.push({
      label: isCurrent ? current.label : `${start}-${start + 1}`,
      current: isCurrent,
      startDate: isCurrent ? current.startDate : `${start}-09-02`,
      endDate: end < today ? end : today,
    })
  }
  return years
}

const AttendanceYear = ({ year, studentId }) => {
  const [expanded, setExpanded] = useState(year.current)
  const [records, setRecords] = useState(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!expanded || records !== null) return
    let active = true
    setError('')
    const load = async () => {
      try {
        const { records: rows } = await parentPortal('attendance', { studentId, startDate: year.startDate, endDate: year.endDate })
        if (active) setRecords(rows)
      } catch (err) {
        console.error('Failed to load parent attendance:', err)
        if (active) setError('Unable to load attendance for this school year.')
      }
    }
    load()
    return () => { active = false }
  }, [expanded, records, retry, studentId, year.startDate, year.endDate])

  const content = error ? (
    <CAlert color="danger">
      {error} <CButton color="link" onClick={() => setRetry((value) => value + 1)}>Try again</CButton>
    </CAlert>
  ) : records === null ? (
    <div className="py-3" role="status"><CSpinner size="sm" className="me-2" />Loading attendance…</div>
  ) : records.length === 0 ? (
    <p>No attendance records for this school year.</p>
  ) : (
    <CTable responsive hover>
      <caption className="visually-hidden">Attendance for {year.label}</caption>
      <CTableHead>
        <CTableRow>
          <CTableHeaderCell scope="col">Date</CTableHeaderCell>
          <CTableHeaderCell scope="col">Class</CTableHeaderCell>
          <CTableHeaderCell scope="col">Status</CTableHeaderCell>
          <CTableHeaderCell scope="col">Note</CTableHeaderCell>
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {records.map((record, idx) => (
          <CTableRow key={`${record.date}-${idx}`}>
            <CTableDataCell className="text-nowrap">{record.date}</CTableDataCell>
            <CTableDataCell>{record.class}</CTableDataCell>
            <CTableDataCell>{record.status}</CTableDataCell>
            <CTableDataCell>{record.note}</CTableDataCell>
          </CTableRow>
        ))}
      </CTableBody>
    </CTable>
  )

  return year.current ? (
    <section className="parent-report-current" aria-label={`Current school year ${year.label}`}>
      <h4>{year.label} <span className="badge text-bg-primary">Current school year</span></h4>
      {content}
    </section>
  ) : (
    <details className="parent-report-year" onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary>{year.label}</summary>
      {expanded && content}
    </details>
  )
}

const ParentAttendance = () => {
  const { loading, error, children, selected, selectChild, earliestAttendanceDate, retry } = useParentFamily()
  const [years, setYears] = useState(null)
  const [yearsError, setYearsError] = useState('')

  useEffect(() => {
    if (loading || error) return undefined
    let active = true
    fetchSchoolYearSettings(firestore).then((current) => {
      if (active) setYears(attendanceSchoolYears(earliestAttendanceDate, current))
    }).catch((err) => {
      console.error('Failed to load school year settings:', err)
      if (active) setYearsError('Unable to load attendance. Please refresh the page to try again.')
    })
    return () => { active = false }
  }, [loading, error, earliestAttendanceDate])

  if (error) {
    return <CAlert color="danger">{error} <CButton color="link" onClick={retry}>Try again</CButton></CAlert>
  }
  if (yearsError) return <CAlert color="danger">{yearsError}</CAlert>
  if (loading || !years) return <CSpinner color="primary" />
  if (!selected) return <CAlert color="info">No linked students found.</CAlert>

  return (
    <CCard>
      <CCardHeader><h3 className="mb-0">Attendance</h3></CCardHeader>
      <CCardBody>
        <ChildSelector options={children} selected={selected} onSelect={selectChild} />
        {years.map((year) => <AttendanceYear key={`${selected.id}-${year.label}`} year={year} studentId={selected.id} />)}
      </CCardBody>
    </CCard>
  )
}

export default ParentAttendance
