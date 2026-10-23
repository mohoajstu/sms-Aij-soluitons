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
  CBadge,
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
  SCHOOL_DAYS,
  DAY_LABELS,
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
  const [expanded, setExpanded] = useState(() => new Set())

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
    Promise.all([
      getDocs(collection(firestore, 'faculty')),
      getDocs(collection(firestore, 'admins')),
    ])
      .then(([facultySnap, adminsSnap]) => {
        if (cancelled) return
        const toRow = (d, extra) => {
          const data = d.data()
          const p = data.personalInfo || {}
          const firstName = p.firstName || data.firstName || ''
          const lastName = p.lastName || data.lastName || ''
          return {
            id: `${extra.keyPrefix}${d.id}`,
            name: `${firstName} ${lastName}`.trim() || 'Unnamed staff',
            // Docs store the email under contact.email; the other two
            // locations are legacy shapes.
            email: normalizeStaffEmail(data.contact?.email || p.email || data.email),
            isAdmin: extra.isAdmin,
          }
        }
        const facultyRows = facultySnap.docs
          .filter((d) => d.data().isTestAccount !== true)
          .map((d) => toRow(d, { keyPrefix: '', isAdmin: false }))
        // Admins check in too. Only school-domain admin accounts belong
        // here; the admins collection also holds dev logins and the
        // no-reply mailbox.
        const adminRows = adminsSnap.docs
          .filter((d) => d.data().isTestAccount !== true)
          .map((d) => toRow(d, { keyPrefix: 'admin-', isAdmin: true }))
          .filter(
            (r) => r.email.endsWith('@tarbiyahlearning.ca') && !r.email.startsWith('no.reply'),
          )
        const rows = [...facultyRows, ...adminRows]
        // One row per person: schedules are keyed by email, so repeated
        // emails collapse into one row, and a no-email row that shares its
        // name with an emailed row is a duplicate doc.
        const normalizeName = (name) => name.replace(/\s+/g, ' ').toLowerCase()
        const seenEmails = new Set()
        const namesWithEmail = new Set(
          rows.filter((r) => r.email).map((r) => normalizeName(r.name)),
        )
        const deduped = rows.filter((r) => {
          if (r.email) {
            if (seenEmails.has(r.email)) return false
            seenEmails.add(r.email)
            return true
          }
          return !namesWithEmail.has(normalizeName(r.name))
        })
        deduped.sort((a, b) => a.name.localeCompare(b.name))
        setStaff(deduped)
      })
      .catch((err) => {
        console.error('Failed to load faculty list:', err)
        !cancelled && setStaffMessage({ tone: 'danger', text: 'Could not load the staff list.' })
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

  const updateDay = (email, dayKey, field, value) =>
    setOverrides((prev) => {
      const entry = prev[email] || {}
      const days = { ...(entry.days || {}) }
      days[dayKey] = { ...(days[dayKey] || {}), [field]: value }
      return { ...prev, [email]: { ...entry, days } }
    })

  const clearDay = (email, dayKey) =>
    setOverrides((prev) => {
      const entry = prev[email] || {}
      const days = { ...(entry.days || {}) }
      delete days[dayKey]
      return { ...prev, [email]: { ...entry, days } }
    })

  const toggleExpanded = (email) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })

  // How many weekdays this person actually differs from their own default on.
  const dayCount = (entry) =>
    SCHOOL_DAYS.filter((d) => {
      const v = (entry.days || {})[d]
      return v && (v.off === true || v.expectedCheckInTime || v.expectedCheckOutTime)
    }).length

  const handleSaveStaff = async () => {
    setSavingStaff(true)
    setStaffMessage(null)
    try {
      // Only times that differ from the school defaults are stored. Staff
      // left at the defaults keep following them, including when the
      // defaults change later.
      const cleaned = {}
      for (const [email, entry] of Object.entries(overrides)) {
        if (!email || !entry) continue
        const out = {}
        if (entry.expectedCheckInTime && entry.expectedCheckInTime !== form.expectedCheckInTime) {
          out.expectedCheckInTime = entry.expectedCheckInTime
        }
        if (
          entry.expectedCheckOutTime &&
          entry.expectedCheckOutTime !== form.expectedCheckOutTime
        ) {
          out.expectedCheckOutTime = entry.expectedCheckOutTime
        }
        if (entry.graceMinutes !== '' && entry.graceMinutes != null) {
          const grace = Number(entry.graceMinutes)
          if (Number.isFinite(grace) && grace >= 0 && grace !== Number(form.graceMinutes)) {
            out.graceMinutes = grace
          }
        }
        // Per-day hours, stored only where they differ from this person's own
        // default. A day marked off is always kept, since "off" is not a time.
        const personIn = out.expectedCheckInTime || form.expectedCheckInTime
        const personOut = out.expectedCheckOutTime || form.expectedCheckOutTime
        const personGrace = out.graceMinutes ?? Number(form.graceMinutes)
        const days = {}
        for (const dayKey of SCHOOL_DAYS) {
          const d = (entry.days || {})[dayKey]
          if (!d) continue
          const dayOut = {}
          if (d.off === true) dayOut.off = true
          if (d.expectedCheckInTime && d.expectedCheckInTime !== personIn) {
            dayOut.expectedCheckInTime = d.expectedCheckInTime
          }
          if (d.expectedCheckOutTime && d.expectedCheckOutTime !== personOut) {
            dayOut.expectedCheckOutTime = d.expectedCheckOutTime
          }
          if (d.graceMinutes !== '' && d.graceMinutes != null) {
            const g = Number(d.graceMinutes)
            if (Number.isFinite(g) && g >= 0 && g !== personGrace) dayOut.graceMinutes = g
          }
          if (Object.keys(dayOut).length > 0) days[dayKey] = dayOut
        }
        if (Object.keys(days).length > 0) out.days = days

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
            Every staff member follows the school default hours above ({form.expectedCheckInTime}–
            {form.expectedCheckOutTime}, {form.graceMinutes}-min grace) until you change their times
            here. Times you change are saved as that person&apos;s own schedule; everyone else keeps
            following the defaults automatically.
          </p>

          {staff.length === 0 ? (
            <p className="text-muted mb-0">No staff found in the faculty list.</p>
          ) : (
            <CTable small responsive align="middle">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Name</CTableHeaderCell>
                  <CTableHeaderCell>Check-in</CTableHeaderCell>
                  <CTableHeaderCell>Check-out</CTableHeaderCell>
                  <CTableHeaderCell>Grace (min)</CTableHeaderCell>
                  <CTableHeaderCell>By day</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {staff.map((member) => {
                  const entry = (member.email && overrides[member.email]) || {}
                  const isOpen = member.email && expanded.has(member.email)
                  const varied = dayCount(entry)
                  return (
                    <React.Fragment key={member.id}>
                      <CTableRow>
                        <CTableDataCell>
                          {member.name}
                          {member.isAdmin && (
                            <CBadge color="secondary" className="ms-2">
                              Admin
                            </CBadge>
                          )}
                          {!member.email && (
                            <div>
                              <small className="text-danger">
                                No email on file — add one in People Management to set a schedule.
                              </small>
                            </div>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            type="time"
                            size="sm"
                            disabled={!member.email}
                            value={entry.expectedCheckInTime || form.expectedCheckInTime || ''}
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
                            value={entry.expectedCheckOutTime || form.expectedCheckOutTime || ''}
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
                            disabled={!member.email}
                            value={entry.graceMinutes ?? form.graceMinutes ?? ''}
                            onChange={(e) =>
                              updateOverride(member.email, 'graceMinutes', e.target.value)
                            }
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            size="sm"
                            color={varied ? 'primary' : 'secondary'}
                            variant="outline"
                            disabled={!member.email}
                            onClick={() => toggleExpanded(member.email)}
                          >
                            {varied ? `${varied} day${varied > 1 ? 's' : ''} differ` : 'Same daily'}
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>

                      {isOpen && (
                        <CTableRow>
                          <CTableDataCell colSpan={5} className="bg-body-tertiary">
                            <div className="small text-muted mb-2">
                              Leave a day blank to use {member.name}&apos;s hours above (
                              {entry.expectedCheckInTime || form.expectedCheckInTime}–
                              {entry.expectedCheckOutTime || form.expectedCheckOutTime}). Tick
                              &quot;Off&quot; for a day they do not come in; check-ins on an off day
                              are recorded but never marked late.
                            </div>
                            <CTable small borderless className="mb-0">
                              <CTableHead>
                                <CTableRow>
                                  <CTableHeaderCell>Day</CTableHeaderCell>
                                  <CTableHeaderCell>Check-in</CTableHeaderCell>
                                  <CTableHeaderCell>Check-out</CTableHeaderCell>
                                  <CTableHeaderCell>Off</CTableHeaderCell>
                                  <CTableHeaderCell />
                                </CTableRow>
                              </CTableHead>
                              <CTableBody>
                                {SCHOOL_DAYS.map((dayKey) => {
                                  const day = (entry.days || {})[dayKey] || {}
                                  const off = day.off === true
                                  return (
                                    <CTableRow key={dayKey}>
                                      <CTableDataCell style={{ width: 120 }}>
                                        {DAY_LABELS[dayKey]}
                                      </CTableDataCell>
                                      <CTableDataCell>
                                        <CFormInput
                                          type="time"
                                          size="sm"
                                          disabled={off}
                                          value={day.expectedCheckInTime || ''}
                                          onChange={(e) =>
                                            updateDay(
                                              member.email,
                                              dayKey,
                                              'expectedCheckInTime',
                                              e.target.value,
                                            )
                                          }
                                        />
                                      </CTableDataCell>
                                      <CTableDataCell>
                                        <CFormInput
                                          type="time"
                                          size="sm"
                                          disabled={off}
                                          value={day.expectedCheckOutTime || ''}
                                          onChange={(e) =>
                                            updateDay(
                                              member.email,
                                              dayKey,
                                              'expectedCheckOutTime',
                                              e.target.value,
                                            )
                                          }
                                        />
                                      </CTableDataCell>
                                      <CTableDataCell>
                                        <CFormCheck
                                          checked={off}
                                          onChange={(e) =>
                                            updateDay(member.email, dayKey, 'off', e.target.checked)
                                          }
                                        />
                                      </CTableDataCell>
                                      <CTableDataCell>
                                        <CButton
                                          size="sm"
                                          color="secondary"
                                          variant="ghost"
                                          onClick={() => clearDay(member.email, dayKey)}
                                        >
                                          Clear
                                        </CButton>
                                      </CTableDataCell>
                                    </CTableRow>
                                  )
                                })}
                              </CTableBody>
                            </CTable>
                          </CTableDataCell>
                        </CTableRow>
                      )}
                    </React.Fragment>
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
