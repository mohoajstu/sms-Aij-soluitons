const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Import Firebase Client SDK (works with existing config)
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, serverTimestamp, getDocs, limit, query } = require('firebase/firestore');

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('🔥 Firebase Client SDK initialized successfully');
console.log(`📋 Project: ${process.env.VITE_FIREBASE_PROJECT_ID}`);

const faculty = {};
let facultyCount = 0;
const MAX_FACULTY = Infinity; // Process all faculty

// Use the correct CSV file path
const csvFilePath = path.join(__dirname, 'facultyReport.xlsx - Sheet3.csv');

console.log('👨‍🏫 Starting faculty upload process...');
console.log(`🔥 Firebase Project: ${process.env.VITE_FIREBASE_PROJECT_ID}`);
console.log(`📄 Reading CSV file: ${csvFilePath}`);
console.log(`🔢 Processing all faculty in the CSV file`);

fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', (row) => {
    // Stop processing after MAX_FACULTY
    if (facultyCount >= MAX_FACULTY) {
      return;
    }

    const id = row['SchoolID'];
    if (!id) return;

    console.log(`📝 Processing faculty ${facultyCount + 1}: ${row['First Name']} ${row['Last Name']} (ID: ${id})`);

    // Extract courses from Programme field - you may need to adjust this based on your data
    const courses = row['Programme'] ? [row['Programme']] : [];

    faculty[id] = {
      active: row['Active']?.trim().toLowerCase() === 'true',
      primaryRole: row['Primary Role'] || 'Faculty',
      schoolId: id,
      personalInfo: {
        lastName: row['Last Name'] || '',
        firstName: row['First Name'] || '',
        middleName: row['MiddleName'] || '',
        nickName: row['NickName'] || '',
        salutation: row['Salutation'] || '',
        dob: row['DOB'] || '',
        gender: row['Gender'] || ''
      },
      citizenship: {
        nationality: row['Nationality'] || '',
        nationalId: row['NationalID'] || '',
        nationalIdExpiry: row['NationalIDExpiry'] || ''
      },
      contact: {
        email: row['Email'] || '',
        phone1: row['Phone1'] || '',
        phone2: row['Phone2'] || '',
        emergencyPhone: row['EmergencyPhone'] || ''
      },
      address: {
        poBox: row['POBox'] || '',
        streetAddress: row['Address'] || '',
        residentialArea: row['ResidentialArea'] || ''
      },
      language: {
        primary: row['PrimaryLanguage'] || '',
        secondary: row['SecondaryLanguage'] || ''
      },
      employment: {
        daySchoolEmployer: row['DaySchoolEmployer'] || '',
        program: row['Programme'] || '',
        notes: row['Notes'] || ''
      },
      courses: courses,
      // Add timestamp for when the record was uploaded
      uploadedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    };

    facultyCount++;
  })
  .on('end', async () => {
    console.log(`\n🔄 Uploading ${Object.keys(faculty).length} faculty members to Firebase...`);
    
    try {
      let uploadedCount = 0;
      
      for (const [id, data] of Object.entries(faculty)) {
        const docRef = doc(db, 'faculty', id);
        await setDoc(docRef, data);
        uploadedCount++;
        console.log(`✅ Uploaded faculty ${uploadedCount}/${Object.keys(faculty).length}: ${data.personalInfo.firstName} ${data.personalInfo.lastName} (${id})`);
      }
      
      console.log('\n🎉 Upload completed successfully!');
      console.log(`📊 Summary:`);
      console.log(`   • Total faculty processed: ${uploadedCount}`);
      console.log(`   • Firebase project: ${process.env.VITE_FIREBASE_PROJECT_ID}`);
      console.log(`   • Firebase collection: faculty`);
      console.log(`   • Document IDs: SchoolID values`);
      
      // Verify the upload by reading back the data
      console.log('\n🔍 Verifying upload...');
      const facultyCollection = collection(db, 'faculty');
      const q = query(facultyCollection, limit(3));
      const facultySnapshot = await getDocs(q);
      console.log(`✅ Verification: Found ${facultySnapshot.size} documents in Firebase`);
      
      facultySnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   • ${doc.id}: ${data.personalInfo.firstName} ${data.personalInfo.lastName}`);
      });
      
    } catch (error) {
      console.error('❌ Error uploading faculty:', error);
      console.error('   Make sure your Firebase project has Firestore enabled');
      console.error('   And check your Firebase security rules allow writes');
    }
  })
  .on('error', (error) => {
    console.error('❌ Error reading CSV file:', error);
  }); 