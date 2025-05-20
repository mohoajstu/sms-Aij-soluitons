import React, { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import reportCardPDF from '../../assets/ReportCards/kindergarden-report-card.pdf'
import './reportCardForm.css'

const ReportCardForm = () => {
  // Define the steps (1-indexed)
  const steps = [
    'Information',
    'Learning Skills',
    'Languages',
    'French',
    'Native Language',
    'Mathematics',
    'Science',
    'Social Studies',
    'Health & PE',
    'The Arts',
    'Signatures',
  ]
  const totalSteps = steps.length

  // 1. STATE VARIABLES – initialize all form fields
  const [formData, setFormData] = useState({
    // Step 1: Student Information
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
    // Step 2: Learning Skills & Work Habits
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
    // Step 3: Languages (generic)
    language1: '',
    language2: '',
    language_comments: '',
    language_na: false,
    language_esl: false,
    language_iep: false,
    // Step 4: French
    french_na: false,
    french_listening1: '',
    french_listening2: '',
    french_listening_esl: false,
    french_listening_iep: false,
    french_speaking1: '',
    french_speaking2: '',
    french_speaking_esl: false,
    french_speaking_iep: false,
    french_reading1: '',
    french_reading2: '',
    french_reading_esl: false,
    french_reading_iep: false,
    french_writing1: '',
    french_writing2: '',
    french_writing_esl: false,
    french_writing_iep: false,
    french_comments: '',
    // Step 5: Native Language
    native_language: '',
    native_language1: '',
    native_language2: '',
    native_language_overall: '',
    native_language_na: false,
    native_language_esl: false,
    native_language_iep: false,
    native_language_comments: '',
    // Step 6: Mathematics
    math1: '',
    math2: '',
    math_comments: '',
    math_french: false,
    math_esl: false,
    math_iep: false,
    // Step 7: Science
    science1: '',
    science2: '',
    science_comments: '',
    science_french: false,
    science_esl: false,
    science_iep: false,
    // Step 8: Social Studies
    social_studies1: '',
    social_studies2: '',
    social_studies_comments: '',
    social_studies_french: false,
    social_studies_esl: false,
    social_studies_iep: false,
    // Step 9: Health & PE
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
    // Step 10: The Arts – Dance
    dance1: '',
    dance2: '',
    dance_french: false,
    dance_esl: false,
    dance_iep: false,
    dance_na: false,
    // The Arts – Drama
    drama1: '',
    drama2: '',
    drama_french: false,
    drama_esl: false,
    drama_iep: false,
    drama_na: false,
    // The Arts – Music
    music1: '',
    music2: '',
    music_french: false,
    music_esl: false,
    music_iep: false,
    music_na: false,
    // The Arts – Visual Arts
    visual_arts1: '',
    visual_arts2: '',
    visual_arts_french: false,
    visual_arts_esl: false,
    visual_arts_iep: false,
    visual_arts_na: false,
    visual_arts_comments: '',
    // Step 11: Comments & Signatures
    best_work: '',
    improvement_goal: '',
    parent_improved: '',
    parent_help: '',
    teacher_signature: '',
    parent_signature: '',
    principal_signature: '',
  })

  const [currentStep, setCurrentStep] = useState(1)

  // Update field values
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Navigation Handlers
  const handleNextStep = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Helper to update PDF fields
  const safeSetTextField = (form, fieldName, value) => {
    try {
      const field = form.getTextField(fieldName)
      field.setText(value || '')
    } catch (error) {
      console.warn(`Unable to set text for field "${fieldName}":`, error)
    }
  }

  // PDF Generation on form submission
  const handleCreateReportCard = async (e) => {
    e.preventDefault()
    try {
      const existingPdfBytes = await fetch(reportCardPDF).then((res) => res.arrayBuffer())
      const pdfDoc = await PDFDocument.load(existingPdfBytes)
      const form = pdfDoc.getForm()

      // === Step 1: Student Information ===
      safeSetTextField(form, 'student', formData.student)
      safeSetTextField(form, 'date', formData.date)
      safeSetTextField(form, 'oen', formData.oen)
      safeSetTextField(form, 'grade', formData.grade)
      safeSetTextField(form, 'days_absent', formData.days_absent)
      safeSetTextField(form, 'total_days_absent', formData.total_days_absent)
      safeSetTextField(form, 'times_late', formData.times_late)
      safeSetTextField(form, 'total_times_late', formData.total_times_late)
      safeSetTextField(form, 'board', formData.board)
      safeSetTextField(form, 'board_address', formData.board_address)
      safeSetTextField(form, 'school', formData.school)
      safeSetTextField(form, 'school_address', formData.school_address)
      safeSetTextField(form, 'teacher', formData.teacher)
      safeSetTextField(form, 'principal', formData.principal)
      safeSetTextField(form, 'phone_number', formData.phone_number)

      // === Step 2: Learning Skills & Work Habits ===
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

      // === Step 3: Languages ===
      safeSetTextField(form, 'language1', formData.language1)
      safeSetTextField(form, 'language2', formData.language2)
      safeSetTextField(form, 'language_comments', formData.language_comments)
      if (formData.language_na) form.getCheckBox('language_na').check()
      if (formData.language_esl) form.getCheckBox('language_esl').check()
      if (formData.language_iep) form.getCheckBox('language_iep').check()

      // === Step 4: French ===
      if (formData.french_na) form.getCheckBox('french_na').check()
      safeSetTextField(form, 'french_listening1', formData.french_listening1)
      safeSetTextField(form, 'french_listening2', formData.french_listening2)
      if (formData.french_listening_esl) form.getCheckBox('french_listening_esl').check()
      if (formData.french_listening_iep) form.getCheckBox('french_listening_iep').check()
      safeSetTextField(form, 'french_speaking1', formData.french_speaking1)
      safeSetTextField(form, 'french_speaking2', formData.french_speaking2)
      if (formData.french_speaking_esl) form.getCheckBox('french_speaking_esl').check()
      if (formData.french_speaking_iep) form.getCheckBox('french_speaking_iep').check()
      safeSetTextField(form, 'french_reading1', formData.french_reading1)
      safeSetTextField(form, 'french_reading2', formData.french_reading2)
      if (formData.french_reading_esl) form.getCheckBox('french_reading_esl').check()
      if (formData.french_reading_iep) form.getCheckBox('french_reading_iep').check()
      safeSetTextField(form, 'french_writing1', formData.french_writing1)
      safeSetTextField(form, 'french_writing2', formData.french_writing2)
      if (formData.french_writing_esl) form.getCheckBox('french_writing_esl').check()
      if (formData.french_writing_iep) form.getCheckBox('french_writing_iep').check()
      safeSetTextField(form, 'french_comments', formData.french_comments)

      // === Step 5: Native Language ===
      safeSetTextField(form, 'native_language', formData.native_language)
      safeSetTextField(form, 'native_language1', formData.native_language1)
      safeSetTextField(form, 'native_language2', formData.native_language2)
      safeSetTextField(form, 'native_language_overall', formData.native_language_overall)
      safeSetTextField(form, 'native_language_comments', formData.native_language_comments)
      if (formData.native_language_na) form.getCheckBox('native_language_na').check()
      if (formData.native_language_esl) form.getCheckBox('native_language_esl').check()
      if (formData.native_language_iep) form.getCheckBox('native_language_iep').check()

      // === Step 6: Mathematics ===
      safeSetTextField(form, 'math1', formData.math1)
      safeSetTextField(form, 'math2', formData.math2)
      safeSetTextField(form, 'math_comments', formData.math_comments)
      if (formData.math_french) form.getCheckBox('math_french').check()
      if (formData.math_esl) form.getCheckBox('math_esl').check()
      if (formData.math_iep) form.getCheckBox('math_iep').check()

      // === Step 7: Science ===
      safeSetTextField(form, 'science1', formData.science1)
      safeSetTextField(form, 'science2', formData.science2)
      safeSetTextField(form, 'science_comments', formData.science_comments)
      if (formData.science_french) form.getCheckBox('science_french').check()
      if (formData.science_esl) form.getCheckBox('science_esl').check()
      if (formData.science_iep) form.getCheckBox('science_iep').check()

      // === Step 8: Social Studies ===
      safeSetTextField(form, 'social_studies1', formData.social_studies1)
      safeSetTextField(form, 'social_studies2', formData.social_studies2)
      safeSetTextField(form, 'social_studies_comments', formData.social_studies_comments)
      if (formData.social_studies_french) form.getCheckBox('social_studies_french').check()
      if (formData.social_studies_esl) form.getCheckBox('social_studies_esl').check()
      if (formData.social_studies_iep) form.getCheckBox('social_studies_iep').check()

      // === Step 9: Health & PE ===
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

      // === Step 10: The Arts ===
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

      // === Step 11: Comments & Signatures ===
      safeSetTextField(form, 'best_work', formData.best_work)
      safeSetTextField(form, 'improvement_goal', formData.improvement_goal)
      safeSetTextField(form, 'parent_improved', formData.parent_improved)
      safeSetTextField(form, 'parent_help', formData.parent_help)
      safeSetTextField(form, 'teacher_signature', formData.teacher_signature)
      safeSetTextField(form, 'parent_signature', formData.parent_signature)
      safeSetTextField(form, 'principal_signature', formData.principal_signature)

      // Save PDF and trigger download
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

  // 2. RENDER STEP CONTENT – each case represents a full form section
  const renderStepContent = (step) => {
    switch (step) {
      case 1:
        return (
          <section className="form-section">
            <h2>Student Information</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Student Name</label>
                <input
                  type="text"
                  value={formData.student}
                  onChange={(e) => handleChange('student', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="text"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>OEN</label>
                <input
                  type="text"
                  value={formData.oen}
                  onChange={(e) => handleChange('oen', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Grade</label>
                <input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => handleChange('grade', e.target.value)}
                />
              </div>
            </div>
            <div className="term-row">
              <label>Days Absent:</label>
              <input
                type="text"
                value={formData.days_absent}
                onChange={(e) => handleChange('days_absent', e.target.value)}
              />
              <label>Total Days Absent:</label>
              <input
                type="text"
                value={formData.total_days_absent}
                onChange={(e) => handleChange('total_days_absent', e.target.value)}
              />
            </div>
            <div className="term-row">
              <label>Times Late:</label>
              <input
                type="text"
                value={formData.times_late}
                onChange={(e) => handleChange('times_late', e.target.value)}
              />
              <label>Total Times Late:</label>
              <input
                type="text"
                value={formData.total_times_late}
                onChange={(e) => handleChange('total_times_late', e.target.value)}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Board</label>
                <input
                  type="text"
                  value={formData.board}
                  onChange={(e) => handleChange('board', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Board Address</label>
                <input
                  type="text"
                  value={formData.board_address}
                  onChange={(e) => handleChange('board_address', e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>School</label>
                <input
                  type="text"
                  value={formData.school}
                  onChange={(e) => handleChange('school', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>School Address</label>
                <input
                  type="text"
                  value={formData.school_address}
                  onChange={(e) => handleChange('school_address', e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Teacher</label>
                <input
                  type="text"
                  value={formData.teacher}
                  onChange={(e) => handleChange('teacher', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Principal</label>
                <input
                  type="text"
                  value={formData.principal}
                  onChange={(e) => handleChange('principal', e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                value={formData.phone_number}
                onChange={(e) => handleChange('phone_number', e.target.value)}
              />
            </div>
          </section>
        )
      case 2:
        return (
          <section className="form-section">
            <h2>Learning Skills & Work Habits</h2>
            <div className="term-row">
              <label>Responsibility (Term 1):</label>
              <input
                type="text"
                value={formData.responsibility1}
                onChange={(e) => handleChange('responsibility1', e.target.value)}
              />
              <label>Responsibility (Term 2):</label>
              <input
                type="text"
                value={formData.responsibility2}
                onChange={(e) => handleChange('responsibility2', e.target.value)}
              />
            </div>
            <div className="term-row">
              <label>Organization (Term 1):</label>
              <input
                type="text"
                value={formData.organization1}
                onChange={(e) => handleChange('organization1', e.target.value)}
              />
              <label>Organization (Term 2):</label>
              <input
                type="text"
                value={formData.organization2}
                onChange={(e) => handleChange('organization2', e.target.value)}
              />
            </div>
            <div className="term-row">
              <label>Independent Work (Term 1):</label>
              <input
                type="text"
                value={formData.independent_work1}
                onChange={(e) => handleChange('independent_work1', e.target.value)}
              />
              <label>Independent Work (Term 2):</label>
              <input
                type="text"
                value={formData.independent_work2}
                onChange={(e) => handleChange('independent_work2', e.target.value)}
              />
            </div>
            <div className="term-row">
              <label>Collaboration (Term 1):</label>
              <input
                type="text"
                value={formData.collaboration1}
                onChange={(e) => handleChange('collaboration1', e.target.value)}
              />
              <label>Collaboration (Term 2):</label>
              <input
                type="text"
                value={formData.collaboration2}
                onChange={(e) => handleChange('collaboration2', e.target.value)}
              />
            </div>
            <div className="term-row">
              <label>Initiative (Term 1):</label>
              <input
                type="text"
                value={formData.initiative1}
                onChange={(e) => handleChange('initiative1', e.target.value)}
              />
              <label>Initiative (Term 2):</label>
              <input
                type="text"
                value={formData.initiative2}
                onChange={(e) => handleChange('initiative2', e.target.value)}
              />
            </div>
            <div className="term-row">
              <label>Self-Regulation (Term 1):</label>
              <input
                type="text"
                value={formData.self_regulation1}
                onChange={(e) => handleChange('self_regulation1', e.target.value)}
              />
              <label>Self-Regulation (Term 2):</label>
              <input
                type="text"
                value={formData.self_regulation2}
                onChange={(e) => handleChange('self_regulation2', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Strengths/Next Steps for Improvement</label>
              <textarea
                value={formData.lswh_comments}
                onChange={(e) => handleChange('lswh_comments', e.target.value)}
              />
            </div>
          </section>
        )
      case 3:
        return (
          <section className="form-section">
            <h2>Languages</h2>
            <div className="form-group-inline">
              <label>
                <input
                  type="checkbox"
                  checked={formData.language_na}
                  onChange={(e) => handleChange('language_na', e.target.checked)}
                />
                N/A
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.language_esl}
                  onChange={(e) => handleChange('language_esl', e.target.checked)}
                />
                ESL/ELD
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.language_iep}
                  onChange={(e) => handleChange('language_iep', e.target.checked)}
                />
                IEP
              </label>
            </div>
            <div className="term-row">
              <label>Language Grade Term 1:</label>
              <input
                type="text"
                value={formData.language1}
                onChange={(e) => handleChange('language1', e.target.value)}
              />
              <label>Language Grade Term 2:</label>
              <input
                type="text"
                value={formData.language2}
                onChange={(e) => handleChange('language2', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Strengths/Next Steps for Improvement</label>
              <textarea
                value={formData.language_comments}
                onChange={(e) => handleChange('language_comments', e.target.value)}
              />
            </div>
          </section>
        )
      case 4:
        return (
          <section className="form-section">
            <h2>French</h2>
            <div className="form-group-inline">
              <label>
                <input
                  type="checkbox"
                  checked={formData.french_na}
                  onChange={(e) => handleChange('french_na', e.target.checked)}
                />
                French N/A
              </label>
            </div>
            <h3>Listening</h3>
            <div className="term-row">
              <label>Listening Term 1:</label>
              <input
                type="text"
                value={formData.french_listening1}
                onChange={(e) => handleChange('french_listening1', e.target.value)}
              />
              <label>Listening Term 2:</label>
              <input
                type="text"
                value={formData.french_listening2}
                onChange={(e) => handleChange('french_listening2', e.target.value)}
              />
            </div>
            <div className="form-group-inline">
              <label>
                <input
                  type="checkbox"
                  checked={formData.french_listening_esl}
                  onChange={(e) => handleChange('french_listening_esl', e.target.checked)}
                />
                ESL/ELD
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.french_listening_iep}
                  onChange={(e) => handleChange('french_listening_iep', e.target.checked)}
                />
                IEP
              </label>
            </div>
            <h3>Speaking</h3>
            <div className="term-row">
              <label>Speaking Term 1:</label>
              <input
                type="text"
                value={formData.french_speaking1}
                onChange={(e) => handleChange('french_speaking1', e.target.value)}
              />
              <label>Speaking Term 2:</label>
              <input
                type="text"
                value={formData.french_speaking2}
                onChange={(e) => handleChange('french_speaking2', e.target.value)}
              />
            </div>
            <div className="form-group-inline">
              <label>
                <input
                  type="checkbox"
                  checked={formData.french_speaking_esl}
                  onChange={(e) => handleChange('french_speaking_esl', e.target.checked)}
                />
                ESL/ELD
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.french_speaking_iep}
                  onChange={(e) => handleChange('french_speaking_iep', e.target.checked)}
                />
                IEP
              </label>
            </div>
            <h3>Reading</h3>
            <div className="term-row">
              <label>Reading Term 1:</label>
              <input
                type="text"
                value={formData.french_reading1}
                onChange={(e) => handleChange('french_reading1', e.target.value)}
              />
              <label>Reading Term 2:</label>
              <input
                type="text"
                value={formData.french_reading2}
                onChange={(e) => handleChange('french_reading2', e.target.value)}
              />
            </div>
            <div className="form-group-inline">
              <label>
                <input
                  type="checkbox"
                  checked={formData.french_reading_esl}
                  onChange={(e) => handleChange('french_reading_esl', e.target.checked)}
                />
                ESL/ELD
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.french_reading_iep}
                  onChange={(e) => handleChange('french_reading_iep', e.target.checked)}
                />
                IEP
              </label>
            </div>
            <h3>Writing</h3>
            <div className="term-row">
              <label>Writing Term 1:</label>
              <input
                type="text"
                value={formData.french_writing1}
                onChange={(e) => handleChange('french_writing1', e.target.value)}
              />
              <label>Writing Term 2:</label>
              <input
                type="text"
                value={formData.french_writing2}
                onChange={(e) => handleChange('french_writing2', e.target.value)}
              />
            </div>
            <div className="form-group-inline">
              <label>
                <input
                  type="checkbox"
                  checked={formData.french_writing_esl}
                  onChange={(e) => handleChange('french_writing_esl', e.target.checked)}
                />
                ESL/ELD
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.french_writing_iep}
                  onChange={(e) => handleChange('french_writing_iep', e.target.checked)}
                />
                IEP
              </label>
            </div>
            <div className="form-group">
              <label>French Comments</label>
              <textarea
                value={formData.french_comments}
                onChange={(e) => handleChange('french_comments', e.target.value)}
              />
            </div>
          </section>
        )
      case 5:
        return (
          <section className="form-section">
            <h2>Native Language</h2>
            <div className="form-group-inline">
              <label>
                <input
                  type="checkbox"
                  checked={formData.native_language_na}
                  onChange={(e) => handleChange('native_language_na', e.target.checked)}
                />
                N/A
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.native_language_esl}
                  onChange={(e) => handleChange('native_language_esl', e.target.checked)}
                />
                ESL/ELD
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.native_language_iep}
                  onChange={(e) => handleChange('native_language_iep', e.target.checked)}
                />
                IEP
              </label>
            </div>
            <div className="form-group">
              <label>Native Language Title</label>
              <input
                type="text"
                value={formData.native_language}
                onChange={(e) => handleChange('native_language', e.target.value)}
              />
            </div>
            <div className="term-row">
              <label>Native Language Term 1:</label>
              <input
                type="text"
                value={formData.native_language1}
                onChange={(e) => handleChange('native_language1', e.target.value)}
              />
              <label>Native Language Term 2:</label>
              <input
                type="text"
                value={formData.native_language2}
                onChange={(e) => handleChange('native_language2', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Teacher's Overall Native Language Grade</label>
              <input
                type="text"
                value={formData.native_language_overall}
                onChange={(e) => handleChange('native_language_overall', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Native Language Comments</label>
              <textarea
                value={formData.native_language_comments}
                onChange={(e) => handleChange('native_language_comments', e.target.value)}
              />
            </div>
          </section>
        )
      case 6:
        return (
          <section className="form-section">
            <h2>Mathematics</h2>
            <div className="form-group-inline">
              <label>
                <input
                  type="checkbox"
                  checked={formData.math_french}
                  onChange={(e) => handleChange('math_french', e.target.checked)}
                />
                French
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.math_esl}
                  onChange={(e) => handleChange('math_esl', e.target.checked)}
                />
                ESL/ELD
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.math_iep}
                  onChange={(e) => handleChange('math_iep', e.target.checked)}
                />
                IEP
              </label>
            </div>
            <div className="term-row">
              <label>Mathematics Term 1:</label>
              <input
                type="text"
                value={formData.math1}
                onChange={(e) => handleChange('math1', e.target.value)}
              />
              <label>Mathematics Term 2:</label>
              <input
                type="text"
                value={formData.math2}
                onChange={(e) => handleChange('math2', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Math Comments</label>
              <textarea
                value={formData.math_comments}
                onChange={(e) => handleChange('math_comments', e.target.value)}
              />
            </div>
          </section>
        )
      case 7:
        return (
          <section className="form-section">
            <h2>Science</h2>
            <div className="form-group-inline">
              <label>
                <input
                  type="checkbox"
                  checked={formData.science_french}
                  onChange={(e) => handleChange('science_french', e.target.checked)}
                />
                French
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.science_esl}
                  onChange={(e) => handleChange('science_esl', e.target.checked)}
                />
                ESL/ELD
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.science_iep}
                  onChange={(e) => handleChange('science_iep', e.target.checked)}
                />
                IEP
              </label>
            </div>
            <div className="term-row">
              <label>Science Term 1:</label>
              <input
                type="text"
                value={formData.science1}
                onChange={(e) => handleChange('science1', e.target.value)}
              />
              <label>Science Term 2:</label>
              <input
                type="text"
                value={formData.science2}
                onChange={(e) => handleChange('science2', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Science Comments</label>
              <textarea
                value={formData.science_comments}
                onChange={(e) => handleChange('science_comments', e.target.value)}
              />
            </div>
          </section>
        )
      case 8:
        return (
          <section className="form-section">
            <h2>Social Studies</h2>
            <div className="form-group-inline">
              <label>
                <input
                  type="checkbox"
                  checked={formData.social_studies_french}
                  onChange={(e) => handleChange('social_studies_french', e.target.checked)}
                />
                French
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.social_studies_esl}
                  onChange={(e) => handleChange('social_studies_esl', e.target.checked)}
                />
                ESL/ELD
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.social_studies_iep}
                  onChange={(e) => handleChange('social_studies_iep', e.target.checked)}
                />
                IEP
              </label>
            </div>
            <div className="term-row">
              <label>Social Studies Term 1:</label>
              <input
                type="text"
                value={formData.social_studies1}
                onChange={(e) => handleChange('social_studies1', e.target.value)}
              />
              <label>Social Studies Term 2:</label>
              <input
                type="text"
                value={formData.social_studies2}
                onChange={(e) => handleChange('social_studies2', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Social Studies Comments</label>
              <textarea
                value={formData.social_studies_comments}
                onChange={(e) => handleChange('social_studies_comments', e.target.value)}
              />
            </div>
          </section>
        )
      case 9:
        return (
          <section className="form-section">
            <h2>Health & PE</h2>
            <h3>Health</h3>
            <div className="form-group-inline">
              <label>
                <input
                  type="checkbox"
                  checked={formData.health_french}
                  onChange={(e) => handleChange('health_french', e.target.checked)}
                />
                Health French
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.health_esl}
                  onChange={(e) => handleChange('health_esl', e.target.checked)}
                />
                Health ESL/ELD
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.health_iep}
                  onChange={(e) => handleChange('health_iep', e.target.checked)}
                />
                Health IEP
              </label>
            </div>
            <div className="term-row">
              <label>Health Term 1:</label>
              <input
                type="text"
                value={formData.health1}
                onChange={(e) => handleChange('health1', e.target.value)}
              />
              <label>Health Term 2:</label>
              <input
                type="text"
                value={formData.health2}
                onChange={(e) => handleChange('health2', e.target.value)}
              />
            </div>
            <h3>Physical Education</h3>
            <div className="form-group-inline">
              <label>
                <input
                  type="checkbox"
                  checked={formData.pe_french}
                  onChange={(e) => handleChange('pe_french', e.target.checked)}
                />
                PE French
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.pe_esl}
                  onChange={(e) => handleChange('pe_esl', e.target.checked)}
                />
                PE ESL/ELD
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.pe_iep}
                  onChange={(e) => handleChange('pe_iep', e.target.checked)}
                />
                PE IEP
              </label>
            </div>
            <div className="term-row">
              <label>PE Term 1:</label>
              <input
                type="text"
                value={formData.pe1}
                onChange={(e) => handleChange('pe1', e.target.value)}
              />
              <label>PE Term 2:</label>
              <input
                type="text"
                value={formData.pe2}
                onChange={(e) => handleChange('pe2', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Health/PE Comments</label>
              <textarea
                value={formData.health_pe_comments}
                onChange={(e) => handleChange('health_pe_comments', e.target.value)}
              />
            </div>
          </section>
        )
      case 10:
        return (
          <section className="form-section">
            <h2>The Arts</h2>
            <h3>Dance</h3>
            <div className="form-group-inline">
              <label>
                <input
                  type="checkbox"
                  checked={formData.dance_french}
                  onChange={(e) => handleChange('dance_french', e.target.checked)}
                />
                Dance French
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.dance_esl}
                  onChange={(e) => handleChange('dance_esl', e.target.checked)}
                />
                Dance ESL/ELD
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.dance_iep}
                  onChange={(e) => handleChange('dance_iep', e.target.checked)}
                />
                Dance IEP
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.dance_na}
                  onChange={(e) => handleChange('dance_na', e.target.checked)}
                />
                Dance N/A
              </label>
            </div>
            <div className="term-row">
              <label>Dance Term 1:</label>
              <input
                type="text"
                value={formData.dance1}
                onChange={(e) => handleChange('dance1', e.target.value)}
              />
              <label>Dance Term 2:</label>
              <input
                type="text"
                value={formData.dance2}
                onChange={(e) => handleChange('dance2', e.target.value)}
              />
            </div>
            <h3>Drama</h3>
            <div className="form-group-inline">
              <label>
                <input
                  type="checkbox"
                  checked={formData.drama_french}
                  onChange={(e) => handleChange('drama_french', e.target.checked)}
                />
                Drama French
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.drama_esl}
                  onChange={(e) => handleChange('drama_esl', e.target.checked)}
                />
                Drama ESL/ELD
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.drama_iep}
                  onChange={(e) => handleChange('drama_iep', e.target.checked)}
                />
                Drama IEP
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.drama_na}
                  onChange={(e) => handleChange('drama_na', e.target.checked)}
                />
                Drama N/A
              </label>
            </div>
            <div className="term-row">
              <label>Drama Term 1:</label>
              <input
                type="text"
                value={formData.drama1}
                onChange={(e) => handleChange('drama1', e.target.value)}
              />
              <label>Drama Term 2:</label>
              <input
                type="text"
                value={formData.drama2}
                onChange={(e) => handleChange('drama2', e.target.value)}
              />
            </div>
            <h3>Music</h3>
            <div className="form-group-inline">
              <label>
                <input
                  type="checkbox"
                  checked={formData.music_french}
                  onChange={(e) => handleChange('music_french', e.target.checked)}
                />
                Music French
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.music_esl}
                  onChange={(e) => handleChange('music_esl', e.target.checked)}
                />
                Music ESL/ELD
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.music_iep}
                  onChange={(e) => handleChange('music_iep', e.target.checked)}
                />
                Music IEP
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.music_na}
                  onChange={(e) => handleChange('music_na', e.target.checked)}
                />
                Music N/A
              </label>
            </div>
            <div className="term-row">
              <label>Music Term 1:</label>
              <input
                type="text"
                value={formData.music1}
                onChange={(e) => handleChange('music1', e.target.value)}
              />
              <label>Music Term 2:</label>
              <input
                type="text"
                value={formData.music2}
                onChange={(e) => handleChange('music2', e.target.value)}
              />
            </div>
            <h3>Visual Arts</h3>
            <div className="form-group-inline">
              <label>
                <input
                  type="checkbox"
                  checked={formData.visual_arts_french}
                  onChange={(e) => handleChange('visual_arts_french', e.target.checked)}
                />
                Visual Arts French
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.visual_arts_esl}
                  onChange={(e) => handleChange('visual_arts_esl', e.target.checked)}
                />
                Visual Arts ESL/ELD
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.visual_arts_iep}
                  onChange={(e) => handleChange('visual_arts_iep', e.target.checked)}
                />
                Visual Arts IEP
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.visual_arts_na}
                  onChange={(e) => handleChange('visual_arts_na', e.target.checked)}
                />
                Visual Arts N/A
              </label>
            </div>
            <div className="term-row">
              <label>Visual Arts Term 1:</label>
              <input
                type="text"
                value={formData.visual_arts1}
                onChange={(e) => handleChange('visual_arts1', e.target.value)}
              />
              <label>Visual Arts Term 2:</label>
              <input
                type="text"
                value={formData.visual_arts2}
                onChange={(e) => handleChange('visual_arts2', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Arts Comments</label>
              <textarea
                value={formData.visual_arts_comments}
                onChange={(e) => handleChange('visual_arts_comments', e.target.value)}
              />
            </div>
          </section>
        )
      case 11:
        return (
          <section className="form-section">
            <h2>Comments & Signatures</h2>
            <div className="form-group">
              <label>Student – My best work is:</label>
              <input
                type="text"
                value={formData.best_work}
                onChange={(e) => handleChange('best_work', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Student – My goal for improvement is:</label>
              <input
                type="text"
                value={formData.improvement_goal}
                onChange={(e) => handleChange('improvement_goal', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Parent/Guardian – My child has improved most in:</label>
              <input
                type="text"
                value={formData.parent_improved}
                onChange={(e) => handleChange('parent_improved', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Parent/Guardian – I will help my child to:</label>
              <input
                type="text"
                value={formData.parent_help}
                onChange={(e) => handleChange('parent_help', e.target.value)}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Teacher's Signature</label>
                <input
                  type="text"
                  value={formData.teacher_signature}
                  onChange={(e) => handleChange('teacher_signature', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Parent/Guardian's Signature</label>
                <input
                  type="text"
                  value={formData.parent_signature}
                  onChange={(e) => handleChange('parent_signature', e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Principal's Signature</label>
              <input
                type="text"
                value={formData.principal_signature}
                onChange={(e) => handleChange('principal_signature', e.target.value)}
              />
            </div>
          </section>
        )
      default:
        return <div>Unknown Step</div>
    }
  }

  // 3. RENDER – container, progress indicator, and navigation buttons
  return (
    <div className="registration-page-container">
      <h1 className="page-title">Report Card Form</h1>

      {/* Progress Indicator */}
      <div className="progress-indicator">
        {steps.map((label, index) => {
          const stepNumber = index + 1
          return (
            <div
              key={stepNumber}
              className={`progress-step ${currentStep >= stepNumber ? 'active' : ''}`}
            >
              <div className="step-number">{stepNumber}</div>
              <div className="step-label">{label}</div>
            </div>
          )
        })}
      </div>

      <form className="registration-form" onSubmit={handleCreateReportCard}>
        {renderStepContent(currentStep)}

        {/* Navigation Buttons */}
        <div
          className="form-navigation"
          style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}
        >
          {currentStep > 1 && (
            <button type="button" className="navigation-button" onClick={handlePrevStep}>
              Previous
            </button>
          )}
          {currentStep < totalSteps ? (
            <button type="button" className="navigation-button" onClick={handleNextStep}>
              Next
            </button>
          ) : (
            <button type="submit" className="navigation-button">
              Create Report Card
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default ReportCardForm
