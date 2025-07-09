import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
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
  CFormCheck
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilStar, cilLightbulb, cilUser, cilBook, cilCommentSquare, cilArrowRight, cilPencil, cilMenu } from '@coreui/icons';
import { FormControlLabel, Checkbox } from '@mui/material';
import { pink, green, blue, orange, purple } from '@mui/material/colors';
import SignatureCanvas from 'react-signature-canvas';

/**
 * AI-Enhanced Text Area
 * A reusable component for text areas with an AI generation button.
 */
const AICommentField = ({ name, value, onChange, placeholder, rows = 10, isGenerating = false, onGenerate, maxLength }) => {
  const currentLength = value?.length || 0;

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
          paddingBottom: '25px', // Make space for character counter
          borderRadius: '8px',
          border: '2px solid #e9ecef',
          fontSize: '1rem',
        }}
      />
      <CButton
        type="button"
        title="Generate with AI"
        className="ai-generate-button position-absolute"
        style={{
          top: '10px',
          right: '10px',
          background: 'none',
          border: 'none',
          color: isGenerating ? '#0d6efd' : '#6c757d',
        }}
        onClick={() => onGenerate(name)}
        disabled={isGenerating}
      >
        {isGenerating ? <CSpinner size="sm" /> : <CIcon icon={cilLightbulb} size="lg" />}
      </CButton>
      {maxLength && (
        <div 
          className="position-absolute"
          style={{ 
            bottom: '8px', 
            right: '15px', 
            fontSize: '0.8rem', 
            color: currentLength > maxLength ? '#dc3545' : '#6c757d'
          }}
        >
          {currentLength}/{maxLength}
        </div>
      )}
    </div>
  );
};

AICommentField.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  rows: PropTypes.number,
  isGenerating: PropTypes.bool,
  onGenerate: PropTypes.func.isRequired,
  maxLength: PropTypes.number,
};

/**
 * Signature Pad Component
 * Provides multiple modes for capturing a signature: typing, drawing, or uploading.
 */
const SignaturePad = ({ title, onSignatureChange }) => {
  const [mode, setMode] = useState('typed'); // 'typed', 'drawn'
  const [typedName, setTypedName] = useState('');
  const signatureCanvasRef = useRef(null);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    // Clear previous signature when mode changes
    if (newMode === 'typed') {
      if(signatureCanvasRef.current) signatureCanvasRef.current.clear();
      onSignatureChange({ type: 'typed', value: typedName });
    } else if (newMode === 'drawn') {
      setTypedName('');
      onSignatureChange({ type: 'drawn', value: null });
    }
  };

  const handleTypedNameChange = (e) => {
    const newName = e.target.value;
    setTypedName(newName);
    onSignatureChange({ type: 'typed', value: newName });
  };

  const handleDrawEnd = () => {
    if (signatureCanvasRef.current) {
      const dataUrl = signatureCanvasRef.current.toDataURL('image/png');
      onSignatureChange({ type: 'drawn', value: dataUrl });
    }
  };

  const handleClear = () => {
    if (mode === 'drawn' && signatureCanvasRef.current) {
      signatureCanvasRef.current.clear();
      onSignatureChange({ type: 'drawn', value: null });
    } else if (mode === 'typed') {
      setTypedName('');
      onSignatureChange({ type: 'typed', value: '' });
    }
  };

  return (
    <div className="signature-pad-container mb-4">
      <h6 className="mb-2">{title}</h6>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <CButtonGroup>
          <CButton color="secondary" active={mode === 'typed'} onClick={() => handleModeChange('typed')}>
            Keyboard
          </CButton>
          <CButton color="secondary" active={mode === 'drawn'} onClick={() => handleModeChange('drawn')}>
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
              style: { width: '100%' }
            }}
            onEnd={handleDrawEnd}
          />
        </div>
      )}
    </div>
  );
};

SignaturePad.propTypes = {
  title: PropTypes.string.isRequired,
  onSignatureChange: PropTypes.func.isRequired,
};

/**
 * Student/School Information Section
 * Matches the exact layout of the kindergarten report card
 */
