# Attendance Reminder System

## Overview

The Attendance Reminder System is a comprehensive solution that automatically notifies administrators and teachers when attendance has not been completed by a specified time (default: 9:15 AM). This ensures timely attendance tracking and accountability.

## Features

### 🔔 Automated Reminders
- **Scheduled Notifications**: Automatically sends reminders at 9:15 AM on weekdays
- **Admin Notifications**: Alerts all administrators when attendance is incomplete
- **Teacher Notifications**: Sends friendly reminders to teachers for their specific courses
- **Smart Detection**: Only sends reminders for courses where attendance hasn't been completed

### 📱 SMS Integration
- **Twilio Integration**: Uses existing Twilio SMS service
- **Formatted Messages**: Professional, clear reminder messages
- **Error Handling**: Comprehensive error handling and logging

### 🎛️ Manual Control
- **Reminder Manager**: Web interface for manual reminder management
- **Bulk Operations**: Send reminders for all incomplete courses at once
- **Individual Course Reminders**: Target specific courses for reminders
- **Real-time Status**: Check attendance completion status in real-time

## Components

### 1. AttendanceReminderService (`src/services/attendanceReminderService.js`)
Core service that handles all reminder logic:

```javascript
// Check if attendance is completed
const isCompleted = await AttendanceReminderService.isAttendanceCompleted(courseId, date)

// Send admin reminders
const adminResult = await AttendanceReminderService.sendAdminReminders(course, reminderTime)

// Send teacher reminder
const teacherResult = await AttendanceReminderService.sendTeacherReminder(course, reminderTime)

// Check and send all reminders
const results = await AttendanceReminderService.checkAndSendReminders('9:15 AM')
```

### 2. NotificationService Updates (`src/services/notificationService.js`)
Enhanced with new methods for admin and teacher notifications:

```javascript
// Send admin attendance reminder
await NotificationService.sendAdminAttendanceReminder({
  phoneNumber: admin.phoneNumber,
  adminName: admin.name,
  courseName: course.name,
  teacherName: teacher.name,
  reminderTime: '9:15 AM'
})

// Send teacher attendance reminder
await NotificationService.sendTeacherAttendanceReminder({
  phoneNumber: teacher.phoneNumber,
  teacherName: teacher.name,
  courseName: course.name,
  reminderTime: '9:15 AM'
})
```

### 3. AttendanceReminderManager (`src/views/attendance/AttendanceReminderManager.js`)
Web interface for managing reminders:

- **Time Configuration**: Set custom reminder times
- **Course Selection**: Choose specific courses or all courses
- **Status Monitoring**: Real-time attendance completion status
- **Manual Triggers**: Send reminders on-demand
- **Results Tracking**: Detailed feedback on reminder operations

### 4. Firebase Cloud Function (`functions/index.js`)
Scheduled function that runs automatically:

```javascript
exports.sendAttendanceReminders = functions
  .region('northamerica-northeast1')
  .pubsub.schedule('15 9 * * 1-5') // 9:15 AM on weekdays
  .timeZone('America/Toronto')
  .onRun(async (context) => {
    // Automated reminder logic
  })
```

## Setup Instructions

### 1. Firebase Functions Deployment
Deploy the updated functions to enable scheduled reminders:

```bash
cd functions
npm install
firebase deploy --only functions
```

### 2. Configuration
Ensure the following Firebase collections exist with proper data:

- **`admins`**: Admin users with phone numbers
- **`faculty`**: Teacher users with phone numbers  
- **`courses`**: Course data with teacher assignments
- **`attendance`**: Daily attendance records

### 3. Twilio Configuration
Verify Twilio credentials are set in Firebase Functions:

```bash
firebase functions:config:set twilio.accountsid="YOUR_ACCOUNT_SID"
firebase functions:config:set twilio.authtoken="YOUR_AUTH_TOKEN"
firebase functions:config:set twilio.phonenumber="YOUR_TWILIO_NUMBER"
```

## Usage

### For Administrators

1. **Access Reminder Manager**: Navigate to Attendance → Reminder Manager tab
2. **Set Reminder Time**: Configure the default reminder time (e.g., 9:15 AM)
3. **Check Status**: Use "Check Status" to see which courses need attendance
4. **Send Manual Reminders**: Use "Send All Reminders" for bulk operations
5. **Monitor Results**: View detailed results in the modal

### For Teachers

- Teachers will automatically receive SMS reminders if they haven't completed attendance by the specified time
- Reminders include course name, date, and a friendly message

### For System Administrators

- **Scheduled Function**: Runs automatically at 9:15 AM on weekdays
- **Logs**: Check Firebase Functions logs for detailed execution information
- **Configuration**: Modify the schedule in `functions/index.js` if needed

## Message Templates

### Admin Reminder Message
```
Attendance Reminder: [Course Name] attendance has not been completed by 9:15 AM on [Date]. Teacher: [Teacher Name]. Please follow up.
```

### Teacher Reminder Message
```
Attendance Reminder: Please complete attendance for [Course Name] by 9:15 AM on [Date]. This is a friendly reminder to mark your class attendance.
```

## Security & Permissions

- **Role-based Access**: Only admins and faculty can access the Reminder Manager
- **Phone Number Validation**: All phone numbers are validated and formatted
- **Error Handling**: Comprehensive error handling prevents system failures
- **Logging**: All operations are logged for audit purposes

## Troubleshooting

### Common Issues

1. **No Reminders Sent**
   - Check if courses have assigned teachers
   - Verify phone numbers exist for admins/teachers
   - Ensure Twilio configuration is correct

2. **Function Not Running**
   - Verify Firebase Functions are deployed
   - Check timezone configuration
   - Review Firebase Functions logs

3. **SMS Not Delivered**
   - Verify phone number format (E.164)
   - Check Twilio account status
   - Review Twilio logs for delivery status

### Debug Tools

- **Test Component**: Use `AttendanceReminderTest.js` for testing
- **Console Logs**: Check browser console for detailed error messages
- **Firebase Logs**: Monitor Firebase Functions execution logs

## Future Enhancements

- **Email Notifications**: Add email reminders alongside SMS
- **Custom Schedules**: Allow per-course reminder times
- **Escalation Rules**: Implement escalation for repeated missed attendance
- **Analytics Dashboard**: Track reminder effectiveness and attendance patterns
- **Mobile App Integration**: Push notifications for mobile users

## Support

For technical support or questions about the Attendance Reminder System, please contact the development team or refer to the Firebase Functions logs for detailed execution information. 