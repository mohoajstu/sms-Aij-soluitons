import React, { useState, useRef, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
  CButton,
  CButtonGroup,
  CAlert,
  CAccordion,
  CAccordionItem,
  CAccordionHeader,
  CAccordionBody,
  CSpinner,
} from '@coreui/react'
import useCurrentTeacher from '../../../hooks/useCurrentTeacher'
import SaveButton from '../../../components/SaveButton'
import {
  cilBook,
  cilLightbulb,
  cilPencil,
  cilUser,
  cilSchool,
  cilLocationPin,
  cilCalendar,
  cilStar,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import SignatureCanvas from 'react-signature-canvas'
import PropTypes from 'prop-types'
import AIReportCommentInput from '../../../components/AIReportCommentInput'

/**
 * Signature Pad Component
 * Matches the exact implementation from Kindergarten report card
 */
const SignaturePad = ({ title, onSignatureChange }) => {
  const [mode, setMode] = useState('typed') // 'typed', 'drawn'
  const [typedName, setTypedName] = useState('')
  const signatureCanvasRef = useRef(null)

  const handleModeChange = (newMode) => {
    setMode(newMode)
    // Clear previous signature when mode changes
    if (newMode === 'typed') {
      if (signatureCanvasRef.current) signatureCanvasRef.current.clear()
      onSignatureChange({ type: 'typed', value: typedName })
    } else if (newMode === 'drawn') {
      setTypedName('')
      onSignatureChange({ type: 'drawn', value: null })
    }
  }

  const handleTypedNameChange = (e) => {
    const newName = e.target.value
    setTypedName(newName)
    onSignatureChange({ type: 'typed', value: newName })
  }

  const handleDrawEnd = () => {
    if (signatureCanvasRef.current) {
      const dataUrl = signatureCanvasRef.current.toDataURL('image/png')
      onSignatureChange({ type: 'drawn', value: dataUrl })
    }
  }

  const handleClear = () => {
    if (mode === 'drawn' && signatureCanvasRef.current) {
      signatureCanvasRef.current.clear()
      onSignatureChange({ type: 'drawn', value: null })
    } else if (mode === 'typed') {
      setTypedName('')
      onSignatureChange({ type: 'typed', value: '' })
    }
  }

  return (
    <div className="signature-pad-container mb-4">
      <h6 className="mb-2">{title}</h6>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <CButtonGroup>
          <CButton
            color="secondary"
            active={mode === 'typed'}
            onClick={() => handleModeChange('typed')}
          >
            Keyboard
          </CButton>
          <CButton
            color="secondary"
            active={mode === 'drawn'}
            onClick={() => handleModeChange('drawn')}
          >
            Trackpad
          </CButton>
        </CButtonGroup>
        <CButton color="danger" variant="outline" size="sm" onClick={handleClear}>
          Clear
        </CButton>
      </div>

      {mode === 'typed' && (
        <CFormInput
          type="text"
          placeholder="Type your full name"
          value={typedName}
          onChange={handleTypedNameChange}
          style={{ fontFamily: '"Dancing Script", cursive', fontSize: '2rem', height: 'auto' }}
        />
      )}

      {mode === 'drawn' && (
        <div style={{ border: '1px solid #ccc', borderRadius: '4px' }}>
          <SignatureCanvas
            ref={signatureCanvasRef}
            penColor="black"
            canvasProps={{
              width: 500,
              height: 150,
              className: 'signature-canvas',
              style: { width: '100%' },
            }}
            onEnd={handleDrawEnd}
          />
        </div>
      )}
    </div>
  )
}

SignaturePad.propTypes = {
  title: PropTypes.string.isRequired,
  onSignatureChange: PropTypes.func.isRequired,
}

/**
 * Student/School Information Section
 * Modern form section for student and school details
 */
const StudentSchoolInfoSection = ({ formData, onFormDataChange }) => {
  const { teacherName, loading } = useCurrentTeacher()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    onFormDataChange({
      ...formData,
      [name]: value,
    })
  }

  // Auto-populate teacher name when component mounts or teacher name changes
  useEffect(() => {
    if (teacherName && !formData.teacher) {
      onFormDataChange({
        ...formData,
        teacher: teacherName,
      })
    }
  }, [teacherName, formData.teacher, onFormDataChange])

  return (
    <div>
      <CRow>
        {/* Student Information */}
        <CCol md={6}>
          <h6 className="text-primary mb-3">
            <CIcon icon={cilUser} className="me-2" />
            Student Information
          </h6>

          <div className="mb-3">
            <CFormLabel htmlFor="student">Student Name *</CFormLabel>
            <CFormInput
              id="student"
              name="student"
              value={formData.student || ''}
              onChange={handleInputChange}
              placeholder="Enter student's full name"
              required
            />
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="OEN">Ontario Education Number (OEN) *</CFormLabel>
            <CFormInput
              id="OEN"
              name="OEN"
              value={formData.OEN || ''}
              onChange={handleInputChange}
              placeholder="9-digit OEN"
              maxLength={9}
              required
            />
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="grade">Grade Level *</CFormLabel>
            <CFormSelect
              id="grade"
              name="grade"
              value={formData.grade || ''}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Grade</option>
              <option value="7">Grade 7</option>
              <option value="8">Grade 8</option>
            </CFormSelect>
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="teacher">Teacher Name *</CFormLabel>
            <CFormInput
              id="teacher"
              name="teacher"
              value={formData.teacher || teacherName || ''}
              onChange={handleInputChange}
              placeholder={loading ? 'Loading...' : "Enter teacher's name"}
              required
              disabled={loading}
            />
          </div>
        </CCol>

        {/* School Information */}
        <CCol md={6}>
          <h6 className="text-primary mb-3">
            <CIcon icon={cilSchool} className="me-2" />
            School Information
          </h6>

          <div className="mb-3">
            <CFormLabel htmlFor="school">School Name *</CFormLabel>
            <CFormInput
              id="school"
              name="school"
              value={formData.school || ''}
              onChange={handleInputChange}
              placeholder="Enter school name"
              required
            />
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="board">School Board *</CFormLabel>
            <CFormInput
              id="board"
              name="board"
              value={formData.board || ''}
              onChange={handleInputChange}
              placeholder="Enter school board name"
              required
            />
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="principal">Principal Name</CFormLabel>
            <CFormInput
              id="principal"
              name="principal"
              value={formData.principal || ''}
              onChange={handleInputChange}
              placeholder="Enter principal's name"
            />
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="telephone">School Telephone</CFormLabel>
            <CFormInput
              id="telephone"
              name="telephone"
              value={formData.telephone || ''}
              onChange={handleInputChange}
              placeholder="(555) 123-4567"
              type="tel"
            />
          </div>
        </CCol>
      </CRow>

      {/* Addresses */}
      <CRow className="mt-3">
        <CCol md={6}>
          <div className="mb-3">
            <CFormLabel htmlFor="schoolAddress">
              <CIcon icon={cilLocationPin} className="me-2" />
              School Address
            </CFormLabel>
            <CFormTextarea
              id="schoolAddress"
              name="schoolAddress"
              value={formData.schoolAddress || ''}
              onChange={handleInputChange}
              placeholder="Enter school address"
              rows={3}
            />
          </div>
        </CCol>

        <CCol md={6}>
          <div className="mb-3">
            <CFormLabel htmlFor="boardAddress">
              <CIcon icon={cilLocationPin} className="me-2" />
              Board Address
            </CFormLabel>
            <CFormTextarea
              id="boardAddress"
              name="boardAddress"
              value={formData.boardAddress || ''}
              onChange={handleInputChange}
              placeholder="Enter board address"
              rows={3}
            />
          </div>
        </CCol>
      </CRow>

      {/* Attendance Information */}
      <CRow className="mt-3">
        <CCol md={12}>
          <h6 className="text-primary mb-3">
            <CIcon icon={cilCalendar} className="me-2" />
            Attendance Information
          </h6>
        </CCol>

        <CCol md={3}>
          <div className="mb-3">
            <CFormLabel htmlFor="daysAbsent">Days Absent</CFormLabel>
            <CFormInput
              id="daysAbsent"
              name="daysAbsent"
              value={formData.daysAbsent || ''}
              onChange={handleInputChange}
              placeholder="Enter days absent"
              type="number"
              min="0"
            />
          </div>
        </CCol>

        <CCol md={3}>
          <div className="mb-3">
            <CFormLabel htmlFor="totalDaysAbsent">Total Days Absent</CFormLabel>
            <CFormInput
              id="totalDaysAbsent"
              name="totalDaysAbsent"
              value={formData.totalDaysAbsent || ''}
              onChange={handleInputChange}
              placeholder="Enter total days absent"
              type="number"
              min="0"
            />
          </div>
        </CCol>

        <CCol md={3}>
          <div className="mb-3">
            <CFormLabel htmlFor="timesLate">Times Late</CFormLabel>
            <CFormInput
              id="timesLate"
              name="timesLate"
              value={formData.timesLate || ''}
              onChange={handleInputChange}
              placeholder="Enter times late"
              type="number"
              min="0"
            />
          </div>
        </CCol>

        <CCol md={3}>
          <div className="mb-3">
            <CFormLabel htmlFor="totalTimesLate">Total Times Late</CFormLabel>
            <CFormInput
              id="totalTimesLate"
              name="totalTimesLate"
              value={formData.totalTimesLate || ''}
              onChange={handleInputChange}
              placeholder="Enter total times late"
              type="number"
              min="0"
            />
          </div>
        </CCol>
      </CRow>

      {/* Board Information with AI */}
      <CRow className="mt-3">
        <CCol md={12}>
          <div className="mb-3">
            <CFormLabel htmlFor="boardInfo">
              <CIcon icon={cilSchool} className="me-2" />
              Board Information
            </CFormLabel>
            <CFormTextarea
              id="boardInfo"
              name="boardInfo"
              value={formData.boardInfo || ''}
              onChange={handleInputChange}
              placeholder="Enter board information..."
              rows={3}
            />
            <small className="text-muted">
              {(formData.boardInfo || '').length} / 500 characters
            </small>
          </div>

          {/* AI Generation for Board Info */}
          <AIReportCommentInput
            label="Generate Board Information"
            formData={{
              student_name: formData.student,
              grade: formData.grade,
              subject: 'Board Information',
            }}
            handleChange={(field, value) => {
              // Map AI output to the actual form field
              if (field === 'teacher_comments' || field === 'strengths_next_steps') {
                onFormDataChange({ ...formData, boardInfo: value })
              }
            }}
            buttonText="Generate Board Info"
            explicitReportType="Elementary 7-8 Progress Report"
          />
        </CCol>
      </CRow>
    </div>
  )
}

