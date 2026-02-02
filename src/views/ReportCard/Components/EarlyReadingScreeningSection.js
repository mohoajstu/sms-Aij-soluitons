import React from 'react'
import {
  CCol,
  CRow,
  CFormInput,
  CFormLabel,
} from '@coreui/react'
import { toggleErsOption } from '../utils/ersToggle'

const EarlyReadingScreeningSection = ({ formData, onFormDataChange }) => {
  const handleInputChange = (e) => {
    onFormDataChange({ ...formData, [e.target.name]: e.target.value })
  }

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target
    const newFormData = toggleErsOption(formData, name, checked)
    onFormDataChange(newFormData)
  }

  const checkboxStyle = {
    width: '22px',
    height: '22px',
    marginRight: '10px',
    accentColor: '#6f42c1',
  }

  const checkboxLabelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '1.1rem',
    cursor: 'pointer',
    userSelect: 'none',
    padding: '6px 8px',
    borderRadius: '6px',
  }

  const ERSCheckbox = ({ id, name, label }) => (
    <label htmlFor={id} style={checkboxLabelStyle}>
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={formData[name] || false}
        onChange={handleCheckboxChange}
        style={checkboxStyle}
      />
      {label}
    </label>
  )

  return (
    <div className="p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
      <CRow className="mb-4">
        <CCol md={4}>
          <div className="mb-2">
            <CFormLabel className="fw-bold mb-2">ERS completed:</CFormLabel>
          </div>
          <div className="d-flex flex-wrap gap-3">
            <ERSCheckbox id="ERSCompletedYes" name="ERSCompletedYes" label="Yes" />
            <ERSCheckbox id="ERSCompletedNo" name="ERSCompletedNo" label="No" />
            <ERSCheckbox id="ERSCompletedNA" name="ERSCompletedNA" label="N/A" />
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
          <div className="d-flex flex-wrap gap-3">
            <ERSCheckbox id="ERSBenchmarkYes" name="ERSBenchmarkYes" label="Yes" />
            <ERSCheckbox id="ERSBenchmarkNo" name="ERSBenchmarkNo" label="No" />
            <ERSCheckbox id="ERSBenchmarkNA" name="ERSBenchmarkNA" label="N/A" />
          </div>
        </CCol>
      </CRow>
    </div>
  )
}

export default EarlyReadingScreeningSection 
