import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import coursesData from '../../Data/coursesData.json';
import { CCard, CCardBody, CCardHeader } from '@coreui/react';
import '../Courses/Timetable.css';

// Define time slots and days
const TIME_SLOTS = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TimetablePage() {
  const { id } = useParams();
  const courseId = Number(id);
  const [course, setCourse] = useState(null);
  const [allCourses, setAllCourses] = useState([]);

  useEffect(() => {
    // Find the course data
    const foundCourse = coursesData.find(c => c.id === courseId);
    if (foundCourse) {
      setCourse(foundCourse);
      
      // Get color and format time for the course
      const formattedCourse = {
        ...foundCourse,
        color: foundCourse.color || getColorFromId(foundCourse.id),
        startTime: convert24HourTo12Hour(foundCourse.schedule.startTime),
        endTime: convert24HourTo12Hour(foundCourse.schedule.endTime),
        room: foundCourse.schedule.room || 'TBD'
      };
      
      // Get a few other courses for visual context
      const otherCourses = coursesData
        .filter(c => c.id !== courseId)
        .slice(0, 3)
        .map(c => ({
          ...c,
          color: c.color || getColorFromId(c.id),
          startTime: convert24HourTo12Hour(c.schedule.startTime),
          endTime: convert24HourTo12Hour(c.schedule.endTime),
          room: c.schedule.room || 'TBD'
        }));
      
      setAllCourses([formattedCourse, ...otherCourses]);
    }
  }, [courseId]);

  // Helper function to get a color based on course ID
  const getColorFromId = (id) => {
    // Use ID to generate a unique hue
    const hue = (id * 137.5) % 360;
    return `hsl(${hue}, 70%, 45%)`;
  };
  
  // Helper function to convert 24-hour time to 12-hour format
  const convert24HourTo12Hour = (time24) => {
    if (!time24) return '';
    
    const [hours, minutes] = time24.split(':');
    const hoursNum = parseInt(hours, 10);
    const period = hoursNum >= 12 ? 'PM' : 'AM';
    const hours12 = hoursNum % 12 || 12;
    
    return `${hours12}:${minutes} ${period}`;
  };
  
  // Helper function to format time
  const formatTime = (time) => {
    return time; // Already formatted in the course object
  };

  if (!course) {
    return <div>Loading course information...</div>;
  }

  return (
    <div className="timetable-container" style={{ padding: 20 }}>
      <h2>Timetable for {course.title}</h2>
      <p className="text-muted">Course ID: {courseId}</p>
      
      <CCard>
        <CCardHeader>
          <h3>Weekly Schedule</h3>
        </CCardHeader>
        <CCardBody>
          <div className="timetable-wrapper">
            <div className="timetable">
              <div className="time-column">
                <div className="time-header">Time</div>
                {TIME_SLOTS.map(slot => (
                  <div key={slot} className="time-slot">{slot}</div>
                ))}
              </div>
              
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="day-column">
                  <div className="day-header">{day}</div>
                  {TIME_SLOTS.map(slot => {
                    // Find courses for this day and time slot
                    const coursesInSlot = allCourses.filter(c => 
                      c.schedule.classDays.includes(day) && 
                      c.startTime === slot
                    );
                    
                    return (
                      <div key={slot} className="schedule-cell">
                        {coursesInSlot.map(c => (
                          <div 
                            key={c.id} 
                            className="course-item"
                            style={{ 
                              backgroundColor: c.color,
                              opacity: c.id === courseId ? 1 : 0.5 // Highlight the current course
                            }}
                          >
                            <div className="course-title">{c.title}</div>
                            <div className="course-details">
                              <span>{formatTime(c.startTime)} - {formatTime(c.endTime)}</span>
                              <span>{c.room}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CCardBody>
      </CCard>
    </div>
  );
} 