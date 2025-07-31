import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button } from '@mui/material'
import Grid from '@mui/material/Grid'
import ClassSelector from '../../components/ClassSelector'
import DateSelector from '../../components/DateSelector'
import AttendanceReportTable from './attendenceReportTable'
import ManualSmsNotification from './ManualSmsNotification'
import AttendanceReminderManager from './AttendanceReminderManager'
import './attendanceTabs.css'
import useAuth from '../../Firebase/useAuth'

const AttendanceTabs = () => {
  const [activeTab, setActiveTab] = useState(0) // Default to "Take Attendance"
  const navigate = useNavigate()
  const { role } = useAuth()
  const [selectedCourse, setSelectedCourse] = useState(null)

  useEffect(() => {
    if (role === 'parent') {
      setActiveTab(1) // Force attendance report tab for parents
    }
  }, [role])

  // Check if user has permission to access reminder manager
  const canAccessReminderManager = role === 'admin' || role === 'faculty'

  return (
    <div className="at-container">
      {/* Tab Navigation - Modified to show only relevant tabs based on role */}
      <div className="at-tab-wrapper">
        <div className="at-tab-navigation">
          {role !== 'parent' && (
            <>
              <div
                className={`at-tab-link ${activeTab === 0 ? 'at-active' : ''}`}
                onClick={() => setActiveTab(0)}
              >
                Take Attendance
              </div>
              <div className="at-tab-separator"></div>
            </>
          )}
          <div
            className={`at-tab-link ${activeTab === 1 ? 'at-active' : ''}`}
            onClick={() => setActiveTab(1)}
          >
            Attendance Report
          </div>

          {role !== 'parent' && (
            <>
              <div className="at-tab-separator"></div>
              <div
                className={`at-tab-link ${activeTab === 2 ? 'at-active' : ''}`}
                onClick={() => setActiveTab(2)}
              >
                Manual SMS
              </div>
            </>
          )}

          {canAccessReminderManager && (
            <>
              <div className="at-tab-separator"></div>
              <div
                className={`at-tab-link ${activeTab === 3 ? 'at-active' : ''}`}
                onClick={() => setActiveTab(3)}
              >
                Reminder Manager
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tab Content - Modified to show only relevant content based on role */}
      <div className="at-tab-content">
        {role !== 'parent' && activeTab === 0 && (
          <Box className="at-take-attendance-content">
            <Grid container direction="column" spacing={4}>
              <Grid container item direction="row" alignItems="center" spacing={2}>
                <Grid item size={2}>
                  <label className="at-field-label">Select a class:</label>
                </Grid>
                <Grid item size={4}>
                  <ClassSelector
                    fullWidth
                    value={selectedCourse}
                    onChange={(e, val) => setSelectedCourse(val)}
                  />
                </Grid>
              </Grid>
              <Grid container item direction="row" alignItems="center" spacing={2}>
                <Grid item size={2}>
                  <label className="at-field-label">Set Date:</label>
                </Grid>
                <Grid item size={4}>
                  <DateSelector fullWidth />
                </Grid>
              </Grid>
            </Grid>
            <Button
              variant="contained"
              className="at-action-button"
              onClick={() => navigate('./attendance-table-page', { state: { selectedCourse } })}
            >
              Take Attendance
            </Button>
          </Box>
        )}

        {activeTab === 1 && (
          <Box className="at-attendance-report-content">
            {/* The new report table component will be placed here */}
            <AttendanceReportTable />
          </Box>
        )}

        {role !== 'parent' && activeTab === 2 && (
          <Box className="at-sms-test-content">
            <div className="at-note-box">
              <strong>Send Manual SMS:</strong> Use this form to manually send SMS notifications.
              Enter your own message or select a parent from the dropdown to auto-fill their phone number.
            </div>
            <ManualSmsNotification />
          </Box>
        )}

        {canAccessReminderManager && activeTab === 3 && (
          <Box className="at-reminder-manager-content">
            <AttendanceReminderManager />
          </Box>
        )}
      </div>
    </div>
  )
}

export default AttendanceTabs
