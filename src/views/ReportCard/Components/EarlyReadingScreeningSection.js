import React from 'react'
import {
  CCol,
  CRow,
  CFormCheck,
  CFormInput,
  CFormLabel,
} from '@coreui/react'

const EarlyReadingScreeningSection = ({ formData, onFormDataChange }) => {
  const handleInputChange = (e) => {
    onFormDataChange({ ...formData, [e.target.name]: e.target.value })
  }

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target
    let newFormData = { ...formData, [name]: checked }

    if (checked) {
      if (name === 'ERSCompletedYes') {
        newFormData.ERSCompletedNo = false
        newFormData.ERSCompletedNA = false
      }
      if (name === 'ERSCompletedNo') {
        newFormData.ERSCompletedYes = false
        newFormData.ERSCompletedNA = false
      }
      if (name === 'ERSCompletedNA') {
        newFormData.ERSCompletedYes = false
        newFormData.ERSCompletedNo = false
      }
      if (name === 'ERSBenchmarkYes') {
        newFormData.ERSBenchmarkNo = false
      }
      if (name === 'ERSBenchmarkNo') {
        newFormData.ERSBenchmarkYes = false
      }
    }

    onFormDataChange(newFormData)
  }

  return (
    <CRow className="align-items-center">
      <CCol md={5} className="mb-3 mb-md-0">
        <CFormLabel className="fw-bold">ERS completed:</CFormLabel>
        <div className="d-flex gap-3 align-items-center">
          <CFormCheck
            inline
            type="checkbox"
            id="ERSCompletedYes"
            name="ERSCompletedYes"
            label="yes"
            checked={formData.ERSCompletedYes || false}
            onChange={handleCheckboxChange}
            style={{ 
              minWidth: '60px',
              cursor: 'pointer',
            }}
          />
          <CFormCheck
            inline
            type="checkbox"
            id="ERSCompletedNo"
            name="ERSCompletedNo"
            label="no"
            checked={formData.ERSCompletedNo || false}
            onChange={handleCheckboxChange}
            style={{ 
              minWidth: '60px',
              cursor: 'pointer',
            }}
          />
          <CFormCheck
            inline
            type="checkbox"
            id="ERSCompletedNA"
            name="ERSCompletedNA"
            label="NA"
            checked={formData.ERSCompletedNA || false}
            onChange={handleCheckboxChange}
            style={{ 
              minWidth: '60px',
              cursor: 'pointer',
            }}
          />
        </div>
      </CCol>

      <CCol md={4} className="mb-3 mb-md-0">
        <CFormLabel className="fw-bold">Date:</CFormLabel>
        <CRow>
          <CCol>
            <CFormInput
              type="text"
              id="ERSYear"
              name="ERSYear"
              placeholder="YYYY"
              value={formData.ERSYear || ''}
              onChange={handleInputChange}
            />
          </CCol>
          <CCol>
            <CFormInput
              type="text"
              id="ERSMonth"
              name="ERSMonth"
              placeholder="MM"
              value={formData.ERSMonth || ''}
              onChange={handleInputChange}
            />
          </CCol>
          <CCol>
            <CFormInput
              type="text"
              id="ERSDay"
              name="ERSDay"
              placeholder="DD"
              value={formData.ERSDay || ''}
              onChange={handleInputChange}
            />
          </CCol>
        </CRow>
      </CCol>

      <CCol md={3}>
        <CFormLabel className="fw-bold">Benchmark met:</CFormLabel>
        <div className="d-flex gap-3 align-items-center">
          <CFormCheck
            inline
            type="checkbox"
            id="ERSBenchmarkYes"
            name="ERSBenchmarkYes"
            label="yes"
            checked={formData.ERSBenchmarkYes || false}
            onChange={handleCheckboxChange}
            style={{ 
              minWidth: '60px',
              cursor: 'pointer',
            }}
          />
          <CFormCheck
            inline
            type="checkbox"
            id="ERSBenchmarkNo"
            name="ERSBenchmarkNo"
            label="no"
            checked={formData.ERSBenchmarkNo || false}
            onChange={handleCheckboxChange}
            style={{ 
              minWidth: '60px',
              cursor: 'pointer',
            }}
          />
        </div>
      </CCol>
    </CRow>
  )
}

export default EarlyReadingScreeningSection 