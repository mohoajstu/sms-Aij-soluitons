import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CButton,
  CRow,
  CCol,
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCalendar, cilX } from '@coreui/icons'

const CalendarPicker = ({ 
  excludedDates = [], 
  onDateToggle, 
  disabled = false,
  visible = false,
  onClose 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  // Helper function to format date as YYYY-MM-DD without timezone issues
  const formatDateString = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Generate calendar data for the current month
  const generateCalendarDays = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    
    // Get first day of month and last day of month
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // Get the day of week for first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay()
    
    // Adjust to start week on Monday (1 = Monday, 0 = Sunday)
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
    
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateObj = new Date(year, month, day)
      const dateString = formatDateString(dateObj)
      days.push({
        day,
        date: dateObj,
        dateString,
        isExcluded: excludedDates.includes(dateString),
        isToday: formatDateString(new Date()) === dateString,
        isPast: dateObj < new Date(new Date().setHours(0, 0, 0, 0))
      })
    }
    
    return days
  }

  const calendarDays = generateCalendarDays(selectedMonth)
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const handleDateClick = (dayData) => {
    if (!dayData || disabled) return
    
    onDateToggle(dayData.dateString)
  }

  const goToPreviousMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setSelectedMonth(new Date())
  }

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  return (
    <CModal visible={visible} onClose={onClose} size="lg">
      <CModalHeader>
        <div className="d-flex align-items-center">
          <CIcon icon={cilCalendar} className="me-2" />
          <h5 className="mb-0">Select Excluded Dates</h5>
        </div>
      </CModalHeader>
      <CModalBody>
        <div className="calendar-container">
          {/* Calendar Header */}
          <div className="calendar-header d-flex justify-content-between align-items-center mb-3">
            <CButton 
              color="outline-secondary" 
              size="sm" 
              onClick={goToPreviousMonth}
              disabled={disabled}
            >
              ‹
            </CButton>
            <div className="d-flex align-items-center gap-2">
              <h6 className="mb-0">{formatMonthYear(selectedMonth)}</h6>
              <CButton 
                color="outline-primary" 
                size="sm" 
                onClick={goToToday}
                disabled={disabled}
              >
                Today
              </CButton>
            </div>
            <CButton 
              color="outline-secondary" 
              size="sm" 
              onClick={goToNextMonth}
              disabled={disabled}
            >
              ›
            </CButton>
          </div>

          {/* Week Days Header */}
          <div className="calendar-weekdays mb-2">
            <CRow>
              {weekDays.map((day, index) => (
                <CCol key={index} className="text-center">
                  <div className="weekday-header">
                    {day}
                  </div>
                </CCol>
              ))}
            </CRow>
          </div>

          {/* Calendar Grid */}
          <div className="calendar-grid">
            {Array.from({ length: Math.ceil(calendarDays.length / 7) }, (_, weekIndex) => (
              <CRow key={weekIndex} className="calendar-week">
                {Array.from({ length: 7 }, (_, dayIndex) => {
                  const dayData = calendarDays[weekIndex * 7 + dayIndex]
                  
                  return (
                    <CCol key={dayIndex} className="calendar-day-col">
                      {dayData ? (
                        <div
                          className={`calendar-day ${
                            dayData.isExcluded ? 'excluded' : ''
                          } ${dayData.isToday ? 'today' : ''} ${
                            dayData.isPast ? 'past' : ''
                          }`}
                          onClick={() => handleDateClick(dayData)}
                          style={{ cursor: disabled ? 'default' : 'pointer' }}
                        >
                          {dayData.day}
                          {dayData.isExcluded && (
                            <div className="excluded-indicator">✕</div>
                          )}
                        </div>
                      ) : (
                        <div className="calendar-day empty"></div>
                      )}
                    </CCol>
                  )
                })}
              </CRow>
            ))}
          </div>

          {/* Legend */}
          <div className="calendar-legend mt-3">
            <div className="d-flex flex-wrap gap-3">
              <div className="d-flex align-items-center">
                <div className="legend-item normal"></div>
                <small>Normal Day</small>
              </div>
              <div className="d-flex align-items-center">
                <div className="legend-item excluded"></div>
                <small>Excluded (No SMS)</small>
              </div>
              <div className="d-flex align-items-center">
                <div className="legend-item today"></div>
                <small>Today</small>
              </div>
            </div>
          </div>
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default CalendarPicker
