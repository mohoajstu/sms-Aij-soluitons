import { useState, useEffect } from 'react'
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
  CCardTitle,
  CButton,
  CCol,
  CRow,
  CAccordion,
  CAccordionItem,
  CAccordionHeader,
  CAccordionBody,
} from '@coreui/react'
import AIReportCommentInput from '../../../components/AIReportCommentInput'
import useCurrentTeacher from '../../../hooks/useCurrentTeacher'

/**
 * ReportCardForm component for editing report card data
 */
export function ReportCardForm({ formData, handleChange, handleSubmit }) {
  const { teacherName, loading } = useCurrentTeacher()

  // Auto-populate teacher name when component mounts or teacher name changes
  useEffect(() => {
    if (teacherName && !formData.teacher_name) {
      handleChange('teacher_name', teacherName)
    }
  }, [teacherName, formData.teacher_name, handleChange])

  // Rating options for learning skills
  const ratingOptions = [
    { value: 'E', label: 'E - Excellent' },
    { value: 'G', label: 'G - Good' },
    { value: 'S', label: 'S - Satisfactory' },
    { value: 'N', label: 'N - Needs Improvement' },
  ]

  // Grade options
  const gradeOptions = [
    { value: 'JK', label: 'Junior Kindergarten' },
    { value: 'SK', label: 'Senior Kindergarten' },
    { value: '1', label: 'Grade 1' },
    { value: '2', label: 'Grade 2' },
    { value: '3', label: 'Grade 3' },
    { value: '4', label: 'Grade 4' },
    { value: '5', label: 'Grade 5' },
    { value: '6', label: 'Grade 6' },
    { value: '7', label: 'Grade 7' },
    { value: '8', label: 'Grade 8' },
  ]

  // Term options
  const termOptions = [
    { value: '1', label: 'Term 1' },
    { value: '2', label: 'Term 2' },
    { value: '3', label: 'Term 3' },
  ]

  return (
    <CForm id="report-card-form" onSubmit={handleSubmit} className="report-card-form">
      <CAccordion alwaysOpen activeItemKey={['1', '2', '3', '4']} className="report-card-accordion">
        {/* Student Information */}
        <CAccordionItem itemKey="1">
          <CAccordionHeader className="report-card-accordion-header">
            Student Information
          </CAccordionHeader>
          <CAccordionBody className="report-card-accordion-body">
            <CCard className="report-card-form-card">
              <CCardBody>
                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel htmlFor="student_name">Student Name *</CFormLabel>
                    <CFormInput
                      id="student_name"
                      value={formData.student_name}
                      onChange={(e) => handleChange('student_name', e.target.value)}
                      placeholder="Enter student's full name"
                      required
                    />
                  </CCol>
                  <CCol md={3}>
                    <CFormLabel htmlFor="grade">Grade *</CFormLabel>
                    <CFormSelect
                      id="grade"
                      value={formData.grade}
                      onChange={(e) => handleChange('grade', e.target.value)}
                      required
                    >
                      <option value="">Select Grade</option>
                      {gradeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={3}>
                    <CFormLabel htmlFor="term">Term *</CFormLabel>
                    <CFormSelect
                      id="term"
                      value={formData.term}
                      onChange={(e) => handleChange('term', e.target.value)}
                      required
                    >
                      <option value="">Select Term</option>
                      {termOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={4}>
                    <CFormLabel htmlFor="oen">OEN</CFormLabel>
                    <CFormInput
                      id="oen"
                      value={formData.oen}
                      onChange={(e) => handleChange('oen', e.target.value)}
                      placeholder="Ontario Education Number"
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="teacher_name">Teacher Name *</CFormLabel>
                    <CFormInput
                      id="teacher_name"
                      value={formData.teacher_name || teacherName || ''}
                      onChange={(e) => handleChange('teacher_name', e.target.value)}
                      placeholder={loading ? 'Loading...' : "Enter teacher's name"}
                      required
                      disabled={loading}
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="school_year">School Year *</CFormLabel>
                    <CFormInput
                      id="school_year"
                      value={formData.school_year}
                      onChange={(e) => handleChange('school_year', e.target.value)}
                      placeholder="e.g., 2023-2024"
                      required
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel htmlFor="date">Report Date</CFormLabel>
                    <CFormInput
                      type="date"
                      id="date"
                      value={formData.date}
                      onChange={(e) => handleChange('date', e.target.value)}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="parent_name">Parent/Guardian Name</CFormLabel>
                    <CFormInput
                      id="parent_name"
                      value={formData.parent_name}
                      onChange={(e) => handleChange('parent_name', e.target.value)}
                      placeholder="Enter parent/guardian name"
                    />
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          </CAccordionBody>
        </CAccordionItem>

        {/* School Information */}
        <CAccordionItem itemKey="2">
          <CAccordionHeader className="report-card-accordion-header">
            School Information
          </CAccordionHeader>
          <CAccordionBody className="report-card-accordion-body">
            <CCard className="report-card-form-card">
              <CCardBody>
                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel htmlFor="board">School Board</CFormLabel>
                    <CFormInput
                      id="board"
                      value={formData.board}
                      onChange={(e) => handleChange('board', e.target.value)}
                      placeholder="School Board Name"
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="school">School Name</CFormLabel>
                    <CFormInput
                      id="school"
                      value={formData.school}
                      onChange={(e) => handleChange('school', e.target.value)}
                      placeholder="School Name"
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel htmlFor="address_1">School Address</CFormLabel>
                    <CFormInput
                      id="address_1"
                      value={formData.address_1}
                      onChange={(e) => handleChange('address_1', e.target.value)}
                      placeholder="Street Address"
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="address_2">City, Province, Postal Code</CFormLabel>
                    <CFormInput
                      id="address_2"
                      value={formData.address_2}
                      onChange={(e) => handleChange('address_2', e.target.value)}
                      placeholder="City, Province, Postal Code"
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel htmlFor="principal">Principal Name</CFormLabel>
                    <CFormInput
                      id="principal"
                      value={formData.principal}
                      onChange={(e) => handleChange('principal', e.target.value)}
                      placeholder="Principal Name"
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="telephone">School Telephone</CFormLabel>
                    <CFormInput
                      id="telephone"
                      value={formData.telephone}
                      onChange={(e) => handleChange('telephone', e.target.value)}
                      placeholder="Phone Number"
                    />
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          </CAccordionBody>
        </CAccordionItem>

        {/* Attendance */}
        <CAccordionItem itemKey="3">
          <CAccordionHeader className="report-card-accordion-header">Attendance</CAccordionHeader>
          <CAccordionBody className="report-card-accordion-body">
            <CCard className="report-card-form-card">
              <CCardBody>
                <CRow className="mb-3">
                  <CCol md={3}>
                    <CFormLabel htmlFor="days_absent">Days Absent</CFormLabel>
                    <CFormInput
                      type="number"
                      id="days_absent"
                      value={formData.days_absent}
                      onChange={(e) => handleChange('days_absent', e.target.value)}
                      placeholder="Will be auto-filled"
                      min="0"
                      readOnly
                      className="bg-light"
                    />
                  </CCol>
                  <CCol md={3}>
                    <CFormLabel htmlFor="total_days_absent">Total Days Absent</CFormLabel>
                    <CFormInput
                      type="number"
                      id="total_days_absent"
                      value={formData.total_days_absent}
                      onChange={(e) => handleChange('total_days_absent', e.target.value)}
                      placeholder="Will be auto-filled"
                      min="0"
                      readOnly
                      className="bg-light"
                    />
                  </CCol>
                  <CCol md={3}>
                    <CFormLabel htmlFor="times_late">Times Late</CFormLabel>
                    <CFormInput
                      type="number"
                      id="times_late"
                      value={formData.times_late}
                      onChange={(e) => handleChange('times_late', e.target.value)}
                      placeholder="Will be auto-filled"
                      min="0"
                      readOnly
                      className="bg-light"
                    />
                  </CCol>
                  <CCol md={3}>
                    <CFormLabel htmlFor="total_times_late">Total Times Late</CFormLabel>
                    <CFormInput
                      type="number"
                      id="total_times_late"
                      value={formData.total_times_late}
                      onChange={(e) => handleChange('total_times_late', e.target.value)}
                      placeholder="Will be auto-filled"
                      min="0"
                      readOnly
                      className="bg-light"
                    />
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          </CAccordionBody>
        </CAccordionItem>

        {/* Learning Skills and Work Habits */}
        <CAccordionItem itemKey="4">
          <CAccordionHeader className="report-card-accordion-header">
            Learning Skills and Work Habits
          </CAccordionHeader>
          <CAccordionBody className="report-card-accordion-body">
            <CCard className="report-card-form-card">
              <CCardBody>
                <div className="mb-3">
                  <small className="text-muted">
                    E = Excellent, G = Good, S = Satisfactory, N = Needs Improvement
                  </small>
                </div>

                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel>Responsibility</CFormLabel>
                    <CFormSelect
                      value={formData.responsibility}
                      onChange={(e) => handleChange('responsibility', e.target.value)}
                    >
                      <option value="">Select rating</option>
                      {ratingOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>

                  <CCol md={6}>
                    <CFormLabel>Organization</CFormLabel>
                    <CFormSelect
                      value={formData.organization}
                      onChange={(e) => handleChange('organization', e.target.value)}
                    >
                      <option value="">Select rating</option>
                      {ratingOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel>Independent Work</CFormLabel>
                    <CFormSelect
                      value={formData.independent_work}
                      onChange={(e) => handleChange('independent_work', e.target.value)}
                    >
                      <option value="">Select rating</option>
                      {ratingOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>

                  <CCol md={6}>
                    <CFormLabel>Collaboration</CFormLabel>
                    <CFormSelect
                      value={formData.collaboration}
                      onChange={(e) => handleChange('collaboration', e.target.value)}
                    >
                      <option value="">Select rating</option>
                      {ratingOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel>Initiative</CFormLabel>
                    <CFormSelect
                      value={formData.initiative}
                      onChange={(e) => handleChange('initiative', e.target.value)}
                    >
                      <option value="">Select rating</option>
                      {ratingOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>

                  <CCol md={6}>
                    <CFormLabel>Self-Regulation</CFormLabel>
                    <CFormSelect
                      value={formData.self_regulation}
                      onChange={(e) => handleChange('self_regulation', e.target.value)}
                    >
                      <option value="">Select rating</option>
                      {ratingOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          </CAccordionBody>
        </CAccordionItem>

        {/* Comments and Signatures */}
        <CAccordionItem itemKey="5">
          <CAccordionHeader className="report-card-accordion-header">
            Comments & Signatures
          </CAccordionHeader>
          <CAccordionBody className="report-card-accordion-body">
            <CCard className="report-card-form-card">
              <CCardBody>
                {/* Traditional text areas for editing */}
                <div className="mb-4">
                  <CFormLabel>Strengths and Next Steps for Improvement</CFormLabel>
                  <CFormTextarea
                    value={formData.strengths_next_steps}
                    onChange={(e) => handleChange('strengths_next_steps', e.target.value)}
                    placeholder="Describe student strengths and areas for improvement..."
                    rows={4}
                  />
                </div>

                <div className="mb-4">
                  <CFormLabel>Teacher Comments</CFormLabel>
                  <CFormTextarea
                    value={formData.teacher_comments}
                    onChange={(e) => handleChange('teacher_comments', e.target.value)}
                    placeholder="Additional teacher comments..."
                    rows={4}
                  />
                </div>

                {/* AI Generation Button */}
                <div className="mb-4">
                  <AIReportCommentInput
                    label="AI Comment Generator"
                    formData={formData}
                    handleChange={handleChange}
                    buttonText="Generate Professional Comments"
                    onJson={(json) => {
                      console.log('Generated AI comments:', json)
                    }}
                  />
                </div>

                <CRow>
                  <CCol md={4}>
                    <CFormLabel htmlFor="teacher_signature">Teacher's Signature</CFormLabel>
                    <CFormInput
                      id="teacher_signature"
                      value={formData.teacher_signature}
                      onChange={(e) => handleChange('teacher_signature', e.target.value)}
                      placeholder="Teacher's signature"
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="parent_signature">Parent/Guardian's Signature</CFormLabel>
                    <CFormInput
                      id="parent_signature"
                      value={formData.parent_signature}
                      onChange={(e) => handleChange('parent_signature', e.target.value)}
                      placeholder="Parent/Guardian's signature"
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="principal_signature">Principal's Signature</CFormLabel>
                    <CFormInput
                      id="principal_signature"
                      value={formData.principal_signature}
                      onChange={(e) => handleChange('principal_signature', e.target.value)}
                      placeholder="Principal's signature"
                    />
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          </CAccordionBody>
        </CAccordionItem>
      </CAccordion>
    </CForm>
  )
}

ReportCardForm.propTypes = {
  formData: PropTypes.object.isRequired,
  handleChange: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
}
