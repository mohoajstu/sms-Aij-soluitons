import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, firestore } from '../../firebase'
import { collection, addDoc, doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import './CreateCourse.css'
import { 
  CButton, 
  CCard, 
  CCardBody, 
  CCardHeader, 
  CCol, 
  CRow,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CFormSelect,
  CFormCheck,
  CAlert,
  CSpinner
} from '@coreui/react'

function CreateCourse() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentUser, setCurrentUser] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    name: '',
    description: '',
    subject: '',
    grade: '',
    gradeLevel: '',
    academicYear: '2024-2025',
    term: 'Term 1',
    room: '',
    location: '',
    startTime: '',
    endTime: '',
    classDays: [],
    teachers: [],
    teacherIds: [],
    budget: {
      totalBudget: 0,
      accumulatedCost: 0,
      itemList: []
    },
    resources: [],
    enrolledList: [],
    students: [],
    section: Math.floor(Math.random() * 9999) + 1000
  })

  const [availableTeachers, setAvailableTeachers] = useState([])
  const [availableStudents, setAvailableStudents] = useState([])

  const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const GRADE_LEVELS = [
    { value: 1, label: 'Grade 1' },
    { value: 2, label: 'Grade 2' },
    { value: 3, label: 'Grade 3' },
    { value: 4, label: 'Grade 4' },
    { value: 5, label: 'Grade 5' },
    { value: 6, label: 'Grade 6' },
    { value: 7, label: 'Grade 7' },
    { value: 8, label: 'Grade 8' },
    { value: 9, label: 'Grade 9' },
    { value: 10, label: 'Grade 10' },
    { value: 11, label: 'Grade 11' },
    { value: 12, label: 'Grade 12' }
  ]

  const SUBJECTS = [
    'Quran', 'Arabic', 'Islamic Studies', 'Mathematics', 'Science', 
    'English', 'History', 'Geography', 'Art', 'Physical Education',
    'Computer Science', 'Literature', 'Chemistry', 'Physics', 'Biology'
  ]

  const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Summer Term']

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user)
        // Load available teachers and students
        await loadAvailableTeachers()
        await loadAvailableStudents()
      } else {
        navigate('/login')
      }
    })
    return () => unsubscribe()
  }, [navigate])

  const loadAvailableTeachers = async () => {
    try {
      // This would typically fetch from a teachers collection
      // For now, we'll use mock data
      setAvailableTeachers([
        { id: 'T001', name: 'Naheda Nour', schoolId: '' },
        { id: 'T002', name: 'Raya Zatini', schoolId: '' },
        { id: 'T003', name: 'Ahmed Hassan', schoolId: '' },
        { id: 'T004', name: 'Fatima Ali', schoolId: '' }
      ])
    } catch (error) {
      console.error('Error loading teachers:', error)
    }
  }

  const loadAvailableStudents = async () => {
    try {
      // This would typically fetch from a students collection
      // For now, we'll use mock data
      setAvailableStudents([
        { id: 'TS406304', name: 'Bayian Ali' },
        { id: 'TS336489', name: 'Fatima Islam' },
        { id: 'TS726241', name: 'Ahmed Marwan Damergi' },
        { id: 'TS536277', name: 'Adam Abdelghani' },
        { id: 'TS156268', name: 'Ibrahim Ali' },
        { id: 'TS986238', name: 'Hazem Tareki' },
        { id: 'TS206367', name: 'Ibrahim Yasir' },
        { id: 'TS906265', name: 'Luna Jarrar' },
        { id: 'TS486239', name: 'Chahayaa Setijoso' },
        { id: 'TS336246', name: 'Malak Ebrahim' },
        { id: 'TS796242', name: 'Mohamed Jafari' },
        { id: 'TS936391', name: 'Safiyyah Siddiqui' },
        { id: 'TS966336', name: 'Harmayn Shaikh' },
        { id: 'TS896661', name: 'Aleena Usmani' },
        { id: 'TS726370', name: 'Nadir El Manoug' },
        { id: 'TS946237', name: 'Khaled El Husseini' },
        { id: '', name: 'Zainab Bint Zabir' },
        { id: '', name: 'Zohaa Zaigham' },
        { id: '', name: 'Zohal Zazai' },
        { id: 'TS276249', name: 'Naba Jahan Saber' },
        { id: '', name: 'Salman Tanim' },
        { id: '', name: 'Salam Al Shama\'a' },
        { id: 'TS346451', name: 'Amanah Zafar' },
        { id: 'TS586410', name: 'Maryam Salah' }
      ])
    } catch (error) {
      console.error('Error loading students:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleGradeChange = (e) => {
    const grade = parseInt(e.target.value)
    const gradeLevel = GRADE_LEVELS.find(g => g.value === grade)?.label || ''
    setFormData(prev => ({
      ...prev,
      grade,
      gradeLevel
    }))
  }

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      classDays: prev.classDays.includes(day)
        ? prev.classDays.filter(d => d !== day)
        : [...prev.classDays, day]
    }))
  }

  const handleTeacherToggle = (teacher) => {
    setFormData(prev => {
      const isSelected = prev.teachers.includes(teacher.name)
      const newTeachers = isSelected
        ? prev.teachers.filter(t => t !== teacher.name)
        : [...prev.teachers, teacher.name]
      
      const newTeacherIds = isSelected
        ? prev.teacherIds.filter(id => id !== teacher.id)
        : [...prev.teacherIds, teacher.id]

      return {
        ...prev,
        teachers: newTeachers,
        teacherIds: newTeacherIds
      }
    })
  }

  const handleStudentToggle = (student) => {
    setFormData(prev => {
      const isSelected = prev.students.some(s => s.id === student.id)
      const newStudents = isSelected
        ? prev.students.filter(s => s.id !== student.id)
        : [...prev.students, { id: student.id, name: student.name }]

      return {
        ...prev,
        students: newStudents,
        enrolledList: newStudents
      }
    })
  }

  const generateCourseId = () => {
    const timestamp = Date.now().toString().slice(-6)
    return `TC${timestamp}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Validate required fields
      if (!formData.title || !formData.subject || !formData.grade || !formData.startTime || !formData.endTime || formData.classDays.length === 0) {
        throw new Error('Please fill in all required fields')
      }

      const courseId = generateCourseId()
      const now = new Date()

      const courseData = {
        academicYear: formData.academicYear,
        budget: {
          accumulatedCost: 0,
          itemList: [],
          totalBudget: formData.budget.totalBudget
        },
        courseID: courseId,
        courseId: courseId,
        description: formData.description,
        enrolledList: formData.enrolledList,
        grade: formData.grade,
        gradeLevel: formData.gradeLevel,
        name: formData.title,
        resources: formData.resources,
        schedule: {
          classDays: formData.classDays,
          days: formData.classDays,
          endTime: formData.endTime,
          location: formData.location,
          room: formData.room,
          startTime: formData.startTime
        },
        section: formData.section,
        students: formData.students,
        subject: formData.subject,
        teacher: formData.teachers.map(name => ({ name, schoolId: '' })),
        teacherIds: formData.teacherIds,
        teachers: formData.teachers,
        term: formData.term,
        timestamps: {
          createdAt: now,
          updatedAt: now
        },
        title: formData.title
      }

      const docRef = await addDoc(collection(firestore, 'courses'), courseData)
      
      setSuccess('Course created successfully!')
      setTimeout(() => {
        navigate('/courses')
      }, 2000)

    } catch (error) {
      console.error('Error creating course:', error)
      setError(error.message || 'Failed to create course. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-course-container">
      <div className="create-course-header">
        <h1>Create New Course</h1>
        <div className="create-course-actions">
          <CButton 
            color="secondary" 
            onClick={() => navigate('/courses')}
            className="me-2"
          >
            Cancel
          </CButton>
        </div>
      </div>

      <CRow className="mb-4">
        <CCol>
          <CCard className="course-info-card">
            <CCardHeader>Course Information</CCardHeader>
            <CCardBody>
              <p>
                Create a new course by filling out the form below. All fields marked with an asterisk (*) are required.
              </p>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {error && <CAlert color="danger" className="mb-4">{error}</CAlert>}
      {success && <CAlert color="success" className="mb-4">{success}</CAlert>}

      <CCard>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="title">Course Title *</CFormLabel>
                  <CFormInput
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter course title"
                    required
                  />
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="subject">Subject *</CFormLabel>
                  <CFormSelect
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Subject</option>
                    {SUBJECTS.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </CFormSelect>
                </div>
              </CCol>
            </CRow>

            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="grade">Grade Level *</CFormLabel>
                  <CFormSelect
                    id="grade"
                    name="grade"
                    value={formData.grade}
                    onChange={handleGradeChange}
                    required
                  >
                    <option value="">Select Grade</option>
                    {GRADE_LEVELS.map(grade => (
                      <option key={grade.value} value={grade.value}>{grade.label}</option>
                    ))}
                  </CFormSelect>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="term">Term</CFormLabel>
                  <CFormSelect
                    id="term"
                    name="term"
                    value={formData.term}
                    onChange={handleInputChange}
                  >
                    {TERMS.map(term => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                  </CFormSelect>
                </div>
              </CCol>
            </CRow>

            <div className="mb-3">
              <CFormLabel htmlFor="description">Description</CFormLabel>
              <CFormTextarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter course description"
                rows={3}
              />
            </div>

            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="startTime">Start Time *</CFormLabel>
                  <CFormInput
                    id="startTime"
                    name="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="endTime">End Time *</CFormLabel>
                  <CFormInput
                    id="endTime"
                    name="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </CCol>
            </CRow>

            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="room">Room</CFormLabel>
                  <CFormInput
                    id="room"
                    name="room"
                    value={formData.room}
                    onChange={handleInputChange}
                    placeholder="Enter room number"
                  />
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="location">Location</CFormLabel>
                  <CFormInput
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Enter location"
                  />
                </div>
              </CCol>
            </CRow>

            <div className="mb-4">
              <CFormLabel>Class Days *</CFormLabel>
              <div className="days-grid">
                {DAYS_OF_WEEK.map(day => (
                  <CFormCheck
                    key={day}
                    id={`day-${day}`}
                    label={day}
                    checked={formData.classDays.includes(day)}
                    onChange={() => handleDayToggle(day)}
                    className="day-checkbox"
                  />
                ))}
              </div>
            </div>

            <div className="mb-4">
              <CFormLabel>Teachers</CFormLabel>
              <div className="teachers-grid">
                {availableTeachers.map(teacher => (
                  <CFormCheck
                    key={teacher.id}
                    id={`teacher-${teacher.id}`}
                    label={teacher.name}
                    checked={formData.teachers.includes(teacher.name)}
                    onChange={() => handleTeacherToggle(teacher)}
                    className="teacher-checkbox"
                  />
                ))}
              </div>
            </div>

            <div className="mb-4">
              <CFormLabel>Students</CFormLabel>
              <div className="students-grid">
                {availableStudents.map(student => (
                  <CFormCheck
                    key={student.id || student.name}
                    id={`student-${student.id || student.name}`}
                    label={student.name}
                    checked={formData.students.some(s => s.id === student.id)}
                    onChange={() => handleStudentToggle(student)}
                    className="student-checkbox"
                  />
                ))}
              </div>
            </div>

            <div className="form-actions">
              <CButton 
                type="submit" 
                color="primary" 
                disabled={loading}
                className="me-2"
              >
                {loading ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Creating...
                  </>
                ) : (
                  'Create Course'
                )}
              </CButton>
              <CButton 
                type="button" 
                color="secondary" 
                onClick={() => navigate('/courses')}
                disabled={loading}
              >
                Cancel
              </CButton>
            </div>
          </CForm>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default CreateCourse 