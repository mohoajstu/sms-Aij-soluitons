import React, { useEffect, useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CForm,
  CFormLabel,
  CFormInput,
  CFormCheck,
  CButton,
  CAlert,
  CSpinner,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from '@coreui/react'
import { collection, getDocs } from 'firebase/firestore'
import { firestore } from '../../firebase'
import {
  getTimekeepingSettings,
  updateTimekeepingSettings,
  defaultTimekeepingSettings,
  saveStaffOverrides,
  normalizeStaffEmail,
} from '../../services/timekeepingSettings'

const TimekeepingSettings = () => {
  const [form, setForm] = useState(defaultTimekeepingSettings())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [staff, setStaff] = useState([])
  const [overrides, setOverrides] = useState({})
  const [savingStaff, setSavingStaff] = useState(false)
  const [staffMessage, setStaffMessage] = useState(null)

  useEffect(() => {
    let cancelled = false
    getTimekeepingSettings({ forceRefresh: true })
      .then((s) => {
        if (cancelled) return
        setForm(s)
        setOverrides(s.staffOverrides || {})
      })
      .catch(() => !cancelled && setForm(defaultTimekeepingSettings()))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    getDocs(collection(firestore, 'faculty'))
      .then((snap) => {
        if (cancelled) return
        const rows = snap.docs.map((d) => {
          const data = d.data()
          const p = data.personalInfo || {}
          const firstName = p.firstName || data.firstName || ''
          const lastName = p.lastName || data.lastName || ''
          return {
            id: d.id,
            name: `${firstName} ${lastName}`.trim() || 'Unnamed staff',
            email: normalizeStaffEmail(p.email || data.email),
          }
        })
        rows.sort((a, b) => a.name.localeCompare(b.name))
        setStaff(rows)
      })
      .catch((err) => {
        console.error('Failed to load faculty list:', err)
        !cancelled &&
          setStaffMessage({ tone: 'danger', text: 'Could not load the staff list.' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const update = (patch) => setForm((f) => ({ ...f, ...patch }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const payload = {
        enabled: Boolean(form.enabled),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        radiusMeters: Math.max(10, Number(form.radiusMeters) || 0),
        expectedCheckInTime: form.expectedCheckInTime || '08:00',
        expectedCheckOutTime: form.expectedCheckOutTime || '16:00',
        graceMinutes: Math.max(0, Number(form.graceMinutes) || 0),
      }
      if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
        throw new Error('Latitude and longitude must be numbers.')
      }
      await updateTimekeepingSettings(payload)
      setMessage({ tone: 'success', text: 'Settings saved.' })
    } catch (err) {
      console.error('Failed to save timekeeping settings:', err)
      setMessage({ tone: 'danger', text: err.message || 'Failed to save settings.' })
    } finally {
      setSaving(false)
    }
  }

  const updateOverride = (email, field, value) =>
    setOverrides((prev) => ({
      ...prev,
      [email]: { ...(prev[email] || {}), [field]: value },
    }))

  const handleSaveStaff = async () => {
    setSavingStaff(true)
    setStaffMessage(null)
    try {
      const cleaned = {}
      for (const [email, entry] of Object.entries(overrides)) {
        if (!email || !entry) continue
        const out = {}
        if (entry.expectedCheckInTime) out.expectedCheckInTime = entry.expectedCheckInTime
        if (entry.expectedCheckOutTime) out.expectedCheckOutTime = entry.expectedCheckOutTime
        if (entry.graceMinutes !== '' && entry.graceMinutes != null) {
          const grace = Number(entry.graceMinutes)
          if (Number.isFinite(grace) && grace >= 0) out.graceMinutes = grace
        }
        if (Object.keys(out).length > 0) cleaned[email] = out
      }
      await saveStaffOverrides(cleaned)
      setOverrides(cleaned)
      setStaffMessage({ tone: 'success', text: 'Staff schedules saved.' })
    } catch (err) {
      console.error('Failed to save staff schedules:', err)
      setStaffMessage({ tone: 'danger', text: err.message || 'Failed to save staff schedules.' })
    } finally {
      setSavingStaff(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <CSpinner />
      </div>
    )
  }

  return (
    <>
    <CCard>
      <CCardHeader>Timekeeping Rules</CCardHeader>
      <CCardBody>
        <CForm onSubmit={handleSave}>
          <CRow className="mb-3">
            <CCol md={12}>
              <CFormCheck
                id="tk-enabled"
                label="Enforce geo-fence (record out-of-range as a violation)"
                checked={!!form.enabled}
                onChange={(e) => update({ enabled: e.target.checked })}
              />
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={4}>
              <CFormLabel htmlFor="tk-lat">School latitude</CFormLabel>
              <CFormInput
                id="tk-lat"
                type="number"
                step="0.000001"
                value={form.latitude ?? ''}
                onChange={(e) => update({ latitude: e.target.value })}
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel htmlFor="tk-lng">School longitude</CFormLabel>
              <CFormInput
                id="tk-lng"
                type="number"
                step="0.000001"
                value={form.longitude ?? ''}
                onChange={(e) => update({ longitude: e.target.value })}
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel htmlFor="tk-radius">Radius (meters)</CFormLabel>
              <CFormInput
                id="tk-radius"
                type="number"
                min="10"
                step="10"
                value={form.radiusMeters ?? ''}
                onChange={(e) => update({ radiusMeters: e.target.value })}
              />
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={4}>
              <CFormLabel htmlFor="tk-in">Expected check-in</CFormLabel>
              <CFormInput
                id="tk-in"
                type="time"
                value={form.expectedCheckInTime || '08:00'}
                onChange={(e) => update({ expectedCheckInTime: e.target.value })}
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel htmlFor="tk-out">Expected check-out</CFormLabel>
              <CFormInput
                id="tk-out"
                type="time"
                value={form.expectedCheckOutTime || '16:00'}
                onChange={(e) => update({ expectedCheckOutTime: e.target.value })}
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel htmlFor="tk-grace">Grace period (minutes)</CFormLabel>
              <CFormInput
                id="tk-grace"
                type="number"
                min="0"
                step="1"
                value={form.graceMinutes ?? 0}
                onChange={(e) => update({ graceMinutes: e.target.value })}
              />
            </CCol>
          </CRow>

          {message && <CAlert color={message.tone}>{message.text}</CAlert>}

          <CButton color="primary" type="submit" disabled={saving}>
            {saving ? <CSpinner size="sm" className="me-2" /> : null}
            Save Settings
          </CButton>
        </CForm>
      </CCardBody>
    </CCard>

    <CCard className="mt-4">
      <CCardHeader>Staff Schedules</CCardHeader>
      <CCardBody>
        <p className="text-muted">
          Set custom hours for part-time or alternate-schedule staff. Blank fields use the school
          defaults above ({form.expectedCheckInTime}–{form.expectedCheckOutTime},{' '}
          {form.graceMinutes}-min grace).
        </p>

        {staff.length === 0 ? (
          <p className="text-muted mb-0">No staff found in the faculty list.</p>
        ) : (
          <CTable small responsive align="middle">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Name</CTableHeaderCell>
                <CTableHeaderCell>Email</CTableHeaderCell>
                <CTableHeaderCell>Check-in</CTableHeaderCell>
                <CTableHeaderCell>Check-out</CTableHeaderCell>
                <CTableHeaderCell>Grace (min)</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {staff.map((member) => {
                const entry = (member.email && overrides[member.email]) || {}
                return (
                  <CTableRow key={member.id}>
                    <CTableDataCell>{member.name}</CTableDataCell>
                    <CTableDataCell>
                      {member.email || <em className="text-muted">no email on file</em>}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CFormInput
                        type="time"
                        size="sm"
                        disabled={!member.email}
                        value={entry.expectedCheckInTime || ''}
                        onChange={(e) =>
                          updateOverride(member.email, 'expectedCheckInTime', e.target.value)
                        }
                      />
                    </CTableDataCell>
                    <CTableDataCell>
                      <CFormInput
                        type="time"
                        size="sm"
                        disabled={!member.email}
                        value={entry.expectedCheckOutTime || ''}
                        onChange={(e) =>
                          updateOverride(member.email, 'expectedCheckOutTime', e.target.value)
                        }
                      />
                    </CTableDataCell>
                    <CTableDataCell>
                      <CFormInput
                        type="number"
                        size="sm"
                        min="0"
                        step="1"
                        placeholder={String(form.graceMinutes ?? '')}
                        disabled={!member.email}
                        value={entry.graceMinutes ?? ''}
                        onChange={(e) =>
                          updateOverride(member.email, 'graceMinutes', e.target.value)
                        }
                      />
                    </CTableDataCell>
                  </CTableRow>
                )
              })}
            </CTableBody>
          </CTable>
        )}

        {staffMessage && <CAlert color={staffMessage.tone}>{staffMessage.text}</CAlert>}

        <CButton
          color="primary"
          disabled={savingStaff || staff.length === 0}
          onClick={handleSaveStaff}
        >
          {savingStaff ? <CSpinner size="sm" className="me-2" /> : null}
          Save Staff Schedules
        </CButton>
      </CCardBody>
    </CCard>
    </>
  )
}

export default TimekeepingSettings
