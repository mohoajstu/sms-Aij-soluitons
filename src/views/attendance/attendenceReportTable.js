import React, { useState } from 'react'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import GoogleIcon from '@mui/icons-material/Google'
import {
  exportAttendanceToSheets,
  initializeSheetsApi,
  isSheetsAuthenticated,
} from '../../services/googleSheetsService'
import './attendanceReportTable.css'

const AttendanceReportTable = ({ attendanceData, reportParams }) => {
  const [isExporting, setIsExporting] = useState(false)
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  const exportToExcel = () => {
    // Placeholder for Excel export functionality
    console.log('Exporting to Excel...')
    alert('Excel export feature will be implemented with actual library')
  }

  const exportToPDF = () => {
    // Placeholder for PDF export functionality
    console.log('Exporting to PDF...')
    alert('PDF export feature will be implemented with actual library')
  }

  const exportToSheets = async () => {
    setIsExporting(true)

    try {
      // Initialize Google Sheets API if not already done
      await initializeSheetsApi()

      // Check if user is authenticated
      if (!isSheetsAuthenticated()) {
        setNotification({
          open: true,
          message: 'Please sign in with Google to export to Google Sheets',
          severity: 'warning',
        })
        setIsExporting(false)
        return
      }

      // Export data to Google Sheets
      const result = await exportAttendanceToSheets(attendanceData, reportParams)

      // Show success notification with link to spreadsheet
      setNotification({
        open: true,
        message: `Successfully exported to Google Sheets! Opening in new tab...`,
        severity: 'success',
      })

      // Open the spreadsheet in a new tab
      window.open(result.spreadsheetUrl, '_blank')
    } catch (error) {
      console.error('Error exporting to Google Sheets:', error)
      const errorMessage =
        error.message || 'An unexpected error occurred. Please try again or check the console.'
      setNotification({
        open: true,
        message: `Failed to export to Google Sheets: ${errorMessage}`,
        severity: 'error',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false })
  }

  const getStatusChip = (status) => {
    switch (status) {
      case 'Present':
        return <Chip label="Present" className="status-chip present" />
      case 'Late':
        return <Chip label="Late" className="status-chip late" />
      case 'Absent':
        return <Chip label="Absent" className="status-chip absent" />
      default:
        return <Chip label={status} className="status-chip" />
    }
  }

  const noDataDisplay = (
    <Box className="no-data-container">
      <Typography variant="body1" className="no-data-text">
        No attendance records match your search criteria.
      </Typography>
      <Typography variant="body2" color="textSecondary">
        Try adjusting your filters or selecting different dates.
      </Typography>
    </Box>
  )

  return (
    <Box className="report-table-container">
      {attendanceData.length > 0 ? (
        <>
          <Box className="report-header">
            <Typography variant="h6" className="report-title">
              Attendance Report
              {reportParams.semester && (
                <span className="report-subtitle"> - {reportParams.semester}</span>
              )}
            </Typography>
            <Box className="export-buttons">
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                className="export-button excel-button"
                onClick={exportToExcel}
              >
                Export Excel
              </Button>
              <Button
                variant="outlined"
                startIcon={<PictureAsPdfIcon />}
                className="export-button pdf-button"
                onClick={exportToPDF}
              >
                Export PDF
              </Button>
              <Button
                variant="outlined"
                startIcon={isExporting ? <CircularProgress size={16} /> : <GoogleIcon />}
                className="export-button sheets-button"
                onClick={exportToSheets}
                disabled={isExporting}
                sx={{
                  color: '#1a73e8',
                  borderColor: '#1a73e8',
                  '&:hover': {
                    backgroundColor: '#e8f0fe',
                    borderColor: '#1a73e8',
                  },
                }}
              >
                {isExporting ? 'Exporting...' : 'Export to Sheets'}
              </Button>
            </Box>
          </Box>

          <TableContainer component={Paper} className="table-container">
            <Table className="report-table">
              <TableHead>
                <TableRow>
                  <TableCell className="table-header">DATE</TableCell>
                  <TableCell className="table-header">CLASS</TableCell>
                  <TableCell className="table-header">STUDENT</TableCell>
                  <TableCell className="table-header">STATUS</TableCell>
                  <TableCell className="table-header">NOTE</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendanceData.map((row, index) => (
                  <TableRow key={index} className={`status-row ${row.status.toLowerCase()}`}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.class}</TableCell>
                    <TableCell>{row.student}</TableCell>
                    <TableCell>{getStatusChip(row.status)}</TableCell>
                    <TableCell>
                      {row.note ? row.note : <span className="no-note">-</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box className="report-footer">
            <Typography variant="body2" className="record-count">
              Showing {attendanceData.length} record{attendanceData.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </>
      ) : (
        noDataDisplay
      )}

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default AttendanceReportTable
