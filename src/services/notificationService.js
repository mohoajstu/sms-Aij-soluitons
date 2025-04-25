import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

// The HTTP endpoint URL for the SMS service
const SMS_API_URL = 'https://northamerica-northeast1-tarbiyah-sms.cloudfunctions.net/api/send-sms';
const HEALTH_CHECK_URL = 'https://northamerica-northeast1-tarbiyah-sms.cloudfunctions.net/api/healthcheck';

/**
 * Service for handling attendance-related notifications
 */
const NotificationService = {
  /**
   * Manually send an absence notification to a parent
   * 
   * @param {Object} data Notification data
   * @param {string} data.phoneNumber Parent's phone number
   * @param {string} data.studentName Student's name
   * @param {string} data.className Class name
   * @param {string} data.date Date of absence
   * @param {string} [data.attendanceId] Optional ID of attendance record
   * @returns {Promise<Object>} Result of the function call
   */
  sendAbsenceNotification: async (data) => {
    try {
      console.log('Attempting to send notification with data:', {
        phoneNumber: data.phoneNumber,
        studentName: data.studentName,
        className: data.className,
        date: data.date
      });
      
      // Validate required fields
      if (!data.phoneNumber) throw new Error('Phone number is required');
      if (!data.studentName) throw new Error('Student name is required');
      
      // First try using the direct HTTP endpoint to avoid CORS issues
      try {
        const response = await fetch(SMS_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          credentials: 'omit',
          mode: 'cors',
          body: JSON.stringify({
            phoneNumber: data.phoneNumber,
            studentName: data.studentName,
            className: data.className,
            date: data.date
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.message || 
            `HTTP error! status: ${response.status}`
          );
        }
        
        const result = await response.json();
        console.log('SMS notification sent via HTTP endpoint:', result);
        return result;
      } catch (httpError) {
        console.warn('HTTP endpoint failed, falling back to Firebase function:', httpError);
        
        // Fall back to Firebase function if HTTP endpoint fails
        const manualSendNotification = httpsCallable(functions, 'manualSendAbsenceNotification');
        const result = await manualSendNotification(data);
        console.log('SMS notification response from Firebase function:', result.data);
        return result.data;
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      
      // Provide more helpful error messages for network errors
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Could not connect to the SMS service. Please check your internet connection.');
      }
      
      // Handle Firebase function errors
      if (error.code === 'functions/unauthenticated') {
        throw new Error('Authentication required to send SMS notifications');
      } else if (error.code === 'functions/invalid-argument') {
        throw new Error('Invalid information provided. Please check all fields.');
      } else if (error.code === 'functions/internal') {
        throw new Error('Twilio error: ' + (error.message || 'Failed to send SMS'));
      }
      
      throw error;
    }
  },

  /**
   * Check if SMS notifications are configured correctly
   * 
   * @returns {Promise<boolean>} Whether SMS notifications are configured
   */
  checkSmsConfiguration: async () => {
    try {
      // First check if our new health check endpoint is responding
      try {
        const healthResponse = await fetch(HEALTH_CHECK_URL, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors',
          credentials: 'omit',
          timeout: 5000 // 5 second timeout
        });
        
        if (healthResponse.ok) {
          console.log('SMS service health check passed');
          return true;
        }
      } catch (healthCheckError) {
        console.warn('Health check failed, trying function call:', healthCheckError);
      }
      
      // Fall back to using the Firebase function
      try {
        const checkConfig = httpsCallable(functions, 'checkSmsConfiguration');
        const result = await checkConfig();
        return result.data?.configured === true;
      } catch (functionError) {
        console.error('Failed to check configuration via function call:', functionError);
        return false;
      }
    } catch (error) {
      console.error('Error checking SMS configuration:', error);
      return false;
    }
  }
};

export default NotificationService; 