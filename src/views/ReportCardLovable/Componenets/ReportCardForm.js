import { useState } from "react";
import PropTypes from "prop-types";
import { 
  CForm, 
  CFormLabel, 
  CFormInput, 
  CFormTextarea,
  CFormSelect,
  CCard, 
  CCardBody,
  CCardHeader,
  CCardTitle,
  CButton,
  CCol,
  CRow,
  CAccordion,
  CAccordionItem,
  CAccordionHeader,
  CAccordionBody
} from "@coreui/react";
import CIcon from '@coreui/icons-react';
import { cilStar } from '@coreui/icons';

/**
 * AIInputField component for text fields with AI generation capability
 */
const AIInputField = ({ label, value, onChange, onGenerate, isGenerating, placeholder }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="ai-input-field">
      <CFormLabel>{label}</CFormLabel>
      <div className="ai-input-container">
        <CFormTextarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`ai-input-textarea ${isGenerating ? "generating" : ""}`}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <CButton
          type="button"
          className="ai-generate-button"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          <CIcon icon={cilStar} />
          <span className="visually-hidden">Generate with AI</span>
        </CButton>
      </div>
      {isGenerating && (
        <p className="ai-generating-text">
          Generating content...
        </p>
      )}
    </div>
  );
};

AIInputField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onGenerate: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool,
  placeholder: PropTypes.string
};

AIInputField.defaultProps = {
  isGenerating: false,
  placeholder: ""
};

/**
 * ReportCardForm component for editing report card data
 */
