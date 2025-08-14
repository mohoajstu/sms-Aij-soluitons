import React, { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CSpinner,
  CAlert,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPeople,
  cilDescription,
  cilBullhorn,
  cilCalendar,
  cilCheckCircle,
  cilWarning,
  cilInfo,
} from '@coreui/icons'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { firestore } from '../../Firebase/firebase'
import useAuth from '../../Firebase/useAuth'

const ParentDashboard = () => {
  const { selectedChild, childProfiles } = useOutletContext()
  const { canAccessStudent, user, claims, children } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [childStats, setChildStats] = useState({})
  const [recentAnnouncements, setRecentAnnouncements] = useState([])
  const [debugInfo, setDebugInfo] = useState(null)

  useEffect(() => {
    // Add debug information
    setDebugInfo({
      user: user ? { uid: user.uid, email: user.email } : null,
      claims: claims,
      children: children,
      selectedChild: selectedChild,
      childProfiles: childProfiles
    })
  }, [user, claims, children, selectedChild, childProfiles])

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!selectedChild) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        // Load attendance stats for the selected child
        const attendanceQuery = query(
          collection(firestore, 'attendance'),
          orderBy('date', 'desc'),
          limit(30)
        )
        
        const attendanceSnapshot = await getDocs(attendanceQuery)
        let presentDays = 0
        let totalDays = 0
        
        attendanceSnapshot.forEach((doc) => {
          const data = doc.data()
          const childAttendance = data.courses?.find(course => 
            course.courseId === selectedChild.id || 
            course.students?.some(student => student.studentId === selectedChild.id)
          )
          
          if (childAttendance) {
            const childRecord = childAttendance.students?.find(student => 
              student.studentId === selectedChild.id
            )
            
            if (childRecord) {
              totalDays++
              if (childRecord.status === 'Present') {
                presentDays++
              }
            }
          }
        })
        
        const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
        
        // Load recent announcements
        const announcementsQuery = query(
          collection(firestore, 'announcements'),
          where('visibleTo', 'array-contains', 'parent'),
          orderBy('createdAt', 'desc'),
          limit(5)
        )
        
        const announcementsSnapshot = await getDocs(announcementsQuery)
        const announcements = announcementsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        
        setChildStats({
          attendanceRate,
          presentDays,
          totalDays,
        })
        
        setRecentAnnouncements(announcements)
        
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [selectedChild])

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <CSpinner color="primary" />
      </div>
    )
  }

  if (!selectedChild) {
    return (
      <CAlert color="info">
        <CIcon icon={cilInfo} className="me-2" />
        Please select a child to view their dashboard.
      </CAlert>
    )
  }

  return (
    <div>
      {/* Debug Information - Remove this after fixing the issue */}
      <CCard className="mb-4 border-warning">
        <CCardHeader className="bg-warning text-dark">
          <strong>🔧 Debug Information (Remove after setup)</strong>
        </CCardHeader>
        <CCardBody>
          <pre style={{ fontSize: '12px', maxHeight: '300px', overflow: 'auto' }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
          {(!children || children.length === 0) && (
            <CAlert color="info" className="mt-3">
              <strong>No children found.</strong> This could mean:
              <ul className="mb-0 mt-2">
                <li>No student records are linked to this parent account</li>
                <li>The linking field in student documents needs to be updated</li>
                <li>Parent-child relationship data is stored differently than expected</li>
              </ul>
            </CAlert>
          )}
        </CCardBody>
      </CCard>

      {/* Welcome Section */}
      <CCard className="mb-4">
        <CCardBody>
          <h2>Welcome to Your Parent Portal</h2>
          <p className="text-muted">
            Stay connected with your child's education at Tarbiyah Learning Academy.
          </p>
        </CCardBody>
      </CCard>

      {/* Child Overview */}
      <CRow className="mb-4">
        <CCol md={6}>
          <CCard>
            <CCardHeader>
              <div className="d-flex align-items-center">
                <CIcon icon={cilPeople} className="me-2" />
                <strong>Child Overview</strong>
              </div>
            </CCardHeader>
            <CCardBody>
              <h4>{selectedChild.name}</h4>
              <p className="text-muted">{selectedChild.grade}</p>
              
              <div className="mt-3">
                <strong>Student ID:</strong> {selectedChild.id}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        
        <CCol md={6}>
          <CCard>
            <CCardHeader>
              <div className="d-flex align-items-center">
                <CIcon icon={cilCalendar} className="me-2" />
                <strong>Attendance Summary</strong>
              </div>
            </CCardHeader>
            <CCardBody>
              <div className="text-center">
                <h2 className="mb-0">{childStats.attendanceRate}%</h2>
                <p className="text-muted">Attendance Rate</p>
                <small>
                  {childStats.presentDays} present out of {childStats.totalDays} days
                </small>
              </div>
              
              <div className="mt-3">
                {childStats.attendanceRate >= 90 ? (
                  <CBadge color="success">
                    <CIcon icon={cilCheckCircle} className="me-1" />
                    Excellent Attendance
                  </CBadge>
                ) : childStats.attendanceRate >= 80 ? (
                  <CBadge color="warning">
                    <CIcon icon={cilWarning} className="me-1" />
                    Good Attendance
                  </CBadge>
                ) : (
                  <CBadge color="danger">
                    <CIcon icon={cilWarning} className="me-1" />
                    Needs Improvement
                  </CBadge>
                )}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Quick Actions */}
      <CRow className="mb-4">
        <CCol>
          <CCard>
            <CCardHeader>
              <strong>Quick Actions</strong>
            </CCardHeader>
            <CCardBody>
              <CRow>
                <CCol md={3} className="mb-3">
                  <CButton 
                    color="primary" 
                    variant="outline" 
                    className="w-100 h-100 d-flex flex-column align-items-center justify-content-center"
                    style={{ minHeight: '100px' }}
                    href="/parent/attendance"
                  >
                    <CIcon icon={cilCalendar} size="2xl" className="mb-2" />
                    <span>View Attendance</span>
                  </CButton>
                </CCol>
                
                <CCol md={3} className="mb-3">
                  <CButton 
                    color="info" 
                    variant="outline" 
                    className="w-100 h-100 d-flex flex-column align-items-center justify-content-center"
                    style={{ minHeight: '100px' }}
                    href="/parent/reportcards"
                  >
                    <CIcon icon={cilDescription} size="2xl" className="mb-2" />
                    <span>Report Cards</span>
                  </CButton>
                </CCol>
                
                <CCol md={3} className="mb-3">
                  <CButton 
                    color="warning" 
                    variant="outline" 
                    className="w-100 h-100 d-flex flex-column align-items-center justify-content-center"
                    style={{ minHeight: '100px' }}
                    href="/parent/announcements"
                  >
                    <CIcon icon={cilBullhorn} size="2xl" className="mb-2" />
                    <span>Announcements</span>
                  </CButton>
                </CCol>
                
                <CCol md={3} className="mb-3">
                  <CButton 
                    color="success" 
                    variant="outline" 
                    className="w-100 h-100 d-flex flex-column align-items-center justify-content-center"
                    style={{ minHeight: '100px' }}
                    href="/parent/children"
                  >
                    <CIcon icon={cilPeople} size="2xl" className="mb-2" />
                    <span>Child Details</span>
                  </CButton>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Recent Announcements */}
      <CRow>
        <CCol>
          <CCard>
            <CCardHeader>
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <CIcon icon={cilBullhorn} className="me-2" />
                  <strong>Recent Announcements</strong>
                </div>
                <CButton 
                  color="link" 
                  size="sm" 
                  href="/parent/announcements"
                >
                  View All
                </CButton>
              </div>
            </CCardHeader>
            <CCardBody>
              {recentAnnouncements.length > 0 ? (
                <div>
                  {recentAnnouncements.map((announcement) => (
                    <div key={announcement.id} className="border-bottom pb-3 mb-3">
                      <h6>{announcement.title}</h6>
                      <p className="text-muted mb-1">
                        {announcement.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown Date'}
                      </p>
                      <p className="mb-0">
                        {announcement.content?.substring(0, 150)}
                        {announcement.content?.length > 150 && '...'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-center py-3">
                  No recent announcements.
                </p>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  )
}

export default ParentDashboard
