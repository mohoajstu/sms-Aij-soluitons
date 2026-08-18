import React, { useEffect, useState, useCallback } from 'react'
import {
  CContainer,
  CRow,
  CCol,
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
  CBadge,
  CButton,
} from '@coreui/react'
import useAuth from '../../Firebase/useAuth'
import StaffCheckInCard from '../../components/StaffCheckInCard'
import {
  getUserRecentStaffCheckIns,
  formatStatusLabel,
  statusBadgeColor,
} from '../../services/staffCheckins'

const formatDateTime = (ts) => {
  if (!ts) return '—'
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  const day = date.toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const time = date.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
  return { day, time }
}

const CheckInPage = () => {
  const { user, role, loading: authLoading } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.uid) return
    setLoading(true)
    try {
      const data = await getUserRecentStaffCheckIns(user.uid, 25)
      setHistory(data)
    } catch (err) {
      console.error('Failed to load check-in history:', err)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  if (authLoading) return null

  const r = role?.toLowerCase()
  const allowed = r === 'admin' || r === 'faculty' || r === 'teacher'
  if (!allowed) {
    return (
      <CContainer>
        <div className="alert alert-danger mt-3">Access denied. Staff only.</div>
      </CContainer>
    )
  }

  return (
    <CContainer fluid>
      <h2 className="mb-3">Daily Check-In</h2>
      <CRow>
        <CCol lg={6} md={12}>
          <StaffCheckInCard onAfterCheckIn={load} />
        </CCol>
        <CCol lg={6} md={12}>
          <CCard>
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <span>Your Recent Check-Ins</span>
              <CButton size="sm" color="primary" variant="outline" onClick={load} disabled={loading}>
                Refresh
              </CButton>
            </CCardHeader>
            <CCardBody>
              {loading ? (
                <div className="text-center py-3">
                  <CSpinner size="sm" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center text-muted py-3">No check-ins yet.</div>
              ) : (
                <CTable hover responsive small>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>When</CTableHeaderCell>
                      <CTableHeaderCell>Type</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Distance</CTableHeaderCell>
                      <CTableHeaderCell>Notes</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {history.map((row) => {
                      const dt = formatDateTime(row.createdAt || row.clientCreatedAt)
                      const outOfRange = row.inRange === false
                      return (
                        <CTableRow key={row.id}>
                          <CTableDataCell>
                            <div style={{ fontWeight: 600 }}>{dt.time}</div>
                            <small className="text-muted">{dt.day}</small>
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={row.type === 'in' ? 'primary' : 'secondary'}>
                              {row.type === 'in' ? 'IN' : 'OUT'}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={statusBadgeColor(row.status)}>
                              {formatStatusLabel(row.status)}
                            </CBadge>
                            {outOfRange && (
                              <CBadge color="danger" className="ms-1">
                                Outside fence
                              </CBadge>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>
                            {row.distanceMeters != null ? `${row.distanceMeters}m` : '—'}
                          </CTableDataCell>
                          <CTableDataCell style={{ maxWidth: 220 }}>
                            {row.notes ? (
                              <span title={row.notes}>{row.notes}</span>
                            ) : (
                              <span className="text-muted">—</span>
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
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default CheckInPage
