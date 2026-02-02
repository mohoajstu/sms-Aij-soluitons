import React, { useState, useEffect, useCallback } from 'react';
import {
  CForm,
  CRow,
  CCol,
  CFormInput,
  CFormTextarea,
  CFormSelect,
  CCard,
  CCardBody,
  CCardHeader,
  CSpinner,
  CAlert,
  CButton,
  CAccordion,
  CAccordionItem,
  CAccordionHeader,
  CAccordionBody
} from '@coreui/react';
import Checkbox from '@mui/material/Checkbox';
import AIReportCommentInput from '../../../components/AIReportCommentInput';
import { FormControlLabel } from '@mui/material';
import { pink, green, blue, orange, purple } from '@mui/material/colors';
import { PDFDocument } from 'pdf-lib';
import PropTypes from 'prop-types';

// Custom hook for debounced values
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const DynamicReportCardForm = ({ reportCardType, onFormDataChange }) => {
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionOrder, setSectionOrder] = useState([]);

  // Debounce form data changes to avoid excessive PDF updates
  const debouncedFormData = useDebounce(formData, 500);

  // Notify parent of form data changes (debounced)
  useEffect(() => {
    onFormDataChange(debouncedFormData);
  }, [debouncedFormData, onFormDataChange]);

  // Load PDF fields when report card type changes
  useEffect(() => {
    if (reportCardType && reportCardType.pdfPath) {
      loadPDFFields(reportCardType.pdfPath);
    } else {
      setFields([]);
      setFormData({});
    }
  }, [reportCardType]);

  const loadPDFFields = async (pdfPath) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('DynamicReportCardForm: Loading PDF fields from:', pdfPath);
      
      const response = await fetch(pdfPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      }
      
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();
      const pdfFields = form.getFields();
      
      console.log(`DynamicReportCardForm: Found ${pdfFields.length} fields in PDF`);
      
      // Process fields for form generation
      const processedFields = pdfFields.map((field, index) => {
        const fieldName = field.getName();
        let fieldType = field.constructor.name;
        
        // For ambiguous field types like 'e', detect the actual field type by checking available methods
        if (fieldType === 'e') {
          if (typeof field.check === 'function' && typeof field.isChecked === 'function') {
            fieldType = 'PDFCheckBox';
            console.log(`DynamicReportCardForm: Detected type 'e' as checkbox for field "${fieldName}"`);
          } else if (typeof field.setText === 'function' && typeof field.getText === 'function') {
            fieldType = 'PDFTextField';
            console.log(`DynamicReportCardForm: Detected type 'e' as text field for field "${fieldName}"`);
          } else {
            console.warn(`DynamicReportCardForm: Could not determine actual type for field "${fieldName}" with type 'e'`);
          }
        }
        
        console.log(`DynamicReportCardForm: Processing field ${index + 1}/${pdfFields.length}: "${fieldName}" (${fieldType})`);
        
        let options = [];
        if (fieldType === 'PDFDropdown' || fieldType === 'PDFRadioGroup') {
          try {
            options = field.getOptions();
          } catch (e) {
            console.warn(`Could not get options for field ${fieldName}:`, e);
          }
        }
        
        const section = determineSection(fieldName, reportCardType);
        
        const processedField = {
          id: `field_${index}`,
          name: fieldName,
          type: fieldType,
          label: generateFieldLabel(fieldName),
          options,
          inputType: determineInputType(fieldName, fieldType),
          size: determineFieldSize(fieldName, fieldType),
          maxLength: determineMaxLength(fieldName, fieldType, section, reportCardType),
          section,
        };
        
        console.log(`DynamicReportCardForm: Processed field:`, processedField);
        
        return processedField;
      });
      
      console.log('DynamicReportCardForm: All processed fields:', processedFields);
      
      setFields(processedFields);

      // Compute dynamic section order based on first appearance in PDF
      const dynamicSectionOrder = [];
      processedFields.forEach((field) => {
        if (!dynamicSectionOrder.includes(field.section)) {
          dynamicSectionOrder.push(field.section);
        }
      });

      setSectionOrder(dynamicSectionOrder);

      // Initialize form data with empty values
      const initialFormData = {};
      processedFields.forEach(field => {
        initialFormData[field.name] = field.inputType === 'checkbox' ? false : '';
      });

      console.log('DynamicReportCardForm: Initial form data:', initialFormData);

      setFormData(initialFormData);
      
    } catch (err) {
      console.error('DynamicReportCardForm: Error loading PDF fields:', err);
      setError(`Failed to load PDF fields: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate human-readable labels from field names
  const generateFieldLabel = (fieldName) => {
    return fieldName
      .replace(/[_-]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Determine appropriate input type based on field name and type
  const determineInputType = (fieldName, fieldType) => {
    const lowerName = fieldName.toLowerCase();
    
    // Specific checkbox fields from the report card
    const checkboxFields = [
      'languageNA', 'languageESL', 'languageIEP', 'frenchListeningESL', 'frenchSpeakingESL',
      'frenchReadingESL', 'frenchWritingESL', 'frenchCore', 'nativeLanguageESL', 'nativeLanguageIEP',
      'nativeLanguageNA', 'mathESL', 'mathIEP', 'mathFrench', 'scienceESL', 'scienceIEP',
      'scienceFrench', 'frenchNA', 'frenchListeningIEP', 'frenchSpeakingIEP', 'frenchReadingIEP',
      'frenchWritingIEP', 'frenchImmersion', 'frenchExtended', 'socialStudiesESL', 'socialStudiesIEP',
      'socialStudiesFrench', 'healthEdESL', 'healthEdFrench', 'peESL', 'peFrench', 'healthEdIEP',
      'peIEP', 'danceFrench', 'danceIEP', 'Checkbox_29', 'danceESL', 'dramaESL', 'musicESL',
      'visualArtsESL', 'otherESL', 'otherFrench', 'dramaIEP', 'musicFrench', 'musicIEP',
      'Checkbox_39', 'visualArtsIEP', 'otherIEP', 'otherNA', 'danceNA', 'dramaNA', 'musicNA',
      'visualArtsNA', 'ERSCompletedYes', 'ERSCompletedNo', 'ERSCompletedNA', 'ERSBenchmarkYes',
      'ERSBenchmarkNo',
      // Year checkboxes
      'year1', 'year2', 'Year1', 'Year2',
      // Key Learning flags
      'keyLearningESL', 'keyLearningIEP', 'keyLearning2ESL', 'keyLearning2IEP',
      'placementInSeptemberGrade1', 'placementInSeptemberKg2'
    ];
    
    // Check if this field is in our specific checkbox list
    if (checkboxFields.includes(fieldName)) {
      return 'checkbox';
    }
    
    // Generic rule: any field that includes ESL or IEP (but not "comment" etc.) is likely a checkbox
    if ((lowerName.includes('esl') || lowerName.includes('iep')) &&
        !lowerName.includes('comment') &&
        !lowerName.includes('note') &&
        !lowerName.includes('observation') &&
        !lowerName.includes('description')) {
      return 'checkbox';
    }
    
    // Fall back to PDF field type detection
    if (fieldType === 'PDFCheckBox') return 'checkbox';
    if (fieldType === 'PDFDropdown' || fieldType === 'PDFRadioGroup') return 'select';
    
    // Number fields
    if (lowerName.includes('grade') || 
        lowerName.includes('score') || 
        lowerName.includes('mark') || 
        lowerName.includes('percent') ||
        lowerName.includes('number') ||
        lowerName.includes('age') ||
        lowerName.includes('year')) {
      return 'number';
    }
    
    // Email fields
    if (lowerName.includes('email')) return 'email';
    
    // Date fields
    if (lowerName.includes('date') || lowerName.includes('birth')) return 'date';
    
    // Text area for comments, key learning and other long text
    if (lowerName.includes('comment') || 
        lowerName.includes('note') || 
        lowerName.includes('observation') ||
        lowerName.includes('description') ||
        lowerName.includes('goal') ||
        lowerName.includes('strength') ||
        lowerName.includes('next') ||
        lowerName.includes('keylearning') ||
        lowerName.includes('improvement') ||
        lowerName.includes('areas') ||
        lowerName.includes('feedback')) {
      return 'textarea';
    }
    
    return 'text';
  };

  // Determine field size based on content type
  const determineFieldSize = (fieldName, fieldType) => {
    const lowerName = fieldName.toLowerCase();
    
    if (fieldType === 'PDFCheckBox' || determineInputType(fieldName, fieldType) === 'checkbox') return 'sm';
    
    // Extra small for initials, codes
    if (lowerName.includes('initial') || lowerName.includes('code')) return 'xs';
    
    // Small fields for short data
    if (lowerName.includes('grade') || 
        lowerName.includes('mark') || 
        lowerName.includes('score') ||
        lowerName.includes('age') ||
        lowerName.includes('year') ||
        lowerName.includes('term') ||
        lowerName.includes('period')) {
      return 'sm';
    }
    
    // Large fields for long text
    if (lowerName.includes('comment') || 
        lowerName.includes('note') || 
        lowerName.includes('observation') ||
        lowerName.includes('description') ||
        lowerName.includes('goal') ||
        lowerName.includes('strength') ||
        lowerName.includes('next') ||
        lowerName.includes('improvement') ||
        lowerName.includes('areas') ||
        lowerName.includes('feedback') ||
        lowerName.includes('address')) {
      return 'lg';
    }
    
    return 'md'; // Default medium size
  };

  // Determine maximum character length for fields, incorporating ministry guidelines.
  const determineMaxLength = (fieldName, fieldType, section, reportCardType) => {
    const lowerName = fieldName.toLowerCase();
    
    // Checkbox fields have no character limit.
    if (fieldType === 'PDFCheckBox') return null;
    
    // Ministry guidelines – template-specific rules
    const templateId = reportCardType?.id || '';

    // Helper to detect Kindergarten templates
    const isKindergarten = templateId.startsWith('kg');
    const isProgress = templateId.includes('progress') || templateId.includes('initial');

    // Kindergarten – Progress report (Initial Observations)
    if (isKindergarten && isProgress) {
      // Whole report single comment block → generous limit
      if (section === 'Comments and Observations' || section === 'Learning Skills and Work Habits') {
        return 1500;
      }
    }

    // Kindergarten – Formal report card
    if (isKindergarten && !isProgress) {
      if (lowerName.includes('keylearning') || section === 'Comments and Observations') {
        return 1000;
      }
    }

    const isGrades1to6 = templateId.startsWith('1-6');
    const isGrades7to8 = templateId.startsWith('7-8');

    // Progress reports (Grades 1-8)
    if (isProgress && (isGrades1to6 || isGrades7to8)) {
      if (section === 'Learning Skills and Work Habits') {
        return 1000;
      }
      if (section.startsWith('Subjects')) {
        // 2-5 lines ≈ 350 chars @ 11-pt – we pick 400 as ceiling.
        return 400;
      }
    }

    // Formal report cards (Grades 1-8)
    if (!isProgress && (isGrades1to6 || isGrades7to8)) {
      if (section === 'Learning Skills and Work Habits') {
        return 1000;
      }
      if (section.startsWith('Subjects')) {
        return 800;
      }
    }

    // --- Generic fallback rules below ---
    
    // Short fields
    if (lowerName.includes('initial') || lowerName.includes('code')) return 5;
    if (lowerName.includes('grade') || lowerName.includes('mark') || lowerName.includes('score')) return 10;
    if (lowerName.includes('year') || lowerName.includes('age')) return 4;
    
    // Medium fields
    if (lowerName.includes('name') || lowerName.includes('teacher') || lowerName.includes('principal')) return 50;
    if (lowerName.includes('school') || lowerName.includes('board')) return 100;
    if (lowerName.includes('telephone') || lowerName.includes('phone')) return 20;
    if (lowerName.includes('email')) return 100;
    
    // Large text fields (comments etc.)
    if (lowerName.includes('strength') || 
        lowerName.includes('next') ||
        lowerName.includes('improvement') ||
        lowerName.includes('goal') ||
        lowerName.includes('comment') ||
        lowerName.includes('observation') ||
        lowerName.includes('note') ||
        lowerName.includes('feedback')) {
      return 200;
    }
    
    // Address fields
    if (lowerName.includes('address')) return 150;
    
    return 100; // Default
  };

  // Determine section based on field name and report card type
  const determineSection = (fieldName, reportCardType) => {
    const lowerName = fieldName.toLowerCase();
    const reportId = reportCardType?.id || '';
    
    // Specific categorization for checkbox fields
    
    // Language-related checkboxes
    if (fieldName.startsWith('language') || fieldName.startsWith('nativeLanguage')) {
      return 'Subjects - Language';
    }
    
    // French-related checkboxes
    if (fieldName.startsWith('french') || fieldName.includes('French')) {
      return 'Subjects - French';
    }
    
    // Math-related checkboxes
    if (fieldName.startsWith('math')) {
      return 'Subjects - Mathematics';
    }
    
    // Science-related checkboxes
    if (fieldName.startsWith('science')) {
      return 'Subjects - Science';
    }
    
    // Social Studies checkboxes
    if (fieldName.startsWith('socialStudies')) {
      return 'Subjects - Social Studies';
    }
    
    // Health Education checkboxes
    if (fieldName.startsWith('healthEd')) {
      return 'Subjects - Health Education';
    }
    
    // Physical Education checkboxes
    if (fieldName.startsWith('pe') && fieldName !== 'peIEP') {
      return 'Subjects - Physical Education';
    }
    
    // Arts-related checkboxes
    if (fieldName.startsWith('dance') || fieldName.startsWith('drama') || 
        fieldName.startsWith('music') || fieldName.startsWith('visualArts') || 
        fieldName.startsWith('other')) {
      return 'Subjects - Arts';
    }
    
    // Early Reading Screening checkboxes
    if (fieldName.startsWith('ERS')) {
      return 'Early Reading Screening';
    }
    
    // Generic numbered checkboxes
    if (fieldName.startsWith('Checkbox_')) {
      return 'Other Checkboxes';
    }
    
    // Student/School Information
    if (lowerName.includes('student') || 
        lowerName.includes('name') || 
        lowerName.includes('oen') ||
        lowerName.includes('school') || 
        lowerName.includes('board') ||
        lowerName.includes('teacher') || 
        lowerName.includes('principal') ||
        lowerName.includes('address') ||
        lowerName.includes('telephone') ||
        lowerName.includes('grade') ||
        lowerName.includes('year') ||
        lowerName.includes('term') ||
        lowerName.includes('date')) {
      return 'Student/School Information';
    }
    
    // Learning Skills and Work Habits
    if (lowerName.includes('responsibility') ||
        lowerName.includes('organization') ||
        lowerName.includes('independent') ||
        lowerName.includes('collaboration') ||
        lowerName.includes('initiative') ||
        lowerName.includes('self') ||
        lowerName.includes('regulation') ||
        lowerName.includes('learning') ||
        lowerName.includes('work') ||
        lowerName.includes('habit')) {
      return 'Learning Skills and Work Habits';
    }
    
    // General subjects (fallback)
    if (lowerName.includes('language') ||
        lowerName.includes('mathematics') ||
        lowerName.includes('math') ||
        lowerName.includes('science') ||
        lowerName.includes('social') ||
        lowerName.includes('studies') ||
        lowerName.includes('history') ||
        lowerName.includes('geography') ||
        lowerName.includes('arts') ||
        lowerName.includes('physical') ||
        lowerName.includes('education') ||
        lowerName.includes('french') ||
        lowerName.includes('music') ||
        lowerName.includes('drama') ||
        lowerName.includes('visual') ||
        lowerName.includes('health') ||
        lowerName.includes('reading') ||
        lowerName.includes('writing') ||
        lowerName.includes('oral') ||
        lowerName.includes('media')) {
      return 'Subjects';
    }
    
    // Signatures
    if (lowerName.includes('signature') ||
        lowerName.includes('sign') ||
        lowerName.includes('signed')) {
      return 'Signatures';
    }
    
    // Attendance
    if (lowerName.includes('absent') ||
        lowerName.includes('attendance') ||
        lowerName.includes('late') ||
        lowerName.includes('days') ||
        lowerName.includes('times')) {
      return 'Attendance';
    }
    
    // Comments and Observations
    if (lowerName.includes('comment') ||
        lowerName.includes('observation') ||
        lowerName.includes('note') ||
        lowerName.includes('strength') ||
        lowerName.includes('next') ||
        lowerName.includes('improvement') ||
        lowerName.includes('goal') ||
        lowerName.includes('feedback')) {
      return 'Comments and Observations';
    }
    
    return 'Other';
  };

  // Handle form field changes with enhanced debugging
  const handleFieldChange = (fieldName, value) => {
    console.log(`DynamicReportCardForm: Field "${fieldName}" changed to:`, value, typeof value);
    
    const updatedFormData = {
      ...formData,
      [fieldName]: value
    };
    
    setFormData(updatedFormData);
    debouncedUpdate(updatedFormData);
  };

  // Handle field blur events for immediate updates
  const handleFieldBlur = (fieldName, value) => {
    console.log(`DynamicReportCardForm: Field "${fieldName}" blur event with value:`, value, typeof value);
    
    const updatedFormData = {
      ...formData,
      [fieldName]: value
    };
    
    setFormData(updatedFormData);
    
    // Immediate update on blur
    if (onFormDataChange) {
      console.log('DynamicReportCardForm: Calling onFormDataChange with updated data:', updatedFormData);
      onFormDataChange(updatedFormData);
    }
  };

  // Determine checkbox color based on section or field type
  const getCheckboxColor = (field) => {
    const section = field.section;
    const lowerName = field.name.toLowerCase();
    
    // Color coding for better UX
    switch (section) {
      case 'Student/School Information':
        return 'primary'; // Blue
      case 'Learning Skills and Work Habits':
        return 'success'; // Green
      case 'Subjects':
        return 'secondary'; // Purple/Gray
      case 'Attendance':
        return 'warning'; // Orange (using custom sx)
      case 'Comments and Observations':
        return 'info'; // Light Blue (using custom sx)
      case 'Signatures':
        return 'error'; // Red (using custom sx)
      default:
        return 'default';
    }
  };

  // Get custom checkbox styling
  const getCheckboxSx = (field) => {
    const section = field.section;
    
    switch (section) {
      case 'Attendance':
        return {
          color: orange[800],
          '&.Mui-checked': {
            color: orange[600],
          },
        };
      case 'Comments and Observations':
        return {
          color: blue[800],
          '&.Mui-checked': {
            color: blue[600],
          },
        };
      case 'Signatures':
        return {
          color: pink[800],
          '&.Mui-checked': {
            color: pink[600],
          },
        };
      case 'Early Reading Screening':
        return {
          color: purple[800],
          '&.Mui-checked': {
            color: purple[600],
          },
        };
      default:
        return {};
    }
  };

  // Render individual form field
  const renderField = (field) => {
    const { name, label, inputType, options, size, maxLength } = field;
    const value = formData[name] ?? (inputType === 'checkbox' ? false : '');
    
    const getColSize = (size) => {
      switch (size) {
        case 'xs': return { xs: 6, sm: 3, md: 2 };
        case 'sm': return { xs: 6, sm: 4, md: 3 };
        case 'md': return { xs: 12, sm: 6, md: 6 };
        case 'lg': return { xs: 12, sm: 12, md: 12 };
        default: return { xs: 12, sm: 6, md: 6 };
      }
    };

    const colProps = getColSize(size);

    switch (inputType) {
      case 'checkbox':
        const checkboxColor = getCheckboxColor(field);
        const customSx = getCheckboxSx(field);
        const hasCustomSx = Object.keys(customSx).length > 0;
        
        return (
          <CCol key={name} {...colProps} className="mb-3">
            <FormControlLabel
              control={
                <Checkbox
                  checked={value === true || value === 'true' || value === '1' || value === 'checked'}
                  onChange={(e) => handleFieldChange(name, e.target.checked)}
                  size="small"
                  color={hasCustomSx ? 'default' : checkboxColor}
                  sx={customSx}
                  inputProps={{ 'aria-label': `${label} checkbox` }}
                />
              }
              label={label}
            />
            <small className="text-muted d-block">
              {name}
            </small>
          </CCol>
        );
        
      case 'select':
        return (
          <CCol key={name} {...colProps} className="mb-3">
            <label htmlFor={name} className="form-label">
              {label}:
            </label>
            <CFormSelect
              id={name}
              value={value}
              onChange={(e) => handleFieldChange(name, e.target.value)}
              size={size === 'sm' ? 'sm' : undefined}
            >
              <option value="">Select...</option>
              {options.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </CFormSelect>
            <small className="text-muted">
              {name}
            </small>
          </CCol>
        );
        
      case 'textarea':
        return (
          <CCol key={name} {...colProps} className="mb-3">
            <label htmlFor={name} className="form-label">
              {label}:
            </label>
            <div className="position-relative">
              <CFormTextarea
                id={name}
                value={value}
                onChange={(e) => handleFieldChange(name, e.target.value)}
                rows={size === 'lg' ? 4 : 3}
                maxLength={maxLength}
                placeholder={`Enter ${label.toLowerCase()} (max ${maxLength} characters)`}
              />
              {/* AI Generation Button */}
              <div className="position-absolute" style={{ top: '5px', right: '5px' }}>
                <AIReportCommentInput
                  label=""
                  formData={{
                    student_name: formData.student || '',
                    grade: formData.grade || '',
                    subject: label,
                  }}
                  handleChange={(field, aiValue) => {
                    if (field === 'teacher_comments' || field === 'strengths_next_steps') {
                      handleFieldChange(name, aiValue)
                    }
                  }}
                  buttonText=""
                  explicitReportType="Dynamic Report Card"
                  className="ai-button-minimal"
                />
              </div>
            </div>
            <small className="text-muted">
              {value.length || 0}/{maxLength} characters | {name}
            </small>
          </CCol>
        );
        
      case 'number':
        return (
          <CCol key={name} {...colProps} className="mb-3">
            <label htmlFor={name} className="form-label">
              {label}:
            </label>
            <CFormInput
              id={name}
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(name, e.target.value)}
              placeholder={`Enter ${label.toLowerCase()}`}
              size={size === 'sm' ? 'sm' : undefined}
            />
            <small className="text-muted">
              {name}
            </small>
          </CCol>
        );
        
      case 'email':
        return (
          <CCol key={name} {...colProps} className="mb-3">
            <label htmlFor={name} className="form-label">
              {label}:
            </label>
            <CFormInput
              id={name}
              type="email"
              value={value}
              onChange={(e) => handleFieldChange(name, e.target.value)}
              maxLength={maxLength}
              placeholder={`Enter ${label.toLowerCase()}`}
            />
            <small className="text-muted">
              {name}
            </small>
          </CCol>
        );
        
      case 'date':
        return (
          <CCol key={name} {...colProps} className="mb-3">
            <label htmlFor={name} className="form-label">
              {label}:
            </label>
            <CFormInput
              id={name}
              type="date"
              value={value}
              onChange={(e) => handleFieldChange(name, e.target.value)}
              size={size === 'sm' ? 'sm' : undefined}
            />
            <small className="text-muted">
              {name}
            </small>
          </CCol>
        );
        
      default:
        return (
          <CCol key={name} {...colProps} className="mb-3">
            <label htmlFor={name} className="form-label">
              {label}:
            </label>
            <CFormInput
              id={name}
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(name, e.target.value)}
              maxLength={maxLength}
              placeholder={`Enter ${label.toLowerCase()}`}
              size={size === 'sm' ? 'sm' : undefined}
            />
            <small className="text-muted">
              {maxLength && `${value.length || 0}/${maxLength} | `}{name}
            </small>
          </CCol>
        );
    }
  };

  // Filter fields based on search term
  const filteredFields = fields.filter(field =>
    field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group fields by section
  const groupedFields = filteredFields.reduce((groups, field) => {
    const section = field.section;
    if (!groups[section]) {
      groups[section] = [];
    }
    groups[section].push(field);
    return groups;
  }, {});

  if (!reportCardType) {
    return (
      <CAlert color="info">
        Please select a report card type to view the form fields.
      </CAlert>
    );
  }

  if (loading) {
    return (
      <div className="text-center p-4">
        <CSpinner color="primary" />
        <p className="mt-2">Loading form fields...</p>
      </div>
    );
  }

  if (error) {
    return (
      <CAlert color="danger">
        <h6>Error Loading Form</h6>
        <p>{error}</p>
        <CButton 
          color="danger" 
          variant="outline" 
          size="sm"
          onClick={() => loadPDFFields(reportCardType.pdfPath)}
        >
          Retry
        </CButton>
      </CAlert>
    );
  }

  return (
    <div className="dynamic-form-container">
      {/* Search and Info */}
      <div className="mb-3">
        <CFormInput
          type="text"
          placeholder="Search fields..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="sm"
        />
        <small className="text-muted">
          Found {filteredFields.length} of {fields.length} fields
        </small>
      </div>

      <CForm>
        <CAccordion activeItemKey={0} flush>
          {(sectionOrder.length > 0 ? sectionOrder : Object.keys(groupedFields)).map((sectionName, index) => {
            const sectionFields = groupedFields[sectionName];
            if (!sectionFields || sectionFields.length === 0) return null;

            return (
              <CAccordionItem key={sectionName} itemKey={index}>
                <CAccordionHeader>
                  <strong>{sectionName}</strong>
                  <span className="badge bg-secondary ms-2">
                    {sectionFields.length} fields
                  </span>
                </CAccordionHeader>
                <CAccordionBody>
                  <CRow>
                    {sectionFields.map(field => renderField(field))}
                  </CRow>
                </CAccordionBody>
              </CAccordionItem>
            );
          })}
        </CAccordion>
      </CForm>

      {fields.length === 0 && (
        <CAlert color="warning">
          No form fields found in the selected PDF document.
        </CAlert>
      )}
    </div>
  );
};

DynamicReportCardForm.propTypes = {
  reportCardType: PropTypes.object,
  onFormDataChange: PropTypes.func.isRequired
};

export default DynamicReportCardForm; 
