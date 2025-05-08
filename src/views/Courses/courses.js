// CoursesPage.jsx (debug version)
import React from "react";
import coursesData from "../../Data/coursesData.json";
import { Link } from "react-router-dom";
import "./courses.css";
import { CButton, CButtonGroup, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react';

function CoursesPage() {
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

  const getColorFromId = (id) => {
    // Slightly different multiplier
    const hue = (id * 271.019) % 360
    return `hsl(${hue}, 70%, 45%)`
  }

  // Course icon types - for more visual differentiation
  const iconTypes = [
    { shape: "circle", size: "20px" },
    { shape: "square", size: "18px" },
    { shape: "triangle", size: "22px" }
  ];

  // Just to confirm what the data looks like
  console.log('coursesData in CoursesPage:', coursesData);

  return (
    <div className="courses-page-container">
      <div className="courses-header">
        <h1>Courses</h1>
        <div className="courses-actions">
          <CButtonGroup>
            <CButton 
              color="primary" 
              component={Link} 
              to="/courses/new"
            >
              Create Course
            </CButton>
            <CButton 
              color="success" 
              component={Link} 
              to="/courses/timetable"
            >
              View Timetable
            </CButton>
          </CButtonGroup>
        </div>
      </div>

      <CRow className="mb-4">
        <CCol>
          <CCard className="course-info-card">
            <CCardHeader>Course Management</CCardHeader>
            <CCardBody>
              <p>
                Manage your school courses, assignments, and class schedules. Add or edit courses,
                track assignments and deadlines, and view timetables for students and teachers.
              </p>
              <ul className="course-features">
                <li>Course creation and editing</li>
                <li>Assignment management with deadline tracking</li>
                <li>Timetable view with Google Calendar integration</li>
                <li>Hijri calendar support for Islamic school scheduling</li>
              </ul>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <div className="courses-grid">
        {coursesData.map((course, index) => {
          console.log(`Rendering course with id=${course.id}`);
          
          // Determine icon style based on course category or index
          const iconStyle = index % iconTypes.length;
          const iconClasses = `course-tile-icon ${iconTypes[iconStyle].shape}`;

          // Default color if none provided
          const bgColor = course.color || getColorFromId(course.id);
          const textColor = getTextColor(bgColor);

          const linkUrl = `/courses/${course.id}`;
          console.log('Link URL:', linkUrl);

          return (
            <Link
              key={course.id}
              to={linkUrl}
              style={{ textDecoration: "none" }}
              onClick={() => console.log(`Clicked course ID: ${course.id}`)}
            >
              <div
                className="course-tile"
                style={{
                  backgroundColor: bgColor,
                  color: textColor,
                }}
              >
                <div className="course-tile-body">
                  <h2 className="course-tile-title">{course.title}</h2>
                  <p className="course-tile-description">{course.description}</p>
                  
                  {/* Course Schedule Information */}
                  <div className="course-schedule-info">
                    <div className="course-schedule-days">
                      {course.schedule.classDays.join(', ')}
                    </div>
                    <div className="course-schedule-time">
                      {course.schedule.startTime} - {course.schedule.endTime}
                    </div>
                  </div>
                  
                  {/* Assignment Count Badge */}
                  {course.assignments && course.assignments.length > 0 && (
                    <div className="assignment-badge">
                      {course.assignments.length} {course.assignments.length === 1 ? 'Assignment' : 'Assignments'}
                    </div>
                  )}
                </div>
                <div className="course-tile-footer">
                  {/* Generate course-specific icons */}
                  {[...Array(3)].map((_, i) => (
                    <span
                      key={i}
                      className={iconClasses}
                      style={{
                        backgroundColor: `rgba(${
                          textColor === "#fff" ? "255,255,255" : "0,0,0"
                        }, ${0.2 + i * 0.2})`,
                        width: iconTypes[iconStyle].size,
                        height: iconTypes[iconStyle].size,
                      }}
                    />
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default CoursesPage;
