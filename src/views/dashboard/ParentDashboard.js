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
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilUser,
  cilArrowRight,
  cilFile,
  cilBullhorn,
  cilCalendar,
  cilCheckCircle,
  cilClock,
  cilMoney,
} from "@coreui/icons";
import './ParentDashboard.css'
import sygnet from '../../assets/brand/TLA_logo_simple.svg'; 

const ParentDashboard = () => {
  const navigate = useNavigate();

  // Sample student data - works for 1, 2, 3+ children
  const studentData = [
    {
      id: 1,
      name: "Aisha Khan",
      grade: "Grade 5",
      attendance: 94,
    },
    {
      id: 2,
      name: "Omar Khan", 
      grade: "Grade 3",
      attendance: 97,
    },
    {
      id: 3,
      name: "Fatima Khan",
      grade: "Grade 1",
      attendance: 98,
    },

  ];

  // Simplified announcements
  const announcements = [
    {
      id: 1,
      title: "Parent-Teacher Meetings - February 14th",
      date: "January 20, 2025",
      priority: "high",
    },
    {
      id: 2,
      title: "Term 1 Report Cards Available February 7th",
      date: "January 25, 2025",
      priority: "medium",
    },
    {
      id: 3,
      title: "Winter Break - February 17-21",
      date: "January 30, 2025",
      priority: "low",
    },
  ];

  // Upcoming events data
  const upcomingEvents = [
    {
      id: 1,
      title: "Science Fair",
      date: "Feb 10",
      type: "academic",
    },
    {
      id: 2,
      title: "Parent-Teacher Meeting",
      date: "Feb 14",
      type: "meeting",
    },
    {
      id: 3,
      title: "Winter Break",
      date: "Feb 17",
      type: "holiday",
    },
    {
      id: 4,
      title: "Sports Day",
      date: "Feb 28",
      type: "activity",
    },
  ];

  // Simplified quick actions
  const quickActions = [
    { id: 1, title: "View Report Cards", icon: cilFile, path: "/parent/reportcards" },
    { id: 2, title: "Check Attendance", icon: cilCheckCircle, path: "/parent/attendance" },
    { id: 3, title: "Schedule Meeting", icon: cilCalendar, path: "/parent/meetings" },
    { id: 4, title: "Pay Fees", icon: cilMoney, path: "/parent/payments" },
  ];

  // Calculate totals for multiple children
  const totalChildren = studentData.length;
  const averageAttendance = Math.round(
    studentData.reduce((sum, student) => sum + student.attendance, 0) / totalChildren
  );

  // Determine grid class based on number of children
  const getGridClass = (childCount) => {
    if (childCount === 1) return 'one-child';
    if (childCount === 2) return 'two-children';
    if (childCount === 3) return 'three-children';
    return 'many-children';
  };

  return (
    <div className="parent-dashboard-container">
      {/* Header */}
      <div className="parent-dashboard-header">
        <div className="header-left">
          <img src={sygnet} alt="School Logo" className="school-logo" />
          <div>
            <h1 className="dashboard-title">TARBIYAH LEARNING ACADEMY</h1>
            <p className="dashboard-subtitle">Parent Portal</p>
          </div>
        </div>
        <div className="user-section">
          <span className="parent-name">Welcome, Mrs. Khan</span>
        </div>
      </div>

      {/* Children Overview Banner */}
      <div className="children-overview-banner">
        <div className="banner-content">
          <div className="banner-header">
            <h2>Your {totalChildren === 1 ? 'Child\'s' : 'Children\'s'} Progress</h2>
            <div className="current-date">
              <CIcon icon={cilCalendar} className="me-2" />
              <span>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long", 
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          <div className={`children-grid ${getGridClass(totalChildren)}`}>
            {studentData.map((student) => (
              <div key={student.id} className="child-card">
                <div className="child-info">
                  <h4>{student.name}</h4>
                  <p className="child-grade">{student.grade}</p>
                </div>
                <div className="child-stats">
                  <div className="stat-row">
                    <span className="stat-label">Attendance Rate:</span>
                    <span className="stat-value">{student.attendance}%</span>
                  </div>
                </div>
                <CButton
                  color="light"
                  size="sm"
                  onClick={() => navigate(`/parent/student/${student.id}`)}
                  className="view-details-btn"
                >
                  View Full Details
                </CButton>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <CRow className="stats-row">
        <CCol lg={3} md={6} sm={12}>
          <CCard className="stat-card fees-card">
            <CCardBody className="d-flex align-items-center">
              <div className="stat-icon">
                <CIcon icon={cilMoney} size="3xl" />
              </div>
              <div className="stat-content">
                <h3 className="stat-number">$0</h3>
                <p className="stat-label">OUTSTANDING FEES</p>
              </div>
            </CCardBody>
            <CCardFooter className="stat-footer" onClick={() => navigate("/parent/payments")}>
              <span>View Payments</span>
              <CIcon icon={cilArrowRight} />
            </CCardFooter>
          </CCard>
        </CCol>

        <CCol lg={3} md={6} sm={12}>
          <CCard className="stat-card attendance-card">
            <CCardBody className="d-flex align-items-center">
              <div className="stat-icon">
                <CIcon icon={cilCheckCircle} size="3xl" />
              </div>
              <div className="stat-content">
                <h3 className="stat-number">{averageAttendance}%</h3>
                <p className="stat-label">AVERAGE ATTENDANCE</p>
              </div>
            </CCardBody>
            <CCardFooter className="stat-footer" onClick={() => navigate("/parent/attendance")}>
              <span>View Attendance</span>
              <CIcon icon={cilArrowRight} />
            </CCardFooter>
          </CCard>
        </CCol>

        <CCol lg={3} md={6} sm={12}>
          <CCard className="stat-card meetings-card">
            <CCardBody className="d-flex align-items-center">
              <div className="stat-icon">
                <CIcon icon={cilCalendar} size="3xl" />
              </div>
              <div className="stat-content">
                <h3 className="stat-number">1</h3>
                <p className="stat-label">UPCOMING MEETING</p>
              </div>
            </CCardBody>
            <CCardFooter className="stat-footer" onClick={() => navigate("/parent/meetings")}>
              <span>Schedule Meeting</span>
              <CIcon icon={cilArrowRight} />
            </CCardFooter>
          </CCard>
        </CCol>

        <CCol lg={3} md={6} sm={12}>
          <CCard className="stat-card children-card">
            <CCardBody className="d-flex align-items-center">
              <div className="stat-icon">
                <CIcon icon={cilUser} size="3xl" />
              </div>
              <div className="stat-content">
                <h3 className="stat-number">{totalChildren}</h3>
                <p className="stat-label">{totalChildren === 1 ? 'CHILD' : 'CHILDREN'}</p>
              </div>
            </CCardBody>
            <CCardFooter className="stat-footer" onClick={() => navigate("/parent/children")}>
              <span>View Details</span>
              <CIcon icon={cilArrowRight} />
            </CCardFooter>
          </CCard>
        </CCol>
      </CRow>

      {/* Main Content */}
      <CRow className="mt-4">
        {/* Quick Actions */}
        <CCol lg={4} md={12}>
          <CCard className="h-100">
            <CCardHeader className="card-header">
              <h3>
                <CIcon icon={cilUser} className="me-2" />
                Quick Actions
              </h3>
            </CCardHeader>
            <CCardBody className="quick-actions-body">
              <div className="quick-actions-grid">
                {quickActions.map((action) => (
                  <div
                    key={action.id}
                    className="quick-action-item"
                    onClick={() => navigate(action.path)}
                  >
                    <div className="action-icon">
                      <CIcon icon={action.icon} size="xl" />
                    </div>
                    <span className="action-title">{action.title}</span>
                  </div>
                ))}
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Announcements */}
        <CCol lg={8} md={12}>
          <CCard className="h-100">
            <CCardHeader className="card-header">
              <h3>
                <CIcon icon={cilBullhorn} className="me-2" />
                School Announcements
              </h3>
            </CCardHeader>
            <CCardBody className="announcements-body">
              <div className="announcements-list">
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
                        <span className={`priority-badge priority-${announcement.priority}`}>
                          {announcement.priority.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CCardBody>
            <CCardFooter className="text-center">
              <CButton
                color="link"
                onClick={() => navigate("/parent/announcements")}
              >
                View All Announcements
                <CIcon icon={cilArrowRight} className="ms-1" />
              </CButton>
            </CCardFooter>
          </CCard>
        </CCol>
      </CRow>

      {/* Upcoming Events */}
      <CRow className="mt-4">
        <CCol md={12}>
          <CCard className="events-card">
            <CCardHeader className="card-header">
              <h3>
                <CIcon icon={cilClock} className="me-2" />
                Upcoming Events
              </h3>
            </CCardHeader>
            <CCardBody>
              <div className="events-grid">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="event-item">
                    <div className="event-date">
                      {event.date}
                    </div>
                    <div className="event-details">
                      <h5>{event.title}</h5>
                      <span className={`event-type ${event.type}`}>
                        {event.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CCardBody>
            <CCardFooter className="text-center">
              <CButton
                color="link"
                onClick={() => navigate("/parent/calendar")}
              >
                View Full Calendar
                <CIcon icon={cilArrowRight} className="ms-1" />
              </CButton>
            </CCardFooter>
          </CCard>
        </CCol>
      </CRow>

      {/* Footer */}
      <div className="dashboard-footer">
        <p className="footer-text">
          © 2025 Tarbiyah Learning Academy. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ParentDashboard;