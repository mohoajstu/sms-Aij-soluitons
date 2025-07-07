import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import '../Courses/Timetable.css'
import { firestore, auth } from '../../firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { CButton, CForm, CFormCheck, CFormInput, CAlert } from '@coreui/react'

// Define time slots and days
const TIME_SLOTS = [
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
]

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default function TimetablePage() {
  const { id } = useParams()
  const [course, setCourse] = useState(null)
  const [allCourses, setAllCourses] = useState([])
  const [userRole, setUserRole] = useState('')
  const [editing, setEditing] = useState(false)
  const [editDays, setEditDays] = useState([])
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editRoom, setEditRoom] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  useEffect(() => {
    // Fetch course from Firestore
    const fetchCourse = async () => {
      if (!id) return
      try {
        const courseDocRef = doc(firestore, 'courses', id)
        const courseDoc = await getDoc(courseDocRef)
        if (courseDoc.exists()) {
          const courseData = courseDoc.data()
          setCourse({ id: courseDoc.id, ...courseData })
        } else {
          setCourse(null)
        }
      } catch (err) {
        setCourse(null)
      }
    }
    fetchCourse()
  }, [id])

  useEffect(() => {
    // Fetch user role for admin/teacher check
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          // Log the entire user data object for debugging
          console.log('DEBUG: user data =', data)
          // Log the primaryRole for debugging
          console.log('DEBUG: primaryRole =', data.personalInfo?.primaryRole)
          let role = data.personalInfo?.role?.toLowerCase() || data.role?.toLowerCase() || ''
          if (!role && (data.personalInfo?.primaryRole || data.primaryRole)) {
            const primaryRole = (data.personalInfo?.primaryRole || data.primaryRole).toLowerCase()
            if (primaryRole === 'schooladmin' || primaryRole === 'admin') {
              role = 'admin'
            } else if (primaryRole === 'teacher' || primaryRole === 'faculty') {
              role = 'teacher'
            } else {
              role = primaryRole
            }
          }
          // Map top-level role 'faculty' to 'teacher'
          if (role === 'faculty') {
            role = 'teacher'
          }
          setUserRole(role)
        }
      }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (course) {
      setEditDays(course.schedule?.classDays || [])
      setEditStart(course.schedule?.startTime || '')
      setEditEnd(course.schedule?.endTime || '')
      setEditRoom(course.schedule?.room || '')
    }
  }, [course])

  // Helper function to get a color based on course ID
  const getColorFromId = (id) => {
    // Use ID to generate a unique hue
    const hue = (id * 137.5) % 360
    return `hsl(${hue}, 70%, 45%)`
  }

  // Helper function to convert 24-hour time to 12-hour format
  const convert24HourTo12Hour = (time24) => {
    if (!time24) return ''

    const [hours, minutes] = time24.split(':')
    const hoursNum = parseInt(hours, 10)
    const period = hoursNum >= 12 ? 'PM' : 'AM'
    const hours12 = hoursNum % 12 || 12

    return `${hours12}:${minutes} ${period}`
  }

  // Helper function to format time
  const formatTime = (time) => {
    return time // Already formatted in the course object
  }

  const handleDayToggle = (day) => {
    setEditDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  const handleSave = async () => {
    setSaveError('')
    setSaveSuccess('')
    if (!editStart || !editEnd || editDays.length === 0) {
      setSaveError('Please select at least one day and set start/end times.')
      return
    }
    try {
      const courseDocRef = doc(firestore, 'courses', id)
      await updateDoc(courseDocRef, {
        'schedule.classDays': editDays,
        'schedule.startTime': editStart,
        'schedule.endTime': editEnd,
        'schedule.room': editRoom,
      })
      setCourse((prev) => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          classDays: editDays,
          startTime: editStart,
          endTime: editEnd,
          room: editRoom,
        },
      }))
      setEditing(false)
      setSaveSuccess('Schedule updated successfully!')
    } catch (err) {
      setSaveError('Failed to update schedule.')
    }
  }

  if (!course) {
    return <div>Loading course information...</div>
  }

  return (
    <div className="timetable-container" style={{ padding: 20 }}>
      <h2>Timetable for {course.title}</h2>
      <p className="text-muted">Course ID: {course.id}</p>

      {(userRole === 'admin' || userRole === 'teacher') && (
        <div style={{ marginBottom: 24 }}>
          {!editing ? (
            <CButton color="primary" onClick={() => setEditing(true)}>
              Edit Days & Times
            </CButton>
          ) : (
            <CForm className="mb-3" style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
              <div className="mb-2">
                <strong>Days:</strong>
              </div>
              <div className="mb-3" style={{ display: 'flex', gap: 16 }}>
                {DAYS_OF_WEEK.map((day) => (
                  <CFormCheck
                    key={day}
                    type="checkbox"
                    label={day}
                    checked={editDays.includes(day)}
                    onChange={() => handleDayToggle(day)}
                  />
                ))}
              </div>
              <div className="mb-3" style={{ display: 'flex', gap: 16 }}>
                <div>
                  <label>Start Time</label>
                  <CFormInput
                    type="time"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                  />
                </div>
                <div>
                  <label>End Time</label>
                  <CFormInput
                    type="time"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                  />
                </div>
                <div>
                  <label>Room</label>
                  <CFormInput
                    type="text"
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                  />
                </div>
              </div>
              {saveError && <CAlert color="danger">{saveError}</CAlert>}
              {saveSuccess && <CAlert color="success">{saveSuccess}</CAlert>}
              <div style={{ display: 'flex', gap: 12 }}>
                <CButton color="success" onClick={handleSave}>
                  Save
                </CButton>
                <CButton color="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </CButton>
              </div>
            </CForm>
          )}
        </div>
      )}

      <CCard>
        <CCardHeader>
          <h3>Weekly Schedule</h3>
        </CCardHeader>
        <CCardBody>
          <div className="timetable-wrapper">
            <table className="timetable-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #dee2e6' }}>
              <thead>
                <tr>
                  <th style={{ width: 100, border: '1px solid #dee2e6', background: '#f8f9fa' }}>Time</th>
                  {DAYS_OF_WEEK.map((day) => (
                    <th key={day} style={{ textAlign: 'center', border: '1px solid #dee2e6', background: '#f8f9fa' }}>{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot) => (
                  <tr key={slot}>
                    <td style={{ fontWeight: 'bold', background: '#f8f9fa', border: '1px solid #dee2e6' }}>{slot}</td>
                    {DAYS_OF_WEEK.map((day) => {
                      // Check if the current course is scheduled for this day and time slot
                      const isCourseInSlot =
                        course.schedule?.classDays?.includes(day) &&
                        (convert24HourTo12Hour(course.schedule?.startTime) === slot || course.schedule?.startTime === slot)

                      return (
                        <td key={day} style={{ minWidth: 120, height: 48, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>
                          {isCourseInSlot && (
                            <div
                              className="course-item"
                              style={{
                                backgroundColor: '#6c63ff',
                                color: 'white',
                                borderRadius: 6,
                                padding: 6,
                                fontWeight: 'bold',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                              }}
                            >
                              <div className="course-title">{course.title}</div>
                              <div className="course-details">
                                <span>
                                  {course.schedule?.startTime} - {course.schedule?.endTime}
                                </span>
                                <span>{course.schedule?.room}</span>
                              </div>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CCardBody>
      </CCard>
    </div>
  )
}
