import React, { useState, useEffect, useCallback } from 'react'
import { Calendar, momentLocalizer, Views } from 'react-big-calendar'
import moment from 'moment-hijri'
import {
  authenticate,
  getEvents,
  createEvent,
  deleteEvent,
  initializeGoogleApi,
  initializeGIS,
  isAuthenticated,
  isInitialized,
  getCalendarList,
} from '../services/calendarService'
// Use only MUI v5/v6/v7 components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Box,
  Typography,
  Fab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
  Tooltip,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material'
import {
  Event as EventIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  AccessTime as AccessTimeIcon,
  Room as RoomIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material'

// Use modern pickers and adapter
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'

import 'react-big-calendar/lib/css/react-big-calendar.css'
import './EnhancedCalendar.css'
import { format, parseISO } from 'date-fns'

const localizer = momentLocalizer(moment)

// Define Hijri month names/abbreviations globally or pass them appropriately
const HIJRI_MONTH_NAMES = [
  'Muh.',
  'Saf.',
  "Rabi' I",
  "Rabi' II",
  'Jum. I',
  'Jum. II',
  'Raj.',
  'Sha.',
  'Ram.',
  'Shaw.',
  "Dhu'l-Q.",
  "Dhu'l-H.",
]

// Custom component for rendering the date header in month view
const CustomDateHeader = ({ date, label }) => {
  const mDate = moment(date)

  const hijriDay = mDate.iDate()
  const hijriMonthJs = mDate.iMonth()

  let hijriDisplay = '-'
  if (
    hijriDay !== undefined &&
    hijriMonthJs !== undefined &&
    hijriMonthJs >= 0 &&
    hijriMonthJs < HIJRI_MONTH_NAMES.length
  ) {
    hijriDisplay = `${hijriDay} ${HIJRI_MONTH_NAMES[hijriMonthJs]}`
  } else {
    console.warn(
      'CustomDateHeader: Could not determine Hijri date using moment-hijri for',
      date,
      'iMonth():',
      hijriMonthJs,
      'iDate():',
      hijriDay,
    )
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2px 0',
        boxSizing: 'border-box',
      }}
    >
      <Typography
        variant="body2"
        component="div"
        sx={{ fontWeight: '500', lineHeight: 1.1, color: 'text.primary' }}
      >
        {label}
      </Typography>
      {hijriDisplay && (
        <Typography
          variant="caption"
          component="div"
          sx={{
            color: '#2e7d32',
            fontSize: '0.7rem',
            lineHeight: 1.1,
            marginTop: '1px',
          }}
        >
          {hijriDisplay}
        </Typography>
      )}
    </Box>
  )
}