export function ReportCardForm({ formData, handleChange, handleSubmit }) {
  const [isGenerating, setIsGenerating] = useState({});

  // Rating options for learning skills
  const ratingOptions = [
    { value: "E", label: "E - Excellent" },
    { value: "G", label: "G - Good" },
    { value: "S", label: "S - Satisfactory" },
    { value: "N", label: "N - Needs Improvement" },
  ];

  // This would be replaced with an actual AI generation function
  const handleAIGenerate = (field, context) => {
    setIsGenerating(prev => ({ ...prev, [field]: true }));
    
    // Mock AI generation with a timeout
    setTimeout(() => {
      let generatedText = "";
      
      switch(field) {
        case "strengths_next_steps":
          generatedText = "Emily demonstrates strong critical thinking skills in math and science. She excels at problem-solving and applying concepts to new situations. Next steps include improving organization of written work and participating more actively in class discussions. Emily should focus on completing homework assignments on time and double-checking her work for accuracy.";
          break;
        default:
          generatedText = "Generated content for " + field;
      }
      
      handleChange(field, generatedText);
      setIsGenerating(prev => ({ ...prev, [field]: false }));
      
      // Toast notification would go here
      alert("Successfully generated content for " + field.replace(/_/g, ' '));
    }, 1500);
  };

  return (
    <CForm id="report-card-form" onSubmit={handleSubmit} className="report-card-form">
      <CAccordion alwaysOpen activeItemKey={["1", "2", "3"]} className="report-card-accordion">
        <CAccordionItem itemKey="1">
          <CAccordionHeader className="report-card-accordion-header">Student Information</CAccordionHeader>
          <CAccordionBody className="report-card-accordion-body">
            <CCard className="report-card-form-card">
              <CCardBody>
                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel htmlFor="student_name">Student Name</CFormLabel>
                    <CFormInput
                      id="student_name"
                      value={formData.student_name}
                      onChange={(e) => handleChange('student_name', e.target.value)}
                      placeholder="Enter student name"
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="oen">OEN</CFormLabel>
                    <CFormInput
                      id="oen"
                      value={formData.oen}
                      onChange={(e) => handleChange('oen', e.target.value)}
                      placeholder="Ontario Education Number"
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={4}>
                    <CFormLabel htmlFor="grade">Grade</CFormLabel>
                    <CFormInput
                      id="grade"
                      value={formData.grade}
                      onChange={(e) => handleChange('grade', e.target.value)}
                      placeholder="Enter grade"
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="teacher_name">Teacher</CFormLabel>
                    <CFormInput
                      id="teacher_name"
                      value={formData.teacher_name}
                      onChange={(e) => handleChange('teacher_name', e.target.value)}
                      placeholder="Enter teacher name"
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="date">Date</CFormLabel>
                    <CFormInput
                      id="date"
                      value={formData.date}
                      onChange={(e) => handleChange('date', e.target.value)}
                      placeholder="MM/DD/YYYY"
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel htmlFor="days_absent">Days Absent</CFormLabel>
                    <CFormInput
                      id="days_absent"
                      value={formData.days_absent}
                      onChange={(e) => handleChange('days_absent', e.target.value)}
                      placeholder="0"
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="total_days_absent">Total Days Absent</CFormLabel>
                    <CFormInput
                      id="total_days_absent"
                      value={formData.total_days_absent}
                      onChange={(e) => handleChange('total_days_absent', e.target.value)}
                      placeholder="0"
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel htmlFor="times_late">Times Late</CFormLabel>
                    <CFormInput
                      id="times_late"
                      value={formData.times_late}
                      onChange={(e) => handleChange('times_late', e.target.value)}
                      placeholder="0"
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="total_times_late">Total Times Late</CFormLabel>
                    <CFormInput
                      id="total_times_late"
                      value={formData.total_times_late}
                      onChange={(e) => handleChange('total_times_late', e.target.value)}
                      placeholder="0"
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel htmlFor="board">Board</CFormLabel>
                    <CFormInput
                      id="board"
                      value={formData.board}
                      onChange={(e) => handleChange('board', e.target.value)}
                      placeholder="School Board"
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="school">School</CFormLabel>
                    <CFormInput
                      id="school"
                      value={formData.school}
                      onChange={(e) => handleChange('school', e.target.value)}
                      placeholder="School Name"
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel htmlFor="address_1">Address 1</CFormLabel>
                    <CFormInput
                      id="address_1"
                      value={formData.address_1}
                      onChange={(e) => handleChange('address_1', e.target.value)}
                      placeholder="School/Student Address"
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="address_2">Address 2</CFormLabel>
                    <CFormInput
                      id="address_2"
                      value={formData.address_2}
                      onChange={(e) => handleChange('address_2', e.target.value)}
                      placeholder="Additional Address"
                    />
                  </CCol>
                </CRow>

                <CRow>
                  <CCol md={6}>
                    <CFormLabel htmlFor="principal">Principal</CFormLabel>
                    <CFormInput
                      id="principal"
                      value={formData.principal}
                      onChange={(e) => handleChange('principal', e.target.value)}
                      placeholder="Principal Name"
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="telephone">Telephone</CFormLabel>
                    <CFormInput
                      id="telephone"
                      value={formData.telephone}
                      onChange={(e) => handleChange('telephone', e.target.value)}
                      placeholder="Phone Number"
                    />
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          </CAccordionBody>
        </CAccordionItem>

        <CAccordionItem itemKey="2">
          <CAccordionHeader className="report-card-accordion-header">Learning Skills and Work Habits</CAccordionHeader>
          <CAccordionBody className="report-card-accordion-body">
            <CCard className="report-card-form-card">
              <CCardBody>
                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel>Responsibility</CFormLabel>
                    <CFormSelect 
                      value={formData.responsibility} 
                      onChange={(e) => handleChange('responsibility', e.target.value)}
                    >
                      <option value="">Select rating</option>
                      {ratingOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  
                  <CCol md={6}>
                    <CFormLabel>Organization</CFormLabel>
                    <CFormSelect 
                      value={formData.organization} 
                      onChange={(e) => handleChange('organization', e.target.value)}
                    >
                      <option value="">Select rating</option>
                      {ratingOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                </CRow>
                
                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel>Independent Work</CFormLabel>
                    <CFormSelect 
                      value={formData.independent_work} 
                      onChange={(e) => handleChange('independent_work', e.target.value)}
                    >
                      <option value="">Select rating</option>
                      {ratingOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  
                  <CCol md={6}>
                    <CFormLabel>Collaboration</CFormLabel>
                    <CFormSelect 
                      value={formData.collaboration} 
                      onChange={(e) => handleChange('collaboration', e.target.value)}
                    >
                      <option value="">Select rating</option>
                      {ratingOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                </CRow>
                
                <CRow>
                  <CCol md={6}>
                    <CFormLabel>Initiative</CFormLabel>
                    <CFormSelect 
                      value={formData.initiative} 
                      onChange={(e) => handleChange('initiative', e.target.value)}
                    >
                      <option value="">Select rating</option>
                      {ratingOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  
                  <CCol md={6}>
                    <CFormLabel>Self-Regulation</CFormLabel>
                    <CFormSelect 
                      value={formData.self_regulation} 
                      onChange={(e) => handleChange('self_regulation', e.target.value)}
                    >
                      <option value="">Select rating</option>
                      {ratingOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          </CAccordionBody>
        </CAccordionItem>

        <CAccordionItem itemKey="3">
          <CAccordionHeader className="report-card-accordion-header">Strengths/Next Steps for Improvement</CAccordionHeader>
          <CAccordionBody className="report-card-accordion-body">
            <CCard className="report-card-form-card">
              <CCardBody>
                <AIInputField
                  label="Strengths and Next Steps for Improvement"
                  value={formData.strengths_next_steps}
                  onChange={(value) => handleChange('strengths_next_steps', value)}
                  onGenerate={() => handleAIGenerate('strengths_next_steps')}
                  isGenerating={isGenerating.strengths_next_steps}
                  placeholder="Describe student strengths and areas for improvement..."
                />
              </CCardBody>
            </CCard>
          </CAccordionBody>
        </CAccordionItem>

        <CAccordionItem itemKey="4">
          <CAccordionHeader className="report-card-accordion-header">Signatures</CAccordionHeader>
          <CAccordionBody className="report-card-accordion-body">
            <CCard className="report-card-form-card">
              <CCardBody>
                <CRow>
                  <CCol md={4}>
                    <CFormLabel htmlFor="teacher_signature">Teacher's Signature</CFormLabel>
                    <CFormInput
                      id="teacher_signature"
                      value={formData.teacher_signature}
                      onChange={(e) => handleChange('teacher_signature', e.target.value)}
                      placeholder="Teacher's signature"
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="parent_signature">Parent/Guardian's Signature</CFormLabel>
                    <CFormInput
                      id="parent_signature"
                      value={formData.parent_signature}
                      onChange={(e) => handleChange('parent_signature', e.target.value)}
                      placeholder="Parent/Guardian's signature"
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="principal_signature">Principal's Signature</CFormLabel>
                    <CFormInput
                      id="principal_signature"
                      value={formData.principal_signature}
                      onChange={(e) => handleChange('principal_signature', e.target.value)}
                      placeholder="Principal's signature"
                    />
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          </CAccordionBody>
        </CAccordionItem>
      </CAccordion>
    </CForm>
  );
}

ReportCardForm.propTypes = {
  formData: PropTypes.object.isRequired,
  handleChange: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired
};
