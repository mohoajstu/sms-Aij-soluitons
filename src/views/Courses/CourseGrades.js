import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CFormInput,
  CButton,
  CSpinner,
  CAlert,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormLabel,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CFormSelect,
} from '@coreui/react'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { firestore } from '../../Firebase/firebase'

/**
 * B14: Course Grades Component
 * Allows entering grades for students and calculates mean and median
 */
const CourseGrades = ({ courseId }) => {
  const [course, setCourse] = useState(null)
  const [students, setStudents] = useState([])
  const [assignments, setAssignments] = useState([]) // Array of assignment objects { id, name, subject }
  const [grades, setGrades] = useState({}) // { studentId: { assignmentId: grade } }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState({ show: false, message: '', color: 'success' })
  const [showAddAssignmentModal, setShowAddAssignmentModal] = useState(false)
  const [newAssignmentName, setNewAssignmentName] = useState('')
  const [newAssignmentSubject, setNewAssignmentSubject] = useState('')
  const [activeSubjectTab, setActiveSubjectTab] = useState('all') // 'all' or specific subject

  useEffect(() => {
    loadCourseData()
  }, [courseId])

  // Get available subjects from course and assignments
  const getAvailableSubjects = () => {
    const subjects = new Set()
    if (course?.subject) {
      subjects.add(course.subject)
    }
    assignments.forEach((assignment) => {
      if (assignment.subject) {
        subjects.add(assignment.subject)
      }
    })
    return Array.from(subjects).sort()
  }

  // Get assignments filtered by subject
  const getFilteredAssignments = () => {
    if (activeSubjectTab === 'all') {
      return assignments
    }
    return assignments.filter((assignment) => assignment.subject === activeSubjectTab)
  }

  const loadCourseData = async () => {
    try {
      setLoading(true)
      const courseRef = doc(firestore, 'courses', courseId)
      const courseSnap = await getDoc(courseRef)

      if (courseSnap.exists()) {
        const courseData = courseSnap.data()
        setCourse(courseData)
        
        // Set default subject for new assignments to course subject
        if (courseData.subject && !newAssignmentSubject) {
          setNewAssignmentSubject(courseData.subject)
        }

        // Load students - handle both enrolledList and students arrays
        const enrolledList = courseData.enrolledList || courseData.enrolledlist || courseData.students || []
        
        // Fetch student details
        const studentPromises = enrolledList.map(async (studentId) => {
          try {
            const studentRef = doc(firestore, 'students', studentId)
            const studentSnap = await getDoc(studentRef)
            if (studentSnap.exists()) {
              const studentData = studentSnap.data()
              return {
                id: studentId,
                name: studentData.personalInfo?.firstName && studentData.personalInfo?.lastName
                  ? `${studentData.personalInfo.firstName} ${studentData.personalInfo.lastName}`
                  : studentData.fullName || studentData.name || studentId,
              }
            }
            // Fallback if student doc doesn't exist
            return { id: studentId, name: studentId }
          } catch (error) {
            console.error(`Error loading student ${studentId}:`, error)
            return { id: studentId, name: studentId }
          }
        })
        
        const studentList = await Promise.all(studentPromises)
        setStudents(studentList)

        // Load existing assignments
        if (courseData.assignments && Array.isArray(courseData.assignments)) {
          setAssignments(courseData.assignments)
        } else {
          // If no assignments exist, initialize empty array
          setAssignments([])
        }

        // Load existing grades
        if (courseData.grades) {
          setGrades(courseData.grades)
        }
      }
    } catch (error) {
      console.error('Error loading course data:', error)
      setAlert({
        show: true,
        message: 'Error loading course data',
        color: 'danger',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGradeChange = (studentId, assignmentId, value) => {
    setGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [assignmentId]: value ? parseFloat(value) : null,
      },
    }))
  }

  const saveGrades = async () => {
    try {
      setSaving(true)
      const courseRef = doc(firestore, 'courses', courseId)
      await updateDoc(courseRef, {
        grades,
        assignments, // Also save assignments
        updatedAt: serverTimestamp(),
      })

      setAlert({
        show: true,
        message: 'Grades saved successfully!',
        color: 'success',
      })
      setTimeout(() => setAlert({ ...alert, show: false }), 3000)
    } catch (error) {
      console.error('Error saving grades:', error)
      setAlert({
        show: true,
        message: 'Error saving grades',
        color: 'danger',
      })
      setTimeout(() => setAlert({ ...alert, show: false }), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleAddAssignment = () => {
    if (!newAssignmentName.trim()) {
      setAlert({
        show: true,
        message: 'Please enter an assignment name',
        color: 'danger',
      })
      setTimeout(() => setAlert({ ...alert, show: false }), 3000)
      return
    }

    if (!newAssignmentSubject) {
      setAlert({
        show: true,
        message: 'Please select a subject',
        color: 'danger',
      })
      setTimeout(() => setAlert({ ...alert, show: false }), 3000)
      return
    }

    const newAssignment = {
      id: `assignment_${Date.now()}`,
      name: newAssignmentName.trim(),
      subject: newAssignmentSubject,
    }

    setAssignments([...assignments, newAssignment])
    setNewAssignmentName('')
    setNewAssignmentSubject(course?.subject || '')
    setShowAddAssignmentModal(false)
  }

  const handleDeleteAssignment = (assignmentId) => {
    if (window.confirm('Are you sure you want to delete this assignment? All grades for this assignment will be lost.')) {
      // Remove assignment from list
      setAssignments(assignments.filter((a) => a.id !== assignmentId))
      
      // Remove grades for this assignment
      const updatedGrades = { ...grades }
      Object.keys(updatedGrades).forEach((studentId) => {
        if (updatedGrades[studentId][assignmentId]) {
          delete updatedGrades[studentId][assignmentId]
        }
      })
      setGrades(updatedGrades)
    }
  }

  // B14: Calculate median
  const calculateMedian = (numbers) => {
    if (!numbers || numbers.length === 0) return null
    const validNumbers = numbers.filter((n) => n !== null && n !== undefined && !isNaN(n))
    if (validNumbers.length === 0) return null

    const sorted = [...validNumbers].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2
    } else {
      return sorted[mid]
    }
  }

  // Calculate mean
  const calculateMean = (numbers) => {
    if (!numbers || numbers.length === 0) return null
    const validNumbers = numbers.filter((n) => n !== null && n !== undefined && !isNaN(n))
    if (validNumbers.length === 0) return null

    const sum = validNumbers.reduce((acc, n) => acc + n, 0)
    return sum / validNumbers.length
  }

  // Get all grades for a student (filtered by active subject)
  const getStudentGrades = (studentId) => {
    const studentGrades = grades[studentId] || {}
    const filteredAssignments = getFilteredAssignments()
    return filteredAssignments
      .map((assignment) => studentGrades[assignment.id])
      .filter((g) => g !== null && g !== undefined && !isNaN(g))
  }

  // Get all grades for an assignment
  const getAssignmentGrades = (assignmentId) => {
    return students
      .map((student) => grades[student.id]?.[assignmentId])
      .filter((g) => g !== null && g !== undefined && !isNaN(g))
  }

  if (loading) {
    return (
      <CCard>
        <CCardBody className="text-center">
          <CSpinner />
          <p className="mt-2">Loading grades...</p>
        </CCardBody>
      </CCard>
    )
  }

  const availableSubjects = getAvailableSubjects()
  const filteredAssignments = getFilteredAssignments()

  return (
    <CCard>
      <CCardHeader>
        <h4>Course Grades</h4>
      </CCardHeader>
      <CCardBody>
        {alert.show && (
          <CAlert
            color={alert.color}
            dismissible
            onClose={() => setAlert({ ...alert, show: false })}
            className="mb-3"
          >
            {alert.message}
          </CAlert>
        )}

        <div className="mb-3 d-flex gap-2 align-items-center">
          <CButton color="primary" onClick={saveGrades} disabled={saving}>
            {saving ? <><CSpinner size="sm" className="me-2" /> Saving...</> : 'Save Grades'}
          </CButton>
          <CButton color="success" variant="outline" onClick={() => setShowAddAssignmentModal(true)}>
            Add Assignment
          </CButton>
        </div>

        {/* Subject Tabs */}
        {availableSubjects.length > 0 && (
          <div className="mb-3">
            <CNav variant="tabs" role="tablist">
              <CNavItem>
                <CNavLink
                  active={activeSubjectTab === 'all'}
                  onClick={() => setActiveSubjectTab('all')}
                  style={{ cursor: 'pointer' }}
                >
                  All Subjects ({assignments.length})
                </CNavLink>
              </CNavItem>
              {availableSubjects.map((subject) => {
                const subjectAssignments = assignments.filter((a) => a.subject === subject)
                return (
                  <CNavItem key={subject}>
                    <CNavLink
                      active={activeSubjectTab === subject}
                      onClick={() => setActiveSubjectTab(subject)}
                      style={{ cursor: 'pointer' }}
                    >
                      {subject} ({subjectAssignments.length})
                    </CNavLink>
                  </CNavItem>
                )
              })}
            </CNav>
          </div>
        )}

        {filteredAssignments.length === 0 && assignments.length === 0 && (
          <CAlert color="info" className="mb-3">
            No assignments yet. Click "Add Assignment" to create your first assignment column.
          </CAlert>
        )}

        {filteredAssignments.length === 0 && assignments.length > 0 && (
          <CAlert color="info" className="mb-3">
            No assignments found for the selected subject. Switch to another tab or add a new assignment.
          </CAlert>
        )}

        {filteredAssignments.length > 0 && (
          <div className="table-responsive">
            <CTable>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Student</CTableHeaderCell>
                  {filteredAssignments.map((assignment) => (
                    <CTableHeaderCell key={assignment.id}>
                      <div className="d-flex align-items-center gap-2">
                        <div>
                          <div>{assignment.name}</div>
                          {assignment.subject && (
                            <small className="text-muted">({assignment.subject})</small>
                          )}
                        </div>
                        <CButton
                          color="danger"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          style={{ padding: '2px 6px', fontSize: '12px' }}
                        >
                          ×
                        </CButton>
                      </div>
                    </CTableHeaderCell>
                  ))}
                  <CTableHeaderCell>Mean</CTableHeaderCell>
                  <CTableHeaderCell>Median</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {students.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={filteredAssignments.length + 3} className="text-center text-muted">
                      No students enrolled in this course
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  students.map((student) => {
                    const studentGrades = getStudentGrades(student.id)
                    const mean = calculateMean(studentGrades)
                    const median = calculateMedian(studentGrades)

                    return (
                      <CTableRow key={student.id}>
                        <CTableDataCell>{student.name}</CTableDataCell>
                        {filteredAssignments.map((assignment) => (
                          <CTableDataCell key={assignment.id}>
                            <CFormInput
                              type="number"
                              size="sm"
                              min="0"
                              max="100"
                              step="0.01"
                              value={grades[student.id]?.[assignment.id] || ''}
                              onChange={(e) =>
                                handleGradeChange(student.id, assignment.id, e.target.value)
                              }
                              placeholder="0-100"
                              style={{ width: '100px' }}
                            />
                          </CTableDataCell>
                        ))}
                        <CTableDataCell>
                          {mean !== null ? mean.toFixed(2) : '-'}
                        </CTableDataCell>
                        <CTableDataCell>
                          {median !== null ? median.toFixed(2) : '-'}
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })
                )}
                {/* Summary row with class statistics */}
                {students.length > 0 && filteredAssignments.length > 0 && (
                  <CTableRow style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                    <CTableDataCell>Class Average</CTableDataCell>
                    {filteredAssignments.map((assignment) => {
                      const assignmentGrades = getAssignmentGrades(assignment.id)
                      const mean = calculateMean(assignmentGrades)
                      const median = calculateMedian(assignmentGrades)
                      return (
                        <CTableDataCell key={assignment.id}>
                          <div>
                            <div>Mean: {mean !== null ? mean.toFixed(2) : '-'}</div>
                            <div>Median: {median !== null ? median.toFixed(2) : '-'}</div>
                          </div>
                        </CTableDataCell>
                      )
                    })}
                    <CTableDataCell>-</CTableDataCell>
                    <CTableDataCell>-</CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>
          </div>
        )}

        <div className="mt-3">
          <small className="text-muted">
            Enter grades for each student (0-100). Mean and median are calculated automatically. Use
            the "Add Assignment" button to add new assignment columns.
          </small>
        </div>

        {/* Add Assignment Modal */}
        <CModal visible={showAddAssignmentModal} onClose={() => setShowAddAssignmentModal(false)}>
          <CModalHeader>
            <CModalTitle>Add New Assignment</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel htmlFor="assignmentName">Assignment Name</CFormLabel>
              <CFormInput
                id="assignmentName"
                type="text"
                value={newAssignmentName}
                onChange={(e) => setNewAssignmentName(e.target.value)}
                placeholder="e.g., Quiz 1, Midterm Exam, Final Project"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddAssignment()
                  }
                }}
              />
            </div>
            <div className="mb-3">
              <CFormLabel htmlFor="assignmentSubject">Subject</CFormLabel>
              <CFormSelect
                id="assignmentSubject"
                value={newAssignmentSubject}
                onChange={(e) => setNewAssignmentSubject(e.target.value)}
                required
              >
                <option value="">Select a subject</option>
                {availableSubjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
                {course?.subject && !availableSubjects.includes(course.subject) && (
                  <option value={course.subject}>{course.subject}</option>
                )}
              </CFormSelect>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => {
              setShowAddAssignmentModal(false)
              setNewAssignmentName('')
              setNewAssignmentSubject(course?.subject || '')
            }}>
              Cancel
            </CButton>
            <CButton color="primary" onClick={handleAddAssignment}>
              Add Assignment
            </CButton>
          </CModalFooter>
        </CModal>
      </CCardBody>
    </CCard>
  )
}

export default CourseGrades

