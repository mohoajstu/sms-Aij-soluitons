import React, { useState, useMemo, useEffect } from 'react'
import {
  Box,
  Button,
  Typography,
  Modal,
  Chip,
  IconButton,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import FilterListIcon from '@mui/icons-material/FilterList'
import ClearIcon from '@mui/icons-material/Clear'
import GoogleIcon from '@mui/icons-material/Google'
import { DataGrid } from '@mui/x-data-grid'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import dayjs from 'dayjs'
import { collection, getDocs, query, where, documentId } from 'firebase/firestore'
import { firestore } from '../../Firebase/firebase'
import {
  exportAttendanceToSheets,
  initializeSheetsApi,
  isSheetsAuthenticated,
} from '../../services/googleSheetsService'
import './attendanceReportTable.css'

const getStatusClass = (status) => {
  switch (status) {
    case 'Present':
      return 'status-chip present'
    case 'Late':
      return 'status-chip late'
    case 'Absent':
      return 'status-chip absent'
    case 'Excused':
      return 'status-chip excused'
    default:
      return 'status-chip'
  }
}

const defaultFilters = {
  startDate: null,
  endDate: null,
  class: null,
  student: null,
  status: null,
}

const AttendanceReportTable = () => {
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [filters, setFilters] = useState(defaultFilters)
  const [pendingFilters, setPendingFilters] = useState(defaultFilters)
  const [displayRows, setDisplayRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // State for Google Sheets Export
  const [isExporting, setIsExporting] = useState(false)
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  // State for filter dropdowns
  const [classOptions, setClassOptions] = useState([])
  const [studentOptions, setStudentOptions] = useState([])
  const statusOptions = useMemo(() => ['Present', 'Absent', 'Late', 'Excused'], [])

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        // Fetch classes from attendance records
        const attendanceCol = collection(firestore, 'attendance')
        const attendanceSnapshot = await getDocs(attendanceCol)
        const coursesMap = new Map()

        attendanceSnapshot.forEach((doc) => {
          const dailyData = doc.data()
          dailyData.courses?.forEach((course) => {
            if (!coursesMap.has(course.courseId)) {
              coursesMap.set(course.courseId, {
                id: course.courseId,
                label: course.courseTitle,
              })
            }
          })
        })
        setClassOptions(Array.from(coursesMap.values()))

        // Fetch students
        const studentsCol = collection(firestore, 'students')
        const studentSnapshot = await getDocs(studentsCol)
        const students = studentSnapshot.docs.map((doc) => {
          const data = doc.data()
          const name = data.personalInfo
            ? `${data.personalInfo.firstName} ${data.personalInfo.lastName}`.trim()
            : data.name
          return { id: doc.id, label: name }
        })
        setStudentOptions(students)
      } catch (error) {
        console.error('Error fetching filter options:', error)
      }
    }
    fetchOptions()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const hasFilters = Object.values(filters).some((v) => v !== null)

      if (!hasFilters) {
        setDisplayRows([])
        setSearched(false)
        return
      }

      setLoading(true)
      setSearched(true)

      try {
        let q = query(collection(firestore, 'attendance'))

        if (filters.startDate) {
          q = query(q, where(documentId(), '>=', dayjs(filters.startDate).format('YYYY-MM-DD')))
        }
        if (filters.endDate) {
          q = query(q, where(documentId(), '<=', dayjs(filters.endDate).format('YYYY-MM-DD')))
        }

        const querySnapshot = await getDocs(q)
        let allRecords = []
        let idCounter = 0

        querySnapshot.forEach((doc) => {
          const dailyData = doc.data()
          const date = dailyData.date
          dailyData.courses?.forEach((course) => {
            course.students?.forEach((student) => {
              allRecords.push({
                id: idCounter++,
                date: date,
                class: course.courseTitle,
                classId: course.courseId,
                student: student.studentName,
                studentId: student.studentId,
                status: student.status,
                note: student.note,
              })
            })
          })
        })

        const filteredRecords = allRecords.filter((row) => {
          if (filters.class && row.classId !== filters.class.id) return false
          if (filters.student && row.studentId !== filters.student.id) return false
          if (filters.status && row.status !== filters.status) return false
          return true
        })

        setDisplayRows(filteredRecords)
      } catch (error) {
        console.error('Error fetching attendance data: ', error)
        setDisplayRows([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [filters])

  // DataGrid columns
  const columns = [
    {
      field: 'date',
      headerName: 'DATE',
      flex: 1,
      minWidth: 120,
      type: 'string',
      renderCell: (params) => (params.value ? dayjs(params.value).format('YYYY-MM-DD') : ''),
      filterable: false, // handled externally
    },
    { field: 'class', headerName: 'CLASS', flex: 1, minWidth: 120, filterable: false },
    { field: 'student', headerName: 'STUDENT', flex: 1, minWidth: 140, filterable: false },
    {
      field: 'status',
      headerName: 'STATUS',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => <span className={getStatusClass(params.value)}>{params.value}</span>,
      filterable: false,
      sortable: true,
    },
    {
      field: 'note',
      headerName: 'NOTE',
      flex: 2,
      minWidth: 180,
      renderCell: (params) =>
        params.value ? <span>{params.value}</span> : <span className="no-note">-</span>,
      filterable: false,
    },
  ]

  const handleApplyFiltersFromModal = () => {
    setFilters(pendingFilters)
    setFilterModalOpen(false)
  }

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
      await initializeSheetsApi()

      if (!isSheetsAuthenticated()) {
        setNotification({
          open: true,
          message: 'Please sign in with Google to export to Google Sheets',
          severity: 'warning',
        })
        setIsExporting(false)
        return
      }

      const result = await exportAttendanceToSheets(displayRows)

      setNotification({
        open: true,
        message: `Successfully exported to Google Sheets! Opening in new tab...`,
        severity: 'success',
      })

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

  const noDataDisplay = (
    <Box className="no-data-container">
      <Typography variant="body1" className="no-data-text">
        {searched
          ? 'No attendance records match your search criteria.'
          : 'Please apply filters to see the report.'}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {searched
          ? 'Try adjusting your filters or selecting different dates.'
          : 'Start by clicking the "Filters" button.'}
      </Typography>
    </Box>
  )

  // When opening modal, copy filters to pendingFilters
  const openFilterModal = () => {
    setPendingFilters(filters)
    setFilterModalOpen(true)
  }

  // Filter modal content
  const filterModal = (
    <Modal open={filterModalOpen} onClose={() => setFilterModalOpen(false)}>
      <Box
        className="filter-modal-content"
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 3,
        }}
      >
        <Typography variant="h6" mb={2} sx={{ gridColumn: '1 / span 2' }}>
          Filter Attendance
        </Typography>
        {/* Dates and Class Column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="From"
              value={pendingFilters.startDate}
              onChange={(newValue) => setPendingFilters((f) => ({ ...f, startDate: newValue }))}
              slotProps={{ textField: { fullWidth: true, variant: 'outlined' } }}
              disableFuture
              format="YYYY-MM-DD"
            />
          </LocalizationProvider>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="To"
              value={pendingFilters.endDate}
              onChange={(newValue) => setPendingFilters((f) => ({ ...f, endDate: newValue }))}
              slotProps={{ textField: { fullWidth: true, variant: 'outlined' } }}
              disableFuture
              format="YYYY-MM-DD"
            />
          </LocalizationProvider>
          <Autocomplete
            options={classOptions}
            getOptionLabel={(option) => option.label || ''}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={pendingFilters.class}
            onChange={(_, value) => setPendingFilters((f) => ({ ...f, class: value }))}
            renderInput={(params) => (
              <TextField {...params} label="Class" variant="outlined" fullWidth />
            )}
            clearOnEscape
            autoHighlight
            freeSolo={false}
          />
        </Box>
        {/* Student and Status Column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: '29px' }}>
          <Autocomplete
            options={studentOptions}
            getOptionLabel={(option) => option.label || ''}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={pendingFilters.student}
            onChange={(_, value) => setPendingFilters((f) => ({ ...f, student: value }))}
            renderInput={(params) => (
              <TextField {...params} label="Student" variant="outlined" fullWidth />
            )}
            clearOnEscape
            autoHighlight
            freeSolo={false}
          />
          <Autocomplete
            options={statusOptions}
            value={pendingFilters.status}
            onChange={(_, value) => setPendingFilters((f) => ({ ...f, status: value }))}
            renderInput={(params) => <TextField {...params} label="Status" variant="outlined" fullWidth />}
            clearOnEscape
            autoHighlight
            freeSolo={false}
          />
        </Box>
        <Box
          sx={{
            gridColumn: '1 / span 2',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
            mt: 3,
          }}
        >
          <Button onClick={() => setPendingFilters(defaultFilters)} sx={{ color: '#c62828' }}>
            Clear
          </Button>
          <Button variant="contained" onClick={handleApplyFiltersFromModal}>
            Apply
          </Button>
        </Box>
      </Box>
    </Modal>
  )

  // Show active filters as chips
  const activeFilterChips = (
    <Stack direction="row" spacing={1} mb={2}>
      {filters.startDate && (
        <Chip
          label={`From: ${dayjs(filters.startDate).format('YYYY-MM-DD')}`}
          onDelete={() => setFilters((f) => ({ ...f, startDate: null }))}
        />
      )}
      {filters.endDate && (
        <Chip
          label={`To: ${dayjs(filters.endDate).format('YYYY-MM-DD')}`}
          onDelete={() => setFilters((f) => ({ ...f, endDate: null }))}
        />
      )}
      {filters.class && (
        <Chip
          label={`Class: ${filters.class.label}`}
          onDelete={() => setFilters((f) => ({ ...f, class: null }))}
        />
      )}
      {filters.student && (
        <Chip
          label={`Student: ${filters.student.label}`}
          onDelete={() => setFilters((f) => ({ ...f, student: null }))}
        />
      )}
      {filters.status && (
        <Chip
          label={`Status: ${filters.status}`}
          onDelete={() => setFilters((f) => ({ ...f, status: null }))}
        />
      )}
      {(filters.startDate ||
        filters.endDate ||
        filters.class ||
        filters.student ||
        filters.status) && (
        <IconButton
          size="small"
          onClick={() => {
            setFilters(defaultFilters)
          }}
          title="Clear all filters"
        >
          <ClearIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>
  )

  return (
    <Box className="report-table-container">
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
      {filterModal}
      <Box
        className="report-header"
        sx={{ mb: 2, flexDirection: 'column', alignItems: 'stretch', gap: 2 }}
      >
        <Typography variant="h5" className="report-title" sx={{ fontWeight: 700 }}>
          Attendance Report
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mt: 1,
            gap: 2,
          }}
        >
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            className="export-button"
            onClick={openFilterModal}
            sx={{ '&:hover': { backgroundColor: 'rgba(33,38,49,0.08)' } }}
          >
            Filters
          </Button>
          <Box className="export-buttons">
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
      </Box>
      {activeFilterChips}
      <Box className="table-container" sx={{ height: 500, width: '100%', overflowX: 'auto' }}>
        <DataGrid
          rows={displayRows}
          columns={columns}
          loading={loading}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          autoHeight={false}
          getRowClassName={(params) => `status-row-${params.row.status?.toLowerCase()}`}
          sx={{
            minWidth: 800,
            backgroundColor: 'white',
            borderRadius: 2,
            overflowX: 'auto',
            '& .status-row-present': {
              backgroundColor: '#f1f8e9',
              '&:hover': {
                backgroundColor: '#e8f5e9',
              },
            },
            '& .status-row-absent': {
              backgroundColor: '#ffebee',
              '&:hover': {
                backgroundColor: '#ffcdd2',
              },
            },
            '& .status-row-late': {
              backgroundColor: '#fffde7',
              '&:hover': {
                backgroundColor: '#fff9c4',
              },
            },
            '& .status-row-excused': {
              backgroundColor: '#e3f2fd',
              '&:hover': {
                backgroundColor: '#bbdefb',
              },
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#f5f5f5',
              fontWeight: 'bold',
              fontSize: '1rem',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 'bold',
            },
            '& .MuiDataGrid-footerContainer': {
              justifyContent: 'flex-end',
              pr: 2,
            },
            '& .status-chip.present': {
              backgroundColor: '#c5e1a5',
              color: '#33691e',
              fontWeight: 600,
              borderRadius: '16px',
              px: 2,
              py: 0.5,
            },
            '& .status-chip.absent': {
              backgroundColor: '#ef9a9a',
              color: '#b71c1c',
              fontWeight: 600,
              borderRadius: '16px',
              px: 2,
              py: 0.5,
            },
            '& .status-chip.late': {
              backgroundColor: '#fff59d',
              color: '#f57f17',
              fontWeight: 600,
              borderRadius: '16px',
              px: 2,
              py: 0.5,
            },
            '& .status-chip.excused': {
              backgroundColor: '#b3e5fc',
              color: '#01579b',
              fontWeight: 600,
              borderRadius: '16px',
              px: 2,
              py: 0.5,
            },
            '& .no-note': {
              color: '#9e9e9e',
              fontStyle: 'italic',
            },
          }}
          components={{
            NoRowsOverlay: () => noDataDisplay,
          }}
        />
      </Box>
      <Box className="report-footer">
        <Typography variant="body2" className="record-count">
          Showing {displayRows.length} record{displayRows.length !== 1 ? 's' : ''}
        </Typography>
      </Box>
    </Box>
  )
}

export default AttendanceReportTable
