import React, { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import {
  CForm,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CFormSelect,
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CCol,
  CRow,
  CAccordion,
  CAccordionItem,
  CAccordionHeader,
  CAccordionBody,
  CSpinner,
  CAlert,
  CButtonGroup,
} from '@coreui/react'
import SaveButton from '../../../components/SaveButton'
import CIcon from '@coreui/icons-react'
import {
  cilStar,
  cilLightbulb,
  cilUser,
  cilBook,
  cilCommentSquare,
  cilArrowRight,
  cilPencil,
  cilMenu,
} from '@coreui/icons'

import SignatureCanvas from 'react-signature-canvas'
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
          explicitReportType="Kindergarten Communication of Learning"
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
  if (fieldName === 'keyLearning' || fieldName === 'keyLearning2') return 'Key Learning'
  if (fieldName === 'growthInLearning' || fieldName === 'growthInLearning2')
    return 'Growth in Learning'
  if (fieldName === 'nextStepsInLearning' || fieldName === 'nextStepsInLearning2')
    return 'Next Steps in Learning'
  return 'Kindergarten Learning'
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
 * Provides multiple modes for capturing a signature: typing, drawing, or uploading.
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
 * Matches the exact layout of the kindergarten report card
 */
const StudentSchoolInfoSection = ({ formData, onFormDataChange }) => {
  const handleInputChange = (e) => {
    onFormDataChange({ ...formData, [e.target.name]: e.target.value })
  }

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target
    const newFormData = { ...formData, [name]: checked }

    // Enforce mutual exclusivity for checkbox groups
    if (checked) {
      if (name === 'year1') newFormData.year2 = false
      if (name === 'year2') newFormData.year1 = false

      if (name === 'frenchImmersion') {
        newFormData.frenchCore = false
        newFormData.frenchExtended = false
      }
      if (name === 'frenchCore') {
        newFormData.frenchImmersion = false
        newFormData.frenchExtended = false
      }
      if (name === 'frenchExtended') {
        newFormData.frenchImmersion = false
        newFormData.frenchCore = false
      }
    }

    onFormDataChange(newFormData)
  }

  // Set default date to today if not already set
  React.useEffect(() => {
    if (!formData.date) {
      const today = new Date().toISOString().split('T')[0]
      onFormDataChange({ ...formData, date: today })
    }
  }, [])

  // Auto-populate grade level based on student's grade
  // JK (Junior Kindergarten) → Year 1, SK (Senior Kindergarten) → Year 2
  React.useEffect(() => {
    if (formData.grade && !formData.year1 && !formData.year2) {
      const grade = formData.grade.toLowerCase()
      let newFormData = { ...formData }

      // JK (Junior Kindergarten) → Year 1
      if (grade.includes('jk') || grade === 'junior kindergarten') {
        newFormData.year1 = true
        newFormData.year2 = false
      } 
      // SK (Senior Kindergarten) → Year 2
      else if (grade.includes('sk') || grade === 'senior kindergarten') {
        newFormData.year1 = false
        newFormData.year2 = true
      }
      // Fallback: check for year 1/2 or grade 1/2 patterns
      else if (grade.includes('1') || grade.includes('year 1') || grade.includes('grade 1')) {
        newFormData.year1 = true
        newFormData.year2 = false
      } else if (grade.includes('2') || grade.includes('year 2') || grade.includes('grade 2')) {
        newFormData.year1 = false
        newFormData.year2 = true
      }

      if (newFormData.year1 !== formData.year1 || newFormData.year2 !== formData.year2) {
        onFormDataChange(newFormData)
      }
    }
  }, [formData.grade]) // Only depend on grade, not on year1/year2 to avoid interference

  return (
    <CCard className="mb-4 shadow-sm">
      <CCardHeader className="bg-primary text-white">
        <div className="d-flex align-items-center">
          <CIcon icon={cilUser} className="me-2" />
          <h5 className="mb-0">Student & School Information</h5>
        </div>
      </CCardHeader>
      <CCardBody className="p-4">
        {/* Date Field - First at the top */}
        <CRow className="mb-3">
          <CCol md={6}>
            <CFormLabel htmlFor="date" className="fw-semibold text-dark">
              Date <span className="text-danger">*</span>
            </CFormLabel>
            <CFormInput
              type="date"
              id="date"
              name="date"
              value={formData.date || ''}
              onChange={handleInputChange}
              style={{ borderRadius: '8px', border: '2px solid #e9ecef' }}
              required
            />
          </CCol>
        </CRow>

        {/* First Row: Student Name, OEN, Days Absent, Total Days Absent */}
        <CRow className="mb-3">
          <CCol md={4}>
            <CFormLabel className="fw-semibold text-dark">
              Student Name <span className="text-danger">*</span>
            </CFormLabel>
            <CFormInput
              name="student"
              type="text"
              value={formData['student'] || ''}
              onChange={handleInputChange}
              placeholder="Enter student name"
              className="form-control-lg"
              style={{ borderRadius: '8px', border: '2px solid #e9ecef' }}
              required
            />
          </CCol>
          <CCol md={2}>
            <CFormLabel className="fw-semibold text-dark">OEN</CFormLabel>
            <CFormInput
              name="OEN"
              type="text"
              value={formData['OEN'] || ''}
              onChange={handleInputChange}
              placeholder="Enter OEN"
              style={{ borderRadius: '8px', border: '2px solid #e9ecef' }}
            />
          </CCol>
          <CCol md={3}>
            <CFormLabel className="fw-semibold text-dark">Days Absent</CFormLabel>
            <CFormInput
              name="daysAbsent"
              type="number"
              value={formData['daysAbsent'] ?? ''}
              onChange={handleInputChange}
              placeholder="Enter days absent"
              min="0"
              style={{ borderRadius: '8px', border: '2px solid #e9ecef' }}
            />
          </CCol>
          <CCol md={3}>
            <CFormLabel className="fw-semibold text-dark">Total Days Absent</CFormLabel>
            <CFormInput
              name="totalDaysAbsent"
              type="number"
              value={formData['totalDaysAbsent'] ?? ''}
              onChange={handleInputChange}
              placeholder="Enter total days absent"
              min="0"
              style={{ borderRadius: '8px', border: '2px solid #e9ecef' }}
            />
          </CCol>
        </CRow>

        {/* Second Row: Grade Level */}
        <CRow className="mb-3">
          <CCol md={6}>
            <div className="d-flex align-items-center gap-2">
              <CFormLabel className="fw-semibold text-dark mb-0">Grade Level:</CFormLabel>
              <div className="me-3">
                <input
                  type="checkbox"
                  id="year1"
                  name="year1"
                  checked={formData.year1 || false}
                  onChange={handleCheckboxChange}
                  style={{
                    width: '16px',
                    height: '16px',
                    marginRight: '8px',
                    cursor: 'pointer',
                  }}
                />
                <label htmlFor="year1" style={{ cursor: 'pointer', marginBottom: '0' }}>
                  Year 1
                </label>
              </div>
              <div>
                <input
                  type="checkbox"
                  id="year2"
                  name="year2"
                  checked={formData.year2 || false}
                  onChange={handleCheckboxChange}
                  style={{
                    width: '16px',
                    height: '16px',
                    marginRight: '8px',
                    cursor: 'pointer',
                  }}
                />
                <label htmlFor="year2" style={{ cursor: 'pointer', marginBottom: '0' }}>
                  Year 2
                </label>
              </div>
            </div>
          </CCol>
          <CCol md={3}>
            <CFormLabel className="fw-semibold text-dark">Times Late</CFormLabel>
            <CFormInput
              name="timesLate"
              type="number"
              value={formData['timesLate'] ?? ''}
              onChange={handleInputChange}
              placeholder="Enter times late"
              min="0"
              style={{ borderRadius: '8px', border: '2px solid #e9ecef' }}
            />
          </CCol>
          <CCol md={3}>
            <CFormLabel className="fw-semibold text-dark">Total Times Late</CFormLabel>
            <CFormInput
              name="totalTimesLate"
              type="number"
              value={formData['totalTimesLate'] ?? ''}
              onChange={handleInputChange}
              placeholder="Enter total times late"
              min="0"
              style={{ borderRadius: '8px', border: '2px solid #e9ecef' }}
            />
          </CCol>
        </CRow>

        {/* Third Row: French Program */}
        <CRow className="mb-3">
          <CCol md={12}>
            <div className="d-flex align-items-center gap-2">
              <CFormLabel className="fw-semibold text-dark mb-0">French:</CFormLabel>
              <div className="me-3">
                <input
                  type="checkbox"
                  id="frenchImmersion"
                  name="frenchImmersion"
                  checked={formData.frenchImmersion || false}
                  onChange={handleCheckboxChange}
                  style={{
                    width: '16px',
                    height: '16px',
                    marginRight: '8px',
                    cursor: 'pointer',
                  }}
                />
                <label htmlFor="frenchImmersion" style={{ cursor: 'pointer', marginBottom: '0' }}>
                  Immersion
                </label>
              </div>
              <div className="me-3">
                <input
                  type="checkbox"
                  id="frenchCore"
                  name="frenchCore"
                  checked={formData.frenchCore || false}
                  onChange={handleCheckboxChange}
                  style={{
                    width: '16px',
                    height: '16px',
                    marginRight: '8px',
                    cursor: 'pointer',
                  }}
                />
                <label htmlFor="frenchCore" style={{ cursor: 'pointer', marginBottom: '0' }}>
                  Core
                </label>
              </div>
              <div>
                <input
                  type="checkbox"
                  id="frenchExtended"
                  name="frenchExtended"
                  checked={formData.frenchExtended || false}
                  onChange={handleCheckboxChange}
                  style={{
                    width: '16px',
                    height: '16px',
                    marginRight: '8px',
                    cursor: 'pointer',
                  }}
                />
                <label htmlFor="frenchExtended" style={{ cursor: 'pointer', marginBottom: '0' }}>
                  Extended
                </label>
              </div>
            </div>
          </CCol>
        </CRow>

        {/* Fourth Row: Teacher, Early Childhood Educator */}
        <CRow className="mb-3">
          <CCol md={6}>
            <CFormLabel className="fw-semibold text-dark">
              Teacher <span className="text-danger">*</span>
            </CFormLabel>
            <CFormInput
              name="teacher"
              type="text"
              value={formData.teacher_name || formData['teacher'] || ''}
              readOnly
              className="form-control-lg bg-light"
              style={{ borderRadius: '8px', border: '2px solid #e9ecef' }}
              required
              title="Teacher name is automatically set from homeroom teacher"
            />
          </CCol>
          <CCol md={6}>
            <CFormLabel className="fw-semibold text-dark">Early Childhood Educator</CFormLabel>
            <CFormInput
              name="earlyChildEducator"
              type="text"
              value={formData['earlyChildEducator'] || ''}
              onChange={handleInputChange}
              placeholder="Enter early childhood educator's name"
              style={{ borderRadius: '8px', border: '2px solid #e9ecef' }}
            />
          </CCol>
        </CRow>

        {/* Fifth Row: Principal, Telephone, Board */}
        <CRow className="mb-3">
          <CCol md={4}>
            <CFormLabel className="fw-semibold text-dark">Principal</CFormLabel>
            <CFormInput
              name="principal"
              type="text"
              value={formData['principal'] || ''}
              onChange={handleInputChange}
              placeholder="Enter principal's name"
              style={{ borderRadius: '8px', border: '2px solid #e9ecef' }}
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel className="fw-semibold text-dark">Telephone</CFormLabel>
            <CFormInput
              name="telephone"
              type="tel"
              value={formData['telephone'] || ''}
              onChange={handleInputChange}
              placeholder="(xxx) xxx-xxxx"
              style={{ borderRadius: '8px', border: '2px solid #e9ecef' }}
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel className="fw-semibold text-dark">Board</CFormLabel>
            <CFormInput
              name="board"
              type="text"
              value={formData['board'] || ''}
              onChange={handleInputChange}
              placeholder="Enter school board name"
              style={{ borderRadius: '8px', border: '2px solid #e9ecef' }}
            />
          </CCol>
        </CRow>

        {/* Sixth Row: School, Address */}
        <CRow className="mb-3">
          <CCol md={6}>
            <CFormLabel className="fw-semibold text-dark">School</CFormLabel>
            <CFormInput
              name="school"
              type="text"
              value={formData['school'] || ''}
              onChange={handleInputChange}
              placeholder="Enter school name"
              style={{ borderRadius: '8px', border: '2px solid #e9ecef' }}
            />
          </CCol>
          <CCol md={6}>
            <CFormLabel className="fw-semibold text-dark">Address</CFormLabel>
            <CFormInput
              name="schoolAddress"
              type="text"
              value={formData['schoolAddress'] || ''}
              onChange={handleInputChange}
              placeholder="Enter school address"
              style={{ borderRadius: '8px', border: '2px solid #e9ecef' }}
            />
          </CCol>
        </CRow>

        {/* Seventh Row: Board Address */}
        <CRow>
          <CCol md={12}>
            <CFormLabel className="fw-semibold text-dark">Board Address</CFormLabel>
            <CFormInput
              name="boardAddress"
              type="text"
              value={formData['boardAddress'] || ''}
              onChange={handleInputChange}
              placeholder="Enter board address"
              style={{ borderRadius: '8px', border: '2px solid #e9ecef' }}
            />
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

StudentSchoolInfoSection.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool,
}

/**
 * Key Learning Section
 * Contains the main comment box and ESL/IEP checkboxes.
 */
const KeyLearningSection = ({ formData, onFormDataChange, onGenerate, isGenerating }) => {
  const handleInputChange = (e) => {
    onFormDataChange({ ...formData, [e.target.name]: e.target.value })
  }

  const handleCheckboxChange = (e) => {
    onFormDataChange({ ...formData, [e.target.name]: e.target.checked })
  }

  return (
    <CCard className="mb-4 shadow-sm">
      <CCardHeader className="bg-primary text-white">
        <div className="d-flex align-items-center">
          <div className="d-flex align-items-center">
            <CIcon icon={cilBook} className="me-2" />
            <h5 className="mb-0">Key Learning / Growth in Learning / Next Steps</h5>
          </div>
          <div className="ms-auto">
            <div
              className="d-flex align-items-center"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '4px 12px',
                borderRadius: '16px',
              }}
            >
              <div className="me-2">
                <input
                  type="checkbox"
                  id="keyLearningESL"
                  name="keyLearningESL"
                  checked={formData.keyLearningESL || false}
                  onChange={handleCheckboxChange}
                  style={{
                    width: '16px',
                    height: '16px',
                    marginRight: '8px',
                    cursor: 'pointer',
                  }}
                />
                <label
                  htmlFor="keyLearningESL"
                  style={{ color: 'white', fontWeight: 500, cursor: 'pointer', marginBottom: '0' }}
                >
                  ESL
                </label>
              </div>
              <div>
                <input
                  type="checkbox"
                  id="keyLearningIEP"
                  name="keyLearningIEP"
                  checked={formData.keyLearningIEP || false}
                  onChange={handleCheckboxChange}
                  style={{
                    width: '16px',
                    height: '16px',
                    marginRight: '8px',
                    cursor: 'pointer',
                  }}
                />
                <label
                  htmlFor="keyLearningIEP"
                  style={{ color: 'white', fontWeight: 500, cursor: 'pointer', marginBottom: '0' }}
                >
                  IEP
                </label>
              </div>
            </div>
          </div>
        </div>
      </CCardHeader>
      <CCardBody className="p-4">
        {/* Existing Student Information Fields */}
        <AICommentField
          name="keyLearning"
          value={formData.keyLearning || ''}
          onChange={handleInputChange}
          placeholder="Enter key learning, growth, and next steps for the student..."
          rows={12}
          isGenerating={isGenerating}
          onGenerate={onGenerate}
          maxLength={1500}
          formData={formData}
          onFormDataChange={onFormDataChange}
        />
        <AICommentField
          name="keyLearning2"
          value={formData.keyLearning2 || ''}
          onChange={handleInputChange}
          placeholder="Continue here if more space is needed..."
          rows={4}
          isGenerating={isGenerating}
          onGenerate={onGenerate}
          maxLength={500}
          className="mt-3"
          formData={formData}
          onFormDataChange={onFormDataChange}
        />
      </CCardBody>
    </CCard>
  )
}

