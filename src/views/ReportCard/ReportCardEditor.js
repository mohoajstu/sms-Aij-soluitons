import React, { useState } from 'react'
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Grid,
  TextField,
  FormControlLabel,
  Checkbox,
} from '@mui/material'
import { PDFDocument, PDFName, PDFRef } from 'pdf-lib'
import reportCardPDF from '../../assets/ReportCards/kindergarden-report-card.pdf'

const ReportCardForm = () => {
  // Define steps in order (note: we keep the generic Languages step as requested)
  const steps = [
    'Student Information',
    'Learning Skills & Work Habits',
    'Languages',
    'French',
    'Native Language',
    'Mathematics',
    'Science',
    'Social Studies',
    'Health & PE',
    'The Arts',
    'Comments & Signatures',
  ]

  // State object for all form data – updated with all fields found in the XFA.
  const [formData, setFormData] = useState({
    // Student Information
    student: '',
    oen: '',
    grade: '',
    teacher: '',
    date: '',
    days_absent: '',
    total_days_absent: '',
    times_late: '',
    total_times_late: '',
    board: '',
    school: '',
    board_address: '',
    school_address: '',
    principal: '',
    phone_number: '',
    // Learning Skills & Work Habits
    responsibility1: '',
    responsibility2: '',
    organization1: '',
    organization2: '',
    independent_work1: '',
    independent_work2: '',
    collaboration1: '',
    collaboration2: '',
    initiative1: '',
    initiative2: '',
    self_regulation1: '',
    self_regulation2: '',
    lswh_comments: '',
    // Languages (generic)
    language1: '',
    language2: '',
    language_comments: '',
    language_na: false,
    language_esl: false,
    language_iep: false,
    // French (detailed – each skill has text fields and dedicated checkboxes)
    french_na: false,
    // Listening
    french_listening1: '',
    french_listening2: '',
    french_listening_esl: false,
    french_listening_iep: false,
    // Speaking
    french_speaking1: '',
    french_speaking2: '',
    french_speaking_esl: false,
    french_speaking_iep: false,
    // Reading
    french_reading1: '',
    french_reading2: '',
    french_reading_esl: false,
    french_reading_iep: false,
    // Writing
    french_writing1: '',
    french_writing2: '',
    french_writing_esl: false,
    french_writing_iep: false,
    french_comments: '',
    // Native Language (teacher writes grade for overall native language as well as term scores)
    native_language1: '',
    native_language2: '',
    native_language_overall: '',
    native_language_na: false,
    native_language_esl: false,
    native_language_iep: false,
    native_language_comments: '',
    // Mathematics
    math1: '',
    math2: '',
    math_comments: '',
    math_french: false,
    math_esl: false,
    math_iep: false,
    // Science
    science1: '',
    science2: '',
    science_comments: '',
    science_french: false,
    science_esl: false,
    science_iep: false,
    // Social Studies
    social_studies1: '',
    social_studies2: '',
    social_studies_comments: '',
    social_studies_french: false,
    social_studies_esl: false,
    social_studies_iep: false,
    // Health & PE – two parts (Health and PE) with separate checkboxes
    health1: '',
    health2: '',
    pe1: '',
    pe2: '',
    health_pe_comments: '',
    health_french: false,
    health_esl: false,
    health_iep: false,
    pe_french: false,
    pe_esl: false,
    pe_iep: false,
    // The Arts – for each subcategory include term scores and checkboxes
    // Dance
    dance1: '',
    dance2: '',
    dance_french: false,
    dance_esl: false,
    dance_iep: false,
    dance_na: false,
    // Drama
    drama1: '',
    drama2: '',
    drama_french: false,
    drama_esl: false,
    drama_iep: false,
    drama_na: false,
    // Music
    music1: '',
    music2: '',
    music_french: false,
    music_esl: false,
    music_iep: false,
    music_na: false,
    // Visual Arts
    visual_arts1: '',
    visual_arts2: '',
    visual_arts_french: false,
    visual_arts_esl: false,
    visual_arts_iep: false,
    visual_arts_na: false,
    visual_arts_comments: '',
    // Comments & Signatures
    best_work: '',
    improvement_goal: '',
    parent_improved: '',
    parent_help: '',
    teacher_signature: '',
    parent_signature: '',
    principal_signature: '',
  })

  // Update formData state.
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Helper for updating PDF text fields.
  const safeSetTextField = (form, fieldName, value) => {
    try {
      const field = form.getTextField(fieldName)
      field.setText(value || '')
    } catch (error) {
      console.warn(`Unable to set text for field "${fieldName}":`, error)
    }
  }

  // Navigation handlers.
  const handleNext = () => {
    setActiveStep((prev) => prev + 1)
  }
  const handleBack = () => {
    setActiveStep((prev) => prev - 1)
  }

  // Load the PDF, fill in fields, and trigger download.
  const handleCreateReportCard = async () => {
    try {
      const existingPdfBytes = await fetch(reportCardPDF).then((res) => res.arrayBuffer())
      const pdfDoc = await PDFDocument.load(existingPdfBytes)
      const form = pdfDoc.getForm()

      // 1. Student Information
      safeSetTextField(form, 'student', formData.student)
      safeSetTextField(form, 'oen', formData.oen)
      safeSetTextField(form, 'grade', formData.grade)
      safeSetTextField(form, 'teacher', formData.teacher)
      safeSetTextField(form, 'date', formData.date)
      safeSetTextField(form, 'days_absent', formData.days_absent)
      safeSetTextField(form, 'total_days_absent', formData.total_days_absent)
      safeSetTextField(form, 'times_late', formData.times_late)
      safeSetTextField(form, 'total_times_late', formData.total_times_late)
      safeSetTextField(form, 'board', formData.board)
      safeSetTextField(form, 'school', formData.school)
      safeSetTextField(form, 'board_address', formData.board_address)
      safeSetTextField(form, 'school_address', formData.school_address)
      safeSetTextField(form, 'principal', formData.principal)
      safeSetTextField(form, 'phone_number', formData.phone_number)

      // 2. Learning Skills & Work Habits
      safeSetTextField(form, 'responsibility1', formData.responsibility1)
      safeSetTextField(form, 'responsibility2', formData.responsibility2)
      safeSetTextField(form, 'organization1', formData.organization1)
      safeSetTextField(form, 'organization2', formData.organization2)
      safeSetTextField(form, 'independent_work1', formData.independent_work1)
      safeSetTextField(form, 'independent_work2', formData.independent_work2)
      safeSetTextField(form, 'collaboration1', formData.collaboration1)
      safeSetTextField(form, 'collaboration2', formData.collaboration2)
      safeSetTextField(form, 'initiative1', formData.initiative1)
      safeSetTextField(form, 'initiative2', formData.initiative2)
      safeSetTextField(form, 'self_regulation1', formData.self_regulation1)
      safeSetTextField(form, 'self_regulation2', formData.self_regulation2)
      safeSetTextField(form, 'lswh_comments', formData.lswh_comments)

      // 3. Languages (generic)
      safeSetTextField(form, 'language1', formData.language1)
      safeSetTextField(form, 'language2', formData.language2)
      safeSetTextField(form, 'language_comments', formData.language_comments)
      if (formData.language_na) form.getCheckBox('language_na').check()
      if (formData.language_esl) form.getCheckBox('language_esl').check()
      if (formData.language_iep) form.getCheckBox('language_iep').check()

      // 4. French – fill in each skill with its text fields and checkboxes.
      if (formData.french_na) form.getCheckBox('french_na').check()
      // Listening
      safeSetTextField(form, 'french_listening1', formData.french_listening1)
      safeSetTextField(form, 'french_listening2', formData.french_listening2)
      if (formData.french_listening_esl) form.getCheckBox('french_listening_esl').check()
      if (formData.french_listening_iep) form.getCheckBox('french_listening_iep').check()
      // Speaking
      safeSetTextField(form, 'french_speaking1', formData.french_speaking1)
      safeSetTextField(form, 'french_speaking2', formData.french_speaking2)
      if (formData.french_speaking_esl) form.getCheckBox('french_speaking_esl').check()
      if (formData.french_speaking_iep) form.getCheckBox('french_speaking_iep').check()
      // Reading
      safeSetTextField(form, 'french_reading1', formData.french_reading1)
      safeSetTextField(form, 'french_reading2', formData.french_reading2)
      if (formData.french_reading_esl) form.getCheckBox('french_reading_esl').check()
      if (formData.french_reading_iep) form.getCheckBox('french_reading_iep').check()
      // Writing
      safeSetTextField(form, 'french_writing1', formData.french_writing1)
      safeSetTextField(form, 'french_writing2', formData.french_writing2)
      if (formData.french_writing_esl) form.getCheckBox('french_writing_esl').check()
      if (formData.french_writing_iep) form.getCheckBox('french_writing_iep').check()
      safeSetTextField(form, 'french_comments', formData.french_comments)

      // 5. Native Language – including teacher’s overall field.
      safeSetTextField(form, 'native_language1', formData.native_language1)
      safeSetTextField(form, 'native_language2', formData.native_language2)
      safeSetTextField(form, 'native_language', formData.native_language_overall)
      safeSetTextField(form, 'native_language_comments', formData.native_language_comments)
      if (formData.native_language_na) form.getCheckBox('native_language_na').check()
      if (formData.native_language_esl) form.getCheckBox('native_language_esl').check()
      if (formData.native_language_iep) form.getCheckBox('native_language_iep').check()

      // 6. Mathematics
      safeSetTextField(form, 'math1', formData.math1)
      safeSetTextField(form, 'math2', formData.math2)
      safeSetTextField(form, 'math_comments', formData.math_comments)
      if (formData.math_french) form.getCheckBox('math_french').check()
      if (formData.math_esl) form.getCheckBox('math_esl').check()
      if (formData.math_iep) form.getCheckBox('math_iep').check()

      // 7. Science
      safeSetTextField(form, 'science1', formData.science1)
      safeSetTextField(form, 'science2', formData.science2)
      safeSetTextField(form, 'science_comments', formData.science_comments)
      if (formData.science_french) form.getCheckBox('science_french').check()
      if (formData.science_esl) form.getCheckBox('science_esl').check()
      if (formData.science_iep) form.getCheckBox('science_iep').check()

      // 8. Social Studies
      safeSetTextField(form, 'social_studies1', formData.social_studies1)
      safeSetTextField(form, 'social_studies2', formData.social_studies2)
      safeSetTextField(form, 'social_studies_comments', formData.social_studies_comments)
      if (formData.social_studies_french) form.getCheckBox('social_studies_french').check()
      if (formData.social_studies_esl) form.getCheckBox('social_studies_esl').check()
      if (formData.social_studies_iep) form.getCheckBox('social_studies_iep').check()

      // 9. Health & PE
      safeSetTextField(form, 'health1', formData.health1)
      safeSetTextField(form, 'health2', formData.health2)
      safeSetTextField(form, 'pe1', formData.pe1)
      safeSetTextField(form, 'pe2', formData.pe2)
      safeSetTextField(form, 'health_pe_comments', formData.health_pe_comments)
      if (formData.health_french) form.getCheckBox('health_french').check()
      if (formData.health_esl) form.getCheckBox('health_esl').check()
      if (formData.health_iep) form.getCheckBox('health_iep').check()
      if (formData.pe_french) form.getCheckBox('pe_french').check()
      if (formData.pe_esl) form.getCheckBox('pe_esl').check()
      if (formData.pe_iep) form.getCheckBox('pe_iep').check()

      // 10. The Arts – Dance, Drama, Music, Visual Arts
      // Dance
      safeSetTextField(form, 'dance1', formData.dance1)
      safeSetTextField(form, 'dance2', formData.dance2)
      if (formData.dance_french) form.getCheckBox('dance_french').check()
      if (formData.dance_esl) form.getCheckBox('dance_esl').check()
      if (formData.dance_iep) form.getCheckBox('dance_iep').check()
      if (formData.dance_na) form.getCheckBox('dance_na').check()
      // Drama
      safeSetTextField(form, 'drama1', formData.drama1)
      safeSetTextField(form, 'drama2', formData.drama2)
      if (formData.drama_french) form.getCheckBox('drama_french').check()
      if (formData.drama_esl) form.getCheckBox('drama_esl').check()
      if (formData.drama_iep) form.getCheckBox('drama_iep').check()
      if (formData.drama_na) form.getCheckBox('drama_na').check()
      // Music
      safeSetTextField(form, 'music1', formData.music1)
      safeSetTextField(form, 'music2', formData.music2)
      if (formData.music_french) form.getCheckBox('music_french').check()
      if (formData.music_esl) form.getCheckBox('music_esl').check()
      if (formData.music_iep) form.getCheckBox('music_iep').check()
      if (formData.music_na) form.getCheckBox('music_na').check()
      // Visual Arts
      safeSetTextField(form, 'visual_arts1', formData.visual_arts1)
      safeSetTextField(form, 'visual_arts2', formData.visual_arts2)
      if (formData.visual_arts_french) form.getCheckBox('visual_arts_french').check()
      if (formData.visual_arts_esl) form.getCheckBox('visual_arts_esl').check()
      if (formData.visual_arts_iep) form.getCheckBox('visual_arts_iep').check()
      if (formData.visual_arts_na) form.getCheckBox('visual_arts_na').check()
      safeSetTextField(form, 'visual_arts_comments', formData.visual_arts_comments)

      // 11. Comments & Signatures
      safeSetTextField(form, 'best_work', formData.best_work)
      safeSetTextField(form, 'improvement_goal', formData.improvement_goal)
      safeSetTextField(form, 'parent_improved', formData.parent_improved)
      safeSetTextField(form, 'parent_help', formData.parent_help)
      safeSetTextField(form, 'teacher_signature', formData.teacher_signature)
      safeSetTextField(form, 'parent_signature', formData.parent_signature)
      safeSetTextField(form, 'principal_signature', formData.principal_signature)

      // (Optional) Workaround for any problematic fields.
      const changeField = { name: 'yourProblemFieldName' }
      const tmp = form.getFields().find((f) => f.getName() === changeField.name)
      if (tmp) {
        const widget0 = tmp.acroField.getWidgets()[0]
        const AP = widget0.ensureAP()
        AP.set(PDFName.of('N'), PDFRef.of(0, 0))
        form.removeField(tmp)
      }

      // Save and trigger download.
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = 'filled_report_card.pdf'
      link.click()
    } catch (err) {
      console.error('Error generating report card:', err)
      alert('Failed to generate report card. Check console for details.')
    }
  }

  // Render form pages based on active step.
  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Student Information
            </Typography>
            <Grid container spacing={2}>
              {/* Student Info fields */}
              <Grid item xs={6}>
                <TextField
                  label="Student Name"
                  fullWidth
                  value={formData.student}
                  onChange={(e) => handleChange('student', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Date"
                  fullWidth
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="OEN"
                  fullWidth
                  value={formData.oen}
                  onChange={(e) => handleChange('oen', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Grade"
                  fullWidth
                  value={formData.grade}
                  onChange={(e) => handleChange('grade', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Days Absent"
                  fullWidth
                  value={formData.days_absent}
                  onChange={(e) => handleChange('days_absent', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Total Days Absent"
                  fullWidth
                  value={formData.total_days_absent}
                  onChange={(e) => handleChange('total_days_absent', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Times Late"
                  fullWidth
                  value={formData.times_late}
                  onChange={(e) => handleChange('times_late', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Total Times Late"
                  fullWidth
                  value={formData.total_times_late}
                  onChange={(e) => handleChange('total_times_late', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Board"
                  fullWidth
                  value={formData.board}
                  onChange={(e) => handleChange('board', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Board Address"
                  fullWidth
                  value={formData.board_address}
                  onChange={(e) => handleChange('board_address', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="School"
                  fullWidth
                  value={formData.school}
                  onChange={(e) => handleChange('school', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="School Address"
                  fullWidth
                  value={formData.school_address}
                  onChange={(e) => handleChange('school_address', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Teacher"
                  fullWidth
                  value={formData.teacher}
                  onChange={(e) => handleChange('teacher', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Principal"
                  fullWidth
                  value={formData.principal}
                  onChange={(e) => handleChange('principal', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Phone Number"
                  fullWidth
                  value={formData.phone_number}
                  onChange={(e) => handleChange('phone_number', e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        )
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Learning Skills & Work Habits
            </Typography>
            <Typography variant="subtitle1">
              E - Excellent, G - Good, S - Satisfactory, N - Needs Improvement
            </Typography>
            <Grid container spacing={2}>
              {[
                { label: 'Responsibility (Term 1)', field: 'responsibility1' },
                { label: 'Responsibility (Term 2)', field: 'responsibility2' },
                { label: 'Organization (Term 1)', field: 'organization1' },
                { label: 'Organization (Term 2)', field: 'organization2' },
                { label: 'Independent Work (Term 1)', field: 'independent_work1' },
                { label: 'Independent Work (Term 2)', field: 'independent_work2' },
                { label: 'Collaboration (Term 1)', field: 'collaboration1' },
                { label: 'Collaboration (Term 2)', field: 'collaboration2' },
                { label: 'Initiative (Term 1)', field: 'initiative1' },
                { label: 'Initiative (Term 2)', field: 'initiative2' },
                { label: 'Self-Regulation (Term 1)', field: 'self_regulation1' },
                { label: 'Self-Regulation (Term 2)', field: 'self_regulation2' },
              ].map((item) => (
                <Grid item xs={6} key={item.field}>
                  <TextField
                    label={item.label}
                    fullWidth
                    value={formData[item.field]}
                    onChange={(e) => handleChange(item.field, e.target.value)}
                  />
                </Grid>
              ))}
              <Grid item xs={12}>
                <TextField
                  label="Strengths/Next Steps for Improvement"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.lswh_comments}
                  onChange={(e) => handleChange('lswh_comments', e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        )
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Languages
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.language_na}
                      onChange={(e) => handleChange('language_na', e.target.checked)}
                    />
                  }
                  label="N/A"
                />
              </Grid>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.language_esl}
                      onChange={(e) => handleChange('language_esl', e.target.checked)}
                    />
                  }
                  label="ESL/ELD"
                />
              </Grid>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.language_iep}
                      onChange={(e) => handleChange('language_iep', e.target.checked)}
                    />
                  }
                  label="IEP"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Language Grade Term 1"
                  fullWidth
                  value={formData.language1}
                  onChange={(e) => handleChange('language1', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Language Grade Term 2"
                  fullWidth
                  value={formData.language2}
                  onChange={(e) => handleChange('language2', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Strengths/Next Steps for Improvement"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.language_comments}
                  onChange={(e) => handleChange('language_comments', e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        )
      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              French
            </Typography>
            {/* Global French N/A */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.french_na}
                  onChange={(e) => handleChange('french_na', e.target.checked)}
                />
              }
              label="French N/A"
            />
            {/* Listening */}
            <Typography variant="subtitle1" gutterBottom>
              Listening
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Listening Term 1"
                  fullWidth
                  value={formData.french_listening1}
                  onChange={(e) => handleChange('french_listening1', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Listening Term 2"
                  fullWidth
                  value={formData.french_listening2}
                  onChange={(e) => handleChange('french_listening2', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.french_listening_esl}
                      onChange={(e) => handleChange('french_listening_esl', e.target.checked)}
                    />
                  }
                  label="Listening ESL/ELD"
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.french_listening_iep}
                      onChange={(e) => handleChange('french_listening_iep', e.target.checked)}
                    />
                  }
                  label="Listening IEP"
                />
              </Grid>
            </Grid>
            {/* Speaking */}
            <Typography variant="subtitle1" gutterBottom>
              Speaking
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Speaking Term 1"
                  fullWidth
                  value={formData.french_speaking1}
                  onChange={(e) => handleChange('french_speaking1', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Speaking Term 2"
                  fullWidth
                  value={formData.french_speaking2}
                  onChange={(e) => handleChange('french_speaking2', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.french_speaking_esl}
                      onChange={(e) => handleChange('french_speaking_esl', e.target.checked)}
                    />
                  }
                  label="Speaking ESL/ELD"
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.french_speaking_iep}
                      onChange={(e) => handleChange('french_speaking_iep', e.target.checked)}
                    />
                  }
                  label="Speaking IEP"
                />
              </Grid>
            </Grid>
            {/* Reading */}
            <Typography variant="subtitle1" gutterBottom>
              Reading
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Reading Term 1"
                  fullWidth
                  value={formData.french_reading1}
                  onChange={(e) => handleChange('french_reading1', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Reading Term 2"
                  fullWidth
                  value={formData.french_reading2}
                  onChange={(e) => handleChange('french_reading2', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.french_reading_esl}
                      onChange={(e) => handleChange('french_reading_esl', e.target.checked)}
                    />
                  }
                  label="Reading ESL/ELD"
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.french_reading_iep}
                      onChange={(e) => handleChange('french_reading_iep', e.target.checked)}
                    />
                  }
                  label="Reading IEP"
                />
              </Grid>
            </Grid>
            {/* Writing */}
            <Typography variant="subtitle1" gutterBottom>
              Writing
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Writing Term 1"
                  fullWidth
                  value={formData.french_writing1}
                  onChange={(e) => handleChange('french_writing1', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Writing Term 2"
                  fullWidth
                  value={formData.french_writing2}
                  onChange={(e) => handleChange('french_writing2', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.french_writing_esl}
                      onChange={(e) => handleChange('french_writing_esl', e.target.checked)}
                    />
                  }
                  label="Writing ESL/ELD"
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.french_writing_iep}
                      onChange={(e) => handleChange('french_writing_iep', e.target.checked)}
                    />
                  }
                  label="Writing IEP"
                />
              </Grid>
            </Grid>
            <Grid container spacing={2} style={{ marginTop: 16 }}>
              <Grid item xs={12}>
                <TextField
                  label="French Comments"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.french_comments}
                  onChange={(e) => handleChange('french_comments', e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        )
      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Native Language
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.native_language_na}
                      onChange={(e) => handleChange('native_language_na', e.target.checked)}
                    />
                  }
                  label="N/A"
                />
              </Grid>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.native_language_esl}
                      onChange={(e) => handleChange('native_language_esl', e.target.checked)}
                    />
                  }
                  label="ESL/ELD"
                />
              </Grid>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.native_language_iep}
                      onChange={(e) => handleChange('native_language_iep', e.target.checked)}
                    />
                  }
                  label="IEP"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Native Language Term 1"
                  fullWidth
                  value={formData.native_language1}
                  onChange={(e) => handleChange('native_language1', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Native Language Term 2"
                  fullWidth
                  value={formData.native_language2}
                  onChange={(e) => handleChange('native_language2', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Teacher's Overall Native Language Grade"
                  fullWidth
                  value={formData.native_language_overall}
                  onChange={(e) => handleChange('native_language_overall', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Native Language Comments"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.native_language_comments}
                  onChange={(e) => handleChange('native_language_comments', e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        )
      case 5:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Mathematics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Mathematics Term 1"
                  fullWidth
                  value={formData.math1}
                  onChange={(e) => handleChange('math1', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Mathematics Term 2"
                  fullWidth
                  value={formData.math2}
                  onChange={(e) => handleChange('math2', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Math Comments"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.math_comments}
                  onChange={(e) => handleChange('math_comments', e.target.value)}
                />
              </Grid>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.math_french}
                      onChange={(e) => handleChange('math_french', e.target.checked)}
                    />
                  }
                  label="French"
                />
              </Grid>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.math_esl}
                      onChange={(e) => handleChange('math_esl', e.target.checked)}
                    />
                  }
                  label="ESL/ELD"
                />
              </Grid>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.math_iep}
                      onChange={(e) => handleChange('math_iep', e.target.checked)}
                    />
                  }
                  label="IEP"
                />
              </Grid>
            </Grid>
          </Box>
        )
      case 6:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Science
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Science Term 1"
                  fullWidth
                  value={formData.science1}
                  onChange={(e) => handleChange('science1', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Science Term 2"
                  fullWidth
                  value={formData.science2}
                  onChange={(e) => handleChange('science2', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Science Comments"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.science_comments}
                  onChange={(e) => handleChange('science_comments', e.target.value)}
                />
              </Grid>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.science_french}
                      onChange={(e) => handleChange('science_french', e.target.checked)}
                    />
                  }
                  label="French"
                />
              </Grid>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.science_esl}
                      onChange={(e) => handleChange('science_esl', e.target.checked)}
                    />
                  }
                  label="ESL/ELD"
                />
              </Grid>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.science_iep}
                      onChange={(e) => handleChange('science_iep', e.target.checked)}
                    />
                  }
                  label="IEP"
                />
              </Grid>
            </Grid>
          </Box>
        )
      case 7:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Social Studies
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Social Studies Term 1"
                  fullWidth
                  value={formData.social_studies1}
                  onChange={(e) => handleChange('social_studies1', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Social Studies Term 2"
                  fullWidth
                  value={formData.social_studies2}
                  onChange={(e) => handleChange('social_studies2', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Social Studies Comments"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.social_studies_comments}
                  onChange={(e) => handleChange('social_studies_comments', e.target.value)}
                />
              </Grid>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.social_studies_french}
                      onChange={(e) => handleChange('social_studies_french', e.target.checked)}
                    />
                  }
                  label="French"
                />
              </Grid>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.social_studies_esl}
                      onChange={(e) => handleChange('social_studies_esl', e.target.checked)}
                    />
                  }
                  label="ESL/ELD"
                />
              </Grid>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.social_studies_iep}
                      onChange={(e) => handleChange('social_studies_iep', e.target.checked)}
                    />
                  }
                  label="IEP"
                />
              </Grid>
            </Grid>
          </Box>
        )
      case 8:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Health & Physical Education
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Health Term 1"
                  fullWidth
                  value={formData.health1}
                  onChange={(e) => handleChange('health1', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Health Term 2"
                  fullWidth
                  value={formData.health2}
                  onChange={(e) => handleChange('health2', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="PE Term 1"
                  fullWidth
                  value={formData.pe1}
                  onChange={(e) => handleChange('pe1', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="PE Term 2"
                  fullWidth
                  value={formData.pe2}
                  onChange={(e) => handleChange('pe2', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Health/PE Comments"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.health_pe_comments}
                  onChange={(e) => handleChange('health_pe_comments', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle1">Health Checkboxes</Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.health_french}
                      onChange={(e) => handleChange('health_french', e.target.checked)}
                    />
                  }
                  label="French"
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.health_esl}
                      onChange={(e) => handleChange('health_esl', e.target.checked)}
                    />
                  }
                  label="ESL/ELD"
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.health_iep}
                      onChange={(e) => handleChange('health_iep', e.target.checked)}
                    />
                  }
                  label="IEP"
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle1">PE Checkboxes</Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.pe_french}
                      onChange={(e) => handleChange('pe_french', e.target.checked)}
                    />
                  }
                  label="French"
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.pe_esl}
                      onChange={(e) => handleChange('pe_esl', e.target.checked)}
                    />
                  }
                  label="ESL/ELD"
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.pe_iep}
                      onChange={(e) => handleChange('pe_iep', e.target.checked)}
                    />
                  }
                  label="IEP"
                />
              </Grid>
            </Grid>
          </Box>
        )
      case 9:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              The Arts
            </Typography>
            <Grid container spacing={2}>
              {/* Dance */}
              <Grid item xs={6}>
                <TextField
                  label="Dance Term 1"
                  fullWidth
                  value={formData.dance1}
                  onChange={(e) => handleChange('dance1', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Dance Term 2"
                  fullWidth
                  value={formData.dance2}
                  onChange={(e) => handleChange('dance2', e.target.value)}
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.dance_french}
                      onChange={(e) => handleChange('dance_french', e.target.checked)}
                    />
                  }
                  label="French"
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.dance_esl}
                      onChange={(e) => handleChange('dance_esl', e.target.checked)}
                    />
                  }
                  label="ESL/ELD"
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.dance_iep}
                      onChange={(e) => handleChange('dance_iep', e.target.checked)}
                    />
                  }
                  label="IEP"
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.dance_na}
                      onChange={(e) => handleChange('dance_na', e.target.checked)}
                    />
                  }
                  label="N/A"
                />
              </Grid>
              {/* Drama */}
              <Grid item xs={6}>
                <TextField
                  label="Drama Term 1"
                  fullWidth
                  value={formData.drama1}
                  onChange={(e) => handleChange('drama1', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Drama Term 2"
                  fullWidth
                  value={formData.drama2}
                  onChange={(e) => handleChange('drama2', e.target.value)}
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.drama_french}
                      onChange={(e) => handleChange('drama_french', e.target.checked)}
                    />
                  }
                  label="French"
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.drama_esl}
                      onChange={(e) => handleChange('drama_esl', e.target.checked)}
                    />
                  }
                  label="ESL/ELD"
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.drama_iep}
                      onChange={(e) => handleChange('drama_iep', e.target.checked)}
                    />
                  }
                  label="IEP"
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.drama_na}
                      onChange={(e) => handleChange('drama_na', e.target.checked)}
                    />
                  }
                  label="N/A"
                />
              </Grid>
              {/* Music */}
              <Grid item xs={6}>
                <TextField
                  label="Music Term 1"
                  fullWidth
                  value={formData.music1}
                  onChange={(e) => handleChange('music1', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Music Term 2"
                  fullWidth
                  value={formData.music2}
                  onChange={(e) => handleChange('music2', e.target.value)}
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.music_french}
                      onChange={(e) => handleChange('music_french', e.target.checked)}
                    />
                  }
                  label="French"
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.music_esl}
                      onChange={(e) => handleChange('music_esl', e.target.checked)}
                    />
                  }
                  label="ESL/ELD"
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.music_iep}
                      onChange={(e) => handleChange('music_iep', e.target.checked)}
                    />
                  }
                  label="IEP"
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.music_na}
                      onChange={(e) => handleChange('music_na', e.target.checked)}
                    />
                  }
                  label="N/A"
                />
              </Grid>
              {/* Visual Arts */}
              <Grid item xs={6}>
                <TextField
                  label="Visual Arts Term 1"
                  fullWidth
                  value={formData.visual_arts1}
                  onChange={(e) => handleChange('visual_arts1', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Visual Arts Term 2"
                  fullWidth
                  value={formData.visual_arts2}
                  onChange={(e) => handleChange('visual_arts2', e.target.value)}
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.visual_arts_french}
                      onChange={(e) => handleChange('visual_arts_french', e.target.checked)}
                    />
                  }
                  label="French"
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.visual_arts_esl}
                      onChange={(e) => handleChange('visual_arts_esl', e.target.checked)}
                    />
                  }
                  label="ESL/ELD"
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.visual_arts_iep}
                      onChange={(e) => handleChange('visual_arts_iep', e.target.checked)}
                    />
                  }
                  label="IEP"
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.visual_arts_na}
                      onChange={(e) => handleChange('visual_arts_na', e.target.checked)}
                    />
                  }
                  label="N/A"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Arts Comments"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.visual_arts_comments}
                  onChange={(e) => handleChange('visual_arts_comments', e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        )
      case 10:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Comments & Signatures
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Student – My best work is:"
                  fullWidth
                  value={formData.best_work}
                  onChange={(e) => handleChange('best_work', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Student – My goal for improvement is:"
                  fullWidth
                  value={formData.improvement_goal}
                  onChange={(e) => handleChange('improvement_goal', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Parent/Guardian – My child has improved most in:"
                  fullWidth
                  value={formData.parent_improved}
                  onChange={(e) => handleChange('parent_improved', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Parent/Guardian – I will help my child to:"
                  fullWidth
                  value={formData.parent_help}
                  onChange={(e) => handleChange('parent_help', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Teacher's Signature"
                  fullWidth
                  value={formData.teacher_signature}
                  onChange={(e) => handleChange('teacher_signature', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Parent/Guardian's Signature"
                  fullWidth
                  value={formData.parent_signature}
                  onChange={(e) => handleChange('parent_signature', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Principal's Signature"
                  fullWidth
                  value={formData.principal_signature}
                  onChange={(e) => handleChange('principal_signature', e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        )
      default:
        return <div>Unknown Step</div>
    }
  }

  const [activeStep, setActiveStep] = useState(0)

  return (
    <Box padding="20px">
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box marginTop={4}>{renderStepContent(activeStep)}</Box>
      <Box marginTop={2} display="flex" justifyContent="space-between">
        <Button disabled={activeStep === 0} onClick={handleBack}>
          Back
        </Button>
        {activeStep < steps.length - 1 ? (
          <Button variant="contained" onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button variant="contained" onClick={handleCreateReportCard}>
            Create Report Card
          </Button>
        )}
      </Box>
    </Box>
  )
}

export default ReportCardForm