const EnhancedCalendar = ({ courseId }) => {
  // State for calendar events and UI state
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [newEvent, setNewEvent] = useState({
    title: '',
    start: new Date(),
    end: new Date(new Date().getTime() + 60 * 60 * 1000), // 1 hour from now
    description: '',
    location: '',
    eventType: 'Default',
  })
  const [openEventDialog, setOpenEventDialog] = useState(false)
  const [openNewEventDialog, setOpenNewEventDialog] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState(Views.MONTH)
  const [date, setDate] = useState(new Date())
  const [authRequired, setAuthRequired] = useState(false)
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' })
  const [calendarView, setCalendarView] = useState('month')
  const [calendars, setCalendars] = useState([])
  const [selectedCalendar, setSelectedCalendar] = useState('primary')
  const [snackbarOpen, setSnackbarOpen] = useState(false)

  const fetchEventsAndCalendars = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch both events and calendar list concurrently
      const [googleEvents, fetchedCalendars] = await Promise.all([
        getEvents(selectedCalendar, {
          timeMin: moment().startOf('month').toISOString(),
          timeMax: moment().add(3, 'months').endOf('month').toISOString(),
          maxResults: 2500,
        }),
        getCalendarList(), // Use the service function
      ])

      setCalendars(fetchedCalendars || []) // Ensure calendars is an array

      const mappedEvents = googleEvents.map((ev) => {
        const isAllDay = !ev.start.dateTime
        let endDate = new Date(ev.end.dateTime || ev.end.date)
        if (isAllDay) {
          // For all-day events, Google's end.date is exclusive (e.g., next day at 00:00).
          // react-big-calendar might render this as spilling into the next day.
          // Subtracting a small amount (e.g., 1 minute or 1 ms) can sometimes fix this display issue.
          endDate = new Date(endDate.getTime() - 1) // Subtract 1 millisecond
        }

        return {
          id: ev.id,
          title: ev.summary || 'Untitled Event',
          start: new Date(ev.start.dateTime || ev.start.date),
          end: endDate, // Use the potentially adjusted end date
          allDay: isAllDay,
          description: ev.description || '',
          location: ev.location || '',
          eventType:
            ev.extendedProperties &&
            ev.extendedProperties.private &&
            ev.extendedProperties.private.eventType
              ? ev.extendedProperties.private.eventType
              : 'Default', // Add eventType to our mapped event
          googleEvent: ev,
        }
      })

      setEvents(mappedEvents)
      setAuthRequired(false)
      setNotification({ open: false, message: '', severity: 'info' }) // Clear previous notifications
    } catch (error) {
      console.error('Error fetching events or calendar list:', error)
      if (error.reAuthRequired) {
        setAuthRequired(true)
        setNotification({
          open: true,
          message: error.message || 'Authentication required. Please connect to Google Calendar.',
          severity: 'warning',
        })
      } else {
        setNotification({
          open: true,
          message: 'Failed to load calendar data. Please try again.',
          severity: 'error',
        })
      }
    } finally {
      setLoading(false)
    }
  }, [selectedCalendar])

  useEffect(() => {
    const initCalendar = async () => {
      try {
        setLoading(true)
        await initializeGoogleApi()
        await initializeGIS()

        if (isAuthenticated()) {
          await fetchEventsAndCalendars()
        } else {
          if (isInitialized()) {
            try {
              await authenticate() // Attempt to authenticate
              await fetchEventsAndCalendars() // Fetch data after successful authentication
            } catch (silentAuthError) {
              // If authenticate() itself fails (e.g. user closes popup, or other GIS error)
              console.warn('Authentication attempt failed during init:', silentAuthError)
              if (silentAuthError.reAuthRequired || !isAuthenticated()) {
                setAuthRequired(true)
                setNotification({
                  open: true,
                  message:
                    silentAuthError.message || 'Please connect to Google Calendar to proceed.',
                  severity: 'info',
                })
              } else {
                // Some other error during auth that didn't set reAuthRequired but still failed
                setNotification({
                  open: true,
                  message: "Couldn't authenticate with Google Calendar.",
                  severity: 'error',
                })
              }
            }
          } else {
            setAuthRequired(true) // APIs not even initialized, definitely need auth
            setNotification({
              open: true,
              message: 'Google Calendar client not ready. Please try connecting.',
              severity: 'info',
            })
          }
        }
      } catch (err) {
        console.error('Error initializing calendar system:', err)
        setNotification({
          open: true,
          message: 'Error initializing Google Calendar integration. Please refresh the page.',
          severity: 'error',
        })
      } finally {
        setLoading(false)
      }
    }

    initCalendar()
  }, [fetchEventsAndCalendars])

  const handleConnectCalendar = async () => {
    setLoading(true)
    setNotification({ open: false, message: '', severity: 'info' }) // Clear previous notifications
    try {
      await authenticate() // This will prompt user if necessary
      await fetchEventsAndCalendars() // Refresh data after connecting
    } catch (err) {
      console.error('Failed to connect to Google Calendar:', err)
      setNotification({
        open: true,
        message:
          err.message ||
          'Failed to connect to Google Calendar. Make sure pop-ups are allowed and try again.',
        severity: 'error',
      })
      // Ensure authRequired is true if connection fails badly
      if (!isAuthenticated()) {
        setAuthRequired(true)
      }
    } finally {
      setLoading(false)
    }
  }

  // Event handlers
  const handleSelectEvent = (event) => {
    setSelectedEvent(event)
    setOpenEventDialog(true)
  }

  const handleSelectSlot = ({ start, end }) => {
    setNewEvent({
      title: '',
      start,
      end,
      description: '',
      location: '',
      allDay: false,
      eventType: 'Default',
    })
    setOpenNewEventDialog(true)
  }

  const handleEventChange = (e) => {
    const { name, value } = e.target
    setNewEvent((prev) => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (name, date) => {
    setNewEvent((prev) => ({ ...prev, [name]: date }))
  }

  const handleCreateEvent = async () => {
    setLoading(true)
    let errorOccurred = null
    try {
      const googleApiEvent = {
        summary: newEvent.title,
        description: newEvent.description,
        location: newEvent.location,
        start: {},
        end: {},
        extendedProperties: {
          private: {
            eventType: newEvent.eventType || 'Default', // Store our custom event type
          },
        },
      }

      googleApiEvent.start.dateTime = newEvent.start.toISOString()
      googleApiEvent.start.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
      let endDate = newEvent.end
      if (endDate <= newEvent.start) {
        endDate = moment(newEvent.start).add(1, 'hour').toDate()
      }
      googleApiEvent.end.dateTime = endDate.toISOString()
      googleApiEvent.end.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

      const createdEvent = await createEvent(selectedCalendar, googleApiEvent)

      const formattedEvent = {
        id: createdEvent.id,
        title: createdEvent.summary,
        start: new Date(createdEvent.start.dateTime || createdEvent.start.date),
        end: new Date(createdEvent.end.dateTime || createdEvent.end.date),
        allDay: !createdEvent.start.dateTime,
        description: createdEvent.description || '',
        location: createdEvent.location || '',
        eventType:
          createdEvent.extendedProperties &&
          createdEvent.extendedProperties.private &&
          createdEvent.extendedProperties.private.eventType
            ? createdEvent.extendedProperties.private.eventType
            : 'Default',
        googleEvent: createdEvent,
      }

      setEvents((prevEvents) => [...prevEvents, formattedEvent])
      setNotification({
        open: true,
        message: 'Event created successfully!',
        severity: 'success',
      })
    } catch (error) {
      errorOccurred = error
      console.error('Error creating event:', error)
      if (error.reAuthRequired) {
        setAuthRequired(true)
        setOpenNewEventDialog(false)
        setNotification({
          open: true,
          message: error.message || 'Authentication needed to create event. Please connect.',
          severity: 'warning',
        })
      } else {
        // Provide more specific error message if available from the error object
        const message =
          error.result && error.result.error && error.result.error.message
            ? `Failed to create event: ${error.result.error.message}`
            : 'Failed to create event. Please try again.'
        setNotification({
          open: true,
          message: message,
          severity: 'error',
        })
      }
    } finally {
      setLoading(false)
      if (!errorOccurred || !errorOccurred.reAuthRequired) {
        setOpenNewEventDialog(false)
        setNewEvent({
          title: '',
          start: new Date(),
          end: new Date(new Date().getTime() + 60 * 60 * 1000),
          description: '',
          location: '',
          allDay: false,
          eventType: 'Default',
        })
      }
    }
  }

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return
    setLoading(true)
    let errorOccurred = null
    try {
      await deleteEvent(selectedCalendar, selectedEvent.id)
      // Remove the event from the events list
      setEvents((prevEvents) => prevEvents.filter((event) => event.id !== selectedEvent.id))
      setNotification({
        open: true,
        message: 'Event deleted successfully!',
        severity: 'success',
      })
    } catch (error) {
      errorOccurred = error
      console.error('Error deleting event:', error)
      if (error.reAuthRequired) {
        setAuthRequired(true)
        setOpenDeleteDialog(false) // Close dialogs
        setOpenEventDialog(false)
        setNotification({
          open: true,
          message: error.message || 'Authentication needed to delete event. Please connect.',
          severity: 'warning',
        })
      } else {
        setNotification({
          open: true,
          message: 'Failed to delete event. Please try again.',
          severity: 'error',
        })
      }
    } finally {
      setLoading(false)
      // Only close dialogs if not an auth error
      if (!errorOccurred || !errorOccurred.reAuthRequired) {
        setOpenDeleteDialog(false)
        setOpenEventDialog(false)
        setSelectedEvent(null)
      }
    }
  }

  const handleCalendarChange = (event) => {
    setSelectedCalendar(event.target.value)
  }

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false })
  }

  // Custom event components
  const EventComponent = ({ event }) => (
    <div
      className="event-container"
      style={{
        backgroundColor: getEventColor(event),
        borderLeft: `4px solid ${getDarkerColor(getEventColor(event))}`,
      }}
    >
      <div className="event-title">{event.title}</div>
      {!event.allDay && (
        <div className="event-time">
          <AccessTimeIcon fontSize="small" />
          {moment(event.start).format('h:mm A')}
        </div>
      )}
      {event.location && (
        <div className="event-location">
          <RoomIcon fontSize="small" />
          {event.location}
        </div>
      )}
    </div>
  )

  // Helper functions
  const getEventColor = (event) => {
    const typeColorMap = {
      Meeting: '#039be5',
      Assignment: '#e67c73',
      'Class Session': '#33b679',
      Personal: '#7986cb',
      // 'Default': '#4285f4' // Default can fall through to Google's color or a final default
    }

    if (event.eventType && typeColorMap[event.eventType]) {
      return typeColorMap[event.eventType]
    }

    // Fallback to Google Calendar event colorId if available
    if (event.googleEvent && event.googleEvent.colorId) {
      const googleColorMap = {
        1: '#7986cb', // Lavender
        2: '#33b679', // Sage
        3: '#8e24aa', // Grape
        4: '#e67c73', // Flamingo
        5: '#f6bf26', // Banana
        6: '#f4511e', // Tangerine
        7: '#039be5', // Peacock
        8: '#616161', // Graphite
        9: '#3f51b5', // Blueberry
        10: '#0b8043', // Basil
        11: '#d50000', // Tomato
      }
      return googleColorMap[event.googleEvent.colorId] || '#4285f4' // Default blue
    }

    // If no color is specified, use a default color
    return '#4285f4'
  }

  const getDarkerColor = (color) => {
    // Convert hex to RGB
    let r = parseInt(color.substring(1, 3), 16)
    let g = parseInt(color.substring(3, 5), 16)
    let b = parseInt(color.substring(5, 7), 16)

    // Make darker by reducing brightness by 30%
    r = Math.floor(r * 0.7)
    g = Math.floor(g * 0.7)
    b = Math.floor(b * 0.7)

    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  const handleNavigate = (newDate) => {
    setDate(newDate)
  }

  // Render loading state
  if (loading && !events.length) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
        }}
      >
        <CircularProgress size={60} thickness={4} sx={{ mb: 3 }} />
        <Typography variant="h6" color="textSecondary">
          Loading Calendar...
        </Typography>
      </Box>
    )
  }

  // Render authentication required state
  if (authRequired) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
          textAlign: 'center',
          px: 2,
        }}
      >
        <EventIcon sx={{ fontSize: 60, color: 'primary.main', mb: 3 }} />
        <Typography variant="h4" gutterBottom>
          Connect to Google Calendar
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ maxWidth: 600, mb: 4 }}>
          Connect to Google Calendar to view, add, and manage your events. All changes will be
          synced automatically with your Google Calendar.
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<EventIcon />}
          onClick={handleConnectCalendar}
        >
          Connect to Google Calendar
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ height: 'calc(100vh - 200px)', minHeight: '700px' }}>
      {/* Calendar Controls */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="calendar-select-label">Calendar</InputLabel>
            <Select
              labelId="calendar-select-label"
              value={selectedCalendar}
              label="Calendar"
              onChange={handleCalendarChange}
              size="small"
            >
              {calendars.map((calendar) => (
                <MenuItem key={calendar.id} value={calendar.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: calendar.backgroundColor || '#4285f4',
                        mr: 1,
                      }}
                    />
                    {calendar.summary} {calendar.primary && '(Primary)'}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="view-select-label">View</InputLabel>
            <Select
              labelId="view-select-label"
              value={calendarView}
              label="View"
              onChange={(e) => setCalendarView(e.target.value)}
              size="small"
            >
              <MenuItem value="month">Month</MenuItem>
              <MenuItem value="week">Week</MenuItem>
              <MenuItem value="day">Day</MenuItem>
              <MenuItem value="agenda">Agenda</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh Calendar">
            <IconButton onClick={fetchEventsAndCalendars} color="primary" disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Add New Event">
            <IconButton onClick={() => setOpenNewEventDialog(true)} color="primary">
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* The Calendar Component */}
      <Box className="enhanced-calendar-container" sx={{ height: 'calc(100% - 48px)' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          views={{
            month: true,
            week: true,
            day: true,
            agenda: true,
          }}
          view={calendarView}
          onView={setCalendarView}
          date={date}
          onNavigate={handleNavigate}
          selectable
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          components={{
            event: EventComponent,
            month: {
              dateHeader: CustomDateHeader,
            },
          }}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: 'transparent',
              border: 'none',
              margin: 0,
              padding: 0,
            },
          })}
          dayPropGetter={(date) => {
            const today = new Date()
            const isCurrentDay =
              date.getDate() === today.getDate() &&
              date.getMonth() === today.getMonth() &&
              date.getFullYear() === today.getFullYear()

            return {
              className: isCurrentDay ? 'current-day' : undefined,
            }
          }}
          toolbar={true}
          popup
          min={new Date(0, 0, 0, 7, 0, 0)} // 7:00 AM
          max={new Date(0, 0, 0, 17, 0, 0)} // 5:00 PM
        />
      </Box>

      {/* Event Details Dialog */}
      <Dialog
        open={openEventDialog}
        onClose={() => setOpenEventDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedEvent && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="div">
                  {selectedEvent.title}
                </Typography>
                <IconButton onClick={() => setOpenEventDialog(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  <AccessTimeIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {selectedEvent.allDay ? (
                    <>All day · {moment(selectedEvent.start).format('ddd, MMMM D, YYYY')}</>
                  ) : (
                    <>
                      {moment(selectedEvent.start).format('ddd, MMMM D, YYYY · h:mm A')} -
                      {moment(selectedEvent.start).isSame(selectedEvent.end, 'day')
                        ? moment(selectedEvent.end).format(' h:mm A')
                        : moment(selectedEvent.end).format(' ddd, MMMM D, YYYY · h:mm A')}
                    </>
                  )}
                </Typography>
              </Box>

              {selectedEvent.location && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1">
                    <RoomIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {selectedEvent.location}
                  </Typography>
                </Box>
              )}

              {selectedEvent.description && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <DescriptionIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Description
                  </Typography>
                  <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedEvent.description}
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                startIcon={<DeleteIcon />}
                color="error"
                onClick={() => {
                  setOpenEventDialog(false)
                  setOpenDeleteDialog(true)
                }}
              >
                Delete
              </Button>
              <Button onClick={() => setOpenEventDialog(false)} color="primary">
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* New Event Dialog - Reverted to MUI v5/v6/v7 pickers */}
      <Dialog
        open={openNewEventDialog}
        onClose={() => setOpenNewEventDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" component="div">
              Add New Event
            </Typography>
            <IconButton onClick={() => setOpenNewEventDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid container spacing={2} sx={{ pt: 2 }}>
              <Grid item xs={12}>
                <TextField
                  autoFocus
                  margin="dense"
                  name="title"
                  label="Event Title"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={newEvent.title}
                  onChange={handleEventChange}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="dense" variant="outlined">
                  <InputLabel id="event-type-select-label">Event Type</InputLabel>
                  <Select
                    labelId="event-type-select-label"
                    name="eventType"
                    value={newEvent.eventType}
                    onChange={handleEventChange}
                    label="Event Type"
                  >
                    <MenuItem value="Default">Default</MenuItem>
                    <MenuItem value="Meeting">Meeting</MenuItem>
                    <MenuItem value="Assignment">Assignment</MenuItem>
                    <MenuItem value="Class Session">Class Session</MenuItem>
                    <MenuItem value="Personal">Personal</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="Start"
                  value={newEvent.start}
                  onChange={(date) => handleDateChange('start', date)}
                  disablePast
                  slotProps={{
                    textField: { fullWidth: true, variant: 'outlined', margin: 'dense' },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="End"
                  value={newEvent.end}
                  onChange={(date) => handleDateChange('end', date)}
                  disablePast
                  minDateTime={newEvent.allDay ? undefined : newEvent.start}
                  disabled={newEvent.allDay}
                  slotProps={{
                    textField: { fullWidth: true, variant: 'outlined', margin: 'dense' },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  name="location"
                  label="Location"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={newEvent.location}
                  onChange={handleEventChange}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  name="description"
                  label="Description"
                  multiline
                  rows={4}
                  fullWidth
                  variant="outlined"
                  value={newEvent.description}
                  onChange={handleEventChange}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewEventDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateEvent}
            variant="contained"
            color="primary"
            disabled={!newEvent.title}
          >
            Create Event
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete Event</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the event: <strong>{selectedEvent?.title}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteEvent} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Add Event Button */}
      <Tooltip title="Add New Event">
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => setOpenNewEventDialog(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
          }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default EnhancedCalendar
