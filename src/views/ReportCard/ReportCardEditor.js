import React, { useState } from 'react'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Button,
  FormControlLabel,
  Checkbox,
} from '@mui/material'
import { PDFDocument } from 'pdf-lib'

// Import your local PDF file
import reportCardPDF from '../../assets/ReportCards/kindergarden-report-card.pdf'

const ReportCardTabs = () => {
  // Which tab is active: 0 = Kindergarten, 1 = Grades 1–6, 2 = Grades 7–8
  const [activeTab, setActiveTab] = useState(0)

  // Drop-down options for E, G, S, N
  const ratingOptions = ['', 'E', 'G', 'S', 'N'] // '' = "Select"

  // State for Learning Skills and Work Habits
  const [lswh, setLswh] = useState({
    responsibility1: '',
    responsibility2: '',
    organization1: '',
    organization2: '',
    independentWork1: '',
    independentWork2: '',
    collaboration1: '',
    collaboration2: '',
    initiative1: '',
    initiative2: '',
    selfRegulation1: '',
    selfRegulation2: '',
    comments: '',
  })

  // State for “Languages” subject
  const [language, setLanguage] = useState({
    na: false,
    eslEld: false,
    iep: false,
    grade: '',
    comments: '',
  })

  // Switch between tabs
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue)
  }

  // Handle drop-down changes in LSWH
  const handleLswhChange = (field, value) => {
    setLswh((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Example function to fill the local PDF, flatten it, and trigger download
  const handleCreateReportCard = async () => {
    try {
      // 1. Load the existing PDF
      const existingPdfBytes = await fetch(reportCardPDF).then((res) => res.arrayBuffer())
      const pdfDoc = await PDFDocument.load(existingPdfBytes)
      const form = pdfDoc.getForm()

      // 2. Fill in text fields that match your PDF’s form fields
      form.getTextField('responsibility1').setText(lswh.responsibility1)
      form.getTextField('responsibility2').setText(lswh.responsibility2)
      form.getTextField('organization1').setText(lswh.organization1)
      form.getTextField('organization2').setText(lswh.organization2)
      form.getTextField('independent_work1').setText(lswh.independentWork1)
      form.getTextField('independent_work2').setText(lswh.independentWork2)
      form.getTextField('collaboration1').setText(lswh.collaboration1)
      form.getTextField('collaboration2').setText(lswh.collaboration2)
      form.getTextField('initiative1').setText(lswh.initiative1)
      form.getTextField('initiative2').setText(lswh.initiative2)
      form.getTextField('self_regulation1').setText(lswh.selfRegulation1)
      form.getTextField('self_regulation2').setText(lswh.selfRegulation2)
      form.getTextField('lswh_comments').setText(lswh.comments)

      form.getTextField('language1').setText(language.grade)
      form.getTextField('langage_comments').setText(language.comments)

      // 3. Flatten the form so it is no longer editable
      form.flatten()

      // 4. Save the updated PDF
      const pdfBytes = await pdfDoc.save()

      // 5. Trigger download in the browser
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = 'kindergarten_report_card_filled.pdf'
      link.click()
    } catch (err) {
      console.error('Error filling PDF:', err)
      alert('Failed to generate report card. Check console for details.')
    }
  }

  return (
    <Box width="100%" padding="20px">
      <Tabs value={activeTab} onChange={handleTabChange} centered>
        <Tab label="Kindergarten" />
        <Tab label="Grades 1 - 6" />
        <Tab label="Grades 7 - 8" />
      </Tabs>

      {/* Kindergarten Tab */}
      {activeTab === 0 && (
        <Box marginTop={4}>
          <Typography variant="h5" gutterBottom>
            Learning Skills and Work Habits
          </Typography>
          <Typography variant="body2" gutterBottom>
            E = Excellent, G = Good, S = Satisfactory, N = Needs Improvement
          </Typography>

          {/* LSWH Table */}
          <Grid container spacing={2} marginTop={2}>
            {/* Table Header */}
            <Grid item xs={4} />
            <Grid item xs={4}>
              <Typography variant="subtitle2" fontWeight="bold">
                Term 1
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="subtitle2" fontWeight="bold">
                Term 2
              </Typography>
            </Grid>

            {/* Responsibility */}
            <Grid item xs={4}>
              <Typography>Responsibility:</Typography>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <Select
                  value={lswh.responsibility1}
                  onChange={(e) => handleLswhChange('responsibility1', e.target.value)}
                >
                  {ratingOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt || 'Select'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <Select
                  value={lswh.responsibility2}
                  onChange={(e) => handleLswhChange('responsibility2', e.target.value)}
                >
                  {ratingOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt || 'Select'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Organization */}
            <Grid item xs={4}>
              <Typography>Organization:</Typography>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <Select
                  value={lswh.organization1}
                  onChange={(e) => handleLswhChange('organization1', e.target.value)}
                >
                  {ratingOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt || 'Select'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <Select
                  value={lswh.organization2}
                  onChange={(e) => handleLswhChange('organization2', e.target.value)}
                >
                  {ratingOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt || 'Select'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Independent Work */}
            <Grid item xs={4}>
              <Typography>Independent Work:</Typography>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <Select
                  value={lswh.independentWork1}
                  onChange={(e) => handleLswhChange('independentWork1', e.target.value)}
                >
                  {ratingOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt || 'Select'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <Select
                  value={lswh.independentWork2}
                  onChange={(e) => handleLswhChange('independentWork2', e.target.value)}
                >
                  {ratingOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt || 'Select'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Collaboration */}
            <Grid item xs={4}>
              <Typography>Collaboration:</Typography>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <Select
                  value={lswh.collaboration1}
                  onChange={(e) => handleLswhChange('collaboration1', e.target.value)}
                >
                  {ratingOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt || 'Select'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <Select
                  value={lswh.collaboration2}
                  onChange={(e) => handleLswhChange('collaboration2', e.target.value)}
                >
                  {ratingOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt || 'Select'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Initiative */}
            <Grid item xs={4}>
              <Typography>Initiative:</Typography>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <Select
                  value={lswh.initiative1}
                  onChange={(e) => handleLswhChange('initiative1', e.target.value)}
                >
                  {ratingOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt || 'Select'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <Select
                  value={lswh.initiative2}
                  onChange={(e) => handleLswhChange('initiative2', e.target.value)}
                >
                  {ratingOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt || 'Select'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Self-Regulation */}
            <Grid item xs={4}>
              <Typography>Self-Regulation:</Typography>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <Select
                  value={lswh.selfRegulation1}
                  onChange={(e) => handleLswhChange('selfRegulation1', e.target.value)}
                >
                  {ratingOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt || 'Select'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <Select
                  value={lswh.selfRegulation2}
                  onChange={(e) => handleLswhChange('selfRegulation2', e.target.value)}
                >
                  {ratingOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt || 'Select'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* LSWH Comments */}
          <Box marginTop={3}>
            <Typography>Comments:</Typography>
            <TextField
              multiline
              rows={3}
              fullWidth
              value={lswh.comments}
              onChange={(e) => handleLswhChange('comments', e.target.value)}
              placeholder="Enter any additional comments here..."
            />
          </Box>

          {/* Language subject example */}
          <Box marginTop={4}>
            <Typography variant="h6">Subject: Languages</Typography>

            <Box marginTop={1} display="flex" alignItems="center">
              <Typography marginRight={2}>Languages:</Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={language.na}
                    onChange={(e) => setLanguage({ ...language, na: e.target.checked })}
                  />
                }
                label="N/A"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={language.eslEld}
                    onChange={(e) => setLanguage({ ...language, eslEld: e.target.checked })}
                  />
                }
                label="ESL/ELD"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={language.iep}
                    onChange={(e) => setLanguage({ ...language, iep: e.target.checked })}
                  />
                }
                label="IEP"
              />
            </Box>

            <Box marginTop={2} maxWidth="200px">
              <Typography>Grade:</Typography>
              <TextField
                fullWidth
                value={language.grade}
                onChange={(e) => setLanguage({ ...language, grade: e.target.value })}
                placeholder="Grade"
              />
            </Box>

            <Box marginTop={2}>
              <Typography>Comments:</Typography>
              <TextField
                multiline
                rows={3}
                fullWidth
                value={language.comments}
                onChange={(e) => setLanguage({ ...language, comments: e.target.value })}
                placeholder="Language subject comments..."
              />
            </Box>
          </Box>

          <Box marginTop={4} textAlign="center">
            <Button variant="contained" onClick={handleCreateReportCard}>
              Create Report Card
            </Button>
          </Box>
        </Box>
      )}

      {/* Grades 1 - 6 Tab */}
      {activeTab === 1 && (
        <Box marginTop={4}>
          <Typography variant="h5">Grades 1–6 Report Card</Typography>
          {/* You can replicate the same UI or customize for Grades 1–6 */}
        </Box>
      )}

      {/* Grades 7 - 8 Tab */}
      {activeTab === 2 && (
        <Box marginTop={4}>
          <Typography variant="h5">Grades 7–8 Report Card</Typography>
          {/* You can replicate the same UI or customize for Grades 7–8 */}
        </Box>
      )}
    </Box>
  )
}

export default ReportCardTabs
