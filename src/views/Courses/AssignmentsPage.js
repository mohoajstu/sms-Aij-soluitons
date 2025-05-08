import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import coursesData from '../../Data/coursesData.json';
import { CCard, CCardBody, CCardHeader, CBadge, CButton } from '@coreui/react';

export default function AssignmentsPage() {
  const { id } = useParams();
  const courseId = Number(id);
  const [assignments, setAssignments] = useState([]);
  const [course, setCourse] = useState(null);

  useEffect(() => {
    // Find the course data
    const foundCourse = coursesData.find(c => c.id === courseId);
    if (foundCourse) {
      setCourse(foundCourse);
      setAssignments(foundCourse.assignments || []);
    }
  }, [courseId]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!course) {
    return <div>Loading course information...</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Assignments for {course.title}</h2>
      <p className="text-muted">Course ID: {courseId}</p>
      
      {assignments.length === 0 ? (
        <div>No assignments found for this course.</div>
      ) : (
        <div>
          {assignments.map(assignment => {
            const deadline = new Date(assignment.deadline);
            const now = new Date();
            const isOverdue = deadline < now;
            const isDueSoon = !isOverdue && deadline - now < 3 * 24 * 60 * 60 * 1000; // 3 days
            
            let status;
            let color;
            if (isOverdue) {
              status = 'Overdue';
              color = 'danger';
            } else if (isDueSoon) {
              status = 'Due Soon';
              color = 'warning';
            } else {
              status = 'Upcoming';
              color = 'success';
            }
            
            return (
              <CCard key={assignment.id} className="mb-3">
                <CCardHeader>
                  <div className="d-flex justify-content-between align-items-center">
                    <h4 style={{ margin: 0 }}>{assignment.title}</h4>
                    <CBadge color={color}>{status}</CBadge>
                  </div>
                </CCardHeader>
                <CCardBody>
                  <div className="mb-3">
                    <strong>Due:</strong> {formatDate(assignment.deadline)}
                  </div>
                  <div className="mb-3">
                    <strong>Max Points:</strong> {assignment.maxPoints}
                  </div>
                  <div className="mb-3">
                    <strong>Description:</strong>
                    <p>{assignment.description}</p>
                  </div>
                  <div className="d-flex justify-content-end">
                    <CButton color="primary">View Details</CButton>
                  </div>
                </CCardBody>
              </CCard>
            );
          })}
        </div>
      )}
    </div>
  );
} 