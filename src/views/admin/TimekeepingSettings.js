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
} from '@coreui/react'
import {
  getTimekeepingSettings,
  updateTimekeepingSettings,
  defaultTimekeepingSettings,
} from '../../services/timekeepingSettings'

const TimekeepingSettings = () => {
  const [form, setForm] = useState(defaultTimekeepingSettings())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let cancelled = false
    getTimekeepingSettings({ forceRefresh: true })
      .then((s) => !cancelled && setForm(s))
      .catch(() => !cancelled && setForm(defaultTimekeepingSettings()))
      .finally(() => !cancelled && setLoading(false))
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

  if (loading) {
    return (
      <div className="text-center py-4">
        <CSpinner />
      </div>
    )
  }

  return (
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
  )
}

export default TimekeepingSettings
