// CourseDetailPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import coursesData from "../../Data/coursesData.json";
import "./courseDetails.css";
import { CButton, CCard, CCardBody, CRow, CCol } from '@coreui/react';
import { initializeGoogleApi, initializeGIS, authenticate, createEvent, assignmentToEvent, isAuthenticated } from "../../services/calendarService";

function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const courseId = Number(id);

  // find the course in your JSON
  const course = coursesData.find((c) => c.id === courseId);
  
  // State for assignments
  const [assignments, setAssignments] = useState([]);
  
  // Function to get contrasting text color based on background
  const getTextColor = (bgColor) => {
    // Convert hex to RGB
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // Return black for light backgrounds, white for dark
    return brightness > 125 ? '#333' : '#fff';
  };
  
  // Create a lighter version of the course color for section headers
  const getLighterColor = (hexColor) => {
    // Default color if none provided
    if (!hexColor) return '#f8f9fa';
    
    // Convert hex to RGB
    const hex = hexColor.replace('#', '');
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);
    
    // Make it lighter (mix with white)
    r = Math.floor(r + (255 - r) * 0.85);
    g = Math.floor(g + (255 - g) * 0.85);
    b = Math.floor(b + (255 - b) * 0.85);
    
    return `rgb(${r}, ${g}, ${b})`;
  };
  
  // Load assignments from course data
  useEffect(() => {
    if (course && course.assignments) {
      setAssignments(course.assignments);
    }
  }, [courseId, course]);

  if (!course) {
    return <div className="course-not-found">Course not found</div>;
  }

  const getColorFromId = (id) => {
    // Slightly different multiplier
    const hue = (id * 271.019) % 360
    return `hsl(${hue}, 70%, 45%)`
  }
  
  // Get course color or use default
  const courseColor = course.color || getColorFromId(courseId);
  const textColor = getTextColor(courseColor);
  const lightColor = getLighterColor(courseColor);

  return (
    <div className="course-detail-container">
      {/* Course Header with course color */}
      <div 
        className="course-header" 
        style={{ backgroundColor: courseColor, color: textColor }}
      >
        <h1>{course.title}</h1>
        <p>{course.description}</p>
      </div>

      {/* Navigation Cards */}
      <div className="section-navigation mt-4">
        <CRow className="g-4">
          <CCol md={3}>
            <CCard className="h-100 navigation-card">
              <CCardBody className="d-flex flex-column">
                <h4>Assignments</h4>
                <p className="flex-grow-1">Manage and view course assignments, deadlines, and files.</p>
                <div>
                  <CButton 
                    color="primary" 
                    onClick={() => navigate(`/courses/${id}/assignments`)}
                    className="w-100"
                  >
                    View Assignments
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          </CCol>

          <CCol md={3}>
            <CCard className="h-100 navigation-card">
              <CCardBody className="d-flex flex-column">
                <h4>Schedule</h4>
                <p className="flex-grow-1">View course schedule, meeting times, and calendar integration.</p>
                <div>
                  <CButton 
                    color="primary" 
                    onClick={() => navigate(`/courses/${id}/schedule`)}
                    className="w-100"
                  >
                    View Schedule
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          </CCol>

          <CCol md={3}>
            <CCard className="h-100 navigation-card">
              <CCardBody className="d-flex flex-column">
                <h4>Budget</h4>
                <p className="flex-grow-1">Track and manage course budget, expenses, and financial records.</p>
                <div>
                  <CButton 
                    color="primary" 
                    onClick={() => navigate(`/courses/${id}/budget`)}
                    className="w-100"
                  >
                    View Budget
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          </CCol>

          <CCol md={3}>
            <CCard className="h-100 navigation-card">
              <CCardBody className="d-flex flex-column">
                <h4>Timetable</h4>
                <p className="flex-grow-1">View the complete class timetable with all course sessions.</p>
                <div>
                  <CButton 
                    color="primary" 
                    onClick={() => navigate(`/courses/${id}/timetable`)}
                    className="w-100"
                  >
                    View Timetable
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </div>

      {/* Course Overview */}
      <CCard className="mt-4">
        <CCardBody>
          <h3 style={{ borderBottom: `2px solid ${courseColor}` }}>Course Overview</h3>
          <CRow className="mt-4">
            <CCol md={6}>
              <div className="section">
                <h4>Staff</h4>
                <div className="table-container">
                  <table className="members-table">
                    <thead>
                      <tr>
                        <th style={{ backgroundColor: lightColor }}>ID</th>
                        <th style={{ backgroundColor: lightColor }}>Name</th>
                        <th style={{ backgroundColor: lightColor }}>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {course.staff.map((person, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{person}</td>
                          <td>Instructor</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CCol>

            <CCol md={6}>
              <div className="section">
                <h4>Students</h4>
                <div className="table-container">
                  <table className="members-table">
                    <thead>
                      <tr>
                        <th style={{ backgroundColor: lightColor }}>ID</th>
                        <th style={{ backgroundColor: lightColor }}>Name</th>
                        <th style={{ backgroundColor: lightColor }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {course.students.map((student, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{student}</td>
                          <td>Enrolled</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CCol>
          </CRow>

          <CRow className="mt-4">
            <CCol>
              <div className="course-stats-card">
                <h4>Course Statistics</h4>
                <div className="stats-content">
                  <div className="stat-item">
                    <div className="stat-label">Enrollment</div>
                    <div className="stat-value">{course.students.length} students</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Staff</div>
                    <div className="stat-value">{course.staff.length} instructors</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Assignments</div>
                    <div className="stat-value">{assignments.length} total</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Schedule</div>
                    <div className="stat-value">
                      {course.schedule.classDays.join(', ')}
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Times</div>
                    <div className="stat-value">
                      {course.schedule.startTime} - {course.schedule.endTime}
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Location</div>
                    <div className="stat-value">{course.schedule.room}</div>
                  </div>
                </div>
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>
    </div>
  );
}

export default CourseDetailPage;