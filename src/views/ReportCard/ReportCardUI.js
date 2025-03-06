import React, { useState } from 'react'
import { CNav, CNavItem, CNavLink, CTabContent, CTabPane } from '@coreui/react'
import { Autocomplete, TextField } from '@mui/material'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import ReportCardPage from './ReportCardPage'
import classData from '../../Data/Classes.json'
import './ReportCardUI.css' // Import the CSS file

const ReportCardUI = () => {
  const [activeTab, setActiveTab] = useState(0)
  const [selectedSemester, setSelectedSemester] = useState(null)
  const [selectedSection, setSelectedSection] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)

  // Options for each field
  const semesterOptions = Object.keys(classData)
  const sectionOptions = selectedSemester ? Object.keys(classData[selectedSemester]) : []
  const studentOptions =
    selectedSemester && selectedSection ? classData[selectedSemester][selectedSection].students : []

  return (
    <div
      className="report-card-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: 'none',
        width: '100%',
      }}
    >
      {/* Tab Navigation */}
      <CNav
        variant="tabs"
        className="tab-navigation"
        style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: 'none',
          width: '100%',
          justifyContent: 'center',
        }}
      >
        <CNavItem>
          <CNavLink
            active={activeTab === 0}
            onClick={() => setActiveTab(0)}
            className={`tab-item ${activeTab === 0 ? 'active' : ''}`}
            style={{
              fontSize: '16px',
              fontWeight: activeTab === 0 ? 'bold' : 'normal',
              color: '#000',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              border: 'none',
              padding: '10px 15px',
              minWidth: '150px',
              textAlign: 'center',
              // borderBottom: activeTab === 0 ? '2px solid #000' : 'none',
            }}
          >
            Generate Report Card
          </CNavLink>
        </CNavItem>
        {/* Separator */}
        <span
          className="tab-separator"
          style={{
            fontSize: '18px',
            color: '#000',
            padding: '0 15px',
            alignSelf: 'center',
          }}
        >
          |
        </span>
        <CNavItem>
          <CNavLink
            active={activeTab === 1}
            onClick={() => setActiveTab(1)}
            className={`tab-item ${activeTab === 1 ? 'active' : ''}`}
            style={{
              fontSize: '16px',
              fontWeight: activeTab === 1 ? 'bold' : 'normal',
              color: '#000',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              border: 'none',
              padding: '10px 15px',
              minWidth: '150px',
              textAlign: 'center',
              // borderBottom: activeTab === 1 ? '2px solid #000' : 'none',
            }}
          >
            Report Card History
          </CNavLink>
        </CNavItem>
      </CNav>
      {/* Tab Content */}
      <CTabContent className="tab-content" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <CTabPane visible={activeTab === 0} style={{ width: '100%' }}>
          {!selectedStudent ? (
            <Box marginTop="60px" sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <Grid container direction="column" spacing={4} sx={{ maxWidth: 600 }}>
                {/* Row 1: Semester Selector */}
                <Grid container item direction="row" alignItems="center" spacing={2}>
                  <Grid item xs={4}>
                    <label className="field-label">Select Semester:</label>
                  </Grid>
                  <Grid item xs={8}>
                    <Autocomplete
                      disablePortal
                      options={semesterOptions}
                      value={selectedSemester}
                      onChange={(event, newValue) => {
                        setSelectedSemester(newValue)
                        setSelectedSection(null)
                        setSelectedStudent(null)
                      }}
                      renderInput={(params) => <TextField {...params} label="Select Semester" />}
                    />
                  </Grid>
                </Grid>
                {/* Row 2: Section Selector */}
                <Grid container item direction="row" alignItems="center" spacing={2}>
                  <Grid item xs={4}>
                    <label className="field-label">Select Section:</label>
                  </Grid>
                  <Grid item xs={8}>
                    <Autocomplete
                      disablePortal
                      options={sectionOptions}
                      value={selectedSection}
                      onChange={(event, newValue) => {
                        setSelectedSection(newValue)
                        setSelectedStudent(null)
                      }}
                      renderInput={(params) => <TextField {...params} label="Select Section" />}
                      disabled={!selectedSemester}
                    />
                  </Grid>
                </Grid>
                {/* Row 3: Student Selector */}
                <Grid container item direction="row" alignItems="center" spacing={2}>
                  <Grid item xs={4}>
                    <label className="field-label">Select Student:</label>
                  </Grid>
                  <Grid item xs={8}>
                    <Autocomplete
                      disablePortal
                      options={studentOptions}
                      value={selectedStudent}
                      onChange={(event, newValue) => setSelectedStudent(newValue)}
                      renderInput={(params) => <TextField {...params} label="Select Student" />}
                      disabled={!selectedSection}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <ReportCardPage pdfSource={null} />
          )}
        </CTabPane>
        <CTabPane visible={activeTab === 1}>
          <Box marginTop="60px" sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Grid container direction="column" spacing={2} sx={{ maxWidth: 600 }}>
              <Grid container item>
                <Grid item xs={12}>
                  <h3>Report Card History</h3>
                </Grid>
              </Grid>
              <Grid container item>
                <Grid item xs={12}>
                  <p>No previous report cards found.</p>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </CTabPane>
      </CTabContent>
    </div>
  )
}

export default ReportCardUI