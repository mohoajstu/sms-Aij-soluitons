import { useState } from "react";
import { 
  CButton, 
  CCard, 
  CCardBody, 
  CCardHeader, 
  CContainer, 
  CRow, 
  CCol,
  CSpinner,
  CFormSelect
} from "@coreui/react";
import { ReportCardForm } from "./Componenets/ReportCardForm";
import { ReportCardPreview } from "./Componenets/ReportCardPreview";
import PDFViewer from "./Componenets/PDFViewer";
import PDFFieldInspector from './Componenets/PDFFieldInspector';
import "./ReportCardLovable.css";
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import DynamicReportCardForm from './Componenets/DynamicReportCardForm';

// Report card types configuration
const REPORT_CARD_TYPES = [
  {
    id: 'kindergarten-initial-observations',
    name: 'Kindergarten Communication of Learning - Initial Observations',
    pdfPath: '/src/assets/ReportCards/kg-cl-initial-Observations.pdf',
    description: 'Initial observations form for kindergarten students'
  },
  {
    id: 'elementary-provincial-report-card',
    name: 'Elementary Provincial Report Card (Grades 1-6)',
    pdfPath: '/src/assets/ReportCards/edu-elementary-provincial-report-card-public-schools-1-6.pdf',
    description: 'Official provincial report card for elementary students grades 1-6'
  }
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

const ReportCardLovable = () => {
  const [selectedReportCard, setSelectedReportCard] = useState('');
  const [formData, setFormData] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [fields, setFields] = useState([]);
  const [filledPdfBytes, setFilledPdfBytes] = useState(null);
  const [currentTab, setCurrentTab] = useState('form');
  const [showFieldInspector, setShowFieldInspector] = useState(false);

  // Get current report card configuration
  const getCurrentReportType = () => {
    return REPORT_CARD_TYPES.find(type => type.id === selectedReportCard);
  };

  // Handle form data changes with improved structure
  const handleFormDataChange = (newFormData) => {
    console.log('Form data changed:', newFormData);
    setFormData(newFormData);
  };

  // Handle report card type change
  const handleReportTypeChange = (e) => {
    setSelectedReportCard(e.target.value);
  };

  // Handle field inspection results
  const handleFieldsInspected = (fields) => {
    console.log('PDF fields inspected:', fields);
    setFields(fields);
  };

  // Download the filled PDF
  const downloadFilledPDF = async () => {
    setIsGenerating(true);
    
    try {
      if (!filledPdfBytes) {
        alert('No filled PDF available. Please make sure the preview is loaded and contains filled data.');
        return;
      }
      
      console.log('Downloading filled PDF directly from preview...');
      
      // Create download using the already-filled PDF bytes
      const blob = new Blob([filledPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${getCurrentReportType()?.name || 'report-card'}-filled.pdf`;
      link.click();
      
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading filled PDF:', error);
      alert('Error downloading PDF: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <CContainer fluid>
      <CRow>
        <CCol>
          <h2>Report Card Generator</h2>

          {/* Report Card Type Selector */}
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

          {/* Toggle Field Inspector */}
          {selectedReportCard && (
            <div className="mb-4">
              <CButton 
                variant="outline" 
                onClick={() => setShowFieldInspector(!showFieldInspector)}
                className="mb-3"
              >
                {showFieldInspector ? 'Hide' : 'Show'} PDF Field Inspector
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
                      onFilledPdfGenerated={setFilledPdfBytes}
                    />
                  </CCardBody>
                </CCard>
              </CCol>

              {/* Form Section */}
              <CCol lg={6} className="form-section">
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
              </CCol>
            </CRow>
          )}
        </CCol>
      </CRow>
    </CContainer>
  );
};

export default ReportCardLovable;
