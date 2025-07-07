import React, { useState, useEffect } from 'react';
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
  CAlert
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilStar, cilLightbulb, cilUser, cilBook, cilCommentSquare, cilArrowRight, cilPencil, cilMenu } from '@coreui/icons';
import { FormControlLabel, Checkbox } from '@mui/material';
import { pink, green, blue, orange, purple } from '@mui/material/colors';

/**
 * Modern AI Input Field Component
 * Enhanced textarea with AI generation capabilities
 */
const AIInputField = ({ 
  label, 
  value, 
  onChange, 
  onGenerate, 
  isGenerating = false, 
  placeholder = "",
  required = false,
  minHeight = "150px"
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="ai-input-field mb-3">
      <CFormLabel className="fw-semibold text-dark">
        {label}
        {required && <span className="text-danger ms-1">*</span>}
      </CFormLabel>
      <div className="ai-input-container position-relative">
        <CFormTextarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`ai-input-textarea ${isGenerating ? "generating" : ""} ${isFocused ? "focused" : ""}`}
          style={{ 
            minHeight: minHeight,
            paddingRight: '50px',
            resize: 'vertical',
            backgroundColor: isGenerating ? '#f0f8ff' : 'white',
            border: isFocused ? '2px solid #007bff' : '1px solid #ced4da',
            borderRadius: '8px',
            transition: 'all 0.2s ease'
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          required={required}
        />
        <CButton
          type="button"
          className="ai-generate-button position-absolute"
          style={{
            top: '8px',
            right: '8px',
            background: 'none',
            border: 'none',
            padding: '8px',
            borderRadius: '6px',
            color: isGenerating ? '#007bff' : '#6c757d',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            transition: 'all 0.2s ease'
          }}
          onClick={onGenerate}
          disabled={isGenerating}
          onMouseEnter={(e) => {
            if (!isGenerating) {
              e.target.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
              e.target.style.color = '#007bff';
            }
          }}
          onMouseLeave={(e) => {
            if (!isGenerating) {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
              e.target.style.color = '#6c757d';
            }
          }}
        >
          {isGenerating ? (
            <CSpinner size="sm" />
          ) : (
            <CIcon icon={cilLightbulb} size="sm" />
          )}
          <span className="visually-hidden">Generate with AI</span>
        </CButton>
      </div>
      {isGenerating && (
        <div className="ai-generating-text text-primary mt-2" style={{ fontSize: '0.875rem' }}>
          <CSpinner size="sm" className="me-2" />
          Generating content...
        </div>
      )}
    </div>
  );
};

/**
 * Smart Input Field Component
 * Renders appropriate input type based on field characteristics
 */
const SmartInputField = ({ 
  field, 
  value, 
  onChange, 
  onGenerate, 
  isGenerating = false,
  required = false 
}) => {
  const getFieldSize = (size) => {
    switch (size) {
      case 'small': return { md: 3, lg: 2 };
      case 'medium': return { md: 4, lg: 3 };
      case 'large': return { md: 6, lg: 4 };
      case 'full': return { md: 12 };
      default: return { md: 6, lg: 4 };
    }
  };

  const colSize = getFieldSize(field.size);
  const fieldValue = field.inputType === 'checkbox' ? (value || false) : (value || '');

  const renderInput = () => {
    switch (field.inputType) {
      case 'textarea':
        if (field.maxLength > 200) {
          return (
            <AIInputField
              label={field.label}
              value={fieldValue}
              onChange={onChange}
              onGenerate={() => onGenerate(field.name)}
              isGenerating={isGenerating}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              required={required}
              minHeight="120px"
            />
          );
        }
        return (
          <div className="mb-3">
            <CFormLabel className="fw-semibold text-dark">
              {field.label}
              {required && <span className="text-danger ms-1">*</span>}
            </CFormLabel>
            <CFormTextarea
              value={fieldValue}
              onChange={(e) => onChange(e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              style={{ 
                minHeight: '80px',
                borderRadius: '8px',
                border: '1px solid #ced4da'
              }}
              required={required}
            />
          </div>
        );

      case 'select':
        return (
          <div className="mb-3">
            <CFormLabel className="fw-semibold text-dark">
              {field.label}
              {required && <span className="text-danger ms-1">*</span>}
            </CFormLabel>
            <CFormSelect
              value={fieldValue}
              onChange={(e) => onChange(e.target.value)}
              style={{ borderRadius: '8px', border: '1px solid #ced4da' }}
              required={required}
            >
              <option value="">Select {field.label}</option>
              {field.options.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </CFormSelect>
          </div>
        );

      case 'checkbox':
        return (
          <div className="mb-3">
            <FormControlLabel
              control={
                <Checkbox
                  checked={fieldValue}
                  onChange={(e) => onChange(e.target.checked)}
                  sx={{
                    color: blue[600],
                    '&.Mui-checked': {
                      color: blue[600],
                    },
                  }}
                />
              }
              label={field.label}
              sx={{
                '& .MuiFormControlLabel-label': {
                  fontWeight: 500,
                  color: '#495057'
                }
              }}
            />
          </div>
        );

      default:
        return (
          <div className="mb-3">
            <CFormLabel className="fw-semibold text-dark">
              {field.label}
              {required && <span className="text-danger ms-1">*</span>}
            </CFormLabel>
            <CFormInput
              type={field.inputType === 'number' ? 'number' : 'text'}
              value={fieldValue}
              onChange={(e) => onChange(e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              style={{ borderRadius: '8px', border: '1px solid #ced4da' }}
              required={required}
            />
          </div>
        );
    }
  };

  return (
    <CCol {...colSize}>
      {renderInput()}
    </CCol>
  );
};

/**
 * Modern Report Card Form Component
 * Redesigned with better UX, proper field sizing, and AI capabilities
 */
const ModernReportCardForm = ({ 
  fields = [], 
  formData = {}, 
  onFormDataChange, 
  onSubmit,
  loading = false,
  error = null 
}) => {
  const [isGenerating, setIsGenerating] = useState({});
  const [activeAccordionItems, setActiveAccordionItems] = useState([]);

  // Initialize accordion items to be open by default
  useEffect(() => {
    const sections = [...new Set(fields.map(field => field.section))];
    setActiveAccordionItems(sections);
  }, [fields]);

  // Handle field changes
  const handleFieldChange = (fieldName, value) => {
    const newFormData = { ...formData, [fieldName]: value };
    onFormDataChange(newFormData);
  };

  // Handle AI generation
  const handleAIGenerate = async (fieldName) => {
    const field = fields.find(f => f.name === fieldName);
    if (!field) return;

    setIsGenerating(prev => ({ ...prev, [fieldName]: true }));
    
    try {
      // Mock AI generation - replace with actual AI service
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let generatedText = "";
      const studentName = formData.student_name || formData.StudentName || 'The student';
      
      if (fieldName.toLowerCase().includes('strength') || fieldName.toLowerCase().includes('next')) {
        generatedText = `${studentName} demonstrates strong critical thinking skills and shows excellent problem-solving abilities. They work well independently and collaborate effectively with peers. Next steps include continuing to develop organizational skills and participating more actively in class discussions. ${studentName} should focus on completing assignments on time and reviewing work for accuracy.`;
      } else if (fieldName.toLowerCase().includes('comment') || fieldName.toLowerCase().includes('observation')) {
        generatedText = `${studentName} has shown consistent effort and improvement throughout this term. They demonstrate good understanding of key concepts and contribute positively to the classroom environment.`;
      } else if (fieldName.toLowerCase().includes('goal') || fieldName.toLowerCase().includes('objective')) {
        generatedText = `Continue to develop strong work habits and academic skills. Focus on time management and organization to support learning goals.`;
      } else {
        generatedText = `Generated content for ${field.label}`;
      }
      
      handleFieldChange(fieldName, generatedText);
      
      // Success notification
      console.log(`AI content generated for ${field.label}`);
      
    } catch (error) {
      console.error('Error generating AI content:', error);
      alert('Failed to generate AI content. Please try again.');
    } finally {
      setIsGenerating(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  // Group fields by section
  const groupedFields = fields.reduce((acc, field) => {
    if (!acc[field.section]) {
      acc[field.section] = [];
    }
    acc[field.section].push(field);
    return acc;
  }, {});

  // Define section order and styling
  const sectionConfig = {
    'Student Information': { 
      icon: cilUser, 
      color: 'primary',
      description: 'Basic student and school information'
    },
    'Learning Skills': { 
      icon: cilStar, 
      color: 'success',
      description: 'Learning skills and work habits assessment'
    },
    'Academic Performance': { 
      icon: cilBook, 
      color: 'info',
      description: 'Subject-specific performance and grades'
    },
    'Comments': { 
      icon: cilCommentSquare, 
      color: 'warning',
      description: 'Teacher observations and detailed comments'
    },
    'Next Steps': { 
      icon: cilArrowRight, 
      color: 'secondary',
      description: 'Goals and areas for improvement'
    },
    'Signatures': { 
      icon: cilPencil, 
      color: 'dark',
      description: 'Required signatures and approvals'
    },
    'Other': { 
      icon: cilMenu, 
      color: 'light',
      description: 'Additional fields and information'
    }
  };

  if (loading) {
    return (
      <CCard className="modern-report-card-form">
        <CCardBody className="text-center py-5">
          <CSpinner size="lg" className="mb-3" />
          <p className="text-muted">Loading report card form...</p>
        </CCardBody>
      </CCard>
    );
  }

  if (error) {
    return (
      <CCard className="modern-report-card-form">
        <CCardBody>
          <CAlert color="danger">
            <h5>Error Loading Form</h5>
            <p className="mb-0">{error}</p>
          </CAlert>
        </CCardBody>
      </CCard>
    );
  }

  return (
    <CCard className="modern-report-card-form border-0 shadow-sm">
      <CCardHeader className="bg-primary text-white">
        <h4 className="mb-0">
          <CIcon icon={cilStar} className="me-2" />
          Report Card Form
        </h4>
        <p className="mb-0 opacity-75">Fill out the form below to generate your report card</p>
      </CCardHeader>
      <CCardBody className="p-0">
        <CForm id="modern-report-card-form" onSubmit={onSubmit}>
          <CAccordion 
            alwaysOpen 
            activeItemKey={activeAccordionItems}
            className="border-0"
          >
            {Object.entries(groupedFields).map(([sectionName, sectionFields]) => {
              const config = sectionConfig[sectionName] || sectionConfig['Other'];
              
              return (
                <CAccordionItem itemKey={sectionName} key={sectionName}>
                  <CAccordionHeader className="modern-accordion-header">
                    <div className="d-flex align-items-center">
                      <div 
                        className={`section-icon me-3 bg-${config.color} text-white rounded-circle d-flex align-items-center justify-content-center`}
                        style={{ width: '40px', height: '40px' }}
                      >
                        <CIcon icon={config.icon} size="sm" />
                      </div>
                      <div>
                        <h5 className="mb-0">{sectionName}</h5>
                        <small className="text-muted">{config.description}</small>
                      </div>
                    </div>
                  </CAccordionHeader>
                  <CAccordionBody className="p-4">
                    <CRow className="g-3">
                      {sectionFields.map((field) => (
                        <SmartInputField
                          key={field.name}
                          field={field}
                          value={formData[field.name]}
                          onChange={(value) => handleFieldChange(field.name, value)}
                          onGenerate={handleAIGenerate}
                          isGenerating={isGenerating[field.name]}
                          required={field.required}
                        />
                      ))}
                    </CRow>
                  </CAccordionBody>
                </CAccordionItem>
              );
            })}
          </CAccordion>
        </CForm>
      </CCardBody>
    </CCard>
  );
};

// PropTypes
AIInputField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onGenerate: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  minHeight: PropTypes.string
};

SmartInputField.propTypes = {
  field: PropTypes.shape({
    name: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    inputType: PropTypes.string.isRequired,
    size: PropTypes.string,
    options: PropTypes.array,
    maxLength: PropTypes.number,
    required: PropTypes.bool
  }).isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  onGenerate: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool,
  required: PropTypes.bool
};

ModernReportCardForm.propTypes = {
  fields: PropTypes.array.isRequired,
  formData: PropTypes.object.isRequired,
  onFormDataChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  loading: PropTypes.bool,
  error: PropTypes.string
};

export default ModernReportCardForm; 