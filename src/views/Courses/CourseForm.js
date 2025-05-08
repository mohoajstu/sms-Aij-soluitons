import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  CInputGroupText
} from '@coreui/react';
import coursesData from '../../Data/coursesData.json';
import './CourseForm.css';
import { cilClock, cilUser, cilSettings, cilCalendar } from '@coreui/icons-react';
import { initializeGoogleApi, initializeGIS, authenticate } from '../../services/calendarService';

// Mock data for instructor options
const INSTRUCTORS = [
  { id: '1', name: 'Ahmed Abdullah' },
  { id: '2', name: 'Sara Khan' },
  { id: '3', name: 'Muhammad Ali' },
  { id: '4', name: 'Fatima Zahra' },
];

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
];

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
];

// Days of the week for class scheduling
const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const CourseForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    subject: '',
    grade: '',
    description: '',
    staff: [],
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
  });

  const [newStaffMember, setNewStaffMember] = useState('');
  const [newStudent, setNewStudent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(true);
  const [materialInput, setMaterialInput] = useState('');
  const [isGoogleCalendarReady, setIsGoogleCalendarReady] = useState(false);

  // If in edit mode, load existing course data
  useEffect(() => {
    if (isEditMode) {
      const courseId = Number(id);
      const course = coursesData.find(c => c.id === courseId);
      
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
        });
        setIsCreating(false);
      } else {
        setError('Course not found');
      }
    }
  }, [id, isEditMode]);

  useEffect(() => {
    const initializeGoogleCalendar = async () => {
      try {
        await initializeGoogleApi();
        await initializeGIS();
        setIsGoogleCalendarReady(true);
      } catch (error) {
        console.error('Failed to initialize Google Calendar:', error);
      }
    };

    initializeGoogleCalendar();
  }, []);

  const handleGoogleCalendarAuth = async () => {
    try {
      await authenticate();
      // After successful authentication, you can proceed with calendar operations
      console.log('Successfully authenticated with Google Calendar');
    } catch (error) {
      console.error('Failed to authenticate with Google Calendar:', error);
      setError('Failed to authenticate with Google Calendar. Please try again.');
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle nested fields
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  // Handle class days selection (multiple)
  const handleClassDaysChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
    setFormData({
      ...formData,
      schedule: {
        ...formData.schedule,
        classDays: selectedOptions
      }
    });
  };

  // Add new staff member
  const handleAddStaff = () => {
    if (newStaffMember.trim() === '') return;
    
    setFormData({
      ...formData,
      staff: [...formData.staff, newStaffMember.trim()]
    });
    
    setNewStaffMember('');
  };

  // Remove staff member
  const handleRemoveStaff = (index) => {
    const updatedStaff = [...formData.staff];
    updatedStaff.splice(index, 1);
    
    setFormData({
      ...formData,
      staff: updatedStaff
    });
  };

  // Add new student
  const handleAddStudent = () => {
    if (newStudent.trim() === '') return;
    
    setFormData({
      ...formData,
      students: [...formData.students, newStudent.trim()]
    });
    
    setNewStudent('');
  };

  // Remove student
  const handleRemoveStudent = (index) => {
    const updatedStudents = [...formData.students];
    updatedStudents.splice(index, 1);
    
    setFormData({
      ...formData,
      students: updatedStudents
    });
  };

  const addMaterial = () => {
    if (materialInput.trim()) {
      setFormData(prevData => ({
        ...prevData,
        materials: [...prevData.materials, materialInput.trim()]
      }));
      setMaterialInput('');
    }
  };

  const removeMaterial = (index) => {
    setFormData(prevData => ({
      ...prevData,
      materials: prevData.materials.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Generate unique ID for new courses
      const updatedFormData = {
        ...formData,
        id: formData.id || `course_${Date.now()}`
      };
      
      // Try to add to Google Calendar if selected
      if (formData.addToCalendar) {
        try {
          const eventIds = await addToGoogleCalendar(updatedFormData);
          updatedFormData.calendarEventIds = eventIds;
        } catch (calendarError) {
          // Continue with save even if calendar fails
          console.error('Failed to add to calendar:', calendarError);
          setError('Course saved, but failed to add to Google Calendar. Please check your Google Calendar configuration.');
        }
      }
      
      // In a real app, this would be an API call
      console.log('Saving course:', updatedFormData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(isCreating ? 'Course created successfully!' : 'Course updated successfully!');
      navigate('/courses');
    } catch (error) {
      console.error('Error saving course:', error);
      setError('Failed to save course. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addToGoogleCalendar = async (course) => {
    try {
      // Initialize and authenticate with Google Calendar
      await initializeGoogleApi();
      await initializeGIS();
      await authenticate();
      
      // Create recurring events for each class day
      const calendarIds = [];
      for (const day of course.schedule.classDays) {
        // Get the next occurrence of this day
        const nextDate = getNextDayOfWeek(new Date(), day);
        
        // Create event object
        const event = {
          summary: `${course.title} (${course.grade})`,
          description: course.description,
          location: course.schedule.room,
          start: {
            dateTime: getDateTimeString(nextDate, course.schedule.startTime),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: getDateTimeString(nextDate, course.schedule.endTime),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          recurrence: [
            'RRULE:FREQ=WEEKLY;COUNT=16' // 16 weeks (typical semester length)
          ],
          attendees: INSTRUCTORS
            .filter(instructor => course.staff.includes(instructor.id))
            .map(instructor => ({ email: `${instructor.id}@example.com` })), // Mock emails
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 }, // 1 day before
              { method: 'popup', minutes: 30 } // 30 minutes before
            ]
          }
        };
        
        // Create the event
        const result = await calendarService.createEvent('primary', event);
        calendarIds.push(result.id);
      }
      
      return calendarIds;
    } catch (error) {
      console.error('Error adding events to Google Calendar:', error);
      throw error;
    }
  };

  // Helper function to get the next occurrence of a specific day of the week
  const getNextDayOfWeek = (date, dayName) => {
    const days = { 
      Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, 
      Thursday: 4, Friday: 5, Saturday: 6 
    };
    const dayOfWeek = days[dayName];
    const resultDate = new Date(date.getTime());
    resultDate.setDate(date.getDate() + (7 + dayOfWeek - date.getDay()) % 7);
    
    return resultDate;
  };

  // Helper function to format date and time for Google Calendar
  const getDateTimeString = (date, timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(date.getTime());
    result.setHours(hours, minutes, 0, 0);
    
    return result.toISOString();
  };

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
                  {SUBJECTS.map(subject => (
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
                  {GRADES.map(grade => (
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
                  <cilUser className="me-1" /> Instructors
                </CFormLabel>
                <CFormSelect
                  id="staff"
                  multiple
                  onChange={handleChange}
                  value={formData.staff}
                  size="5"
                >
                  {INSTRUCTORS.map(instructor => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.name}
                    </option>
                  ))}
                </CFormSelect>
                <small className="form-text text-muted">
                  Hold Ctrl/Cmd key to select multiple instructors
                </small>
              </CCol>
              
              <CCol md={6}>
                <CFormLabel>
                  <cilClock className="me-1" /> Class Schedule
                </CFormLabel>
                <div className="mb-3 d-flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <CFormCheck
                      key={day}
                      id={`day-${day}`}
                      label={day.substring(0, 3)}
                      checked={formData.schedule.classDays.includes(day)}
                      onChange={() => handleChange({ target: { name: 'schedule.classDays', value: day } })}
                      inline
                    />
                  ))}
                </div>
                
                <CRow className="g-2 mb-3">
                  <CCol>
                    <CFormLabel htmlFor="startTime">Start Time</CFormLabel>
                    <CFormInput
                      type="time"
                      id="startTime"
                      name="schedule.startTime"
                      value={formData.schedule.startTime}
                      onChange={handleChange}
                      required
                    />
                  </CCol>
                  <CCol>
                    <CFormLabel htmlFor="endTime">End Time</CFormLabel>
                    <CFormInput
                      type="time"
                      id="endTime"
                      name="schedule.endTime"
                      value={formData.schedule.endTime}
                      onChange={handleChange}
                      required
                    />
                  </CCol>
                  <CCol>
                    <CFormLabel htmlFor="room">Room</CFormLabel>
                    <CFormInput
                      type="text"
                      id="room"
                      name="schedule.room"
                      value={formData.schedule.room}
                      onChange={handleChange}
                      placeholder="e.g., Room 101"
                    />
                  </CCol>
                </CRow>
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
                  <cilCalendar className="me-1" /> Course Materials
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
                      <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
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
                ) : (
                  isCreating ? 'Create Course' : 'Update Course'
                )}
              </CButton>
            </div>
          </CForm>
        </CCardBody>
      </CCard>
    </div>
  );
};

export default CourseForm; 