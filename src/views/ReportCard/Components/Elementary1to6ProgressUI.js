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
import useCurrentTeacher from '../../../hooks/useCurrentTeacher'
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
              placeholder="Student name will be auto-filled"
              required
              readOnly
              className="bg-light"
            />
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="OEN">Ontario Education Number (OEN) *</CFormLabel>
            <CFormInput
              id="OEN"
              name="OEN"
              value={formData.OEN || ''}
              onChange={handleInputChange}
              placeholder="OEN will be auto-filled"
              maxLength={9}
              required
              readOnly
              className="bg-light"
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
              disabled={formData.grade ? true : false}
              className={formData.grade ? 'bg-light' : ''}
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
              placeholder="Will be auto-filled"
              type="number"
              min="0"
              readOnly
              className="bg-light"
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
              placeholder="Will be auto-filled"
              type="number"
              min="0"
              readOnly
              className="bg-light"
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
              placeholder="Will be auto-filled"
              type="number"
              min="0"
              readOnly
              className="bg-light"
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
              placeholder="Will be auto-filled"
              type="number"
              min="0"
              readOnly
              className="bg-light"
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
      key: 'responsibiity1',
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

      {/* Strengths and Next Steps with AI */}
      <CRow className="mt-4">
        <CCol md={12}>
          <div className="mb-3">
            <CFormLabel htmlFor="strengthsAndNextStepsForImprovements">
              <CIcon icon={cilLightbulb} className="me-2" />
              Strengths and Next Steps for Improvement
            </CFormLabel>
            <CFormTextarea
              id="strengthsAndNextStepsForImprovements"
              name="strengthsAndNextStepsForImprovements"
              value={formData.strengthsAndNextStepsForImprovements || ''}
              onChange={handleInputChange}
              placeholder="Describe the student's strengths in learning skills and work habits, and identify specific next steps for improvement..."
              rows={6}
            />
            <div className="form-text">
              Provide specific, constructive feedback on the student's learning skills and work
              habits. Maximum 1000 characters.
            </div>
            <small className="text-muted">
              {(formData.strengthsAndNextStepsForImprovements || '').length} / 1000 characters
            </small>
          </div>

          {/* AI Generation for Learning Skills */}
          <AIReportCommentInput
            label="Generate Learning Skills Comments"
            formData={{
              student_name: formData.student,
              grade: formData.grade,
              subject: 'Learning Skills & Work Habits',
            }}
            handleChange={(field, value) => {
              // Map AI output to the actual form field
              if (field === 'teacher_comments' || field === 'strengths_next_steps') {
                onFormDataChange({ ...formData, strengthsAndNextStepsForImprovements: value })
              }
            }}
            buttonText="Generate Learning Skills Comments"
            explicitReportType="Elementary 1-6 Progress Report"
          />
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
}

/**
 * Subject Areas Section
 * Modern form section for subject area assessments
 */
const SubjectAreasSection = ({ formData, onFormDataChange }) => {
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
    },
    {
      name: 'Mathematics',
      key: 'math',
      fields: ['mathESL', 'mathIEP', 'mathFrench'],
      performanceFields: ['mathWithDifficulty', 'mathWell', 'mathVeryWell'],
    },
    {
      name: 'Science',
      key: 'science',
      fields: ['scienceESL', 'scienceIEP', 'scienceFrench'],
      performanceFields: ['scienceWithDifficulty', 'scienceWell', 'scienceVeryWell'],
    },
    {
      name: 'Social Studies',
      key: 'socialStudies',
      fields: ['socialStudiesESL', 'socialStudiesIEP', 'socialStudiesFrench'],
      performanceFields: ['socialWithDifficulty', 'socialStudiesWell', 'socialStudiesVeryWell'],
    },
    {
      name: 'Health Education',
      key: 'healthEd',
      fields: ['healthEdESL', 'healthEdIEP', 'healthEdFrench'],
      performanceFields: ['healthEdWithDifficulty', 'healthEdWell', 'healthEdVeryWell'],
    },
    {
      name: 'Physical Education',
      key: 'pe',
      fields: ['peESL', 'peIEP', 'peFrench'],
      performanceFields: ['peWithDifficulty', 'peWell', 'peVeryWell'],
    },
    {
      name: 'Dance',
      key: 'dance',
      fields: ['danceESL', 'danceIEP', 'danceFrench', 'danceNA'],
      performanceFields: ['danceWithDifficulty', 'danceWell', 'danceVeryWell'],
    },
    {
      name: 'Drama',
      key: 'drama',
      fields: ['dramaESL', 'dramaIEP', 'dramaFrench', 'dramaNA'],
      performanceFields: ['dramaWithDifficulty', 'dramaWell', 'dramaVeryWell'],
    },
    {
      name: 'Music',
      key: 'music',
      fields: ['musicESL', 'musicIEP', 'musicFrench', 'musicNA'],
      performanceFields: ['musicWithDifficulty', 'musicWell', 'musicVeryWell'],
    },
    {
      name: 'Visual Arts',
      key: 'visualArts',
      fields: ['visualArtsESL', 'visualArtsIEP', 'visualArtsFrench', 'visualArtsNA'],
      performanceFields: ['visualArtsWithDifficulty', 'visualArtsWell', 'visualArtsVeryWell'],
    },
    {
      name: 'Other',
      key: 'other',
      fields: ['otherESL', 'otherIEP', 'otherFrench', 'otherNA'],
      performanceFields: ['otherWithDifficulty', 'otherWell', 'otherVeryWell'],
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
                </CCol>
              )}

              {/* Performance Levels */}
              {subject.performanceFields.length > 0 && (
                <CCol md={6}>
                  <h6 className="text-success mb-3">Performance Level</h6>
                  <div className="d-flex flex-wrap gap-3">
                    {subject.performanceFields.map((field) => {
                      // Extract performance type from field name
                      let performanceType = ''
                      const fieldLower = field.toLowerCase()

                      if (fieldLower.includes('withdifficulty')) performanceType = 'withdifficulty'
                      else if (fieldLower.includes('well')) performanceType = 'well'
                      else if (fieldLower.includes('verywell')) performanceType = 'verywell'

                      const label = performanceLabels[performanceType] || field

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
                </CCol>
              )}
            </CRow>
          </CCardBody>
        </CCard>
      ))}

      {/* Additional Comments for Subject Areas */}
      <CRow className="mt-4">
        <CCol md={12}>
          <div className="mb-3">
            <CFormLabel htmlFor="strengthsAndNextStepsForImprovements2">
              <CIcon icon={cilLightbulb} className="me-2" />
              Additional Comments for Subject Areas
            </CFormLabel>
            <CFormTextarea
              id="strengthsAndNextStepsForImprovements2"
              name="strengthsAndNextStepsForImprovements2"
              value={formData.strengthsAndNextStepsForImprovements2 || ''}
              onChange={handleInputChange}
              placeholder="Provide additional comments about the student's performance across subject areas..."
              rows={4}
            />
            <div className="form-text">
              Optional comments about the student's overall academic performance and areas for
              improvement. Maximum 500 characters.
            </div>
            <small className="text-muted">
              {(formData.strengthsAndNextStepsForImprovements2 || '').length} / 500 characters
            </small>
          </div>

          {/* AI Generation for Subject Areas */}
          <AIReportCommentInput
            label="Generate Subject Area Comments"
            formData={{
              student_name: formData.student,
              grade: formData.grade,
              subject: 'All Subjects',
            }}
            handleChange={(field, value) => {
              // Map AI output to the actual form field
              if (field === 'teacher_comments' || field === 'strengths_next_steps') {
                onFormDataChange({ ...formData, strengthsAndNextStepsForImprovements2: value })
              }
            }}
            buttonText="Generate Subject Comments"
            explicitReportType="Elementary 1-6 Progress Report"
          />
        </CCol>
      </CRow>
    </div>
  )
}