StudentSchoolInfoSection.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
}

/**
 * Learning Skills & Work Habits Section
 * Modern form section for learning skills assessment
 */
const LearningSkillsSection = ({ formData, onFormDataChange, onGenerate, isGenerating }) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target
    onFormDataChange({
      ...formData,
      [name]: value,
    })
  }

  const learningSkills = [
    {
      key: 'reponsibility1',
      label: 'Responsibility',
      description: 'Fulfills responsibilities and commitments within the learning environment',
    },
    {
      key: 'responsibility2',
      label: 'Responsibility',
      description: 'Fulfills responsibilities and commitments within the learning environment',
    },
    {
      key: 'organization1',
      label: 'Organization',
      description: 'Devises and applies a plan of work to complete projects and tasks',
    },
    {
      key: 'organization2',
      label: 'Organization',
      description: 'Devises and applies a plan of work to complete projects and tasks',
    },
    {
      key: 'independentWork1',
      label: 'Independent Work',
      description: 'Accepts various roles and an equitable share of work in a group',
    },
    {
      key: 'independentWork2',
      label: 'Independent Work',
      description: 'Accepts various roles and an equitable share of work in a group',
    },
    {
      key: 'collaboration1',
      label: 'Collaboration',
      description: 'Responds positively to the ideas, opinions, values, and traditions of others',
    },
    {
      key: 'collaboration2',
      label: 'Collaboration',
      description: 'Responds positively to the ideas, opinions, values, and traditions of others',
    },
    {
      key: 'initiative',
      label: 'Initiative',
      description: 'Looks for and acts on new ideas and opportunities for learning',
    },
    {
      key: 'initiative2',
      label: 'Initiative',
      description: 'Looks for and acts on new ideas and opportunities for learning',
    },
    {
      key: 'selfRegulation1',
      label: 'Self-Regulation',
      description: 'Sets own individual goals and monitors progress towards achieving them',
    },
    {
      key: 'selfRegulation2',
      label: 'Self-Regulation',
      description: 'Sets own individual goals and monitors progress towards achieving them',
    },
  ]

  const getRatingOptions = () => [
    { value: 'E', label: 'Excellent' },
    { value: 'G', label: 'Good' },
    { value: 'S', label: 'Satisfactory' },
    { value: 'N', label: 'Needs Improvement' },
  ]

  return (
    <div>
      <div className="mb-4">
        <p className="text-muted">
          The development of learning skills and work habits is an integral part of a student's
          learning. To the extent possible, the evaluation of learning skills and work habits, apart
          from any that may be included as part of a curriculum expectation in a subject or course,
          should not be considered in the determination of a student's grades.
        </p>
      </div>

      {/* Learning Skills Assessment */}
      <CRow>
        {learningSkills.map((skill, index) => (
          <CCol md={6} key={skill.key} className="mb-4">
            <CCard className="h-100 border-0 shadow-sm">
              <CCardBody>
                <h6 className="text-success mb-2">
                  <CIcon icon={cilLightbulb} className="me-2" />
                  {skill.label}
                </h6>
                <p className="text-muted small mb-3">{skill.description}</p>

                <div className="mb-3">
                  <CFormLabel htmlFor={skill.key}>Rating</CFormLabel>
                  <CFormSelect
                    id={skill.key}
                    name={skill.key}
                    value={formData[skill.key] || ''}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Rating</option>
                    {getRatingOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value} - {option.label}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      {/* Strengths and Next Steps */}
      <CRow className="mt-4">
        <CCol md={12}>
          <div className="mb-3">
            <CFormLabel htmlFor="strengthsAndNextStepsForImprovment">
              <CIcon icon={cilLightbulb} className="me-2" />
              Strengths and Next Steps for Improvement
            </CFormLabel>
            <AIReportCommentInput
              label="Generate Strengths and Next Steps"
              formData={{
                student_name: formData.student,
                grade: formData.grade,
                subject: 'Strengths and Next Steps',
              }}
              handleChange={(field, value) => {
                // Map AI output to the actual form field
                if (field === 'teacher_comments' || field === 'strengths_next_steps') {
                  onFormDataChange({ ...formData, strengthsAndNextStepsForImprovment: value })
                }
              }}
              buttonText="Generate Strengths & Next Steps"
              explicitReportType="Elementary 7-8 Progress Report"
            />
            <div className="form-text">
              Provide specific, constructive feedback on the student's learning skills and work
              habits.
            </div>
          </div>
        </CCol>
      </CRow>

      {/* Date */}
      <CRow className="mt-3">
        <CCol md={6}>
          <div className="mb-3">
            <CFormLabel htmlFor="date">Report Date</CFormLabel>
            <CFormInput
              id="date"
              name="date"
              value={formData.date || ''}
              onChange={handleInputChange}
              type="date"
              required
            />
          </div>
        </CCol>
      </CRow>
    </div>
  )
}

LearningSkillsSection.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
  onGenerate: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool,
}

/**
 * Subject Areas Section
 * Modern form section for subject area assessments
 */
const SubjectAreasSection = ({ formData, onFormDataChange, onGenerate, isGenerating }) => {
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value
    onFormDataChange({
      ...formData,
      [name]: newValue,
    })
  }

  const getMarkOptions = () => [
    { value: 'A', label: 'A (80-100%)' },
    { value: 'B', label: 'B (70-79%)' },
    { value: 'C', label: 'C (60-69%)' },
    { value: 'D', label: 'D (50-59%)' },
    { value: 'R', label: 'R (Below 50%)' },
    { value: 'I', label: 'I (Insufficient Evidence)' },
  ]

  const subjects = [
    {
      name: 'Language',
      key: 'language',
      fields: ['languageESL', 'languageIEP', 'languageNA'],
      markFields: [
        'languageMarkReport1',
        'languageMedianReport1',
        'languageMarkReport2',
        'languageMedianReport2',
      ],
      commentField: 'languageStrengthsAndStepsForImprovement',
    },
    {
      name: 'French',
      key: 'french',
      fields: [
        'frenchNA',
        'frenchListeningESL',
        'frenchListeningIEP',
        'frenchSpeakingESL',
        'frenchSpeakingIEP',
        'frenchReadingESL',
        'frenchReadingIEP',
        'frenchWritingESL',
        'frenchWritingIEP',
        'frenchCore',
        'frenchImmersion',
        'frenchExtended',
      ],
      markFields: [
        'frenchListeningMarkReport1',
        'frenchListeningMedianReport1',
        'frenchListeningMarkReport2',
        'frenchListeningMedianReport2',
        'frenchSpeakingMarkReport1',
        'frenchSpeakingMedianReport1',
        'frenchSpeakingMarkReport2',
        'frenchSpeakingMedianReport2',
        'frenchReadingMarkReport1',
        'frenchReadingMedianReport1',
        'frenchReadingMarkReport2',
        'frenchReadingMedianReport2',
        'frenchWritingMarkReport1',
        'frenchWritingMedianReport1',
        'frenchWritingMarkReport2',
        'frenchWritingMedianReport2',
      ],
      commentField: 'frenchStrengthsAndNextStepsForImprovement',
    },
    {
      name: 'Native Language',
      key: 'nativeLanguage',
      fields: ['nativeLanguageESL', 'nativeLanguageIEP', 'nativeLanguageNA'],
      markFields: [
        'nativeLanguageMarkReport1',
        'nativeLanguageMedianReport1',
        'nativeLanguageMarkReport2',
        'nativeLanguageMedianReport2',
      ],
      commentField: 'nativeLanguageStrengthsAndNextStepsForImprovement',
    },
    {
      name: 'Mathematics',
      key: 'math',
      fields: ['mathESL', 'mathIEP', 'mathFrench'],
      markFields: ['mathMarkReport1', 'mathMedianReport1', 'mathMarkReport2', 'mathMedianReport2'],
      commentField: 'mathStrengthAndNextStepsForImprovement',
    },
    {
      name: 'Science',
      key: 'science',
      fields: ['scienceESL', 'scienceIEP', 'scienceFrench'],
      markFields: [
        'scienceMarkReport1',
        'scienceMedianReport1',
        'scienceMarkReport2',
        'scienceMedianReport2',
      ],
      commentField: 'scienceStrengthsAndNextStepsForImprovement',
    },
    {
      name: 'History',
      key: 'history',
      fields: ['historyESL', 'historyIEP', 'historyFrench', 'historyNA'],
      markFields: [
        'historyMarkReport1',
        'historyMedianReport1',
        'historyMarkReport2',
        'historyMedianReport2',
      ],
      commentField: 'historyStrengthsAndNextStepsForImprovement',
    },
    {
      name: 'Geography',
      key: 'geography',
      fields: ['geographyESL', 'geographyIEP', 'geographyFrench', 'geographyNA'],
      markFields: [
        'geographyMarkReport1',
        'geographyMedianReport1',
        'geographyMarkReport2',
        'geographyMedianReport2',
      ],
      commentField: 'geographyStrengthsAndNextStepsForImprovement',
    },
    {
      name: 'Health Education',
      key: 'healthEd',
      fields: ['healthEdESL', 'healthEdIEP', 'healthEdFrench'],
      markFields: [
        'healthEdMarkReport1',
        'healthEdMedianReport1',
        'healthEdMarkReport2',
        'healthEdMedianReport2',
      ],
      commentField: 'healthAndPEStrengthsAndNextStepsForImprovement',
    },
    {
      name: 'Physical Education',
      key: 'pe',
      fields: ['peESL', 'peIEP', 'peFrench'],
      markFields: ['peMarkReport1', 'peMedianReport1', 'peMarkReport2', 'peMedianReport2'],
      commentField: 'healthAndPEStrengthsAndNextStepsForImprovement',
    },
    {
      name: 'Dance',
      key: 'dance',
      fields: ['danceESL', 'danceFrench', 'danceIEP', 'danceNA'],
      markFields: [
        'danceMarkReport1',
        'danceMedianReport1',
        'danceMarkReport2',
        'danceMedianReport2',
      ],
      commentField: 'artsStrengthsAndNextStepsForImprovement',
    },
    {
      name: 'Drama',
      key: 'drama',
      fields: ['dramaESL', 'dramaFrench', 'drama', 'dramaNA'],
      markFields: [
        'dramaMarkReport1',
        'dramaMedianReport1',
        'dramaMarkReport2',
        'dramaMedianReport2',
      ],
      commentField: 'artsStrengthsAndNextStepsForImprovement',
    },
    {
      name: 'Music',
      key: 'music',
      fields: ['musicESL', 'musicFrench', 'musicIEP', 'musicNA'],
      markFields: [
        'musicMarkReport1',
        'musicMedianReport1',
        'musicMarkReport2',
        'musicMedianReport2',
      ],
      commentField: 'artsStrengthsAndNextStepsForImprovement',
    },
    {
      name: 'Visual Arts',
      key: 'visualArts',
      fields: ['visualArtsESL', 'visualArtsIEP', 'visualArtsFrench', 'visualArtsNA'],
      markFields: [
        'visualArtsMarkReport1',
        'visualArtsMedianReport1',
        'visualArtsMarkReport2',
        'visualArtsMedianReport2',
      ],
      commentField: 'artsStrengthsAndNextStepsForImprovement',
    },
    {
      name: 'Other',
      key: 'other',
      fields: ['otherESL', 'otherFrench', 'otherIEP', 'otherNA'],
      markFields: ['otherMarkReport1', 'otherMedianReport2'],
      commentField: 'otherStrengthAndNextStepsForImprovement',
    },
  ]

  const accommodationLabels = {
    esl: 'ESL/ELD',
    iep: 'IEP',
    na: 'NA',
    french: 'French',
    core: 'Core',
    immersion: 'Immersion',
    extended: 'Extended',
  }

  const performanceLabels = {
    withdifficulty: 'Progressing With Difficulty',
    well: 'Progressing Well',
    verywell: 'Progressing Very Well',
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-muted">
          This section provides an evaluation of the student's achievement in each subject area.
          Accommodations and performance levels should be marked as appropriate for each subject.
        </p>
      </div>

      {/* Subject Areas */}
      {subjects.map((subject, index) => (
        <CCard key={subject.key} className="mb-4 border-0 shadow-sm">
          <CCardHeader className="bg-primary text-white">
            <h6 className="mb-0">
              <CIcon icon={cilBook} className="me-2" />
              {subject.name}
            </h6>
          </CCardHeader>
          <CCardBody>
            {/* Native Language Input - only for Native Language subject */}
            {subject.key === 'nativeLanguage' && (
              <CRow className="mb-3">
                <CCol md={12}>
                  <div className="mb-3">
                    <CFormLabel htmlFor="nativeLanguage">
                      <CIcon icon={cilBook} className="me-2" />
                      Native Language (if other than English)
                    </CFormLabel>
                    <CFormInput
                      id="nativeLanguage"
                      name="nativeLanguage"
                      value={formData.nativeLanguage || ''}
                      onChange={handleInputChange}
                      placeholder="e.g., Spanish, Mandarin, Arabic"
                    />
                  </div>
                </CCol>
              </CRow>
            )}

            <CRow>
              {/* Accommodations */}
              {subject.fields.length > 0 && (
                <CCol md={6}>
                  <h6 className="text-success mb-3">Accommodations</h6>
                  {subject.key === 'french' ? (
                    <div>
                      {/* NA Checkbox */}
                      <div className="mb-3">
                        <div className="d-flex flex-wrap gap-2">
                          {subject.fields
                            .filter((field) => field === 'frenchNA')
                            .map((field) => {
                              const label = accommodationLabels['na'] || field
                              return (
                                <div key={field} className="me-2">
                                  <input
                                    type="checkbox"
                                    id={field}
                                    name={field}
                                    checked={formData[field] || false}
                                    onChange={handleInputChange}
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      marginRight: '8px',
                                      cursor: 'pointer',
                                    }}
                                  />
                                  <label
                                    htmlFor={field}
                                    style={{ cursor: 'pointer', marginBottom: '0' }}
                                  >
                                    {label}
                                  </label>
                                </div>
                              )
                            })}
                        </div>
                      </div>

                      {/* Listening Accommodations */}
                      <div className="mb-3">
                        <h6 className="text-muted small mb-2">Listening</h6>
                        <div className="d-flex flex-wrap gap-2">
                          {subject.fields
                            .filter(
                              (field) =>
                                field === 'frenchListeningESL' || field === 'frenchListeningIEP',
                            )
                            .map((field) => {
                              let accommodationType = ''
                              const fieldLower = field.toLowerCase()
                              if (fieldLower.includes('esl')) accommodationType = 'esl'
                              else if (fieldLower.includes('iep')) accommodationType = 'iep'
                              const label = accommodationLabels[accommodationType] || field
                              return (
                                <div key={field} className="me-2">
                                  <input
                                    type="checkbox"
                                    id={field}
                                    name={field}
                                    checked={formData[field] || false}
                                    onChange={handleInputChange}
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      marginRight: '8px',
                                      cursor: 'pointer',
                                    }}
                                  />
                                  <label
                                    htmlFor={field}
                                    style={{ cursor: 'pointer', marginBottom: '0' }}
                                  >
                                    {label}
                                  </label>
                                </div>
                              )
                            })}
                        </div>
                      </div>

                      {/* Speaking Accommodations */}
                      <div className="mb-3">
                        <h6 className="text-muted small mb-2">Speaking</h6>
                        <div className="d-flex flex-wrap gap-2">
                          {subject.fields
                            .filter(
                              (field) =>
                                field === 'frenchSpeakingESL' || field === 'frenchSpeakingIEP',
                            )
                            .map((field) => {
                              let accommodationType = ''
                              const fieldLower = field.toLowerCase()
                              if (fieldLower.includes('esl')) accommodationType = 'esl'
                              else if (fieldLower.includes('iep')) accommodationType = 'iep'
                              const label = accommodationLabels[accommodationType] || field
                              return (
                                <div key={field} className="me-2">
                                  <input
                                    type="checkbox"
                                    id={field}
                                    name={field}
                                    checked={formData[field] || false}
                                    onChange={handleInputChange}
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      marginRight: '8px',
                                      cursor: 'pointer',
                                    }}
                                  />
                                  <label
                                    htmlFor={field}
                                    style={{ cursor: 'pointer', marginBottom: '0' }}
                                  >
                                    {label}
                                  </label>
                                </div>
                              )
                            })}
                        </div>
                      </div>

                      {/* Reading Accommodations */}
                      <div className="mb-3">
                        <h6 className="text-muted small mb-2">Reading</h6>
                        <div className="d-flex flex-wrap gap-2">
                          {subject.fields
                            .filter(
                              (field) =>
                                field === 'frenchReadingESL' || field === 'frenchReadingIEP',
                            )
                            .map((field) => {
                              let accommodationType = ''
                              const fieldLower = field.toLowerCase()
                              if (fieldLower.includes('esl')) accommodationType = 'esl'
                              else if (fieldLower.includes('iep')) accommodationType = 'iep'
                              const label = accommodationLabels[accommodationType] || field
                              return (
                                <div key={field} className="me-2">
                                  <input
                                    type="checkbox"
                                    id={field}
                                    name={field}
                                    checked={formData[field] || false}
                                    onChange={handleInputChange}
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      marginRight: '8px',
                                      cursor: 'pointer',
                                    }}
                                  />
                                  <label
                                    htmlFor={field}
                                    style={{ cursor: 'pointer', marginBottom: '0' }}
                                  >
                                    {label}
                                  </label>
                                </div>
                              )
                            })}
                        </div>
                      </div>

                      {/* Writing Accommodations */}
                      <div className="mb-3">
                        <h6 className="text-muted small mb-2">Writing</h6>
                        <div className="d-flex flex-wrap gap-2">
                          {subject.fields
                            .filter(
                              (field) =>
                                field === 'frenchWritingESL' || field === 'frenchWritingIEP',
                            )
                            .map((field) => {
                              let accommodationType = ''
                              const fieldLower = field.toLowerCase()
                              if (fieldLower.includes('esl')) accommodationType = 'esl'
                              else if (fieldLower.includes('iep')) accommodationType = 'iep'
                              const label = accommodationLabels[accommodationType] || field
                              return (
                                <div key={field} className="me-2">
                                  <input
                                    type="checkbox"
                                    id={field}
                                    name={field}
                                    checked={formData[field] || false}
                                    onChange={handleInputChange}
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      marginRight: '8px',
                                      cursor: 'pointer',
                                    }}
                                  />
                                  <label
                                    htmlFor={field}
                                    style={{ cursor: 'pointer', marginBottom: '0' }}
                                  >
                                    {label}
                                  </label>
                                </div>
                              )
                            })}
                        </div>
                      </div>

                      {/* Program Type Accommodations */}
                      <div className="mb-3">
                        <div className="d-flex flex-wrap gap-2">
                          {subject.fields
                            .filter(
                              (field) =>
                                field === 'frenchCore' ||
                                field === 'frenchImmersion' ||
                                field === 'frenchExtended',
                            )
                            .map((field) => {
                              let accommodationType = ''
                              const fieldLower = field.toLowerCase()
                              if (fieldLower.includes('core')) accommodationType = 'core'
                              else if (fieldLower.includes('immersion'))
                                accommodationType = 'immersion'
                              else if (fieldLower.includes('extended'))
                                accommodationType = 'extended'
                              const label = accommodationLabels[accommodationType] || field
                              return (
                                <div key={field} className="me-2">
                                  <input
                                    type="checkbox"
                                    id={field}
                                    name={field}
                                    checked={formData[field] || false}
                                    onChange={handleInputChange}
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      marginRight: '8px',
                                      cursor: 'pointer',
                                    }}
                                  />
                                  <label
                                    htmlFor={field}
                                    style={{ cursor: 'pointer', marginBottom: '0' }}
                                  >
                                    {label}
                                  </label>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="d-flex flex-wrap gap-3">
                      {subject.fields.map((field) => {
                        // Extract accommodation type from field name
                        let accommodationType = ''
                        const fieldLower = field.toLowerCase()

                        if (fieldLower.includes('esl')) accommodationType = 'esl'
                        else if (fieldLower.includes('iep')) accommodationType = 'iep'
                        else if (fieldLower.includes('na')) accommodationType = 'na'
                        else if (
                          fieldLower.includes('french') &&
                          !fieldLower.includes('extended') &&
                          !fieldLower.includes('immersion') &&
                          !fieldLower.includes('core')
                        )
                          accommodationType = 'french'
                        else if (fieldLower.includes('core')) accommodationType = 'core'
                        else if (fieldLower.includes('immersion')) accommodationType = 'immersion'
                        else if (fieldLower.includes('extended')) accommodationType = 'extended'

                        const label = accommodationLabels[accommodationType] || field

                        return (
                          <div key={field} className="me-3">
                            <input
                              type="checkbox"
                              id={field}
                              name={field}
                              checked={formData[field] || false}
                              onChange={handleInputChange}
                              style={{
                                width: '16px',
                                height: '16px',
                                marginRight: '8px',
                                cursor: 'pointer',
                              }}
                            />
                            <label htmlFor={field} style={{ cursor: 'pointer', marginBottom: '0' }}>
                              {label}
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CCol>
              )}

              {/* Marks */}
              {subject.markFields.length > 0 && (
                <CCol md={6}>
                  <h6 className="text-success mb-3">
                    <CIcon icon={cilStar} className="me-2" />
                    Marks
                  </h6>
                  <div className="d-flex flex-wrap gap-3">
                    {subject.markFields.map((field) => {
                      const fieldLabel = field
                        .replace('MarkReport', ' Mark ')
                        .replace('MedianReport', ' Median ')
                        .replace(/([A-Z])/g, ' $1')
                        .trim()
                      return (
                        <div key={field} className="mb-2">
                          <CFormLabel htmlFor={field} className="small mb-1">
                            {fieldLabel}
                          </CFormLabel>
                          <CFormSelect
                            id={field}
                            name={field}
                            value={formData[field] || ''}
                            onChange={handleInputChange}
                            size="sm"
                          >
                            <option value="">Select</option>
                            {getMarkOptions().map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.value} - {option.label}
                              </option>
                            ))}
                          </CFormSelect>
                        </div>
                      )
                    })}
                  </div>
                </CCol>
              )}
            </CRow>

            {/* Subject Comments */}
            {subject.commentField && (
              <CRow className="mt-3">
                <CCol md={12}>
                  <div className="mb-3">
                    <CFormLabel htmlFor={subject.commentField}>
                      <CIcon icon={cilLightbulb} className="me-2" />
                      {subject.name} - Strengths and Next Steps
                    </CFormLabel>
                    <AIReportCommentInput
                      label="Generate Subject Comments"
                      formData={{
                        student_name: formData.student,
                        grade: formData.grade,
                        subject: subject.name,
                      }}
                      handleChange={(field, value) => {
                        // Map AI output to the actual subject comment field
                        if (field === 'teacher_comments' || field === 'strengths_next_steps') {
                          onFormDataChange({ ...formData, [subject.commentField]: value })
                        }
                      }}
                      buttonText="Generate Comments"
                      explicitReportType="Elementary 7-8 Progress Report"
                    />
                  </div>
                </CCol>
              </CRow>
            )}
          </CCardBody>
        </CCard>
      ))}

      {/* Additional Comments for Subject Areas */}
      <CRow className="mt-4">
        <CCol md={12}>
          <div className="mb-3">
            <CFormLabel htmlFor="strengthsAndNextStepsForImprovement2">
              <CIcon icon={cilLightbulb} className="me-2" />
              Additional Comments for Subject Areas
            </CFormLabel>
            <AIReportCommentInput
              label="Generate Additional Subject Comments"
              formData={{
                student_name: formData.student,
                grade: formData.grade,
                subject: 'Additional Comments',
              }}
              handleChange={(field, value) => {
                // Map AI output to the actual form field
                if (field === 'teacher_comments' || field === 'strengths_next_steps') {
                  onFormDataChange({ ...formData, strengthsAndNextStepsForImprovement2: value })
                }
              }}
              buttonText="Generate Additional Comments"
              explicitReportType="Elementary 7-8 Progress Report"
            />
            <div className="form-text">
              Optional comments about the student's overall academic performance and areas for
              improvement.
            </div>
          </div>
        </CCol>
      </CRow>
    </div>
  )
}

