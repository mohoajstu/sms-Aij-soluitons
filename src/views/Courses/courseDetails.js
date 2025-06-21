// CourseDetailPage.jsx
import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
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

  if (loading) {
    return <div className="loading-container">Loading course details...</div>
  }

  if (!course) {
    return <div className="course-not-found">Course not found</div>
  }

  const courseColor = course.color || getColorFromId(course.id)
  const textColor = getTextColor(courseColor)
  const lightColor = getLighterColor(courseColor)

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
                <h4>Assignments</h4>
                <p className="flex-grow-1">
                  Manage and view course assignments, deadlines, and files.
                </p>
                <div>
                  <CButton
                    color="primary"
                    onClick={() => navigate(`/courses/${id}/assignments`)}
                    className="w-100"
                  >
                    View Assignments
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          </CCol>

          <CCol md={3}>
            <CCard className="h-100 navigation-card">
              <CCardBody className="d-flex flex-column">
                <h4>Schedule</h4>
                <p className="flex-grow-1">
                  View course schedule, meeting times, and calendar integration.
                </p>
                <div>
                  <CButton
                    color="primary"
                    onClick={() => navigate(`/courses/${id}/schedule`)}
                    className="w-100"
                  >
                    View Schedule
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          </CCol>

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
          <CRow className="mt-4">
            <CCol md={6}>
              <div className="section">
                <h4>Staff</h4>
                <div className="table-container">
                  <table className="members-table">
                    <thead>
                      <tr>
                        <th style={{ backgroundColor: lightColor }}>ID</th>
                        <th style={{ backgroundColor: lightColor }}>Name</th>
                        <th style={{ backgroundColor: lightColor }}>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((person, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{person}</td>
                          <td>Instructor</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CCol>

            <CCol md={6}>
              <div className="section">
                <h4>Students</h4>
                <div className="table-container">
                  <table className="members-table">
                    <thead>
                      <tr>
                        <th style={{ backgroundColor: lightColor }}>ID</th>
                        <th style={{ backgroundColor: lightColor }}>Name</th>
                        <th style={{ backgroundColor: lightColor }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{student}</td>
                          <td>Enrolled</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CCol>
          </CRow>

          <CRow className="mt-4">
            <CCol>
              <div className="course-stats-card">
                <h4>Course Statistics</h4>
                <div className="stats-content">
                  <div className="stat-item">
                    <div className="stat-label">Enrollment</div>
                    <div className="stat-value">{students.length} students</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Staff</div>
                    <div className="stat-value">{staff.length} instructors</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Assignments</div>
                    <div className="stat-value">{course.assignments?.length || 0} total</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Schedule</div>
                    <div className="stat-value">{course.schedule?.classDays?.join(', ')}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Times</div>
                    <div className="stat-value">
                      {course.schedule?.startTime} - {course.schedule?.endTime}
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Location</div>
                    <div className="stat-value">{course.schedule?.room}</div>
                  </div>
                </div>
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default CourseDetailPage