KeyLearningSection.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
  onGenerate: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool,
}

/**
 * Signatures Section
 * Contains signature pads for the teacher and principal.
 */
const SignatureSection = ({ formData, onFormDataChange }) => {
  return (
    <CCard className="mb-4 shadow-sm">
      <CCardHeader style={{ backgroundColor: '#6f42c1', color: 'white' }}>
        <div className="d-flex align-items-center">
          <CIcon icon={cilPencil} className="me-2" />
          <h5 className="mb-0">Signatures</h5>
        </div>
      </CCardHeader>
      <CCardBody className="p-4">
        <p>
          To Parents/Guardians: This copy of the Kindergarten Communication of Learning: Initial
          Observations report should be retained for reference...
        </p>
        <CRow>
          <CCol md={6}>
            <SignaturePad
              title="Teacher's Signature"
              onSignatureChange={(value) =>
                onFormDataChange({ ...formData, teacherSignature: value })
              }
            />
          </CCol>
          <CCol md={6}>
            <SignaturePad
              title="Principal's Signature"
              onSignatureChange={(value) =>
                onFormDataChange({ ...formData, principalSignature: value })
              }
            />
          </CCol>
        </CRow>
        <hr className="my-4" />
        <p>
          Where applicable: Early Childhood Educator(s) contributed to the observation, monitoring,
          and assessment...
        </p>
      </CCardBody>
    </CCard>
  )
}

