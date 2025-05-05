import React, { useState, useEffect } from "react";
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CFormSwitch,
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CFormInput,
  CAlert,
  CSpinner,
  CBadge
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilChatBubble, cilBell, cilBellExclamation, cilPencil } from "@coreui/icons";
import NotificationService from "../../services/notificationService";
import AvatarService from "../../services/avatarService";
import { toast } from "react-hot-toast";

// Enhanced students data with parent phone numbers
const students = [
  { id: 1, name: "Ahmad Hassan", grade: 9, parentPhoneNumber: "+16812215667", parentName: "Fatima Hassan" },
  { id: 2, name: "Yusuf Khan", grade: 9, parentPhoneNumber: "+16812215667", parentName: "Mohammed Khan" },
  { id: 3, name: "Aisha Rahman", grade: 9, parentPhoneNumber: "+16812215667", parentName: "Khadija Rahman" },
  { id: 4, name: "Ibrahim Ali", grade: 9, parentPhoneNumber: "+16812215667", parentName: "Yasir Ali" },
  { id: 5, name: "Zahra Ahmed", grade: 9, parentPhoneNumber: "+16812215667", parentName: "Mariam Ahmed" },
  { id: 6, name: "Omar Malik", grade: 9, parentPhoneNumber: "+16812215667", parentName: "Tariq Malik" },
];

