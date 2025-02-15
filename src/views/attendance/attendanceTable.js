import React, { useState } from "react";
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
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilChatBubble } from "@coreui/icons";

const students = [
  { id: 1, name: "Arthur Boucher", grade: 9, avatar: "https://i.pravatar.cc/40?img=1" },
  { id: 2, name: "Danny Anderson", grade: 9, avatar: "https://i.pravatar.cc/40?img=2" },
  { id: 3, name: "Justin Aponte", grade: 9, avatar: "https://i.pravatar.cc/40?img=3" },
  { id: 4, name: "Arthur Boucher", grade: 9, avatar: "https://i.pravatar.cc/40?img=1" },
  { id: 5, name: "Danny Anderson", grade: 9, avatar: "https://i.pravatar.cc/40?img=2" },
  { id: 6, name: "Justin Aponte", grade: 9, avatar: "https://i.pravatar.cc/40?img=3" },
];

const AttendanceTable = () => {
  const [attendanceData, setAttendanceData] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [commentInput, setCommentInput] = useState("");
  const [allPresent, setAllPresent] = useState(false);

  const handleSetAllPresent = (checked) => {
    const newAttendance = {};
    students.forEach((student) => {
      newAttendance[student.id] = { status: checked ? "Present" : "Absent", comment: attendanceData[student.id]?.comment || "" };
    });
    setAttendanceData(newAttendance);
    setAllPresent(checked);
  };

  const handleAttendanceChange = (id, status) => {
    setAttendanceData({
      ...attendanceData,
      [id]: { status, comment: attendanceData[id]?.comment || "" },
    });
  };

  const openCommentModal = (student) => {
    setSelectedStudent(student);
    setCommentInput(attendanceData[student.id]?.comment || "");
    setShowModal(true);
  };

  const saveComment = () => {
    setAttendanceData({
      ...attendanceData,
      [selectedStudent.id]: { status: attendanceData[selectedStudent.id]?.status || "Absent", comment: commentInput },
    });
    setShowModal(false);
  };

  const handleComplete = () => {
    console.log("Attendance Completed:", attendanceData);
    alert("Attendance has been submitted!");
  };

  return (
    <div style={{ position: "relative", paddingBottom: "60px" }}>
      {/* Mark All Present Switch */}
      <CFormSwitch
        label="Mark All Present"
        checked={allPresent}
        onChange={(e) => handleSetAllPresent(e.target.checked)}
        style={{ marginBottom: "10px" }}
      />

      {/* Attendance Table */}
      <CTable striped bordered responsive>
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Students</CTableHeaderCell>
            <CTableHeaderCell>Attendance Codes</CTableHeaderCell>
            <CTableHeaderCell>Comments</CTableHeaderCell>
          </CTableRow>
        </CTableHead>

        <CTableBody>
          {students.map((student) => (
            <CTableRow key={student.id}>
              <CTableDataCell style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <img src={student.avatar} alt={student.name} style={{ borderRadius: "50%" }} />
                {student.name}
                <br />
                <small>#{student.id} • Grade {student.grade}</small>
              </CTableDataCell>

              <CTableDataCell>
                <CButton
                  color="success"
                  variant="outline"
                  onClick={() => handleAttendanceChange(student.id, "Present")}
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
                  onClick={() => handleAttendanceChange(student.id, "Absent")}
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
                  onClick={() => handleAttendanceChange(student.id, "Late")}
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
                <CIcon
                  icon={cilChatBubble}
                  size="lg"
                  style={{
                    color: attendanceData[student.id]?.comment ? "green" : "black",
                    cursor: "pointer",
                  }}
                  onClick={() => openCommentModal(student)}
                />
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
      </CButton>
    </div>
  );
};

export default AttendanceTable;
