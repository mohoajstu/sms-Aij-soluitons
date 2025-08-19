import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, firestore } from '../../firebase'
import { collection, addDoc, doc, getDoc, getDocs, runTransaction, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
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

  // Form state with improved schedule structure
  const [formData, setFormData] = useState({
    title: '',
    name: '',
    description: '',
    subject: '',
    grade: '',
    gradeLevel: '',
    academicYear: '2024-2025',
    term: 'Term 1',
    schedule: {
      // New structure: each day can have its own time and room
      sessions: {
        Monday: { enabled: false, startTime: '08:00', endTime: '09:00', room: '' },
        Tuesday: { enabled: false, startTime: '08:00', endTime: '09:00', room: '' },
        Wednesday: { enabled: false, startTime: '08:00', endTime: '09:00', room: '' },
        Thursday: { enabled: false, startTime: '08:00', endTime: '09:00', room: '' },
        Friday: { enabled: false, startTime: '08:00', endTime: '09:00', room: '' },
        Saturday: { enabled: false, startTime: '08:00', endTime: '09:00', room: '' },
        Sunday: { enabled: false, startTime: '08:00', endTime: '09:00', room: '' },
      }
    },
    staff: [], // Changed from teachers to staff for consistency
    teacherIds: [],
    budget: {
      totalBudget: 0,
      accumulatedCost: 0,
      itemList: []
    },
    resources: [],
    enrolledList: [],
    students: [],
    section: Math.floor(Math.random() * 9999) + 1000,
    capacity: 25,
    materials: [],
    isActive: true
  })

  const [faculty, setFaculty] = useState([])
  const [loadingFaculty, setLoadingFaculty] = useState(true)
  const [availableStudents, setAvailableStudents] = useState([])

  const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const GRADE_LEVELS = [
    { value: 'Pre-K', label: 'Pre-K' },
    { value: 'Kindergarten', label: 'Kindergarten' },
    { value: '1st Grade', label: '1st Grade' },
    { value: '2nd Grade', label: '2nd Grade' },
    { value: '3rd Grade', label: '3rd Grade' },
    { value: '4th Grade', label: '4th Grade' },
    { value: '5th Grade', label: '5th Grade' },
    { value: '6th Grade', label: '6th Grade' },
    { value: '7th Grade', label: '7th Grade' },
    { value: '8th Grade', label: '8th Grade' },
    { value: '9th Grade', label: '9th Grade' },
    { value: '10th Grade', label: '10th Grade' },
    { value: '11th Grade', label: '11th Grade' },
    { value: '12th Grade', label: '12th Grade' },
  ]

  const SUBJECTS = [
    'Islamic Studies',
    'Quran',
    'Arabic Language',
    'Mathematics',
    'Science',
    'Social Studies',
    'Physical Education',
    'Art',
    'Computer Science',
  ]

  // Fetch faculty data from Firebase
  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        setLoadingFaculty(true)
        const facultySnapshot = await getDocs(collection(firestore, 'faculty'))
        const facultyData = facultySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            name: `${data.personalInfo?.firstName || ''} ${data.personalInfo?.lastName || ''}`.trim() || 'Unnamed Faculty',
            firstName: data.personalInfo?.firstName || '',
            lastName: data.personalInfo?.lastName || '',
            email: data.contact?.email || '',
            active: data.active !== false, // Default to true if not specified
          }
        }).filter(f => f.active) // Only show active faculty
        
        setFaculty(facultyData)
        console.log('📚 Loaded faculty for CreateCourse:', facultyData)
      } catch (error) {
        console.error('Error fetching faculty:', error)
        setError('Failed to load faculty data. Please try again.')
      } finally {
        setLoadingFaculty(false)
      }
    }

    fetchFaculty()
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })
    return () => unsubscribe()
  }, [])

  // Handle schedule session changes (day-specific times)
  const handleScheduleChange = (day, field, value) => {
    setFormData({
      ...formData,
      schedule: {
        ...formData.schedule,
        sessions: {
          ...formData.schedule.sessions,
          [day]: {
            ...formData.schedule.sessions[day],
            [field]: value,
          }
        }
      }
    })
  }

  // Handle instructor selection (multiple)
  const handleInstructorSelection = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions)
    const selectedInstructors = selectedOptions.map(option => ({
      id: option.value,
      name: option.getAttribute('data-name'),
    }))
    
    setFormData({
      ...formData,
      staff: selectedInstructors,
      teacherIds: selectedInstructors.map(instructor => instructor.id),
    })
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
      schedule: {
        ...prev.schedule,
        sessions: {
          ...prev.schedule.sessions,
          [day]: {
            ...prev.schedule.sessions[day],
            enabled: !prev.schedule.sessions[day].enabled
          }
        }
      }
    }))
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

  const generateCourseId = async () => {
    try {
      // Use transaction to ensure atomic ID generation
      const courseId = await runTransaction(firestore, async (transaction) => {
        // Reference to the counter document
        const counterRef = doc(firestore, 'counters', 'courseCounter')
        const counterDoc = await transaction.get(counterRef)
        
        let nextNumber = 71 // Start from 71 (next after TC000070)
        
        if (counterDoc.exists()) {
          const counterData = counterDoc.data()
          nextNumber = (counterData.nextCourseNumber || 71)
        } else {
          // Initialize counter document if it doesn't exist
          transaction.set(counterRef, { 
            nextCourseNumber: nextNumber,
            lastUpdated: serverTimestamp(),
            description: 'Course ID counter starting from TC000070'
          })
        }
        
        // Increment the counter for next time
        transaction.update(counterRef, { 
          nextCourseNumber: nextNumber + 1,
          lastUpdated: serverTimestamp()
        })
        
        // Format with leading zeros (TC000071)
        const formattedNumber = String(nextNumber).padStart(6, '0')
        return `TC${formattedNumber}`
      })
      
      return courseId
    } catch (error) {
      console.error('Error generating course ID with transaction, falling back to query method:', error)
      
      // Fallback to the previous method if transaction fails
      try {
        const coursesSnapshot = await getDocs(collection(firestore, 'courses'))
        let maxNumber = 70 // Start from 70 as requested (TC000070)
        
        coursesSnapshot.docs.forEach(doc => {
          const courseData = doc.data()
          const courseId = courseData.courseID || courseData.courseId || doc.id
          
          // Extract number from course ID (TC000071 -> 71)
          if (courseId && courseId.startsWith('TC')) {
            const numberPart = courseId.replace('TC', '').replace(/^0+/, '') // Remove TC and leading zeros
            const number = parseInt(numberPart) || 0
            if (number > maxNumber) {
              maxNumber = number
            }
          }
        })
        
        // Increment for new course
        const newNumber = maxNumber + 1
        // Format with leading zeros (TC000071)
        const formattedNumber = String(newNumber).padStart(6, '0')
        return `TC${formattedNumber}`
      } catch (fallbackError) {
        console.error('Error in fallback course ID generation:', fallbackError)
        // Final fallback to timestamp-based ID
        const timestamp = Date.now().toString().slice(-6)
        return `TC${timestamp}`
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Validate required fields
      if (!formData.title || !formData.subject || !formData.grade || !formData.description) {
        throw new Error('Please fill in all required fields')
      }

      // Validate at least one day is enabled
      const enabledDays = Object.keys(formData.schedule.sessions).filter(
        day => formData.schedule.sessions[day].enabled
      )
      if (enabledDays.length === 0) {
        throw new Error('Please enable at least one class day')
      }

      // Validate times for enabled days
      for (const day of enabledDays) {
        const session = formData.schedule.sessions[day]
        if (!session.startTime || !session.endTime) {
          throw new Error(`Please set start and end times for ${day}`)
        }
        if (session.startTime >= session.endTime) {
          throw new Error(`End time must be after start time for ${day}`)
        }
      }

      if (!currentUser) {
        throw new Error('You must be logged in to create a course')
      }

      // Check if current user is faculty and auto-add them
      const userDocRef = doc(firestore, 'users', currentUser.uid)
      const userDoc = await getDoc(userDocRef)
      let shouldAddCurrentUser = false

      if (userDoc.exists()) {
        const userData = userDoc.data()
        const userRole = userData.personalInfo?.role || userData.role || null
        
        if (userRole?.toLowerCase() === 'faculty') {
          const isCurrentUserInStaff = formData.staff.some(instructor => instructor.id === currentUser.uid)
          if (!isCurrentUserInStaff) {
            // Find current user's name from faculty data
            const currentUserFaculty = faculty.find(f => f.id === currentUser.uid)
            if (currentUserFaculty) {
              formData.staff.push({
                id: currentUser.uid,
                name: currentUserFaculty.name
              })
              formData.teacherIds.push(currentUser.uid)
              shouldAddCurrentUser = true
            }
          }
        }
      }

      const courseId = await generateCourseId()
      const now = new Date()

      // Prepare enhanced teacher data with both UIDs and Tarbiyah IDs
      const enhancedStaffData = await Promise.all(
        formData.staff.map(async (instructor) => {
          let tarbiyahId = instructor.id
          
          // Check if this instructor has a linked Tarbiyah ID
          try {
            const instructorUserDoc = await getDoc(doc(firestore, 'users', instructor.id))
            if (instructorUserDoc.exists()) {
              const instructorUserData = instructorUserDoc.data()
              const linkedTarbiyahId = instructorUserData.tarbiyahId || instructorUserData.schoolId
              if (linkedTarbiyahId && linkedTarbiyahId !== instructor.id) {
                tarbiyahId = linkedTarbiyahId
              }
            }
          } catch (error) {
            console.log(`⚠️ Could not check Tarbiyah ID for ${instructor.id}`)
          }
          
          return {
            name: instructor.name,
            authUID: instructor.id,
            tarbiyahId: tarbiyahId,
            schoolId: tarbiyahId, // Legacy compatibility
          }
        })
      )
      
      // Create comprehensive teacher ID arrays for better lookup
      const allTeacherIds = enhancedStaffData.reduce((acc, staff) => {
        acc.push(staff.authUID)
        if (staff.tarbiyahId !== staff.authUID) {
          acc.push(staff.tarbiyahId)
        }
        return [...new Set(acc)] // Remove duplicates
      }, [])

      // Convert new schedule format to legacy format for compatibility
      const legacySchedule = {
        classDays: enabledDays,
        days: enabledDays,
        startTime: formData.schedule.sessions[enabledDays[0]]?.startTime || '08:00',
        endTime: formData.schedule.sessions[enabledDays[0]]?.endTime || '09:00',
        room: formData.schedule.sessions[enabledDays[0]]?.room || '',
        location: formData.schedule.sessions[enabledDays[0]]?.room || '',
        // New detailed schedule
        sessions: formData.schedule.sessions,
      }

      const courseData = {
        courseID: courseId,
        courseId: courseId,
        title: formData.title,
        name: formData.title,
        subject: formData.subject,
        grade: formData.grade,
        gradeLevel: formData.grade,
        description: formData.description,
        schedule: legacySchedule,
        capacity: formData.capacity,
        materials: formData.materials,
        isActive: formData.isActive,
        academicYear: formData.academicYear,
        term: formData.term,
        section: formData.section,
        // Enhanced faculty data for better compatibility
        teacher: enhancedStaffData,
        teacherIds: allTeacherIds, // All possible IDs for lookup
        teacherAuthUIDs: enhancedStaffData.map(s => s.authUID), // Firebase Auth UIDs
        teacherTarbiyahIds: enhancedStaffData.map(s => s.tarbiyahId), // Tarbiyah IDs
        teachers: enhancedStaffData.map(s => s.name), // Names for display
        // Students and enrollment
        students: formData.students,
        enrolledList: formData.enrolledList,
        enrolledStudents: formData.enrolledList.length,
        // Budget
        budget: formData.budget,
        resources: formData.resources,
        // Metadata
        createdBy: currentUser.uid,
        timestamps: {
          createdAt: now,
          updatedAt: now
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      // Use batch operation for consistency
      const batch = writeBatch(firestore)

      // Create course document with predefined ID
      const courseRef = doc(firestore, 'courses', courseId)
      batch.set(courseRef, courseData)

      // Update faculty documents to include this course
      for (const instructor of formData.staff) {
        // Try to get the instructor's Tarbiyah ID if they have one
        let instructorTarbiyahId = instructor.id
        
        // Check if this instructor ID is actually a Firebase Auth UID that has a linked Tarbiyah ID
        try {
          const instructorUserDoc = await getDoc(doc(firestore, 'users', instructor.id))
          if (instructorUserDoc.exists()) {
            const instructorUserData = instructorUserDoc.data()
            const linkedTarbiyahId = instructorUserData.tarbiyahId || instructorUserData.schoolId
            if (linkedTarbiyahId && linkedTarbiyahId !== instructor.id) {
              console.log(`🔗 Instructor ${instructor.id} has linked Tarbiyah ID: ${linkedTarbiyahId}`)
              instructorTarbiyahId = linkedTarbiyahId
            }
          }
        } catch (error) {
          console.log(`⚠️ Could not check for linked Tarbiyah ID for instructor ${instructor.id}:`, error)
        }
        
        const facultyRef = doc(firestore, 'faculty', instructorTarbiyahId)
        
        // Get current faculty data to update courses array
        const facultyDoc = await getDoc(facultyRef)
        if (facultyDoc.exists()) {
          const facultyData = facultyDoc.data()
          const currentCourses = facultyData.courses || []
          
          // Add course ID if not already present
          if (!currentCourses.includes(courseId)) {
            const updatedCourses = [...currentCourses, courseId]
            batch.update(facultyRef, {
              courses: updatedCourses,
              updatedAt: serverTimestamp(),
            })
          }
        } else {
          console.log(`⚠️ Faculty document not found for ID: ${instructorTarbiyahId}`)
        }
      }

      // Commit all changes
      await batch.commit()

      const successMessage = shouldAddCurrentUser 
        ? 'Course created successfully! You have been automatically added as an instructor.'
        : 'Course created successfully!'
      
      setSuccess(successMessage)
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
                    {/* TERMS is not defined in this file, assuming it's a placeholder or typo */}
                    {/* For now, I'll remove it as it's not part of the new_code */}
                    {/* <option value="">Select Term</option> */}
                    {/* {TERMS.map(term => ( */}
                    {/*   <option key={term} value={term}>{term}</option> */}
                    {/* ))} */}
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

            {/* Class Schedule Section */}
            <div className="schedule-section">
              <h4>Class Schedule</h4>
              <p className="text-muted">Select days and set individual times for each class day. Each day can have different times and rooms.</p>
              
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="day-schedule-item mb-3 p-3 border rounded">
                  <CFormCheck
                    id={`day-${day}`}
                    label={`${day}`}
                    checked={formData.schedule.sessions[day]?.enabled || false}
                    onChange={() => handleDayToggle(day)}
                    className="mb-2"
                  />
                  
                  {formData.schedule.sessions[day]?.enabled && (
                    <CRow className="g-2 mt-2">
                      <CCol md={4}>
                        <CFormLabel htmlFor={`${day}-startTime`}>Start Time</CFormLabel>
                        <CFormInput
                          type="time"
                          id={`${day}-startTime`}
                          value={formData.schedule.sessions[day]?.startTime || '08:00'}
                          onChange={(e) => handleScheduleChange(day, 'startTime', e.target.value)}
                          size="sm"
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel htmlFor={`${day}-endTime`}>End Time</CFormLabel>
                        <CFormInput
                          type="time"
                          id={`${day}-endTime`}
                          value={formData.schedule.sessions[day]?.endTime || '09:00'}
                          onChange={(e) => handleScheduleChange(day, 'endTime', e.target.value)}
                          size="sm"
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel htmlFor={`${day}-room`}>Room</CFormLabel>
                        <CFormInput
                          type="text"
                          id={`${day}-room`}
                          value={formData.schedule.sessions[day]?.room || ''}
                          onChange={(e) => handleScheduleChange(day, 'room', e.target.value)}
                          placeholder="e.g., Room 101"
                          size="sm"
                        />
                      </CCol>
                    </CRow>
                  )}
                </div>
              ))}
            </div>

            {/* Teachers Section */}
            <div className="teachers-section">
              <CFormLabel>Instructors</CFormLabel>
              {loadingFaculty ? (
                <div className="text-center py-3">
                  <CSpinner size="sm" /> Loading faculty...
                </div>
              ) : (
                <>
                  <CFormSelect
                    multiple
                    onChange={handleInstructorSelection}
                    value={formData.staff.map(instructor => instructor.id)}
                    size="6"
                    className="mb-2"
                  >
                    {faculty.map((instructor) => (
                      <option 
                        key={instructor.id} 
                        value={instructor.id}
                        data-name={instructor.name}
                      >
                        {instructor.name} ({instructor.id})
                      </option>
                    ))}
                  </CFormSelect>
                  <small className="form-text text-muted">
                    Hold Ctrl/Cmd key to select multiple instructors
                  </small>
                  
                  {/* Display selected instructors */}
                  {formData.staff.length > 0 && (
                    <div className="mt-2">
                      <strong>Selected Instructors:</strong>
                      <div className="mt-1">
                        {formData.staff.map((instructor) => (
                          <span key={instructor.id} className="badge bg-primary me-1">
                            {instructor.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
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