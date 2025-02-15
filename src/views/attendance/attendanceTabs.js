// import React from 'react'
// import { CTab, CTabContent, CTabList, CTabPanel, CTabs } from '@coreui/react'
import { CNav, CNavItem, CNavLink, CTabContent, CTabPane } from '@coreui/react'
import { DocsComponents, DocsExample } from 'src/components'
import { Autocomplete, TextField } from '@mui/material'
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import ClassSelector from '../../components/classSelector';
import DateSelector from '../../components/DateSelector';
import Grid from '@mui/material/Grid2';
import Box from '@mui/material/Box'
import { CButton } from '@coreui/react';
import { useNavigate } from "react-router-dom";


import React, { useState } from 'react'
import Select from 'react-select'

const attendanceTabs = () => {
  const [activeTab, setActiveTab] = useState(1) // Default: "Attendance Report"
  const [selectedDate, setSelectedDate] = useState(null);
  const navigate = useNavigate(); // Hook to navigate between pages
  const [reportParams, setReportParams] = useState({
    semester: "",
    section: "",
    students: [],
    startDate: new Date(),
    endDate: new Date(),
  });

  const classes = [
    { code: '1', label: 'Math' },
    { code: '2', label: 'Science' },
    { code: '3', label: 'English' },
  ]

  const dummyData = [
    { code: '1', label: 'Data 1' },
    { code: '2', label: 'Data 2' },
    { code: '3', label: 'Data 3' },
  ]

  const handleChange = (key, value) => {
    setReportParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: 'none',
      }}
    >
      {/* Tab Navigation */}
      <CNav
        variant="tabs"
        className="border-bottom-0"
        style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: 'none',
        }}
      >
        <CNavItem>
          <CNavLink
            active={activeTab === 0}
            onClick={() => setActiveTab(0)}
            style={{
              fontSize: '16px',
              fontWeight: activeTab === 0 ? 'bold' : 'normal',
              color: '#000',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              border: 'none',
              padding: '10px 15px',
              minWidth: '150px', // Fixed width to prevent shifting
              textAlign: 'center', // Center the text
              borderBottom: activeTab === 0 ? '2px solid #000' : 'none', // Underline if active
            }}
          >
            Take Attendance
          </CNavLink>
        </CNavItem>

        {/* Separator */}
        <span
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
            style={{
              fontSize: '16px',
              fontWeight: activeTab === 1 ? 'bold' : 'normal',
              color: '#000',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              border: 'none',
              padding: '10px 15px',
              minWidth: '150px', // Fixed width to prevent shifting
              textAlign: 'center', // Center the text
              borderBottom: activeTab === 1 ? '2px solid #000' : 'none', // Underline if active
            }}
          >
            Attendance Report
          </CNavLink>
        </CNavItem>
      </CNav>
      {/* Tab Content */}
      <CTabContent style={{display: "flex", flexDirection: "column", width: "100%"}}>
      <CTabPane visible={activeTab === 0} style={{width: '100%'}}>
        {activeTab === 0 && (
          <Box marginTop={'60px'}>
          <Grid container direction="column" spacing={4}>
            {/* Row 1: Class Selector */}
            <Grid container item direction="row" alignItems="center" spacing={2}>
              <Grid item size={2}>
                <label style={{ fontWeight: "bold" }}>Select a class:</label>
              </Grid>
              <Grid item size={4}>
                <ClassSelector fullWidth />
              </Grid>
            </Grid>
        
            {/* Row 2: Date Selector */}
            <Grid container item direction="row" alignItems="center" spacing={2}>
              <Grid item size={2}>
                <label style={{ fontWeight: "bold" }}>Set Date:</label>
              </Grid>
              <Grid item size={4}>
                <DateSelector fullWidth />
              </Grid>
            </Grid>
          </Grid>
        
          {/* Button */}
          <CButton color="dark" style={{ marginTop: "20px", borderRadius: "30px" }} onClick={() => navigate('./attendance-table-page')} >Take Attendance</CButton>
        </Box>
        
        )}
      </CTabPane>
        <CTabPane visible={activeTab === 1}>
        <Box marginTop={'60px'}>
          <Grid container direction={'column'} spacing={2}>
          <Grid container item direction="row" alignItems="center" spacing={2}>
            <Grid item size={1.5}>
              <label style={{ fontWeight: "bold" }}>Select Semester:</label>
            </Grid>
            <Grid item size={3}>
            <Autocomplete
              disablePortal
              options={dummyData}
              sx={{ width: 300 }}
              renderInput={(params) => <TextField {...params} label="Select Semester" />}
            />
            </Grid>
            <Grid item size={7.5}/>

          </Grid>
          <Grid container item direction="row" alignItems="center" spacing={2}>
            <Grid item size={1.5}>
              <label style={{ fontWeight: "bold" }}>Select Section:</label>
            </Grid>
            <Grid item size={3}>
            <Autocomplete
              disablePortal
              options={dummyData}
              sx={{ width: 300 }}
              renderInput={(params) => <TextField {...params} label="Select Section" />}
            />
            </Grid>
            <Grid item size={7.5}/>

          </Grid>
          <Grid container item direction="row" alignItems="center" spacing={2}>
            <Grid item size={1.5}>
              <label style={{ fontWeight: "bold" }}>Select Student:</label>
            </Grid>
            <Grid item size={3}>
            <Autocomplete
              disablePortal
              options={dummyData}
              sx={{ width: 300 }}
              renderInput={(params) => <TextField {...params} label="Select Student" />}
            />
            </Grid>
            <Grid item size={7.5}/>

          </Grid>
          <Grid container item direction="row" alignItems="center" spacing={2}>
            <Grid item size={1.5}>
              <label style={{ fontWeight: "bold" }}>Set Dates:</label>
            </Grid>
            <Grid item size={3}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        label="From"
                        value={selectedDate}
                        onChange={(newValue) => setSelectedDate(newValue)}
                        renderInput={(params) => (
                          <TextField {...params} className="datepicker-input" fullWidth />
                        )}
                      />
                    </LocalizationProvider>
            </Grid>
            <Grid item size={7.5}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        label="To"
                        value={selectedDate}
                        onChange={(newValue) => setSelectedDate(newValue)}
                        renderInput={(params) => (
                          <TextField {...params} className="datepicker-input" fullWidth />
                        )}
                      />
                    </LocalizationProvider>
            </Grid>

          </Grid>
          </Grid>
          <CButton color="dark" style={{ marginTop: "20px", borderRadius: "30px" }} onClick={() => navigate('')} >View Report</CButton>
          
        
        </Box>
        </CTabPane>
      </CTabContent>
    </div>
  )
}

export default attendanceTabs
