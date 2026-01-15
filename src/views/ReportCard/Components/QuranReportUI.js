import React, { useState, useEffect } from 'react'
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
  CAlert,
  CAccordion,
  CAccordionItem,
  CAccordionHeader,
  CAccordionBody,
  CSpinner,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'
import SaveButton from '../../../components/SaveButton'
import {
  cilBook,
  cilUser,
  cilSchool,
  cilCalendar,
  cilNotes,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import PropTypes from 'prop-types'
import AIReportCommentInput from '../../../components/AIReportCommentInput'
import './QuranReportUI.css'

/**
 * AI-Enhanced Text Area for Quran Report
 */
const AICommentField = ({
  name,
  value,
  onChange,
  placeholder,
  rows = 6,
  maxLength = 1500,
  formData,
  onFormDataChange,
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
          paddingBottom: '25px',
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
            subject: 'Quran Studies',
            hifdhTerm1: formData.hifdhTerm1,
            hifdhTerm2: formData.hifdhTerm2,
            tajweedTerm1: formData.tajweedTerm1,
            tajweedTerm2: formData.tajweedTerm2,
            tafsirTerm1: formData.tafsirTerm1,
            tafsirTerm2: formData.tafsirTerm2,
          }}
          handleChange={(field, aiValue) => {
            if (field === 'teacher_comments' || field === 'strengths_next_steps') {
              onFormDataChange({ ...formData, [name]: aiValue })
            }
          }}
          buttonText=""
          explicitReportType="Quran Studies Report"
          className="ai-button-minimal"
        />
      </div>

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
  maxLength: PropTypes.number,
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
}

/**
 * Student Information Section
 */
const StudentInfoSection = ({ formData, onFormDataChange }) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target
    onFormDataChange({
      ...formData,
      [name]: value,
    })
  }

  // Sync student name to 'name' field for PDF (PDF uses 'name', form uses 'student')
  // This ensures the PDF preview shows the student name correctly
  useEffect(() => {
    if (formData.student && !formData.name) {
      onFormDataChange({
        ...formData,
        name: formData.student,
      })
    }
  }, [formData.student, formData.name])

  return (
    <div>
      <CRow>
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
              readOnly
              className="bg-light"
              title="Student name is automatically set from student selection"
            />
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="grade">Grade Level *</CFormLabel>
            <CFormInput
              id="grade"
              name="grade"
              value={formData.grade || ''}
              onChange={handleInputChange}
              placeholder="Enter grade"
              required
              readOnly
              className="bg-light"
              title="Grade is automatically set from student selection"
            />
          </div>
        </CCol>

        <CCol md={6}>
          <h6 className="text-primary mb-3">
            <CIcon icon={cilSchool} className="me-2" />
            Report Information
          </h6>

          <div className="mb-3">
            <CFormLabel htmlFor="teacher">Teacher Name *</CFormLabel>
            <CFormInput
              id="teacher"
              name="teacher"
              value={formData.teacher || ''}
              onChange={handleInputChange}
              placeholder="Enter teacher name"
              required
              readOnly
              className="bg-light"
              title="Teacher name is automatically set"
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
      </CRow>
    </div>
  )
}

StudentInfoSection.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
}

/**
 * Quran Assessment Section
 * Contains the grade ratings for Hifdh, Tajweed, and Tafsir
 * Shows only the relevant term based on selectedTerm prop
 */
