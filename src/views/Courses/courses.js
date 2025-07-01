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
          let userRole = null
          if (userDoc.exists()) {
            const userData = userDoc.data()
            userRole = userData.personalInfo?.role || userData.role || null
          }

          const coursesCollectionRef = collection(firestore, 'courses')
          let coursesQuery

          if (userRole?.toLowerCase() === 'admin') {
            coursesQuery = coursesCollectionRef
            const coursesSnapshot = await getDocs(coursesQuery)
            const userCourses = coursesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
            setCourses(userCourses)
          } else if (userRole?.toLowerCase() === 'faculty') {
            // Fetch the faculty doc from the 'faculty' collection
            const facultyDocRef = doc(firestore, 'faculty', user.uid)
            const facultyDoc = await getDoc(facultyDocRef)
            if (!facultyDoc.exists()) {
              setCourses([])
              setLoading(false)
              return
            }
            const facultyData = facultyDoc.data()
            const facultyCourses = facultyData.courses || []
            if (facultyCourses.length === 0) {
              setCourses([])
              setLoading(false)
              return
            }
            // Fetch each course by ID from the 'courses' collection
            const courseDocs = await Promise.all(
              facultyCourses.map((courseId) => getDoc(doc(coursesCollectionRef, courseId))),
            )
            const userCourses = courseDocs
              .filter((doc) => doc.exists())
              .map((doc) => ({ id: doc.id, ...doc.data() }))
            setCourses(userCourses)
          } else {
            setCourses([])
            setLoading(false)
            return
          }
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

          // Robust field extraction
          const courseTitle = course.title || course.name || 'Untitled Course'
          const courseDesc = course.description || ''
          const courseGrade = course.gradeLevel || (course.grade ? `Grade ${course.grade}` : '')
          const courseSubject = course.subject || ''
          const teacherNames = Array.isArray(course.teacher)
            ? course.teacher.map((t) => t.name).join(', ')
            : Array.isArray(course.teachers)
              ? course.teachers.join(', ')
              : ''
          const studentCount = Array.isArray(course.students)
            ? course.students.length
            : Array.isArray(course.enrolledList)
              ? course.enrolledList.length
              : 0

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
                  <h2 className="course-tile-title">{courseTitle}</h2>
                  {/* All meta info removed as per user request */}
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
