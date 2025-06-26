import React, { useState, useMemo } from 'react'
import {
  Box,
  Button,
  Typography,
  Modal,
  Chip,
  IconButton,
  Stack,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import FilterListIcon from '@mui/icons-material/FilterList'
import ClearIcon from '@mui/icons-material/Clear'
import { DataGrid } from '@mui/x-data-grid'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import dayjs from 'dayjs'
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
  semester: null,
  class: null,
  student: null,
  status: null,
}

const AttendanceReportTable = ({ attendanceData, reportParams }) => {
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [filters, setFilters] = useState(defaultFilters)
  const [pendingFilters, setPendingFilters] = useState(defaultFilters)

  // Extract unique options for dropdowns
  const semesterOptions = useMemo(
    () => Array.from(new Set(attendanceData.map((row) => row.semester))).filter(Boolean),
    [attendanceData],
  )
  const classOptions = useMemo(
    () => Array.from(new Set(attendanceData.map((row) => row.class))).filter(Boolean),
    [attendanceData],
  )
  const studentOptions = useMemo(
    () => Array.from(new Set(attendanceData.map((row) => row.student))).filter(Boolean),
    [attendanceData],
  )
  const statusOptions = useMemo(
    () => Array.from(new Set(attendanceData.map((row) => row.status))).filter(Boolean),
    [attendanceData],
  )
  const dateOptions = useMemo(
    () => Array.from(new Set(attendanceData.map((row) => row.date))).filter(Boolean),
    [attendanceData],
  )

  // DataGrid columns
  const columns = [
    {
      field: 'date',
      headerName: 'DATE',
      flex: 1,
      minWidth: 120,
      type: 'string',
      renderCell: (params) => params.value ? dayjs(params.value).format('YYYY-MM-DD') : '',
      filterable: false, // handled externally
    },
    { field: 'class', headerName: 'CLASS', flex: 1, minWidth: 120, filterable: false },
    { field: 'student', headerName: 'STUDENT', flex: 1, minWidth: 140, filterable: false },
    {
      field: 'status',
      headerName: 'STATUS',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <span className={getStatusClass(params.value)}>{params.value}</span>
      ),
      filterable: false,
      sortable: true,
    },
    {
      field: 'note',
      headerName: 'NOTE',
      flex: 2,
      minWidth: 180,
      renderCell: (params) =>
        params.value ? (
          <span>{params.value}</span>
        ) : (
          <span className="no-note">-</span>
        ),
      filterable: false,
    },
  ]

  // DataGrid expects each row to have a unique id
  const rows = attendanceData.map((row, idx) => ({ id: idx, ...row }))

  // Filtering logic
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Date range filter
      if (filters.startDate && dayjs(row.date).isBefore(dayjs(filters.startDate), 'day')) return false
      if (filters.endDate && dayjs(row.date).isAfter(dayjs(filters.endDate), 'day')) return false
      if (filters.semester && row.semester !== filters.semester) return false
      if (filters.class && row.class !== filters.class) return false
      if (filters.student && row.student !== filters.student) return false
      if (filters.status && row.status !== filters.status) return false
      return true
    })
  }, [rows, filters])

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

  // When opening modal, copy filters to pendingFilters
  const openFilterModal = () => {
    setPendingFilters(filters)
    setFilterModalOpen(true)
  }

  // Filter modal content
  const filterModal = (
    <Modal open={filterModalOpen} onClose={() => setFilterModalOpen(false)}>
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600,
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 24,
        p: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}>
        <Typography variant="h6" mb={2}>Filter Attendance</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 2 }}>
          {/* Date Fields Column */}
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
          </Box>
          {/* Middle Column */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Autocomplete
              options={semesterOptions}
              value={pendingFilters.semester}
              onChange={(_, value) => setPendingFilters((f) => ({ ...f, semester: value }))}
              renderInput={(params) => <TextField {...params} label="Semester" variant="outlined" fullWidth />}
              clearOnEscape
              autoHighlight
              freeSolo={false}
            />
            <Autocomplete
              options={classOptions}
              value={pendingFilters.class}
              onChange={(_, value) => setPendingFilters((f) => ({ ...f, class: value }))}
              renderInput={(params) => <TextField {...params} label="Class" variant="outlined" fullWidth />}
              clearOnEscape
              autoHighlight
              freeSolo={false}
            />
          </Box>
          {/* Right Column */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Autocomplete
              options={studentOptions}
              value={pendingFilters.student}
              onChange={(_, value) => setPendingFilters((f) => ({ ...f, student: value }))}
              renderInput={(params) => <TextField {...params} label="Student" variant="outlined" fullWidth />}
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
        </Box>
        <Box display="flex" justifyContent="flex-end" gap={1} mt={3}>
          <Button onClick={() => setPendingFilters(defaultFilters)} sx={{ color: '#c62828' }}>Clear</Button>
          <Button variant="contained" onClick={() => { setFilters(pendingFilters); setFilterModalOpen(false); }}>Apply</Button>
        </Box>
      </Box>
    </Modal>
  )

  // Show active filters as chips
  const activeFilterChips = (
    <Stack direction="row" spacing={1} mb={2}>
      {filters.startDate && (
        <Chip label={`From: ${dayjs(filters.startDate).format('YYYY-MM-DD')}`} onDelete={() => setFilters(f => ({ ...f, startDate: null }))} />
      )}
      {filters.endDate && (
        <Chip label={`To: ${dayjs(filters.endDate).format('YYYY-MM-DD')}`} onDelete={() => setFilters(f => ({ ...f, endDate: null }))} />
      )}
      {filters.semester && (
        <Chip label={`Semester: ${filters.semester}`} onDelete={() => setFilters(f => ({ ...f, semester: null }))} />
      )}
      {filters.class && (
        <Chip label={`Class: ${filters.class}`} onDelete={() => setFilters(f => ({ ...f, class: null }))} />
      )}
      {filters.student && (
        <Chip label={`Student: ${filters.student}`} onDelete={() => setFilters(f => ({ ...f, student: null }))} />
      )}
      {filters.status && (
        <Chip label={`Status: ${filters.status}`} onDelete={() => setFilters(f => ({ ...f, status: null }))} />
      )}
      {(filters.startDate || filters.endDate || filters.semester || filters.class || filters.student || filters.status) && (
        <IconButton size="small" onClick={() => setFilters(defaultFilters)} title="Clear all filters">
          <ClearIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>
  )

  return (
    <Box className="report-table-container">
      {filterModal}
      <Box className="report-header" sx={{ mb: 2, flexDirection: 'column', alignItems: 'stretch', gap: 2 }}>
        <Typography variant="h5" className="report-title" sx={{ fontWeight: 700 }}>
          Attendance Report
          {reportParams.semester && (
            <span className="report-subtitle"> - {reportParams.semester}</span>
          )}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, gap: 2 }}>
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
              startIcon={<DownloadIcon />}
              className="export-button excel-button"
              onClick={exportToExcel}
              sx={{ '&:hover': { backgroundColor: 'rgba(46,125,50,0.08)', borderColor: '#1b5e20', color: '#1b5e20' } }}
            >
              Export Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={<PictureAsPdfIcon />}
              className="export-button pdf-button"
              onClick={exportToPDF}
              sx={{ '&:hover': { backgroundColor: 'rgba(198,40,40,0.08)', borderColor: '#b71c1c', color: '#b71c1c' } }}
            >
              Export PDF
            </Button>
          </Box>
        </Box>
      </Box>
      {activeFilterChips}
      <Box className="table-container" sx={{ height: 500, width: '100%', overflowX: 'auto' }}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
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
          Showing {filteredRows.length} record{filteredRows.length !== 1 ? 's' : ''}
        </Typography>
      </Box>
    </Box>
  )
}

export default AttendanceReportTable