SubjectAreasSection.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
}

/**
 * Comments & Signatures Section
 * Matches the Kindergarten report card structure exactly
 */
const CommentsSignaturesSection = ({ formData, onFormDataChange }) => {
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
            <CFormLabel htmlFor="strengthsAndNextStepsForImprovements2">
              <CIcon icon={cilLightbulb} className="me-2" />
              Additional Comments
            </CFormLabel>
            <CFormTextarea
              id="strengthsAndNextStepsForImprovements2"
              name="strengthsAndNextStepsForImprovements2"
              value={formData.strengthsAndNextStepsForImprovements2 || ''}
              onChange={handleInputChange}
              placeholder="Provide any additional comments about the student's progress, achievements, or areas for improvement..."
              rows={4}
            />
            <div className="form-text">
              Optional additional comments about the student's overall progress and achievements.
            </div>

            {/* AI Generation for Additional Comments */}
            <AIReportCommentInput
              label="Generate Additional Comments"
              formData={{
                student_name: formData.student,
                grade: formData.grade,
                subject: 'Overall Progress',
              }}
              handleChange={(field, value) => {
                // Map AI output to the actual form field
                if (field === 'teacher_comments' || field === 'strengths_next_steps') {
                  onFormDataChange({ ...formData, strengthsAndNextStepsForImprovements2: value })
                }
              }}
              buttonText="Generate Additional Comments"
              explicitReportType="Elementary 1-6 Progress Report"
            />
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
            To Parents/Guardians: This copy of the Grades 1-6 Progress Report should be retained for
            reference...
          </p>
          <CRow>
            <CCol md={6}>
              <SignaturePad
                title="Teacher's Signature"
                onSignatureChange={(value) => {
                  console.log('Teacher signature changed:', value)
                  onFormDataChange({ ...formData, teachersignature: value })
                }}
              />
            </CCol>
            <CCol md={6}>
              <SignaturePad
                title="Principal's Signature"
                onSignatureChange={(value) => {
                  console.log('Principal signature changed:', value)
                  onFormDataChange({ ...formData, principalsignature: value })
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
}

/**
 * Main Elementary 1-6 Progress UI Component
 */
const Elementary1to6ProgressUI = ({
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
            <CAccordionHeader>Student & School Information</CAccordionHeader>
            <CAccordionBody>
              <StudentSchoolInfoSection formData={formData} onFormDataChange={onFormDataChange} />
            </CAccordionBody>
          </CAccordionItem>

          <CAccordionItem itemKey="learning-skills">
            <CAccordionHeader>Learning Skills & Work Habits</CAccordionHeader>
            <CAccordionBody>
              <LearningSkillsSection formData={formData} onFormDataChange={onFormDataChange} />
            </CAccordionBody>
          </CAccordionItem>

          <CAccordionItem itemKey="subject-areas">
            <CAccordionHeader>Subject Areas</CAccordionHeader>
            <CAccordionBody>
              <SubjectAreasSection formData={formData} onFormDataChange={onFormDataChange} />
            </CAccordionBody>
          </CAccordionItem>

          <CAccordionItem itemKey="comments-signatures">
            <CAccordionHeader>Comments & Signatures</CAccordionHeader>
            <CAccordionBody>
              <CommentsSignaturesSection formData={formData} onFormDataChange={onFormDataChange} />
            </CAccordionBody>
          </CAccordionItem>
        </CAccordion>
      </CForm>
    </div>
  )
}

Elementary1to6ProgressUI.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
}

export default Elementary1to6ProgressUI
