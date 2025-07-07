import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CSpinner,
  CAlert,
  CRow,
  CCol,
} from '@coreui/react'
import { firestore, auth } from '../../firebase'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import './Timetable.css'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => `${i + 8}:00`) // 8:00 to 21:00

const Timetable = () => {
  // Fetch courses for the current user from Firestore
  const [courses, setCourses] = useState([])
  const [loadingCourses, setLoadingCourses] = useState(true)

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
          } else if (userRole?.toLowerCase() === 'faculty' || userRole?.toLowerCase() === 'teacher') {
            // Fetch the faculty doc from the 'faculty' collection
            const facultyDocRef = doc(firestore, 'faculty', user.uid)
            const facultyDoc = await getDoc(facultyDocRef)
            if (!facultyDoc.exists()) {
              setCourses([])
              setLoadingCourses(false)
              return
            }
            const facultyData = facultyDoc.data()
            const facultyCourses = facultyData.courses || []
            if (facultyCourses.length === 0) {
              setCourses([])
              setLoadingCourses(false)
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
            setLoadingCourses(false)
            return
          }
        } catch (error) {
          console.error('Error fetching courses:', error)
          setCourses([])
        } finally {
          setLoadingCourses(false)
        }
      } else {
        setCourses([])
        setLoadingCourses(false)
      }
    })
    return () => unsubscribe()
  }, [])

  // Function to get a color based on course ID
  const getColorFromId = (id) => {
    const hue = (id * 271.019) % 360
    return `hsl(${hue}, 70%, 45%)`
  }

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return ''

    // If time is in 24-hour format like "14:30"
    const [hours, minutes] = timeString.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12

    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Generate the timetable grid
  const renderTimetable = () => {
    if (loadingCourses) {
      return (
        <div className="text-center my-5">
          <CSpinner color="primary" />
          <p className="mt-3">Loading courses...</p>
        </div>
      )
    }
    if (courses.length === 0) {
      return <CAlert color="info">No courses found for your account.</CAlert>
    }

    return (
      <div className="timetable-container">
        <div className="timetable-header">
          <div className="time-column header-cell"></div>
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="day-column header-cell">
              {day}
            </div>
          ))}
        </div>

        <div className="timetable-body">
          {TIME_SLOTS.map((timeSlot, index) => (
            <div key={timeSlot} className="timetable-row">
              <div className="time-column time-cell">{timeSlot}</div>

              {DAYS_OF_WEEK.map((day) => {
                const coursesInSlot = courses.filter((course) => {
                  if (!course.schedule || !course.schedule.classDays) return false
                  if (!course.schedule.classDays.includes(day)) return false
                  // Check if course overlaps with this time slot
                  // Support both 24h and 12h time formats
                  const slotHour = parseInt(timeSlot.split(':')[0], 10)
                  let courseStartHour = 0
                  let courseEndHour = 0
                  if (course.schedule.startTime && course.schedule.endTime) {
                    if (course.schedule.startTime.includes('AM') || course.schedule.startTime.includes('PM')) {
                      // 12h format
                      const [start, startPeriod] = course.schedule.startTime.split(' ')
                      const [end, endPeriod] = course.schedule.endTime.split(' ')
                      courseStartHour = parseInt(start.split(':')[0], 10)
                      courseEndHour = parseInt(end.split(':')[0], 10)
                      if (startPeriod === 'PM' && courseStartHour !== 12) courseStartHour += 12
                      if (endPeriod === 'PM' && courseEndHour !== 12) courseEndHour += 12
                    } else {
                      // 24h format
                      courseStartHour = parseInt(course.schedule.startTime.split(':')[0], 10)
                      courseEndHour = parseInt(course.schedule.endTime.split(':')[0], 10)
                    }
                  }
                  return slotHour >= courseStartHour && slotHour < courseEndHour
                })

                return (
                  <div key={day} className="day-column schedule-cell">
                    {coursesInSlot.map((course) => (
                      <div
                        key={course.id}
                        className="course-item"
                        style={{ backgroundColor: getColorFromId(course.id), color: 'white', borderRadius: 6, padding: 6, fontWeight: 'bold', marginBottom: 4 }}
                      >
                        <div className="course-title">{course.title}</div>
                        <div className="course-details">
                          <span>
                            {formatTime(course.schedule?.startTime)} - {formatTime(course.schedule?.endTime)}
                          </span>
                          <span>{course.schedule?.room}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="timetable-view-container">
      <CCard>
        <CCardHeader>
          <CRow className="align-items-center">
            <CCol>
              <h2 className="mb-0">Class Schedule</h2>
            </CCol>
          </CRow>
        </CCardHeader>

        <CCardBody>
          {renderTimetable()}
        </CCardBody>
      </CCard>
    </div>
  )
}

export default Timetable
