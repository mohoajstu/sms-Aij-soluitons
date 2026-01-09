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
          explicitReportType="Elementary 1-6 Report Card"
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
  if (fieldName === 'strengthsAndNextStepsForImprovement') return 'Learning Skills & Work Habits'
  if (fieldName === 'boardSpace') return 'Overall Progress'
  if (fieldName.includes('language')) return 'Language'
  if (fieldName.includes('math')) return 'Mathematics'
  if (fieldName.includes('science')) return 'Science'
  if (fieldName.includes('french')) return 'French'
  if (fieldName.includes('social')) return 'Social Studies'
  if (fieldName.includes('health')) return 'Health Education'
  if (fieldName.includes('pe') || fieldName.includes('PE')) return 'Physical Education'
  if (fieldName.includes('arts') || fieldName.includes('Arts')) return 'Arts'
  if (fieldName.includes('native')) return 'Native Language'
  if (fieldName.includes('other')) return 'Other'
  return 'General'
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
              placeholder="Enter student name"
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
              placeholder="Enter OEN"
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
              <option value="1">Grade 1</option>
              <option value="2">Grade 2</option>
              <option value="3">Grade 3</option>
              <option value="4">Grade 4</option>
              <option value="5">Grade 5</option>
              <option value="6">Grade 6</option>
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
              value={formData.telephone || '613 421 1700'}
              onChange={handleInputChange}
              placeholder="613 421 1700"
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
      key: 'responsibility1',
      label: 'Responsibility',
      description: 'Fulfills responsibilities and commitments within the learning environment',
    },
    {
      key: 'organization1',
      label: 'Organization',
      description: 'Devises and applies a plan of work to complete projects and tasks',
    },
    {
      key: 'independentWork1',
      label: 'Independent Work',
      description: 'Accepts various roles and an equitable share of work in a group',
    },
    {
      key: 'collaboration1',
      label: 'Collaboration',
      description: 'Responds positively to the ideas, opinions, values, and traditions of others',
    },
    {
      key: 'initiative1',
      label: 'Initiative',
      description: 'Looks for and acts on new ideas and opportunities for learning',
    },
    {
      key: 'selfRegulation1',
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
            <CFormLabel htmlFor="strengthsAndNextStepsForImprovement">
              <CIcon icon={cilLightbulb} className="me-2" />
              Strengths and Next Steps for Improvement
            </CFormLabel>
            <AICommentField
              name="strengthsAndNextStepsForImprovement"
              value={formData.strengthsAndNextStepsForImprovement || ''}
              onChange={handleInputChange}
              placeholder="Describe the student's strengths in learning skills and work habits, and identify specific next steps for improvement..."
              rows={6}
              isGenerating={isGenerating}
              onGenerate={onGenerate}
              maxLength={1000}
              formData={formData}
              onFormDataChange={onFormDataChange}
            />
            <div className="form-text">
              Provide specific, constructive feedback on the student's learning skills and work
              habits.
            </div>
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
 * Subject Areas Section with Marks
 * Modern form section for subject area assessments with marks
 */
const SubjectAreasSection = ({ formData, onFormDataChange, onGenerate, isGenerating, selectedTerm = 'term1' }) => {
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
      markFields: ['languageMarkReport1', 'languageMarkReport2'],
      commentField: 'languageStrengthAndNextStepsForImprovement',
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
        'frenchListeningMarkReport2',
        'frenchSpeakingMarkReport1',
        'frenchSpeakingMarkReport2',
        'frenchReadingMarkReport1',
        'frenchReadingMarkReport2',
        'frenchWritingMarkReport1',
        'frenchWritingMarkReport2',
      ],
      commentField: 'frenchStrengthAndNextStepsForImprovement',
    },
    {
      name: 'Native Language',
      key: 'nativeLanguage',
      fields: ['nativeLanguageESL', 'nativeLanguageIEP', 'nativeLanguageNA'],
      markFields: ['nativeLanguageMarkReport1', 'nativeLanguageMarkReport2'],
      commentField: 'nativeLanguageStrengthAndNextStepsForImprovement',
    },
    {
      name: 'Mathematics',
      key: 'math',
      fields: ['mathESL', 'mathIEP', 'mathFrench'],
      markFields: ['mathMarkReport1', 'mathMarkReport2'],
      commentField: 'mathStrengthAndNextStepsForImprovement',
    },
    {
      name: 'Science',
      key: 'science',
      fields: ['scienceESL', 'scienceIEP', 'scienceFrench'],
      markFields: ['scienceMarkReport1', 'scienceMarkReport2'],
      commentField: 'scienceAndNextStepsForImprovement',
    },
    {
      name: 'Social Studies',
      key: 'socialStudies',
      fields: ['socialStudiesESL', 'socialStudiesIEP', 'socialStudiesFrench'],
      markFields: ['socialStudiesMarkReport1', 'socialStudiesMarkReport2'],
      commentField: 'socialStudiesStrengthAndNextStepsForImprovement',
    },
    {
      name: 'Health Education',
      key: 'healthEd',
      fields: ['healthEdESL', 'healthEdIEP', 'healthEdFrench'],
      markFields: ['healthMarkReport1', 'healthMarkReport2'],
      commentField: 'healthEdStrengthAndNextStepsForImprovement',
    },
    {
      name: 'Physical Education',
      key: 'pe',
      fields: ['peESL', 'peIEP', 'peFrench'],
      markFields: ['peMarkReport1', 'peMarkReport2'],
      commentField: 'peStrengthAndNextStepsForImprovement',
    },
    {
      name: 'Dance',
      key: 'dance',
      fields: ['danceESL', 'danceIEP', 'danceFrench', 'danceNA'],
      markFields: ['danceMarkReport1', 'danceMarkReport2'],
      commentField: 'danceStrengthAndNextStepsForImprovement',
    },
    {
      name: 'Drama',
      key: 'drama',
      fields: ['dramaESL', 'dramaIEP', 'dramaFrench', 'dramaNA'],
      markFields: ['dramaMarkReport1', 'dramaMarkReport2'],
      commentField: 'dramaStrengthAndNextStepsForImprovement',
    },
    {
      name: 'Music',
      key: 'music',
      fields: ['musicESL', 'musicIEP', 'musicFrench', 'musicNA'],
      markFields: ['musicMarkReport1', 'musicMarkReport2'],
      commentField: 'musicStrengthAndNextStepsForImprovement',
    },
    {
      name: 'Visual Arts',
      key: 'visualArts',
      fields: ['visualArtsESL', 'visualArtsIEP', 'visualArtsFrench', 'visualArtsNA'],
      markFields: ['visualArtsMarkReport1', 'visualArtsMarkReport2'],
      commentField: 'visualArtsStrengthAndNextStepsForImprovement',
    },
    {
      name: 'Other',
      key: 'other',
      fields: ['otherESL', 'otherIEP', 'otherFrench', 'otherNA'],
      markFields: ['otherMarkReport1', 'otherMarkReport2'],
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

  const getMarkOptions = () => [
    { value: 'A', label: 'A (80-100%)' },
    { value: 'B', label: 'B (70-79%)' },
    { value: 'C', label: 'C (60-69%)' },
    { value: 'D', label: 'D (50-59%)' },
    { value: 'R', label: 'R (Below 50%)' },
    { value: 'I', label: 'I (Insufficient Evidence)' },
  ]

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
                    {subject.markFields
                      .filter((field) => {
                        // Filter fields based on selected term
                        // Only show Report1 fields for term1, Report2 fields for term2
                        if (selectedTerm === 'term1') {
                          return field.includes('Report1') || field.includes('report1')
                        } else if (selectedTerm === 'term2') {
                          return field.includes('Report2') || field.includes('report2')
                        }
                        // If term is not specified, show all fields (backward compatibility)
                        return true
                      })
                      .map((field) => {
                        const fieldLabel = field
                          .replace('MarkReport', ' Mark ')
                          .replace(/([A-Z])/g, ' $1')
                          .trim()
                        return (
                          <div key={field} className="mb-2">
                            <CFormLabel htmlFor={field} className="small mb-1">
                              {fieldLabel}
                            </CFormLabel>
                            {/* D20: Change Mark field from dropdown to textbox */}
                            <CFormInput
                              type="text"
                              id={field}
                              name={field}
                              value={formData[field] || ''}
                              onChange={handleInputChange}
                              size="sm"
                              placeholder="Enter mark (e.g., A, B+, 85)"
                            />
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

  // Auto-fill teacher signature with homeroom teacher name
  useEffect(() => {
    if (formData.teacher_name) {
      const currentSignature = formData.teacherSignature?.value || ''
      const expectedName = formData.teacher_name + (formData.teacher_name.includes('ERS') ? '' : ' ERS')
      
      // Always auto-fill if signature is empty or doesn't match
      if (!currentSignature || currentSignature.trim() === '' || currentSignature !== expectedName) {
        const updatedFormData = {
          ...formData,
          teacherSignature: { type: 'typed', value: expectedName },
        }
        // Only update if principal signature is also set or will be set
        if (!updatedFormData.principalSignature?.value) {
          updatedFormData.principalSignature = { type: 'typed', value: 'Ghazala Choudhary' }
        }
        onFormDataChange(updatedFormData)
      }
    }
  }, [formData.teacher_name])

  // Auto-fill principal signature with "Ghazala Choudhary"
  useEffect(() => {
    const currentPrincipal = formData.principalSignature?.value || ''
    const expectedPrincipal = 'Ghazala Choudhary'
    
    // Always auto-fill if signature is empty or doesn't match
    if (!currentPrincipal || currentPrincipal.trim() === '' || currentPrincipal !== expectedPrincipal) {
      const updatedFormData = {
        ...formData,
        principalSignature: { type: 'typed', value: expectedPrincipal },
      }
      onFormDataChange(updatedFormData)
    }
  }, [])

  return (
    <div>
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
            To Parents/Guardians: This copy of the Grades 1-6 Report Card should be retained for
            reference...
          </p>
          <CRow>
            <CCol md={6}>
              <SignaturePad
                title="Teacher's Signature"
                initialValue={formData.teacherSignature}
                onSignatureChange={(value) => {
                  console.log('Teacher signature changed:', value)
                  onFormDataChange({ ...formData, teacherSignature: value })
                }}
              />
            </CCol>
            <CCol md={6}>
              <SignaturePad
                title="Principal's Signature"
                initialValue={formData.principalSignature}
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
 * Main Elementary 1-6 Report UI Component
 */
const Elementary1to6ReportUI = ({
  formData,
  onFormDataChange,
  loading = false,
  error = null,
  onSaveDraft,
  isSaving,
  saveMessage,
  selectedStudent,
  selectedReportCard,
  selectedTerm = 'term1', // B7: Default to term1 if not provided
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

  // Dummy function for compatibility with AICommentField - actual AI generation is handled by AIReportCommentInput
  const handleGenerate = () => {
    // This function is not used anymore since AIReportCommentInput handles the AI generation
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
              <LearningSkillsSection
                formData={formData}
                onFormDataChange={onFormDataChange}
                onGenerate={handleGenerate}
                isGenerating={false} // No longer generating here, handled by AIReportCommentInput
              />
            </CAccordionBody>
          </CAccordionItem>

          <CAccordionItem itemKey="subject-areas">
            <CAccordionHeader>
              <div className="d-flex justify-content-between align-items-center w-100 me-3">
                <span>Subject Areas & Marks</span>
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
              <SubjectAreasSection
                formData={formData}
                onFormDataChange={onFormDataChange}
                onGenerate={handleGenerate}
                isGenerating={false} // No longer generating here, handled by AIReportCommentInput
                selectedTerm={selectedTerm}
              />
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
              <CommentsSignaturesSection
                formData={formData}
                onFormDataChange={onFormDataChange}
                onGenerate={handleGenerate}
                isGenerating={false} // No longer generating here, handled by AIReportCommentInput
              />
            </CAccordionBody>
          </CAccordionItem>
        </CAccordion>
      </CForm>
    </div>
  )
}

Elementary1to6ReportUI.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
}

export default Elementary1to6ReportUI
