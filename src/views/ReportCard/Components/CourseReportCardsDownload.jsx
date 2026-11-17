import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { CAlert, CButton, CCard, CCardBody, CFormSelect, CSpinner } from '@coreui/react'
import { firestore } from '../../../Firebase/firebase'
import { loadCourseReports } from '../utils/courseReports'
import { useReportScope } from '../utils/useReportScope'
import ReportScopeFilter from './ReportScopeFilter'
import ClassPrintModal from './ClassPrintModal'

const typeLabel = (record) => record.reportCardTypeName || record.reportCardType

/**
 * Course page section: download every report card for the students on this
 * course's roster, for one school year, term and report type, as a ZIP (one
 * PDF per student) or one combined PDF. Admin only: teachers can read only
 * their own report drafts.
 */
const CourseReportCardsDownload = ({ roster }) => {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [type, setType] = useState('')
  const [showModal, setShowModal] = useState(false)
  const rosterKey = roster.map((s) => s.id).join(',')

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    loadCourseReports(
      firestore,
      roster.map((s) => s.id),
    )
      .then((loaded) => active && setRecords(loaded))
      .catch((error) => active && setLoadError(error.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [rosterKey])

  const scope = useReportScope(records)

  // Report types present in this year and term, most common first.
  const types = useMemo(() => {
    const counts = new Map()
    for (const record of scope.records) {
      const entry = counts.get(record.reportCardType) || { label: typeLabel(record), count: 0 }
      entry.count += 1
      counts.set(record.reportCardType, entry)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([id, entry]) => ({ id, ...entry }))
  }, [scope.records])

  useEffect(() => {
    if (!types.some((t) => t.id === type)) setType(types[0]?.id || '')
  }, [types, type])

  const reports = scope.records.filter((record) => record.reportCardType === type)
  const withReport = new Set(reports.map((r) => String(r.studentId)))
  const studentsWithoutReport = roster
    .filter((s) => !withReport.has(String(s.id)))
    .map((s) => ({ id: s.id, studentName: s.name || s.id }))
  const approved = reports.filter((r) => r.status === 'approved').length

  return (
    <CCard className="mt-4">
      <CCardBody>
        <h4>Report Cards</h4>
        <p className="text-body-secondary">
          Download this class&apos;s approved report cards as a ZIP (one PDF per student) or as one
          PDF to print.
        </p>
        {loadError && <CAlert color="danger">Could not load report cards: {loadError}</CAlert>}
        {loading ? (
          <CSpinner size="sm" />
        ) : (
          <>
            <ReportScopeFilter scope={scope} />
            {types.length === 0 ? (
              <p className="mb-0">No report cards for this class in this school year and term.</p>
            ) : (
              <div className="d-flex flex-wrap align-items-end gap-3">
                <div>
                  <label className="form-label" htmlFor="course-report-type">
                    Report type
                  </label>
                  <CFormSelect
                    id="course-report-type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label} ({t.count})
                      </option>
                    ))}
                  </CFormSelect>
                </div>
                <CButton color="primary" onClick={() => setShowModal(true)}>
                  Download report cards ({approved} of {roster.length} approved)
                </CButton>
              </div>
            )}
          </>
        )}
        <ClassPrintModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          reports={reports}
          studentsWithoutReport={studentsWithoutReport}
          reapprovalHint="Re-approve them under Report Cards > Admin Review (filter to Approved), then come back here."
        />
      </CCardBody>
    </CCard>
  )
}

CourseReportCardsDownload.propTypes = {
  roster: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, name: PropTypes.string }))
    .isRequired,
}

export default CourseReportCardsDownload
