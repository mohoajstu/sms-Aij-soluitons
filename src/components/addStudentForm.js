import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { firestore } from "../firebase"; // Adjust the path to your firebase.js file

const AddStudentForm = () => {
  // State for user document
  const [userUID, setUserUID] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Student");

  // State for student subcollection
  const [studentID, setStudentID] = useState("student_unique_id");
  const [studentEmergencyNumber, setStudentEmergencyNumber] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState("active");
  const [gradeLevel, setGradeLevel] = useState("");
  const [classID, setClassID] = useState("");
  const [averageGrade, setAverageGrade] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(0);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      if (!userUID) {
        alert("Please provide a UID for the user.");
        return;
      }

      // We might set createdAt/updatedAt to the current time (ISO string)
      const nowISO = new Date().toISOString();

      // User document data
      const userData = {
        firstName: firstName || "",
        lastName: lastName || "",
        email: email || "",
        phone: phone || "",
        role: role || "Student",
        createdAt: nowISO,
        updatedAt: nowISO,
        lastLogin: "",
        loginCount: 0,
      };

      // Student subcollection data
      const studentData = {
        studentID: studentID || "student_unique_id",
        studentEmergencyNumber: studentEmergencyNumber || "",
        registrationStatus: registrationStatus || "active",
        gradeLevel: gradeLevel || "",
        enrolledClasses: [
          {
            classID: classID || "",
          },
        ],
        academicDetails: {
          averageGrade: parseInt(averageGrade, 10) || 0,
          attendanceRate: parseInt(attendanceRate, 10) || 0,
        },
      };

      // 1) Create/overwrite the user doc in "users" collection
      await setDoc(doc(firestore, "users", userUID), userData);

      // 2) Create/overwrite a doc in the "student" subcollection
      // doc path: "users/{userUID}/student/{studentID}"
      await setDoc(doc(firestore, "users", userUID, "student", studentData.studentID), studentData);

      alert("Student data added successfully!");
      
      // Optionally clear the form
      setUserUID("");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setRole("Student");
      setStudentID("student_unique_id");
      setStudentEmergencyNumber("");
      setRegistrationStatus("active");
      setGradeLevel("");
      setClassID("");
      setAverageGrade(0);
      setAttendanceRate(0);

    } catch (error) {
      console.error("Error adding student: ", error);
      alert("Failed to add student. Check console for details.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto" }}>
      <h2>Add Student</h2>
      <form onSubmit={handleSubmit}>
        <label>
          UID (User Document):
          <input
            type="text"
            value={userUID}
            onChange={(e) => setUserUID(e.target.value)}
            placeholder="Unique User ID"
          />
        </label>

        <br />
        <label>
          First Name:
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Amina"
          />
        </label>

        <br />
        <label>
          Last Name:
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Saqib"
          />
        </label>

        <br />
        <label>
          Email:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="amina.saqib@example.com"
          />
        </label>

        <br />
        <label>
          Phone:
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1234009876"
          />
        </label>

        <br />
        <label>
          Role:
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Student"
          />
        </label>

        <hr />
        <h3>Student Subcollection</h3>

        <label>
          Student ID (Doc Name):
          <input
            type="text"
            value={studentID}
            onChange={(e) => setStudentID(e.target.value)}
            placeholder="student_unique_id"
          />
        </label>

        <br />
        <label>
          Emergency Number:
          <input
            type="text"
            value={studentEmergencyNumber}
            onChange={(e) => setStudentEmergencyNumber(e.target.value)}
            placeholder="+19876543210"
          />
        </label>

        <br />
        <label>
          Registration Status:
          <input
            type="text"
            value={registrationStatus}
            onChange={(e) => setRegistrationStatus(e.target.value)}
            placeholder="active"
          />
        </label>

        <br />
        <label>
          Grade Level:
          <input
            type="text"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            placeholder="7"
          />
        </label>

        <br />
        <label>
          Class ID:
          <input
            type="text"
            value={classID}
            onChange={(e) => setClassID(e.target.value)}
            placeholder="Grade7-2622-Sep2024-HomeRoom"
          />
        </label>

        <br />
        <label>
          Average Grade:
          <input
            type="number"
            value={averageGrade}
            onChange={(e) => setAverageGrade(e.target.value)}
            placeholder="88"
          />
        </label>

        <br />
        <label>
          Attendance Rate:
          <input
            type="number"
            value={attendanceRate}
            onChange={(e) => setAttendanceRate(e.target.value)}
            placeholder="96"
          />
        </label>

        <br />
        <button type="submit">Add Student</button>
      </form>
    </div>
  );
};

export default AddStudentForm;