const QuranAssessmentSection = ({ formData, onFormDataChange, selectedTerm = 'term1' }) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target
    onFormDataChange({
      ...formData,
      [name]: value,
    })
  }

  const strands = [
    {
      name: 'Memorization (Hifdh)',
      term1Key: 'hifdhTerm1',
      term2Key: 'hifdhTerm2',
      description: 'Ability to memorize and recite Quranic verses accurately',
    },
    {
      name: 'Pronunciation (Tajweed)',
      term1Key: 'tajweedTerm1',
      term2Key: 'tajweedTerm2',
      description: 'Correct pronunciation and application of Tajweed rules',
    },
    {
      name: 'Understanding (Tafsir)',
      term1Key: 'tafsirTerm1',
      term2Key: 'tafsirTerm2',
      description: 'Comprehension and interpretation of Quranic meanings',
    },
  ]

  const ratingOptions = [
    { value: '', label: 'Select' },
    { value: 'E', label: 'E - Excellent' },
    { value: 'G', label: 'G - Good' },
    { value: 'S', label: 'S - Satisfactory' },
    { value: 'N', label: 'N - Needs Improvement' },
  ]

  // Determine which term to show based on selectedTerm
  const isTerm1 = selectedTerm === 'term1'
  const termLabel = isTerm1 ? 'Term 1' : 'Term 2'

  return (
    <div>
      <div className="mb-4">
        <p className="text-muted">
          Rate the student's performance in each strand for <strong>{termLabel}</strong>. 
          Use E (Excellent), G (Good), S (Satisfactory), or N (Needs Improvement).
        </p>
      </div>

      {/* Rating Legend */}
      <CCard className="mb-4 border-0" style={{ backgroundColor: '#f8f9fa' }}>
        <CCardBody className="py-2">
          <div className="d-flex justify-content-around flex-wrap">
            <span><strong>E</strong> = Excellent</span>
            <span><strong>G</strong> = Good</span>
            <span><strong>S</strong> = Satisfactory</span>
            <span><strong>N</strong> = Needs Improvement</span>
          </div>
        </CCardBody>
      </CCard>

      {/* Assessment Table - Shows only the selected term */}
      <CCard className="border-0 shadow-sm">
        <CCardBody className="p-0">
          <CTable bordered responsive className="mb-0">
            <CTableHead style={{ backgroundColor: '#198754', color: 'white' }}>
              <CTableRow>
                <CTableHeaderCell style={{ width: '40%' }}>Strand</CTableHeaderCell>
                <CTableHeaderCell className="text-center" style={{ width: '20%' }}>{termLabel}</CTableHeaderCell>
                <CTableHeaderCell style={{ width: '40%' }}>Description</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {strands.map((strand) => {
                // Use the appropriate field key based on selected term
                const fieldKey = isTerm1 ? strand.term1Key : strand.term2Key
                
                return (
                  <CTableRow key={fieldKey}>
                    <CTableDataCell className="fw-bold align-middle">
                      <CIcon icon={cilBook} className="me-2 text-success" />
                      {strand.name}
                    </CTableDataCell>
                    <CTableDataCell className="text-center align-middle">
                      <CFormSelect
                        id={fieldKey}
                        name={fieldKey}
                        value={formData[fieldKey] || ''}
                        onChange={handleInputChange}
                        style={{ minWidth: '100px' }}
                      >
                        {ratingOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.value || 'Select'}
                          </option>
                        ))}
                      </CFormSelect>
                    </CTableDataCell>
                    <CTableDataCell className="text-muted align-middle" style={{ fontSize: '0.9rem' }}>
                      {strand.description}
                    </CTableDataCell>
                  </CTableRow>
                )
              })}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>
    </div>
  )
}

QuranAssessmentSection.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
  selectedTerm: PropTypes.string,
}

/**
 * Comments Section with AI Generation
 */
const CommentsSection = ({ formData, onFormDataChange }) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target
    onFormDataChange({
      ...formData,
      [name]: value,
    })
  }

  return (
    <div>
      <div className="mb-3">
        <h6 className="text-primary mb-3">
          <CIcon icon={cilNotes} className="me-2" />
          Strengths/Next Steps for Improvement
        </h6>
        <p className="text-muted mb-3">
          Provide detailed feedback on the student's strengths and areas for improvement in Quran Studies.
          Use the AI assistant button to generate personalized comments based on the student's performance ratings.
        </p>
        <AICommentField
          name="sans"
          value={formData.sans || ''}
          onChange={handleInputChange}
          placeholder="Enter strengths and next steps for improvement in Quran Studies. You can use the AI button to generate personalized comments based on the student's grades..."
          rows={8}
          maxLength={1500}
          formData={formData}
          onFormDataChange={onFormDataChange}
        />
      </div>
    </div>
  )
}

CommentsSection.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
}

/**
 * Main Quran Report UI Component
 */
const QuranReportUI = ({
  formData,
  onFormDataChange,
  loading = false,
  error = null,
  onSaveDraft,
  isSaving,
  saveMessage,
  selectedStudent,
  selectedReportCard,
  selectedTerm = 'term1',
}) => {
  const [activeAccordion, setActiveAccordion] = useState([
    'student-info',
    'assessment',
    'comments',
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
                <span>
                  <CIcon icon={cilUser} className="me-2" />
                  Student Information
                </span>
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
              <StudentInfoSection formData={formData} onFormDataChange={onFormDataChange} />
            </CAccordionBody>
          </CAccordionItem>

          <CAccordionItem itemKey="assessment">
            <CAccordionHeader>
              <div className="d-flex justify-content-between align-items-center w-100 me-3">
                <span>
                  <CIcon icon={cilBook} className="me-2" />
                  Quran Studies Assessment - {selectedTerm === 'term1' ? 'Term 1' : 'Term 2'}
                </span>
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
              <QuranAssessmentSection 
                formData={formData} 
                onFormDataChange={onFormDataChange} 
                selectedTerm={selectedTerm}
              />
            </CAccordionBody>
          </CAccordionItem>

          <CAccordionItem itemKey="comments">
            <CAccordionHeader>
              <div className="d-flex justify-content-between align-items-center w-100 me-3">
                <span>
                  <CIcon icon={cilNotes} className="me-2" />
                  Strengths/Next Steps for Improvement
                </span>
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
              <CommentsSection formData={formData} onFormDataChange={onFormDataChange} />
            </CAccordionBody>
          </CAccordionItem>
        </CAccordion>
      </CForm>
    </div>
  )
}

QuranReportUI.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onSaveDraft: PropTypes.func,
  isSaving: PropTypes.bool,
  saveMessage: PropTypes.string,
  selectedStudent: PropTypes.object,
  selectedReportCard: PropTypes.string,
  selectedTerm: PropTypes.string,
}

export default QuranReportUI

