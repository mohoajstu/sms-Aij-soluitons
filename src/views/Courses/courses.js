// CoursesPage.jsx (debug version)
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { auth, firestore } from '../../firebase'
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import './courses.css'
import { CButton, CButtonGroup, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'

function CoursesPage() {
  console.log('CoursesPage rendered');
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

  const getRandomColorFromId = (id) => {
    if (!id) return 'hsl(200, 70%, 60%)'
    
    // Create a more complex hash from the ID
    let hash = 0
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    // Add additional randomness by using the index and timestamp
    const additionalSeed = (hash * 9301 + 49297) % 233280
    const combinedHash = hash ^ additionalSeed
    
    // Use different parts of the hash for different color properties
    const hue = Math.abs(combinedHash) % 360
    const saturation = 55 + (Math.abs(combinedHash >> 8) % 35) // 55-90%
    const lightness = 40 + (Math.abs(combinedHash >> 16) % 25) // 40-65%
    
    // Add some variation to make colors more distinct
    const hueVariation = (Math.abs(combinedHash >> 4) % 20) - 10 // ±10 degrees
    const finalHue = (hue + hueVariation + 360) % 360
    
    return `hsl(${finalHue}, ${saturation}%, ${lightness}%)`
  }

  const getGradientColors = (baseColor) => {
    // Parse HSL color
    const hslMatch = baseColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
    if (!hslMatch) return { primary: baseColor, secondary: baseColor }
    
    const [, h, s, l] = hslMatch.map(Number)
    
    // Create more varied secondary colors
    const complementaryHue = (h + 180) % 360
    const analogousHue1 = (h + 45) % 360
    const analogousHue2 = (h - 45 + 360) % 360
    const triadicHue1 = (h + 120) % 360
    const triadicHue2 = (h + 240) % 360
    
    // Use more hash bits to choose from more color combinations
    const colorId = parseInt(h + s + l)
    const colorChoice = colorId % 5
    
    let secondaryHue
    switch (colorChoice) {
      case 0: secondaryHue = complementaryHue; break
      case 1: secondaryHue = analogousHue1; break
      case 2: secondaryHue = analogousHue2; break
      case 3: secondaryHue = triadicHue1; break
      case 4: secondaryHue = triadicHue2; break
      default: secondaryHue = complementaryHue; break
    }
    
    // Add more variation to secondary color properties
    const secondarySaturation = Math.max(35, Math.min(95, s + (colorId % 20) - 10))
    const secondaryLightness = Math.max(35, Math.min(85, l + (colorId % 30) - 15))
    
    return {
      primary: baseColor,
      secondary: `hsl(${secondaryHue}, ${secondarySaturation}%, ${secondaryLightness}%)`
    }
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
          <Link to="/courses/new" className="btn btn-primary">
            Create Course
          </Link>
          <Link to="/courses/timetable" className="btn btn-success">
            View Timetable
          </Link>
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
          const baseColor = course.color || getRandomColorFromId(course.id)
          const gradientColors = getGradientColors(baseColor)
          const textColor = getTextColor(baseColor)
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
                  background: `linear-gradient(135deg, ${gradientColors.primary} 0%, ${gradientColors.secondary} 100%)`,
                  color: textColor,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Liquid glass overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.1) 100%)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 'inherit',
                    pointerEvents: 'none',
                  }}
                />
                
                {/* Subtle pattern overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%),
                                radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
                    pointerEvents: 'none',
                  }}
                />
                
                <div className="course-tile-body" style={{ position: 'relative', zIndex: 1 }}>
                  <h2 className="course-tile-title">{courseTitle}</h2>
                  {/* All meta info removed as per user request */}
                </div>
                <div className="course-tile-footer" style={{ position: 'relative', zIndex: 1 }}>
                  {[...Array(3)].map((_, i) => (
                    <span
                      key={i}
                      className={iconClasses}
                      style={{
                        backgroundColor: `rgba(${
                          textColor === '#fff' ? '255,255,255' : '0,0,0'
                        }, ${0.3 + i * 0.2})`,
                        backdropFilter: 'blur(5px)',
                        WebkitBackdropFilter: 'blur(5px)',
                        border: `1px solid rgba(${
                          textColor === '#fff' ? '255,255,255' : '0,0,0'
                        }, 0.2)`,
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
