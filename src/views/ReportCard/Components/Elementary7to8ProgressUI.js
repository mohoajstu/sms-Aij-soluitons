import React, { useState, useRef } from 'react'
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
  CFormCheck,
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

/**
 * AI-Enhanced Text Area
 * A reusable component for text areas with an AI generation button.
 */
const AICommentField = ({
  name,
  value,
  onChange,
  placeholder,
  rows = 10,
  isGenerating = false,
  onGenerate,
  maxLength,
}) => {
  const currentLength = value?.length || 0

  return (
    <div className="ai-input-field position-relative mb-3">
      <CFormTextarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        style={{
          resize: 'vertical',
          paddingRight: '50px',
          paddingBottom: '25px', // Make space for character counter
          borderRadius: '8px',
          border: '2px solid #e9ecef',
          fontSize: '1rem',
        }}
      />
      <CButton
        type="button"
        title="Generate with AI"
        className="ai-generate-button position-absolute"
        style={{
          top: '10px',
          right: '10px',
          background: 'none',
          border: 'none',
          color: isGenerating ? '#0d6efd' : '#6c757d',
        }}
        onClick={() => onGenerate(name)}
        disabled={isGenerating}
      >
        {isGenerating ? <CSpinner size="sm" /> : <CIcon icon={cilLightbulb} size="lg" />}
      </CButton>
      {maxLength && (
        <div
          className="position-absolute"
          style={{
            bottom: '8px',
            right: '15px',
            fontSize: '0.8rem',
            color: currentLength > maxLength ? '#dc3545' : '#6c757d',
          }}
        >
          {currentLength}/{maxLength}
        </div>
      )}
    </div>
  )
}

