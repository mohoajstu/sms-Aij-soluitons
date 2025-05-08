import React, { useState, useEffect } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CForm,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CFormSelect,
  CButton,
  CRow,
  CCol,
  CFormCheck,
  CAlert,
  CSpinner
} from '@coreui/react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import coursesData from '../../Data/coursesData.json';
import calendarService from '../../services/calendarService';

const AssignmentForm = ({ assignmentId = null, onSave = () => {}, onCancel = () => {} }) => {
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    courseId: '',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 1 week from now
    points: 100,
    isMandatory: true,
    addToCalendar: false,
    fileAttachments: [],
    status: 'draft', // draft, published, graded
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(true);

  useEffect(() => {
    // If editing an existing assignment, fetch data
    if (assignmentId) {
      setIsCreating(false);
      // Simulating API call to get assignment details
      // In a real app, this would be an API call
      const assignment = {
        id: assignmentId,
        title: 'Sample Assignment',
        description: 'This is a sample assignment for demonstration purposes.',
        courseId: coursesData[0]?.id || '',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        points: 100,
        isMandatory: true,
        addToCalendar: false,
        fileAttachments: [],
        status: 'draft',
      };
      
      setFormData(assignment);
    }
  }, [assignmentId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDateChange = (date) => {
    setFormData(prevData => ({
      ...prevData,
      dueDate: date
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    setFormData(prevData => ({
      ...prevData,
      fileAttachments: [...prevData.fileAttachments, ...files]
    }));
  };

  const removeFile = (index) => {
    setFormData(prevData => ({
      ...prevData,
      fileAttachments: prevData.fileAttachments.filter((_, i) => i !== index)
    }));
  };

  const addToGoogleCalendar = async (assignment) => {
    try {
      // Initialize and authenticate with Google Calendar
      await calendarService.initializeGoogleApi();
      await calendarService.initializeGIS();
      await calendarService.authenticate();
      
      // Create event object
      const event = {
        summary: `Assignment: ${assignment.title}`,
        description: assignment.description,
        start: {
          dateTime: new Date(assignment.dueDate).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(new Date(assignment.dueDate).getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 } // 1 hour before
          ]
        }
      };
      
      // Create the event
      const result = await calendarService.createEvent('primary', event);
      console.log('Event created: ', result.id);
      return result.id;
    } catch (error) {
      console.error('Error adding event to Google Calendar:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Generate unique ID for new assignments
      const updatedFormData = {
        ...formData,
        id: formData.id || `assignment_${Date.now()}`
      };
      
      // Try to add to Google Calendar if selected
      if (formData.addToCalendar) {
        try {
          const eventId = await addToGoogleCalendar(updatedFormData);
          updatedFormData.calendarEventId = eventId;
        } catch (calendarError) {
          // Continue with save even if calendar fails
          console.error('Failed to add to calendar, but saving assignment:', calendarError);
          setError('Assignment saved, but failed to add to Google Calendar.');
        }
      }
      
      // In a real app, this would be an API call
      console.log('Saving assignment:', updatedFormData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(isCreating ? 'Assignment created successfully!' : 'Assignment updated successfully!');
      onSave(updatedFormData);
    } catch (error) {
      console.error('Error saving assignment:', error);
      setError('Failed to save assignment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CCard>
      <CCardHeader>
        <h4>{isCreating ? 'Create New Assignment' : 'Edit Assignment'}</h4>
      </CCardHeader>
      <CCardBody>
        {error && <CAlert color="danger">{error}</CAlert>}
        {success && <CAlert color="success">{success}</CAlert>}
        
        <CForm onSubmit={handleSubmit}>
          <CRow className="mb-3">
            <CCol md={8}>
              <CFormLabel htmlFor="title">Assignment Title</CFormLabel>
              <CFormInput
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="Enter assignment title"
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel htmlFor="courseId">Course</CFormLabel>
              <CFormSelect
                id="courseId"
                name="courseId"
                value={formData.courseId}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a course</option>
                {coursesData.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>
          
          <CRow className="mb-3">
            <CCol>
              <CFormLabel htmlFor="description">Description</CFormLabel>
              <CFormTextarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={5}
                placeholder="Enter assignment instructions and details"
              />
            </CCol>
          </CRow>
          
          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel htmlFor="dueDate">Due Date</CFormLabel>
              <DatePicker
                selected={formData.dueDate}
                onChange={handleDateChange}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                timeCaption="Time"
                dateFormat="MMMM d, yyyy h:mm aa"
                className="form-control"
                required
              />
            </CCol>
            <CCol md={3}>
              <CFormLabel htmlFor="points">Points</CFormLabel>
              <CFormInput
                type="number"
                id="points"
                name="points"
                value={formData.points}
                onChange={handleInputChange}
                min={0}
                max={1000}
                required
              />
            </CCol>
            <CCol md={3}>
              <CFormLabel htmlFor="status">Status</CFormLabel>
              <CFormSelect
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="graded">Graded</option>
              </CFormSelect>
            </CCol>
          </CRow>
          
          <CRow className="mb-3">
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="fileAttachments">Attachments</CFormLabel>
                <CFormInput
                  type="file"
                  id="fileAttachments"
                  onChange={handleFileChange}
                  multiple
                />
                <small className="text-muted">Attach any relevant files for this assignment.</small>
              </div>
              
              {formData.fileAttachments.length > 0 && (
                <div className="mt-2">
                  <strong>Attached Files:</strong>
                  <ul className="list-group mt-2">
                    {formData.fileAttachments.map((file, index) => (
                      <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                        {file.name}
                        <CButton
                          color="danger"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                        >
                          Remove
                        </CButton>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CCol>
            
            <CCol md={6} className="d-flex flex-column justify-content-end">
              <div className="mb-3">
                <CFormCheck
                  id="isMandatory"
                  name="isMandatory"
                  label="This assignment is mandatory"
                  checked={formData.isMandatory}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="mb-3">
                <CFormCheck
                  id="addToCalendar"
                  name="addToCalendar"
                  label="Add to Google Calendar"
                  checked={formData.addToCalendar}
                  onChange={handleInputChange}
                />
                <small className="text-muted d-block mt-1">
                  This will create a calendar event with the due date for this assignment.
                </small>
              </div>
            </CCol>
          </CRow>
          
          <div className="d-flex justify-content-end gap-2 mt-4">
            <CButton color="secondary" onClick={onCancel}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  {isCreating ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                isCreating ? 'Create Assignment' : 'Update Assignment'
              )}
            </CButton>
          </div>
        </CForm>
      </CCardBody>
    </CCard>
  );
};

export default AssignmentForm; 