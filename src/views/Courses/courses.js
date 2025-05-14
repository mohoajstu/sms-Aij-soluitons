// CoursesPage.jsx (debug version)
import React from "react";
// import coursesData from "../../Data/coursesData.json";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "../../Firebase/firebase";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import "./courses.css";

function CoursesPage() {

  const [coursesData, setCoursesData] = useState([]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const querySnapshot = await getDocs(collection(firestore, "courses"));
        const courses = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCoursesData(courses);
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };
  
    fetchCourses();
  }, []);

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
  if (!coursesData.length) return <p>Loading courses...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Courses</h1>
      <div className="courses-grid">
        {coursesData.map((course, index) => {
          console.log(`Rendering course with id=${course.id}`);
          
          // Determine icon style based on course category or index
          const iconStyle = index % iconTypes.length;
          const iconClasses = `course-tile-icon ${iconTypes[iconStyle].shape}`;

          // Default color if none provided
          const bgColor = course.color || getColorFromId(course.courseID);
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
