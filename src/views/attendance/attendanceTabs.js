import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { Autocomplete, TextField, Box, Button } from '@mui/material';
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Grid from '@mui/material/Grid2';
import ClassSelector from '../../components/classSelector';
import DateSelector from '../../components/DateSelector';
import AttendanceReportTable from './attendenceReportTable';
import ManualSmsNotification from './ManualSmsNotification';
import attendanceData from './tempData';
import dayjs from 'dayjs';
import './attendanceTabs.css';

const AttendanceTabs = () => {
  const [activeTab, setActiveTab] = useState(2); // Default to "SMS Notifications" tab
  const navigate = useNavigate();
  const [reportParams, setReportParams] = useState({
    semester: "",
    section: "",
    students: [],
    startDate: dayjs(),
    endDate: dayjs(),
  });

  // Reset state when the component mounts or navigates back
  useEffect(() => {
    setReportParams({
      semester: "",
      section: "",
      students: [],
      startDate: dayjs(),
      endDate: dayjs(),
    });
    setFilteredData(attendanceData);
  }, []);

  const [filteredData, setFilteredData] = useState(attendanceData);

  const semesters = [...new Set(attendanceData.map((row) => row.semester))];
  const sections = [...new Set(attendanceData.map((row) => row.section))];
  const students = [...new Set(attendanceData.map((row) => row.student))];

  const handleChange = (key, value) => {
    setReportParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleStudentChange = (event, newValue) => {
    setReportParams((prev) => ({ ...prev, students: newValue || [] }));
  };

  const handleViewReport = () => {
    const filtered = attendanceData.filter((entry) => {
      return (
        (!reportParams.semester || entry.semester === reportParams.semester) &&
        (!reportParams.section || entry.section === reportParams.section) &&
        (!reportParams.students.length || reportParams.students === entry.student) &&
        (!reportParams.startDate || new Date(entry.date) >= new Date(reportParams.startDate)) &&
        (!reportParams.endDate || new Date(entry.date) <= new Date(reportParams.endDate))
      );
    });
    setFilteredData(filtered);
  };

  return (
    <div className="at-container">
      {/* Tab Navigation */}
      <div className="at-tab-wrapper">
        <div className="at-tab-navigation">
          <div 
            className={`at-tab-link ${activeTab === 2 ? 'at-active' : ''}`}
            onClick={() => setActiveTab(2)}
          >
            SMS Test
          </div>
          <div className="at-tab-separator"></div>
          <div 
            className={`at-tab-link ${activeTab === 0 ? 'at-active' : ''}`}
            onClick={() => setActiveTab(0)}
          >
            Take Attendance
          </div>
          <div className="at-tab-separator"></div>
          <div 
            className={`at-tab-link ${activeTab === 1 ? 'at-active' : ''}`}
            onClick={() => setActiveTab(1)}
          >
            Attendance Report
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="at-tab-content">
        {/* SMS Notifications Tab */}
        {activeTab === 2 && (
          <Box className="at-sms-notifications-content">
            <div className="at-note-box">
              <strong>Direct SMS Test:</strong> This tab allows you to send test SMS messages directly to your phone using our HTTP API. 
              No database interactions are required, so you can test the messaging functionality without Firestore permissions.
            </div>
            <ManualSmsNotification />
          </Box>
        )}
        
        {/* Take Attendance Tab */}
        {activeTab === 0 && (
          <Box className="at-take-attendance-content">
            <Grid container direction="column" spacing={4}>
              <Grid container item direction="row" alignItems="center" spacing={2}>
                <Grid item size={2}>
                  <label className="at-field-label">Select a class:</label>
                </Grid>
                <Grid item size={4}>
                  <ClassSelector fullWidth />
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
              onClick={() => navigate('./attendance-table-page')}
            >
              Take Attendance
            </Button>
          </Box>
        )}

        {/* Attendance Report Tab */}
        {activeTab === 1 && (
          <Box className="at-attendance-report-content">
            <Grid container direction="column" spacing={3}>
              <Grid container item direction="row" alignItems="center" spacing={2}>
                <Grid item size={1.5}>
                  <label className="at-field-label">Select Semester:</label>
                </Grid>
                <Grid item size={3}>
                  <Autocomplete
                    disablePortal
                    options={semesters}
                    onChange={(event, newValue) => handleChange("semester", newValue)}
                    className="at-autocomplete-field"
                    renderInput={(params) => <TextField {...params} label="Select Semester" />}
                  />
                </Grid>
              </Grid>
              <Grid container item direction="row" alignItems="center" spacing={2}>
                <Grid item size={1.5}>
                  <label className="at-field-label">Select Section:</label>
                </Grid>
                <Grid item size={3}>
                  <Autocomplete
                    disablePortal
                    options={sections}
                    onChange={(event, newValue) => handleChange("section", newValue)}
                    className="at-autocomplete-field"
                    renderInput={(params) => <TextField {...params} label="Select Section" />}
                  />
                </Grid>
              </Grid>
              <Grid container item direction="row" alignItems="center" spacing={2}>
                <Grid item size={1.5}>
                  <label className="at-field-label">Select Student:</label>
                </Grid>
                <Grid item size={3}>
                  <Autocomplete
                    disablePortal
                    options={students}
                    onChange={handleStudentChange}
                    className="at-autocomplete-field"
                    renderInput={(params) => <TextField {...params} label="Select Student" />}
                  />
                </Grid>
              </Grid>
              <Grid container item direction="row" alignItems="center" spacing={3}>
                <Grid item size={1.5}>
                  <label className="at-field-label">Set Dates:</label>
                </Grid>
                <Grid item size={3.5}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="From"
                      value={reportParams.startDate}
                      onChange={(newValue) => handleChange("startDate", newValue)}
                      className="at-date-picker"
                      renderInput={(params) => (
                        <TextField {...params} className="at-datepicker-input" fullWidth />
                      )}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item size={3.5}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="To"
                      value={reportParams.endDate}
                      onChange={(newValue) => handleChange("endDate", newValue)}
                      className="at-date-picker"
                      renderInput={(params) => (
                        <TextField {...params} className="at-datepicker-input" fullWidth />
                      )}
                    />
                  </LocalizationProvider>
                </Grid>
              </Grid>
            </Grid>
            <Button 
              variant="contained"
              className="at-action-button"
              onClick={handleViewReport}
            >
              View Report
            </Button>
            <AttendanceReportTable 
              attendanceData={filteredData} 
              reportParams={reportParams}
            />
          </Box>
        )}
      </div>
    </div>
  );
};

export default AttendanceTabs;