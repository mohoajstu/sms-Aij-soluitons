# Student Data Upload Scripts

This folder contains scripts for uploading student data to Firebase Firestore.

## Setup Instructions

### 1. Firebase Service Account Setup

Before running the upload script, you need to set up Firebase Admin SDK credentials:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Click on the **Service Accounts** tab
5. Click **Generate new private key**
6. Download the JSON file
7. Rename it to `serviceAccountKey.json`
8. Place it in this `src/scripts/` folder

**Important:** Never commit the `serviceAccountKey.json` file to version control!

### 2. Install Dependencies

Make sure you have the required Node.js packages installed:

```bash
npm install firebase-admin csv-parser
```

### 3. Run the Upload Script

The script is configured to upload only the first 3 students for testing:

```bash
cd src/scripts
node uploadStudents.js
```

## Files

- `uploadStudents.js` - Main upload script (processes first 3 students only)
- `studentReport.xlsx - Sheet.csv` - Source CSV file with student data
- `serviceAccountKey.json` - Firebase service account credentials (you need to add this)

## Data Structure

Students are uploaded to the `students` collection in Firestore with the following structure:

```javascript
{
  active: boolean,
  primaryRole: string,
  schoolId: string, // Used as document ID
  personalInfo: {
    lastName: string,
    firstName: string,
    middleName: string,
    nickName: string,
    salutation: string,
    dob: string,
    gender: string
  },
  parents: {
    father: { name: string, tarbiyahId: string },
    mother: { name: string, tarbiyahId: string }
  },
  citizenship: {
    nationality: string,
    nationalId: string,
    nationalIdExpiry: string
  },
  contact: {
    email: string,
    phone1: string,
    phone2: string,
    emergencyPhone: string
  },
  address: {
    poBox: string,
    streetAddress: string,
    residentialArea: string
  },
  language: {
    primary: string,
    secondary: string
  },
  schooling: {
    daySchoolEmployer: string,
    programme: string,
    primaryInstrument: string,
    primaryInstrumentGrade: string,
    secondaryInstrument: string,
    secondaryInstrumentGrade: string,
    tertiaryInstrument: string,
    returningStudentYear: string,
    custodyDetails: string,
    notes: string
  },
  uploadedAt: timestamp,
  createdAt: timestamp
}
```

## Testing

The script is currently set to process only the first 3 students from the CSV file. This is controlled by the `MAX_STUDENTS` constant in `uploadStudents.js`.

To upload all students, change:
```javascript
const MAX_STUDENTS = 3; // Change this to a larger number or remove the limit
```

## Security Notes

- The `serviceAccountKey.json` file contains sensitive credentials
- Make sure it's added to `.gitignore`
- Only use this script in a secure environment
- Consider using Firebase environment variables for production 