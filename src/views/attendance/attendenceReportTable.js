import React from 'react'
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
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import './attendanceReportTable.css'

const AttendanceReportTable = ({ attendanceData, reportParams }) => {
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
    </Box>
  )
}

export default AttendanceReportTable
