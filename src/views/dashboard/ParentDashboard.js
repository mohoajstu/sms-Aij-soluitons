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
  cilUser,
  cilArrowRight,
  cilBook,
  cilFile,
  cilBullhorn,
  cilCalendar,
  cilPencil,
  cilCheckCircle,
  cilClock,
  cilMoney,
  cilPhone,
  cilEnvelopeClosed, // Fixed: was cisMail
  cilSpeech, // Fixed: was cisChatBubble
} from "@coreui/icons";
// import { CIcon } from '@coreui/icons-react';
// import * as icon from '@coreui/icons';
import './ParentDashboard.css'
import sygnet from '../../assets/brand/TLA_logo_simple.svg'; 

const ParentDashboard = () => {
  const navigate = useNavigate();

  // Sample student data (would come from API in real app)
  const studentData = [
    {
      id: 1,
      name: "Aisha Khan",
      grade: "Grade 5",
      attendance: 94,
      nextClass: "Mathematics - 10:30 AM",
      recentGrade: "A- in Science Quiz",
    },
    {
      id: 2,
      name: "Omar Khan",
      grade: "Grade 3",
      attendance: 97,
      nextClass: "Islamic Studies - 11:00 AM",
      recentGrade: "B+ in Reading Assignment",
    }
  ];

  // Sample announcements data
  const announcements = [
    {
      id: 1,
      title: "Parent-Teacher Meetings scheduled for February 14th",
      date: "January 20, 2025",
      priority: "high",
    },
    {
      id: 2,
      title: "Term 1 Report Cards will be available February 7th",
      date: "January 25, 2025",
      priority: "medium",
    },
    {
      id: 3,
      title: "Winter Break - School closed February 17-21",
      date: "January 30, 2025",
      priority: "low",
    },
    {
      id: 4,
      title: "Science Fair - Students may participate (optional)",
      date: "February 1, 2025",
      priority: "medium",
    },
  ];

  // Quick links data for parents
  const quickLinks = [
    { id: 1, title: "View Report Cards", icon: cilFile, path: "/parent/reportcards" },
    { id: 2, title: "Check Attendance", icon: cilCheckCircle, path: "/parent/attendance" },
    { id: 3, title: "Schedule Meetings", icon: cilCalendar, path: "/parent/meetings" },
    { id: 4, title: "Pay Fees", icon: cilMoney, path: "/parent/payments" },
    { id: 5, title: "Contact Teachers", icon: cilEnvelopeClosed, path: "/parent/messages" }, // Fixed icon
    { id: 6, title: "View Calendar", icon: cilClock, path: "/parent/calendar" },
  ];

  // Upcoming events
  const upcomingEvents = [
    { date: "Feb 7", event: "Report Cards Available", type: "academic" },
    { date: "Feb 14", event: "Parent-Teacher Meeting", type: "meeting" },
    { date: "Feb 17", event: "Winter Break Begins", type: "holiday" },
    { date: "Mar 5", event: "Science Fair (Optional)", type: "activity" },
  ];

  return (
    <div className="parent-dashboard-container">
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

      {/* Welcome Banner */}
      <div className="parent-welcome-banner">
        <div className="welcome-banner-content">
          <div className="welcome-header">
            <h2>Your Children's Progress</h2>
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

          <div className="student-overview">
            {studentData.map((student) => (
              <div key={student.id} className="student-card">
                <div className="student-info">
                  <h4>{student.name}</h4>
                  <p className="student-grade">{student.grade}</p>
                </div>
                <div className="student-stats">
                  <div className="stat-item">
                    <span className="stat-label">Attendance</span>
                    <span className="stat-value">{student.attendance}%</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Next Class</span>
                    <span className="stat-value">{student.nextClass}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Recent Grade</span>
                    <span className="stat-value">{student.recentGrade}</span>
                  </div>
                </div>
                <div className="student-actions">
                  <CButton
                    color="light"
                    size="sm"
                    onClick={() => navigate(`/parent/student/${student.id}`)}
                  >
                    View Details
                  </CButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Information Row */}
      <div className="parent-stats-row">
        <CRow>
          <CCol lg={3} md={6} sm={12}>
            <CCard className="parent-stat-card outstanding-fees">
              <CCardBody className="d-flex align-items-center">
                <div className="stat-icon">
                  <CIcon icon={cilMoney} size="3xl" />
                </div>
                <div className="stat-content">
                  <h3 className="stat-number">$0</h3>
                  <p className="stat-label">OUTSTANDING FEES</p>
                </div>
              </CCardBody>
              <CCardFooter
                className="stat-footer"
                onClick={() => navigate("/parent/payments")}
              >
                <span>View Payment History</span>
                <CIcon icon={cilArrowRight} />
              </CCardFooter>
            </CCard>
          </CCol>

          <CCol lg={3} md={6} sm={12}>
            <CCard className="parent-stat-card upcoming-meetings">
              <CCardBody className="d-flex align-items-center">
                <div className="stat-icon">
                  <CIcon icon={cilCalendar} size="3xl" />
                </div>
                <div className="stat-content">
                  <h3 className="stat-number">1</h3>
                  <p className="stat-label">UPCOMING MEETINGS</p>
                </div>
              </CCardBody>
              <CCardFooter className="stat-footer" onClick={() => navigate("/parent/meetings")}>
                <span>Schedule New Meeting</span>
                <CIcon icon={cilArrowRight} />
              </CCardFooter>
            </CCard>
          </CCol>

          <CCol lg={3} md={6} sm={12}>
            <CCard className="parent-stat-card unread-messages">
              <CCardBody className="d-flex align-items-center">
                <div className="stat-icon">
                  <CIcon icon={cilEnvelopeClosed} size="3xl" /> {/* Fixed icon */}
                </div>
                <div className="stat-content">
                  <h3 className="stat-number">3</h3>
                  <p className="stat-label">UNREAD MESSAGES</p>
                </div>
              </CCardBody>
              <CCardFooter className="stat-footer" onClick={() => navigate("/parent/messages")}>
                <span>View Messages</span>
                <CIcon icon={cilArrowRight} />
              </CCardFooter>
            </CCard>
          </CCol>

          <CCol lg={3} md={6} sm={12}>
            <CCard className="parent-stat-card children-count">
              <CCardBody className="d-flex align-items-center">
                <div className="stat-icon">
                  <CIcon icon={cilUser} size="3xl" />
                </div>
                <div className="stat-content">
                  <h3 className="stat-number">{studentData.length}</h3>
                  <p className="stat-label">YOUR CHILDREN</p>
                </div>
              </CCardBody>
              <CCardFooter
                className="stat-footer"
                onClick={() => navigate("/parent/children")}
              >
                <span>View All Details</span>
                <CIcon icon={cilArrowRight} />
              </CCardFooter>
            </CCard>
          </CCol>
        </CRow>
      </div>

      {/* Main Content Row */}
      <CRow className="mt-4">
        {/* Quick Links */}
        <CCol lg={4} md={12}>
          <CCard className="h-100">
            <CCardHeader className="quick-links-header">
              <h3>
                <CIcon icon={cilUser} className="me-2" />
                Quick Actions
              </h3>
            </CCardHeader>
            <CCardBody className="quick-links-body">
              <div className="parent-quick-links-container">
                {quickLinks.map((link) => (
                  <div
                    key={link.id}
                    className="parent-quick-link-item"
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
                School Announcements & Important Dates
              </h3>
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
                onClick={() => navigate("/parent/announcements")}
              >
                View All Announcements
                <CIcon icon={cilArrowRight} className="ms-1" />
              </CButton>
            </CCardFooter>
          </CCard>
        </CCol>
      </CRow>

      {/* Additional Information Row */}
      <CRow className="mt-4">
        {/* Upcoming Events */}
        <CCol lg={6} md={12}>
          <CCard className="upcoming-events-card">
            <CCardHeader className="events-header">
              <h3>
                <CIcon icon={cilClock} className="me-2" />
                Upcoming Events
              </h3>
            </CCardHeader>
            <CCardBody>
              <div className="events-container">
                {upcomingEvents.map((event, index) => (
                  <div key={index} className={`event-item ${event.type}`}>
                    <div className="event-date">
                      <span>{event.date}</span>
                    </div>
                    <div className="event-details">
                      <h5>{event.event}</h5>
                      <span className={`event-type ${event.type}`}>
                        {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <CButton
                color="primary"
                className="mt-3 w-100"
                onClick={() => navigate("/parent/calendar")}
              >
                <CIcon icon={cilCalendar} className="me-2" />
                View Full Calendar
              </CButton>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Contact Information */}
        <CCol lg={6} md={12}>
          <CCard className="contact-info-card">
            <CCardHeader className="contact-header">
              <h3>
                <CIcon icon={cilPhone} className="me-2" />
                Contact School
              </h3>
            </CCardHeader>
            <CCardBody>
              <div className="contact-methods">
                <div className="contact-item">
                  <div className="contact-icon">
                    <CIcon icon={cilPhone} size="lg" />
                  </div>
                  <div className="contact-details">
                    <h5>Phone</h5>
                    <p>(555) 123-4567</p>
                  </div>
                </div>
                <div className="contact-item">
                  <div className="contact-icon">
                    <CIcon icon={cilEnvelopeClosed} size="lg" /> {/* Fixed icon */}
                  </div>
                  <div className="contact-details">
                    <h5>Email</h5>
                    <p>info@tarbiyahacademy.edu</p>
                  </div>
                </div>
                <div className="contact-item">
                  <div className="contact-icon">
                    <CIcon icon={cilSpeech} size="lg" /> {/* Fixed icon */}
                  </div>
                  <div className="contact-details">
                    <h5>Message Teachers</h5>
                    <p>Send direct messages</p>
                  </div>
                </div>
              </div>
              <div className="contact-actions">
                <CButton
                  color="success"
                  className="me-2"
                  onClick={() => navigate("/parent/messages")}
                >
                  <CIcon icon={cilEnvelopeClosed} className="me-1" /> {/* Fixed icon */}
                  Send Message
                </CButton>
                <CButton
                  color="info"
                  onClick={() => navigate("/parent/meetings")}
                >
                  <CIcon icon={cilCalendar} className="me-1" />
                  Schedule Meeting
                </CButton>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Footer */}
      <div className="dashboard-footer mt-4">
        <p className="footer-text">© 2025 Tarbiyah Learning Academy - Parent Portal</p>
      </div>
    </div>
  );
};

export default ParentDashboard;