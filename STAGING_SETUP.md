# Staging Environment Setup

This document explains how to configure the staging environment, including:
- Disabling real side effects (emails/SMS) in staging
- Setting up separate frontend Firebase configs
- Test tagging for staging data
- Registration endpoint for load testing

## Overview

When running in staging mode, the application will:
- ✅ Skip sending real SMS messages (logs what would have been sent)
- ✅ Skip sending real emails (logs what would have been sent)
- ✅ Still process all logic and return success responses
- ✅ Log all skipped operations with `🚧 STAGING MODE` prefix

## Setup Instructions

### Method 1: Using Firebase Functions Config (Recommended)

This is the preferred method as it's more explicit and easier to manage.

#### Step 1: Switch to staging project
```bash
firebase use staging
```

#### Step 2: Set the staging environment variable
```bash
firebase functions:config:set app.env="staging"
```

#### Step 3: Deploy functions
```bash
firebase deploy --only functions
```

#### Step 4: Verify the config
```bash
firebase functions:config:get
```

You should see:
```json
{
  "app": {
    "env": "staging"
  }
}
```

### Method 2: Using Project ID Check (Automatic Fallback)

If the Functions config is not set, the system will automatically check if the project ID contains "staging". This works automatically based on your `.firebaserc` configuration:

```json
{
  "projects": {
    "staging": "tarbiyah-sms-staging"
  }
}
```

If your staging project ID includes "staging", it will be detected automatically.

### Client-Side Email Staging Check

For client-side email sending (EmailJS), the staging check uses:
1. **Project ID check**: If `VITE_FIREBASE_PROJECT_ID` contains "staging"
2. **Environment variable**: If `VITE_ENV` is set to "staging"

To enable staging mode for client-side:
```bash
# In your .env file or environment
VITE_ENV=staging
# OR ensure your staging project ID includes "staging"
VITE_FIREBASE_PROJECT_ID=tarbiyah-sms-staging
```

## Testing

### Verify Staging Mode is Active

1. **Check Cloud Functions logs**:
   ```bash
   firebase functions:log
   ```
   Look for `🚧 STAGING MODE` messages when SMS/emails would be sent.

2. **Test SMS sending**:
   - Trigger an attendance SMS
   - Check logs for: `🚧 STAGING MODE: Skipping SMS to...`
   - Response should include `staging: true` or `sid: 'staging-skip'`

3. **Test email sending**:
   - Send acceptance emails from the registration dashboard
   - Check browser console for: `🚧 STAGING MODE: Skipping email to...`

### Production Mode

To disable staging mode and enable real SMS/emails:

```bash
# Switch to production
firebase use prod

# Remove staging config (or set to production)
firebase functions:config:unset app.env
# OR
firebase functions:config:set app.env="production"

# Deploy
firebase deploy --only functions
```

## Implementation Details

### Cloud Functions (Backend)

The staging check is implemented in `functions/index.js`:

```javascript
function isStaging() {
  // Method 1: Check Functions config (preferred)
  const env = functions.config().app?.env
  if (env === 'staging') {
    return true
  }
  
  // Method 2: Fallback to project ID check
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT
  if (projectId && projectId.includes('staging')) {
    return true
  }
  
  return false
}
```

All SMS sending operations check `isStaging()` before sending:
- `sendScheduledSms` - Scheduled attendance SMS
- `sendSmsHttp` - HTTP endpoint for SMS
- `triggerAttendanceSms` - Manual SMS trigger

### Client-Side (Frontend)

The staging check for emails is in `src/views/registration/SendAcceptanceEmailModal.js`:

```javascript
function isStaging() {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
  if (projectId && projectId.includes('staging')) {
    return true
  }
  
  if (import.meta.env.VITE_ENV === 'staging') {
    return true
  }
  
  return false
}
```

## Frontend Configuration (Vite)

### Step 1: Create Environment Files

Create two environment files based on the examples:

```bash
# Copy example files
cp .env.production.example .env.production
cp .env.staging.example .env.staging
```

### Step 2: Get Firebase Config Values

**For Production:**
1. Go to Firebase Console → Your Production Project
2. Project Settings → General → Your apps → Web app
3. Copy the config values to `.env.production`

**For Staging:**
1. Go to Firebase Console → Your Staging Project (e.g., `tarbiyah-sms-staging`)
2. Project Settings → General → Your apps → Web app
3. If you don't have a web app, click `</> Add app`
4. Copy the config values to `.env.staging`

### Step 3: Run in Staging Mode

```bash
# Development with staging config
npm run dev:staging
# OR
vite --mode staging

# Build for staging
npm run build:staging
```

The app will automatically use the staging Firebase project when running in staging mode.

