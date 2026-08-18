import React, { useEffect, useMemo, useState } from 'react'
import {
  CContainer,
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CSpinner,
  CButton,
  CFormSelect,
  CFormInput,
  CFormLabel,
  CBadge,
  CRow,
  CCol,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
} from '@coreui/react'
import useAuth from '../../Firebase/useAuth'
import {
  getRecentStaffCheckIns,
  formatStatusLabel,
  statusBadgeColor,
  isViolation,
} from '../../services/staffCheckins'
import {
  getTimekeepingSettings,
  defaultTimekeepingSettings,
} from '../../services/timekeepingSettings'
import TimekeepingSettings from './TimekeepingSettings'

const formatDateTime = (ts) => {
  if (!ts) return { day: '—', time: '—' }
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  const day = date.toLocaleDateString('en-CA', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const time = date.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
  return { day, time, raw: date }
}

const mapLink = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng)
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : null

const inDateRange = (ts, fromStr, toStr) => {
  if (!fromStr && !toStr) return true
  if (!ts) return false
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  if (fromStr) {
    const from = new Date(fromStr)
    from.setHours(0, 0, 0, 0)
    if (date < from) return false
  }
  if (toStr) {
    const to = new Date(toStr)
    to.setHours(23, 59, 59, 999)
    if (date > to) return false
  }
  return true
}

