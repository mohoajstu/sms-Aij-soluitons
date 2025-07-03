import React, { useEffect, useState } from 'react'
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
} from '@mui/material'
import dayjs from 'dayjs'
import { ref as storageRef, listAll, getDownloadURL, getMetadata } from 'firebase/storage'
import { storage } from '../../Firebase/firebase'
import useAuth from '../../Firebase/useAuth'
import { REPORT_CARD_TYPES } from './index'

/**
 * Table listing the current teacher's previously generated report cards.
 * Data is pulled from the "reportCards" collection in Firestore, where we
 * already write a document each time a PDF is created (see ReportCard/index.js).
 */
const PastReportCardsTable = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [reportCards, setReportCards] = useState([])
  const [filterType, setFilterType] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return

    const fetchFromStorage = async () => {
      setLoading(true)
      try {
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

            const createdAtMs = metadata.timeCreated ? new Date(metadata.timeCreated).getTime() : 0
            const student = metadata.customMetadata?.student || '—'

            return {
              id: itemRef.fullPath,
              type: typeSlug,
              url,
              createdAtMs,
              student,
            }
          } catch (innerErr) {
            console.warn('Error processing storage item:', innerErr)
            return null
          }
        })

        const files = (await Promise.all(filePromises)).filter(Boolean)
        // Sort newest first
        files.sort((a, b) => b.createdAtMs - a.createdAtMs)
        setReportCards(files)
      } catch (err) {
        console.error('Error listing report cards in storage:', err)
        setError('Failed to load report cards.')
      } finally {
        setLoading(false)
      }
    }

    fetchFromStorage()
  }, [user])

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
  const filteredReportCards = filterType
    ? reportCards.filter((rc) => rc.type === filterType)
    : reportCards

  // Build dropdown options once we have list
  const typeOptions = [...new Set(reportCards.map((rc) => rc.type))].map((id) => ({ id, label: getTypeName(id) }))

  if (filteredReportCards.length === 0) {
    return (
      <Typography variant="body1" color="textSecondary">
        No report cards found.
      </Typography>
    )
  }

  return (
    <Box className="rc-report-table-container" mt={2}>
      {/* Filter */}
      <Box mb={3} maxWidth={300}>
        <Autocomplete
          options={typeOptions}
          getOptionLabel={(opt) => (typeof opt === 'string' ? getTypeName(opt) : opt.label)}
          value={filterType ? { id: filterType, label: getTypeName(filterType) } : null}
          onChange={(e, val) => setFilterType(val?.id || '')}
          renderInput={(params) => <TextField {...params} label="Filter by Type" />}
          clearOnEscape
        />
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date Created</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Student</TableCell>
              <TableCell>Download</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredReportCards.map((rc) => (
              <TableRow key={rc.id}>
                <TableCell>{
                  rc.createdAtMs
                    ? dayjs(rc.createdAtMs).format('YYYY-MM-DD HH:mm')
                    : '—'
                }</TableCell>
                <TableCell>{getTypeName(rc.type)}</TableCell>
                <TableCell>{rc.student}</TableCell>
                <TableCell>
                  {rc.url ? (
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
      <Typography
        variant="body2"
        color="textSecondary"
        mt={1}
        textAlign="right"
      >
        Showing {filteredReportCards.length} report card{filteredReportCards.length > 1 ? 's' : ''}
      </Typography>
    </Box>
  )
}

export default PastReportCardsTable 