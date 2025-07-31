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
import { collection, getDocs, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore'
import { firestore } from '../../firebase'
import coursesData from '../../Data/coursesData.json'
import WeekScheduleSelector from '../../components/WeekScheduleSelector'
import './CourseForm.css'

import { initializeGoogleApi, initializeGIS, authenticate } from '../../services/calendarService'
import calendarService from '../../services/calendarService'
import CIcon from '@coreui/icons-react'
import { cilCalendar, cilUser, cilSettings } from '@coreui/icons'

// Mock data for subject options
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

const CourseForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = !!id

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    subject: '',
    grade: '',
    description: '',
    staff: [], // Ensure this is always an array
    students: [],
    schedule: {
      classDays: [],
      startTime: '08:00',
      endTime: '09:00',
      room: '',
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
  const [teachers, setTeachers] = useState([])
  const [loadingTeachers, setLoadingTeachers] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)

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
            classDays: [],
            startTime: '',
            endTime: '',
            room: '',
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

  // Load teachers from Firebase
  useEffect(() => {
    const loadTeachers = async () => {
      setLoadingTeachers(true)
      try {
        const facultyRef = collection(firestore, 'faculty')
        const facultySnapshot = await getDocs(facultyRef)
        
        const teachersData = facultySnapshot.docs.map(doc => ({
          id: doc.id,
          name: `${doc.data().personalInfo?.firstName || ''} ${doc.data().personalInfo?.lastName || ''}`.trim() || 'Unknown Teacher',
          ...doc.data()
        }))
        
        setTeachers(teachersData)
      } catch (error) {
        console.error('Error loading teachers:', error)
        setError('Failed to load teachers from database')
      } finally {
        setLoadingTeachers(false)
      }
    }

    loadTeachers()
  }, [])

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
    } else if (name === 'staff') {
      // Handle multiple select for staff/instructors
      const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value)
      setFormData({
        ...formData,
        staff: selectedOptions,
      })
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value,
      })
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validate required fields
    if (!formData.title || !formData.subject || !formData.grade) {
      setError('Please fill in all required fields (Title, Subject, and Grade)')
      setLoading(false)
      return
    }

    if (!formData.staff || formData.staff.length === 0) {
      setError('Please select at least one instructor')
      setLoading(false)
      return
    }

    try {
      // Prepare course data for Firebase
      const courseData = {
        title: formData.title,
        name: formData.title, // Firebase uses 'name' field
        subject: formData.subject,
        gradeLevel: formData.grade,
        grade: parseInt(formData.grade.match(/\d+/)?.[0] || 0), // Extract numeric grade
        description: formData.description,
        capacity: formData.capacity,
        enrolledStudents: formData.enrolledStudents || 0,
        materials: formData.materials,
        isActive: formData.isActive,
        academicYear: '2024-2025', // Default academic year
        term: 'Term 1', // Default term
        section: Math.floor(Math.random() * 10000), // Random section number
        courseId: await generateNextCourseId(), // Use proper Tarbiyah course ID
        courseID: '', // Empty courseID as per sample
        budget: {
          accumulatedCost: 0,
          itemList: [],
          totalBudget: 0
        },
        resources: [],
        enrolledList: [],
        students: [], // Will be populated when students enroll
        teacherIds: formData.staff, // Array of teacher IDs
        teachers: formData.staff.map(staffId => {
          const teacher = teachers.find(t => t.id === staffId)
          return {
            name: teacher ? teacher.name : 'Unknown Teacher',
            schoolId: ''
          }
        }),
        teacher: formData.staff.map(staffId => {
          const teacher = teachers.find(t => t.id === staffId)
          return {
            name: teacher ? teacher.name : 'Unknown Teacher',
            schoolId: ''
          }
        }),
        schedule: {
          days: formData.schedule.classDays,
          startTime: formData.schedule.startTime,
          endTime: formData.schedule.endTime,
          location: formData.schedule.room || '',
          daySchedules: formData.schedule.daySchedules || {}
        },
        timestamps: {
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }

      // Try to add to Google Calendar if selected
      if (formData.addToCalendar) {
        try {
          const eventIds = await addToGoogleCalendar(courseData)
          courseData.calendarEventIds = eventIds
        } catch (calendarError) {
          console.error('Failed to add to calendar:', calendarError)
          setError(
            'Course saved, but failed to add to Google Calendar. Please check your Google Calendar configuration.',
          )
        }
      }

      // Save to Firebase
      if (isEditMode) {
        // Update existing course
        const courseRef = doc(firestore, 'courses', id)
        await updateDoc(courseRef, courseData)
        setSuccess('Course updated successfully!')
      } else {
        // Create new course
        const coursesRef = collection(firestore, 'courses')
        const docRef = await addDoc(coursesRef, courseData)
        console.log('Course saved to Firebase with ID:', docRef.id)
        console.log('Course ID generated:', courseData.courseId)
        setSuccess(`Course created successfully with ID: ${courseData.courseId}!`)
      }

      // Navigate back to courses list
      setTimeout(() => {
        navigate('/courses')
      }, 1500)
    } catch (error) {
      console.error('Error saving course:', error)
      setError('Failed to save course. Please try again.')
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
      
      // Check if we have individual day schedules
      if (course.schedule.daySchedules && Object.keys(course.schedule.daySchedules).length > 0) {
        // Use individual day schedules
        for (const [day, daySchedule] of Object.entries(course.schedule.daySchedules)) {
          // Get the next occurrence of this day
          const nextDate = getNextDayOfWeek(new Date(), day)

          // Create event object
          const event = {
            summary: `${course.title} (${course.grade})`,
            description: course.description,
            location: daySchedule.room || course.schedule.location,
            start: {
              dateTime: getDateTimeString(nextDate, daySchedule.startTime),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            end: {
              dateTime: getDateTimeString(nextDate, daySchedule.endTime),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            recurrence: [
              'RRULE:FREQ=WEEKLY;COUNT=16', // 16 weeks (typical semester length)
            ],
            attendees: course.staff.map((staffId) => {
              const teacher = teachers.find(t => t.id === staffId)
              return { email: teacher ? `${teacher.id}@example.com` : `${staffId}@example.com` }
            }),
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'email', minutes: 24 * 60 }, // 1 day before
                { method: 'popup', minutes: 30 }, // 30 minutes before
              ],
            },
          }

          // Create the event
          const result = await calendarService.createEvent('primary', event)
          calendarIds.push(result.id)
        }
      } else {
        // Fallback to old format - use same time for all days
        for (const day of course.schedule.classDays) {
          // Get the next occurrence of this day
          const nextDate = getNextDayOfWeek(new Date(), day)

          // Create event object
          const event = {
            summary: `${course.title} (${course.grade})`,
            description: course.description,
            location: course.schedule.location,
            start: {
              dateTime: getDateTimeString(nextDate, course.schedule.startTime),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            end: {
              dateTime: getDateTimeString(nextDate, course.schedule.endTime),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            recurrence: [
              'RRULE:FREQ=WEEKLY;COUNT=16', // 16 weeks (typical semester length)
            ],
            attendees: course.staff.map((staffId) => {
              const teacher = teachers.find(t => t.id === staffId)
              return { email: teacher ? `${teacher.id}@example.com` : `${staffId}@example.com` }
            }),
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'email', minutes: 24 * 60 }, // 1 day before
                { method: 'popup', minutes: 30 }, // 30 minutes before
              ],
            },
          }

          // Create the event
          const result = await calendarService.createEvent('primary', event)
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

  const handleScheduleSave = (newSchedule) => {
    setFormData({
      ...formData,
      schedule: newSchedule
    })
    setShowScheduleModal(false)
  }

  const handleScheduleCancel = () => {
    setShowScheduleModal(false)
  }

  const getScheduleDisplayText = () => {
    if (formData.schedule.classDays.length === 0) {
      return 'No schedule set'
    }
    
    // Check if we have individual day schedules
    if (formData.schedule.daySchedules && Object.keys(formData.schedule.daySchedules).length > 0) {
      const dayTexts = formData.schedule.classDays.map(day => {
        const daySchedule = formData.schedule.daySchedules[day]
        if (daySchedule) {
          return `${day.substring(0, 3)} ${daySchedule.startTime}-${daySchedule.endTime}`
        }
        return day.substring(0, 3)
      })
      return dayTexts.join(', ')
    }
    
    // Fallback to old format
    const days = formData.schedule.classDays.map(day => day.substring(0, 3)).join(', ')
    return `${days} ${formData.schedule.startTime}-${formData.schedule.endTime}`
  }

  // Generate next course ID following Tarbiyah standard
  const generateNextCourseId = async () => {
    try {
      const coursesRef = collection(firestore, 'courses')
      const coursesSnapshot = await getDocs(coursesRef)
      
      let maxNum = -1
      coursesSnapshot.docs.forEach(doc => {
        const courseData = doc.data()
        const courseId = courseData.courseId || doc.id
        if (typeof courseId === 'string' && courseId.startsWith('TC')) {
          const num = parseInt(courseId.slice(2), 10) // Remove 'TC' prefix
          if (!isNaN(num) && num > maxNum) {
            maxNum = num
          }
        }
      })
      
      const nextNum = maxNum + 1
      return `TC${String(nextNum).padStart(6, '0')}` // e.g., TC000001, TC000002
    } catch (error) {
      console.error('Error generating course ID:', error)
      // Fallback to timestamp if there's an error
      return `TC${String(Date.now()).slice(-6)}`
    }
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
                  <CIcon icon={cilUser} className="me-1" /> Instructors
                </CFormLabel>
                {loadingTeachers ? (
                  <div className="d-flex align-items-center">
                    <CSpinner size="sm" className="me-2" />
                    <span>Loading teachers...</span>
                  </div>
                ) : (
                  <>
                    <CFormSelect
                      id="staff"
                      name="staff"
                      multiple
                      onChange={handleChange}
                      value={formData.staff}
                      size="5"
                    >
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </CFormSelect>
                    <small className="form-text text-muted">
                      Hold Ctrl/Cmd key to select multiple instructors. {teachers.length} teachers available.
                    </small>
                  </>
                )}
              </CCol>

              <CCol md={6}>
                <CFormLabel>
                  Class Schedule
                </CFormLabel>
                <div className="mb-3">
                  <CButton
                    color="outline-primary"
                    onClick={() => setShowScheduleModal(true)}
                    className="w-100"
                  >
                    <CIcon icon={cilCalendar} className="me-2" />
                    {getScheduleDisplayText()}
                  </CButton>
                  {formData.schedule.classDays.length > 0 && (
                    <small className="text-muted">
                      {formData.schedule.classDays.length} day(s) selected
                      {formData.schedule.daySchedules && Object.keys(formData.schedule.daySchedules).length > 0 
                        ? ' • Different times per day'
                        : formData.schedule.room && ` • Room: ${formData.schedule.room}`
                      }
                    </small>
                  )}
                </div>
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>
                  <CIcon icon={cilSettings} className="me-1" /> Course Settings
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

      {/* WeekScheduleSelector Modal */}
      <WeekScheduleSelector
        visible={showScheduleModal}
        onClose={handleScheduleCancel}
        schedule={formData.schedule}
        onSave={handleScheduleSave}
      />
    </div>
  )
}

export default CourseForm
