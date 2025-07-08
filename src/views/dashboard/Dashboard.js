import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, firestore } from '../../firebase'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import {
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CRow,
  CProgress,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSettings,
  cilArrowRight,
  cilUser,
  cilCheckCircle,
  cilBook,
  cilFile,
  cilBullhorn,
  cilCalendar,
  cilPencil,
} from '@coreui/icons'

import './Dashboard.css'
import sygnet from '../../assets/brand/TLA_logo_simple.svg'

const Dashboard = () => {
  const navigate = useNavigate()
  const [userFirstName, setUserFirstName] = useState('')
  const [userRole, setUserRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  
  // Dashboard statistics state
  const [stats, setStats] = useState({
    activeStudents: 0,
    activeFaculty: 0,
    activeClasses: 0,
    newApplications: 0
  })
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid)
        try {
          const userDocRef = doc(firestore, 'users', user.uid)
          const userDoc = await getDoc(userDocRef)
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserFirstName(userData.personalInfo?.firstName || userData.firstName || 'User')
            setUserRole(userData.personalInfo?.role || userData.role || '')
            
            // If user is admin, fetch dashboard statistics
            if (userData.personalInfo?.role?.toLowerCase() === 'admin' || userData.role?.toLowerCase() === 'admin') {
              await fetchDashboardStats()
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
          setUserFirstName('User')
          setUserRole('')
        }
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Function to fetch dashboard statistics for admin users
  const fetchDashboardStats = async () => {
    setStatsLoading(true)
    try {
      // Fetch active students count
      const studentsCollection = collection(firestore, 'students')
      const studentsSnapshot = await getDocs(studentsCollection)
      const activeStudentsCount = studentsSnapshot.docs.length

      // Fetch active faculty count
      const facultyCollection = collection(firestore, 'faculty')
      const facultySnapshot = await getDocs(facultyCollection)
      const activeFacultyCount = facultySnapshot.docs.length

      // Fetch active courses count
      const coursesCollection = collection(firestore, 'courses')
      const coursesSnapshot = await getDocs(coursesCollection)
      const activeClassesCount = coursesSnapshot.docs.length

      // For now, we'll use a placeholder for applications
      // In a real app, you'd have an applications collection
      const newApplicationsCount = 0

      setStats({
        activeStudents: activeStudentsCount,
        activeFaculty: activeFacultyCount,
        activeClasses: activeClassesCount,
        newApplications: newApplicationsCount
      })
    } catch (error) {
      console.error('Error fetching dashboard statistics:', error)
      // Set default values if there's an error
      setStats({
        activeStudents: 0,
        activeFaculty: 0,
        activeClasses: 0,
        newApplications: 0
      })
    } finally {
      setStatsLoading(false)
    }
  }

  // Sample announcements data
  const announcements = [
    {
      id: 1,
      title: 'Term 1 Report Cards due on Monday, January 27th',
      date: 'January 20, 2025',
      priority: 'high',
    },
    {
      id: 2,
      title: 'Term 1 Report Cards released to parents on Friday, February 7th',
      date: 'January 25, 2025',
      priority: 'medium',
    },
    {
      id: 3,
      title: 'Parent-Teacher Meetings on Friday, February 14th',
      date: 'January 30, 2025',
      priority: 'medium',
    },
  ]

  // Quick links data
  const quickLinks = [
    { id: 1, title: 'Take Attendance', icon: cilCheckCircle, path: '/attendance' },
    { id: 2, title: 'Create Report Cards', icon: cilFile, path: '/reportcards' },
    { id: 3, title: 'View Calendar', icon: cilCalendar, path: '/calendar' },
    { id: 4, title: 'Manage Courses', icon: cilBook, path: '/courses' },
  ]

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        {/* Wrap the logo and text in a .header-left container for easy alignment */}
        <div className="header-left">
          {/* Logo / Sygnet Image */}
          <img src={sygnet} alt="School Logo" className="school-logo" />

          {/* Title and subtitle */}
          <div>
            <h1 className="dashboard-title">TARBIYAH LEARNING ACADEMY</h1>
            <p className="dashboard-subtitle">Staff Portal</p>
          </div>
        </div>
        {/* Right side (user / icons / etc.) */}
        <div className="user-section">{/* Add your user info or other elements here */}</div>
      </div>

      {/* Welcome Banner */}
      <div className="enhanced-welcome-banner">
        <div className="welcome-banner-content">
          <div className="welcome-header">
            <div className="welcome-header-left">
              <h2>Welcome Back, {userFirstName}!</h2>
              {userId && (
                <div
                  className="user-id-display"
                  style={{ fontSize: '1rem', color: '#bbb', marginTop: 8 }}
                >
                  {userId}
                </div>
              )}
            </div>
            <div className="welcome-header-date">
              <div className="welcome-date">
                <CIcon icon={cilCalendar} className="me-2" />
                <span>
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="welcome-actions">
            <div className="action-card">
              <div className="action-icon attendance-icon">
                <CIcon icon={cilCheckCircle} size="xl" />
              </div>
              <div className="action-content">
                <h4>Daily Attendance</h4>
                <p>You need to mark today's attendance</p>
                <CButton color="primary" size="sm" onClick={() => navigate('/attendance')}>
                  Mark Now
                </CButton>
              </div>
            </div>

            <div className="action-card">
              <div className="action-icon report-icon">
                <CIcon icon={cilFile} size="xl" />
              </div>
              <div className="action-content">
                <h4>Report Cards</h4>
                <p>25 days until final submission</p>
                <CButton color="success" size="sm" onClick={() => navigate('/reportcards')}>
                  Continue Work
                </CButton>
              </div>
            </div>

            <div className="action-card">
              <div className="action-icon event-icon">
                <CIcon icon={cilCalendar} size="xl" />
              </div>
              <div className="action-content">
                <h4>Upcoming Event</h4>
                <p>Parent-Teacher Meeting (Feb 14)</p>
                <CButton color="info" size="sm" onClick={() => navigate('/events')}>
                  View Details
                </CButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      {userRole?.toLowerCase() !== 'faculty' && (
        <div className="stats-row">
          <CRow>
            <CCol lg={3} md={6} sm={12}>
              <CCard className="stat-card stat-students">
                <CCardBody className="d-flex align-items-center">
                  <div className="stat-icon">
                    <CIcon icon={cilUser} size="3xl" />
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-number">
                      {statsLoading ? '...' : stats.activeStudents}
                    </h3>
                    <p className="stat-label">ACTIVE STUDENTS</p>
                  </div>
                </CCardBody>
                <CCardFooter className="stat-footer" onClick={() => navigate('/students')}>
                  <span>View Student Directory</span>
                  <CIcon icon={cilArrowRight} />
                </CCardFooter>
              </CCard>
            </CCol>

            <CCol lg={3} md={6} sm={12}>
              <CCard className="stat-card stat-faculty">
                <CCardBody className="d-flex align-items-center">
                  <div className="stat-icon">
                    <CIcon icon={cilSettings} size="3xl" />
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-number">
                      {statsLoading ? '...' : stats.activeFaculty}
                    </h3>
                    <p className="stat-label">ACTIVE FACULTY</p>
                  </div>
                </CCardBody>
                <CCardFooter className="stat-footer" onClick={() => navigate('/faculty')}>
                  <span>View Faculty</span>
                  <CIcon icon={cilArrowRight} />
                </CCardFooter>
              </CCard>
            </CCol>

            <CCol lg={3} md={6} sm={12}>
              <CCard className="stat-card stat-classes">
                <CCardBody className="d-flex align-items-center">
                  <div className="stat-icon">
                    <CIcon icon={cilBook} size="3xl" />
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-number">
                      {statsLoading ? '...' : stats.activeClasses}
                    </h3>
                    <p className="stat-label">ACTIVE CLASSES</p>
                  </div>
                </CCardBody>
                <CCardFooter className="stat-footer" onClick={() => navigate('/courses')}>
                  <span>View Classes</span>
                  <CIcon icon={cilArrowRight} />
                </CCardFooter>
              </CCard>
            </CCol>

            <CCol lg={3} md={6} sm={12}>
              <CCard className="stat-card stat-applications">
                <CCardBody className="d-flex align-items-center">
                  <div className="stat-icon">
                    <CIcon icon={cilPencil} size="3xl" />
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-number">
                      {statsLoading ? '...' : stats.newApplications}
                    </h3>
                    <p className="stat-label">NEW APPLICATIONS</p>
                  </div>
                </CCardBody>
                <CCardFooter className="stat-footer" onClick={() => navigate('/registration')}>
                  <span>View Applications</span>
                  <CIcon icon={cilArrowRight} />
                </CCardFooter>
              </CCard>
            </CCol>
          </CRow>
        </div>
      )}

      {/* Quick Links and Announcements */}
      <CRow className="mt-4">
        {/* Quick Links */}
        <CCol lg={4} md={12}>
          <CCard className="h-100">
            <CCardHeader className="quick-links-header">
              <h3>
                <CIcon icon={cilSettings} className="me-2" />
                Quick Actions
              </h3>
            </CCardHeader>
            <CCardBody className="quick-links-body">
              <div className="quick-links-container">
                {quickLinks.map((link) => (
                  <div
                    key={link.id}
                    className="quick-link-item"
                    onClick={() => navigate(link.path)}
                  >
                    <div className="quick-link-icon">
                      <CIcon icon={link.icon} size="xl" />
                    </div>
                    <span className="quick-link-title">{link.title}</span>
                  </div>
                ))}
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Announcements */}
        <CCol lg={8} md={12}>
          <CCard className="h-100">
            <CCardHeader className="announcements-header">
              <h3>
                <CIcon icon={cilBullhorn} className="me-2" />
                Announcements & Important Dates
              </h3>
              <CButton
                color="primary"
                size="sm"
                className="add-announcement-btn"
                onClick={() => navigate('/announcements/new')}
              >
                <CIcon icon={cilPencil} className="me-1" />
                New
              </CButton>
            </CCardHeader>
            <CCardBody className="announcements-body">
              <div className="announcements-container">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className={`announcement-item priority-${announcement.priority}`}
                  >
                    <div className="announcement-content">
                      <h4 className="announcement-title">{announcement.title}</h4>
                      <div className="announcement-meta">
                        <span className="announcement-date">
                          <CIcon icon={cilCalendar} className="me-1" />
                          {announcement.date}
                        </span>
                        <span className={`announcement-priority priority-${announcement.priority}`}>
                          {announcement.priority.charAt(0).toUpperCase() +
                            announcement.priority.slice(1)}{' '}
                          Priority
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CCardBody>
            <CCardFooter className="announcements-footer">
              <CButton
                color="link"
                className="view-all-link"
                onClick={() => navigate('/announcements')}
              >
                View All Announcements
                <CIcon icon={cilArrowRight} className="ms-1" />
              </CButton>
            </CCardFooter>
          </CCard>
        </CCol>
      </CRow>

      {/* Report Card Management
      <CRow className="mt-4">
        <CCol lg={6} md={12}>
          <CCard className="report-card-management">
            <CCardHeader className="report-card-header">
              <h3>
                <CIcon icon={cilFile} className="me-2" />
                Report Card Management
              </h3>
            </CCardHeader>
            <CCardBody>
              <p className="report-card-info">
                Create, edit, and manage student report cards. Next deadline:
                January 27th, 2025.
              </p>
              <div className="report-card-progress">
                <div className="progress-label">
                  <span>Report Cards Completed:</span>
                  <span>42%</span>
                </div>
                <CProgress value={42} className="mb-3" />
              </div>
              <CButton
                color="primary"
                className="mt-3"
                onClick={() => navigate("/reportcards")}
              >
                <CIcon icon={cilFile} className="me-2" />
                Go to Report Cards
              </CButton>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={6} md={12}>
          <CCard className="attendance-overview">
            <CCardHeader className="attendance-header">
              <h3>
                <CIcon icon={cilCheckCircle} className="me-2" />
                Weekly Attendance Overview
              </h3>
            </CCardHeader>
            <CCardBody>
              <div className="attendance-stats">
                <div className="attendance-stat-item">
                  <h4>95%</h4>
                  <p>Overall Attendance</p>
                </div>
                <div className="attendance-stat-item">
                  <h4>12</h4>
                  <p>Absent Today</p>
                </div>
                <div className="attendance-stat-item">
                  <h4>3</h4>
                  <p>Late Today</p>
                </div>
              </div>
              <div className="attendance-chart">
                <div className="day-attendance">
                  <span className="day">Mon</span>
                  <CProgress value={96} className="mb-1" />
                </div>
                <div className="day-attendance">
                  <span className="day">Tue</span>
                  <CProgress value={93} className="mb-1" />
                </div>
                <div className="day-attendance">
                  <span className="day">Wed</span>
                  <CProgress value={97} className="mb-1" />
                </div>
                <div className="day-attendance">
                  <span className="day">Thu</span>
                  <CProgress value={94} className="mb-1" />
                </div>
                <div className="day-attendance">
                  <span className="day">Fri</span>
                  <CProgress value={95} className="mb-1" />
                </div>
              </div>
            </CCardBody>
            <CCardFooter className="attendance-footer">
              <CButton color="success" onClick={() => navigate("/attendance")}>
                View Detailed Attendance
                <CIcon icon={cilArrowRight} className="ms-2" />
              </CButton>
            </CCardFooter>
          </CCard>
        </CCol>
      </CRow>

      {/* Footer */}
      <div className="dashboard-footer mt-4">
        <p className="footer-text">© 2025 Tarbiyah Learning Academy</p>
      </div>
    </div>
  )
}

export default Dashboard
