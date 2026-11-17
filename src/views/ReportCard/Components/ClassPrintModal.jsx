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
import {
  mergeReportPdfs,
  planClassPrint,
  printFileName,
  zipFileName,
  zipReportPdfs,
} from '../utils/classPrint'
import { printPdfBytes } from '../utils/printPdf'

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

/**
 * Downloads a class's approved report cards, either as a ZIP with one PDF per
 * student or as a single PDF to print in one job, sorted by grade and student
 * name. Reports that are not approved, have no final PDF, or were generated
 * before the 7-8 progress comment fix are listed and left out, as are class
 * members with no report, so nobody silently drops out.
 */
const ClassPrintModal = ({
  visible,
  onClose,
  reports,
  studentsWithoutReport = [],
  onSelectForReapproval,
  reapprovalHint,
  fetchBytes,
  print = printPdfBytes,
}) => {
  const plan = useMemo(() => planClassPrint(reports), [reports])
  const [progress, setProgress] = useState(null)
  const [format, setFormat] = useState(null)
  const [error, setError] = useState('')
  const busy = progress !== null

  const download = async (kind) => {
    const asZip = kind === 'zip'
    setError('')
    setFormat(kind)
    setProgress(0)
    try {
      const build = asZip ? zipReportPdfs : mergeReportPdfs
      const bytes = await build(plan.ready, { fetchBytes, onProgress: (done) => setProgress(done) })
      if (kind === 'print') {
        await print(bytes)
        onClose()
        return
      }
      const type = asZip ? 'application/zip' : 'application/pdf'
      const url = URL.createObjectURL(new Blob([bytes], { type }))
      const link = document.createElement('a')
      link.href = url
      link.download = asZip ? zipFileName(plan.ready) : printFileName(plan.ready)
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
        <CModalTitle>Print or download report cards</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CAlert color={plan.ready.length ? 'success' : 'secondary'} className="py-2">
          <strong>{plan.ready.length}</strong> report(s) ready, sorted by grade and student name.
          Print sends the whole class to the printer in one job; the ZIP has one PDF per student.
        </CAlert>
        {plan.needsReapproval.length > 0 && (
          <CAlert color="danger" className="py-2" data-testid="needs-reapproval">
            <strong>
              {plan.needsReapproval.length} Grade 7-8 progress report(s) need re-approving first.
            </strong>{' '}
            Their PDFs were made before the fix and are missing subject comments, so they are left
            out.
            <NameList reports={plan.needsReapproval} />
            {onSelectForReapproval ? (
              <CButton
                color="danger"
                size="sm"
                variant="outline"
                className="mt-2"
                disabled={busy}
                onClick={() => onSelectForReapproval(plan.needsReapproval.map((r) => r.id))}
              >
                Select these for re-approval
              </CButton>
            ) : (
              reapprovalHint && <div className="small mt-2">{reapprovalHint}</div>
            )}
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
              Adding {progress} of {plan.ready.length}...
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
        <CButton
          color="primary"
          variant="outline"
          onClick={() => download('pdf')}
          disabled={busy || plan.ready.length === 0}
        >
          {busy && format === 'pdf' ? 'Preparing...' : `Download ${plan.ready.length} as one PDF`}
        </CButton>
        <CButton
          color="primary"
          variant="outline"
          onClick={() => download('zip')}
          disabled={busy || plan.ready.length === 0}
        >
          {busy && format === 'zip' ? 'Preparing ZIP...' : `Download ${plan.ready.length} as ZIP`}
        </CButton>
        <CButton
          color="primary"
          onClick={() => download('print')}
          disabled={busy || plan.ready.length === 0}
        >
          {busy && format === 'print' ? 'Preparing to print...' : `Print ${plan.ready.length}`}
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
  onSelectForReapproval: PropTypes.func,
  reapprovalHint: PropTypes.node,
  fetchBytes: PropTypes.func,
  print: PropTypes.func,
}

export default ClassPrintModal
