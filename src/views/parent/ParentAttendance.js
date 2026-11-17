import React, { useEffect, useState } from 'react'
import { CCard, CCardBody, CCardHeader, CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell, CSpinner, CAlert, CButton } from '@coreui/react'
import dayjs from 'dayjs'
import { collection, getDocs, query, where, documentId, orderBy, limit } from 'firebase/firestore'
import { firestore } from '../../Firebase/firebase'
import useAuth from '../../Firebase/useAuth'
import { computeDefaultSchoolYear, fetchSchoolYearSettings } from '../ReportCard/utils/schoolYear'
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
        const snapshot = await getDocs(query(
          collection(firestore, 'attendance'),
          where(documentId(), '>=', year.startDate),
          where(documentId(), '<=', year.endDate),
        ))
        const rows = []
        snapshot.forEach((dailyDoc) => {
          const daily = dailyDoc.data() || {}
          for (const course of daily.courses || []) {
            for (const student of course.students || []) {
              if (student.studentId !== studentId) continue
              rows.push({
                date: daily.date || dailyDoc.id,
                class: course.courseTitle || 'Class',
                status: student.status || '—',
                note: student.note || '',
              })
            }
          }
        })
        rows.sort((a, b) => b.date.localeCompare(a.date))
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
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState(null)
  const [years, setYears] = useState([])
  const [error, setError] = useState('')
  const email = user?.email

  useEffect(() => {
    if (!email) return
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [students, current, oldestAttendance] = await Promise.all([
          getDocs(query(collection(firestore, 'students'), where('contact.email', '==', email))),
          fetchSchoolYearSettings(firestore),
          getDocs(query(collection(firestore, 'attendance'), orderBy(documentId()), limit(1))),
        ])
        if (!active) return
        if (students.empty) {
          setStudent(null)
          return
        }
        const studentDoc = students.docs[0]
        const info = studentDoc.data()?.personalInfo || {}
        setStudent({ id: studentDoc.id, name: `${info.firstName || ''} ${info.lastName || ''}`.trim() || studentDoc.id })
        setYears(attendanceSchoolYears(oldestAttendance.docs[0]?.id, current))
      } catch (err) {
        console.error('Failed to load parent attendance:', err)
        if (active) setError('Unable to load attendance. Please refresh the page to try again.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [email])

  if (loading) return <CSpinner color="primary" />
  if (error) return <CAlert color="danger">{error}</CAlert>
  if (!student) return <CAlert color="info">No linked students found.</CAlert>

  return (
    <CCard>
      <CCardHeader><h3 className="mb-0">Attendance</h3></CCardHeader>
      <CCardBody>
        <p className="mb-4">{student.name}</p>
        {years.map((year) => <AttendanceYear key={`${student.id}-${year.label}`} year={year} studentId={student.id} />)}
      </CCardBody>
    </CCard>
  )
}

export default ParentAttendance
