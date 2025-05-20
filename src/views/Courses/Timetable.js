import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CNav,
  CNavItem,
  CNavLink,
  CButton,
  CSpinner,
  CAlert,
  CRow,
  CCol,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CFormCheck,
} from '@coreui/react'
import { cilSync, cilCalendar } from '@coreui/icons-react'
import coursesData from '../../Data/coursesData.json'
import calendarService from '../../services/calendarService'
import './Timetable.css'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => `${i + 8}:00`) // 8:00 to 21:00

const Timetable = () => {
  const [activeView, setActiveView] = useState('timetable')
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState([])
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState('all') // 'all', 'student', 'teacher'
  const [selectedCalendars, setSelectedCalendars] = useState(['school'])
  const [showHijriDates, setShowHijriDates] = useState(false)
  const [currentHijriDate, setCurrentHijriDate] = useState({ year: 0, month: 0, day: 0 })
  const [loadingStatus, setLoadingStatus] = useState('idle') // idle, loading, success, error
  const [apiInitialized, setApiInitialized] = useState(false)

  // Initialize Google APIs when component mounts
  useEffect(() => {
    const initApis = async () => {
      try {
        // Load API client and initialize GIS
        await calendarService.initializeGoogleApi()
        await calendarService.initializeGIS()
        setApiInitialized(true)
      } catch (error) {
        console.error('Failed to initialize Google APIs:', error)
        setError('Failed to initialize Google APIs. Please try again later.')
      }
    }

    if (!calendarService.isInitialized()) {
      initApis()
    } else {
      setApiInitialized(true)
    }
  }, [])

  // Initial setup - get Hijri date for today
  useEffect(() => {
    const today = new Date()
    const hijriDate = calendarService.gregorianToHijri(today)
    setCurrentHijriDate(hijriDate)
  }, [])

  // Load timetable data
  const loadTimetableData = () => {
    // In a real app, this would come from an API
    // For now, we'll use the courses data from our JSON
    return coursesData.map((course) => ({
      id: course.id,
      title: course.title,
      days: course.schedule.classDays,
      startTime: course.schedule.startTime,
      endTime: course.schedule.endTime,
      room: course.schedule.room,
      staff: course.staff.join(', '),
      color: getColorFromId(course.id),
    }))
  }

  // Function to get a color based on course ID
  const getColorFromId = (id) => {
    const hue = (id * 271.019) % 360
    return `hsl(${hue}, 70%, 45%)`
  }

  // Load Google Calendar events
  const loadCalendarEvents = async () => {
    setIsLoadingCalendar(true)
    setLoadingStatus('loading')
    setError('')

    try {
      if (!apiInitialized) {
        await calendarService.initializeGoogleApi()
        await calendarService.initializeGIS()
        setApiInitialized(true)
      }

      // Authenticate with Google
      await calendarService.authenticate()

      // Get events for the next 7 days
      const events = await calendarService.getEvents('primary', {
        timeMin: new Date().toISOString(),
        timeMax: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        maxResults: 50,
      })

      setCalendarEvents(events)
      setLoadingStatus('success')
    } catch (error) {
      console.error('Error loading calendar events:', error)
      setError('Failed to load calendar events. ' + (error.message || 'Please try again.'))
      setLoadingStatus('error')
    } finally {
      setIsLoadingCalendar(false)
    }
  }

  // Toggle calendar selection
  const toggleCalendar = (calendarId) => {
    if (selectedCalendars.includes(calendarId)) {
      setSelectedCalendars(selectedCalendars.filter((id) => id !== calendarId))
    } else {
      setSelectedCalendars([...selectedCalendars, calendarId])
    }
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

  // Function to check if a course should be displayed in the timetable
  const shouldShowCourse = (course) => {
    if (currentUser === 'all') return true

    // In a real app, you would check if the current user is a student/teacher for this course
    // For demo, we'll just return true
    return true
  }

  // Generate the timetable grid
  const renderTimetable = () => {
    const courses = loadTimetableData()

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
                  if (!shouldShowCourse(course)) return false

                  // Check if course is on this day
                  if (!course.days.includes(day)) return false

                  // Check if course overlaps with this time slot
                  const slotHour = parseInt(timeSlot.split(':')[0], 10)
                  const courseStartHour = parseInt(course.startTime.split(':')[0], 10)
                  const courseEndHour = parseInt(course.endTime.split(':')[0], 10)

                  return slotHour >= courseStartHour && slotHour < courseEndHour
                })

                return (
                  <div key={day} className="day-column schedule-cell">
                    {coursesInSlot.map((course) => (
                      <div
                        key={course.id}
                        className="course-item"
                        style={{ backgroundColor: course.color }}
                      >
                        <div className="course-title">{course.title}</div>
                        <div className="course-details">
                          <span>
                            {formatTime(course.startTime)} - {formatTime(course.endTime)}
                          </span>
                          <span>{course.room}</span>
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

  // Render Google Calendar view
  const renderCalendar = () => {
    if (loadingStatus === 'loading') {
      return (
        <div className="text-center py-5">
          <CSpinner color="primary" />
          <p className="mt-3">Loading calendar events...</p>
        </div>
      )
    }

    if (loadingStatus === 'error') {
      return (
        <CAlert color="danger" className="my-4">
          {error}
          <div className="mt-3">
            <CButton color="primary" onClick={loadCalendarEvents} size="sm">
              Try Again
            </CButton>
          </div>
        </CAlert>
      )
    }

    if (loadingStatus === 'success' && calendarEvents.length === 0) {
      return (
        <CAlert color="info" className="my-4">
          No upcoming events found in your calendar.
        </CAlert>
      )
    }

    return (
      <div className="calendar-events">
        {loadingStatus === 'success' && (
          <ul className="event-list">
            {calendarEvents.map((event, index) => {
              const startDate = new Date(event.start.dateTime || event.start.date)
              const endDate = new Date(event.end.dateTime || event.end.date)

              // Format date and time
              const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' }
              const timeOptions = { hour: 'numeric', minute: 'numeric' }

              const dateStr = startDate.toLocaleDateString('en-US', dateOptions)
              const startTimeStr = event.start.dateTime
                ? startDate.toLocaleTimeString('en-US', timeOptions)
                : 'All day'
              const endTimeStr = event.end.dateTime
                ? endDate.toLocaleTimeString('en-US', timeOptions)
                : ''

              // If showing Hijri dates, also display Hijri date
              let hijriDateStr = ''
              if (showHijriDates) {
                const hijriDate = calendarService.gregorianToHijri(startDate)
                hijriDateStr = `${hijriDate.day}/${hijriDate.month}/${hijriDate.year} H`
              }

              return (
                <li key={index} className="event-item">
                  <div className="event-date">
                    <div>{dateStr}</div>
                    {hijriDateStr && <div className="hijri-date">{hijriDateStr}</div>}
                  </div>
                  <div className="event-content">
                    <h3 className="event-title">{event.summary}</h3>
                    <div className="event-time">
                      {startTimeStr}
                      {endTimeStr ? ` - ${endTimeStr}` : ''}
                    </div>
                    {event.description && (
                      <div className="event-description">{event.description}</div>
                    )}
                    {event.location && (
                      <div className="event-location">
                        <strong>Location:</strong> {event.location}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  // Handle sign out from Google
  const handleSignOut = () => {
    if (calendarService.signOut()) {
      setCalendarEvents([])
      setLoadingStatus('idle')
    }
  }

  return (
    <div className="timetable-view-container">
      <CCard>
        <CCardHeader>
          <CRow className="align-items-center">
            <CCol>
              <h2 className="mb-0">Class Schedule</h2>
            </CCol>
            <CCol xs="auto">
              <CDropdown>
                <CDropdownToggle color="primary">View As</CDropdownToggle>
                <CDropdownMenu>
                  <CDropdownItem
                    active={currentUser === 'all'}
                    onClick={() => setCurrentUser('all')}
                  >
                    All Classes
                  </CDropdownItem>
                  <CDropdownItem
                    active={currentUser === 'student'}
                    onClick={() => setCurrentUser('student')}
                  >
                    Student View
                  </CDropdownItem>
                  <CDropdownItem
                    active={currentUser === 'teacher'}
                    onClick={() => setCurrentUser('teacher')}
                  >
                    Teacher View
                  </CDropdownItem>
                </CDropdownMenu>
              </CDropdown>
            </CCol>
          </CRow>
        </CCardHeader>

        <CCardBody>
          <CNav variant="tabs" className="mb-4">
            <CNavItem>
              <CNavLink
                active={activeView === 'timetable'}
                onClick={() => setActiveView('timetable')}
                href="#"
              >
                Timetable View
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeView === 'calendar'}
                onClick={() => {
                  setActiveView('calendar')
                  if (loadingStatus === 'idle') {
                    loadCalendarEvents()
                  }
                }}
                href="#"
              >
                Google Calendar
              </CNavLink>
            </CNavItem>
          </CNav>

          {/* Hijri Calendar Option */}
          {activeView === 'calendar' && loadingStatus === 'success' && (
            <div className="mb-3 d-flex align-items-center">
              <CFormCheck
                id="hijriDates"
                label="Show Hijri dates"
                checked={showHijriDates}
                onChange={(e) => setShowHijriDates(e.target.checked)}
              />

              <div className="ms-auto">
                <CButton
                  color="link"
                  className="me-2"
                  onClick={loadCalendarEvents}
                  disabled={isLoadingCalendar}
                >
                  <cilSync className="me-1" /> Refresh
                </CButton>

                <CButton color="link" onClick={handleSignOut}>
                  Sign Out
                </CButton>
              </div>
            </div>
          )}

          {/* Current Hijri Date Display */}
          {showHijriDates && activeView === 'calendar' && (
            <div className="hijri-date-display mb-3">
              <cilCalendar className="me-2" />
              Today's Hijri date: {currentHijriDate.day}/{currentHijriDate.month}/
              {currentHijriDate.year} H
            </div>
          )}

          {/* Error Message */}
          {error && <CAlert color="danger">{error}</CAlert>}

          {/* Content Based on Active View */}
          {activeView === 'timetable' ? renderTimetable() : renderCalendar()}

          {/* Google Calendar Integration Button */}
          {activeView === 'calendar' && loadingStatus === 'idle' && (
            <div className="text-center py-4">
              <p>Connect to Google Calendar to view your schedule</p>
              <CButton color="primary" onClick={loadCalendarEvents} disabled={isLoadingCalendar}>
                {isLoadingCalendar ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Connecting...
                  </>
                ) : (
                  'Connect to Google Calendar'
                )}
              </CButton>
            </div>
          )}
        </CCardBody>
      </CCard>
    </div>
  )
}

export default Timetable
