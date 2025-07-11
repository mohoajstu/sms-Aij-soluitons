import React, { useState, useEffect, useCallback } from 'react';
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CSpinner,
  CAlert,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CFormSelect
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilDescription, cilCloudDownload, cilHistory } from '@coreui/icons';
import { saveAs } from 'file-saver';

import PDFViewer from './Components/PDFViewer';
import KindergartenInitialUI from './Components/KindergartenInitialUI';
import KindergartenReportUI from './Components/KindergartenReportUI';
import PDFFieldInspector from './Components/PDFFieldInspector';
import "./ReportCard.css";
import "./ModernReportCard.css";
import { PDFDocument } from 'pdf-lib';
import DynamicReportCardForm from './Components/DynamicReportCardForm';
import { useNavigate } from 'react-router-dom';
// Firebase Storage & Firestore
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, firestore } from '../../Firebase/firebase';
import useAuth from '../../Firebase/useAuth';

// NOTE: All PDF assets are served from the public folder so we can access them by URL at runtime.
// The folder name "Report Cards" contains a space, so we encode it (`Report%20Cards`).
export const REPORT_CARD_TYPES = [
  {
    id: 'kg-initial-observations',
    name: 'Kindergarten – Communication of Learning (Initial Observations)',
    pdfPath: '/assets/Report%20Cards/kg-cl-initial-Observations.pdf',
    description: 'Kindergarten progress report – initial observations',
    route: '/reportcards/kg-initial',
    uiComponent: 'KindergartenInitialUI',
  },
  {
    id: 'kg-report',
    name: 'Kindergarten – Communication of Learning (Report Card)',
    pdfPath: '/assets/Report%20Cards/edu-Kindergarten-Communication-of-Learning-public-schools.pdf',
    description: 'Kindergarten formal report card',
    route: '/reportcards/kg-report',
    uiComponent: 'KindergartenReportUI',
  },
  {
    id: '1-6-progress',
    name: 'Grades 1–6 – Elementary Progress Report',
    pdfPath: '/assets/Report%20Cards/1-6-edu-elementary-progress-report-card-public-schools.pdf',
    description: 'Elementary progress report card for grades 1-6',
    route: '/reportcards/1-6-progress',
  },
  {
    id: '1-6-report-card',
    name: 'Grades 1–6 – Elementary Provincial Report Card',
    pdfPath: '/assets/Report%20Cards/1-6-edu-elementary-provincial-report-card-public-schools.pdf',
    description: 'Elementary provincial report card for grades 1-6',
    route: '/reportcards/1-6-report',
  },
  {
    id: '7-8-progress',
    name: 'Grades 7–8 – Elementary Progress Report',
    pdfPath: '/assets/Report%20Cards/7-8-edu-elementary-progress-report-card-public-schools.pdf',
    description: 'Elementary progress report card for grades 7-8',
    route: '/reportcards/7-8-progress',
  },
  {
    id: '7-8-report-card',
    name: 'Grades 7–8 – Elementary Provincial Report Card',
    pdfPath: '/assets/Report%20Cards/7-8-edu-elementary-provincial-report-card-public-schools.pdf',
    description: 'Elementary provincial report card for grades 7-8',
    route: '/reportcards/7-8-report',
  },
];

// Define the structure of our form data with JSDoc
/**
 * @typedef {Object} ReportCardData
 * @property {string} student_name - Student name
 * @property {string} grade - Grade level
 * @property {string} teacher_name - Teacher name
 * @property {string} school_year - School year
 * @property {string} date - Date
 * @property {string} oen - Ontario Education Number
 * @property {string} days_absent - Days absent
 * @property {string} total_days_absent - Total days absent
 * @property {string} times_late - Times late
 * @property {string} total_times_late - Total times late
 * @property {string} board - School board
 * @property {string} school - School name
 * @property {string} address_1 - Address line 1
 * @property {string} address_2 - Address line 2
 * @property {string} principal - Principal name
 * @property {string} telephone - Telephone
 * @property {string} responsibility - Responsibility rating
 * @property {string} organization - Organization rating
 * @property {string} independent_work - Independent work rating
 * @property {string} collaboration - Collaboration rating
 * @property {string} initiative - Initiative rating
 * @property {string} self_regulation - Self-regulation rating
 * @property {string} strengths_next_steps - Strengths and next steps
 * @property {string} teacher_signature - Teacher signature
 * @property {string} parent_signature - Parent signature
 * @property {string} principal_signature - Principal signature
 */

