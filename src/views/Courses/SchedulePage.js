import React, { useEffect, useState } from 'react'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import {
  initializeGoogleApi,
  initializeGIS,
  authenticate,
  getEvents,
  isAuthenticated,
  isInitialized,
} from '../../services/calendarService'
import { CButton, CSpinner } from '@coreui/react'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { parseISO } from 'date-fns'
import { useParams } from 'react-router-dom'

const localizer = momentLocalizer(moment)

export default function SchedulePage() {
  const { id } = useParams()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [authRequired, setAuthRequired] = useState(false)

  useEffect(() => {
    const initCalendar = async () => {
      try {
        setLoading(true)

        // Initialize Google API if not already initialized
        await initializeGoogleApi()
        await initializeGIS()

        // Check if user is already authenticated
        if (isAuthenticated()) {
          // If already authenticated, fetch events directly
          await fetchEvents()
        } else {
          // Authentication required - but first check if Google APIs are initialized
          if (isInitialized()) {
            try {
              // Try silent authentication first
              await authenticate()
              await fetchEvents()
            } catch (silentAuthError) {
              // Silent authentication failed, user needs to click button
              setAuthRequired(true)
              setLoading(false)
            }
          } else {
            setAuthRequired(true)
            setLoading(false)
          }
        }
      } catch (err) {
        console.error('Error initializing calendar:', err)
        setAuthError('Failed to initialize Google Calendar integration.')
        setLoading(false)
      }
    }

    initCalendar()
  }, [])

  const fetchEvents = async () => {
    try {
      const googleEvents = await getEvents('primary', { maxResults: 50 })
      // Map Google events to react-big-calendar format
      const mappedEvents = googleEvents.map((ev) => ({
        id: ev.id,
        title: ev.summary,
        start: parseISO(ev.start.dateTime || ev.start.date),
        end: parseISO(ev.end.dateTime || ev.end.date),
        allDay: !ev.start.dateTime,
      }))
      setEvents(mappedEvents)
      setAuthRequired(false)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching events:', error)
      setAuthError('Failed to load calendar events. Please try again.')
      setLoading(false)
    }
  }

  const handleConnectCalendar = async () => {
    setLoading(true)
    setAuthError('')

    try {
      await authenticate()
      await fetchEvents()
    } catch (err) {
      console.error('Failed to connect to Google Calendar:', err)
      setAuthError(
        'Failed to connect to Google Calendar. Make sure pop-ups are allowed for this site.',
      )
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <h2>Loading Calendar...</h2>
        <CSpinner color="primary" style={{ margin: '20px' }} />
      </div>
    )
  }

  if (authError) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <h2>Google Calendar</h2>
        <div style={{ color: 'red', margin: '20px 0' }}>{authError}</div>
        <p>Please make sure that:</p>
        <ul style={{ textAlign: 'left', display: 'inline-block' }}>
          <li>Pop-ups are allowed for this site</li>
          <li>You're signed in to your Google account</li>
          <li>You have proper permissions to access your calendar</li>
        </ul>
        <div style={{ marginTop: '20px' }}>
          <CButton color="primary" onClick={handleConnectCalendar}>
            Try Again
          </CButton>
        </div>
      </div>
    )
  }

  if (authRequired) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <h2>Course Calendar - {id}</h2>
        <p>Connect to Google Calendar to view your schedule alongside course events.</p>
        <CButton
          color="primary"
          size="lg"
          onClick={handleConnectCalendar}
          style={{ margin: '20px' }}
        >
          Connect to Google Calendar
        </CButton>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>My Google Calendar Events - Course {id}</h2>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
      />
    </div>
  )
}