const StaffCheckIns = () => {
  const { role } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(defaultTimekeepingSettings())
  const [typeFilter, setTypeFilter] = useState('all') // all | in | out
  const [statusFilter, setStatusFilter] = useState('all') // all | on-time | late | early-departure | out-of-range | violations
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const isAdmin = role?.toLowerCase() === 'admin'

  const load = async () => {
    setLoading(true)
    try {
      const [data, s] = await Promise.all([
        getRecentStaffCheckIns(500),
        getTimekeepingSettings({ forceRefresh: true }),
      ])
      setRows(data)
      setSettings(s)
    } catch (err) {
      console.error('Failed to load staff check-ins:', err)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false
      if (statusFilter === 'violations' && !isViolation(r)) return false
      if (statusFilter === 'out-of-range' && r.inRange !== false) return false
      if (
        statusFilter !== 'all' &&
        statusFilter !== 'violations' &&
        statusFilter !== 'out-of-range' &&
        r.status !== statusFilter
      )
        return false
      if (!inDateRange(r.createdAt || r.clientCreatedAt, fromDate, toDate)) return false
      if (term) {
        const hay = `${r.displayName || ''} ${r.email || ''} ${r.notes || ''}`.toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [rows, typeFilter, statusFilter, search, fromDate, toDate])

  const violationCount = useMemo(() => rows.filter(isViolation).length, [rows])

  if (!isAdmin) {
    return (
      <CContainer>
        <div className="alert alert-danger mt-3">Access denied. Admin only.</div>
      </CContainer>
    )
  }

  return (
    <CContainer fluid>
      <CRow className="align-items-center mb-3">
        <CCol>
          <h2 className="mb-0">Staff Check-Ins</h2>
          <small className="text-muted">
            School: {Number(settings.latitude).toFixed(4)}, {Number(settings.longitude).toFixed(4)}{' '}
            · Radius: {settings.radiusMeters}m · Hours: {settings.expectedCheckInTime} –{' '}
            {settings.expectedCheckOutTime} ({settings.graceMinutes}-min grace)
          </small>
        </CCol>
        <CCol xs="auto">
          {violationCount > 0 && (
            <CBadge color="danger" className="me-2" style={{ fontSize: '0.85rem' }}>
              {violationCount} violation{violationCount === 1 ? '' : 's'}
            </CBadge>
          )}
        </CCol>
      </CRow>

      <CNav variant="tabs" role="tablist" className="mb-3">
        <CNavItem>
          <CNavLink
            active={activeTab === 0}
            onClick={() => setActiveTab(0)}
            style={{ cursor: 'pointer' }}
          >
            Records
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink
            active={activeTab === 1}
            onClick={() => setActiveTab(1)}
            style={{ cursor: 'pointer' }}
          >
            Settings
          </CNavLink>
        </CNavItem>
      </CNav>

      <CTabContent>
        <CTabPane visible={activeTab === 0}>
          <CCard className="mb-3">
            <CCardBody>
              <CRow className="g-2 align-items-end">
                <CCol md={3}>
                  <CFormLabel className="small mb-1">Search</CFormLabel>
                  <CFormInput
                    placeholder="Name, email, notes…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </CCol>
                <CCol md={2}>
                  <CFormLabel className="small mb-1">Type</CFormLabel>
                  <CFormSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value="all">All</option>
                    <option value="in">Check-In</option>
                    <option value="out">Check-Out</option>
                  </CFormSelect>
                </CCol>
                <CCol md={2}>
                  <CFormLabel className="small mb-1">Status</CFormLabel>
                  <CFormSelect
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="violations">Violations only</option>
                    <option value="on-time">On time</option>
                    <option value="late">Late</option>
                    <option value="early-departure">Early departure</option>
                    <option value="out-of-range">Out of range</option>
                  </CFormSelect>
                </CCol>
                <CCol md={2}>
                  <CFormLabel className="small mb-1">From</CFormLabel>
                  <CFormInput
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </CCol>
                <CCol md={2}>
                  <CFormLabel className="small mb-1">To</CFormLabel>
                  <CFormInput
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </CCol>
                <CCol md={1}>
                  <CButton color="primary" variant="outline" onClick={load} disabled={loading}>
                    Refresh
                  </CButton>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>

          <CCard>
            <CCardHeader>
              Showing {filtered.length} of {rows.length} record{rows.length === 1 ? '' : 's'}
            </CCardHeader>
            <CCardBody>
              {loading ? (
                <div className="text-center py-4">
                  <CSpinner />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center text-muted py-4">No check-ins match the filters.</div>
              ) : (
                <CTable hover responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>When</CTableHeaderCell>
                      <CTableHeaderCell>Staff</CTableHeaderCell>
                      <CTableHeaderCell>Type</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Distance</CTableHeaderCell>
                      <CTableHeaderCell>Notes</CTableHeaderCell>
                      <CTableHeaderCell>Map</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {filtered.map((r) => {
                      const dt = formatDateTime(r.createdAt || r.clientCreatedAt)
                      const link = mapLink(r.latitude, r.longitude)
                      const violation = isViolation(r)
                      return (
                        <CTableRow
                          key={r.id}
                          style={violation ? { backgroundColor: '#fff5f5' } : undefined}
                        >
                          <CTableDataCell>
                            <div style={{ fontWeight: 600 }}>{dt.time}</div>
                            <small className="text-muted">{dt.day}</small>
                          </CTableDataCell>
                          <CTableDataCell>
                            <div>{r.displayName || r.email || r.uid}</div>
                            {r.email && r.displayName && (
                              <small className="text-muted">{r.email}</small>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={r.type === 'in' ? 'primary' : 'secondary'}>
                              {r.type === 'in' ? 'IN' : 'OUT'}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={statusBadgeColor(r.status)}>
                              {formatStatusLabel(r.status)}
                            </CBadge>
                            {r.inRange === false && (
                              <CBadge color="danger" className="ms-1">
                                Outside fence
                              </CBadge>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>
                            {r.distanceMeters != null ? `${r.distanceMeters}m` : '—'}
                            {Number.isFinite(r.accuracy) && (
                              <div>
                                <small className="text-muted">±{Math.round(r.accuracy)}m</small>
                              </div>
                            )}
                          </CTableDataCell>
                          <CTableDataCell style={{ maxWidth: 220 }}>
                            {r.notes ? (
                              <span title={r.notes}>{r.notes}</span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>
                            {link ? (
                              <a href={link} target="_blank" rel="noreferrer">
                                View
                              </a>
                            ) : (
                              '—'
                            )}
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CTabPane>

        <CTabPane visible={activeTab === 1}>
          <TimekeepingSettings />
        </CTabPane>
      </CTabContent>
    </CContainer>
  )
}

export default StaffCheckIns
