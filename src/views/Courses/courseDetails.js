// CourseDetailPage.jsx
import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore'
import { firestore } from '../../firebase'
import './courseDetails.css'
import { CButton, CCard, CCardBody, CRow, CCol } from '@coreui/react'
import {
  initializeGoogleApi,
  initializeGIS,
  authenticate,
  createEvent,
  assignmentToEvent,
  isAuthenticated,
} from '../../services/calendarService'
import { auth } from '../../firebase'
import StudentSelectorModal from './StudentForm'
import StaffSelectorModal from './StaffSelectorModal'

function CourseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [staff, setStaff] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [isGoogleApiInitialized, setGoogleApiInitialized] = useState(false)
  const [isGisInitialized, setGisInitialized] = useState(false)
  const [isAuthed, setAuthed] = useState(false)
  const [editingBudget, setEditingBudget] = useState(false)
  const [newBudget, setNewBudget] = useState('')
  const [userRole, setUserRole] = useState('')
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const initApis = async () => {
      await initializeGoogleApi()
      setGoogleApiInitialized(true)
      await initializeGIS()
      setGisInitialized(true)
      if (isAuthenticated()) {
        setAuthed(true)
      }
    }
    initApis()
  }, [])

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!id) return
      setLoading(true)
      try {
        const courseDocRef = doc(firestore, 'courses', id)
        const courseDoc = await getDoc(courseDocRef)

        if (courseDoc.exists()) {
          const courseData = courseDoc.data()
          setCourse({ id: courseDoc.id, ...courseData })

          if (courseData.teacherIds && courseData.teacherIds.length > 0) {
            const staffPromises = courseData.teacherIds.map((uid) =>
              getDoc(doc(firestore, 'users', uid)),
            )
            const staffDocs = await Promise.all(staffPromises)
            setStaff(
              staffDocs.map((doc) =>
                doc.exists() ? doc.data().firstName + ' ' + doc.data().lastName : 'Unknown Teacher',
              ),
            )
          }

          if (courseData.enrolledlist && courseData.enrolledlist.length > 0) {
            const studentPromises = courseData.enrolledlist.map((uid) =>
              getDoc(doc(firestore, 'users', uid)),
            )
            const studentDocs = await Promise.all(studentPromises)
            setStudents(
              studentDocs.map((doc) =>
                doc.exists() ? doc.data().firstName + ' ' + doc.data().lastName : 'Unknown Student',
              ),
            )
          }
        } else {
          console.log('No such course!')
        }
      } catch (error) {
        console.error('Error fetching course details:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourseData()
  }, [id])

  useEffect(() => {
    // Fetch user role for admin check
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          let role = data.personalInfo?.role?.toLowerCase() || data.role?.toLowerCase() || ''
          // Check for primaryRole as well
          if (!role && data.personalInfo?.primaryRole) {
            const primaryRole = data.personalInfo.primaryRole.toLowerCase()
            // Treat 'schooladmin' as 'admin'
            if (primaryRole === 'schooladmin' || primaryRole === 'admin') {
              role = 'admin'
            } else {
              role = primaryRole
            }
          }
          setUserRole(role)
        }
      }
    })
    return () => unsub()
  }, [])

  const getTextColor = (bgColor) => {
    if (bgColor && bgColor.startsWith('hsl')) {
      try {
        const lightness = parseInt(bgColor.match(/,\s*(\d+)%\s*\)/)[1])
        return lightness > 55 ? '#333' : '#fff'
      } catch (e) {
        return '#fff'
      }
    }
    const hex = bgColor ? bgColor.replace('#', '') : ''
    if (!/^[0-9A-F]{6}$/i.test(hex) && !/^[0-9A-F]{3}$/i.test(hex)) return '#fff'
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 125 ? '#333' : '#fff'
  }

  const getColorFromId = (id) => {
    const numericId = !id ? 0 : id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const hue = numericId % 360
    return `hsl(${hue}, 70%, 50%)`
  }

  const getLighterColor = (color) => {
    if (!color) return '#f8f9fa'
    if (color.startsWith('hsl')) {
      try {
        const [h, s, l] = color.match(/\d+/g).map(Number)
        const newL = l + (100 - l) * 0.85
        return `hsl(${h}, ${s}%, ${newL}%)`
      } catch (e) {
        return '#f8f9fa'
      }
    }
    if (color.startsWith('#')) {
      const hex = color.replace('#', '')
      let r = parseInt(hex.substr(0, 2), 16)
      let g = parseInt(hex.substr(2, 2), 16)
      let b = parseInt(hex.substr(4, 2), 16)
      r = Math.floor(r + (255 - r) * 0.85)
      g = Math.floor(g + (255 - g) * 0.85)
      b = Math.floor(b + (255 - b) * 0.85)
      return `rgb(${r}, ${g}, ${b})`
    }
    return '#f8f9fa'
  }

  // Remove staff member from course
  const handleRemoveStaff = async (staffMember) => {
    if (updating) return
    
    try {
      setUpdating(true)
      
      const courseRef = doc(firestore, 'courses', id)
      
      // Update course document
      await updateDoc(courseRef, {
        teacher: arrayRemove(staffMember),
        teacherIds: arrayRemove(staffMember.id)
      })

      // Update local state
      setStaff(prev => prev.filter(staff => staff !== staffMember.name))
      
      // Refresh course data
      const courseDocRef = doc(firestore, 'courses', id)
      const courseDoc = await getDoc(courseDocRef)
      if (courseDoc.exists()) {
        const courseData = courseDoc.data()
        setCourse({ id: courseDoc.id, ...courseData })
      }
      
    } catch (error) {
      console.error('Error removing staff member:', error)
      alert('Failed to remove staff member. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  // Remove student from course
  const handleRemoveStudent = async (student) => {
    if (updating) return
    
    try {
      setUpdating(true)
      
      const courseRef = doc(firestore, 'courses', id)
      
      // Update course document
      await updateDoc(courseRef, {
        students: arrayRemove(student),
        enrolledList: arrayRemove(student.id)
      })

      // Update local state
      setStudents(prev => prev.filter(s => s !== student.name))
      
      // Refresh course data
      const courseDocRef = doc(firestore, 'courses', id)
      const courseDoc = await getDoc(courseDocRef)
      if (courseDoc.exists()) {
        const courseData = courseDoc.data()
        setCourse({ id: courseDoc.id, ...courseData })
      }
      
    } catch (error) {
      console.error('Error removing student:', error)
      alert('Failed to remove student. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <div className="loading-container">Loading course details...</div>
  }

  if (!course) {
    return <div className="course-not-found">Course not found</div>
  }

  const courseColor = course.color || getColorFromId(course.id)
  const textColor = getTextColor(courseColor)
  const lightColor = getLighterColor(courseColor)

  // Use teacher and students arrays from course doc
  const staffList = Array.isArray(course.teacher) ? course.teacher : []
  const studentList = Array.isArray(course.students) ? course.students : []

  // Use this for all budget calculations and display
  const initialBudget =
    typeof course?.budget?.totalBudget === 'number' ? course.budget.totalBudget : 0

  // Calculate remaining budget and used percent
  const accumulatedCost = course?.budget?.accumulatedCost || 0
  const remainingBudget = (initialBudget - accumulatedCost).toFixed(2)
  const usedPercent = initialBudget > 0 ? ((accumulatedCost / initialBudget) * 100).toFixed(1) : 0

  return (
    <div className="course-detail-container">
      <div className="course-header" style={{ backgroundColor: courseColor, color: textColor }}>
        <h1>{course.title}</h1>
        <p>{course.description}</p>
      </div>

      <div className="section-navigation mt-4">
        <CRow className="g-4">
          <CCol md={3}>
            <CCard className="h-100 navigation-card">
              <CCardBody className="d-flex flex-column">
                <h4>Budget</h4>
                <p className="flex-grow-1">
                  Track and manage course budget, expenses, and financial records.
                </p>
                <div>
                  <CButton
                    color="primary"
                    onClick={() => navigate(`/courses/${id}/budget`)}
                    className="w-100"
                  >
                    View Budget
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          </CCol>

          <CCol md={3}>
            <CCard className="h-100 navigation-card">
              <CCardBody className="d-flex flex-column">
                <h4>Timetable</h4>
                <p className="flex-grow-1">
                  View the complete class timetable with all course sessions.
                </p>
                <div>
                  <CButton
                    color="primary"
                    onClick={() => navigate(`/courses/${id}/timetable`)}
                    className="w-100"
                  >
                    View Timetable
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </div>

      <CCard className="mt-4">
        <CCardBody>
          <h3 style={{ borderBottom: `2px solid ${courseColor}` }}>Course Overview</h3>
          <div className="course-overview-section mt-4">
            
            <CRow>
              <CCol md={6}>
                <h4>Staff</h4>
                {userRole === 'admin' && (
                  <CButton color="primary" size="sm" className="mb-2" onClick={() => setShowStaffModal(true)}>
                    Manage Staff
                  </CButton>
                )}
                <table className="members-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      {userRole === 'admin' && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.length === 0 ? (
                      <tr>
                        <td colSpan={userRole === 'admin' ? 3 : 2}>No staff listed</td>
                      </tr>
                    ) : (
                      staffList.map((t, idx) => (
                        <tr key={idx}>
                          <td>{t.schoolId || '-'}</td>
                          <td>{t.name || '-'}</td>
                          {userRole === 'admin' && (
                            <td>
                              <CButton
                                color="danger"
                                size="sm"
                                onClick={() => handleRemoveStaff(t)}
                                disabled={updating}
                              >
                                Remove
                              </CButton>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CCol>
              <CCol md={6}>
                <h4>Students</h4>
                <CButton color="primary" size="sm" className="mb-2" onClick={() => setShowStudentModal(true)}>
                  Add Students
                </CButton>
                <table className="members-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      {userRole === 'admin' && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {studentList.length === 0 ? (
                      <tr>
                        <td colSpan={userRole === 'admin' ? 3 : 2}>No students listed</td>
                      </tr>
                    ) : (
                      studentList.map((s, idx) => (
                        <tr key={idx}>
                          <td>{s.id || '-'}</td>
                          <td>{s.name || '-'}</td>
                          {userRole === 'admin' && (
                            <td>
                              <CButton
                                color="danger"
                                size="sm"
                                onClick={() => handleRemoveStudent(s)}
                                disabled={updating}
                              >
                                Remove
                              </CButton>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CCol>
            </CRow>
            <div className="course-statistics mt-4">
              <h4>Course Statistics</h4>
              <ul>
                <li>Enrollment: {studentList.length} students</li>
                <li>Staff: {staffList.length} instructors</li>
                <li>
                  Location:{' '}
                  {course.schedule && course.schedule.location ? course.schedule.location : 'N/A'}
                </li>
              </ul>
            </div>
          </div>
        </CCardBody>
      </CCard>
      {/* Student selection & creation modal */}
      <StudentSelectorModal visible={showStudentModal} courseId={id} onClose={() => setShowStudentModal(false)} />
      
      {/* Staff management modal */}
      <StaffSelectorModal 
        visible={showStaffModal} 
        courseId={id} 
        courseData={course}
        onClose={() => setShowStaffModal(false)}
        onUpdate={() => {
          // Refresh course data after staff update
          const fetchCourseData = async () => {
            if (!id) return
            try {
              const courseDocRef = doc(firestore, 'courses', id)
              const courseDoc = await getDoc(courseDocRef)
              if (courseDoc.exists()) {
                const courseData = courseDoc.data()
                setCourse({ id: courseDoc.id, ...courseData })
              }
            } catch (error) {
              console.error('Error refreshing course data:', error)
            }
          }
          fetchCourseData()
        }}
      />
    </div>
  )
}

export default CourseDetailPage
