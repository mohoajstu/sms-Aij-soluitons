import React, { useState } from 'react';
import {
  CCard,
  CCardHeader,
  CCardBody,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CButton,
  CSpinner,
  CAlert,
  CRow,
  CCol,
  CBadge
} from '@coreui/react';
import NotificationService from '../../services/notificationService';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const ManualSmsNotification = () => {
  const [formData, setFormData] = useState({
    phoneNumber: '',
    studentName: '',
    className: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', color: 'success' });
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAlert({ show: false, message: '', color: 'success' });
    setErrorMessage('');

    try {
      // Validate the phone number
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(formData.phoneNumber)) {
        throw new Error('Please enter a valid phone number in E.164 format (e.g., +1XXXXXXXXXX)');
      }

      // Check if SMS configuration is working first
      const isConfigured = await NotificationService.checkSmsConfiguration();
      if (!isConfigured) {
        throw new Error('SMS service is not properly configured. Please check network connectivity and CORS settings.');
      }

      // Send SMS notification
      const result = await NotificationService.sendAbsenceNotification({
        phoneNumber: formData.phoneNumber,
        studentName: formData.studentName,
        className: formData.className,
        date: formData.date
      });

      if (result && result.success) {
        setAlert({
          show: true,
          message: `SMS notification sent successfully!`,
          color: 'success'
        });
        toast.success('SMS notification sent successfully!');
      } else {
        throw new Error(result?.message || 'Failed to send SMS notification');
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      
      // Determine if it's a CORS error
      if (error.message && (
          error.message.includes('CORS') || 
          error.message.includes('Cross-Origin') ||
          error.message.includes('Access-Control-Allow-Origin'))) {
        setErrorMessage('Cross-Origin (CORS) error: The SMS service is not accessible from this domain. Please check your CORS configuration in the backend.');
      } else {
        setErrorMessage(error.message || 'Failed to send SMS notification. Please try again later.');
      }
      
      setAlert({
        show: true,
        message: 'Failed to send SMS notification. See details below.',
        color: 'danger'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <h4>Send Test SMS Notification</h4>
        <CBadge color="primary">Direct API Connection</CBadge>
      </CCardHeader>
      <CCardBody>
        {alert.show && (
          <CAlert color={alert.color} dismissible onClose={() => setAlert({ ...alert, show: false })}>
            {alert.message}
          </CAlert>
        )}

        <div className="mb-4 p-3 bg-light rounded">
          <h5 className="text-primary">🔧 Using Direct HTTP Connection</h5>
          <p className="mb-0">
            This form now uses a direct HTTP connection to the SMS service, with improved CORS handling.
            Your SMS should send properly now!
          </p>
        </div>

        {errorMessage && (
          <CAlert color="danger" className="mb-4">
            <h5>Error Details:</h5>
            <p className="mb-0">{errorMessage}</p>
          </CAlert>
        )}

        <CForm onSubmit={handleSubmit}>
          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel htmlFor="phoneNumber">Your Phone Number</CFormLabel>
              <CFormInput
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="+1XXXXXXXXXX"
                required
              />
              <small className="form-text text-muted">
                Enter your phone number in E.164 format (e.g., +1XXXXXXXXXX)
              </small>
            </CCol>
            
            <CCol md={6}>
              <CFormLabel htmlFor="studentName">Student Name (Test)</CFormLabel>
              <CFormInput
                type="text"
                id="studentName"
                name="studentName"
                value={formData.studentName}
                onChange={handleChange}
                placeholder="John Doe"
                required
              />
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel htmlFor="className">Class Name (Test)</CFormLabel>
              <CFormInput
                type="text"
                id="className"
                name="className"
                value={formData.className}
                onChange={handleChange}
                placeholder="Math 101"
                required
              />
            </CCol>
            
            <CCol md={6}>
              <CFormLabel htmlFor="date">Absence Date</CFormLabel>
              <CFormInput
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </CCol>
          </CRow>

          <div className="d-flex justify-content-between">
            <div className="bg-light p-3 mb-3 rounded">
              <h5>Test SMS Preview</h5>
              <p className="mb-1">
                <strong>To:</strong> {formData.phoneNumber || '[your phone number]'}
              </p>
              <p className="mb-1">
                <strong>Message:</strong> Attendance Alert: {formData.studentName || '[student name]'} was marked absent from {formData.className || '[class name]'} on {new Date(formData.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) || '[date]'}. Please contact the school for more information.
              </p>
            </div>
          </div>

          <div className="d-grid gap-2 d-md-flex justify-content-md-end">
            <CButton 
              type="submit" 
              color="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <CSpinner size="sm" className="me-2" /> Sending...
                </>
              ) : (
                "Send Test SMS"
              )}
            </CButton>
          </div>
        </CForm>
      </CCardBody>
    </CCard>
  );
};

export default ManualSmsNotification; 