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
import SaveButton from '../../../components/SaveButton'
import {
  cilBook,
  cilLightbulb,
  cilPencil,
  cilUser,
  cilSchool,
  cilLocationPin,
  cilCalendar,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import SignatureCanvas from 'react-signature-canvas'
import PropTypes from 'prop-types'
import AIReportCommentInput from '../../../components/AIReportCommentInput'
import { getCharacterLimit } from '../utils/characterLimits'

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
  formData,
  onFormDataChange,
}) => {
  // B8: Use character limits utility if maxLength not provided
  const effectiveMaxLength = maxLength || getCharacterLimit(name)
  const currentLength = value?.length || 0

  return (
    <div className="ai-input-field position-relative mb-3">
      <CFormTextarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        maxLength={effectiveMaxLength}
        style={{
          resize: 'vertical',
          paddingRight: '50px',
          paddingBottom: '25px', // Make space for character counter
          borderRadius: '8px',
          border: '2px solid #e9ecef',
          fontSize: '1rem',
        }}
      />

      {/* AI Generation Button */}
      <div className="position-absolute" style={{ top: '10px', right: '10px' }}>
        <AIReportCommentInput
          label=""
          formData={{
            student_name: formData.student,
            grade: formData.grade,
            subject: getSubjectForField(name),
          }}
          handleChange={(field, aiValue) => {
            // Map AI output directly to the specific field
            if (field === 'teacher_comments' || field === 'strengths_next_steps') {
              onFormDataChange({ ...formData, [name]: aiValue })
            }
          }}
          buttonText=""
          explicitReportType="Elementary 7-8 Progress Report"
          className="ai-button-minimal"
        />
      </div>

      {effectiveMaxLength && (
        <div
          className="position-absolute"
          style={{
            bottom: '8px',
            right: '15px',
            fontSize: '0.8rem',
            color: currentLength > effectiveMaxLength ? '#dc3545' : '#6c757d',
          }}
        >
          {currentLength}/{effectiveMaxLength}
        </div>
      )}
    </div>
  )
}

// Helper function to determine subject based on field name
const getSubjectForField = (fieldName) => {
  // Learning Skills fields
  if (fieldName === 'sansResponsibility') return 'Responsibility'
  if (fieldName === 'sansOrganization') return 'Organization'
  if (fieldName === 'sansIndependentWork') return 'Independent Work'
  if (fieldName === 'sansCollaboration') return 'Collaboration'
  if (fieldName === 'sansInitiative') return 'Initiative'
  if (fieldName === 'sansSelfRegulation') return 'Self-Regulation'
  
  // Subject Area fields
  if (fieldName === 'sans2Language') return 'Language'
  if (fieldName === 'sans2French') return 'French'
  if (fieldName === 'sans2NativeLanguage') return 'Native Language'
  if (fieldName === 'sans2Math') return 'Mathematics'
  if (fieldName === 'sans2Science') return 'Science'
  if (fieldName === 'sans2History') return 'History'
  if (fieldName === 'sans2Geography') return 'Geography'
  if (fieldName === 'sans2HealthEd') return 'Health Education'
  if (fieldName === 'sans2PE') return 'Physical Education'
  if (fieldName === 'sans2Dance') return 'Dance'
  if (fieldName === 'sans2Drama') return 'Drama'
  if (fieldName === 'sans2Music') return 'Music'
  if (fieldName === 'sans2VisualArts') return 'Visual Arts'
  if (fieldName === 'sans2Other') return 'Other'
  
  // Main comment fields
  if (fieldName === 'strengthAndNextStepsForImprovement') return 'Learning Skills and Work Habits'
  if (fieldName === 'strengthsAndNextStepsForImprovement2') return 'Subject Areas Summary'
  if (fieldName === 'boardSpace') return 'Additional Comments'
  if (fieldName === 'boardInfo') return 'Board Information'
  
  return 'Elementary Learning'
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
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
}

/**
 * Signature Pad Component
 * Matches the exact implementation from Kindergarten report card
 */
