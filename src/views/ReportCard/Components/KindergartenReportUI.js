import React, { useState, useEffect } from 'react'
import {
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
  CCard,
  CCardBody,
  CRow,
  CCol,
  CFormInput,
  CFormLabel,
} from '@coreui/react'
import PlacementSection from './PlacementSection'
import LearningSection from './LearningSection'
import EarlyReadingScreeningSection from './EarlyReadingScreeningSection'
import SignatureSection from './SignatureSection'
import AIReportCommentInput from '../../../components/AIReportCommentInput'
import SaveButton from '../../../components/SaveButton'
import './KindergartenReportCardUI.css'

const KindergartenReportUI = ({
  formData,
  onFormDataChange,
  loading,
  error,
  onSaveDraft,
  isSaving,
  saveMessage,
  selectedStudent,
  selectedReportCard,
}) => {
  const handleInputChange = (e) => {
    onFormDataChange({ ...formData, [e.target.name]: e.target.value })
  }

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target
    let newFormData = { ...formData, [name]: checked }

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
        newFormData.frenchCore = false
        newFormData.frenchImmersion = false
      }
      if (name === 'placementInSeptemberKG2') {
        newFormData.placementInSeptemberGrade1 = false
      }
      if (name === 'placementInSeptemberGrade1') {
        newFormData.placementInSeptemberKG2 = false
      }
    }

    onFormDataChange(newFormData)
  }

  // Dummy function for compatibility - actual AI generation is handled by AIReportCommentInput
  const handleAIGenerate = () => {
    // This function is not used anymore since AIReportCommentInput handles the AI generation
  }

  useEffect(() => {
    if (!formData.date) {
      const today = new Date().toISOString().split('T')[0]
      onFormDataChange({ ...formData, date: today })
    }
  }, [formData.date, onFormDataChange])

  // Auto-populate grade level based on student's grade
  // JK (Junior Kindergarten) → Year 1, SK (Senior Kindergarten) → Year 2
  useEffect(() => {
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

  if (loading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div className="text-danger">Error: {error}</div>
  }

  const learningSections = [
    {
      title: 'Belonging and Contributing',
      commentFieldName: 'BeloningAndContributingComments',
      eslFieldName: 'belongingAndContributingESL',
      iepFieldName: 'belongingAndContributingIEP',
    },
    {
      title: 'Self-Regulation and Well-Being',
      commentFieldName: 'selfRegulationAndWellBeingComments',
      eslFieldName: 'selfRegulationAndWellBeingESL',
      iepFieldName: 'selfRegulationAndWellBeingIEP',
    },
    {
      title: 'Demonstrating Literacy and Mathematics Behaviours',
      commentFieldName: 'demonstratingLiteracyandMathComments',
      eslFieldName: 'demonstratingLiteracyandMathESL',
      iepFieldName: 'demonstratingLiteracyAndMathIEP',
    },
    {
      title: 'Problem Solving and Innovating',
      commentFieldName: 'problemSolvingAndInnovatingComments',
      eslFieldName: 'problemSolvingAndInnovatingESL',
      iepFieldName: 'problemSolvingAndInnovatingIEP',
    },
  ]

  return (
    <CAccordion alwaysOpen>
      <CAccordionItem itemKey={1}>
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
          <CRow className="mb-3">
            <CCol md={{ span: 4, offset: 8 }}>
              <CFormLabel htmlFor="date">Date</CFormLabel>
              <CFormInput
                type="date"
                id="date"
                name="date"
                value={formData.date || ''}
                onChange={handleInputChange}
              />
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel htmlFor="student">Student</CFormLabel>
              <CFormInput
                type="text"
                id="student"
                name="student"
                value={formData.student || ''}
                onChange={handleInputChange}
                placeholder="Enter student name"
              />
            </CCol>
            <CCol md={2}>
              <CFormLabel htmlFor="OEN">OEN</CFormLabel>
              <CFormInput
                type="text"
                id="OEN"
                name="OEN"
                value={formData.OEN || ''}
                onChange={handleInputChange}
                placeholder="Enter OEN"
              />
            </CCol>
            <CCol md={2}>
              <CFormLabel htmlFor="daysAbsent">Days Absent</CFormLabel>
              <CFormInput
                type="number"
                id="daysAbsent"
                name="daysAbsent"
                value={formData.daysAbsent ?? ''}
                onChange={handleInputChange}
                placeholder="Enter days absent"
              />
            </CCol>
            <CCol md={2}>
              <CFormLabel htmlFor="totalDaysAbsent">Total Days Absent</CFormLabel>
              <CFormInput
                type="number"
                id="totalDaysAbsent"
                name="totalDaysAbsent"
                value={formData.totalDaysAbsent ?? ''}
                onChange={handleInputChange}
                placeholder="Enter total days absent"
              />
            </CCol>
          </CRow>

          <CRow className="mb-3 align-items-end">
            <CCol md={4} className="d-flex align-items-center">
              <CFormLabel className="me-3 mb-0">Year:</CFormLabel>
              <div className="me-2">
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
                  1
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
                  2
                </label>
              </div>
            </CCol>
            <CCol md={4}>
              <CFormLabel htmlFor="timesLate">Times Late</CFormLabel>
              <CFormInput
                type="number"
                id="timesLate"
                name="timesLate"
                value={formData.timesLate ?? ''}
                onChange={handleInputChange}
                placeholder="Will be auto-filled"
                readOnly
                className="bg-light"
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel htmlFor="totalTimesLate">Total Times Late</CFormLabel>
              <CFormInput
                type="number"
                id="totalTimesLate"
                name="totalTimesLate"
                value={formData.totalTimesLate ?? ''}
                onChange={handleInputChange}
                placeholder="Will be auto-filled"
                readOnly
                className="bg-light"
              />
            </CCol>
          </CRow>

          <CRow className="mb-3 align-items-center">
            <CCol md={12} className="d-flex align-items-center">
              <CFormLabel className="me-3 mb-0">French:</CFormLabel>
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
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel htmlFor="teacher">Teacher</CFormLabel>
              <CFormInput
                type="text"
                id="teacher"
                name="teacher"
                value={formData.teacher_name || formData.teacher || ''}
                readOnly
                className="bg-light"
                title="Teacher name is automatically set from homeroom teacher"
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel htmlFor="earlyChildhoodEducator">Early Childhood Educator</CFormLabel>
              <CFormInput
                type="text"
                id="earlyChildhoodEducator"
                name="earlyChildhoodEducator"
                value={formData.earlyChildhoodEducator || ''}
                onChange={handleInputChange}
              />
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel htmlFor="school">School</CFormLabel>
              <CFormInput
                type="text"
                id="school"
                name="school"
                value={formData.school || ''}
                onChange={handleInputChange}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel htmlFor="board">Board</CFormLabel>
              <CFormInput
                type="text"
                id="board"
                name="board"
                value={formData.board || ''}
                onChange={handleInputChange}
              />
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel htmlFor="schoolAddress">Address</CFormLabel>
              <CFormInput
                type="text"
                id="schoolAddress"
                name="schoolAddress"
                value={formData.schoolAddress || ''}
                onChange={handleInputChange}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel htmlFor="boardAddress">Address</CFormLabel>
              <CFormInput
                type="text"
                id="boardAddress"
                name="boardAddress"
                value={formData.boardAddress || ''}
                onChange={handleInputChange}
              />
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel htmlFor="principal">Principal</CFormLabel>
              <CFormInput
                type="text"
                id="principal"
                name="principal"
                value={formData.principal || ''}
                onChange={handleInputChange}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel htmlFor="telephone">Tel.</CFormLabel>
              <CFormInput
                type="tel"
                id="telephone"
                name="telephone"
                value={formData.telephone || '613 421 1700'}
                onChange={handleInputChange}
                placeholder="613 421 1700"
              />
            </CCol>
          </CRow>
          <PlacementSection formData={formData} onCheckboxChange={handleCheckboxChange} />
        </CAccordionBody>
      </CAccordionItem>

      {learningSections.map((section, index) => (
        <CAccordionItem itemKey={index + 2} key={section.title}>
          <CAccordionHeader>
            <CRow className="w-100 align-items-center">
              <CCol>{section.title}</CCol>
              <CCol xs="auto">
                <SaveButton
                  onSave={onSaveDraft}
                  isSaving={isSaving}
                  saveMessage={saveMessage}
                  disabled={!selectedStudent || !selectedReportCard}
                  className="me-2"
                />
              </CCol>
              <CCol xs="auto">
                <div className="me-2">
                  <input
                    type="checkbox"
                    id={section.eslFieldName}
                    name={section.eslFieldName}
                    checked={formData[section.eslFieldName] || false}
                    onChange={handleCheckboxChange}
                    style={{
                      width: '16px',
                      height: '16px',
                      marginRight: '8px',
                      cursor: 'pointer',
                    }}
                  />
                  <label
                    htmlFor={section.eslFieldName}
                    style={{ cursor: 'pointer', marginBottom: '0' }}
                  >
                    ESL
                  </label>
                </div>
                <div>
                  <input
                    type="checkbox"
                    id={section.iepFieldName}
                    name={section.iepFieldName}
                    checked={formData[section.iepFieldName] || false}
                    onChange={handleCheckboxChange}
                    style={{
                      width: '16px',
                      height: '16px',
                      marginRight: '8px',
                      cursor: 'pointer',
                    }}
                  />
                  <label
                    htmlFor={section.iepFieldName}
                    style={{ cursor: 'pointer', marginBottom: '0' }}
                  >
                    IEP
                  </label>
                </div>
              </CCol>
            </CRow>
          </CAccordionHeader>
          <CAccordionBody>
            <LearningSection
              formData={formData}
              onFormDataChange={onFormDataChange}
              commentFieldName={section.commentFieldName}
              eslFieldName={section.eslFieldName}
              iepFieldName={section.iepFieldName}
              onGenerate={handleAIGenerate}
              isGenerating={false}
            />
          </CAccordionBody>
        </CAccordionItem>
      ))}

      <CAccordionItem itemKey={learningSections.length + 2}>
        <CAccordionHeader>
          <div className="d-flex justify-content-between align-items-center w-100 me-3">
            <span>Early Reading Screening (ERS) for Year 2 of Kindergarten Only</span>
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
          <EarlyReadingScreeningSection formData={formData} onFormDataChange={onFormDataChange} />
        </CAccordionBody>
      </CAccordionItem>
      <CAccordionItem itemKey={learningSections.length + 3}>
        <CAccordionHeader>
          <div className="d-flex justify-content-between align-items-center w-100 me-3">
            <span>Signatures</span>
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
          <SignatureSection formData={formData} onFormDataChange={onFormDataChange} />
        </CAccordionBody>
      </CAccordionItem>
    </CAccordion>
  )
}

export default KindergartenReportUI
