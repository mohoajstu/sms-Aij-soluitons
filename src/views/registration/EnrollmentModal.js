import React, { useEffect, useState } from 'react'
import { CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CButton, CFormSelect, CFormLabel, CAlert, CSpinner } from '@coreui/react'
import { registrationEnrollment } from '../../services/registrationEnrollment'

export default function EnrollmentModal({ application, onClose, onEnrolled }) {
  const [preview, setPreview] = useState(null)
  const [courseId, setCourseId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setError(''); setPreview(null)
    registrationEnrollment('preview', { applicationId: application.id }).then((data) => {
      if (!active) return
      setPreview(data)
      setCourseId(data.enrollment?.courseId || (data.homerooms.length === 1 ? data.homerooms[0].id : ''))
      setStudentId(data.enrollment?.studentId && data.candidates.some((s) => s.id === data.enrollment.studentId) ? data.enrollment.studentId : '')
    }).catch((e) => active && setError(e.message))
    return () => { active = false }
  }, [application.id, attempt])
  const submit = async () => {
    if (busy || !courseId) return
    setBusy(true); setError('')
    try {
      const saved = await registrationEnrollment('enroll', { applicationId: application.id, courseId, selectedStudentId: studentId || undefined })
      setResult(saved)
      onEnrolled(application.id, saved)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <CModal visible onClose={() => !busy && onClose()} backdrop="static">
    <CModalHeader closeButton={!busy}><CModalTitle>{application.status === 'approved' ? 'Complete or verify enrollment' : 'Approve and enroll'}</CModalTitle></CModalHeader>
    <CModalBody>
      {error && <CAlert color="danger">{error}</CAlert>}
      {!preview && !error && <CSpinner />}
      {!preview && error && <CButton onClick={() => setAttempt((n) => n + 1)}>Retry loading</CButton>}
      {result ? <CAlert color="success">Enrollment complete. Student ID: <strong>{result.enrollment.studentId}</strong>.<br />
        Class: {result.enrollment.courseTitle}. The student is on the attendance roster.</CAlert> : preview && <>
        <p><strong>{preview.name}</strong> · {preview.grade}</p>
        <p>Creates or links the student and guardian records, then adds the student to the selected class. Retrying will use the same student record.</p>
        {preview.candidates.length > 0 && <>
          <CFormLabel htmlFor="enrollment-student">Existing student match — confirm the correct record</CFormLabel>
          <CFormSelect id="enrollment-student" value={studentId} disabled={busy} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Select existing student</option>
            {preview.candidates.map((s) => <option key={s.id} value={s.id} disabled={!s.active}>{s.name} · {s.id} · {s.grade} · DOB {s.dob || 'not recorded'}{!s.active ? ' (inactive)' : ''}</option>)}
          </CFormSelect>
        </>}
        <CFormLabel htmlFor="enrollment-course" className="mt-3">Homeroom</CFormLabel>
        <CFormSelect id="enrollment-course" value={courseId} disabled={busy || !!preview.enrollment?.courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">Select a homeroom</option>
          {preview.homerooms.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </CFormSelect>
        {!preview.homerooms.length && <CAlert color="warning" className="mt-2">No active homeroom matches this grade. Create or correct the class before enrolling.</CAlert>}
        <p className="small text-muted mt-3">Acceptance emails are sent separately.</p>
      </>}
    </CModalBody>
    <CModalFooter>
      <CButton color="secondary" disabled={busy} onClick={onClose}>{result ? 'Done' : 'Cancel'}</CButton>
      {!result && <CButton color="primary" disabled={busy || !preview || !courseId || (preview.candidates.length > 0 && !studentId)} onClick={submit}>
        {busy ? 'Saving enrollment…' : application.status === 'approved' ? 'Complete enrollment' : 'Approve and enroll'}
      </CButton>}
    </CModalFooter>
  </CModal>
}
