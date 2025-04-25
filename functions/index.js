const functions = require('firebase-functions');
const admin = require('firebase-admin');
const twilio = require('twilio');
const cors = require('cors')({ origin: true });
const express = require('express');
const bodyParser = require('body-parser');

admin.initializeApp();

// Initialize Twilio client with environment variables
const twilioClient = twilio(
  functions.config().twilio.accountsid,
  functions.config().twilio.authtoken
);

const twilioPhoneNumber = functions.config().twilio.phonenumber;

// Express app for handling HTTP requests with proper listeners
const app = express();
app.use(cors);
app.use(bodyParser.json());

// Helper function to check SMS configuration
exports.checkSmsConfiguration = functions
  .region('northamerica-northeast1')
  .https.onCall(async (data, context) => {
  try {
    // Basic check if Twilio credentials are configured
    if (!functions.config().twilio.accountsid || 
        !functions.config().twilio.authtoken || 
        !functions.config().twilio.phonenumber) {
      return { configured: false, message: 'Twilio configuration is missing' };
    }
    
    return { configured: true };
  } catch (error) {
    console.error('Error checking SMS configuration:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Firebase function that sends SMS notifications to parents
 * when their child is marked absent in the attendance system
 */
exports.sendAbsenceNotification = functions
  .region('northamerica-northeast1')
  .firestore
  .document('attendance/{attendanceId}')
  .onCreate(async (snap, context) => {
    try {
      const attendanceData = snap.data();
      
      // Only send notification if student is marked as absent
      if (attendanceData.status !== 'Absent') {
        console.log('Student is not absent, no notification needed');
        return null;
      }
      
      // Get student information from the attendance record
      const studentId = attendanceData.studentId;
      
      // Get student details from Firestore
      const studentDoc = await admin.firestore()
        .collection('students')
        .doc(studentId)
        .get();
        
      if (!studentDoc.exists) {
        console.error(`Student with ID ${studentId} not found`);
        return null;
      }
      
      const studentData = studentDoc.data();
      
      // Get parent contact information
      const parentPhoneNumber = studentData.parentPhoneNumber;
      
      if (!parentPhoneNumber) {
        console.error(`No parent phone number found for student ${studentId}`);
        return null;
      }
      
      // Format the date for the message
      const date = attendanceData.date ? new Date(attendanceData.date) : new Date();
      const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
      
      // Class/course information
      const className = attendanceData.class || attendanceData.course || 'school';
      
      // Create the SMS message
      const message = `Attendance Alert: ${studentData.name} was marked absent from ${className} on ${formattedDate}. Please contact the school for more information.`;
      
      // Send SMS via Twilio
      const result = await twilioClient.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: parentPhoneNumber
      });
      
      console.log(`SMS notification sent to ${parentPhoneNumber}, SID: ${result.sid}`);
      
      // Update the attendance record with notification status
      await snap.ref.update({
        notificationSent: true,
        notificationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        notificationSid: result.sid
      });
      
      return result.sid;
      
    } catch (error) {
      console.error('Error sending SMS notification:', error);
      return null;
    }
  });

/**
 * Helper function to manually send notifications
 * Can be triggered via HTTP request for testing or fallback
 */
exports.manualSendAbsenceNotification = functions
  .region('northamerica-northeast1')
  .https.onCall(async (data, context) => {
  // Temporarily allowing unauthenticated access for testing purposes
  // In production, uncomment the authentication check below
  /*
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }
  */
  
  try {
    const { attendanceId, phoneNumber, studentName, className, date } = data;
    
    if (!phoneNumber || !studentName) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'The function requires phoneNumber and studentName parameters.'
      );
    }
    
    console.log('Manual SMS request received:', { phoneNumber, studentName, className, date });
    
    const formattedDate = date ? new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    }) : new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
    
    // Create the SMS message
    const message = `Attendance Alert: ${studentName} was marked absent from ${className || 'school'} on ${formattedDate}. Please contact the school for more information.`;
    
    console.log('Attempting to send SMS with message:', message);
    
    // Send SMS via Twilio
    const result = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: phoneNumber
    });
    
    console.log('SMS sent successfully, SID:', result.sid);
    
    // If an attendance ID was provided, update the record
    if (attendanceId) {
      await admin.firestore()
        .collection('attendance')
        .doc(attendanceId)
        .update({
          notificationSent: true,
          notificationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
          notificationSid: result.sid
        });
    }
    
    return { success: true, sid: result.sid, message: message };
    
  } catch (error) {
    console.error('Error in manual notification:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Create a new route for sending SMS via HTTP
app.post('/send-sms', async (req, res) => {
  try {
    const { phoneNumber, studentName, className, date } = req.body;

    if (!phoneNumber || !studentName) {
      return res.status(400).send({
        error: 'Bad Request',
        message: 'phoneNumber and studentName are required',
      });
    }

    const formattedDate = date
      ? new Date(date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

    const message = `Attendance Alert: ${studentName} was marked absent from ${className || 'school'} on ${formattedDate}. Please contact the school for more information.`;

    const result = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: phoneNumber,
    });

    console.log('SMS sent successfully via HTTP endpoint, SID:', result.sid);

    return res.status(200).send({
      success: true,
      sid: result.sid,
      message: message,
    });
  } catch (error) {
    console.error('Error in HTTP SMS endpoint:', error);
    return res.status(500).send({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

// A healthcheck endpoint to make sure the service is running
app.get('/healthcheck', (req, res) => {
  res.status(200).send({ status: 'ok' });
});

// Default route
app.get('/', (req, res) => {
  res.status(200).send('SMS Notification Service is running');
});

// Options route for CORS preflight requests
app.options('*', cors);

// Export the Express app as your Cloud Function
exports.api = functions
  .region('northamerica-northeast1')
  .https.onRequest(app);

// Backward compatibility with existing code that calls sendSmsHttp directly
exports.sendSmsHttp = functions
  .region('northamerica-northeast1')
  .https.onRequest((request, response) => {
  // Set CORS headers
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }
  
  // For actual requests, forward to the Express app
  return app(request, response);
});
  