const AttendanceTable = () => {
  const [attendanceData, setAttendanceData] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [commentInput, setCommentInput] = useState("");
  const [allPresent, setAllPresent] = useState(false);
  const [className, setClassName] = useState("Mathematics 101");
  const [attendanceDate, setAttendanceDate] = useState(new Date());
  const [smsSendingStatus, setSmsSendingStatus] = useState({});
  const [smsNotificationEnabled, setSmsNotificationEnabled] = useState(true);
  const [showSmsErrorModal, setShowSmsErrorModal] = useState(false);
  const [smsErrorDetails, setSmsErrorDetails] = useState('');
  const [showPhoneEditModal, setShowPhoneEditModal] = useState(false);
  const [selectedStudentForPhone, setSelectedStudentForPhone] = useState(null);
  const [phoneNumberInput, setPhoneNumberInput] = useState("");
  const [studentsData, setStudentsData] = useState(students);

  useEffect(() => {
    // Check if SMS notification is properly configured
    const checkSmsConfig = async () => {
      try {
        const isConfigured = await NotificationService.checkSmsConfiguration();
        setSmsNotificationEnabled(isConfigured);
        if (!isConfigured) {
          console.warn('SMS notification is not properly configured');
        }
      } catch (error) {
        console.error('Error checking SMS configuration:', error);
        setSmsNotificationEnabled(false);
      }
    };
    
    checkSmsConfig();
  }, []);

  const handleSetAllPresent = (checked) => {
    const newAttendance = {};
    studentsData.forEach((student) => {
      newAttendance[student.id] = { 
        status: checked ? "Present" : "Absent", 
        comment: attendanceData[student.id]?.comment || "" 
      };
    });
    setAttendanceData(newAttendance);
    setAllPresent(checked);
  };

  const handleAttendanceChange = async (student, status) => {
    const previousStatus = attendanceData[student.id]?.status;
    
    // Update attendance status
    setAttendanceData({
      ...attendanceData,
      [student.id]: { 
        status, 
        comment: attendanceData[student.id]?.comment || "" 
      },
    });

    // Remove the automatic notification when marked as absent
  };

  const sendAbsenceNotification = async (student) => {
    // Set the sending status for this student
    setSmsSendingStatus(prev => ({
      ...prev,
      [student.id]: 'sending'
    }));

    try {
      // Get student's attendance status and any comments
      const studentAttendance = attendanceData[student.id] || { status: 'Absent', comment: '' };
      const statusText = studentAttendance.status;
      const commentText = studentAttendance.comment ? ` Note: ${studentAttendance.comment}` : '';

      // Create a customized message based on status
      let customMessage;
      if (statusText === 'Absent') {
        customMessage = `Ottawa Islamic School Attendance Alert: ${student.name} was marked absent from ${className || 'class'} on ${attendanceDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}.${commentText} Please contact the school office for more information.`;
      } else if (statusText === 'Late') {
        customMessage = `Ottawa Islamic School Attendance Alert: ${student.name} was marked late to ${className || 'class'} on ${attendanceDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}.${commentText} Please contact the school office for more information.`;
      } else {
        customMessage = `Ottawa Islamic School Attendance Update: ${student.name}'s attendance status for ${className || 'class'} on ${attendanceDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })} is: ${statusText}.${commentText}`;
      }

      // Console log SMS details
      console.log('SMS NOTIFICATION DETAILS:');
      console.log(`Recipient (${student.parentName}): ${student.parentPhoneNumber}`);
      console.log(`Student: ${student.name}`);
      console.log(`Status: ${statusText}`);
      console.log(`Message: ${customMessage}`);
      console.log('-'.repeat(50));

      const result = await NotificationService.sendAbsenceNotification({
        phoneNumber: student.parentPhoneNumber,
        studentName: student.name,
        className: className,
        date: attendanceDate.toISOString(),
        customMessage: customMessage // Pass the custom message to the service
      });

      // Update sending status
      setSmsSendingStatus(prev => ({
        ...prev,
        [student.id]: 'sent'
      }));
      
      // Show success toast
      toast.success(`SMS notification sent to ${student.parentName}`);
      
      // Automatically clear the success status after 5 seconds
      setTimeout(() => {
        setSmsSendingStatus(prev => {
          const newStatus = {...prev};
          delete newStatus[student.id];
          return newStatus;
        });
      }, 5000);
      
    } catch (error) {
      console.error('Error sending SMS notification:', error);
      
      // Update sending status to error
      setSmsSendingStatus(prev => ({
        ...prev,
        [student.id]: 'error'
      }));
      
      // Show error toast
      toast.error('Failed to send SMS notification');
      
      // Store error details for modal
      setSmsErrorDetails(error.message || 'Unknown error occurred');
    }
  };

  const openCommentModal = (student) => {
    setSelectedStudent(student);
    setCommentInput(attendanceData[student.id]?.comment || "");
    setShowModal(true);
  };

  const saveComment = () => {
    setAttendanceData({
      ...attendanceData,
      [selectedStudent.id]: { 
        status: attendanceData[selectedStudent.id]?.status || "Absent", 
        comment: commentInput 
      },
    });
    setShowModal(false);
  };

  const handleComplete = () => {
    // Count how many students are marked absent
    const absentCount = Object.values(attendanceData).filter(data => data.status === "Absent").length;
    
    // Get all absent students and send notifications
    const absentStudents = studentsData.filter(student => 
      attendanceData[student.id]?.status === "Absent"
    );
    
    // Send notifications to parents of absent students if enabled
    if (smsNotificationEnabled && absentStudents.length > 0) {
      absentStudents.forEach(student => {
        sendAbsenceNotification(student);
      });
      
      // Show success toast for batch notifications
      toast.success(`SMS notifications sent to parents of ${absentStudents.length} absent students`);
    }
    
    // Prepare a summary message
    let summaryMessage = `Attendance complete: ${studentsData.length - absentCount} present, ${absentCount} absent`;
    
    // Display summary in toast notification
    toast.success(summaryMessage);
    
    console.log("Attendance Completed:", attendanceData);
  };

  const getNotificationStatusIcon = (studentId) => {
    const status = smsSendingStatus[studentId];
    
    if (!status) return null;
    
    switch (status) {
      case 'sending':
        return <CSpinner size="sm" color="info" />;
      case 'sent':
        return <CBadge color="success" shape="rounded-pill">SMS Sent</CBadge>;
      case 'error':
        return (
          <CBadge 
            color="danger" 
            shape="rounded-pill" 
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setSmsErrorDetails(smsErrorDetails || 'Error sending notification');
              setShowSmsErrorModal(true);
            }}
          >
            SMS Failed
          </CBadge>
        );
      default:
        return null;
    }
  };

  const openPhoneEditModal = (student) => {
    setSelectedStudentForPhone(student);
    setPhoneNumberInput(student.parentPhoneNumber || "");
    setShowPhoneEditModal(true);
  };

  const savePhoneNumber = () => {
    // Update the student's parent phone number
    const updatedStudents = studentsData.map(s => 
      s.id === selectedStudentForPhone.id 
        ? { ...s, parentPhoneNumber: phoneNumberInput } 
        : s
    );
    
    setStudentsData(updatedStudents);
    setShowPhoneEditModal(false);
    
    // Show success toast
    toast.success(`Phone number updated for ${selectedStudentForPhone.name}'s parent`);
  };

  return (
    <div style={{ position: "relative", paddingBottom: "60px" }}>
      {/* SMS Notification Status */}
      {!smsNotificationEnabled && (
        <CAlert color="warning" className="d-flex align-items-center mb-3">
          <CIcon icon={cilBellExclamation} className="flex-shrink-0 me-2" />
          <div>
            SMS notifications are not properly configured. Parents will not be notified of absences.
          </div>
        </CAlert>
      )}

      {/* Mark All Present Switch and Batch Notification */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center">
          <CFormSwitch
            label="Mark All Present"
            checked={allPresent}
            onChange={(e) => handleSetAllPresent(e.target.checked)}
            className="me-3"
          />
          
          {smsNotificationEnabled && (
            <CFormSwitch
              label="Send SMS Notifications"
              checked={smsNotificationEnabled}
              onChange={(e) => setSmsNotificationEnabled(e.target.checked)}
              className="me-3"
            />
          )}
        </div>
        
        {smsNotificationEnabled && Object.keys(attendanceData).length > 0 && (
          <CButton 
            color="info" 
            variant="outline"
            onClick={() => {
              // Find all students with attendance records
              const studentsWithAttendance = studentsData.filter(student => 
                attendanceData[student.id]?.status
              );
              
              // Send notifications to all these students
              studentsWithAttendance.forEach(student => {
                sendAbsenceNotification(student);
              });
              
              // Show success toast
              toast.success(`Sending notifications to parents of ${studentsWithAttendance.length} students`);
            }}
          >
            <CIcon icon={cilBell} className="me-2" />
            Send All Notifications ({Object.keys(attendanceData).length})
          </CButton>
        )}
      </div>

      {/* Attendance Table */}
      <CTable striped bordered responsive>
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Students</CTableHeaderCell>
            <CTableHeaderCell>Parent Contact</CTableHeaderCell>
            <CTableHeaderCell>Attendance Codes</CTableHeaderCell>
            <CTableHeaderCell>Status</CTableHeaderCell>
            <CTableHeaderCell>Comments</CTableHeaderCell>
          </CTableRow>
        </CTableHead>

        <CTableBody>
          {studentsData.map((student) => (
            <CTableRow key={student.id}>
              <CTableDataCell style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <img 
                  src={AvatarService.generateSvgAvatar(student.name)} 
                  alt={student.name} 
                  style={{ borderRadius: "50%", width: "40px", height: "40px" }} 
                />
                <div>
                  {student.name}
                  <br />
                  <small>#{student.id} • Grade {student.grade}</small>
                </div>
              </CTableDataCell>

              <CTableDataCell>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div>{student.parentName}</div>
                    <small className="text-muted">{student.parentPhoneNumber}</small>
                  </div>
                  <CIcon
                    icon={cilPencil}
                    size="sm"
                    style={{ cursor: "pointer", color: "#20a8d8" }}
                    onClick={() => openPhoneEditModal(student)}
                  />
                </div>
              </CTableDataCell>

              <CTableDataCell>
                <CButton
                  color="success"
                  variant="outline"
                  onClick={() => handleAttendanceChange(student, "Present")}
                  style={{
                    marginRight: "5px",
                    backgroundColor: attendanceData[student.id]?.status === "Present" ? "#28a745" : "white",
                    color: attendanceData[student.id]?.status === "Present" ? "white" : "black",
                    border: "1px solid #28a745",
                  }}
                >
                  ✅ Present
                </CButton>

                <CButton
                  color="danger"
                  variant="outline"
                  onClick={() => handleAttendanceChange(student, "Absent")}
                  style={{
                    marginRight: "5px",
                    backgroundColor: attendanceData[student.id]?.status === "Absent" ? "#dc3545" : "white",
                    color: attendanceData[student.id]?.status === "Absent" ? "white" : "black",
                    border: "1px solid #dc3545",
                  }}
                >
                  ❌ Absent
                </CButton>

                <CButton
                  color="warning"
                  variant="outline"
                  onClick={() => handleAttendanceChange(student, "Late")}
                  style={{
                    backgroundColor: attendanceData[student.id]?.status === "Late" ? "#ffc107" : "white",
                    color: attendanceData[student.id]?.status === "Late" ? "black" : "black",
                    border: "1px solid #ffc107",
                  }}
                >
                  ⏳ Late
                </CButton>
              </CTableDataCell>

              <CTableDataCell>
                {attendanceData[student.id]?.status === "Late" && smsNotificationEnabled && (
                  <div className="d-flex align-items-center">
                    {getNotificationStatusIcon(student.id) || (
                      <CButton 
                        color="info" 
                        size="sm" 
                        variant="ghost"
                        onClick={() => sendAbsenceNotification(student)}
                      >
                        <CIcon icon={cilBell} /> Notify
                      </CButton>
                    )}
                  </div>
                )}
                {attendanceData[student.id]?.status && (
                  <CBadge color={
                    attendanceData[student.id]?.status === "Present" ? "success" : 
                    attendanceData[student.id]?.status === "Late" ? "warning" : "danger"
                  }>
                    {attendanceData[student.id]?.status}
                  </CBadge>
                )}
              </CTableDataCell>

              <CTableDataCell>
                <CIcon
                  icon={cilChatBubble}
                  size="lg"
                  style={{
                    color: attendanceData[student.id]?.comment ? "green" : "black",
                    cursor: "pointer",
                  }}
                  onClick={() => openCommentModal(student)}
                />
                {attendanceData[student.id]?.comment && (
                  <small className="ms-2 text-muted">{attendanceData[student.id]?.comment.substring(0, 20)}...</small>
                )}
              </CTableDataCell>
            </CTableRow>
          ))}
        </CTableBody>
      </CTable>

      {/* Comment Modal */}
      <CModal visible={showModal} onClose={() => setShowModal(false)}>
        <CModalHeader closeButton>{selectedStudent?.name}'s Comment</CModalHeader>
        <CModalBody>
          <CFormInput
            type="text"
            placeholder="Enter comment..."
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={saveComment}>
            Save Comment
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Phone Edit Modal */}
      <CModal visible={showPhoneEditModal} onClose={() => setShowPhoneEditModal(false)}>
        <CModalHeader closeButton>Edit Parent Phone Number</CModalHeader>
        <CModalBody>
          <div className="mb-3">
            <p><strong>Student:</strong> {selectedStudentForPhone?.name}</p>
            <p><strong>Parent:</strong> {selectedStudentForPhone?.parentName}</p>
          </div>
          <CFormInput
            type="tel"
            label="Parent Phone Number"
            placeholder="Enter phone number (e.g., +1234567890)"
            value={phoneNumberInput}
            onChange={(e) => setPhoneNumberInput(e.target.value)}
            className="mb-3"
          />
          <small className="text-muted">
            Please enter the phone number in E.164 format (e.g., +16812215667)
          </small>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowPhoneEditModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={savePhoneNumber}>
            Save Phone Number
          </CButton>
        </CModalFooter>
      </CModal>

      {/* SMS Error Modal */}
      <CModal visible={showSmsErrorModal} onClose={() => setShowSmsErrorModal(false)}>
        <CModalHeader closeButton>SMS Notification Error</CModalHeader>
        <CModalBody>
          <p>There was an error sending the SMS notification:</p>
          <CAlert color="danger">{smsErrorDetails}</CAlert>
          <p>This could be due to:</p>
          <ul>
            <li>Invalid phone number format</li>
            <li>Twilio account issues</li>
            <li>Network connectivity problems</li>
          </ul>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowSmsErrorModal(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Complete Button at Bottom Right */}
      <CButton
        color="dark"
        style={{
          position: "absolute",
          bottom: "10px",
          right: "20px",
          padding: "10px 20px",
          fontSize: "16px",
          borderRadius: "100px",
        }}
        onClick={handleComplete}
      >
        Complete Attendance
        {smsNotificationEnabled && Object.values(attendanceData).filter(data => data.status === "Absent").length > 0 && (
          <CBadge color="danger" shape="rounded-pill" className="ms-2">
            {Object.values(attendanceData).filter(data => data.status === "Absent").length} SMS
          </CBadge>
        )}
      </CButton>
    </div>
  );
};

export default AttendanceTable;