const StudentSchoolInfoSection = ({ formData, onFormDataChange }) => {
  const handleInputChange = (e) => {
    onFormDataChange({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    const newFormData = { ...formData, [name]: checked };

    // Enforce mutual exclusivity for checkbox groups
    if (checked) {
      if (name === 'year1') newFormData.year2 = false;
      if (name === 'year2') newFormData.year1 = false;
      
      if (name === 'frenchImmersion') {
        newFormData.frenchCore = false;
        newFormData.frenchExtended = false;
      }
      if (name === 'frenchCore') {
        newFormData.frenchImmersion = false;
        newFormData.frenchExtended = false;
      }
      if (name === 'frenchExtended') {
        newFormData.frenchImmersion = false;
        newFormData.frenchCore = false;
      }
    }
    
    onFormDataChange(newFormData);
  };

  // Set default date to today if not already set
  React.useEffect(() => {
    if (!formData.date) {
      const today = new Date().toISOString().split('T')[0];
      onFormDataChange({ ...formData, date: today });
    }
  }, []);

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
              placeholder="Enter student's full name"
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
              placeholder="OEN"
              style={{ borderRadius: '8px', border: '2px solid #e9ecef' }}
            />
          </CCol>
          <CCol md={3}>
            <CFormLabel className="fw-semibold text-dark">Days Absent</CFormLabel>
            <CFormInput
              name="daysAbsent"
              type="number"
              value={formData['daysAbsent'] || ''}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              style={{ borderRadius: '8px', border: '2px solid #e9ecef' }}
            />
          </CCol>
          <CCol md={3}>
            <CFormLabel className="fw-semibold text-dark">Total Days Absent</CFormLabel>
            <CFormInput
              name="totalDaysAbsent"
              type="number"
              value={formData['totalDaysAbsent'] || ''}
              onChange={handleInputChange}
              placeholder="0"
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
              <FormControlLabel
                control={
                  <Checkbox
                    name="year1"
                    checked={formData['year1'] === true}
                    onChange={handleCheckboxChange}
                    sx={{ 
                      color: blue[600], 
                      '&.Mui-checked': { color: blue[600] },
                      '& .MuiSvgIcon-root': { fontSize: 18 }
                    }}
                  />
                }
                label="Year 1"
                className="text-dark"
                sx={{ margin: 0, marginRight: '8px' }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="year2"
                    checked={formData['year2'] === true}
                    onChange={handleCheckboxChange}
                    sx={{ 
                      color: blue[600], 
                      '&.Mui-checked': { color: blue[600] },
                      '& .MuiSvgIcon-root': { fontSize: 18 }
                    }}
                  />
                }
                label="Year 2"
                className="text-dark"
                sx={{ margin: 0 }}
              />
            </div>
          </CCol>
          <CCol md={3}>
            <CFormLabel className="fw-semibold text-dark">Times Late</CFormLabel>
            <CFormInput
              name="timesLate"
              type="number"
              value={formData['timesLate'] || ''}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              style={{ borderRadius: '8px', border: '2px solid #e9ecef' }}
            />
          </CCol>
          <CCol md={3}>
            <CFormLabel className="fw-semibold text-dark">Total Times Late</CFormLabel>
            <CFormInput
              name="totalTimesLate"
              type="number"
              value={formData['totalTimesLate'] || ''}
              onChange={handleInputChange}
              placeholder="0"
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
              <FormControlLabel
                control={
                  <Checkbox
                    name="frenchImmersion"
                    checked={formData['frenchImmersion'] === true}
                    onChange={handleCheckboxChange}
                    sx={{ 
                      color: green[600], 
                      '&.Mui-checked': { color: green[600] },
                      '& .MuiSvgIcon-root': { fontSize: 18 }
                    }}
                  />
                }
                label="Immersion"
                className="text-dark"
                sx={{ margin: 0, marginRight: '8px' }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="frenchCore"
                    checked={formData['frenchCore'] === true}
                    onChange={handleCheckboxChange}
                    sx={{ 
                      color: green[600], 
                      '&.Mui-checked': { color: green[600] },
                      '& .MuiSvgIcon-root': { fontSize: 18 }
                    }}
                  />
                }
                label="Core"
                className="text-dark"
                sx={{ margin: 0, marginRight: '8px' }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="frenchExtended"
                    checked={formData['frenchExtended'] === true}
                    onChange={handleCheckboxChange}
                    sx={{ 
                      color: green[600], 
                      '&.Mui-checked': { color: green[600] },
                      '& .MuiSvgIcon-root': { fontSize: 18 }
                    }}
                  />
                }
                label="Extended"
                className="text-dark"
                sx={{ margin: 0 }}
              />
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
              value={formData['teacher'] || ''}
              onChange={handleInputChange}
              placeholder="Enter teacher's name"
              className="form-control-lg"
              style={{ borderRadius: '8px', border: '2px solid #e9ecef' }}
              required
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
  );
};

StudentSchoolInfoSection.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool
};

/**
 * Key Learning Section
 * Contains the main comment box and ESL/IEP checkboxes.
 */
