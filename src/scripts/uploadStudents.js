const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Import Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using environment variables
try {
  // Check if Firebase Admin is already initialized
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.VITE_FIREBASE_PROJECT_ID
    });
  }
  console.log('🔥 Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  console.log('\n💡 Alternative: You can still use the service account key method.');
  console.log('   Place serviceAccountKey.json in this folder and the script will use it instead.');
  
  // Fallback to service account key if available
  try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.VITE_FIREBASE_PROJECT_ID
    });
    console.log('🔥 Firebase initialized with service account key');
  } catch (keyError) {
    console.error('❌ Could not initialize Firebase with either method.');
    console.error('   Please set up Firebase authentication or add serviceAccountKey.json');
    process.exit(1);
  }
}

const db = admin.firestore();
const students = {};
let studentCount = 0;
const MAX_STUDENTS = 3; // Only process first 3 students for testing

// Use the correct CSV file path
const csvFilePath = path.join(__dirname, 'studentReport.xlsx - Sheet.csv');

console.log('📚 Starting student upload process...');
console.log(`🔥 Firebase Project: ${process.env.VITE_FIREBASE_PROJECT_ID}`);
console.log(`📄 Reading CSV file: ${csvFilePath}`);
console.log(`🔢 Processing only first ${MAX_STUDENTS} students for testing`);

fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', (row) => {
    // Stop processing after MAX_STUDENTS
    if (studentCount >= MAX_STUDENTS) {
      return;
    }

    const id = row['SchoolID'];
    if (!id) return;

    console.log(`📝 Processing student ${studentCount + 1}: ${row['First Name']} ${row['Last Name']} (ID: ${id})`);

    students[id] = {
      active: row['Active']?.trim().toLowerCase() === 'true',
      primaryRole: row['Primary Role'],
      schoolId: row['SchoolID'],
      personalInfo: {
        lastName: row['Last Name'],
        firstName: row['First Name'],
        middleName: row['MiddleName'] || '',
        nickName: row['NickName'] || '',
        salutation: row['Salutation'] || '',
        dob: row['DOB'],
        gender: row['Gender']
      },
      parents: {
        father: {
          name: row['Father']?.split(' TP')[0]?.trim() || '',
          tarbiyahId: row['Father']?.split(' TP')[1]?.trim() ? 'TP' + row['Father'].split(' TP')[1]?.trim() : ''
        },
        mother: {
          name: row['Mother']?.split(' TP')[0]?.trim() || '',
          tarbiyahId: row['Mother']?.split(' TP')[1]?.trim() ? 'TP' + row['Mother'].split(' TP')[1]?.trim() : ''
        }
      },
      citizenship: {
        nationality: row['Nationality'],
        nationalId: row['NationalID'],
        nationalIdExpiry: row['NationalIDExpiry']
      },
      contact: {
        email: row['Email'],
        phone1: row['Phone1'],
        phone2: row['Phone2'],
        emergencyPhone: row['EmergencyPhone']
      },
      address: {
        poBox: row['POBox'],
        streetAddress: row['Address'],
        residentialArea: row['ResidentialArea']
      },
      language: {
        primary: row['PrimaryLanguage'],
        secondary: row['SecondaryLanguage']
      },
      schooling: {
        daySchoolEmployer: row['DaySchoolEmployer'],
        program: row['Programme'],
        returningStudentYear: row['ReturningStudentYear'],
        custodyDetails: row['CustodyDetails'],
        notes: row['Notes']
      },
      // Add timestamp for when the record was uploaded
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    studentCount++;
  })
  .on('end', async () => {
    console.log(`\n🔄 Uploading ${Object.keys(students).length} students to Firebase...`);
    
    try {
      let uploadedCount = 0;
      
      for (const [id, data] of Object.entries(students)) {
        await db.collection('students').doc(id).set(data);
        uploadedCount++;
        console.log(`✅ Uploaded student ${uploadedCount}/${Object.keys(students).length}: ${data.personalInfo.firstName} ${data.personalInfo.lastName} (${id})`);
      }
      
      console.log('\n🎉 Upload completed successfully!');
      console.log(`📊 Summary:`);
      console.log(`   • Total students processed: ${uploadedCount}`);
      console.log(`   • Firebase project: ${process.env.VITE_FIREBASE_PROJECT_ID}`);
      console.log(`   • Firebase collection: students`);
      console.log(`   • Document IDs: SchoolID values`);
      
      // Verify the upload by reading back the data
      console.log('\n🔍 Verifying upload...');
      const studentsSnapshot = await db.collection('students').limit(3).get();
      console.log(`✅ Verification: Found ${studentsSnapshot.size} documents in Firebase`);
      
      studentsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   • ${doc.id}: ${data.personalInfo.firstName} ${data.personalInfo.lastName}`);
      });
      
    } catch (error) {
      console.error('❌ Error uploading students:', error);
      console.error('   Make sure you have proper Firebase authentication set up');
    }
  })
  .on('error', (error) => {
    console.error('❌ Error reading CSV file:', error);
  });