const SignaturePad = ({ title, onSignatureChange, initialValue }) => {
  const [mode, setMode] = useState('typed') // 'typed', 'drawn'
  const [typedName, setTypedName] = useState('')
  const signatureCanvasRef = useRef(null)

  // Initialize from initialValue if provided
  useEffect(() => {
    if (initialValue && initialValue.type === 'typed' && initialValue.value) {
      // Only update if the value is different to avoid unnecessary re-renders
      if (typedName !== initialValue.value) {
        setTypedName(initialValue.value)
        setMode('typed')
      }
    } else if (initialValue && initialValue.type === 'drawn' && initialValue.value) {
      if (mode !== 'drawn') {
        setMode('drawn')
      }
      // For drawn signatures, the value is a data URL that would need to be loaded into canvas
      // This is handled by the export function, so we just set the mode here
    }
  }, [initialValue]) // Only run when initialValue changes

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
  initialValue: PropTypes.object,
}

/**
 * Student/School Information Section
 * Modern form section for student and school details
 */
const StudentSchoolInfoSection = ({ formData, onFormDataChange }) => {
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
              value={formData.teacher_name || formData.teacher || ''}
              readOnly
              required
              className="bg-light"
              title="Teacher name is automatically set from homeroom teacher"
            />
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="date">
              <CIcon icon={cilCalendar} className="me-2" />
              Date
            </CFormLabel>
            <CFormInput
              type="date"
              id="date"
              name="date"
              value={formData.date || ''}
              readOnly
              className="bg-light"
              title="Date is automatically set from Report Card Settings"
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
              isGenerating={false}
              onGenerate={() => {}}
              maxLength={500}
              formData={formData}
              onFormDataChange={onFormDataChange}
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
              value={formData.daysAbsent ?? ''}
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
              value={formData.totalDaysAbsent ?? ''}
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
              value={formData.timesLate ?? ''}
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
              value={formData.totalTimesLate ?? ''}
              onChange={handleInputChange}
              placeholder="Enter total times late"
              type="number"
              min="0"
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
const LearningSkillsSection = ({ formData, onFormDataChange }) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target
    onFormDataChange({
      ...formData,
      [name]: value,
    })
  }

  const learningSkills = [
    {
      key: 'responsibility',
      label: 'Responsibility',
      description: 'Fulfills responsibilities and commitments within the learning environment',
      sansField: 'sansResponsibility',
    },
    {
      key: 'organization',
      label: 'Organization',
      description: 'Devises and applies a plan of work to complete projects and tasks',
      sansField: 'sansOrganization',
    },
    {
      key: 'independentWork',
      label: 'Independent Work',
      description: 'Accepts various roles and an equitable share of work in a group',
      sansField: 'sansIndependentWork',
    },
    {
      key: 'collaboration',
      label: 'Collaboration',
      description: 'Responds positively to the ideas, opinions, values, and traditions of others',
      sansField: 'sansCollaboration',
    },
    {
      key: 'initiative',
      label: 'Initiative',
      description: 'Looks for and acts on new ideas and opportunities for learning',
      sansField: 'sansInitiative',
    },
    {
      key: 'selfRegulation',
      label: 'Self-Regulation',
      description: 'Sets own individual goals and monitors progress towards achieving them',
      sansField: 'sansSelfRegulation',
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

                {/* Sans field for comments */}
                {skill.sansField && (
                  <div className="mb-3">
                    <CFormLabel htmlFor={skill.sansField}>
                      <CIcon icon={cilLightbulb} className="me-2" />
                      {skill.label} Comments
                    </CFormLabel>
                    <AICommentField
                      name={skill.sansField}
                      value={formData[skill.sansField] || ''}
                      onChange={handleInputChange}
                      placeholder={`Add comments for ${skill.label.toLowerCase()}...`}
                      rows={3}
                      isGenerating={false}
                      onGenerate={() => {}}
                      maxLength={500}
                      formData={formData}
                      onFormDataChange={onFormDataChange}
                    />
                  </div>
                )}
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>


      {/* Date */}
      <CRow className="mt-3">
        <CCol md={6}>
          <div className="mb-3">
            <CFormLabel htmlFor="data">Report Date</CFormLabel>
            <CFormInput
              id="data"
              name="data"
              value={formData.data || ''}
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
}

/**
 * Subject Areas Section
 * Modern form section for subject area assessments
 */
const SubjectAreasSection = ({ formData, onFormDataChange }) => {
  // Auto-fill default values for nativeLanguage and other
  useEffect(() => {
    const updates = {}
    
    // Auto-fill nativeLanguage if empty or undefined
    if (formData.nativeLanguage === undefined || formData.nativeLanguage === '') {
      updates.nativeLanguage = 'Quran and Arabic Studies'
    }
    
    // Auto-fill other if empty or undefined
    if (formData.other === undefined || formData.other === '') {
      updates.other = 'Islamic Studies'
    }
    
    // Only update if there are changes to make
    if (Object.keys(updates).length > 0) {
      onFormDataChange({ ...formData, ...updates })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount to set initial defaults

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
      performanceFields: ['languageWithDifficulty', 'languageWell', 'languageVeryWell'],
      sans2Field: 'sans2Language',
    },
    {
      name: 'French',
      key: 'french',
      fields: [
        'frenchESL',
        'frenchIEP',
        'frenchNA',
        'frenchCore',
        'frenchImmersion',
        'frenchExtended',
      ],
      performanceFields: ['frenchWithDifficulty', 'frenchWell', 'frenchVeryWell'],
      sans2Field: 'sans2French',
    },
    {
      name: 'Native Language',
      key: 'nativeLanguage',
      fields: ['nativeLanguageESL', 'nativeLanguageIEP', 'nativeLanguageNA'],
      performanceFields: [
        'nativeLanguageWithDifficulty',
        'nativeLanguageWell',
        'nativeLanguageVeryWell',
      ],
      sans2Field: 'sans2NativeLanguage',
    },
    {
      name: 'Mathematics',
      key: 'math',
      fields: ['mathESL', 'mathIEP', 'mathFrench'],
      performanceFields: ['mathWithDifficulty', 'mathWell', 'mathVeryWell'],
      sans2Field: 'sans2Math',
    },
    {
      name: 'Science',
      key: 'science',
      fields: ['scienceESL', 'scienceIEP', 'scienceFrench'],
      performanceFields: ['scienceWithDifficulty', 'scienceWell', 'scienceVeryWell'],
      sans2Field: 'sans2Science',
    },
    {
      name: 'History',
      key: 'history',
      fields: ['historyESL', 'historyIEP', 'historyFrench', 'historyNA'],
      performanceFields: ['historyWithDifficulty', 'historyWell', 'historyVeryWell'],
      sans2Field: 'sans2History',
    },
    {
      name: 'Geography',
      key: 'geography',
      fields: ['geographyESL', 'geographyIEP', 'geographyFrench', 'geographyNA'],
      performanceFields: ['geographyWithDifficulty', 'geographyWell', 'geographyVeryWell'],
      sans2Field: 'sans2Geography',
    },
    {
      name: 'Health Education',
      key: 'healthEd',
      fields: ['healthEdESL', 'healthEdIEP', 'healthEdFrench'],
      performanceFields: ['healthEdWithDifficulty', 'healthEdWell', 'healthEdVeryWell'],
      sans2Field: 'sans2HealthEd',
    },
    {
      name: 'Physical Education',
      key: 'pe',
      fields: ['peESL', 'peIEL', 'peFrench'],
      performanceFields: ['peWithDifficulty', 'peWell', 'peVeryWell'],
      sans2Field: 'sans2PE',
    },
    {
      name: 'Dance',
      key: 'dance',
      fields: ['danceESL', 'danceIEP', 'danceFrench', 'danceNA'],
      performanceFields: ['danceWithDifficulty', 'danceWell', 'danceVeryWell'],
      sans2Field: 'sans2Dance',
    },
    {
      name: 'Drama',
      key: 'drama',
      fields: ['dramaESL', 'dramaIEP', 'dramaFrench', 'dramaNA'],
      performanceFields: ['dramaWithDifficulty', 'dramaWell', 'dramaVeryWell'],
      sans2Field: 'sans2Drama',
    },
    {
      name: 'Music',
      key: 'music',
      fields: ['musicESL', 'musicIEP', 'musicFrench', 'musicNA'],
      performanceFields: ['musicWithDifficulty', 'musicWell', 'musicVeryWell'],
      sans2Field: 'sans2Music',
    },
    {
      name: 'Visual Arts',
      key: 'visualArts',
      fields: ['visualArtsESL', 'visualArtsIEP', 'visualArtsFrench', 'visualArtsNA'],
      performanceFields: ['visualArtsWithDifficulty', 'visualArtsWell', 'visualArtsVeryWell'],
      sans2Field: 'sans2VisualArts',
    },
    {
      name: 'Other',
      key: 'other',
      fields: ['otherESL', 'otherIEP', 'otherFrench', 'otherNA'],
      performanceFields: ['otherWithDifficulty', 'otherWell', 'otherVeryWell'],
      sans2Field: 'sans2Other',
    },
  ]

  const accommodationLabels = {
    esl: 'ESL/ELD',
    iep: 'IEP',
    iel: 'IEP',  // Handle the typo in JSON
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
                      value={formData.nativeLanguage || 'Quran and Arabic Studies'}
                      onChange={handleInputChange}
                      placeholder="e.g., Spanish, Mandarin, Arabic"
                    />
                  </div>
                </CCol>
              </CRow>
            )}

            {/* Other Subject Input - only for Other subject */}
            {subject.key === 'other' && (
              <CRow className="mb-3">
                <CCol md={12}>
                  <div className="mb-3">
                    <CFormLabel htmlFor="other">
                      <CIcon icon={cilBook} className="me-2" />
                      Specify Subject Name
                    </CFormLabel>
                    <CFormInput
                      id="other"
                      name="other"
                      value={formData.other || 'Islamic Studies'}
                      onChange={handleInputChange}
                      placeholder="Enter subject name"
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
                  <div className="d-flex flex-wrap gap-3">
                    {subject.fields.map((field) => {
                      // Extract accommodation type from field name
                      let accommodationType = ''
                      const fieldLower = field.toLowerCase()

                      if (fieldLower.includes('esl')) accommodationType = 'esl'
                      else if (fieldLower.includes('iep')) accommodationType = 'iep'
                      else if (fieldLower.includes('iel')) accommodationType = 'iel'
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
                        <div key={field} className="me-3" style={{ display: 'inline-flex', alignItems: 'center' }}>
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
                              flexShrink: 0,
                            }}
                          />
                          <label htmlFor={field} style={{ cursor: 'pointer', marginBottom: '0' }}>
                            {label}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </CCol>
              )}

              {/* Performance Levels */}
              {subject.performanceFields.length > 0 && (
                <CCol md={6}>
                  <h6 className="text-success mb-3">Performance Level</h6>
                  <div className="d-flex flex-wrap gap-3">
                    {subject.performanceFields.map((field) => {
                      // Extract performance type from field name
                      // IMPORTANT: Check 'verywell' before 'well' because 'verywell' contains 'well'
                      let performanceType = ''
                      const fieldLower = field.toLowerCase()

                      if (fieldLower.includes('verywell')) performanceType = 'verywell'
                      else if (fieldLower.includes('withdifficulty')) performanceType = 'withdifficulty'
                      else if (fieldLower.includes('well')) performanceType = 'well'

                      const label = performanceLabels[performanceType] || field

                      return (
                        <div key={field} className="me-3" style={{ display: 'inline-flex', alignItems: 'center' }}>
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
                              flexShrink: 0,
                            }}
                          />
                          <label htmlFor={field} style={{ cursor: 'pointer', marginBottom: '0' }}>
                            {label}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </CCol>
              )}
            </CRow>

            {/* Sans2 field for subject comments */}
            {subject.sans2Field && (
              <CRow className="mt-3">
                <CCol md={12}>
                  <div className="mb-3">
                    <CFormLabel htmlFor={subject.sans2Field}>
                      <CIcon icon={cilLightbulb} className="me-2" />
                      Comments for {subject.name}
                    </CFormLabel>
                    <AICommentField
                      name={subject.sans2Field}
                      value={formData[subject.sans2Field] || ''}
                      onChange={handleInputChange}
                      placeholder={`Add comments for ${subject.name.toLowerCase()}...`}
                      rows={3}
                      isGenerating={false}
                      onGenerate={() => {}}
                      maxLength={500}
                      formData={formData}
                      onFormDataChange={onFormDataChange}
                    />
                  </div>
                </CCol>
              </CRow>
            )}
          </CCardBody>
        </CCard>
      ))}
    </div>
  )
}