## Test Tagging for Staging Data

All data created in staging is automatically tagged with:
- `isTest: true`
- `env: "staging"`
- `createdAt: serverTimestamp()`

This makes it easy to:
- **Query staging data**: `where('isTest', '==', true)`
- **Clean up test data**: Delete all documents with `isTest: true`
- **Prevent confusion**: Clearly identify test vs production data

### Example Cleanup Query

```javascript
// Delete all staging registrations
const stagingRegistrations = await db.collection('registrations')
  .where('isTest', '==', true)
  .where('env', '==', 'staging')
  .get()

const batch = db.batch()
stagingRegistrations.docs.forEach(doc => batch.delete(doc.ref))
await batch.commit()
```

## Registration Endpoint for Load Testing

A dedicated Cloud Function endpoint is available for k6 load testing:

### Endpoint
```
POST https://northamerica-northeast1-{project-id}.cloudfunctions.net/registerStudent
```

### Request Body
```json
{
  "schoolYear": "2026-2027",
  "grade": "Grade 1",
  "student": {
    "firstName": "John",
    "lastName": "Doe",
    "gender": "male",
    "dateOfBirth": "2015-01-01"
  },
  "contact": {
    "primaryEmail": "parent@example.com",
    "primaryPhone": "+1234567890",
    "emergencyPhone": "+1234567891",
    "studentAddress": "123 Main St"
  },
  "primaryGuardian": {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "parent@example.com",
    "phone": "+1234567890",
    "address": "123 Main St"
  }
}
```

### Response
```json
{
  "success": true,
  "registrationId": "TLR00001",
  "message": "Registration saved successfully",
  "staging": true
}
```

### Testing with cURL

```bash
curl -X POST \
  https://northamerica-northeast1-tarbiyah-sms-staging.cloudfunctions.net/registerStudent \
  -H "Content-Type: application/json" \
  -d '{
    "schoolYear": "2026-2027",
    "grade": "Grade 1",
    "student": {
      "firstName": "Test",
      "lastName": "Student",
      "gender": "male",
      "dateOfBirth": "2015-01-01"
    },
    "contact": {
      "primaryEmail": "test@example.com",
      "primaryPhone": "+1234567890",
      "emergencyPhone": "+1234567891",
      "studentAddress": "123 Test St"
    },
    "primaryGuardian": {
      "firstName": "Test",
      "lastName": "Parent",
      "email": "test@example.com",
      "phone": "+1234567890",
      "address": "123 Test St"
    }
  }'
```

### k6 Load Test Example

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const payload = JSON.stringify({
    schoolYear: '2026-2027',
    grade: 'Grade 1',
    student: {
      firstName: `Test${Math.random()}`,
      lastName: 'Student',
      gender: 'male',
      dateOfBirth: '2015-01-01',
    },
    contact: {
      primaryEmail: `test${Math.random()}@example.com`,
      primaryPhone: '+1234567890',
      emergencyPhone: '+1234567891',
      studentAddress: '123 Test St',
    },
    primaryGuardian: {
      firstName: 'Test',
      lastName: 'Parent',
      email: `test${Math.random()}@example.com`,
      phone: '+1234567890',
      address: '123 Test St',
    },
  });

  const response = http.post(
    'https://northamerica-northeast1-tarbiyah-sms-staging.cloudfunctions.net/registerStudent',
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(response, {
    'status is 200': (r) => r.status === 200,
    'registration successful': (r) => JSON.parse(r.body).success === true,
  });
}
```

## Benefits

✅ **Safe Testing**: Load test your application without spamming real users  
✅ **Cost Savings**: Avoid Twilio charges during testing  
✅ **Clear Logging**: All skipped operations are clearly marked  
✅ **Easy Toggle**: Switch between staging and production easily  
✅ **Automatic Detection**: Works automatically based on project ID if config not set  
✅ **Test Data Tagging**: Easy identification and cleanup of staging data  
✅ **Load Testing Ready**: Dedicated endpoint for k6 and other load testing tools

## Troubleshooting

### Staging mode not working?

1. **Check Functions config**:
   ```bash
   firebase functions:config:get
   ```

2. **Check project ID**:
   ```bash
   firebase projects:list
   firebase use staging
   ```

3. **Check logs**:
   ```bash
   firebase functions:log --only sendSmsHttp
   ```

4. **Verify environment variables** (client-side):
   - Check `.env` file for `VITE_FIREBASE_PROJECT_ID`
   - Check browser console for project ID

### Still sending real SMS/emails?

- Ensure you've deployed functions after setting config
- Check that you're using the correct Firebase project
- Verify the config was set correctly: `firebase functions:config:get`

