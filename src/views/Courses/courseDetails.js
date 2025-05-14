// CourseDetailPage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import coursesData from "../../Data/coursesData.json";
import "./courseDetails.css";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { firestore } from "../../Firebase/firebase"; // <-- your import
import BudgetTracker from "./budgetTracker";

function CourseDetailPage() {
  const { id } = useParams();
  const courseId = Number(id);

  const [course, setCourse] = useState(null);

  // find the course in your JSON
  // const course = coursesData.find((c) => c.id === courseId);

  // async function getCourse(courseId) {
  //   console.log("Getting course:", courseId);
  //   const courseRef = doc(firestore, "courses", courseId); // path: /courses/courseId
  //   const courseSnap = await getDoc(courseRef);
  
  //   if (courseSnap.exists()) {
  //     console.log("Course data:", courseSnap.data());
  //     return courseSnap.data();
  //   } else {
  //     console.log("No such course!");
  //     return null;
  //   }
  // }
  async function getCourse(courseId) {
    const courseRef = doc(firestore, "courses", courseId);
    const snap      = await getDoc(courseRef);
  
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };   // ← include doc‑id
    }
    return null;
  }
  
  useEffect(() => {
    if (!id) return;
  
    const courseRef = doc(firestore, "courses", id);
  
    const unsubscribe = onSnapshot(courseRef, snap => {
      if (snap.exists()) {
        setCourse({ id: snap.id, ...snap.data() });
      } else {
        setCourse(null);
      }
    });
  
    return unsubscribe;
  }, [id]);
  
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

  if (!course) {
    return <div className="course-not-found">Course not found</div>;
  }

  const getColorFromId = (id) => {
    // Slightly different multiplier
    const hue = (id * 271.019) % 360
    return `hsl(${hue}, 70%, 45%)`
  }
  
  // Get course color or use default
  const courseColor = course.color || getColorFromId(course.courseID);
  const textColor = getTextColor(courseColor);
  const lightColor = getLighterColor(courseColor);
  const accentColor = courseColor;

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
      
      {/* Content Area - Lists and Budget side by side */}
      <div className="content-area">
        {/* Left Column - Staff and Students Tables */}
        <div className="lists-column">
          <div className="section">
            <h3 style={{ borderBottom: `2px solid ${courseColor}` }}>Staff</h3>
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
                  {course.teachers.map((person, index) => (
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

          <div className="section">
            <h3 style={{ borderBottom: `2px solid ${courseColor}` }}>Students</h3>
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
                  {course.enrolledList.map((student, index) => (
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
        </div>
        
        {/* Right Column - Budget Tracker */}
        <div className="budget-column">
          <BudgetTracker 
            courseId={course.id} 
            course_id={course.courseID}
            budget={course.budget}
            initialBudget={course.budget.initialBudget} 
            accentColor={accentColor} 
          />
        </div>
      </div>
    </div>
  );
}

export default CourseDetailPage;