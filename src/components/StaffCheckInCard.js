import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CSpinner,
  CFormTextarea,
  CFormLabel,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLocationPin } from '@coreui/icons'
import useAuth from '../Firebase/useAuth'
import {
  createStaffCheckIn,
  getUserRecentStaffCheckIns,
  formatStatusLabel,
} from '../services/staffCheckins'
import {
  getTimekeepingSettings,
  defaultTimekeepingSettings,
} from '../services/timekeepingSettings'
import './StaffCheckInCard.css'

const formatTime = (date) =>
  date.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const formatDateLong = (date) =>
  date.toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

const formatRecentTimestamp = (ts) => {
  if (!ts) return '—'
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  return date.toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    })
  })

const StaffCheckInCard = ({ onAfterCheckIn }) => {
  const { user, role } = useAuth()
  const [busy, setBusy] = useState(null)
  const [status, setStatus] = useState(null)
  const [permission, setPermission] = useState('unknown')
  const [now, setNow] = useState(() => new Date())
  const [settings, setSettings] = useState(defaultTimekeepingSettings())
  const [lastCheckIn, setLastCheckIn] = useState(null)
  const [notes, setNotes] = useState('')
  const tickRef = useRef(null)

  useEffect(() => {
    tickRef.current = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tickRef.current)
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!navigator.permissions || !navigator.permissions.query) return
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (cancelled) return
        setPermission(result.state)
        result.onchange = () => !cancelled && setPermission(result.state)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    getTimekeepingSettings()
      .then((s) => setSettings(s))
      .catch(() => setSettings(defaultTimekeepingSettings()))
  }, [])

  const loadLast = async () => {
    if (!user?.uid) return
    try {
      const recent = await getUserRecentStaffCheckIns(user.uid, 1)
      setLastCheckIn(recent[0] || null)
    } catch (err) {
      console.warn('Failed to load last check-in:', err)
    }
  }

  useEffect(() => {
    loadLast()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  const isSecureContext =
    typeof window !== 'undefined' &&
    (window.isSecureContext ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1')

  const expectedText = useMemo(() => {
    return `Expected hours: ${settings.expectedCheckInTime} – ${settings.expectedCheckOutTime} (${settings.graceMinutes}-min grace)`
  }, [settings])

  const handleCheck = async (type) => {
    if (!user) {
      setStatus({ tone: 'error', message: 'You need to be signed in.' })
      return
    }
    if (!navigator.geolocation) {
      setStatus({
        tone: 'error',
        message: 'Geolocation is not supported by this browser. Try Chrome, Edge, or Safari.',
      })
      return
    }
    if (!isSecureContext) {
      setStatus({
        tone: 'error',
        message: 'Location requires a secure (HTTPS) connection.',
      })
      return
    }

    setBusy(type)
    setStatus({ tone: 'info', message: 'Getting your current location...' })

    try {
      const position = await getPosition()
      const { latitude, longitude, accuracy } = position.coords
      const result = await createStaffCheckIn({
        user,
        role,
        location: { latitude, longitude, accuracy },
        type,
        notes,
      })

      const distText =
        result.distanceMeters !== null ? ` (${result.distanceMeters}m from school)` : ''
      const verb = type === 'in' ? 'Check-in' : 'Check-out'
      const timeText = formatTime(new Date())
      const statusLabel = formatStatusLabel(result.status)

      let tone = 'success'
      let message = `${verb} recorded at ${timeText} — ${statusLabel}${distText}.`

      if (!result.inRange) {
        tone = 'warning'
        message = `${verb} recorded at ${timeText}, but outside the ${settings.radiusMeters}m geo-fence${distText}. Admin will be notified.`
      } else if (result.status !== 'on-time') {
        tone = 'warning'
      }

      setStatus({ tone, message })
      setNotes('')
      await loadLast()
      onAfterCheckIn && onAfterCheckIn(result)
    } catch (err) {
      console.error('Staff check-in failed:', err)
      if (err && err.code === 1) {
        setPermission('denied')
        setStatus({
          tone: 'error',
          message:
            'Location permission denied. Click the lock/location icon in your browser address bar, set Location to "Allow" for this site, then try again.',
        })
      } else if (err && err.code === 2) {
        setStatus({
          tone: 'error',
          message: 'Location unavailable. Make sure your device location services are turned on.',
        })
      } else if (err && err.code === 3) {
        setStatus({ tone: 'error', message: 'Getting location timed out. Try again.' })
      } else {
        setStatus({ tone: 'error', message: 'Could not record check-in. Try again.' })
      }
    } finally {
      setBusy(null)
    }
  }

  const denied = permission === 'denied'

  const lastSummary = lastCheckIn
    ? `${lastCheckIn.type === 'in' ? 'Checked in' : 'Checked out'} ${formatRecentTimestamp(
        lastCheckIn.createdAt || lastCheckIn.clientCreatedAt,
      )} · ${formatStatusLabel(lastCheckIn.status)}${
        lastCheckIn.distanceMeters != null ? ` · ${lastCheckIn.distanceMeters}m` : ''
      }`
    : 'No prior check-ins on record.'

  return (
    <CCard className="staff-checkin-card">
      <CCardHeader>
        <CIcon icon={cilLocationPin} className="me-2" />
        Staff Timekeeping
      </CCardHeader>
      <CCardBody>
        <div className="checkin-clock" aria-live="polite">
          <span className="checkin-clock-time">{formatTime(now)}</span>
          <span className="checkin-clock-date">{formatDateLong(now)}</span>
        </div>

        <div className="checkin-last">
          <strong>Last:</strong> {lastSummary}
        </div>

        <p className="checkin-meta mb-2">
          {expectedText}
          {settings.enabled && ` · Allowed radius: ${settings.radiusMeters}m`}
        </p>

        <div className="checkin-notes">
          <CFormLabel htmlFor="checkin-notes" className="form-label small mb-1">
            Notes (optional)
          </CFormLabel>
          <CFormTextarea
            id="checkin-notes"
            rows={2}
            placeholder="e.g. parent interrupted morning routine"
            value={notes}
            maxLength={500}
            onChange={(e) => setNotes(e.target.value)}
            disabled={busy !== null}
          />
        </div>

        {denied && (
          <div className="checkin-status warning">
            Location is currently blocked for this site. Open your browser settings, allow Location
            for this site, and reload the page.
          </div>
        )}

        <div className="checkin-actions">
          <CButton
            color="primary"
            disabled={busy !== null || denied}
            onClick={() => handleCheck('in')}
          >
            {busy === 'in' ? <CSpinner size="sm" className="me-2" /> : null}
            Check In
          </CButton>
          <CButton
            color="secondary"
            variant="outline"
            disabled={busy !== null || denied}
            onClick={() => handleCheck('out')}
          >
            {busy === 'out' ? <CSpinner size="sm" className="me-2" /> : null}
            Check Out
          </CButton>
        </div>

        {status && <div className={`checkin-status ${status.tone}`}>{status.message}</div>}
      </CCardBody>
    </CCard>
  )
}

export default StaffCheckInCard
