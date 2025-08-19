import React from 'react'
import { CCol, CRow, CFormLabel, CFormTextarea } from '@coreui/react'
import { AIReportCommentInput } from './AllInputFields'

const LearningSection = ({
  formData,
  onFormDataChange,
  commentFieldName,
  charLimit = 500,
  onGenerate,
  isGenerating,
}) => {
  const handleCommentChange = (value) => {
    if (value.length <= charLimit) {
      onFormDataChange({ ...formData, [commentFieldName]: value })
    }
  }

  const commentValue = formData[commentFieldName] || ''

  // Helper function to match the expected handleChange signature
  const handleChange = (field, value) => {
    onFormDataChange({ ...formData, [field]: value })
  }

  return (
    <>
      <CRow className="mb-3">
        <CCol>
          {/* Traditional textarea for editing */}
          <CFormLabel>Key Learning / Growth in Learning / Next Steps in Learning</CFormLabel>
          <CFormTextarea
            value={commentValue}
            onChange={(e) => handleCommentChange(e.target.value)}
            placeholder="Enter comments here or use the AI generator."
            rows={4}
          />
          <div className="text-end text-muted mt-1" style={{ fontSize: '0.8rem' }}>
            {commentValue.length} / {charLimit}
          </div>
          
          {/* AI Generation Button */}
          <div className="mt-3">
            <AIReportCommentInput
              label="Generate Learning Comments"
              formData={{
                student_name: formData.student,
                grade: formData.grade,
                subject: 'Key Learning',
              }}
              handleChange={(field, aiValue) => {
                // Map AI output directly to the comment field
                if (field === 'teacher_comments' || field === 'strengths_next_steps') {
                  onFormDataChange({ ...formData, [commentFieldName]: aiValue })
                }
              }}
              buttonText="Generate with AI"
              explicitReportType="Kindergarten Communication of Learning"
            />
          </div>
        </CCol>
      </CRow>
    </>
  )
}

export default LearningSection 