import PDFViewer from './Components/PDFViewer'
import { getLatestFormData } from './utils/draftVersioning'
import { getTeacherDrafts } from './utils/teacherDrafts'
import { getReportYear, getReportTerm } from './utils/reportScope'
import { useReportScope } from './utils/useReportScope'
import ReportScopeFilter from './Components/ReportScopeFilter'
import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  const [previewDraft, setPreviewDraft] = useState(null)
  const [error, setError] = useState(null)
  const reportScope = useReportScope([...draftReports, ...reportCards])

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
                schoolYear: metadata.customMetadata?.schoolYear,
                term: metadata.customMetadata?.term,
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
            const querySnapshot = await getTeacherDrafts(firestore, user.uid)
            const drafts = []

            querySnapshot.forEach((doc) => {
              const data = doc.data()
              // Only add valid drafts
              if (data && data.reportCardType && data.studentName) {
                drafts.push({
                  ...data,
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
                  term: data.term,
                })
              }
            })

            // Sort in JavaScript instead of Firestore
            drafts.sort((a, b) => b.createdAtMs - a.createdAtMs)
            return drafts
          } catch (error) {
            console.error('Error fetching drafts:', error)
            throw error
          }
        }

        const [storedFiles, drafts, publishedSnapshot] = await Promise.all([
          fetchFromStorage().catch(() => []), fetchDrafts(),
          getDocs(query(collection(firestore, 'reportCards'), where('uid', '==', user.uid))),
        ])
        const published = publishedSnapshot.docs.map((snapshot) => {
          const data = snapshot.data()
          return { ...data, id: snapshot.id, type: data.type || data.reportCardType,
            createdAtMs: data.createdAt?.toDate?.()?.getTime() || new Date(data.createdAt || 0).getTime(),
            student: data.studentName || '—', status: 'completed' }
        })
        // Firestore supplies period metadata and approved copies outside the teacher storage folder.
        const publishedPaths = new Set(published.map((record) => record.filePath).filter(Boolean))
        const completedReports = [...published, ...storedFiles.filter((record) => !publishedPaths.has(record.id))]

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
    if (getReportYear(draft, reportScope.current) !== reportScope.current.label) {
      alert('Historical drafts remain in this school year. Create a new current-year report from Create Report Card.')
      return
    }
    // Store the draft data in localStorage for loading
    localStorage.setItem('editingDraftId', draft.id)
    localStorage.setItem('draftFormData', JSON.stringify(draft.formData))
    localStorage.setItem('draftStudent', JSON.stringify(draft.selectedStudent))
    localStorage.setItem('draftReportType', draft.type)
    localStorage.setItem('draftTerm', draft.term || '')

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
  const allReports = reportScope.records.filter((r) => showDrafts || r.status !== 'draft')

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
        <ReportScopeFilter scope={reportScope} />
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
          No reports in this school year and term. Choose another reporting period to view earlier records.
        </Typography>
        <Typography variant="body2" color="textSecondary" mt={1} textAlign="right">
          Showing 0 report cards (0 drafts, 0 completed)
        </Typography>
      </Box>
    )
  }

  return (
    <Box className="rc-report-table-container" mt={2}>
      <ReportScopeFilter scope={reportScope} />
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
                <TableCell>{getTypeName(rc.type)}<small className="d-block text-body-secondary">{getReportTerm(rc) === 'unknown' ? 'Term not recorded' : getReportTerm(rc) === 'term1' ? 'Term 1' : 'Term 2'}</small></TableCell>
                <TableCell>{rc.student}</TableCell>
                <TableCell>
                  {rc.status === 'draft' ? (
                    <Box display="flex" gap={1}>
                      <Button size="small" onClick={() => setPreviewDraft(rc)}>View draft</Button>
                      <Tooltip title="Edit Draft">
                        <IconButton
                          size="small"
                          color="primary"
                          disabled={getReportYear(rc, reportScope.current) !== reportScope.current.label}
                          onClick={() => handleEditDraft(rc)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Draft">
                        <IconButton
                          size="small"
                          color="error"
                          disabled={getReportYear(rc, reportScope.current) !== reportScope.current.label}
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
        {filteredReports.filter((d) => d.status === 'draft').length} draft
        {filteredReports.filter((d) => d.status === 'draft').length !== 1
          ? 's'
          : ''}, {filteredReports.filter((r) => r.status !== 'draft').length} completed)
      </Typography>
      <Dialog open={!!previewDraft} onClose={() => setPreviewDraft(null)} maxWidth="lg" fullWidth>
        <DialogTitle>Saved draft: {previewDraft?.student}</DialogTitle>
        <DialogContent>
          {previewDraft && <>
            <Typography>{getReportYear(previewDraft, reportScope.current)} · {getReportTerm(previewDraft) === 'term1' ? 'Term 1' : getReportTerm(previewDraft) === 'term2' ? 'Term 2' : 'Term not recorded'}</Typography>
            <PDFViewer pdfUrl={REPORT_CARD_TYPES.find((type) => type.id === previewDraft.type)?.pdfPath}
              formData={getLatestFormData(previewDraft)} showPreview />
          </>}
        </DialogContent>
        <DialogActions><Button onClick={() => setPreviewDraft(null)}>Close</Button></DialogActions>
      </Dialog>

    </Box>
  )
}

PastReportCardsTable.propTypes = {
  onEditDraft: PropTypes.func,
}

export default PastReportCardsTable
