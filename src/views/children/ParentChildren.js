import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CAlert,
  CButton,
  CBadge,
  CListGroup,
  CListGroupItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPeople,
  cilUser,
  cilCalendar,
  cilDescription,
  cilInfo,
  cilWarning,
  cilCheckCircle,
  cilSchool,
} from '@coreui/icons'
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { firestore } from '../../Firebase/firebase'
import useAuth from '../../Firebase/useAuth'

const ParentChildren = () => {
  const { children, canAccessStudent } = useAuth()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [childrenProfiles, setChildrenProfiles] = useState([])
  const [childrenStats, setChildrenStats] = useState({})

  useEffect(() => {
    const loadChildrenData = async () => {
      if (!children || children.length === 0) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        // Load profiles for all children
        const profiles = await Promise.all(
          children.map(async (childId) => {
            if (!canAccessStudent(childId)) {
              return null
            }

            const docRef = doc(firestore, 'students', childId)
            const docSnap = await getDoc(docRef)
            
            if (docSnap.exists()) {
              const data = docSnap.data()
              return {
                id: childId,
                name: data.personalInfo 
                  ? `${data.personalInfo.firstName} ${data.personalInfo.lastName}`.trim()
                  : data.name || 'Unknown Student',
                grade: data.gradeLevel || data.grade || 'Unknown Grade',
                teacher: data.teacher || 'Not Assigned',
                email: data.email || '',
                phone: data.personalInfo?.phone || '',
                ...data,
              }
            } else {
              return {
                id: childId,
                name: 'Student Not Found',
                grade: 'Unknown Grade',
                teacher: 'Not Assigned',
              }
            }
          })
        )

        const validProfiles = profiles.filter(profile => profile !== null)
        setChildrenProfiles(validProfiles)

        // Load stats for each child
        const stats = {}
        for (const profile of validProfiles) {
          // Load recent attendance
          const attendanceQuery = query(
            collection(firestore, `students/${profile.id}/attendance`),
            orderBy('date', 'desc'),
            limit(30)
          )
          
          try {
            const attendanceSnapshot = await getDocs(attendanceQuery)
            let presentDays = 0
            let totalDays = attendanceSnapshot.size
            
            attendanceSnapshot.forEach((doc) => {
              const data = doc.data()
              if (data.status === 'Present') {
                presentDays++
              }
            })
            
            const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
            
            // Load recent report cards
            const reportCardsQuery = query(
              collection(firestore, `students/${profile.id}/reportCards`),
              orderBy('createdAt', 'desc'),
              limit(5)
            )
            
            const reportCardsSnapshot = await getDocs(reportCardsQuery)
            const reportCardsCount = reportCardsSnapshot.size
            
            stats[profile.id] = {
              attendanceRate,
              presentDays,
              totalDays,
              reportCardsCount,
            }
          } catch (error) {
            console.error(`Error loading stats for child ${profile.id}:`, error)
            stats[profile.id] = {
              attendanceRate: 0,
              presentDays: 0,
              totalDays: 0,
              reportCardsCount: 0,
            }
          }
        }
        
        setChildrenStats(stats)
        
      } catch (error) {
        console.error('Error loading children data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadChildrenData()
  }, [children, canAccessStudent])

  const getAttendanceBadge = (rate) => {
    if (rate >= 95) return <CBadge color="success">Excellent</CBadge>
    if (rate >= 90) return <CBadge color="info">Good</CBadge>
    if (rate >= 80) return <CBadge color="warning">Fair</CBadge>
    return <CBadge color="danger">Needs Attention</CBadge>
  }

  const handleViewChild = (childId) => {
    // Navigate to attendance page with this child selected
    navigate('/parent/attendance', { state: { selectedChildId: childId } })
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <CSpinner color="primary" />
      </div>
    )
  }

  if (!children || children.length === 0) {
    return (
      <CAlert color="info">
        <CIcon icon={cilInfo} className="me-2" />
        No children are currently linked to your account. Please contact the school office if this seems incorrect.
      </CAlert>
    )
  }

  if (childrenProfiles.length === 0) {
    return (
      <CAlert color="warning">
        <CIcon icon={cilWarning} className="me-2" />
        Unable to load children information. Please try refreshing the page or contact support.
      </CAlert>
    )
  }

  return (
    <div>
      {/* Header */}
      <CCard className="mb-4">
        <CCardBody>
          <h2>My Children</h2>
          <p className="text-muted mb-0">
            Overview of all your children enrolled at Tarbiyah Learning Academy
          </p>
        </CCardBody>
      </CCard>

      {/* Children Overview Cards */}
      <CRow>
        {childrenProfiles.map((child) => {
          const stats = childrenStats[child.id] || {}
          
          return (
            <CCol key={child.id} lg={6} xl={4} className="mb-4">
              <CCard className="h-100">
                <CCardHeader>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <CIcon icon={cilUser} className="me-2 text-primary" />
                      <strong>{child.name}</strong>
                    </div>
                    {getAttendanceBadge(stats.attendanceRate || 0)}
                  </div>
                </CCardHeader>
                <CCardBody>
                  {/* Basic Info */}
                  <CListGroup flush className="mb-3">
                    <CListGroupItem className="px-0 py-2 border-0">
                      <div className="d-flex align-items-center">
                        <CIcon icon={cilSchool} className="me-2 text-info" />
                        <span className="fw-semibold me-2">Grade:</span>
                        <span>{child.grade}</span>
                      </div>
                    </CListGroupItem>
                    <CListGroupItem className="px-0 py-2 border-0">
                      <div className="d-flex align-items-center">
                        <CIcon icon={cilUser} className="me-2 text-success" />
                        <span className="fw-semibold me-2">Teacher:</span>
                        <span>{child.teacher}</span>
                      </div>
                    </CListGroupItem>
                    <CListGroupItem className="px-0 py-2 border-0">
                      <div className="d-flex align-items-center">
                        <CIcon icon={cilUser} className="me-2 text-secondary" />
                        <span className="fw-semibold me-2">Student ID:</span>
                        <span className="text-muted">{child.id}</span>
                      </div>
                    </CListGroupItem>
                  </CListGroup>

                  {/* Quick Stats */}
                  <div className="mb-3">
                    <h6 className="text-muted mb-2">Quick Stats</h6>
                    <CRow className="text-center">
                      <CCol xs={6}>
                        <div className="border-end">
                          <h5 className="text-primary mb-0">{stats.attendanceRate || 0}%</h5>
                          <small className="text-muted">Attendance</small>
                        </div>
                      </CCol>
                      <CCol xs={6}>
                        <h5 className="text-info mb-0">{stats.reportCardsCount || 0}</h5>
                        <small className="text-muted">Report Cards</small>
                      </CCol>
                    </CRow>
                  </div>

                  {/* Action Buttons */}
                  <div className="d-flex gap-2">
                    <CButton
                      color="primary"
                      size="sm"
                      onClick={() => navigate('/parent/attendance', { state: { selectedChildId: child.id } })}
                      className="flex-fill"
                    >
                      <CIcon icon={cilCalendar} className="me-1" />
                      Attendance
                    </CButton>
                    <CButton
                      color="info"
                      size="sm"
                      onClick={() => navigate('/parent/reportcards', { state: { selectedChildId: child.id } })}
                      className="flex-fill"
                    >
                      <CIcon icon={cilDescription} className="me-1" />
                      Reports
                    </CButton>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
          )
        })}
      </CRow>

      {/* Summary Stats */}
      <CCard className="mt-4">
        <CCardHeader>
          <div className="d-flex align-items-center">
            <CIcon icon={cilPeople} className="me-2" />
            <strong>Family Overview</strong>
          </div>
        </CCardHeader>
        <CCardBody>
          <CRow className="text-center">
            <CCol md={3}>
              <h3 className="text-primary">{childrenProfiles.length}</h3>
              <p className="text-muted mb-0">
                {childrenProfiles.length === 1 ? 'Child Enrolled' : 'Children Enrolled'}
              </p>
            </CCol>
            <CCol md={3}>
              <h3 className="text-success">
                {Math.round(
                  Object.values(childrenStats).reduce((sum, stats) => sum + (stats.attendanceRate || 0), 0) / 
                  Math.max(Object.keys(childrenStats).length, 1)
                )}%
              </h3>
              <p className="text-muted mb-0">Average Attendance</p>
            </CCol>
            <CCol md={3}>
              <h3 className="text-info">
                {Object.values(childrenStats).reduce((sum, stats) => sum + (stats.reportCardsCount || 0), 0)}
              </h3>
              <p className="text-muted mb-0">Total Report Cards</p>
            </CCol>
            <CCol md={3}>
              <h3 className="text-warning">
                {new Set(childrenProfiles.map(child => child.grade)).size}
              </h3>
              <p className="text-muted mb-0">
                {new Set(childrenProfiles.map(child => child.grade)).size === 1 ? 'Grade Level' : 'Grade Levels'}
              </p>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* Contact Information */}
      <CCard className="mt-4">
        <CCardHeader>
          <div className="d-flex align-items-center">
            <CIcon icon={cilInfo} className="me-2" />
            <strong>School Contact</strong>
          </div>
        </CCardHeader>
        <CCardBody>
          <p className="mb-2">
            <strong>For questions about your children or to update information, please contact:</strong>
          </p>
          <CRow>
            <CCol md={6}>
              <p className="mb-1">
                <strong>School Office:</strong> (555) 123-4567
              </p>
              <p className="mb-1">
                <strong>Email:</strong> office@tarbiyahlearning.com
              </p>
            </CCol>
            <CCol md={6}>
              <p className="mb-1">
                <strong>Office Hours:</strong> Monday - Friday, 8:00 AM - 4:00 PM
              </p>
              <p className="mb-0">
                <strong>Emergency:</strong> (555) 987-6543
              </p>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default ParentChildren 