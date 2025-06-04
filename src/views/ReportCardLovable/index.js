import { useState } from "react";
import { 
  CButton, 
  CCard, 
  CCardBody, 
  CCardHeader, 
  CContainer, 
  CRow, 
  CCol,
  CSpinner
} from "@coreui/react";
import { ReportCardForm } from "./Componenets/ReportCardForm";
import { ReportCardPreview } from "./Componenets/ReportCardPreview";
import "./ReportCardLovable.css";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  // Initial data state
  const [formData, setFormData] = useState({
    student_name: "",
    grade: "",
    teacher_name: "",
    school_year: "",
    
    // New fields
    date: "",
    oen: "",
    days_absent: "",
    total_days_absent: "",
    times_late: "",
    total_times_late: "",
    board: "",
    school: "",
    address_1: "",
    address_2: "",
    principal: "",
    telephone: "",
    
    // Skills ratings (default empty)
    responsibility: "",
    organization: "",
    independent_work: "",
    collaboration: "",
    initiative: "",
    self_regulation: "",
    
    // Comments
    strengths_next_steps: "",
    
    // Signatures
    teacher_signature: "",
    parent_signature: "",
    principal_signature: ""
  });

  const [currentTab, setCurrentTab] = useState("form");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Handle changes to the form data
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Generate and download PDF
  const generatePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      // Create a temporary container for the full-page preview
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '210mm'; // A4 width
      tempContainer.style.height = 'auto';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.padding = '20mm';
      tempContainer.style.fontFamily = 'Georgia, "Times New Roman", Times, serif';
      
      // Create the preview content
      tempContainer.innerHTML = `
        <div class="report-card-preview full-page" style="
          font-family: Georgia, 'Times New Roman', Times, serif;
          background: white;
          color: #000;
          line-height: 1.4;
          width: 100%;
          max-width: none;
          padding: 0;
        ">
          <div class="report-card-border" style="border: 2px solid #333; width: 100%;">
            <!-- Header -->
            <div class="report-card-ontario-header" style="
              padding: 1rem 1.5rem;
              border-bottom: 2px solid #333;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              flex-wrap: wrap;
            ">
              <div class="ontario-logo" style="display: flex; align-items: center; margin-bottom: 1rem;">
                <div class="ontario-title" style="font-weight: bold; font-size: 1.25rem;">Ontario</div>
                <div class="ministry-subtitle" style="margin-left: 1rem; font-size: 0.875rem;">Ministry of Education</div>
              </div>
              <div class="report-card-title" style="font-size: 1.25rem; font-weight: bold;">Elementary Provincial Report Card</div>
            </div>
            
            <!-- Student Information Grid -->
            <div class="student-info-grid" style="border-bottom: 2px solid #333;">
              <div style="display: flex; border-bottom: 1px solid #333;">
                <div style="flex: 5; padding: 0.75rem; border-right: 1px solid #333; font-weight: 600; font-size: 0.875rem;">Student: ${formData.student_name}</div>
                <div style="flex: 2; padding: 0.75rem; border-right: 1px solid #333; font-weight: 600; font-size: 0.875rem;">OEN: ${formData.oen}</div>
                <div style="flex: 2; padding: 0.75rem; border-right: 1px solid #333; font-weight: 600; font-size: 0.875rem;">Days Absent: ${formData.days_absent}</div>
                <div style="flex: 3; padding: 0.75rem; font-weight: 600; font-size: 0.875rem;">Total Days Absent: ${formData.total_days_absent}</div>
              </div>
              <div style="display: flex; border-bottom: 1px solid #333;">
                <div style="flex: 2; padding: 0.75rem; border-right: 1px solid #333; font-weight: 600; font-size: 0.875rem;">Grade: ${formData.grade}</div>
                <div style="flex: 3; padding: 0.75rem; border-right: 1px solid #333; font-weight: 600; font-size: 0.875rem;">Teacher: ${formData.teacher_name}</div>
                <div style="flex: 2; padding: 0.75rem; border-right: 1px solid #333; font-weight: 600; font-size: 0.875rem;">Times Late: ${formData.times_late}</div>
                <div style="flex: 5; padding: 0.75rem; font-weight: 600; font-size: 0.875rem;">Total Times Late: ${formData.total_times_late}</div>
              </div>
              <div style="display: flex; border-bottom: 1px solid #333;">
                <div style="flex: 5; padding: 0.75rem; border-right: 1px solid #333; font-weight: 600; font-size: 0.875rem;">Board: ${formData.board}</div>
                <div style="flex: 7; padding: 0.75rem; font-weight: 600; font-size: 0.875rem;">School: ${formData.school}</div>
              </div>
              <div style="display: flex; border-bottom: 1px solid #333;">
                <div style="flex: 5; padding: 0.75rem; border-right: 1px solid #333; font-weight: 600; font-size: 0.875rem;">Address: ${formData.address_1}</div>
                <div style="flex: 7; padding: 0.75rem; font-weight: 600; font-size: 0.875rem;">Address: ${formData.address_2}</div>
              </div>
              <div style="display: flex;">
                <div style="flex: 5; padding: 0.75rem; border-right: 1px solid #333; font-weight: 600; font-size: 0.875rem;">Date: ${formData.date}</div>
                <div style="flex: 3; padding: 0.75rem; border-right: 1px solid #333; font-weight: 600; font-size: 0.875rem;">Principal: ${formData.principal}</div>
                <div style="flex: 4; padding: 0.75rem; font-weight: 600; font-size: 0.875rem;">Telephone: ${formData.telephone}</div>
              </div>
            </div>
            
            <!-- Learning Skills Section -->
            <div style="padding: 1.5rem 2rem;">
              <h3 style="font-size: 1.125rem; font-weight: bold; margin-bottom: 1rem;">Learning Skills and Work Habits</h3>
              <div style="border: 1px solid #333; margin-bottom: 2rem; width: 100%;">
                <div style="background-color: #f8f9fa; border-bottom: 1px solid #333; font-size: 0.875rem; display: flex;">
                  <div style="flex: 3; padding: 0.75rem; font-weight: 600; border-right: 1px solid #333;">Skill</div>
                  <div style="flex: 9; padding: 0.75rem; font-weight: 600; text-align: center;">E – Excellent&nbsp;&nbsp;G – Good&nbsp;&nbsp;S – Satisfactory&nbsp;&nbsp;N – Needs Improvement</div>
                </div>
                
                ${[
                  { label: 'Responsibility', value: formData.responsibility, pair: { label: 'Organization', value: formData.organization } },
                  { label: 'Independent Work', value: formData.independent_work, pair: { label: 'Collaboration', value: formData.collaboration } },
                  { label: 'Initiative', value: formData.initiative, pair: { label: 'Self-Regulation', value: formData.self_regulation } }
                ].map(skill => `
                  <div style="font-size: 0.875rem; border-bottom: 1px solid #333; display: flex;">
                    <div style="flex: 3; padding: 0.75rem; font-weight: 600; background-color: #f8f9fa; border-right: 1px solid #333;">${skill.label}</div>
                    <div style="flex: 3; padding: 0.75rem; display: flex; justify-content: center; align-items: center; border-right: 1px solid #333;">
                      ${['E', 'G', 'S', 'N'].map(rating => `
                        <div style="margin: 0 3px; width: 26px; height: 26px; border-radius: 50%; border: 1px solid #6c757d; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; ${skill.value === rating ? 'background-color: #007bff; color: white; border-color: #007bff;' : ''}">${rating}</div>
                      `).join('')}
                    </div>
                    <div style="flex: 3; padding: 0.75rem; font-weight: 600; background-color: #f8f9fa; border-right: 1px solid #333;">${skill.pair.label}</div>
                    <div style="flex: 3; padding: 0.75rem; display: flex; justify-content: center; align-items: center;">
                      ${['E', 'G', 'S', 'N'].map(rating => `
                        <div style="margin: 0 3px; width: 26px; height: 26px; border-radius: 50%; border: 1px solid #6c757d; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; ${skill.pair.value === rating ? 'background-color: #007bff; color: white; border-color: #007bff;' : ''}">${rating}</div>
                      `).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
              
              <!-- Strengths and Next Steps -->
              <div style="margin-bottom: 2rem;">
                <h3 style="font-size: 1.125rem; font-weight: bold; margin-bottom: 1rem;">Strengths/Next Steps for Improvement</h3>
                <div style="border: 1px solid #333; padding: 1.5rem; background-color: #f8f9fa; min-height: 200px; white-space: pre-wrap; font-size: 0.875rem; width: 100%;">
                  ${formData.strengths_next_steps}
                </div>
              </div>
              
              <!-- Signatures -->
              <div style="border-top: 2px solid #333; padding-top: 1.5rem; margin-top: 2rem;">
                <h3 style="font-size: 1.125rem; font-weight: bold; margin-bottom: 1rem;">Signatures</h3>
                <div style="display: flex; margin-top: 1rem;">
                  ${formData.teacher_signature ? `
                    <div style="flex: 1; text-align: center; margin-right: 1rem;">
                      <p style="border-bottom: 1px solid #333; padding-bottom: 0.25rem; margin-bottom: 0.25rem;">${formData.teacher_signature}</p>
                      <p style="font-size: 0.875rem; margin-top: 0.25rem;">Teacher</p>
                    </div>
                  ` : ''}
                  
                  ${formData.parent_signature ? `
                    <div style="flex: 1; text-align: center; margin: 0 0.5rem;">
                      <p style="border-bottom: 1px solid #333; padding-bottom: 0.25rem; margin-bottom: 0.25rem;">${formData.parent_signature}</p>
                      <p style="font-size: 0.875rem; margin-top: 0.25rem;">Parent/Guardian</p>
                    </div>
                  ` : ''}
                  
                  ${formData.principal_signature ? `
                    <div style="flex: 1; text-align: center; margin-left: 1rem;">
                      <p style="border-bottom: 1px solid #333; padding-bottom: 0.25rem; margin-bottom: 0.25rem;">${formData.principal_signature}</p>
                      <p style="font-size: 0.875rem; margin-top: 0.25rem;">Principal</p>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 2px solid #333; padding: 0.75rem 1.5rem; color: #6c757d; font-size: 0.875rem; display: flex; justify-content: space-between; align-items: center;">
              <div>Report Card Genie</div>
              <div>Page 1 of 1</div>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(tempContainer);
      
      // Generate canvas from the element
      const canvas = await html2canvas(tempContainer, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794, // A4 width in pixels at 96 DPI
        height: 1123 // A4 height in pixels at 96 DPI
      });
      
      // Remove temporary container
      document.body.removeChild(tempContainer);
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions to fit A4
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Generate filename with student name and date
      const studentName = formData.student_name || 'Report_Card';
      const date = formData.date || new Date().toLocaleDateString();
      const filename = `${studentName.replace(/\s+/g, '_')}_Report_Card_${date.replace(/\//g, '-')}.pdf`;
      
      // Download the PDF
      pdf.save(filename);
      
      // Show success message
      alert(`PDF generated successfully! Downloaded as: ${filename}`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    generatePDF();
  };

  return (
    <div className="report-card-container">
      <CContainer fluid className="p-0">
        <CRow className="g-0">
          <CCol>
            <CCard className="report-card-main-card">
              <CCardHeader className="report-card-header">
                <h1>Report Card Genie</h1>
                <p>Create beautiful report cards with AI assistance</p>
              </CCardHeader>
              <CCardBody className="report-card-body">
                <div className="report-card-tabs">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <button 
                        className={`report-card-tab-button ${currentTab === "form" ? "active" : ""}`}
                        onClick={() => setCurrentTab("form")}
                      >
                        Form View
                      </button>
                      <button 
                        className={`report-card-tab-button ${currentTab === "preview" ? "active" : ""}`}
                        onClick={() => setCurrentTab("preview")}
                      >
                        Preview
                      </button>
                    </div>
                    
                    <CButton 
                      type="submit" 
                      form="report-card-form"
                      className="report-card-save-button"
                      disabled={isGeneratingPDF}
                      onClick={(e) => {
                        e.preventDefault();
                        generatePDF();
                      }}
                    >
                      {isGeneratingPDF ? (
                        <>
                          <CSpinner size="sm" className="me-2" />
                          Generating PDF...
                        </>
                      ) : (
                        'Save as PDF'
                      )}
                    </CButton>
                  </div>
                </div>
                
                {currentTab === "form" && (
                  <div className="report-card-content">
                    <CRow className="g-0">
                      <CCol md={6}>
                        <div className="report-card-preview-container">
                          <ReportCardPreview data={formData} />
                        </div>
                      </CCol>
                      <CCol md={6}>
                        <div className="report-card-form-container">
                          <ReportCardForm 
                            formData={formData} 
                            handleChange={handleChange}
                            handleSubmit={handleSubmit}
                          />
                        </div>
                      </CCol>
                    </CRow>
                  </div>
                )}
                
                {currentTab === "preview" && (
                  <div className="report-card-content">
                    <ReportCardPreview data={formData} fullPage={true} />
                  </div>
                )}
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  );
};

export default ReportCardLovable;
