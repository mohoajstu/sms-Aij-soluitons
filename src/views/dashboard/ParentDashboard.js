import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton, CCard, CCardBody, CCardFooter, CCardHeader, CCol, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilUser,
  cilArrowRight,
  cilFile,
  cilBullhorn,
  cilCalendar,
  cilCheckCircle,
  cilClock,
  cilMoney,
} from '@coreui/icons'
import './ParentDashboard.css'
import sygnet from '../../assets/brand/TLA_logo_simple.svg'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { firestore } from '../../firebase'
import dayjs from 'dayjs'
import { parentPortal } from '../../services/parentPortal'
import useParentFamily from '../parent/useParentFamily'
import { gradeLabel } from '../parent/ChildSelector'

// Late counts as attended. Returns null when there are no records in the window.
export const attendanceRate = (records) => {
  const attended = records.filter(({ status }) => ['Present', 'Late', 'Excused Late'].includes(status)).length
  return records.length ? Math.round((attended / records.length) * 100) : null
}

const ParentDashboard = () => {
  const navigate = useNavigate()
  const family = useParentFamily()
  const [rates, setRates] = useState({}) // id -> attendance percent or null
  const [announcements, setAnnouncements] = useState([])
  const familyChildren = family.children
  const children = familyChildren.map((child) => ({
    ...child, grade: gradeLabel(child.grade), attendancePercent: rates[child.id] ?? null,
  }))

  useEffect(() => {
    if (!familyChildren.length) return undefined
    let active = true
    const endDate = dayjs().format('YYYY-MM-DD')
    const startDate = dayjs().subtract(60, 'day').format('YYYY-MM-DD')
    Promise.all(familyChildren.map(async (child) => {
      try {
        const { records } = await parentPortal('attendance', { studentId: child.id, startDate, endDate })
        return [child.id, attendanceRate(records || [])]
      } catch (e) {
        console.error('Failed to load attendance for', child.id, e)
        return [child.id, null]
      }
    })).then((entries) => { if (active) setRates(Object.fromEntries(entries)) })
    return () => { active = false }
  }, [familyChildren])

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const ref = collection(firestore, 'announcements')
        const qy = query(ref, orderBy('date', 'desc'), limit(5))
        const snapshot = await getDocs(qy)
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        setAnnouncements(data)
      } catch (e) {
        console.error('Failed to load announcements:', e)
        setAnnouncements([])
      }
    }

    loadAnnouncements()
  }, [])

  // Simplified quick actions
  const quickActions = [
    { id: 1, title: 'View Report Cards', icon: cilFile, path: '/reportcards/parent' },
    { id: 2, title: 'Check Attendance', icon: cilCheckCircle, path: '/attendance/parent' },
      ]

  // Calculate totals for multiple children
  const totalChildren = children.length
  const attendanceValues = children.map((c) => c.attendancePercent).filter((v) => typeof v === 'number')
  const averageAttendance = attendanceValues.length
    ? Math.round(attendanceValues.reduce((sum, v) => sum + v, 0) / attendanceValues.length)
    : 0

  // Determine grid class based on number of children
  const getGridClass = (childCount) => {
    if (childCount === 1) return 'one-child'
    if (childCount === 2) return 'two-children'
    if (childCount === 3) return 'three-children'
    return 'many-children'
  }

  return (
    <div className="parent-dashboard-container">
      {/* Header */}
      <div className="parent-dashboard-header">
        <div className="header-left">
          <img src={sygnet} alt="School Logo" className="school-logo" />
          <div>
            <h1 className="dashboard-title">TARBIYAH LEARNING ACADEMY</h1>
            <p className="dashboard-subtitle">Parent Portal</p>
          </div>
        </div>
        <div className="user-section">
          <span className="parent-name">Welcome, Parent</span>
        </div>
      </div>

      {/* Children Overview Banner */}
      <div className="children-overview-banner">
        <div className="banner-content">
          <div className="banner-header">
            <h2>Your {totalChildren === 1 ? "Child's" : "Children's"} Progress</h2>
            <div className="current-date">
              <CIcon icon={cilCalendar} className="me-2" />
              <span>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>

          <div className={`children-grid ${getGridClass(totalChildren)}`}>
            {children.map((student) => (
              <div key={student.id} className="child-card">
                <div className="child-info">
                  <h4>{student.name}</h4>
                  {student.grade && <p className="child-grade">{student.grade}</p>}
                </div>
                <div className="child-stats">
                  <div className="stat-row">
                    <span className="stat-label">Attendance Rate:</span>
                    <span className="stat-value">
                      {typeof student.attendancePercent === 'number' ? `${student.attendancePercent}%` : 'N/A'}
                    </span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <CRow className="stats-row">

        <CCol lg={3} md={6} sm={12}>
          <CCard className="stat-card attendance-card">
            <CCardBody className="d-flex align-items-center">
              <div className="stat-icon">
                <CIcon icon={cilCheckCircle} size="3xl" />
              </div>
              <div className="stat-content">
                <h3 className="stat-number">{averageAttendance}%</h3>
                <p className="stat-label">AVERAGE ATTENDANCE</p>
              </div>
            </CCardBody>
            <CCardFooter className="stat-footer" onClick={() => navigate('/attendance/parent')}>
              <span>View Attendance</span>
              <CIcon icon={cilArrowRight} />
            </CCardFooter>
          </CCard>
        </CCol>



        <CCol lg={3} md={6} sm={12}>
          <CCard className="stat-card children-card">
            <CCardBody className="d-flex align-items-center">
              <div className="stat-icon">
                <CIcon icon={cilUser} size="3xl" />
              </div>
              <div className="stat-content">
                <h3 className="stat-number">{totalChildren}</h3>
                <p className="stat-label">{totalChildren === 1 ? 'CHILD' : 'CHILDREN'}</p>
              </div>
            </CCardBody>
            
          </CCard>
        </CCol>
      </CRow>

      {/* Main Content */}
      <CRow className="mt-4">
        {/* Quick Actions */}
        <CCol lg={4} md={12}>
          <CCard className="h-100">
            <CCardHeader className="card-header">
              <h3>
                <CIcon icon={cilUser} className="me-2" />
                Quick Actions
              </h3>
            </CCardHeader>
            <CCardBody className="quick-actions-body">
              <div className="quick-actions-grid">
                {quickActions.map((action) => (
                  <div
                    key={action.id}
                    className="quick-action-item"
                    onClick={() => navigate(action.path)}
                  >
                    <div className="action-icon">
                      <CIcon icon={action.icon} size="xl" />
                    </div>
                    <span className="action-title">{action.title}</span>
                  </div>
                ))}
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Announcements */}
        <CCol lg={8} md={12}>
          <CCard className="h-100">
            <CCardHeader className="card-header">
              <h3>
                <CIcon icon={cilBullhorn} className="me-2" />
                School Announcements
              </h3>
            </CCardHeader>
            <CCardBody className="announcements-body">
              <div className="announcements-list">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className={`announcement-item priority-${announcement.priority || 'low'}`}
                  >
                    <div className="announcement-content">
                      <h4 className="announcement-title">{announcement.title}</h4>
                      <div className="announcement-meta">
                        <span className="announcement-date">
                          <CIcon icon={cilCalendar} className="me-1" />
                          {announcement.date}
                        </span>
                        {announcement.priority && (
                          <span className={`priority-badge priority-${announcement.priority}`}>
                            {String(announcement.priority).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {announcements.length === 0 && <div>No announcements</div>}
              </div>
            </CCardBody>
            <CCardFooter className="text-center">
              <CButton color="link" onClick={() => navigate('/announcements')}>
                View All Announcements
                <CIcon icon={cilArrowRight} className="ms-1" />
              </CButton>
            </CCardFooter>
          </CCard>
        </CCol>
      </CRow>




      {/* Footer */}
      <div className="dashboard-footer">
        <p className="footer-text">© 2025 Tarbiyah Learning Academy. All rights reserved.</p>
      </div>
    </div>
  )
}

export default ParentDashboard
