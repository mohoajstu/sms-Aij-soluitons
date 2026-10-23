import React, { useEffect, useState } from 'react'
import { CAlert, CButton, CFormLabel, CFormSelect, CSpinner } from '@coreui/react'
import useAuth from '../Firebase/useAuth'
import { actAsRequest, canActAs, getActAsSession, startActAs, endActAs } from '../services/actAs'

const ActAsControl = () => {
  const { user } = useAuth()
  const session = getActAsSession()
  const [open, setOpen] = useState(false)
  const [teachers, setTeachers] = useState([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setError('')
    actAsRequest('list').then((result) => { if (active) setTeachers(result.teachers) })
      .catch((err) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [open, retry])
  if (session) return (
    <div className="w-100 px-4 py-3 bg-warning-subtle border-bottom d-flex flex-wrap align-items-center justify-content-between gap-3" role="status">
      <div className="text-break" style={{ minWidth: 0 }}><strong>Acting as {session.targetName}</strong><div className="small">{session.targetEmail} · Changes are saved as this teacher.</div></div>
      <CButton color="dark" variant="outline" disabled={busy} onClick={() => {
        setBusy(true)
        endActAs().catch((err) => { setError(err.message); setBusy(false) })
      }}>{busy ? 'Returning…' : 'Return to my admin account'}</CButton>
      {error && <CAlert color="danger" className="w-100 mb-0">{error}</CAlert>}
    </div>
  )
  if (!canActAs(user)) return null
  return (
    <div className="w-100 px-4 py-3 border-bottom">
      <CButton color="primary" variant="outline" aria-expanded={open} aria-controls="act-as-teacher" onClick={() => setOpen(!open)}>Act as teacher</CButton>
      {open && <section id="act-as-teacher" className="mt-3" aria-label="Act as teacher">
        <p>Open a teacher’s view with full access. Your changes will be saved to their records. Sessions last 30 minutes.</p>
        {loading ? <div role="status"><CSpinner size="sm" /> Loading teachers…</div> : <>
          {error && <CAlert color="danger">{error} <CButton color="danger" variant="outline" size="sm" disabled={busy} onClick={() => setRetry(retry + 1)}>Retry</CButton></CAlert>}
          {!error && teachers.length === 0 && <p className="mb-0">No active teachers are available.</p>}
          {teachers.length > 0 && <div className="d-flex flex-wrap align-items-end gap-3">
            <div className="flex-grow-1"><CFormLabel htmlFor="act-as-selection">Teacher</CFormLabel>
              <CFormSelect id="act-as-selection" value={selected} disabled={busy} onChange={(e) => setSelected(e.target.value)}>
                <option value="">Select a teacher</option>
                {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} — {teacher.email}</option>)}
              </CFormSelect>
            </div>
            <CButton color="primary" disabled={!selected || busy} onClick={async () => {
              setBusy(true); setError('')
              try { await startActAs(selected) } catch (err) { setError(err.message); setBusy(false) }
            }}>{busy ? 'Opening teacher view…' : 'Start acting as teacher'}</CButton>
          </div>}
        </>}
      </section>}
    </div>
  )
}
export default ActAsControl
