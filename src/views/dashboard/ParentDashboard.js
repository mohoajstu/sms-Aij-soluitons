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
import { collection, getDocs, query, where, orderBy, limit, documentId } from 'firebase/firestore'
import { firestore } from '../../firebase'
import useAuth from '../../Firebase/useAuth'
import { loadCurrentUserProfile } from '../../utils/userProfile'
import dayjs from 'dayjs'

const ParentDashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [parentName, setParentName] = useState('')
  const [children, setChildren] = useState([]) // [{ id, name, grade, attendancePercent }]
  const [announcements, setAnnouncements] = useState([])

  useEffect(() => {
    if (!user) return

    const loadData = async () => {
      try {
        // Get canonical parent profile and Tarbiyah ID
        const profile = await loadCurrentUserProfile(firestore, user)
        if (!profile) return
        const parentId = profile.id
        const firstName = profile.data?.personalInfo?.firstName || ''
        const lastName = profile.data?.personalInfo?.lastName || ''
        setParentName(`${firstName} ${lastName}`.trim())

        // Fetch children (students) linked to this parent by tarbiyahId
        const qFather = query(
          collection(firestore, 'students'),
          where('parents.father.tarbiyahId', '==', parentId),
        )
        const qMother = query(
          collection(firestore, 'students'),
          where('parents.mother.tarbiyahId', '==', parentId),
        )
        const [snapF, snapM] = await Promise.all([getDocs(qFather), getDocs(qMother)])
        const merged = new Map()
        snapF.forEach((d) => merged.set(d.id, { id: d.id, data: d.data() }))
        snapM.forEach((d) => merged.set(d.id, { id: d.id, data: d.data() }))

        const childIds = Array.from(merged.keys())
        // Initialize children list with name and grade
        const baseChildren = Array.from(merged.values()).map(({ id, data }) => {
          const first = data?.personalInfo?.firstName || ''
          const last = data?.personalInfo?.lastName || ''
          const grade =
            data?.schooling?.gradeLevel ||
            data?.schooling?.grade ||
            data?.gradeLevel ||
            data?.grade ||
            ''
          return {
            id,
            name: `${first} ${last}`.trim() || id,
            grade: grade ? (String(grade).startsWith('Grade') ? grade : `Grade ${grade}`) : '',
            attendancePercent: null,
          }
        })

        setChildren(baseChildren)

        // Compute recent attendance rates (last 60 days) from attendance collection
        if (childIds.length > 0) {
          const endDate = dayjs()
          const startDate = endDate.subtract(60, 'day')
          let attQuery = query(
            collection(firestore, 'attendance'),
            where(documentId(), '>=', startDate.format('YYYY-MM-DD')),
            where(documentId(), '<=', endDate.format('YYYY-MM-DD')),
          )
          const attSnap = await getDocs(attQuery)

          const totals = new Map() // id -> { total, present, late, absent }
          childIds.forEach((id) => totals.set(id, { total: 0, present: 0, late: 0, absent: 0 }))

          attSnap.forEach((docSnap) => {
            const daily = docSnap.data() || {}
            const courses = daily.courses || []
            courses.forEach((course) => {
              const students = course.students || []
              students.forEach((s) => {
                const sid = s.studentId
                if (!totals.has(sid)) return
                const t = totals.get(sid)
                t.total += 1
                if (s.status === 'Present') t.present += 1
                else if (s.status === 'Late' || s.status === 'Excused Late') t.late += 1
                else if (s.status === 'Absent' || s.status === 'Excused Absent') t.absent += 1
              })
            })
          })

          setChildren((prev) =>
            prev.map((c) => {
              const t = totals.get(c.id)
              if (!t || t.total === 0) return c
              const attended = t.present + t.late // count Late as attended
              const pct = Math.round((attended / t.total) * 100)
              return { ...c, attendancePercent: pct }
            }),
          )
        }
      } catch (e) {
        console.error('Failed to load parent dashboard data:', e)
      }
    }

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

    loadData()
    loadAnnouncements()
  }, [user])

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
          <span className="parent-name">Welcome, {parentName || 'Parent'}</span>
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