const KeyLearningSection = ({ formData, onFormDataChange, onGenerate, isGenerating }) => {
  const handleInputChange = (e) => {
    onFormDataChange({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckboxChange = (e) => {
    onFormDataChange({ ...formData, [e.target.name]: e.target.checked });
  };

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
              <FormControlLabel
                control={
                  <Checkbox
                    name="keyLearningESL"
                    checked={formData['keyLearningESL'] === true}
                    onChange={handleCheckboxChange}
                    sx={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      '&.Mui-checked': { color: 'white' },
                      padding: '4px',
                    }}
                  />
                }
                label={<span style={{ color: 'white', fontWeight: 500 }}>ESL</span>}
                sx={{ margin: 0, marginRight: '10px' }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="keyLearningIEP"
                    checked={formData['keyLearningIEP'] === true}
                    onChange={handleCheckboxChange}
                    sx={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      '&.Mui-checked': { color: 'white' },
                      padding: '4px',
                    }}
                  />
                }
                label={<span style={{ color: 'white', fontWeight: 500 }}>IEP</span>}
                sx={{ margin: 0 }}
              />
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
        />
      </CCardBody>
    </CCard>
  );
};

KeyLearningSection.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
  onGenerate: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool,
};

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
        <p>To Parents/Guardians: This copy of the Kindergarten Communication of Learning: Initial Observations report should be retained for reference...</p>
        <CRow>
          <CCol md={6}>
            <SignaturePad
              title="Teacher's Signature"
              onSignatureChange={(value) => onFormDataChange({ ...formData, teacherSignature: value })}
            />
          </CCol>
          <CCol md={6}>
            <SignaturePad
              title="Principal's Signature"
              onSignatureChange={(value) => onFormDataChange({ ...formData, principalSignature: value })}
            />
          </CCol>
        </CRow>
        <hr className="my-4" />
        <p>Where applicable: Early Childhood Educator(s) contributed to the observation, monitoring, and assessment...</p>
      </CCardBody>
    </CCard>
  );
};

SignatureSection.propTypes = {
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
};

/**
 * Modern Report Card Form - Redesigned to match actual report card structure
 */
const ModernReportCardForm = ({ 
  fields = [], 
  formData = {}, 
  onFormDataChange, 
  onSubmit,
  loading = false,
  error = null 
}) => {
  const [generatingFields, setGeneratingFields] = useState(new Set());
  const [activeAccordion, setActiveAccordion] = useState(['student-info', 'key-learning', 'signatures']);

  const handleAccordionChange = (newActive) => {
    setActiveAccordion(newActive);
  };

  const handleAIGenerate = async (fieldName) => {
    setGeneratingFields(prev => new Set(prev).add(fieldName));
    try {
      // Mock AI generation - replace with actual AI service call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const studentName = formData.student || 'The student';
      let generatedText = `Based on observations, ${studentName} shows strong potential in collaborating with peers. A key area for growth is developing greater independence during learning activities. Next steps should focus on encouraging ${studentName} to initiate tasks and persevere through challenges with minimal guidance.`;
      
      if (fieldName === 'keyLearning2') {
        generatedText = `Further development in self-regulation will also be beneficial. We will continue to support ${studentName} in building these essential skills.`;
      }
      
      onFormDataChange({ ...formData, [fieldName]: generatedText });

    } catch (error) {
      console.error('Error generating AI content:', error);
    } finally {
      setGeneratingFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(fieldName);
        return newSet;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  return (
    <div className="modern-report-card-form">
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
            <CAccordionHeader>Student & School Information</CAccordionHeader>
            <CAccordionBody>
              <StudentSchoolInfoSection
                formData={formData}
                onFormDataChange={onFormDataChange}
              />
            </CAccordionBody>
          </CAccordionItem>

          <CAccordionItem itemKey="key-learning">
            <CAccordionHeader>Key Learning / Growth in Learning / Next Steps</CAccordionHeader>
            <CAccordionBody>
              <KeyLearningSection
                formData={formData}
                onFormDataChange={onFormDataChange}
                onGenerate={handleAIGenerate}
                isGenerating={generatingFields.has('keyLearning') || generatingFields.has('keyLearning2')}
              />
            </CAccordionBody>
          </CAccordionItem>

          <CAccordionItem itemKey="signatures">
            <CAccordionHeader>Signatures</CAccordionHeader>
            <CAccordionBody>
              <SignatureSection
                formData={formData}
                onFormDataChange={onFormDataChange}
              />
            </CAccordionBody>
          </CAccordionItem>
        </CAccordion>
      </CForm>
    </div>
  );
};

ModernReportCardForm.propTypes = {
  fields: PropTypes.array,
  formData: PropTypes.object,
  onFormDataChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  loading: PropTypes.bool,
  error: PropTypes.string
};

export default ModernReportCardForm; 