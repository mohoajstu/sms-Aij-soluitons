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

// Report card types configuration
const REPORT_CARD_TYPES = [
  {
    id: 'kindergarten-report',
    name: 'Kindergarten Report Card',
    pdfPath: '/assets/ReportCards/kg-report.pdf',
    category: 'kindergarten'
  },
  {
    id: 'kindergarten-progress',
    name: 'Kindergarten Progress Report',
    pdfPath: '/assets/ReportCards/kg-report.pdf',
    category: 'kindergarten'
  },
  {
    id: 'elementary-report',
    name: 'Elementary Report Card (Grades 1-6)',
    pdfPath: '/assets/ReportCards/elementary-report-card.pdf',
    category: 'elementary'
  },
  {
    id: 'elementary-progress',
    name: 'Elementary Progress Report (Grades 1-6)',
    pdfPath: '/assets/ReportCards/elementary-report-card.pdf',
    category: 'elementary'
  },
  {
    id: 'middle-report',
    name: 'Middle School Report Card (Grades 7-8)',
    pdfPath: '/assets/ReportCards/elementary-report-card.pdf',
    category: 'middle'
  },
  {
    id: 'middle-progress',
    name: 'Middle School Progress Report (Grades 7-8)',
    pdfPath: '/assets/ReportCards/elementary-report-card.pdf',
    category: 'middle'
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
  const [selectedReportType, setSelectedReportType] = useState('');
  const [formData, setFormData] = useState({
    // Student Information
    student_name: '',
    grade: '',
    term: '',
    oen: '',
    teacher_name: '',
    school_year: '',
    date: '',
    parent_name: '',
    
    // School Information
    board: '',
    school: '',
    address_1: '',
    address_2: '',
    principal: '',
    telephone: '',
    
    // Attendance
    days_absent: '',
    total_days_absent: '',
    times_late: '',
    total_times_late: '',
    
    // Learning Skills and Work Habits
    responsibility: '',
    organization: '',
    independent_work: '',
    collaboration: '',
    initiative: '',
    self_regulation: '',
    
    // Comments and Signatures
    strengths_next_steps: '',
    teacher_comments: '',
    teacher_signature: '',
    parent_signature: '',
    principal_signature: ''
  });
  const [currentTab, setCurrentTab] = useState('form');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFieldInspector, setShowFieldInspector] = useState(false);

  // Get current report card configuration
  const getCurrentReportType = () => {
    return REPORT_CARD_TYPES.find(type => type.id === selectedReportType);
  };

  // Handle changes to the form data
  const handleFormDataChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle report card type change
  const handleReportTypeChange = (e) => {
    setSelectedReportType(e.target.value);
  };

  // Fill PDF form programmatically
  const fillPDFForm = async () => {
    try {
      setIsGenerating(true);
      
      const currentReportCard = getCurrentReportType();
      if (!currentReportCard) {
        throw new Error('No report card type selected');
      }

      // Fetch the PDF file
      const response = await fetch(currentReportCard.pdfPath);
      if (!response.ok) {
        throw new Error('Failed to fetch PDF file');
      }
      
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Get the form from the PDF
      const form = pdfDoc.getForm();
      
      // Get all field names for debugging
      const fieldNames = form.getFields().map(field => field.getName());
      console.log('Available PDF form fields:', fieldNames);
      
      // Map form data to PDF fields
      const fieldMappings = {
        // Student Information - try multiple field name variations
        'Student': formData.student_name,
        'student_name': formData.student_name,
        'Student Name': formData.student_name,
        'STUDENT NAME': formData.student_name,
        'Name': formData.student_name,
        'name': formData.student_name,
        
        'OEN': formData.oen,
        'oen': formData.oen,
        'Ontario Education Number': formData.oen,
        
        'Grade': formData.grade,
        'grade': formData.grade,
        'GRADE': formData.grade,
        
        'Term': formData.term,
        'term': formData.term,
        'TERM': formData.term,
        'Reporting Period': formData.term,
        
        'Teacher': formData.teacher_name,
        'teacher': formData.teacher_name,
        'teacher_name': formData.teacher_name,
        'Teacher Name': formData.teacher_name,
        'TEACHER': formData.teacher_name,
        
        'School Year': formData.school_year,
        'school_year': formData.school_year,
        'SCHOOL YEAR': formData.school_year,
        'Year': formData.school_year,
        
        'Date': formData.date,
        'date': formData.date,
        'DATE': formData.date,
        'Report Date': formData.date,
        
        'Parent': formData.parent_name,
        'parent': formData.parent_name,
        'parent_name': formData.parent_name,
        'Parent Name': formData.parent_name,
        'Parent/Guardian': formData.parent_name,
        
        // School Information
        'Board': formData.board,
        'board': formData.board,
        'BOARD': formData.board,
        'School Board': formData.board,
        
        'School': formData.school,
        'school': formData.school,
        'SCHOOL': formData.school,
        'School Name': formData.school,
        
        'Address': formData.address_1,
        'address': formData.address_1,
        'address_1': formData.address_1,
        'Address 1': formData.address_1,
        'School Address': formData.address_1,
        
        'Address2': formData.address_2,
        'address_2': formData.address_2,
        'Address 2': formData.address_2,
        'City Province Postal': formData.address_2,
        
        'Principal': formData.principal,
        'principal': formData.principal,
        'PRINCIPAL': formData.principal,
        'Principal Name': formData.principal,
        
        'Telephone': formData.telephone,
        'telephone': formData.telephone,
        'TELEPHONE': formData.telephone,
        'Phone': formData.telephone,
        
        // Attendance
        'Days Absent': formData.days_absent,
        'days_absent': formData.days_absent,
        'DAYS ABSENT': formData.days_absent,
        'Absent': formData.days_absent,
        
        'Total Days Absent': formData.total_days_absent,
        'total_days_absent': formData.total_days_absent,
        'TOTAL DAYS ABSENT': formData.total_days_absent,
        'Total Absent': formData.total_days_absent,
        
        'Times Late': formData.times_late,
        'times_late': formData.times_late,
        'TIMES LATE': formData.times_late,
        'Late': formData.times_late,
        
        'Total Times Late': formData.total_times_late,
        'total_times_late': formData.total_times_late,
        'TOTAL TIMES LATE': formData.total_times_late,
        'Total Late': formData.total_times_late,
        
        // Learning Skills and Work Habits
        'Responsibility': formData.responsibility,
        'responsibility': formData.responsibility,
        'RESPONSIBILITY': formData.responsibility,
        
        'Organization': formData.organization,
        'organization': formData.organization,
        'ORGANIZATION': formData.organization,
        
        'Independent Work': formData.independent_work,
        'independent_work': formData.independent_work,
        'INDEPENDENT WORK': formData.independent_work,
        'Independent': formData.independent_work,
        
        'Collaboration': formData.collaboration,
        'collaboration': formData.collaboration,
        'COLLABORATION': formData.collaboration,
        
        'Initiative': formData.initiative,
        'initiative': formData.initiative,
        'INITIATIVE': formData.initiative,
        
        'Self-Regulation': formData.self_regulation,
        'self_regulation': formData.self_regulation,
        'SELF-REGULATION': formData.self_regulation,
        'Self Regulation': formData.self_regulation,
        
        // Comments and Signatures
        'Strengths and Next Steps': formData.strengths_next_steps,
        'strengths_next_steps': formData.strengths_next_steps,
        'STRENGTHS AND NEXT STEPS': formData.strengths_next_steps,
        'Strengths': formData.strengths_next_steps,
        'Next Steps': formData.strengths_next_steps,
        'Comments': formData.strengths_next_steps,
        
        'Teacher Comments': formData.teacher_comments,
        'teacher_comments': formData.teacher_comments,
        'TEACHER COMMENTS': formData.teacher_comments,
        'Additional Comments': formData.teacher_comments,
        
        'Teacher Signature': formData.teacher_signature,
        'teacher_signature': formData.teacher_signature,
        'TEACHER SIGNATURE': formData.teacher_signature,
        'Teacher Sig': formData.teacher_signature,
        
        'Parent Signature': formData.parent_signature,
        'parent_signature': formData.parent_signature,
        'PARENT SIGNATURE': formData.parent_signature,
        'Parent Sig': formData.parent_signature,
        
        'Principal Signature': formData.principal_signature,
        'principal_signature': formData.principal_signature,
        'PRINCIPAL SIGNATURE': formData.principal_signature,
        'Principal Sig': formData.principal_signature
      };
      
      // Fill the form fields
      let filledFieldsCount = 0;
      const totalFields = form.getFields().length;
      
      Object.entries(fieldMappings).forEach(([fieldName, value]) => {
        try {
          const field = form.getFieldMaybe(fieldName);
          if (field && value && value.toString().trim() !== '') {
            // Handle different field types
            const fieldType = field.constructor.name;
            console.log(`Attempting to fill field: ${fieldName} (${fieldType}) with value: ${value}`);
            
            switch (fieldType) {
              case 'PDFTextField':
                field.setText(value.toString());
                console.log(`✓ Filled text field: ${fieldName}`);
                filledFieldsCount++;
                break;
                
              case 'PDFCheckBox':
                // For checkboxes, check if the value indicates it should be checked
                const checkValue = value.toString().toLowerCase();
                if (['true', 'yes', '1', 'checked', 'x', 'e', 'g', 's', 'n'].includes(checkValue)) {
                  field.check();
                  console.log(`✓ Checked field: ${fieldName}`);
                  filledFieldsCount++;
                }
                break;
                
              case 'PDFDropdown':
                // For dropdowns, try to set the value if it's in the options
                const options = field.getOptions();
                if (options.includes(value.toString())) {
                  field.select(value.toString());
                  console.log(`✓ Selected dropdown: ${fieldName} = ${value}`);
                  filledFieldsCount++;
                } else {
                  console.warn(`Dropdown ${fieldName} doesn't have option: ${value}. Available: ${options.join(', ')}`);
                }
                break;
                
              case 'PDFRadioGroup':
                // For radio groups, try to select the option
                try {
                  field.select(value.toString());
                  console.log(`✓ Selected radio: ${fieldName} = ${value}`);
                  filledFieldsCount++;
                } catch (radioError) {
                  console.warn(`Could not select radio option ${value} for ${fieldName}:`, radioError.message);
                }
                break;
                
              default:
                // Try to set as text for unknown field types
                if (field.setText) {
                  field.setText(value.toString());
                  console.log(`✓ Filled unknown field type: ${fieldName} (${fieldType})`);
                  filledFieldsCount++;
                } else {
                  console.warn(`Unknown field type ${fieldType} for field ${fieldName}`);
                }
                break;
            }
          }
        } catch (error) {
          console.warn(`Could not set field '${fieldName}':`, error.message);
        }
      });
      
      console.log(`Successfully filled ${filledFieldsCount} out of ${totalFields} total PDF fields`);
      
      // Generate the filled PDF
      const filledPdfBytes = await pdfDoc.save();
      
      // Create a blob and download
      const blob = new Blob([filledPdfBytes], { type: 'application/pdf' });
      const fileName = `${formData.student_name || 'student'}_report_card.pdf`;
      saveAs(blob, fileName);
      
      // Show success message
      alert(`PDF generated successfully! Filled ${filledFieldsCount} out of ${totalFields} fields.`);
      
    } catch (error) {
      console.error('Error filling PDF:', error);
      alert('Error generating PDF: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    fillPDFForm();
  };

  // Handle field inspection results
  const handleFieldsInspected = (fields) => {
    console.log('PDF fields inspected:', fields);
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
                  value={selectedReportType}
                  onChange={handleReportTypeChange}
                  className="mb-3"
                >
                  <option value="">Choose a report card type...</option>
                  {REPORT_CARD_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.category})
                    </option>
                  ))}
                </CFormSelect>
              </div>
            </CCardBody>
          </CCard>

          {/* Toggle Field Inspector */}
          {selectedReportType && (
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
          {selectedReportType && (
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
                    />
                  </CCardBody>
                </CCard>
              </CCol>

              {/* Form Section */}
              <CCol lg={6} className="form-section">
                <CCard>
                  <CCardHeader>
                    <h5>Student Information</h5>
                    <small className="text-muted">Fill out the form to see live preview on the left</small>
                  </CCardHeader>
                  <CCardBody>
                    <ReportCardForm 
                      formData={formData}
                      handleChange={handleFormDataChange}
                      handleSubmit={handleSubmit}
                    />
                    
                    <div className="mt-4">
                      <CButton 
                        color="primary" 
                        onClick={fillPDFForm}
                        disabled={isGenerating}
                        className="me-2"
                      >
                        {isGenerating ? (
                          <>
                            <CSpinner size="sm" className="me-2" />
                            Generating PDF...
                          </>
                        ) : (
                          'Fill & Download PDF'
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
