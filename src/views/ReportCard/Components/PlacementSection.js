import React from 'react';
import { CRow, CCol, CFormLabel, CFormCheck } from '@coreui/react';

const PlacementSection = ({ formData, onCheckboxChange }) => {
  return (
    <CRow className="mb-3">
      <CCol>
        <CFormLabel className="fw-semibold text-dark">PLACEMENT IN SEPTEMBER</CFormLabel>
        <div className="d-flex gap-4 mt-2">
          <CFormCheck
            type="checkbox"
            id="placementInSeptemberKG2"
            name="placementInSeptemberKG2"
            label="Kindergarten Year 2"
            checked={formData.placementInSeptemberKG2 || false}
            onChange={onCheckboxChange}
          />
          <CFormCheck
            type="checkbox"
            id="placementInSeptemberGrade1"
            name="placementInSeptemberGrade1"
            label="Grade 1"
            checked={formData.placementInSeptemberGrade1 || false}
            onChange={onCheckboxChange}
          />
        </div>
      </CCol>
    </CRow>
  );
};

export default PlacementSection; 