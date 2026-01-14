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
    <div className="p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
      <CRow className="mb-4">
        <CCol md={4}>
          <div className="mb-2">
            <CFormLabel className="fw-bold mb-2">ERS completed:</CFormLabel>
          </div>
          <div className="d-flex gap-3">
            <CFormCheck
              type="checkbox"
              id="ERSCompletedYes"
              name="ERSCompletedYes"
              label="Yes"
              checked={formData.ERSCompletedYes || false}
              onChange={handleCheckboxChange}
              className="fs-5"
            />
            <CFormCheck
              type="checkbox"
              id="ERSCompletedNo"
              name="ERSCompletedNo"
              label="No"
              checked={formData.ERSCompletedNo || false}
              onChange={handleCheckboxChange}
              className="fs-5"
            />
            <CFormCheck
              type="checkbox"
              id="ERSCompletedNA"
              name="ERSCompletedNA"
              label="N/A"
              checked={formData.ERSCompletedNA || false}
              onChange={handleCheckboxChange}
              className="fs-5"
            />
          </div>
        </CCol>

        <CCol md={5}>
          <div className="mb-2">
            <CFormLabel className="fw-bold mb-2">Date:</CFormLabel>
          </div>
          <CRow className="g-2">
            <CCol xs={4}>
              <CFormInput
                type="text"
                id="ERSYear"
                name="ERSYear"
                placeholder="YYYY"
                value={formData.ERSYear || ''}
                onChange={handleInputChange}
                maxLength={4}
              />
            </CCol>
            <CCol xs={4}>
              <CFormInput
                type="text"
                id="ERSMonth"
                name="ERSMonth"
                placeholder="MM"
                value={formData.ERSMonth || ''}
                onChange={handleInputChange}
                maxLength={2}
              />
            </CCol>
            <CCol xs={4}>
              <CFormInput
                type="text"
                id="ERSDay"
                name="ERSDay"
                placeholder="DD"
                value={formData.ERSDay || ''}
                onChange={handleInputChange}
                maxLength={2}
              />
            </CCol>
          </CRow>
        </CCol>

        <CCol md={3}>
          <div className="mb-2">
            <CFormLabel className="fw-bold mb-2">Benchmark met:</CFormLabel>
          </div>
          <div className="d-flex gap-3">
            <CFormCheck
              type="checkbox"
              id="ERSBenchmarkYes"
              name="ERSBenchmarkYes"
              label="Yes"
              checked={formData.ERSBenchmarkYes || false}
              onChange={handleCheckboxChange}
              className="fs-5"
            />
            <CFormCheck
              type="checkbox"
              id="ERSBenchmarkNo"
              name="ERSBenchmarkNo"
              label="No"
              checked={formData.ERSBenchmarkNo || false}
              onChange={handleCheckboxChange}
              className="fs-5"
            />
          </div>
        </CCol>
      </CRow>
    </div>
  )
}

export default EarlyReadingScreeningSection 