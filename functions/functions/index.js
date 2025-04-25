const functions = require("firebase-functions");
const admin = require("firebase-admin");
const twilio = require("twilio");
const cors = require("cors")({ origin: true });

admin.initializeApp();

const REGION = "northamerica-northeast1"; // Match your Firebase project settings

// Your twilio setup
const twilioClient = twilio(
  functions.config().twilio.accountsid,
  functions.config().twilio.authtoken
);

const twilioPhoneNumber = functions.config().twilio.phonenumber;
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

/**
 * Firebase function that sends SMS notifications to parents
 * when their child is marked absent in the attendance system
 */
exports.sendAbsenceNotification = onDocumentCreated("attendance/{attendanceId}", async (event) => {
    const snap = event.data;
    const context = event;
  
    if (!snap) {
      console.error("No data found in Firestore event");
      return;
    }

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
exports.manualSendAbsenceNotification = functions.https.onCall(async (data, context) => {
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

/**
 * HTTP endpoint to send SMS notifications with CORS support
 * This is primarily for testing from local development environments
 */
exports.sendSmsHttp = functions.https.onRequest((request, response) => {
    // Manually set CORS headers for ALL requests
    response.set('Access-Control-Allow-Origin', 'http://localhost:3000'); // or '*'
    response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type');
  
    // Handle preflight (OPTIONS) request early and return
    if (request.method === 'OPTIONS') {
      return response.status(204).send('');
    }
  
    // Continue inside CORS wrapper for actual POST requests
    return cors(request, response, async () => {
      try {
        if (request.method !== 'POST') {
          return response.status(405).send({
            error: 'Method Not Allowed',
            message: 'Only POST requests are allowed',
          });
        }
  
        const { phoneNumber, studentName, className, date } = request.body;
  
        if (!phoneNumber || !studentName) {
          return response.status(400).send({
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
  
        return response.status(200).send({
          success: true,
          sid: result.sid,
          message: message,
        });
      } catch (error) {
        console.error('Error in HTTP SMS endpoint:', error);
        return response.status(500).send({
          error: 'Internal Server Error',
          message: error.message,
        });
      }
    });
  });
  