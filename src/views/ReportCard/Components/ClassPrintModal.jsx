import React, { useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CProgress,
} from '@coreui/react'
import { firestore } from '../../../Firebase/firebase'
import { planClassPrint, zipFileName, zipReportPdfs } from '../utils/classPrint'
import { generateReportPdf } from '../utils/reportPdf'

const NameList = ({ reports }) => (
  <ul className="mb-0 small" style={{ maxHeight: 140, overflowY: 'auto' }}>
    {reports.map((report) => (
      <li key={report.id}>
        {report.studentName}
        {report.grade ? ` (Grade ${report.grade})` : ''}
        {report.reportCardTypeName || report.reportCardType
          ? ` - ${report.reportCardTypeName || report.reportCardType}`
          : ''}
      </li>
    ))}
  </ul>
)
NameList.propTypes = { reports: PropTypes.array.isRequired }

const buildFromSavedData = (report) => generateReportPdf(firestore, report)

/**
 * Downloads a class's approved report cards as one ZIP, one PDF per student,
 * numbered in grade and student-name order. Each PDF is built in the browser
 * from the report's saved data, the same way approving it does, so nothing is
 * read back from Firebase Storage. Reports that are not approved, and class
 * members with no report, are listed so nobody silently drops out.
 */
const ClassPrintModal = ({
  visible,
  onClose,
  reports,
  studentsWithoutReport = [],
  getPdfBytes = buildFromSavedData,
}) => {
  const plan = useMemo(() => planClassPrint(reports), [reports])
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const busy = progress !== null

  const download = async () => {
    setError('')
    setProgress(0)
    try {
      const bytes = await zipReportPdfs(plan.ready, {
        getPdfBytes,
        onProgress: (done) => setProgress(done),
      })
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }))
      const link = document.createElement('a')
      link.href = url
      link.download = zipFileName(plan.ready)
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
      onClose()
    } catch (downloadError) {
      setError(downloadError.message)
    } finally {
      setProgress(null)
    }
  }

  return (
    <CModal
      visible={visible}
      onClose={busy ? undefined : onClose}
      size="lg"
      backdrop={busy ? 'static' : true}
    >
      <CModalHeader closeButton={!busy}>
        <CModalTitle>Download report cards (ZIP)</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CAlert color={plan.ready.length ? 'success' : 'secondary'} className="py-2">
          <strong>{plan.ready.length}</strong> approved report(s). The ZIP has one PDF per student,
          numbered in grade and student-name order.
        </CAlert>
        {plan.notApproved.length > 0 && (
          <CAlert color="warning" className="py-2" data-testid="not-approved">
            <strong>{plan.notApproved.length} not approved yet, so not included:</strong>
            <NameList reports={plan.notApproved} />
          </CAlert>
        )}
        {studentsWithoutReport.length > 0 && (
          <CAlert color="warning" className="py-2" data-testid="no-report">
            <strong>
              {studentsWithoutReport.length} student(s) in this class have no report of this type:
            </strong>
            <NameList reports={studentsWithoutReport} />
          </CAlert>
        )}
        {busy && (
          <div className="mt-2">
            <small>
              Building PDF {progress} of {plan.ready.length}...
            </small>
            <CProgress
              value={plan.ready.length ? (progress / plan.ready.length) * 100 : 0}
              className="mt-1"
            />
          </div>
        )}
        {error && (
          <CAlert color="danger" className="py-2 mt-2">
            {error}
          </CAlert>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={download} disabled={busy || plan.ready.length === 0}>
          {busy ? 'Building ZIP...' : `Download ${plan.ready.length} as ZIP`}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

ClassPrintModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  reports: PropTypes.array.isRequired,
  studentsWithoutReport: PropTypes.array,
  getPdfBytes: PropTypes.func,
}

export default ClassPrintModal
