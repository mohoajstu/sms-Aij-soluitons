import { useState } from "react";
import PropTypes from "prop-types";
import {
  CButton,
  CFormTextarea,
  CFormLabel,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CAlert,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilStar } from "@coreui/icons";
import {
  buildReportPayload,
  generateReportCardJSON,
  mapJsonToFormFields,
} from "../services/reportCardAI";

// A serverless drop-in replacement for AIInputField with modal prompt + OpenAI direct call
export default function AIReportCommentInput({
  label,
  formData,
  handleChange,
  onJson,
  explicitReportType,  // optional: override report type
  subjectField,        // optional: where subject lives in your form
  buttonText,
  className = ""
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const studentName = formData.student_name || formData.student || "";
  const grade = formData.grade || "";
  const subject = subjectField ? formData[subjectField] : formData.subject || "";

  // For kindergarten reports, grade is not required - only check explicitReportType
  const isKindergartenReport = explicitReportType?.toLowerCase().includes('kindergarten');
  
  // Check if required fields are filled
  // More lenient: accept any non-empty student name
  const hasStudentName = studentName && studentName.trim() !== "" && studentName.trim() !== "the student";
  const hasGrade = grade && grade.trim() !== "";
  // For non-kindergarten reports, we need both student name and grade
  // For kindergarten, only student name is required
  const isFormReady = hasStudentName && (hasGrade || isKindergartenReport);
  
  // Build validation message
  const getValidationMessage = () => {
    const missingFields = [];
    if (!hasStudentName) {
      missingFields.push("student name");
    }
    if (!isKindergartenReport && !hasGrade) {
      missingFields.push("grade");
    }
    
    if (missingFields.length === 0) {
      return "Click to generate AI comments";
    }
    
    return `Please fill in: ${missingFields.join(" and ")} before generating AI comments`;
  };
  
  // Debug logging to help diagnose issues
  console.log('AI Button State:', {
    studentName,
    grade,
    hasStudentName,
    hasGrade,
    isKindergartenReport,
    isFormReady,
    formDataKeys: Object.keys(formData),
  });

  const placeholder = [
    "Briefly tell the AI what to emphasize. Examples:",
    `• ${studentName} shows strong participation in ${subject || "class discussions"}`,
    "• Focus on growth mindset and effort",
    "• Needs support with organization and time management", 
    "• Include specific examples of recent achievements",
    "• Use encouraging, parent-friendly tone",
    "",
    "Leave blank for general comments based on existing form data."
  ].join("\n");

  const handleGenerate = async () => {
    try {
      setIsLoading(true);
      setError("");

      // Build the payload from current form data
      const basePayload = buildReportPayload(formData, { explicitReportType, subjectField });

      // Add the teacher's custom prompt
      const payload = {
        ...basePayload,
        teacherPrompt: prompt.trim(),
      };

      // Call OpenAI directly (serverless)
      const aiJson = await generateReportCardJSON(payload, { retry: 1 });

      // Map the JSON response back to form fields
      mapJsonToFormFields(aiJson, handleChange);

      // Bubble raw JSON to parent (for preview/PDF if needed)
      if (typeof onJson === "function") {
        onJson(aiJson);
      }

      // Close modal on success
      setOpen(false);
      setPrompt(""); // Clear prompt for next use
      
    } catch (err) {
      console.error("AI generation error:", err);
      setError(err.message || "Failed to generate comments. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setOpen(false);
      setError("");
    }
  };

  return (
    <div className={`ai-input-field ${className}`}>
      {label && (
        <CFormLabel className="d-flex align-items-center justify-content-between">
          <span>{label}</span>
          <small className="text-muted">
            {isFormReady ? 
              "Ready to generate" : 
              isKindergartenReport ? 
                "Fill student name first" : 
                "Fill student name and grade first"
            }
          </small>
        </CFormLabel>
      )}
      
      <div 
        className="ai-input-container mb-3" 
        style={{ 
          position: 'relative', 
          zIndex: 1000,
          pointerEvents: 'auto',
        }}
      >
        <CButton
          type="button"
          color="primary"
          variant="outline"
          className="d-flex align-items-center"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('AI Button clicked, isFormReady:', isFormReady);
            if (isFormReady) {
              setOpen(true);
            } else {
              // Show alert if form is not ready
              alert(getValidationMessage());
            }
          }}
          disabled={isLoading}
          title={getValidationMessage()}
          style={{
            cursor: isLoading ? 'wait' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            pointerEvents: isLoading ? 'none' : 'auto',
            position: 'relative',
            zIndex: 1001,
            minWidth: 'auto',
            minHeight: 'auto',
          }}
        >
          <CIcon icon={cilStar} className={buttonText && buttonText.trim() ? "me-2" : ""} />
          {buttonText && buttonText.trim() ? (
            <span>{buttonText}</span>
          ) : (
            !className?.includes('ai-button-minimal') && <span>Generate with AI</span>
          )}
        </CButton>
      </div>

      <CModal 
        visible={open} 
        onClose={handleClose} 
        alignment="center"
        size="lg"
        backdrop="static"
      >
        <CModalHeader>
          <CModalTitle>AI Comment Generator</CModalTitle>
        </CModalHeader>
        
        <CModalBody>
          {error && (
            <CAlert color="danger" className="mb-3">
              {error}
            </CAlert>
          )}
          
          <div className="mb-3">
            <strong>Generating comments for:</strong>
            <ul className="mt-2 mb-0">
              <li>Student: {studentName}</li>
              <li>Grade: {grade}</li>
              {subject && <li>Subject: {subject}</li>}
            </ul>
          </div>

          <CFormLabel htmlFor="ai-prompt">
            What should the AI focus on? <small className="text-muted">(Optional)</small>
          </CFormLabel>
          <CFormTextarea
            id="ai-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            rows={6}
            disabled={isLoading}
            className="mb-2"
          />
          
          <small className="text-muted d-block">
            <strong>Tip:</strong> Mention specific strengths, areas for growth, recent achievements, 
            or any tone preferences. The AI will generate professional comments that you can edit further.
          </small>
        </CModalBody>
        
        <CModalFooter className="d-flex justify-content-between">
          <small className="text-muted">
            {isLoading ? "This may take 10-30 seconds..." : "Comments will be added to your form fields"}
          </small>
          
          <div>
            <CButton 
              color="secondary" 
              variant="ghost"
              disabled={isLoading} 
              onClick={handleClose}
              className="me-2"
            >
              Cancel
            </CButton>
            <CButton 
              color="primary" 
              disabled={isLoading || !isFormReady}
              onClick={handleGenerate}
              title={!isFormReady ? getValidationMessage() : "Generate AI comments"}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Generating...
                </>
              ) : (
                "Generate Comments"
              )}
            </CButton>
          </div>
        </CModalFooter>
      </CModal>
    </div>
  );
}

AIReportCommentInput.propTypes = {
  label: PropTypes.string.isRequired,
  formData: PropTypes.object.isRequired,
  handleChange: PropTypes.func.isRequired, // Your existing handleChange(field, value)
  onJson: PropTypes.func,                  // (optional) receive the raw JSON
  explicitReportType: PropTypes.string,    // (optional) override report type
  subjectField: PropTypes.string,          // (optional) where subject is stored in formData
  buttonText: PropTypes.string,
  className: PropTypes.string,
}; 