SubjectAreasSection.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
}

/**
 * Comments & Signatures Section
 * Matches the exact structure from Elementary 1-6
 */
const CommentsSignaturesSection = ({ formData, onFormDataChange }) => {
  // Auto-fill teacher signature with homeroom teacher name
  useEffect(() => {
    if (formData.teacher_name || formData.teacher) {
      const teacherName = formData.teacher_name || formData.teacher
      const currentSignature = formData.teacherSignature?.value || ''
      
      // Auto-fill if signature is empty or doesn't match
      if (!currentSignature || currentSignature.trim() === '' || currentSignature !== teacherName) {
        onFormDataChange({
          ...formData,
          teacherSignature: { type: 'typed', value: teacherName },
        })
      }
    }
  }, [formData.teacher_name, formData.teacher])

  // Auto-fill principal signature with "Ghazala Choudhary"
  useEffect(() => {
    if (!formData.principalSignature || 
        !formData.principalSignature.value || 
        formData.principalSignature.value.trim() === '') {
      onFormDataChange({
        ...formData,
        principalSignature: { type: 'typed', value: 'Ghazala Choudhary' },
      })
    }
  }, [formData.principalSignature, onFormDataChange])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    onFormDataChange({
      ...formData,
      [name]: value,
    })
  }

  const handleTeacherSignatureChange = (signatureData) => {
    onFormDataChange({ ...formData, teacherSignature: signatureData })
  }

  const handlePrincipalSignatureChange = (signatureData) => {
    onFormDataChange({ ...formData, principalSignature: signatureData })
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-muted">
          This section contains final comments and signatures for the report card.
        </p>
      </div>

      {/* Signatures */}
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
                onSignatureChange={handleTeacherSignatureChange}
                initialValue={formData.teacherSignature}
              />
            </CCol>
            <CCol md={6}>
              <SignaturePad
                title="Principal's Signature"
                onSignatureChange={handlePrincipalSignatureChange}
                initialValue={formData.principalSignature}
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
      <style>
        {`
          .ai-button-minimal .ai-input-container {
            margin-bottom: 0 !important;
          }
          .ai-button-minimal .ai-input-container button {
            background: none !important;
            border: none !important;
            color: #6c757d !important;
            padding: 4px !important;
            min-width: auto !important;
            width: auto !important;
            height: auto !important;
          }
          .ai-button-minimal .ai-input-container button:hover {
            color: #0d6efd !important;
            background: none !important;
          }
          .ai-button-minimal .ai-input-container button:disabled {
            color: #adb5bd !important;
          }
          .ai-button-minimal label {
            display: none !important;
          }
          .ai-button-minimal small {
            display: none !important;
          }
        `}
      </style>
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
                  asLink={true}
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
                  asLink={true}
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
                  asLink={true}
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
                  asLink={true}
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
  onSaveDraft: PropTypes.func,
  isSaving: PropTypes.bool,
  saveMessage: PropTypes.string,
  selectedStudent: PropTypes.object,
  selectedReportCard: PropTypes.object,
}

export default Elementary7to8ProgressUI
