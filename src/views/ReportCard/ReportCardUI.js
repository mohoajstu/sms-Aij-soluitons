import React, { useState } from 'react'
import { CNav, CNavItem, CNavLink, CTabContent, CTabPane } from '@coreui/react'
import { Autocomplete, TextField, Button, Paper, Typography, Divider } from '@mui/material'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import ReportCardPage from './ReportCardPage'
import classData from '../../Data/Classes.json'
import './ReportCardUI.css' // Import the CSS file
import { School, History, ArrowForward } from '@mui/icons-material'

const ReportCardUI = () => {
  const [activeTab, setActiveTab] = useState(0)
  const [selectedSemester, setSelectedSemester] = useState(null)
  const [selectedSection, setSelectedSection] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // Options for each field
  const semesterOptions = Object.keys(classData)
  const sectionOptions = selectedSemester ? Object.keys(classData[selectedSemester]) : []
  const studentOptions =
    selectedSemester && selectedSection ? classData[selectedSemester][selectedSection].students : []

  const handleGenerateReport = () => {
    if (!selectedStudent) return

    setIsLoading(true)

    // Simulate loading
    setTimeout(() => {
      setIsLoading(false)
    }, 1500)
  }

  const handleReset = () => {
    setSelectedSemester(null)
    setSelectedSection(null)
    setSelectedStudent(null)
  }

  const recentReports = [
    { id: 1, student: 'Ahmed Khan', semester: 'Fall 2023', date: 'Dec 15, 2023' },
    { id: 2, student: 'Sara Ahmed', semester: 'Fall 2023', date: 'Dec 14, 2023' },
    { id: 3, student: 'Mohammad Ali', semester: 'Fall 2023', date: 'Dec 13, 2023' },
  ]

  return (
    <div className="rc-container">
      {/* Header */}
      <div className="rc-header">
        <Typography variant="h4" className="rc-title">
          Student Report Cards
        </Typography>
        <Typography variant="body1" className="rc-subtitle">
          Generate and access student performance reports
        </Typography>
      </div>

      {/* Tab Navigation */}
      <Paper elevation={3} className="rc-tab-wrapper">
        <CNav variant="tabs" className="rc-tab-navigation">
          <CNavItem className="rc-nav-item">
            <CNavLink
              active={activeTab === 0}
              onClick={() => setActiveTab(0)}
              className={`rc-tab-link ${activeTab === 0 ? 'rc-active' : ''}`}
            >
              <School className="rc-tab-icon" />
              <span>Generate Report Card</span>
            </CNavLink>
          </CNavItem>
          <Divider orientation="vertical" flexItem className="rc-tab-divider" />
          <CNavItem className="rc-nav-item">
            <CNavLink
              active={activeTab === 1}
              onClick={() => setActiveTab(1)}
              className={`rc-tab-link ${activeTab === 1 ? 'rc-active' : ''}`}
            >
              <History className="rc-tab-icon" />
              <span>Report Card History</span>
            </CNavLink>
          </CNavItem>
        </CNav>
      </Paper>

      {/* Tab Content */}
      <CTabContent className="rc-tab-content">
        <CTabPane visible={activeTab === 0} className="rc-tab-pane">
          {!selectedStudent ? (
            <Paper elevation={3} className="rc-selection-form">
              <div className="rc-form-header">
                <Typography variant="h6" className="rc-form-title">
                  Select Student Information
                </Typography>
                <Typography variant="body2" className="rc-form-subtitle">
                  Choose the semester, section and student to generate a report card
                </Typography>
              </div>

              <Divider className="rc-form-divider" />

              <Box className="rc-form-content">
                <Grid container spacing={4}>
                  {/* Row 1: Semester Selector */}
                  <Grid item xs={12}>
                    <div className="rc-form-field">
                      <label className="rc-field-label">Semester</label>
                      <Autocomplete
                        disablePortal
                        options={semesterOptions}
                        value={selectedSemester}
                        onChange={(event, newValue) => {
                          setSelectedSemester(newValue)
                          setSelectedSection(null)
                          setSelectedStudent(null)
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Select a semester"
                            className="rc-autocomplete"
                          />
                        )}
                      />
                    </div>
                  </Grid>

                  {/* Row 2: Section Selector */}
                  <Grid item xs={12}>
                    <div className="rc-form-field">
                      <label className="rc-field-label">Section</label>
                      <Autocomplete
                        disablePortal
                        options={sectionOptions}
                        value={selectedSection}
                        onChange={(event, newValue) => {
                          setSelectedSection(newValue)
                          setSelectedStudent(null)
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Select a section"
                            className="rc-autocomplete"
                          />
                        )}
                        disabled={!selectedSemester}
                        className={!selectedSemester ? 'rc-disabled' : ''}
                      />
                    </div>
                  </Grid>

                  {/* Row 3: Student Selector */}
                  <Grid item xs={12}>
                    <div className="rc-form-field">
                      <label className="rc-field-label">Student</label>
                      <Autocomplete
                        disablePortal
                        options={studentOptions}
                        value={selectedStudent}
                        onChange={(event, newValue) => setSelectedStudent(newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Select a student"
                            className="rc-autocomplete"
                          />
                        )}
                        disabled={!selectedSection}
                        className={!selectedSection ? 'rc-disabled' : ''}
                      />
                    </div>
                  </Grid>
                </Grid>
              </Box>

              <div className="rc-form-actions">
                <Button
                  variant="outlined"
                  className="rc-btn-reset"
                  onClick={handleReset}
                  disabled={!selectedSemester && !selectedSection && !selectedStudent}
                >
                  Reset
                </Button>
                <Button
                  variant="contained"
                  className="rc-btn-generate"
                  onClick={handleGenerateReport}
                  disabled={!selectedStudent}
                  endIcon={<ArrowForward />}
                >
                  Generate Report
                </Button>
              </div>
            </Paper>
          ) : (
            <div className="rc-report-view">
              {isLoading ? (
                <div className="rc-loading">
                  <div className="rc-spinner"></div>
                  <Typography>Generating Report Card...</Typography>
                </div>
              ) : (
                <>
                  <div className="rc-report-header">
                    <Button variant="outlined" className="rc-btn-back" onClick={handleReset}>
                      Back to Selection
                    </Button>
                    <Button variant="contained" className="rc-btn-print">
                      Print Report
                    </Button>
                  </div>
                  <Paper elevation={3} className="rc-report-container">
                    <ReportCardPage pdfSource={null} />
                  </Paper>
                </>
              )}
            </div>
          )}
        </CTabPane>

        <CTabPane visible={activeTab === 1} className="rc-tab-pane">
          <Paper elevation={3} className="rc-history-container">
            <div className="rc-history-header">
              <Typography variant="h6" className="rc-history-title">
                Recently Generated Reports
              </Typography>
              <div className="rc-search-box">
                <TextField
                  placeholder="Search by student name..."
                  variant="outlined"
                  className="rc-search-field"
                  fullWidth
                />
              </div>
            </div>

            <Divider className="rc-history-divider" />

            {recentReports.length > 0 ? (
              <div className="rc-history-list">
                {recentReports.map((report) => (
                  <Paper key={report.id} elevation={1} className="rc-history-item">
                    <div className="rc-history-item-content">
                      <Typography variant="subtitle1" className="rc-student-name">
                        {report.student}
                      </Typography>
                      <div className="rc-history-meta">
                        <Typography variant="body2" className="rc-semester-info">
                          {report.semester}
                        </Typography>
                        <Typography variant="body2" className="rc-date-info">
                          Generated: {report.date}
                        </Typography>
                      </div>
                    </div>
                    <Button variant="outlined" className="rc-btn-view">
                      View Report
                    </Button>
                  </Paper>
                ))}
              </div>
            ) : (
              <div className="rc-empty-state">
                <div className="rc-empty-icon"></div>
                <Typography variant="h6">No Report Cards Found</Typography>
                <Typography variant="body2">
                  No previous report cards have been generated yet.
                </Typography>
              </div>
            )}
          </Paper>
        </CTabPane>
      </CTabContent>
    </div>
  )
}

export default ReportCardUI