AICommentField.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  rows: PropTypes.number,
  isGenerating: PropTypes.bool,
  onGenerate: PropTypes.func.isRequired,
  maxLength: PropTypes.number,
}

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
const StudentSchoolInfoSection = ({ formData, onFormDataChange, onGenerate, isGenerating }) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target
    onFormDataChange({
      ...formData,
      [name]: value,
    })
  }

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
              value={formData.teacher || ''}
              onChange={handleInputChange}
              placeholder="Enter teacher's name"
              required
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
              placeholder="0"
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
              placeholder="0"
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
              placeholder="0"
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
              placeholder="0"
              type="number"
              min="0"
            />
          </div>
        </CCol>
      </CRow>

      {/* Board Information */}
      <CRow className="mt-3">
        <CCol md={12}>
          <div className="mb-3">
            <CFormLabel htmlFor="boardInfo">
              <CIcon icon={cilSchool} className="me-2" />
              Board Information
            </CFormLabel>
            <AICommentField
              name="boardInfo"
              value={formData.boardInfo || ''}
              onChange={handleInputChange}
              placeholder="Enter board information..."
              rows={3}
              isGenerating={isGenerating}
              onGenerate={onGenerate}
              maxLength={500}
            />
          </div>
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
            <AICommentField
              name="strengthsAndNextStepsForImprovment"
              value={formData.strengthsAndNextStepsForImprovment || ''}
              onChange={handleInputChange}
              placeholder="Describe the student's strengths in learning skills and work habits, and identify specific next steps for improvement..."
              rows={6}
              isGenerating={isGenerating}
              onGenerate={onGenerate}
              maxLength={1000}
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
                                <CFormCheck
                                  key={field}
                                  id={field}
                                  name={field}
                                  label={label}
                                  checked={formData[field] || false}
                                  onChange={handleInputChange}
                                  className="me-2"
                                />
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
                                <CFormCheck
                                  key={field}
                                  id={field}
                                  name={field}
                                  label={label}
                                  checked={formData[field] || false}
                                  onChange={handleInputChange}
                                  className="me-2"
                                />
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
                                <CFormCheck
                                  key={field}
                                  id={field}
                                  name={field}
                                  label={label}
                                  checked={formData[field] || false}
                                  onChange={handleInputChange}
                                  className="me-2"
                                />
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
                                <CFormCheck
                                  key={field}
                                  id={field}
                                  name={field}
                                  label={label}
                                  checked={formData[field] || false}
                                  onChange={handleInputChange}
                                  className="me-2"
                                />
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
                                <CFormCheck
                                  key={field}
                                  id={field}
                                  name={field}
                                  label={label}
                                  checked={formData[field] || false}
                                  onChange={handleInputChange}
                                  className="me-2"
                                />
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
                                <CFormCheck
                                  key={field}
                                  id={field}
                                  name={field}
                                  label={label}
                                  checked={formData[field] || false}
                                  onChange={handleInputChange}
                                  className="me-2"
                                />
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
                          <CFormCheck
                            key={field}
                            id={field}
                            name={field}
                            label={label}
                            checked={formData[field] || false}
                            onChange={handleInputChange}
                            className="me-3"
                          />
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
                    <AICommentField
                      name={subject.commentField}
                      value={formData[subject.commentField] || ''}
                      onChange={handleInputChange}
                      placeholder={`Provide comments about the student's performance in ${subject.name.toLowerCase()}...`}
                      rows={3}
                      isGenerating={isGenerating}
                      onGenerate={onGenerate}
                      maxLength={500}
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
            <AICommentField
              name="strengthsAndNextStepsForImprovement2"
              value={formData.strengthsAndNextStepsForImprovement2 || ''}
              onChange={handleInputChange}
              placeholder="Provide additional comments about the student's performance across subject areas..."
              rows={4}
              isGenerating={isGenerating}
              onGenerate={onGenerate}
              maxLength={500}
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
            <AICommentField
              name="boardSpace"
              value={formData.boardSpace || ''}
              onChange={handleInputChange}
              placeholder="Provide any additional comments about the student's progress, achievements, or areas for improvement..."
              rows={4}
              isGenerating={isGenerating}
              onGenerate={onGenerate}
              maxLength={500}
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
}) => {
  const [activeAccordion, setActiveAccordion] = useState([
    'student-info',
    'learning-skills',
    'subject-areas',
    'comments-signatures',
  ])
  const [generatingFields, setGeneratingFields] = useState(new Set())

  const handleAccordionChange = (newActive) => {
    setActiveAccordion(newActive)
  }

  const handleAIGenerate = async (fieldName) => {
    setGeneratingFields((prev) => new Set(prev).add(fieldName))
    try {
      // Mock AI generation - replace with actual AI service call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const studentName = formData.student || 'The student'
      let generatedText = `Based on observations, ${studentName} demonstrates strong organizational skills and consistently completes assignments on time. A key area for growth is developing greater independence during group activities. Next steps should focus on encouraging ${studentName} to take initiative in collaborative settings and persevere through challenging tasks with minimal guidance.`

      if (fieldName === 'strengthsAndNextStepsForImprovment') {
        generatedText = `Strengths: ${studentName} shows excellent responsibility in completing homework and demonstrates good collaboration skills when working with peers. The student is organized and follows classroom routines effectively. Next Steps: Continue to support ${studentName} in developing greater initiative during independent work periods and building confidence in taking on leadership roles within group activities.`
      }

      if (fieldName === 'strengthsAndNextStepsForImprovement2') {
        generatedText = `Academic Performance: ${studentName} demonstrates strong foundational skills across core subjects. The student shows particular strength in mathematics and science, consistently applying problem-solving strategies effectively. Areas for continued growth include developing more detailed written responses in language arts and social studies. Next Steps: Focus on expanding vocabulary usage in written work and encouraging deeper analysis of social studies concepts.`
      }

      if (fieldName === 'boardSpace') {
        generatedText = `Additional Comments: ${studentName} has shown consistent growth throughout this reporting period. The student demonstrates a positive attitude toward learning and actively participates in classroom discussions. Areas for continued development include strengthening independent work habits and building confidence in taking academic risks. Overall, ${studentName} is making excellent progress and should continue to be encouraged in their learning journey.`
      }

      if (fieldName === 'boardInfo') {
        generatedText = `Board Information: This report card is issued by the school board in accordance with Ontario Ministry of Education guidelines. The board provides ongoing support for student achievement and well-being through comprehensive educational programs and services.`
      }

      if (fieldName === 'text_1') {
        generatedText = `Overall Assessment: ${studentName} has made excellent progress this term. The student consistently demonstrates a positive attitude toward learning and shows strong engagement in classroom activities. Continued support in developing independent work habits will further enhance academic achievement.`
      }

      onFormDataChange({ ...formData, [fieldName]: generatedText })
    } catch (error) {
      console.error('Error generating AI content:', error)
    } finally {
      setGeneratingFields((prev) => {
        const newSet = new Set(prev)
        newSet.delete(fieldName)
        return newSet
      })
    }
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
            <CAccordionHeader>Student & School Information</CAccordionHeader>
            <CAccordionBody>
              <StudentSchoolInfoSection
                formData={formData}
                onFormDataChange={onFormDataChange}
                onGenerate={handleAIGenerate}
                isGenerating={generatingFields.has('boardInfo')}
              />
            </CAccordionBody>
          </CAccordionItem>

          <CAccordionItem itemKey="learning-skills">
            <CAccordionHeader>Learning Skills & Work Habits</CAccordionHeader>
            <CAccordionBody>
              <LearningSkillsSection
                formData={formData}
                onFormDataChange={onFormDataChange}
                onGenerate={handleAIGenerate}
                isGenerating={generatingFields.has('strengthsAndNextStepsForImprovment')}
              />
            </CAccordionBody>
          </CAccordionItem>

          <CAccordionItem itemKey="subject-areas">
            <CAccordionHeader>Subject Areas</CAccordionHeader>
            <CAccordionBody>
              <SubjectAreasSection
                formData={formData}
                onFormDataChange={onFormDataChange}
                onGenerate={handleAIGenerate}
                isGenerating={generatingFields.has('strengthsAndNextStepsForImprovement2')}
              />
            </CAccordionBody>
          </CAccordionItem>

          <CAccordionItem itemKey="comments-signatures">
            <CAccordionHeader>Comments & Signatures</CAccordionHeader>
            <CAccordionBody>
              <CommentsSignaturesSection
                formData={formData}
                onFormDataChange={onFormDataChange}
                onGenerate={handleAIGenerate}
                isGenerating={generatingFields.has('boardSpace')}
              />
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
