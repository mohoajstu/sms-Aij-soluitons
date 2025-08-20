import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, firestore } from '../../firebase'
import { doc, getDoc, collection, getDocs, query, orderBy, deleteDoc } from 'firebase/firestore'
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
  CSpinner,
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
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
  cilTrash,
  cilPeople,
  cilGroup,
} from '@coreui/icons'

import './Dashboard.css'
import '../Announcements/AllAnnouncements.css'
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

  const [announcements, setAnnouncements] = useState([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(true)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [announcementToDelete, setAnnouncementToDelete] = useState(null)

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
            const role = userData.personalInfo?.role || userData.role || ''
            setUserRole(role)
            
            // If user is admin, fetch dashboard statistics
            if (role.toLowerCase() === 'admin') {
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
    // Fetch announcements from Firestore
    fetchAnnouncements()
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

  // Fetch announcements from Firestore
  const fetchAnnouncements = async () => {
    setAnnouncementsLoading(true)
    try {
      const announcementsRef = collection(firestore, 'announcements')
      const q = query(announcementsRef, orderBy('date', 'desc'))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setAnnouncements(data)
    } catch (error) {
      console.error('Error fetching announcements:', error)
      setAnnouncements([])
    } finally {
      setAnnouncementsLoading(false)
    }
  }

  const handleDeleteAnnouncement = async (id) => {
    setAnnouncementToDelete(id)
    setShowDeleteModal(true)
  }

  const confirmDeleteAnnouncement = async () => {
    if (!announcementToDelete) return
    setAnnouncementsLoading(true)
    try {
      await deleteDoc(doc(firestore, 'announcements', announcementToDelete))
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcementToDelete))
      setShowDeleteModal(false)
      setAnnouncementToDelete(null)
    } catch (err) {
      alert('Failed to delete announcement.')
    } finally {
      setAnnouncementsLoading(false)
    }
  }

  const cancelDeleteAnnouncement = () => {
    setShowDeleteModal(false)
    setAnnouncementToDelete(null)
  }

  // Role-based quick links
  const getQuickLinks = () => {
    const isAdmin = userRole?.toLowerCase() === 'admin'
    const isFaculty = userRole?.toLowerCase() === 'faculty'

    if (isAdmin) {
      return [
        { id: 1, title: 'Take Attendance', icon: cilCheckCircle, path: '/attendance' },
        { id: 2, title: 'Create Report Cards', icon: cilFile, path: '/reportcards' },
        { id: 3, title: 'View Calendar', icon: cilCalendar, path: '/calendar' },
        { id: 4, title: 'Manage Courses', icon: cilBook, path: '/courses' },
      ]
    } else if (isFaculty) {
      return [
        { id: 1, title: 'Take Attendance', icon: cilCheckCircle, path: '/attendance' },
        { id: 2, title: 'Create Report Cards', icon: cilFile, path: '/reportcards' },
        { id: 3, title: 'View My Classes', icon: cilBook, path: '/courses' },
        { id: 4, title: 'View Schedule', icon: cilCalendar, path: '/schedule' },
      ]
    }

    // Default links for other roles
    return [
    { id: 1, title: 'Take Attendance', icon: cilCheckCircle, path: '/attendance' },
    { id: 2, title: 'Create Report Cards', icon: cilFile, path: '/reportcards' },
    { id: 3, title: 'View Calendar', icon: cilCalendar, path: '/calendar' },
    { id: 4, title: 'Manage Courses', icon: cilBook, path: '/courses' },
  ]
  }

  const quickLinks = getQuickLinks()

  // Role-based welcome actions
  const getWelcomeActions = () => {
    const isAdmin = userRole?.toLowerCase() === 'admin'
    const isFaculty = userRole?.toLowerCase() === 'faculty'

    const baseActions = [
      {
        id: 1,
        icon: cilCheckCircle,
        iconClass: 'attendance-icon',
        title: 'Daily Attendance',
        description: 'You need to mark today\'s attendance',
        buttonText: 'Mark Now',
        buttonColor: 'primary',
        onClick: () => navigate('/attendance')
      },
      {
        id: 2,
        icon: cilFile,
        iconClass: 'report-icon',
        title: 'Report Cards',
        description: '25 days until final submission',
        buttonText: 'Continue Work',
        buttonColor: 'success',
        onClick: () => navigate('/reportcards')
      }
    ]

    return baseActions
  }

  const welcomeActions = getWelcomeActions()

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
            {welcomeActions.map((action) => (
              <div key={action.id} className="action-card">
                <div className={`action-icon ${action.iconClass}`}>
                  <CIcon icon={action.icon} size="xl" />
              </div>
              <div className="action-content">
                  <h4>{action.title}</h4>
                  <p>{action.description}</p>
                  <CButton color={action.buttonColor} size="sm" onClick={action.onClick}>
                    {action.buttonText}
                </CButton>
              </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Row - Only show for Admin users */}
      {userRole?.toLowerCase() === 'admin' && (
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
                <CCardFooter className="stat-footer" onClick={() => navigate('/people')}>
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
                <CCardFooter className="stat-footer" onClick={() => navigate('/people')}>
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
              {userRole?.toLowerCase() === 'admin' && (
                <CButton
                  color="primary"
                  size="sm"
                  className="add-announcement-btn"
                  onClick={() => navigate('/announcements/new')}
                >
                  <CIcon icon={cilPencil} className="me-1" />
                  New
                </CButton>
              )}
            </CCardHeader>
            <CCardBody className="announcements-body">
              <CModal visible={showDeleteModal} onClose={cancelDeleteAnnouncement} alignment="center">
                <CModalHeader onClose={cancelDeleteAnnouncement}>Confirm Delete</CModalHeader>
                <CModalBody>
                  Are you sure you want to delete this announcement?
                </CModalBody>
                <CModalFooter>
                  <CButton color="secondary" onClick={cancelDeleteAnnouncement} disabled={announcementsLoading}>
                    Cancel
                  </CButton>
                  <CButton color="danger" onClick={confirmDeleteAnnouncement} disabled={announcementsLoading}>
                    {announcementsLoading ? <CSpinner size="sm" /> : 'Delete'}
                  </CButton>
                </CModalFooter>
              </CModal>
              <div className="announcements-container">
                {announcementsLoading ? (
                  <div className="text-center py-4">
                    <CSpinner color="primary" />
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="text-center py-4 text-muted">No announcements found.</div>
                ) : (
                  announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className={`announcement-item priority-${announcement.priority}`}
                    >
                      <div className="announcement-header-row">
                        <div className="announcement-title-row">
                          <h4 className="announcement-title">{announcement.title}</h4>
                        </div>
                        <div className="announcement-actions">
                          <span className={`announcement-priority priority-${announcement.priority}`}>
                            {announcement.priority?.toUpperCase()} PRIORITY
                          </span>
                          {userRole?.toLowerCase() === 'admin' && (
                            <button
                              className="announcement-delete-btn"
                              title="Delete announcement"
                              onClick={() => handleDeleteAnnouncement(announcement.id)}
                              disabled={announcementsLoading}
                            >
                              <CIcon icon={cilTrash} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="announcement-meta">
                        <span className="announcement-date">
                          <CIcon icon={cilCalendar} className="me-1" />
                          {announcement.date}
                        </span>
                      </div>
                      {announcement.description && (
                        <div className="announcement-description mt-2">{announcement.description}</div>
                      )}
                    </div>
                  ))
                )}
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