SubjectAreasSection.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
  onGenerate: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool,
}

/**
 * Comments & Signatures Section
 * Matches the Kindergarten report card structure exactly
 */
const CommentsSignaturesSection = ({ formData, onFormDataChange, onGenerate, isGenerating }) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target
    onFormDataChange({
      ...formData,
      [name]: value,
    })
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-muted">
          This section contains final comments and signatures for the report card.
        </p>
      </div>

      {/* Additional Comments */}
      <CRow className="mb-4">
        <CCol md={12}>
          <div className="mb-3">
            <CFormLabel htmlFor="boardSpace">
              <CIcon icon={cilLightbulb} className="me-2" />
              Additional Comments
            </CFormLabel>
            <AIReportCommentInput
              label="Generate Additional Comments"
              formData={{
                student_name: formData.student,
                grade: formData.grade,
                subject: 'Additional Comments',
              }}
              handleChange={(field, value) => {
                // Map AI output to the actual form field
                if (field === 'teacher_comments' || field === 'strengths_next_steps') {
                  onFormDataChange({ ...formData, boardSpace: value })
                }
              }}
              buttonText="Generate Additional Comments"
              explicitReportType="Elementary 7-8 Progress Report"
            />
            <div className="form-text">
              Optional additional comments about the student's overall progress and achievements.
            </div>
          </div>
        </CCol>
      </CRow>

      {/* Signatures - Exact same as Kindergarten */}
      <CCard className="mb-4 shadow-sm">
        <CCardHeader style={{ backgroundColor: '#6f42c1', color: 'white' }}>
          <div className="d-flex align-items-center">
            <CIcon icon={cilPencil} className="me-2" />
            <h5 className="mb-0">Signatures</h5>
          </div>
        </CCardHeader>
        <CCardBody className="p-4">
          <p>
            To Parents/Guardians: This copy of the Grades 7-8 Progress Report should be retained for
            reference...
          </p>
          <CRow>
            <CCol md={6}>
              <SignaturePad
                title="Teacher's Signature"
                onSignatureChange={(value) => {
                  console.log('Teacher signature changed:', value)
                  onFormDataChange({ ...formData, teacherSignature: value })
                }}
              />
            </CCol>
            <CCol md={6}>
              <SignaturePad
                title="Principal's Signature"
                onSignatureChange={(value) => {
                  console.log('Principal signature changed:', value)
                  onFormDataChange({ ...formData, principalSignature: value })
                }}
              />
            </CCol>
          </CRow>
          <hr className="my-4" />
          <p>
            This report card reflects the student's progress and achievements during this reporting
            period.
          </p>
        </CCardBody>
      </CCard>
    </div>
  )
}

