import React, { useState } from 'react'
import {
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CButton,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
  CCol,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCalendar, cilClock, cilX, cilCheck } from '@coreui/icons'
import './WeekScheduleSelector.css'

const WeekScheduleSelector = ({ visible, onClose, schedule, onSave }) => {
  const [localSchedule, setLocalSchedule] = useState(schedule || {
    classDays: [],
    startTime: '08:00',
    endTime: '09:00',
    room: '',
    // New structure for flexible time slots
    daySchedules: {}
  })

  const daysOfWeek = [
    { key: 'Monday', short: 'M', full: 'Monday' },
    { key: 'Tuesday', short: 'T', full: 'Tuesday' },
    { key: 'Wednesday', short: 'W', full: 'Wednesday' },
    { key: 'Thursday', short: 'Th', full: 'Thursday' },
    { key: 'Friday', short: 'F', full: 'Friday' },
    { key: 'Saturday', short: 'S', full: 'Saturday' },
    { key: 'Sunday', short: 'Su', full: 'Sunday' },
  ]

  const timeSlots = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
  ]

  const handleDayToggle = (day) => {
    const updatedDays = localSchedule.classDays.includes(day)
      ? localSchedule.classDays.filter(d => d !== day)
      : [...localSchedule.classDays, day]

    // Initialize day schedule if it doesn't exist
    const updatedDaySchedules = { ...localSchedule.daySchedules }
    if (!updatedDaySchedules[day]) {
      updatedDaySchedules[day] = {
        startTime: '08:00',
        endTime: '09:00',
        room: localSchedule.room || ''
      }
    }

    setLocalSchedule({
      ...localSchedule,
      classDays: updatedDays,
      daySchedules: updatedDaySchedules
    })
  }

  const handleTimeChange = (day, type, value) => {
    const updatedDaySchedules = { ...localSchedule.daySchedules }
    if (!updatedDaySchedules[day]) {
      updatedDaySchedules[day] = {
        startTime: '08:00',
        endTime: '09:00',
        room: localSchedule.room || ''
      }
    }
    
    updatedDaySchedules[day][type] = value
    
    setLocalSchedule({
      ...localSchedule,
      daySchedules: updatedDaySchedules
    })
  }

  const handleRoomChange = (value) => {
    setLocalSchedule({
      ...localSchedule,
      room: value
    })
  }

  const handleSave = () => {
    // Convert the flexible schedule back to the expected format
    const convertedSchedule = {
      classDays: localSchedule.classDays,
      startTime: localSchedule.startTime,
      endTime: localSchedule.endTime,
      room: localSchedule.room,
      daySchedules: localSchedule.daySchedules
    }
    onSave(convertedSchedule)
  }

  const handleCancel = () => {
    onClose()
  }

  const isDaySelected = (day) => {
    return localSchedule.classDays.includes(day)
  }

  const getDayStyle = (day) => {
    if (isDaySelected(day)) {
      return {
        backgroundColor: '#0d6efd',
        color: 'white',
        border: '2px solid #0d6efd'
      }
    }
    return {
      backgroundColor: 'white',
      color: '#6c757d',
      border: '2px solid #dee2e6'
    }
  }

  const getDaySchedule = (day) => {
    return localSchedule.daySchedules[day] || {
      startTime: '08:00',
      endTime: '09:00',
      room: localSchedule.room || ''
    }
  }

  return (
    <CModal visible={visible} onClose={handleCancel} size="lg" backdrop="static" className="week-schedule-selector">
      <CModalHeader>
        <CIcon icon={cilCalendar} className="me-2" />
        Class Schedule
      </CModalHeader>
      <CModalBody>
        <div className="mb-4">
          <h6>Select Class Days</h6>
          <div className="d-flex gap-2 flex-wrap">
            {daysOfWeek.map((day) => (
              <CButton
                key={day.key}
                variant="outline"
                size="sm"
                style={getDayStyle(day.key)}
                onClick={() => handleDayToggle(day.key)}
                className={`position-relative day-button ${isDaySelected(day.key) ? 'selected' : ''}`}
              >
                {day.short}
                {isDaySelected(day.key) && (
                  <div className="check-icon">
                    <CIcon icon={cilCheck} size="sm" />
                  </div>
                )}
              </CButton>
            ))}
          </div>
        </div>

        {localSchedule.classDays.length > 0 && (
          <>
            <div className="mb-4">
              <h6>Class Times</h6>
              <div className="mb-3">
                <CFormLabel>Default Room</CFormLabel>
                <CFormInput
                  type="text"
                  placeholder="e.g., Room 101"
                  value={localSchedule.room}
                  onChange={(e) => handleRoomChange(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-4">
              <h6>Individual Day Schedules</h6>
              {localSchedule.classDays.map((day) => {
                const daySchedule = getDaySchedule(day)
                return (
                  <div key={day} className="mb-3 p-3 border rounded day-schedule-card">
                    <h6 className="mb-3">{day}</h6>
                    <CRow>
                      <CCol md={4}>
                        <CFormLabel>Start Time</CFormLabel>
                        <CFormSelect
                          value={daySchedule.startTime}
                          onChange={(e) => handleTimeChange(day, 'startTime', e.target.value)}
                        >
                          {timeSlots.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </CFormSelect>
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>End Time</CFormLabel>
                        <CFormSelect
                          value={daySchedule.endTime}
                          onChange={(e) => handleTimeChange(day, 'endTime', e.target.value)}
                        >
                          {timeSlots.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </CFormSelect>
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>Room (Optional)</CFormLabel>
                        <CFormInput
                          type="text"
                          placeholder="e.g., Room 101"
                          value={daySchedule.room}
                          onChange={(e) => handleTimeChange(day, 'room', e.target.value)}
                        />
                      </CCol>
                    </CRow>
                  </div>
                )
              })}
            </div>

            <div className="mb-4">
              <h6>Schedule Summary</h6>
              <div className="border rounded p-3 schedule-summary">
                {localSchedule.classDays.map((day) => {
                  const daySchedule = getDaySchedule(day)
                  return (
                    <div key={day} className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-bold">{day}</span>
                      <div>
                        <CBadge color="primary" className="me-2 time-badge">
                          {daySchedule.startTime} - {daySchedule.endTime}
                        </CBadge>
                        {daySchedule.room && (
                          <CBadge color="info" className="room-badge">
                            {daySchedule.room}
                          </CBadge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={handleCancel}>
          <CIcon icon={cilX} className="me-1" />
          Cancel
        </CButton>
        <CButton color="primary" onClick={handleSave}>
          <CIcon icon={cilCheck} className="me-1" />
          Save Schedule
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default WeekScheduleSelector 