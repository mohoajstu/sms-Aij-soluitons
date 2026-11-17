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
import { mergeReportPdfs, planClassPrint, printFileName } from '../utils/classPrint'

const NameList = ({ reports }) => (
  <ul className="mb-0 small" style={{ maxHeight: 140, overflowY: 'auto' }}>
    {reports.map((report) => (
      <li key={report.id}>
        {report.studentName}
        {report.grade ? ` (Grade ${report.grade})` : ''} -{' '}
        {report.reportCardTypeName || report.reportCardType}
      </li>
    ))}
  </ul>
)
NameList.propTypes = { reports: PropTypes.array.isRequired }

/**
 * Downloads every approved report in the current filter as one PDF, in
 * grade/student order, so a class can be printed in a single job. Reports
 * that are not approved, have no final PDF, or were generated before the 7-8
 * progress comment fix are listed and left out rather than printed silently.
 */
const ClassPrintModal = ({ visible, onClose, reports, onSelectForReapproval, fetchBytes }) => {
  const plan = useMemo(() => planClassPrint(reports), [reports])
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const busy = progress !== null

  const download = async () => {
    setError('')
    setProgress(0)
    try {
      const bytes = await mergeReportPdfs(plan.ready, {
        fetchBytes,
        onProgress: (done) => setProgress(done),
      })
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.download = printFileName(plan.ready)
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
        <CModalTitle>Download for printing</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="mb-3">
          Uses the reports in the current filter. Set the grade and report type above to print one
          class.
        </p>
        <CAlert color={plan.ready.length ? 'success' : 'secondary'} className="py-2">
          <strong>{plan.ready.length}</strong> report(s) ready. They will download as one PDF,
          sorted by grade and student name.
        </CAlert>
        {plan.needsReapproval.length > 0 && (
          <CAlert color="danger" className="py-2" data-testid="needs-reapproval">
            <strong>
              {plan.needsReapproval.length} Grade 7-8 progress report(s) need re-approving first.
            </strong>{' '}
            Their PDFs were made before the fix and are missing subject comments, so they are left
            out.
            <NameList reports={plan.needsReapproval} />
            <CButton
              color="danger"
              size="sm"
              variant="outline"
              className="mt-2"
              disabled={busy}
              onClick={() => onSelectForReapproval(plan.needsReapproval.map((report) => report.id))}
            >
              Select these for re-approval
            </CButton>
          </CAlert>
        )}
        {plan.notApproved.length > 0 && (
          <CAlert color="warning" className="py-2" data-testid="not-approved">
            <strong>{plan.notApproved.length} not approved yet, so not included:</strong>
            <NameList reports={plan.notApproved} />
          </CAlert>
        )}
        {plan.missingPdf.length > 0 && (
          <CAlert color="warning" className="py-2">
            <strong>
              {plan.missingPdf.length} approved but with no final PDF. Re-approve to create one:
            </strong>
            <NameList reports={plan.missingPdf} />
          </CAlert>
        )}
        {busy && (
          <div className="mt-2">
            <small>
              Combining {progress} of {plan.ready.length}...
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
          {busy ? 'Preparing...' : `Download ${plan.ready.length} as one PDF`}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

ClassPrintModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  reports: PropTypes.array.isRequired,
  onSelectForReapproval: PropTypes.func.isRequired,
  fetchBytes: PropTypes.func,
}

export default ClassPrintModal