CommentsSignaturesSection.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
  onGenerate: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool,
}

/**
 * Main Elementary 7-8 Progress UI Component
 */
const Elementary7to8ProgressUI = ({
  formData,
  onFormDataChange,
  loading = false,
  error = null,
  onSaveDraft,
  isSaving,
  saveMessage,
  selectedStudent,
  selectedReportCard,
}) => {
  const [activeAccordion, setActiveAccordion] = useState([
    'student-info',
    'learning-skills',
    'subject-areas',
    'comments-signatures',
  ])

  const handleAccordionChange = (newActive) => {
    setActiveAccordion(newActive)
  }

  if (loading) {
    return (
      <div className="text-center p-4">
        <CSpinner color="primary" />
        <p className="mt-2">Loading form...</p>
      </div>
    )
  }

  if (error) {
    return (
      <CAlert color="danger">
        <h6>Error Loading Form</h6>
        <p>{error}</p>
      </CAlert>
    )
  }

  return (
    <div className="modern-report-card-form">
      <CForm>
        {error && (
          <CAlert color="danger" className="mb-4">
            {error}
          </CAlert>
        )}

        <CAccordion
          alwaysOpen
          activeItemKey={activeAccordion}
          onActiveItemChange={handleAccordionChange}
        >
          <CAccordionItem itemKey="student-info">
            <CAccordionHeader>
              <div className="d-flex justify-content-between align-items-center w-100 me-3">
                <span>Student & School Information</span>
                <SaveButton
                  onSave={onSaveDraft}
                  isSaving={isSaving}
                  saveMessage={saveMessage}
                  disabled={!selectedStudent || !selectedReportCard}
                  className="ms-auto"
                />
              </div>
            </CAccordionHeader>
            <CAccordionBody>
              <StudentSchoolInfoSection formData={formData} onFormDataChange={onFormDataChange} />
            </CAccordionBody>
          </CAccordionItem>

          <CAccordionItem itemKey="learning-skills">
            <CAccordionHeader>
              <div className="d-flex justify-content-between align-items-center w-100 me-3">
                <span>Learning Skills & Work Habits</span>
                <SaveButton
                  onSave={onSaveDraft}
                  isSaving={isSaving}
                  saveMessage={saveMessage}
                  disabled={!selectedStudent || !selectedReportCard}
                  className="ms-auto"
                />
              </div>
            </CAccordionHeader>
            <CAccordionBody>
              <LearningSkillsSection formData={formData} onFormDataChange={onFormDataChange} />
            </CAccordionBody>
          </CAccordionItem>

          <CAccordionItem itemKey="subject-areas">
            <CAccordionHeader>
              <div className="d-flex justify-content-between align-items-center w-100 me-3">
                <span>Subject Areas</span>
                <SaveButton
                  onSave={onSaveDraft}
                  isSaving={isSaving}
                  saveMessage={saveMessage}
                  disabled={!selectedStudent || !selectedReportCard}
                  className="ms-auto"
                />
              </div>
            </CAccordionHeader>
            <CAccordionBody>
              <SubjectAreasSection formData={formData} onFormDataChange={onFormDataChange} />
            </CAccordionBody>
          </CAccordionItem>

          <CAccordionItem itemKey="comments-signatures">
            <CAccordionHeader>
              <div className="d-flex justify-content-between align-items-center w-100 me-3">
                <span>Comments & Signatures</span>
                <SaveButton
                  onSave={onSaveDraft}
                  isSaving={isSaving}
                  saveMessage={saveMessage}
                  disabled={!selectedStudent || !selectedReportCard}
                  className="ms-auto"
                />
              </div>
            </CAccordionHeader>
            <CAccordionBody>
              <CommentsSignaturesSection formData={formData} onFormDataChange={onFormDataChange} />
            </CAccordionBody>
          </CAccordionItem>
        </CAccordion>
      </CForm>
    </div>
  )
}

Elementary7to8ProgressUI.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
}

export default Elementary7to8ProgressUI
