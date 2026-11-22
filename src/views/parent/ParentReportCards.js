import React, { useEffect, useState } from 'react'
import { CCard, CCardBody, CCardHeader, CListGroup, CListGroupItem, CSpinner, CAlert, CButton } from '@coreui/react'
import { firestore } from '../../Firebase/firebase'
import { parentPortal } from '../../services/parentPortal'
import { fetchSchoolYearSettings } from '../ReportCard/utils/schoolYear'
import { groupParentReports, parentReportTermLabel } from './parentReportGroups'
import useParentFamily from './useParentFamily'
import ChildSelector from './ChildSelector'
import './ParentReportCards.css'

const ParentReportCards = () => {
  const family = useParentFamily()
  const { children, selected, selectChild } = family
  const [groups, setGroups] = useState(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const selectedId = selected?.id

  useEffect(() => {
    if (!selectedId) return undefined
    let active = true
    setGroups(null)
    setError('')
    Promise.all([fetchSchoolYearSettings(firestore), parentPortal('reportCards', { studentId: selectedId })])
      .then(([schoolYear, { reports }]) => {
        if (active) setGroups(groupParentReports(reports || [], schoolYear))
      })
      .catch((e) => {
        console.error('Failed to load parent report cards:', e)
        if (active) setError('Unable to load report cards. Please refresh the page to try again.')
      })
    return () => { active = false }
  }, [selectedId, retry])

  if (family.error) {
    return <CAlert color="danger">{family.error} <CButton color="link" onClick={family.retry}>Try again</CButton></CAlert>
  }
  if (family.loading) return <CSpinner color="primary" />
  if (!selected) return <CAlert color="info">No linked students found.</CAlert>

  return (
    <CCard>
      <CCardHeader>
        <h3 className="mb-0">Report Cards</h3>
      </CCardHeader>
      <CCardBody>
        <ChildSelector options={children} selected={selected} onSelect={selectChild} />
        {error ? (
          <CAlert color="danger">{error} <CButton color="link" onClick={() => setRetry((n) => n + 1)}>Try again</CButton></CAlert>
        ) : groups === null ? (
          <div className="py-3" role="status"><CSpinner size="sm" className="me-2" />Loading report cards…</div>
        ) : (
          <>
            {groups.map((group) => {
              const title = group.year === 'unknown' ? 'School year not recorded' : group.year
              const reports = (
                <CListGroup flush>
                  {group.reports.map((report) => (
                    <CListGroupItem key={report.id} className="parent-report-item">
                      <a href={report.url} target="_blank" rel="noopener noreferrer">
                        {report.name}
                        <span className="visually-hidden"> (opens PDF in a new tab)</span>
                      </a>
                      <span className="parent-report-meta">
                        {parentReportTermLabel(report.term)}
                        {report.grade ? ` · ${/grade|kindergarten|^jk$|^sk$/i.test(report.grade) ? report.grade : `Grade ${report.grade}`}` : ''}
                      </span>
                    </CListGroupItem>
                  ))}
                </CListGroup>
              )
              return group.current ? (
                <section key={group.year} className="parent-report-current" aria-label={`Current school year ${title}`}>
                  <h4>{title} <span className="badge text-bg-primary">Current school year</span></h4>
                  {group.reports.length ? reports : (
                    <p className="mb-0">No report cards have been released for this school year yet.</p>
                  )}
                </section>
              ) : (
                <details key={`${selected.id}-${group.year}`} className="parent-report-year">
                  <summary>
                    <span>{title}</span>
                    <span className="parent-report-count">{group.reports.length} {group.reports.length === 1 ? 'report' : 'reports'}</span>
                  </summary>
                  {reports}
                </details>
              )
            })}
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default ParentReportCards
