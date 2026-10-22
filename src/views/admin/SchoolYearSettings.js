import React, { useEffect, useState } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CForm,
  CFormLabel,
  CFormInput,
  CButton,
  CSpinner,
  CAlert,
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CProgress,
} from '@coreui/react'
import { firestore } from '../../Firebase/firebase'
import useAuth from '../../Firebase/useAuth'
import { toast } from 'react-hot-toast'
import CIcon from '@coreui/icons-react'
import { cilSettings, cilCalendar, cilWarning } from '@coreui/icons'
import { fetchSchoolYearSettings, saveSchoolYearSettings } from '../ReportCard/utils/schoolYear'
import {
  archiveAndStartNewSchoolYear,
  canStartNewSchoolYear,
  getEarliestArchiveDate,
} from '../ReportCard/utils/archiveSchoolYear'
import { recalculateAttendanceStatsFromDate } from '../attendance/utils/recalculateAttendanceStats'

/**
 * Admin settings for the current school-year boundary.
 *
 * This boundary is what keeps attendance totals and report card drafts from
 * a prior year bleeding into the current one (see utils/schoolYear.js and
 * the draft-loading logic in ReportCard/utils.js).
 */
const SchoolYearSettings = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState({ label: '', startDate: '' })
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState({ show: false, message: '', color: 'success' })

  const [recalculating, setRecalculating] = useState(false)
  const [recalcProgress, setRecalcProgress] = useState(null)

  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [archiveConfirmText, setArchiveConfirmText] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [archiving, setArchiving] = useState(false)
  const [archiveProgress, setArchiveProgress] = useState(null)

  useEffect(() => {
    fetchSchoolYearSettings(firestore).then((info) => {
      setCurrent(info)
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    if (!user) return
    try {
      setSaving(true)
      await saveSchoolYearSettings(firestore, current)
      setAlert({ show: true, message: 'School year settings saved.', color: 'success' })
      toast.success('School year settings saved')
    } catch (error) {
      console.error('Error saving school year settings:', error)
      setAlert({ show: true, message: 'Error saving settings. Please try again.', color: 'danger' })
      toast.error('Failed to save school year settings')
    } finally {
      setSaving(false)
    }
  }

  const handleRecalculateAttendance = async () => {
    try {
      setRecalculating(true)
      setRecalcProgress(null)
      const { studentsUpdated } = await recalculateAttendanceStatsFromDate(
        firestore,
        current.startDate,
        { onProgress: (done, total) => setRecalcProgress({ done, total }) },
      )
      toast.success(`Attendance recalculated for ${studentsUpdated} students`)
      setAlert({
        show: true,
        message: `Attendance totals recalculated from ${current.startDate} onward for ${studentsUpdated} students.`,
        color: 'success',
      })
    } catch (error) {
      console.error('Error recalculating attendance:', error)
      toast.error('Failed to recalculate attendance')
      setAlert({
        show: true,
        message: 'Error recalculating attendance. Please try again.',
        color: 'danger',
      })
    } finally {
      setRecalculating(false)
    }
  }

  const openArchiveModal = () => {
    const currentStartYear = current.startDate
      ? new Date(current.startDate).getFullYear()
      : new Date().getFullYear()
    const suggestedStartYear = currentStartYear + 1
    setNewLabel(`${suggestedStartYear}-${suggestedStartYear + 1}`)
    setNewStartDate(`${suggestedStartYear}-09-02`)
    setArchiveConfirmText('')
    setShowArchiveModal(true)
  }

  const handleArchiveAndStartNewYear = async () => {
    try {
      setArchiving(true)
      setArchiveProgress(null)
      const { studentsArchived } = await archiveAndStartNewSchoolYear(
        firestore,
        {
          outgoingLabel: current.label,
          outgoingStartDate: current.startDate,
          newLabel,
          newStartDate,
        },
        { onProgress: (done, total) => setArchiveProgress({ done, total }) },
      )
      setCurrent({ label: newLabel, startDate: newStartDate })
      setShowArchiveModal(false)
      toast.success(`Archived ${studentsArchived} students and started ${newLabel}`)
      setAlert({
        show: true,
        message: `Archived attendance for ${studentsArchived} students under ${current.label}, and started ${newLabel}.`,
        color: 'success',
      })
    } catch (error) {
      console.error('Error archiving school year:', error)
      toast.error(error.message || 'Failed to start new school year')
    } finally {
      setArchiving(false)
    }
  }

  const archiveAllowed = canStartNewSchoolYear(current.startDate)
  const earliestArchiveDate = getEarliestArchiveDate(current.startDate)?.toLocaleDateString(
    'en-CA',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  )

  if (loading) {
    return (
      <CCard>
        <CCardBody className="text-center">
          <CSpinner />
          <p className="mt-2">Loading settings...</p>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <div className="school-year-settings">
      <CCard className="shadow-sm mb-4">
        <CCardHeader className="bg-primary text-white">
          <div className="d-flex align-items-center">
            <CIcon icon={cilCalendar} className="me-2" size="lg" />
            <h4 className="mb-0">School Year</h4>
          </div>
        </CCardHeader>
        <CCardBody className="p-4">
          {alert.show && (
            <CAlert
              color={alert.color}
              dismissible
              onClose={() => setAlert({ ...alert, show: false })}
              className="mb-4"
            >
              {alert.message}
            </CAlert>
          )}

          <CForm>
            <div className="mb-4 p-3 border rounded bg-light">
              <CFormLabel className="fw-semibold mb-1" style={{ fontSize: '1.1rem' }}>
                Current School Year
              </CFormLabel>
              <p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>
                Attendance totals and report card drafts are scoped to this year, starting on the
                date below. Report cards/drafts carried over from before this date are treated as
                last year's and won't show up as "already filled in."
              </p>
              <div className="row g-3">
                <div className="col-md-6">
                  <CFormLabel htmlFor="schoolYearLabel">Label</CFormLabel>
                  {/* Read-only: drafts are tagged with this label, so renaming the
                      current year would make its own drafts look like a prior year's.
                      It changes only via "Start New School Year". */}
                  <CFormInput id="schoolYearLabel" value={current.label} readOnly disabled />
                </div>
                <div className="col-md-6">
                  <CFormLabel htmlFor="schoolYearStartDate">Start Date</CFormLabel>
                  <CFormInput
                    id="schoolYearStartDate"
                    type="date"
                    value={current.startDate}
                    onChange={(e) => setCurrent({ ...current, startDate: e.target.value })}
                  />
                </div>
              </div>
              <CButton color="primary" className="mt-3" onClick={handleSave} disabled={saving}>
                {saving ? <CSpinner size="sm" className="me-2" /> : null}
                Save
              </CButton>
            </div>

            <div className="mb-4 p-3 border rounded bg-light">
              <CFormLabel className="fw-semibold mb-1" style={{ fontSize: '1.1rem' }}>
                Start This Year's Attendance Fresh
              </CFormLabel>
              <p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>
                Recomputes every student's attendance counts from actual attendance records on or
                after the start date above, discarding anything from before it. This is the button
                to use to start {current.label} fresh — last year's report cards and drafts are
                already excluded automatically, so no archiving is needed.
              </p>
              <CButton
                color="warning"
                onClick={handleRecalculateAttendance}
                disabled={recalculating}
              >
                {recalculating ? <CSpinner size="sm" className="me-2" /> : null}
                Recalculate Attendance from {current.startDate}
              </CButton>
              {recalcProgress && (
                <CProgress
                  className="mt-2"
                  value={(recalcProgress.done / recalcProgress.total) * 100}
                />
              )}
            </div>

            <div className="mb-2 p-3 border rounded" style={{ borderColor: '#dc3545' }}>
              <CFormLabel className="fw-semibold mb-1" style={{ fontSize: '1.1rem' }}>
                <CIcon icon={cilWarning} className="me-2 text-danger" />
                Start New School Year
              </CFormLabel>
              <p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>
                For the end of {current.label || 'the current year'} only (e.g. next summer). Closes
                out {current.label || 'the current year'}: archives every student's attendance
                totals, resets them to zero, and moves the school year boundary forward. Running it
                mid-year would wipe this year's attendance and hide this year's report card drafts.
              </p>
              {!archiveAllowed && earliestArchiveDate && (
                <p className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                  {current.label} is still in progress. Available from {earliestArchiveDate}.
                </p>
              )}
              <CButton color="danger" onClick={openArchiveModal} disabled={!archiveAllowed}>
                Archive & Start New School Year
              </CButton>
            </div>
          </CForm>
        </CCardBody>
      </CCard>

      <CModal visible={showArchiveModal} onClose={() => !archiving && setShowArchiveModal(false)}>
        <CModalHeader>
          <h5>Archive {current.label} & Start New School Year</h5>
        </CModalHeader>
        <CModalBody>
          <p>
            This will archive every student's attendance totals under{' '}
            <strong>{current.label}</strong>, reset their live counts to zero, and switch the active
            school year to the values below.
          </p>
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <CFormLabel htmlFor="newSchoolYearLabel">New Label</CFormLabel>
              <CFormInput
                id="newSchoolYearLabel"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <CFormLabel htmlFor="newSchoolYearStartDate">New Start Date</CFormLabel>
              <CFormInput
                id="newSchoolYearStartDate"
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
              />
            </div>
          </div>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>
            Type <strong>ARCHIVE</strong> below to confirm.
          </p>
          <CFormInput
            value={archiveConfirmText}
            onChange={(e) => setArchiveConfirmText(e.target.value)}
            placeholder="ARCHIVE"
          />
          {archiveProgress && (
            <CProgress
              className="mt-3"
              value={(archiveProgress.done / archiveProgress.total) * 100}
            />
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => setShowArchiveModal(false)}
            disabled={archiving}
          >
            Cancel
          </CButton>
          <CButton
            color="danger"
            onClick={handleArchiveAndStartNewYear}
            disabled={
              archiving ||
              archiveConfirmText !== 'ARCHIVE' ||
              !newLabel ||
              !newStartDate ||
              newLabel === current.label
            }
          >
            {archiving ? <CSpinner size="sm" className="me-2" /> : null}
            Archive & Start New Year
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default SchoolYearSettings
