import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CRow,
  CProgress,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilSettings,
  cilArrowRight,
  cilUser,
  cilCheckCircle,
  cilBook,
  cilFile,
  cilBullhorn,
  cilCalendar,
  cilPencil,
} from "@coreui/icons";

import './Dashboard.css'

const Dashboard = () => {
  const navigate = useNavigate();

  // Sample announcements data
  const announcements = [
    {
      id: 1,
      title: "Term 1 Report Cards due on Monday, January 27th",
      date: "January 20, 2025",
      priority: "high",
    },
    {
      id: 2,
      title: "Term 1 Report Cards released to parents on Friday, February 7th",
      date: "January 25, 2025",
      priority: "medium",
    },
    {
      id: 3,
      title: "Parent-Teacher Meetings on Friday, February 14th",
      date: "January 30, 2025",
      priority: "medium",
    },
  ];

  // Quick links data
  const quickLinks = [
    { id: 1, title: "Take Attendance", icon: cilCheckCircle, path: "/attendance" },
    { id: 2, title: "Create Report Cards", icon: cilFile, path: "/reportcards" },
    { id: 3, title: "View Student Directory", icon: cilUser, path: "/students" },
    { id: 4, title: "Manage Courses", icon: cilBook, path: "/courses" },
  ];

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">TARBIYAH LEARNING ACADEMY</h1>
          <p className="dashboard-subtitle">Staff Portal</p>
        </div>
        <div className="user-section">
          <span className="user-name">Support Admin: Mohammad Abdul Jabbar</span>
          <CButton color="primary" className="ms-2" size="sm">
            Log Out
          </CButton>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="enhanced-welcome-banner">
        <div className="welcome-banner-content">
          <div className="welcome-header">
            <h2>Welcome Back, Mohammad!</h2>
            <div className="welcome-date">
              <CIcon icon={cilCalendar} className="me-2" />
              <span>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          <div className="welcome-actions">
            <div className="action-card">
              <div className="action-icon attendance-icon">
                <CIcon icon={cilCheckCircle} size="xl" />
              </div>
              <div className="action-content">
                <h4>Daily Attendance</h4>
                <p>You need to mark today's attendance</p>
                <CButton
                  color="primary"
                  size="sm"
                  onClick={() => navigate("/attendance")}
                >
                  Mark Now
                </CButton>
              </div>
            </div>

            <div className="action-card">
              <div className="action-icon report-icon">
                <CIcon icon={cilFile} size="xl" />
              </div>
              <div className="action-content">
                <h4>Report Cards</h4>
                <p>25 days until final submission</p>
                <CButton
                  color="success"
                  size="sm"
                  onClick={() => navigate("/reportcards")}
                >
                  Continue Work
                </CButton>
              </div>
            </div>

            <div className="action-card">
              <div className="action-icon event-icon">
                <CIcon icon={cilCalendar} size="xl" />
              </div>
              <div className="action-content">
                <h4>Upcoming Event</h4>
                <p>Parent-Teacher Meeting (Feb 14)</p>
                <CButton color="info" size="sm" onClick={() => navigate("/events")}>
                  View Details
                </CButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <CRow>
          <CCol lg={3} md={6} sm={12}>
            <CCard className="stat-card stat-students">
              <CCardBody className="d-flex align-items-center">
                <div className="stat-icon">
                  <CIcon icon={cilUser} size="3xl" />
                </div>
                <div className="stat-content">
                  <h3 className="stat-number">259</h3>
                  <p className="stat-label">ACTIVE STUDENTS</p>
                </div>
              </CCardBody>
              <CCardFooter
                className="stat-footer"
                onClick={() => navigate("/students")}
              >
                <span>View Student Directory</span>
                <CIcon icon={cilArrowRight} />
              </CCardFooter>
            </CCard>
          </CCol>

          <CCol lg={3} md={6} sm={12}>
            <CCard className="stat-card stat-faculty">
              <CCardBody className="d-flex align-items-center">
                <div className="stat-icon">
                  <CIcon icon={cilSettings} size="3xl" />
                </div>
                <div className="stat-content">
                  <h3 className="stat-number">34</h3>
                  <p className="stat-label">ACTIVE FACULTY</p>
                </div>
              </CCardBody>
              <CCardFooter className="stat-footer" onClick={() => navigate("/faculty")}>
                <span>View Faculty</span>
                <CIcon icon={cilArrowRight} />
              </CCardFooter>
            </CCard>
          </CCol>

          <CCol lg={3} md={6} sm={12}>
            <CCard className="stat-card stat-classes">
              <CCardBody className="d-flex align-items-center">
                <div className="stat-icon">
                  <CIcon icon={cilBook} size="3xl" />
                </div>
                <div className="stat-content">
                  <h3 className="stat-number">63</h3>
                  <p className="stat-label">ACTIVE CLASSES</p>
                </div>
              </CCardBody>
              <CCardFooter className="stat-footer" onClick={() => navigate("/courses")}>
                <span>View Classes</span>
                <CIcon icon={cilArrowRight} />
              </CCardFooter>
            </CCard>
          </CCol>

          <CCol lg={3} md={6} sm={12}>
            <CCard className="stat-card stat-applications">
              <CCardBody className="d-flex align-items-center">
                <div className="stat-icon">
                  <CIcon icon={cilPencil} size="3xl" />
                </div>
                <div className="stat-content">
                  <h3 className="stat-number">601</h3>
                  <p className="stat-label">NEW APPLICATIONS</p>
                </div>
              </CCardBody>
              <CCardFooter
                className="stat-footer"
                onClick={() => navigate("/registration")}
              >
                <span>View Applications</span>
                <CIcon icon={cilArrowRight} />
              </CCardFooter>
            </CCard>
          </CCol>
        </CRow>
      </div>

      {/* Quick Links and Announcements */}
      <CRow className="mt-4">
        {/* Quick Links */}
        <CCol lg={4} md={12}>
          <CCard className="h-100">
            <CCardHeader className="quick-links-header">
              <h3>
                <CIcon icon={cilSettings} className="me-2" />
                Quick Actions
              </h3>
            </CCardHeader>
            <CCardBody className="quick-links-body">
              <div className="quick-links-container">
                {quickLinks.map((link) => (
                  <div
                    key={link.id}
                    className="quick-link-item"
                    onClick={() => navigate(link.path)}
                  >
                    <div className="quick-link-icon">
                      <CIcon icon={link.icon} size="xl" />
                    </div>
                    <span className="quick-link-title">{link.title}</span>
                  </div>
                ))}
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Announcements */}
        <CCol lg={8} md={12}>
          <CCard className="h-100">
            <CCardHeader className="announcements-header">
              <h3>
                <CIcon icon={cilBullhorn} className="me-2" />
                Announcements & Important Dates
              </h3>
              <CButton
                color="primary"
                size="sm"
                className="add-announcement-btn"
                onClick={() => navigate("/announcements/new")}
              >
                <CIcon icon={cilPencil} className="me-1" />
                New
              </CButton>
            </CCardHeader>
            <CCardBody className="announcements-body">
              <div className="announcements-container">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className={`announcement-item priority-${announcement.priority}`}
                  >
                    <div className="announcement-content">
                      <h4 className="announcement-title">{announcement.title}</h4>
                      <div className="announcement-meta">
                        <span className="announcement-date">
                          <CIcon icon={cilCalendar} className="me-1" />
                          {announcement.date}
                        </span>
                        <span
                          className={`announcement-priority priority-${announcement.priority}`}
                        >
                          {announcement.priority.charAt(0).toUpperCase() +
                            announcement.priority.slice(1)}{" "}
                          Priority
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CCardBody>
            <CCardFooter className="announcements-footer">
              <CButton
                color="link"
                className="view-all-link"
                onClick={() => navigate("/announcements")}
              >
                View All Announcements
                <CIcon icon={cilArrowRight} className="ms-1" />
              </CButton>
            </CCardFooter>
          </CCard>
        </CCol>
      </CRow>

      {/* Report Card Management */}
      <CRow className="mt-4">
        <CCol lg={6} md={12}>
          <CCard className="report-card-management">
            <CCardHeader className="report-card-header">
              <h3>
                <CIcon icon={cilFile} className="me-2" />
                Report Card Management
              </h3>
            </CCardHeader>
            <CCardBody>
              <p className="report-card-info">
                Create, edit, and manage student report cards. Next deadline:
                January 27th, 2025.
              </p>
              <div className="report-card-progress">
                <div className="progress-label">
                  <span>Report Cards Completed:</span>
                  <span>42%</span>
                </div>
                <CProgress value={42} className="mb-3" />
              </div>
              <CButton
                color="primary"
                className="mt-3"
                onClick={() => navigate("/reportcards")}
              >
                <CIcon icon={cilFile} className="me-2" />
                Go to Report Cards
              </CButton>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={6} md={12}>
          <CCard className="attendance-overview">
            <CCardHeader className="attendance-header">
              <h3>
                <CIcon icon={cilCheckCircle} className="me-2" />
                Weekly Attendance Overview
              </h3>
            </CCardHeader>
            <CCardBody>
              <div className="attendance-stats">
                <div className="attendance-stat-item">
                  <h4>95%</h4>
                  <p>Overall Attendance</p>
                </div>
                <div className="attendance-stat-item">
                  <h4>12</h4>
                  <p>Absent Today</p>
                </div>
                <div className="attendance-stat-item">
                  <h4>3</h4>
                  <p>Late Today</p>
                </div>
              </div>
              <div className="attendance-chart">
                <div className="day-attendance">
                  <span className="day">Mon</span>
                  <CProgress value={96} className="mb-1" />
                </div>
                <div className="day-attendance">
                  <span className="day">Tue</span>
                  <CProgress value={93} className="mb-1" />
                </div>
                <div className="day-attendance">
                  <span className="day">Wed</span>
                  <CProgress value={97} className="mb-1" />
                </div>
                <div className="day-attendance">
                  <span className="day">Thu</span>
                  <CProgress value={94} className="mb-1" />
                </div>
                <div className="day-attendance">
                  <span className="day">Fri</span>
                  <CProgress value={95} className="mb-1" />
                </div>
              </div>
            </CCardBody>
            <CCardFooter className="attendance-footer">
              <CButton color="success" onClick={() => navigate("/attendance")}>
                View Detailed Attendance
                <CIcon icon={cilArrowRight} className="ms-2" />
              </CButton>
            </CCardFooter>
          </CCard>
        </CCol>
      </CRow>

      {/* Footer */}
      <div className="dashboard-footer mt-4">
        <p className="footer-text">© 2025 Tarbiyah Learning Academy</p>
      </div>
    </div>
  );
};

export default Dashboard;