// Accept an optional presetReportCardId. If provided the dropdown is hidden and the supplied
// template will be used immediately. This lets us reuse this component inside wrapper pages.
const ReportCard = ({ presetReportCardId = null }) => {
  const [selectedReportCard, setSelectedReportCard] = useState(presetReportCardId || '');
  const [formData, setFormData] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [fields, setFields] = useState([]);
  const [filledPdfBytes, setFilledPdfBytes] = useState(null);
  const [currentTab, setCurrentTab] = useState('form');
  const [showFieldInspector, setShowFieldInspector] = useState(false);
  const [useModernForm, setUseModernForm] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  // Current authenticated user (needed for storage path)
  const { user } = useAuth();

  const navigate = useNavigate();

  // Get current report card configuration
  const getCurrentReportType = () => {
    return REPORT_CARD_TYPES.find(type => type.id === selectedReportCard);
  };

  /**
   * This callback receives the generated PDF data from the viewer component.
   * @param {string} url - A temporary blob URL for the preview (managed by PDFViewer).
   * @param {Uint8Array} bytes - The raw byte data of the filled PDF.
   */
  const handlePdfGenerated = (url, bytes) => {
    // We only need to store the raw bytes for downloading and uploading.
    // The URL is handled internally by the PDFViewer for the live preview.
    setFilledPdfBytes(bytes);
  };

  // Handle form data changes with improved structure
  const handleFormDataChange = (newFormData) => {
    console.log('Form data changed:', newFormData);
    setFormData(newFormData);
  };

  // Handle report card type change
  const handleReportTypeChange = (e) => {
    const id = e.target.value;
    setSelectedReportCard(id);

    // Find route and navigate
    const config = REPORT_CARD_TYPES.find(t => t.id === id);
    if (config?.route) {
      navigate(config.route);
    }
  };

  // Handle field inspection results
  const handleFieldsInspected = (fields) => {
    console.log('PDF fields inspected:', fields);
    setFields(fields);
  };

  // Load PDF fields for modern form
  const loadPDFFields = async (reportCardType) => {
    if (!reportCardType || !reportCardType.pdfPath) {
      setFields([]);
      setFormData({});
      return;
    }

    setFormLoading(true);
    setFormError(null);
    
    try {
      console.log('Loading PDF fields from:', reportCardType.pdfPath);
      
      const response = await fetch(reportCardType.pdfPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      }
      
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();
      const pdfFields = form.getFields();
      
      console.log(`Found ${pdfFields.length} fields in PDF`);
      
      // Process fields for form generation (using same logic as DynamicReportCardForm)
      const processedFields = pdfFields.map((field, index) => {
        const fieldName = field.getName();
        const fieldType = field.constructor.name;
        
        let options = [];
        if (fieldType === 'PDFDropdown' || fieldType === 'PDFRadioGroup') {
          try {
            options = field.getOptions();
          } catch (e) {
            console.warn(`Could not get options for field ${fieldName}:`, e);
          }
        }
        
        const section = determineSection(fieldName, reportCardType);
        
        return {
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
      });
      
      setFields(processedFields);

      // Initialize form data with empty values
      const initialFormData = {};
      processedFields.forEach(field => {
        initialFormData[field.name] = field.inputType === 'checkbox' ? false : '';
      });

      setFormData(initialFormData);
      
    } catch (err) {
      console.error('Error loading PDF fields:', err);
      setFormError(`Failed to load PDF fields: ${err.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  // Helper functions (same as DynamicReportCardForm)
  const generateFieldLabel = (fieldName) => {
    return fieldName
      .replace(/[_-]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

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
      'ERSBenchmarkNo', 'year1', 'year2', 'Year1', 'Year2',
      'keyLearningESL', 'keyLearningIEP', 'keyLearning2ESL', 'keyLearning2IEP',
      'placementInSeptemberGrade1', 'placementInSeptemberKg2'
    ];
    
    if (checkboxFields.includes(fieldName)) {
      return 'checkbox';
    }
    
    if (fieldType === 'PDFTextField') {
      if (lowerName.includes('comment') || lowerName.includes('note') || lowerName.includes('observation') || lowerName.includes('strength') || lowerName.includes('next') || lowerName.includes('goal')) {
        return 'textarea';
      }
      if (lowerName.includes('phone') || lowerName.includes('number') || lowerName.includes('absent') || lowerName.includes('late')) {
        return 'number';
      }
      return 'text';
    }
    
    if (fieldType === 'PDFDropdown') {
      return 'select';
    }
    
    if (fieldType === 'PDFCheckBox') {
      return 'checkbox';
    }
    
    return 'text';
  };

  const determineFieldSize = (fieldName, fieldType) => {
    const lowerName = fieldName.toLowerCase();
    
    // Large fields
    if (lowerName.includes('comment') || lowerName.includes('note') || lowerName.includes('observation') || lowerName.includes('strength') || lowerName.includes('next') || lowerName.includes('goal')) {
      return 'full';
    }
    
    // Small fields
    if (lowerName.includes('grade') || lowerName.includes('term') || lowerName.includes('absent') || lowerName.includes('late') || lowerName.includes('year') || fieldType === 'PDFCheckBox') {
      return 'small';
    }
    
    // Medium fields
    if (lowerName.includes('name') || lowerName.includes('teacher') || lowerName.includes('principal') || lowerName.includes('school') || lowerName.includes('phone') || lowerName.includes('telephone')) {
      return 'medium';
    }
    
    return 'medium';
  };

  const determineMaxLength = (fieldName, fieldType, section, reportCardType) => {
    const lowerName = fieldName.toLowerCase();
    
    if (lowerName.includes('comment') || lowerName.includes('note') || lowerName.includes('observation') || lowerName.includes('strength') || lowerName.includes('next') || lowerName.includes('goal')) {
      return 500;
    }
    
    if (lowerName.includes('name') || lowerName.includes('school') || lowerName.includes('address')) {
      return 100;
    }
    
    if (lowerName.includes('phone') || lowerName.includes('telephone') || lowerName.includes('oen')) {
      return 20;
    }
    
    return 50;
  };

  const determineSection = (fieldName, reportCardType) => {
    const lowerName = fieldName.toLowerCase();
    
    if (lowerName.includes('student') || lowerName.includes('name') || lowerName.includes('grade') || lowerName.includes('oen') || lowerName.includes('school') || lowerName.includes('board') || lowerName.includes('address') || lowerName.includes('principal') || lowerName.includes('telephone') || lowerName.includes('phone')) {
      return 'Student Information';
    }
    
    if (lowerName.includes('responsibility') || lowerName.includes('organization') || lowerName.includes('independent') || lowerName.includes('collaboration') || lowerName.includes('initiative') || lowerName.includes('regulation')) {
      return 'Learning Skills';
    }
    
    if (lowerName.includes('strength') || lowerName.includes('next') || lowerName.includes('goal') || lowerName.includes('improvement')) {
      return 'Next Steps';
    }
    
    if (lowerName.includes('comment') || lowerName.includes('note') || lowerName.includes('observation')) {
      return 'Comments';
    }
    
    if (lowerName.includes('signature') || lowerName.includes('teacher') || lowerName.includes('parent') || lowerName.includes('guardian')) {
      return 'Signatures';
    }
    
    if (lowerName.includes('math') || lowerName.includes('language') || lowerName.includes('science') || lowerName.includes('social') || lowerName.includes('french') || lowerName.includes('art') || lowerName.includes('music') || lowerName.includes('drama') || lowerName.includes('dance') || lowerName.includes('health') || lowerName.includes('physical')) {
      return 'Academic Performance';
    }
    
    return 'Other';
  };

  // Load fields when report card type changes and modern form is selected
  useEffect(() => {
    if (useModernForm && selectedReportCard) {
      const reportType = getCurrentReportType();
      if (reportType) {
        loadPDFFields(reportType);
      }
    }
  }, [useModernForm, selectedReportCard]);

  /* ------------------------------------------------------------------
     LocalStorage persistence
     ------------------------------------------------------------------ */
  // Load saved form when report card type changes
  useEffect(() => {
    if (!selectedReportCard) return;
    try {
      const saved = localStorage.getItem(`reportcard_form_${selectedReportCard}`);
      if (saved) {
        setFormData(JSON.parse(saved));
      } else {
        setFormData({});
      }
    } catch (err) {
      console.warn('Unable to parse saved form data:', err);
    }
  }, [selectedReportCard]);

  // Auto-save current form on every change
  useEffect(() => {
    if (!selectedReportCard) return;
    try {
      localStorage.setItem(`reportcard_form_${selectedReportCard}`, JSON.stringify(formData));
    } catch (err) {
      console.warn('Unable to save form data to localStorage:', err);
    }
  }, [formData, selectedReportCard]);

  // Download the filled PDF
  const downloadFilledPDF = async () => {
    setIsGenerating(true);

    if (!filledPdfBytes) {
      alert("The PDF has not been generated yet. Please fill out the form and wait for the preview to update.");
      console.error("Download failed: filledPdfBytes is null.");
      setIsGenerating(false);
      return;
    }

    try {
      const blob = new Blob([filledPdfBytes], { type: 'application/pdf' });
      const reportCardType = getCurrentReportType();
      const studentName = (formData.student_name || formData.student || 'student').replace(/\\s+/g, '-');
      const fileName = `${reportCardType?.name || 'report-card'}-${studentName}-filled.pdf`;

      // Upload to Firebase first
      if (user) {
        try {
          const timestamp = Date.now();
          const filePath = `reportCards/${user.uid}/${selectedReportCard || 'report'}-${timestamp}.pdf`;
          const storageRef = ref(storage, filePath);

          await uploadBytes(storageRef, blob);
          const downloadURL = await getDownloadURL(storageRef);

          // Store a reference in Firestore
          await addDoc(collection(firestore, 'reportCards'), {
            uid: user.uid,
            type: selectedReportCard,
            filePath,
            url: downloadURL,
            studentName: studentName,
            createdAt: serverTimestamp(),
          });

          console.log('✅ Report card uploaded to Firebase Storage:', downloadURL);

        } catch (uploadError) {
          console.error('Error uploading PDF to Firebase Storage:', uploadError);
          alert('Failed to save the report card to the cloud, but the file will be downloaded locally.');
        }
      } else {
        console.warn('User not authenticated. Skipping Firebase upload.');
      }
      
      // Then trigger the local download
      saveAs(blob, fileName);
      console.log(`✅ Successfully triggered download for: ${fileName}`);

    } catch (error) {
      console.error('Error during PDF processing and download:', error);
      alert('An error occurred while trying to process or download the PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderModernForm = () => {
    const reportType = getCurrentReportType();
    const formProps = {
      fields,
      formData,
      onFormDataChange: handleFormDataChange,
      loading: formLoading,
      error: formError,
    };

    switch (reportType?.uiComponent) {
      case 'KindergartenInitialUI':
        return <KindergartenInitialUI {...formProps} />;
      case 'KindergartenReportUI':
        return <KindergartenReportUI {...formProps} />;
      default:
        // Default to the initial Kindergarten UI if no specific component is found
        return <KindergartenInitialUI {...formProps} />;
    }
  };

  return (
    <CContainer fluid>
      <CRow>
        <CCol>
          <h2>Report Card Generator</h2>

          {/* Report Card Type Selector – hide if a preset report card was supplied */}
          {!presetReportCardId && (
            <CCard className="mb-4">
              <CCardBody>
                <div className="report-card-type-selector">
                  <label htmlFor="reportCardType" className="form-label">
                    Select Report Card Type:
                  </label>
                  <CFormSelect
                    id="reportCardType"
                    value={selectedReportCard}
                    onChange={handleReportTypeChange}
                    className="mb-3"
                  >
                    <option value="">Choose a report card type...</option>
                    {REPORT_CARD_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
              </CCardBody>
            </CCard>
          )}

          {/* Toggle Field Inspector */}
          {selectedReportCard && (
            <div className="mb-4">
              <CButton 
                variant="outline" 
                onClick={() => setShowFieldInspector(!showFieldInspector)}
                className="mb-3 me-2"
              >
                {showFieldInspector ? 'Hide' : 'Show'} PDF Field Inspector
              </CButton>
              
              <CButton 
                variant="outline"
                color={useModernForm ? 'primary' : 'secondary'}
                onClick={() => setUseModernForm(!useModernForm)}
                className="mb-3"
              >
                {useModernForm ? 'Switch to Classic Form' : 'Switch to Modern Form'}
              </CButton>
              
              {showFieldInspector && (
                <PDFFieldInspector
                  pdfUrl={getCurrentReportType()?.pdfPath}
                  onFieldsInspected={handleFieldsInspected}
                />
              )}
            </div>
          )}

          {/* Main Content */}
          {selectedReportCard && (
            <CRow>
              {/* PDF Section */}
              <CCol lg={6} className="pdf-section">
                <CCard>
                  <CCardHeader>
                    <h5>Report Card Preview</h5>
                    <small className="text-muted">Live preview - changes appear as you type</small>
                  </CCardHeader>
                  <CCardBody>
                    <PDFViewer 
                      pdfUrl={getCurrentReportType()?.pdfPath} 
                      className="report-card-pdf-viewer"
                      formData={formData}
                      showPreview={true}
                      onFilledPdfGenerated={handlePdfGenerated}
                    />
                  </CCardBody>
                </CCard>
              </CCol>

              {/* Form Section */}
              <CCol lg={6} className="form-section">
                {useModernForm ? (
                  renderModernForm()
                ) : (
                  <CCard>
                    <CCardHeader>
                      <h5>Fill out the form to see live preview on the left</h5>
                      <small className="text-muted">
                        Form fields are dynamically generated based on the selected PDF document
                      </small>
                    </CCardHeader>
                    <CCardBody>
                      <DynamicReportCardForm 
                        reportCardType={getCurrentReportType()}
                        onFormDataChange={handleFormDataChange}
                      />
                      
                      <div className="mt-4">
                        <CButton 
                          color="success" 
                          onClick={downloadFilledPDF}
                          disabled={isGenerating}
                          className="me-2"
                        >
                          {isGenerating ? (
                            <>
                              <CSpinner size="sm" className="me-2" />
                              Downloading PDF...
                            </>
                          ) : (
                            'Download Filled PDF'
                          )}
                        </CButton>
                      </div>
                    </CCardBody>
                  </CCard>
                )}
                
                {/* Download Button for Modern Form */}
                {useModernForm && (
                  <div className="mt-4">
                    <CButton 
                      color="success" 
                      onClick={downloadFilledPDF}
                      disabled={isGenerating}
                      className="me-2"
                      size="lg"
                    >
                      {isGenerating ? (
                        <>
                          <CSpinner size="sm" className="me-2" />
                          Downloading PDF...
                        </>
                      ) : (
                        'Download Filled PDF'
                      )}
                    </CButton>
                  </div>
                )}
              </CCol>
            </CRow>
          )}
        </CCol>
      </CRow>
    </CContainer>
  );
};

export default ReportCard;