SignatureSection.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
}

/**
 * Main component for kindergarten initial observation report card
 */
const KindergartenInitialUI = ({
  formData,
  onFormDataChange,
  onSubmit,
  loading,
  error,
  onSaveDraft,
  isSaving,
  saveMessage,
  selectedStudent,
  selectedReportCard,
}) => {
  const [activeAccordion, setActiveAccordion] = useState([
    'student-info',
    'key-learning',
    'signatures',
  ])

  const handleAccordionChange = (newActive) => {
    setActiveAccordion(newActive)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
  }

  // Dummy function for compatibility with AICommentField - actual AI generation is handled by AIReportCommentInput
  const handleAIGenerate = () => {
    // This function is not used anymore since AIReportCommentInput handles the AI generation
  }

  return (
    <div className="kindergarten-initial-form">
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
      <CForm onSubmit={handleSubmit}>
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

          <CAccordionItem itemKey="key-learning">
            <CAccordionHeader>
              <div className="d-flex justify-content-between align-items-center w-100 me-3">
                <span>Key Learning / Growth in Learning / Next Steps</span>
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
              <KeyLearningSection
                formData={formData}
                onFormDataChange={onFormDataChange}
                onGenerate={handleAIGenerate}
                isGenerating={false} // No longer generating here, handled by AIReportCommentInput
              />
            </CAccordionBody>
          </CAccordionItem>

          <CAccordionItem itemKey="signatures">
            <CAccordionHeader>
              <div className="d-flex justify-content-between align-items-center w-100 me-3">
                <span>Signatures</span>
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
              <SignatureSection formData={formData} onFormDataChange={onFormDataChange} />
            </CAccordionBody>
          </CAccordionItem>
        </CAccordion>
      </CForm>
    </div>
  )
}

KindergartenInitialUI.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  loading: PropTypes.bool,
  error: PropTypes.string,
}

KindergartenInitialUI.defaultProps = {
  formData: {},
}

export default KindergartenInitialUI
