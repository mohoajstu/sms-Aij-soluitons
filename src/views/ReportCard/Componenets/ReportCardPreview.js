import React from "react";
import PropTypes from "prop-types";
import { CCard, CCardBody } from "@coreui/react";

/**
 * ReportCardPreview component - displays a formatted report card
 */
export function ReportCardPreview({ data, fullPage }) {
  // Function to render the rating bubble for learning skills
  const renderRating = (value) => {
    return (
      <div className="rating-container">
        {["E", "G", "S", "N"].map((rating) => (
          <div
            key={rating}
            className={`rating-circle ${value === rating ? "selected" : ""}`}
          >
            {rating}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`report-card-preview ${fullPage ? "full-page" : ""}`}>
      <div className="report-card-border">
        {/* Header */}
        <div className="report-card-ontario-header">
          <div className="ontario-logo">
            <div className="ontario-title">Ontario</div>
            <div className="ministry-subtitle">Ministry of Education</div>
          </div>
          <div className="report-card-title">Elementary Provincial Report Card</div>
        </div>
        
        {/* Student Information Grid */}
        <div className="student-info-grid">
          {/* First row */}
          <div className="row g-0 student-info-row">
            <div className="col-md-5 student-info-cell">
              <div>Student: {data.student_name}</div>
            </div>
            <div className="col-md-2 student-info-cell">
              <div>OEN: {data.oen}</div>
            </div>
            <div className="col-md-2 student-info-cell">
              <div>Days Absent: {data.days_absent}</div>
            </div>
            <div className="col-md-3 student-info-cell">
              <div>Total Days Absent: {data.total_days_absent}</div>
            </div>
          </div>
          
          {/* Second row */}
          <div className="row g-0 student-info-row">
            <div className="col-md-2 student-info-cell">
              <div>Grade: {data.grade}</div>
            </div>
            <div className="col-md-3 student-info-cell">
              <div>Teacher: {data.teacher_name}</div>
            </div>
            <div className="col-md-2 student-info-cell">
              <div>Times Late: {data.times_late}</div>
            </div>
            <div className="col-md-5 student-info-cell">
              <div>Total Times Late: {data.total_times_late}</div>
            </div>
          </div>
          
          {/* Third row */}
          <div className="row g-0 student-info-row">
            <div className="col-md-5 student-info-cell">
              <div>Board: {data.board}</div>
            </div>
            <div className="col-md-7 student-info-cell">
              <div>School: {data.school}</div>
            </div>
          </div>
          
          {/* Fourth row */}
          <div className="row g-0 student-info-row">
            <div className="col-md-5 student-info-cell">
              <div>Address: {data.address_1}</div>
            </div>
            <div className="col-md-7 student-info-cell">
              <div>Address: {data.address_2}</div>
            </div>
          </div>
          
          {/* Fifth row */}
          <div className="row g-0 student-info-row">
            <div className="col-md-5 student-info-cell">
              <div>Date: {data.date}</div>
            </div>
            <div className="col-md-3 student-info-cell">
              <div>Principal: {data.principal}</div>
            </div>
            <div className="col-md-4 student-info-cell">
              <div>Telephone: {data.telephone}</div>
            </div>
          </div>
        </div>
        
        {/* Learning Skills Section */}
        <div className="learning-skills-section">
          <h3 className="learning-skills-title">Learning Skills and Work Habits</h3>
          <div className="skills-table">
            <div className="row g-0 skills-header">
              <div className="col-md-3 skills-header-cell">Skill</div>
              <div className="col-md-9 skills-header-cell skills-header-ratings">
                E – Excellent&nbsp;&nbsp;G – Good&nbsp;&nbsp;S – Satisfactory&nbsp;&nbsp;N – Needs Improvement
              </div>
            </div>
            
            <div className="row g-0 skills-row">
              <div className="col-md-3 skills-cell skills-label">Responsibility</div>
              <div className="col-md-3 skills-cell skills-rating">
                {renderRating(data.responsibility)}
              </div>
              <div className="col-md-3 skills-cell skills-label">Organization</div>
              <div className="col-md-3 skills-cell skills-rating">
                {renderRating(data.organization)}
              </div>
            </div>
            
            <div className="row g-0 skills-row">
              <div className="col-md-3 skills-cell skills-label">Independent Work</div>
              <div className="col-md-3 skills-cell skills-rating">
                {renderRating(data.independent_work)}
              </div>
              <div className="col-md-3 skills-cell skills-label">Collaboration</div>
              <div className="col-md-3 skills-cell skills-rating">
                {renderRating(data.collaboration)}
              </div>
            </div>
            
            <div className="row g-0 skills-row">
              <div className="col-md-3 skills-cell skills-label">Initiative</div>
              <div className="col-md-3 skills-cell skills-rating">
                {renderRating(data.initiative)}
              </div>
              <div className="col-md-3 skills-cell skills-label">Self-Regulation</div>
              <div className="col-md-3 skills-cell skills-rating">
                {renderRating(data.self_regulation)}
              </div>
            </div>
          </div>
          
          {/* Strengths and Next Steps */}
          <div className="strengths-section">
            <h3 className="strengths-title">Strengths/Next Steps for Improvement</h3>
            <div className="strengths-content">
              {data.strengths_next_steps}
            </div>
          </div>
          
          {/* Signatures */}
          <div className="signatures-section">
            <h3 className="signatures-title">Signatures</h3>
            <div className="row mt-3">
              {data.teacher_signature && (
                <div className="col-md-4 signature-container">
                  <p className="signature-line">{data.teacher_signature}</p>
                  <p className="signature-label">Teacher</p>
                </div>
              )}
              
              {data.parent_signature && (
                <div className="col-md-4 signature-container">
                  <p className="signature-line">{data.parent_signature}</p>
                  <p className="signature-label">Parent/Guardian</p>
                </div>
              )}
              
              {data.principal_signature && (
                <div className="col-md-4 signature-container">
                  <p className="signature-line">{data.principal_signature}</p>
                  <p className="signature-label">Principal</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="report-card-footer">
          <div>Report Card Genie</div>
          <div>Page 1 of 1</div>
        </div>
      </div>
    </div>
  );
}

ReportCardPreview.propTypes = {
  data: PropTypes.object.isRequired,
  fullPage: PropTypes.bool
};

ReportCardPreview.defaultProps = {
  fullPage: false
};
