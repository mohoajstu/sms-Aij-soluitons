import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
  CFormSelect,
  CAlert,
  CFormCheck,
  CSpinner,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import coursesData from '../../Data/coursesData.json'
import './CourseForm.css'
import { auth, firestore } from '../../firebase'
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, writeBatch, serverTimestamp, runTransaction } from 'firebase/firestore'

import { initializeGoogleApi, initializeGIS, authenticate, createEvent } from '../../services/calendarService'

// Mock data for subject options
// B13: Add ECE as course option
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
  'ECE', // B13: Add ECE as course option
]

// Mock data for grade options
const GRADES = [
  'Pre-K',
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
  '5th Grade',
  '6th Grade',
  '7th Grade',
  '8th Grade',
  '9th Grade',
  '10th Grade',
  '11th Grade',
  '12th Grade',
]

// Days of the week for class scheduling
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const CourseForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = !!id

  // Form state with improved schedule structure
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    subject: '',
    grade: '',
    description: '',
    staff: [],
    students: [],
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
    capacity: 25,
    enrolledStudents: 0,
    materials: [],
    addToCalendar: false,
    isActive: true,
  })

  const [newStaffMember, setNewStaffMember] = useState('')
  const [newStudent, setNewStudent] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(true)
  const [materialInput, setMaterialInput] = useState('')
  const [isGoogleCalendarReady, setIsGoogleCalendarReady] = useState(false)
  const [faculty, setFaculty] = useState([])
  const [loadingFaculty, setLoadingFaculty] = useState(true)

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
        console.log('📚 Loaded faculty:', facultyData)
      } catch (error) {
        console.error('Error fetching faculty:', error)
        setError('Failed to load faculty data. Please try again.')
      } finally {
        setLoadingFaculty(false)
      }
    }

    fetchFaculty()
  }, [])

  // If in edit mode, load existing course data
  useEffect(() => {
    if (isEditMode) {
      const courseId = Number(id)
      const course = coursesData.find((c) => c.id === courseId)

      if (course) {
        setFormData({
          ...course,
          // Convert staff and students to strings if they're arrays
          staff: Array.isArray(course.staff) ? course.staff : [course.staff],
          students: Array.isArray(course.students) ? course.students : [course.students],
          schedule: course.schedule || {
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
          materials: course.materials || [],
          addToCalendar: false,
          isActive: true,
        })
        setIsCreating(false)
      } else {
        setError('Course not found')
      }
    }
  }, [id, isEditMode])

  useEffect(() => {
    const initializeGoogleCalendar = async () => {
      try {
        await initializeGoogleApi()
        await initializeGIS()
        setIsGoogleCalendarReady(true)
      } catch (error) {
        console.error('Failed to initialize Google Calendar:', error)
      }
    }

    initializeGoogleCalendar()
  }, [])

  const handleGoogleCalendarAuth = async () => {
    try {
      await authenticate()
      // After successful authentication, you can proceed with calendar operations
      console.log('Successfully authenticated with Google Calendar')
    } catch (error) {
      console.error('Failed to authenticate with Google Calendar:', error)
      setError('Failed to authenticate with Google Calendar. Please try again.')
    }
  }

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    // Handle nested fields
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value,
        },
      })
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value,
      })
    }
  }

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
    })
  }

  // Add new staff member
  const handleAddStaff = () => {
    if (newStaffMember.trim() === '') return

    setFormData({
      ...formData,
      staff: [...formData.staff, newStaffMember.trim()],
    })

    setNewStaffMember('')
  }

  // Remove staff member
  const handleRemoveStaff = (index) => {
    const updatedStaff = [...formData.staff]
    updatedStaff.splice(index, 1)

    setFormData({
      ...formData,
      staff: updatedStaff,
    })
  }

  // Add new student
  const handleAddStudent = () => {
    if (newStudent.trim() === '') return

    setFormData({
      ...formData,
      students: [...formData.students, newStudent.trim()],
    })

    setNewStudent('')
  }

  // Remove student
  const handleRemoveStudent = (index) => {
    const updatedStudents = [...formData.students]
    updatedStudents.splice(index, 1)

    setFormData({
      ...formData,
      students: updatedStudents,
    })
  }

  const addMaterial = () => {
    if (materialInput.trim()) {
      setFormData((prevData) => ({
        ...prevData,
        materials: [...prevData.materials, materialInput.trim()],
      }))
      setMaterialInput('')
    }
  }

  const removeMaterial = (index) => {
    setFormData((prevData) => ({
      ...prevData,
      materials: prevData.materials.filter((_, i) => i !== index),
    }))
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

      // Get current user info to ensure they can see the course they create
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('You must be logged in to create a course')
      }

      const userDocRef = doc(firestore, 'users', currentUser.uid)
      const userDoc = await getDoc(userDocRef)
      let userRole = null
      let shouldAddCurrentUser = false

      if (userDoc.exists()) {
        const userData = userDoc.data()
        userRole = userData.personalInfo?.role || userData.role || null
        
        // If current user is faculty and not already in the staff list, add them
        if (userRole?.toLowerCase() === 'faculty') {
          const isCurrentUserInStaff = formData.staff.some(instructor => instructor.id === currentUser.uid)
          if (!isCurrentUserInStaff) {
            // Get current user's name from faculty collection
            const facultyDocRef = doc(firestore, 'faculty', currentUser.uid)
            const facultyDoc = await getDoc(facultyDocRef)
            if (facultyDoc.exists()) {
              const facultyData = facultyDoc.data()
              const userName = `${facultyData.personalInfo?.firstName || ''} ${facultyData.personalInfo?.lastName || ''}`.trim() || 'Course Creator'
              
              // Add current user to staff list
              formData.staff.push({
                id: currentUser.uid,
                name: userName
              })
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

      // Prepare course data
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
        enrolledStudents: formData.enrolledStudents,
        materials: formData.materials,
        isActive: formData.isActive,
        // Enhanced faculty data for better compatibility
        teacher: enhancedStaffData,
        teacherIds: allTeacherIds, // All possible IDs for lookup
        teacherAuthUIDs: enhancedStaffData.map(s => s.authUID), // Firebase Auth UIDs
        teacherTarbiyahIds: enhancedStaffData.map(s => s.tarbiyahId), // Tarbiyah IDs
        teachers: enhancedStaffData.map(s => s.name), // Names for display
        // Students
        students: formData.students,
        enrolledList: formData.students.map(student => student.id || student),
        // Budget
        budget: {
          totalBudget: 0,
          accumulatedCost: 0,
          itemList: []
        },
        // Metadata
        academicYear: '2024-2025',
        term: 'Term 1',
        section: Math.floor(Math.random() * 9999) + 1000,
        createdBy: currentUser.uid, // Track who created the course
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

      // Try to add to Google Calendar if selected
      if (formData.addToCalendar) {
        try {
          const eventIds = await addToGoogleCalendar({...courseData, id: courseId})
          courseData.calendarEventIds = eventIds
          // Update the course document with calendar event IDs
          batch.update(courseRef, { calendarEventIds: eventIds })
        } catch (calendarError) {
          // Continue with save even if calendar fails
          console.error('Failed to add to calendar:', calendarError)
          setError(
            'Course saved, but failed to add to Google Calendar. Please check your Google Calendar configuration.',
          )
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
      console.error('Error saving course:', error)
      setError(error.message || 'Failed to save course. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addToGoogleCalendar = async (course) => {
    try {
      // Initialize and authenticate with Google Calendar
      await initializeGoogleApi()
      await initializeGIS()
      await authenticate()

      // Create recurring events for each class day
      const calendarIds = []
      for (const day of Object.keys(course.schedule.sessions)) {
        if (course.schedule.sessions[day].enabled) {
        // Get the next occurrence of this day
        const nextDate = getNextDayOfWeek(new Date(), day)

        // Create event object
        const event = {
          summary: `${course.title} (${course.grade})`,
          description: course.description,
            location: course.schedule.sessions[day].room,
          start: {
              dateTime: getDateTimeString(nextDate, course.schedule.sessions[day].startTime),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
              dateTime: getDateTimeString(nextDate, course.schedule.sessions[day].endTime),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          recurrence: [
              `RRULE:FREQ=WEEKLY;BYDAY=${getDayOfWeekCode(day)};COUNT=16`, // 16 weeks (typical semester length)
          ],
            attendees: faculty.filter((instructor) => course.staff.some(s => s.id === instructor.id)).map(
            (instructor) => ({ email: `${instructor.id}@example.com` }),
          ), // Mock emails
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 }, // 1 day before
              { method: 'popup', minutes: 30 }, // 30 minutes before
            ],
          },
        }

        // Create the event
          const result = await createEvent('primary', event)
        calendarIds.push(result.id)
        }
      }

      return calendarIds
    } catch (error) {
      console.error('Error adding events to Google Calendar:', error)
      throw error
    }
  }

  // Helper function to get the next occurrence of a specific day of the week
  const getNextDayOfWeek = (date, dayName) => {
    const days = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    }
    const dayOfWeek = days[dayName]
    const resultDate = new Date(date.getTime())
    resultDate.setDate(date.getDate() + ((7 + dayOfWeek - date.getDay()) % 7))

    return resultDate
  }

  // Helper function to format date and time for Google Calendar
  const getDateTimeString = (date, timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number)
    const result = new Date(date.getTime())
    result.setHours(hours, minutes, 0, 0)

    return result.toISOString()
  }

  // Helper function to get the day of the week code for RRULE
  const getDayOfWeekCode = (dayName) => {
    const days = {
      Monday: 'MO',
      Tuesday: 'TU',
      Wednesday: 'WE',
      Thursday: 'TH',
      Friday: 'FR',
      Saturday: 'SA',
      Sunday: 'SU',
    }
    return days[dayName] || 'MO' // Default to Monday if dayName is unexpected
  }

  return (
    <div className="course-form-container">
      <CCard>
        <CCardHeader>
          <h2>{isEditMode ? 'Edit Course' : 'Create New Course'}</h2>
        </CCardHeader>
        <CCardBody>
          {error && <CAlert color="danger">{error}</CAlert>}
          {success && <CAlert color="success">{success}</CAlert>}

          <CForm onSubmit={handleSubmit}>
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel htmlFor="title">Course Title</CFormLabel>
                <CFormInput
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter course title"
                  required
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="subject">Subject</CFormLabel>
                <CFormSelect
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select subject</option>
                  {SUBJECTS.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={3}>
                <CFormLabel htmlFor="grade">Grade Level</CFormLabel>
                <CFormSelect
                  id="grade"
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select grade</option>
                  {GRADES.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol>
                <CFormLabel htmlFor="description">Course Description</CFormLabel>
                <CFormTextarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter course description"
                  rows={3}
                  required
                />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel htmlFor="staff">
                  Instructors
                </CFormLabel>
                {loadingFaculty ? (
                  <div className="text-center py-3">
                    <CSpinner size="sm" /> Loading faculty...
                  </div>
                ) : (
                <CFormSelect
                  id="staff"
                  multiple
                    onChange={handleInstructorSelection}
                    value={formData.staff.map(instructor => instructor.id)}
                  size="5"
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
                )}
                <small className="form-text text-muted">
                  Hold Ctrl/Cmd key to select multiple instructors
                </small>
                
                {/* Display selected instructors */}
                {formData.staff.length > 0 && (
                  <div className="mt-2">
                    <strong>Selected Instructors:</strong>
                    <ul className="list-unstyled mt-1">
                      {formData.staff.map((instructor, index) => (
                        <li key={instructor.id} className="badge bg-primary me-1">
                          {instructor.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CCol>

              <CCol md={6}>
                <CFormLabel>
                  Class Schedule
                </CFormLabel>
                <div className="mb-3">
                  <p className="text-muted small">
                    Enable days and set individual times for each class day. Each day can have different times and rooms.
                  </p>
                </div>

                  {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="mb-3 p-3 border rounded">
                    <CFormCheck
                      id={`day-${day}`}
                      label={`${day}`}
                      checked={formData.schedule.sessions[day].enabled}
                      onChange={() =>
                        handleScheduleChange(day, 'enabled', !formData.schedule.sessions[day].enabled)
                      }
                      className="mb-2"
                    />
                    
                    {formData.schedule.sessions[day].enabled && (
                      <CRow className="g-2">
                        <CCol md={4}>
                          <CFormLabel htmlFor={`${day}-startTime`}>Start Time</CFormLabel>
                    <CFormInput
                      type="time"
                            id={`${day}-startTime`}
                            value={formData.schedule.sessions[day].startTime}
                            onChange={(e) => handleScheduleChange(day, 'startTime', e.target.value)}
                            size="sm"
                    />
                  </CCol>
                        <CCol md={4}>
                          <CFormLabel htmlFor={`${day}-endTime`}>End Time</CFormLabel>
                    <CFormInput
                      type="time"
                            id={`${day}-endTime`}
                            value={formData.schedule.sessions[day].endTime}
                            onChange={(e) => handleScheduleChange(day, 'endTime', e.target.value)}
                            size="sm"
                    />
                  </CCol>
                        <CCol md={4}>
                          <CFormLabel htmlFor={`${day}-room`}>Room</CFormLabel>
                    <CFormInput
                      type="text"
                            id={`${day}-room`}
                            value={formData.schedule.sessions[day].room}
                            onChange={(e) => handleScheduleChange(day, 'room', e.target.value)}
                      placeholder="e.g., Room 101"
                            size="sm"
                    />
                  </CCol>
                </CRow>
                    )}
                  </div>
                ))}
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>
                  <cilSettings className="me-1" /> Course Settings
                </CFormLabel>
                <CInputGroup className="mb-3">
                  <CInputGroupText>Capacity</CInputGroupText>
                  <CFormInput
                    type="number"
                    id="capacity"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleChange}
                    min="1"
                    max="100"
                    required
                  />
                </CInputGroup>

                {!isCreating && (
                  <CInputGroup className="mb-3">
                    <CInputGroupText>Enrolled</CInputGroupText>
                    <CFormInput
                      type="number"
                      id="enrolledStudents"
                      name="enrolledStudents"
                      value={formData.enrolledStudents}
                      onChange={handleChange}
                      min="0"
                      max={formData.capacity}
                    />
                  </CInputGroup>
                )}

                <div className="mb-3">
                  <CFormCheck
                    id="isActive"
                    name="isActive"
                    label="Course is active and available for enrollment"
                    checked={formData.isActive}
                    onChange={handleChange}
                  />
                </div>

                <div className="mb-3">
                  <CFormCheck
                    id="addToCalendar"
                    name="addToCalendar"
                    label="Add course schedule to Google Calendar"
                    checked={formData.addToCalendar}
                    onChange={handleChange}
                    disabled={!isGoogleCalendarReady}
                  />
                  {!isGoogleCalendarReady && (
                    <CButton
                      color="primary"
                      size="sm"
                      className="mt-2"
                      onClick={handleGoogleCalendarAuth}
                    >
                      Connect Google Calendar
                    </CButton>
                  )}
                  <small className="form-text text-muted">
                    This will create recurring events for each class session.
                  </small>
                </div>
              </CCol>

              <CCol md={6}>
                <CFormLabel>
                  Course Materials
                </CFormLabel>
                <CInputGroup className="mb-3">
                  <CFormInput
                    type="text"
                    value={materialInput}
                    onChange={(e) => setMaterialInput(e.target.value)}
                    placeholder="Add textbooks, resources, etc."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
                  />
                  <CButton type="button" color="primary" onClick={addMaterial}>
                    Add
                  </CButton>
                </CInputGroup>

                {formData.materials.length > 0 ? (
                  <ul className="list-group">
                    {formData.materials.map((material, index) => (
                      <li
                        key={index}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        {material}
                        <CButton
                          color="danger"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeMaterial(index)}
                        >
                          Remove
                        </CButton>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-muted">No materials added yet</div>
                )}
              </CCol>
            </CRow>

            <div className="d-flex justify-content-end">
              <CButton color="secondary" className="me-2" onClick={() => navigate('/courses')}>
                Cancel
              </CButton>
              <CButton color="primary" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    {isCreating ? 'Creating...' : 'Updating...'}
                  </>
                ) : isCreating ? (
                  'Create Course'
                ) : (
                  'Update Course'
                )}
              </CButton>
            </div>
          </CForm>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default CourseForm
