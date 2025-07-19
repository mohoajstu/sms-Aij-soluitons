import React from 'react'
import { CCol, CRow } from '@coreui/react'
import { AIInputField } from './AllInputFields'

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

  return (
    <>
      <CRow className="mb-3">
        <CCol>
          <AIInputField
            label="Key Learning / Growth in Learning / Next Steps in Learning"
            value={commentValue}
            onChange={handleCommentChange}
            onGenerate={() => onGenerate(commentFieldName)}
            isGenerating={isGenerating}
            placeholder="Enter comments here or use the AI generator."
          />
          <div className="text-end text-muted mt-1" style={{ fontSize: '0.8rem' }}>
            {commentValue.length} / {charLimit}
          </div>
        </CCol>
      </CRow>
    </>
  )
}

export default LearningSection 