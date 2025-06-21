// CoursesPage.jsx (debug version)
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { auth, firestore } from '../../firebase'
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import './courses.css'
import { CButton, CButtonGroup, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'

function CoursesPage() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(firestore, 'users', user.uid)
          const userDoc = await getDoc(userDocRef)
          const userRole = userDoc.exists() ? userDoc.data().role : null

          const coursesCollectionRef = collection(firestore, 'courses')
          let coursesQuery

          if (userRole?.toLowerCase() === 'admin') {
            coursesQuery = coursesCollectionRef
          } else if (userRole?.toLowerCase() === 'teacher') {
            coursesQuery = query(
              coursesCollectionRef,
              where('teacherIds', 'array-contains', user.uid),
            )
          } else {
            setCourses([])
            setLoading(false)
            return
          }

          const coursesSnapshot = await getDocs(coursesQuery)
          const userCourses = coursesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          setCourses(userCourses)
        } catch (error) {
          console.error('Error fetching courses:', error)
          setCourses([])
        } finally {
          setLoading(false)
        }
      } else {
        setCourses([])
        setLoading(false)
      }
    })
    return () => unsubscribe()
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
    if (!/^[0-9A-F]{6}$/i.test(hex) && !/^[0-9A-F]{3}$/i.test(hex)) {
      return '#fff'
    }
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

  const iconTypes = [
    { shape: 'circle', size: '20px' },
    { shape: 'square', size: '18px' },
    { shape: 'triangle', size: '22px' },
  ]

  if (loading) {
    return <div>Loading courses...</div>
  }

  return (
    <div className="courses-page-container">
      <div className="courses-header">
        <h1>Courses</h1>
        <div className="courses-actions">
          <CButtonGroup>
            <CButton color="primary" component={Link} to="/courses/new">
              Create Course
            </CButton>
            <CButton color="success" component={Link} to="/courses/timetable">
              View Timetable
            </CButton>
          </CButtonGroup>
        </div>
      </div>

      <CRow className="mb-4">
        <CCol>
          <CCard className="course-info-card">
            <CCardHeader>Course Management</CCardHeader>
            <CCardBody>
              <p>
                Manage your school courses, assignments, and class schedules. Add or edit courses,
                track assignments and deadlines, and view timetables for students and teachers.
              </p>
              <ul className="course-features">
                <li>Course creation and editing</li>
                <li>Assignment management with deadline tracking</li>
                <li>Timetable view with Google Calendar integration</li>
                <li>Hijri calendar support for Islamic school scheduling</li>
              </ul>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <div className="courses-grid">
        {courses.map((course, index) => {
          const iconStyle = index % iconTypes.length
          const iconClasses = `course-tile-icon ${iconTypes[iconStyle].shape}`
          const bgColor = course.color || getColorFromId(course.id)
          const textColor = getTextColor(bgColor)
          const linkUrl = `/courses/${course.id}`

          return (
            <Link key={course.id} to={linkUrl} style={{ textDecoration: 'none' }}>
              <div
                className="course-tile"
                style={{
                  backgroundColor: bgColor,
                  color: textColor,
                }}
              >
                <div className="course-tile-body">
                  <h2 className="course-tile-title">{course.title}</h2>
                  <p className="course-tile-description">{course.description}</p>
                  {course.schedule && (
                    <div className="course-schedule-info">
                      <div className="course-schedule-days">
                        {course.schedule.classDays.join(', ')}
                      </div>
                      <div className="course-schedule-time">
                        {course.schedule.startTime} - {course.schedule.endTime}
                      </div>
                    </div>
                  )}
                  {course.assignments && course.assignments.length > 0 && (
                    <div className="assignment-badge">
                      {course.assignments.length}{' '}
                      {course.assignments.length === 1 ? 'Assignment' : 'Assignments'}
                    </div>
                  )}
                </div>
                <div className="course-tile-footer">
                  {[...Array(3)].map((_, i) => (
                    <span
                      key={i}
                      className={iconClasses}
                      style={{
                        backgroundColor: `rgba(${
                          textColor === '#fff' ? '255,255,255' : '0,0,0'
                        }, ${0.2 + i * 0.2})`,
                        width: iconTypes[iconStyle].size,
                        height: iconTypes[iconStyle].size,
                      }}
                    />
                  ))}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default CoursesPage
