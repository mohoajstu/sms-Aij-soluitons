import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CNav,
  CNavItem,
  CNavLink,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CSpinner,
  CAlert,
  CInputGroup,
  CFormInput,
  CInputGroupText,
  CFormSelect,
  CBadge,
  CRow,
  CCol,
} from '@coreui/react'
import {

} from '@coreui/icons-react'
import coursesData from '../../Data/coursesData.json'
import './CoursesView.css'

const CoursesView = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState([])
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [activeTab, setActiveTab] = useState('courses')

  // Collect unique subjects and grades for filters
  const subjects = [...new Set(coursesData.map((course) => course.subject))].sort()
  const grades = [...new Set(coursesData.map((course) => course.grade))].sort((a, b) => {
    // Custom sort function to handle grade levels correctly
    const gradeOrder = {
      'Pre-K': 0,
      Kindergarten: 1,
    }

    // For 1st Grade, 2nd Grade, etc.
    const aNum = a.match(/(\d+)/)
    const bNum = b.match(/(\d+)/)

    if (gradeOrder[a] !== undefined && gradeOrder[b] !== undefined) {
      return gradeOrder[a] - gradeOrder[b]
    } else if (gradeOrder[a] !== undefined) {
      return -1
    } else if (gradeOrder[b] !== undefined) {
      return 1
    } else if (aNum && bNum) {
      return parseInt(aNum[0]) - parseInt(bNum[0])
    }

    return a.localeCompare(b)
  })

  useEffect(() => {
    // Simulating API call to fetch courses
    const fetchCourses = async () => {
      setLoading(true)
      try {
        // In a real app, this would be an API call
        // For now, use the imported JSON data
        setCourses(coursesData)
      } catch (err) {
        setError('Failed to load courses. Please try again later.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [])

  // Filter and search logic
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      searchTerm === '' ||
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesGrade = filterGrade === '' || course.grade === filterGrade
    const matchesSubject = filterSubject === '' || course.subject === filterSubject

    return matchesSearch && matchesGrade && matchesSubject
  })

  // Navigation handlers
  const handleCreateCourse = () => {
    navigate('/courses/new')
  }

  const handleEditCourse = (courseId) => {
    navigate(`/courses/edit/${courseId}`)
  }

  const handleDeleteCourse = (courseId) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      // In a real app, this would be an API call
      setCourses(courses.filter((course) => course.id !== courseId))
    }
  }

  const handleViewTimetable = () => {
    navigate('/courses/timetable')
  }

  const renderCoursesBadge = (count) => (
    <CBadge color="primary" shape="rounded-pill" className="ms-2">
      {count}
    </CBadge>
  )

  // Render course table
  const renderCoursesTable = () => {
    if (loading) {
      return (
        <div className="text-center my-5">
          <CSpinner color="primary" />
          <p className="mt-3">Loading courses...</p>
        </div>
      )
    }

    if (error) {
      return <CAlert color="danger">{error}</CAlert>
    }

    if (filteredCourses.length === 0) {
      return (
        <CAlert color="info">
          No courses found.{' '}
          {searchTerm || filterGrade || filterSubject ? 'Try adjusting your filters.' : ''}
        </CAlert>
      )
    }

    return (
      <CTable hover responsive className="courses-table">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Course Title</CTableHeaderCell>
            <CTableHeaderCell>Subject</CTableHeaderCell>
            <CTableHeaderCell>Grade</CTableHeaderCell>
            <CTableHeaderCell>Schedule</CTableHeaderCell>
            <CTableHeaderCell>Enrollment</CTableHeaderCell>
            <CTableHeaderCell>Actions</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {filteredCourses.map((course) => (
            <CTableRow key={course.id}>
              <CTableDataCell>
                <div className="course-title">
                  <Link to={`/courses/${course.id}`}>{course.title}</Link>
                </div>
                {course.description && (
                  <div className="course-description">
                    {course.description.substring(0, 100)}...
                  </div>
                )}
              </CTableDataCell>
              <CTableDataCell>{course.subject}</CTableDataCell>
              <CTableDataCell>{course.grade}</CTableDataCell>
              <CTableDataCell>
                <div>{course.schedule.classDays.map((day) => day.substring(0, 3)).join(', ')}</div>
                <div className="schedule-time">
                  {course.schedule.startTime} - {course.schedule.endTime}
                </div>
                {course.schedule.room && (
                  <small className="text-muted">{course.schedule.room}</small>
                )}
              </CTableDataCell>
              <CTableDataCell>
                <div className="enrollment">
                  <span
                    className={getEnrollmentColorClass(course.enrolledStudents, course.capacity)}
                  >
                    {course.enrolledStudents}/{course.capacity}
                  </span>
                </div>
              </CTableDataCell>
              <CTableDataCell>
                <div className="d-flex gap-2">
                  <CButton color="light" size="sm" onClick={() => handleEditCourse(course.id)}>
                    Edit
                  </CButton>
                  <CButton
                    color="danger"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCourse(course.id)}
                  >
                    Delete
                  </CButton>
                </div>
              </CTableDataCell>
            </CTableRow>
          ))}
        </CTableBody>
      </CTable>
    )
  }

  // Helper function to get color class based on enrollment ratio
  const getEnrollmentColorClass = (enrolled, capacity) => {
    const ratio = enrolled / capacity
    if (ratio >= 0.9) return 'text-danger'
    if (ratio >= 0.7) return 'text-warning'
    return 'text-success'
  }

  // Render main content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'courses':
        return (
          <>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="d-flex gap-3">
                <CInputGroup>
                  <CInputGroupText>
                    Search
                  </CInputGroupText>
                  <CFormInput
                    placeholder="Search courses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </CInputGroup>

                <CInputGroup>
                  <CInputGroupText>
                    Filter
                  </CInputGroupText>
                  <CFormSelect value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
                    <option value="">All Grades</option>
                    {grades.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </CFormSelect>
                </CInputGroup>

                <CInputGroup>
                  <CFormSelect
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                  >
                    <option value="">All Subjects</option>
                    {subjects.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </CFormSelect>
                </CInputGroup>
              </div>

              <CButton
                color="primary"
                className="d-flex align-items-center gap-2"
                onClick={handleCreateCourse}
              >
                New Course
              </CButton>
            </div>

            {renderCoursesTable()}
          </>
        )

      case 'assignments':
        return (
          <div className="text-center py-5">
            <h4>Assignments</h4>
            <p className="text-muted">View and manage all course assignments</p>
            <CButton
              color="primary"
              className="mt-3"
              onClick={() => {
                // Navigate to a general assignments page or to the first course's assignments
                if (courses.length > 0) {
                  navigate(`/courses/${courses[0].id}/assignments`)
                } else {
                  navigate('/courses') // fallback if no courses
                }
              }}
            >
                              View All Assignments
            </CButton>
          </div>
        )

      case 'timetable':
        return (
          <div className="text-center py-5">
            <h4>Class Schedule</h4>
            <p className="text-muted">View the complete class timetable</p>
            <CButton color="primary" className="mt-3" onClick={handleViewTimetable}>
                              View Timetable
            </CButton>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="courses-view">
      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader>
              <h2>Courses</h2>
              <p className="text-muted mb-0">Manage courses, assignments, and class schedules</p>
            </CCardHeader>

            <CNav variant="tabs" className="mt-1">
              <CNavItem>
                <CNavLink active={activeTab === 'courses'} onClick={() => setActiveTab('courses')}>
                  Courses {renderCoursesBadge(courses.length)}
                </CNavLink>
              </CNavItem>
              {/* Removed Assignments and Timetable tabs as per user request */}
            </CNav>

            <CCardBody>{renderContent()}</CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  )
}

export default CoursesView
