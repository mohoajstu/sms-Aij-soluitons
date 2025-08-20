// CoursesPage.jsx (updated for new schedule structure and faculty integration)
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { auth, firestore } from '../../firebase'
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { loadCurrentUserProfile } from '../../utils/userProfile'
import './courses.css'
import { CButton, CButtonGroup, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'

function CoursesPage() {
  console.log('CoursesPage rendered');
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  // Add diagnostic function to manually check course existence
  const diagnoseCourseIssue = async (facultyCourses) => {
    console.log('🔬 DIAGNOSTIC: Manually checking course documents...')
    for (const courseId of facultyCourses) {
      try {
        const directDocRef = doc(firestore, 'courses', courseId)
        const directDoc = await getDoc(directDocRef)
        console.log(`🔬 DIAGNOSTIC Course ${courseId}:`, {
          exists: directDoc.exists(),
          id: directDoc.id,
          title: directDoc.exists() ? directDoc.data()?.title || directDoc.data()?.name : 'N/A'
        })
      } catch (error) {
        console.error(`🔬 DIAGNOSTIC Error checking ${courseId}:`, error)
      }
    }
    
    // Also check what the admin query would return
    console.log('🔬 DIAGNOSTIC: Checking what admin query returns...')
    try {
      const allCoursesSnapshot = await getDocs(collection(firestore, 'courses'))
      console.log(`🔬 DIAGNOSTIC: Found ${allCoursesSnapshot.docs.length} total courses in collection`)
      allCoursesSnapshot.docs.forEach(doc => {
        const data = doc.data()
        console.log(`🔬 DIAGNOSTIC Course in collection:`, {
          docId: doc.id,
          courseId: data.courseID || data.courseId,
          title: data.title || data.name
        })
      })
    } catch (error) {
      console.error('🔬 DIAGNOSTIC Error checking all courses:', error)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Use the same logic as useAuth.js - email-based lookup
          console.log('🔍 Looking up user profile for:', user.email)
          const profile = await loadCurrentUserProfile(firestore, user)
          
          let userRole = null
          let userData = null
          let tarbiyahId = null
          
          if (profile) {
            userData = profile.data
            tarbiyahId = profile.id // This is the actual Tarbiyah ID (document ID)
            userRole = userData.personalInfo?.role || userData.role || null
            
            console.log('✅ Found user profile with Tarbiyah ID:', tarbiyahId)
            console.log('📄 User data:', userData)
            console.log('🔑 User role:', userRole)
          } else {
            console.warn('⚠️ No user profile found for:', user.email)
            console.warn('⚠️ User may need to be added via People Page first')
          }

          const coursesCollectionRef = collection(firestore, 'courses')

          if (userRole?.toLowerCase() === 'admin') {
            const coursesSnapshot = await getDocs(coursesCollectionRef)
            const userCourses = coursesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
            console.log('👑 ADMIN: Found', userCourses.length, 'courses')
            setCourses(userCourses)
          } else if (userRole?.toLowerCase() === 'faculty') {
            console.log('👨‍🏫 Faculty user detected')
            console.log('🆔 Tarbiyah ID:', tarbiyahId)
            console.log('🆔 Auth UID:', user.uid)
            
            // First, check if the user has a courses array in their document
            if (userData.courses && Array.isArray(userData.courses) && userData.courses.length > 0) {
              console.log('📚 Found courses array in user document:', userData.courses)
              
              try {
                // Fetch the actual course documents using the course IDs from the user's courses array
                const userCourses = []
                
                for (const courseId of userData.courses) {
                  try {
                    const courseDocRef = doc(firestore, 'courses', courseId)
                    const courseDoc = await getDoc(courseDocRef)
                    
                    if (courseDoc.exists()) {
                      const courseData = courseDoc.data()
                      userCourses.push({ id: courseDoc.id, ...courseData })
                      console.log(`✅ Found course: ${courseData.title || courseData.name} (${courseId})`)
                    } else {
                      console.warn(`⚠️ Course document not found: ${courseId}`)
                    }
                  } catch (error) {
                    console.error(`❌ Error fetching course ${courseId}:`, error)
                  }
                }
                
                console.log(`🎯 Successfully loaded ${userCourses.length} courses from user's courses array`)
                setCourses(userCourses)
                
              } catch (error) {
                console.error('❌ Error fetching courses from user courses array:', error)
                setCourses([])
              }
            } else {
              // Fallback: Search through all courses to find ones where this faculty member is assigned
              console.log('📚 No courses array found in user document, searching through all courses...')
              
              try {
                const allCoursesSnapshot = await getDocs(coursesCollectionRef)
                console.log(`📚 Found ${allCoursesSnapshot.docs.length} total courses in collection`)
                
                const userCourses = []
                
                allCoursesSnapshot.docs.forEach(doc => {
                  const courseData = doc.data()
                  const docId = doc.id
                  
                  // Check multiple places where the teacher might be stored
                  const teacherIds = courseData.teacherIds || []
                  const teacherAuthUIDs = courseData.teacherAuthUIDs || []
                  const teacherTarbiyahIds = courseData.teacherTarbiyahIds || []
                  
                  // Check if either Auth UID or Tarbiyah ID is in any of the teacher arrays
                  const isInTeacherIds = teacherIds.includes(tarbiyahId) || teacherIds.includes(user.uid)
                  const isInAuthUIDs = teacherAuthUIDs.includes(user.uid)
                  const isInTarbiyahIds = teacherTarbiyahIds.includes(tarbiyahId)
                  
                  // Also check legacy teachers array (for backward compatibility)
                  let isInTeachersArray = false
                  if (Array.isArray(courseData.teachers)) {
                    isInTeachersArray = courseData.teachers.some(teacher => {
                      if (typeof teacher === 'string') {
                        return teacher === tarbiyahId || teacher === user.uid
                      } else if (typeof teacher === 'object' && teacher.schoolId) {
                        return teacher.schoolId === tarbiyahId || teacher.schoolId === user.uid
                      }
                      return false
                    })
                  }
                  
                  // Also check teacher array (enhanced format)
                  let isInTeacherArray = false
                  if (Array.isArray(courseData.teacher)) {
                    isInTeacherArray = courseData.teacher.some(teacher => {
                      if (typeof teacher === 'object') {
                        return teacher.schoolId === tarbiyahId || 
                               teacher.schoolId === user.uid ||
                               teacher.authUID === user.uid ||
                               teacher.tarbiyahId === tarbiyahId
                      }
                      return false
                    })
                  }
                  
                  console.log(`📝 Course ${docId} (${courseData.title || courseData.name}):`, {
                    teacherIds: teacherIds,
                    teacherAuthUIDs: teacherAuthUIDs,
                    teacherTarbiyahIds: teacherTarbiyahIds,
                    isInTeacherIds: isInTeacherIds,
                    isInAuthUIDs: isInAuthUIDs,
                    isInTarbiyahIds: isInTarbiyahIds,
                    teachers: courseData.teachers,
                    isInTeachersArray: isInTeachersArray,
                    teacher: courseData.teacher,
                    isInTeacherArray: isInTeacherArray,
                    searchingFor: {
                      tarbiyahId: tarbiyahId,
                      authUID: user.uid
                    }
                  })
                  
                  if (isInTeacherIds || isInAuthUIDs || isInTarbiyahIds || isInTeachersArray || isInTeacherArray) {
                    console.log(`✅ Faculty member is assigned to course: ${courseData.title || courseData.name}`)
                    userCourses.push({ id: docId, ...courseData })
                  }
                })
                
                console.log(`🎯 Found ${userCourses.length} courses for faculty member via course search`)
                console.log('🎯 Faculty courses:', userCourses.map(c => ({ id: c.id, title: c.title || c.name })))
                
                setCourses(userCourses)
                
              } catch (error) {
                console.error('❌ Error searching courses for faculty:', error)
                setCourses([])
              }
            }
          } else {
            console.log('🚫 User role not recognized or user not found:', userRole)
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

  // Helper function to extract schedule information from new format
  const getScheduleInfo = (course) => {
    if (course.schedule?.sessions) {
      // New format: sessions object
      const enabledSessions = Object.entries(course.schedule.sessions)
        .filter(([day, session]) => session.enabled)
        .map(([day, session]) => ({
          day,
          startTime: session.startTime,
          endTime: session.endTime,
          room: session.room
        }))
      
      if (enabledSessions.length > 0) {
        return {
          days: enabledSessions.map(s => s.day.substring(0, 3)).join(', '),
          times: enabledSessions.map(s => `${s.startTime}-${s.endTime}`).join(', '),
          rooms: [...new Set(enabledSessions.map(s => s.room).filter(Boolean))].join(', '),
          hasMultipleTimes: new Set(enabledSessions.map(s => `${s.startTime}-${s.endTime}`)).size > 1
        }
      }
    } else if (course.schedule?.classDays) {
      // Legacy format
      return {
        days: course.schedule.classDays.map(day => day.substring(0, 3)).join(', '),
        times: `${course.schedule.startTime || ''}-${course.schedule.endTime || ''}`,
        rooms: course.schedule.room || course.schedule.location || '',
        hasMultipleTimes: false
      }
    }
    
    return {
      days: 'TBA',
      times: 'TBA',
      rooms: 'TBA',
      hasMultipleTimes: false
    }
  }

  // Helper function to extract teacher information
  const getTeacherInfo = (course) => {
    if (Array.isArray(course.teacher) && course.teacher.length > 0) {
      // New enhanced format
      return course.teacher.map(t => t.name).join(', ')
    } else if (Array.isArray(course.teachers) && course.teachers.length > 0) {
      // Legacy teachers array
      return course.teachers.join(', ')
    } else if (typeof course.teacher === 'string') {
      // Single teacher string
      return course.teacher
    }
    return 'No instructor assigned'
  }

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
    return (
      <div className="courses-page-container">
        <div className="courses-header">
          <h1>Courses</h1>
        </div>
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading courses...</span>
          </div>
          <p className="mt-3">Loading courses...</p>
        </div>
      </div>
    )
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

      {courses.length === 0 ? (
        <div className="text-center py-5">
          <h3>No Courses Found</h3>
          <p className="text-muted">You don't have any courses assigned yet.</p>
          <Link to="/courses/new" className="btn btn-primary">
            Create Your First Course
          </Link>
        </div>
      ) : (
      <div className="courses-grid">
        {courses.map((course, index) => {
          const iconStyle = index % iconTypes.length
          const iconClasses = `course-tile-icon ${iconTypes[iconStyle].shape}`
          const baseColor = course.color || getRandomColorFromId(course.id)
          const gradientColors = getGradientColors(baseColor)
          const textColor = getTextColor(baseColor)
          const linkUrl = `/courses/${course.id}`

          // Enhanced field extraction with new schedule structure
          const courseTitle = course.title || course.name || 'Untitled Course'
          const courseDesc = course.description || ''
          const courseGrade = course.gradeLevel || (course.grade ? `Grade ${course.grade}` : '')
          const courseSubject = course.subject || ''
          const teacherNames = getTeacherInfo(course)
          const scheduleInfo = getScheduleInfo(course)
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
                  
                  {/* Enhanced course information */}
                  <div className="course-info" style={{ fontSize: '0.85em', opacity: 0.9, marginTop: '8px' }}>
                    {courseSubject && courseGrade && (
                      <div style={{ marginBottom: '4px' }}>
                        <strong>{courseSubject}</strong> • {courseGrade}
                      </div>
                    )}
                    
                    {teacherNames && (
                      <div style={{ marginBottom: '4px' }}>
                        👨‍🏫 {teacherNames}
                      </div>
                    )}
                    
                    {scheduleInfo.days !== 'TBA' && (
                      <div style={{ marginBottom: '4px' }}>
                        📅 {scheduleInfo.days}
                        {scheduleInfo.hasMultipleTimes ? (
                          <div style={{ fontSize: '0.8em', opacity: 0.8 }}>
                            🕐 Multiple times
                          </div>
                        ) : scheduleInfo.times !== 'TBA' && (
                          <span> • 🕐 {scheduleInfo.times}</span>
                        )}
                      </div>
                    )}
                    
                    {scheduleInfo.rooms && scheduleInfo.rooms !== 'TBA' && (
                      <div style={{ marginBottom: '4px' }}>
                        🏫 {scheduleInfo.rooms}
                      </div>
                    )}
                    
                    {course.courseID && (
                      <div style={{ fontSize: '0.75em', opacity: 0.7 }}>
                        ID: {course.courseID}
                      </div>
                    )}
                  </div>
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
      )}
    </div>
  )
}

export default CoursesPage
