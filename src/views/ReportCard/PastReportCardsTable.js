import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Link,
  Autocomplete,
  TextField,
  Button,
  Chip,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { ref as storageRef, listAll, getDownloadURL, getMetadata } from 'firebase/storage'
import { storage, firestore } from '../../Firebase/firebase'
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore'
import useAuth from '../../Firebase/useAuth'
import { REPORT_CARD_TYPES } from './utils'

/**
 * Table listing the current teacher's previously generated report cards.
 * Data is pulled from the "reportCards" collection in Firestore, where we
 * already write a document each time a PDF is created (see ReportCard/index.js).
 */
const PastReportCardsTable = ({ onEditDraft: onEditDraftCallback }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [reportCards, setReportCards] = useState([])
  const [draftReports, setDraftReports] = useState([])
  const [filterType, setFilterType] = useState('')
  const [showDrafts, setShowDrafts] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch completed reports from storage
        const fetchFromStorage = async () => {
          const folderRef = storageRef(storage, `reportCards/${user.uid}`)
          const listRes = await listAll(folderRef)

          const filePromises = listRes.items.map(async (itemRef) => {
            try {
              const url = await getDownloadURL(itemRef)
              const metadata = await getMetadata(itemRef)
              const name = metadata.name // e.g. "7-8-progress-1751513794641.pdf"

              // Extract type slug before the last dash & timestamp
              const slugMatch = name.match(/^(.*?)-\d+\.pdf$/)
              const typeSlug = slugMatch ? slugMatch[1] : 'unknown'

              const createdAtMs = metadata.timeCreated
                ? new Date(metadata.timeCreated).getTime()
                : 0
              const student = metadata.customMetadata?.student || '—'

              return {
                id: itemRef.fullPath,
                type: typeSlug,
                url,
                createdAtMs,
                student,
                status: 'completed',
              }
            } catch (innerErr) {
              console.warn('Error processing storage item:', innerErr)
              return null
            }
          })

          const files = (await Promise.all(filePromises)).filter(Boolean)
          return files
        }

        // Fetch draft reports from Firestore
        const fetchDrafts = async () => {
          try {
            const draftsQuery = query(
              collection(firestore, 'reportCardDrafts'),
              where('uid', '==', user.uid),
            )

            const querySnapshot = await getDocs(draftsQuery)
            const drafts = []

            querySnapshot.forEach((doc) => {
              const data = doc.data()
              // Only add valid drafts
              if (data && data.reportCardType && data.studentName) {
                drafts.push({
                  id: doc.id,
                  type: data.reportCardType,
                  url: null, // No URL for drafts
                  createdAtMs:
                    data.lastModified?.toDate?.()?.getTime() ||
                    data.createdAt?.toDate?.()?.getTime() ||
                    0,
                  student: data.studentName,
                  status: 'draft',
                  formData: data.formData,
                  selectedStudent: data.selectedStudent,
                  reportCardTypeName: data.reportCardTypeName,
                })
              }
            })

            // Sort in JavaScript instead of Firestore
            drafts.sort((a, b) => b.createdAtMs - a.createdAtMs)
            return drafts
          } catch (error) {
            console.error('Error fetching drafts:', error)
            // Return empty array if drafts fail to load
            return []
          }
        }

        const [completedReports, drafts] = await Promise.all([
          fetchFromStorage().catch((err) => {
            console.error('Error loading completed reports:', err)
            return [] // Return empty array on error
          }),
          fetchDrafts(), // Already has error handling
        ])

        // Sort completed reports newest first
        completedReports.sort((a, b) => b.createdAtMs - a.createdAtMs)

        setReportCards(completedReports)
        setDraftReports(drafts)
      } catch (err) {
        console.error('Error loading report cards:', err)
        setError('Failed to load report cards.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // Handle draft actions
  const handleEditDraft = (draft) => {
    // Store the draft data in localStorage for loading
    localStorage.setItem('editingDraftId', draft.id)
    localStorage.setItem('draftFormData', JSON.stringify(draft.formData))
    localStorage.setItem('draftStudent', JSON.stringify(draft.selectedStudent))
    localStorage.setItem('draftReportType', draft.type)

    // Switch to the Create Report Card tab
    if (onEditDraftCallback) {
      onEditDraftCallback()
    }
  }

  const handleDeleteDraft = async (draftId) => {
    if (!window.confirm('Are you sure you want to delete this draft?')) {
      return
    }

    try {
      await deleteDoc(doc(firestore, 'reportCardDrafts', draftId))
      setDraftReports((prev) => prev.filter((draft) => draft.id !== draftId))
    } catch (error) {
      console.error('Error deleting draft:', error)
      alert('Failed to delete draft. Please try again.')
    }
  }

  // Combine and filter reports
  const allReports = showDrafts ? [...draftReports, ...reportCards] : reportCards

  const filteredReports = filterType
    ? allReports.filter((rc) => rc.type === filterType)
    : allReports

  // Sort all reports by date (newest first)
  filteredReports.sort((a, b) => b.createdAtMs - a.createdAtMs)

  if (!user) {
    return (
      <Typography variant="body1" color="textSecondary">
        Please sign in to view your report cards.
      </Typography>
    )
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Typography variant="body1" color="error">
        {error}
      </Typography>
    )
  }

  // Helper to map slug → pretty name
  const getTypeName = (id) => REPORT_CARD_TYPES.find((t) => t.id === id)?.name || id

  // Apply type filtering if a filter is selected
  // Build dropdown options once we have list
  const typeOptions = [...new Set(allReports.map((rc) => rc.type))].map((id) => ({
    id,
    label: getTypeName(id),
  }))

  if (filteredReports.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Box mb={3} display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <Autocomplete
            options={[]}
            renderInput={(params) => <TextField {...params} label="Filter by Type" />}
            clearOnEscape
            sx={{ width: 300 }}
            disabled
          />
          <FormControlLabel
            control={
              <Switch
                checked={showDrafts}
                onChange={(e) => setShowDrafts(e.target.checked)}
                color="primary"
              />
            }
            label="Show Drafts"
          />
        </Box>
        <Typography variant="body1" color="textSecondary">
          No report cards found. Generate your first report card to see it here.
        </Typography>
        <Typography variant="body2" color="textSecondary" mt={1} textAlign="right">
          Showing 0 report cards (0 drafts, 0 completed)
        </Typography>
      </Box>
    )
  }

  return (
    <Box className="rc-report-table-container" mt={2}>
      {/* Filter and Controls */}
      <Box mb={3} display="flex" gap={2} alignItems="center" flexWrap="wrap">
        <Autocomplete
          options={typeOptions}
          getOptionLabel={(opt) => (typeof opt === 'string' ? getTypeName(opt) : opt.label)}
          value={filterType ? { id: filterType, label: getTypeName(filterType) } : null}
          onChange={(e, val) => setFilterType(val?.id || '')}
          renderInput={(params) => <TextField {...params} label="Filter by Type" />}
          clearOnEscape
          sx={{ width: 300 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={showDrafts}
              onChange={(e) => setShowDrafts(e.target.checked)}
              color="primary"
            />
          }
          label="Show Drafts"
        />
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Student</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredReports.map((rc) => (
              <TableRow key={rc.id}>
                <TableCell>
                  {rc.createdAtMs ? dayjs(rc.createdAtMs).format('YYYY-MM-DD HH:mm') : '—'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={rc.status === 'draft' ? 'Draft' : 'Completed'}
                    color={rc.status === 'draft' ? 'warning' : 'success'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{getTypeName(rc.type)}</TableCell>
                <TableCell>{rc.student}</TableCell>
                <TableCell>
                  {rc.status === 'draft' ? (
                    <Box display="flex" gap={1}>
                      <Tooltip title="Edit Draft">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditDraft(rc)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Draft">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteDraft(rc.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ) : rc.url ? (
                    <Link href={rc.url} target="_blank" rel="noopener">
                      View PDF
                    </Link>
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2" color="textSecondary" mt={1} textAlign="right">
        Showing {filteredReports.length} report card{filteredReports.length !== 1 ? 's' : ''}(
        {draftReports.filter((d) => !filterType || d.type === filterType).length} draft
        {draftReports.filter((d) => !filterType || d.type === filterType).length !== 1
          ? 's'
          : ''}, {reportCards.filter((r) => !filterType || r.type === filterType).length} completed)
      </Typography>
    </Box>
  )
}

PastReportCardsTable.propTypes = {
  onEditDraft: PropTypes.func,
}

export default PastReportCardsTable
