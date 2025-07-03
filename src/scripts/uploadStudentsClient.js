const fs = require('fs')
const csv = require('csv-parser')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

// Import Firebase Client SDK (works with existing config)
const { initializeApp } = require('firebase/app')
const {
  getFirestore,
  collection,
  doc,
  setDoc,
  serverTimestamp,
  getDocs,
  limit,
  query,
} = require('firebase/firestore')

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

console.log('🔥 Firebase Client SDK initialized successfully')
console.log(`📋 Project: ${process.env.VITE_FIREBASE_PROJECT_ID}`)

const students = {}
let studentCount = 0
const MAX_STUDENTS = Infinity // Process all students

// Use the correct CSV file path
const csvFilePath = path.join(__dirname, 'studentReport.xlsx - Sheet.csv')

console.log('📚 Starting student upload process...')
console.log(`🔥 Firebase Project: ${process.env.VITE_FIREBASE_PROJECT_ID}`)
console.log(`📄 Reading CSV file: ${csvFilePath}`)
console.log(`🔢 Processing all students in the CSV file`)

fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', (row) => {
    // Stop processing after MAX_STUDENTS
    if (studentCount >= MAX_STUDENTS) {
      return
    }

    const id = row['SchoolID']
    if (!id) return

    console.log(
      `📝 Processing student ${studentCount + 1}: ${row['First Name']} ${row['Last Name']} (ID: ${id})`,
    )

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
        gender: row['Gender'],
      },
      parents: {
        father: {
          name: row['Father']?.split(' TP')[0]?.trim() || '',
          tarbiyahId: row['Father']?.split(' TP')[1]?.trim()
            ? 'TP' + row['Father'].split(' TP')[1]?.trim()
            : '',
        },
        mother: {
          name: row['Mother']?.split(' TP')[0]?.trim() || '',
          tarbiyahId: row['Mother']?.split(' TP')[1]?.trim()
            ? 'TP' + row['Mother'].split(' TP')[1]?.trim()
            : '',
        },
      },
      citizenship: {
        nationality: row['Nationality'],
        nationalId: row['NationalID'],
        nationalIdExpiry: row['NationalIDExpiry'],
      },
      contact: {
        email: row['Email'],
        phone1: row['Phone1'],
        phone2: row['Phone2'],
        emergencyPhone: row['EmergencyPhone'],
      },
      address: {
        poBox: row['POBox'],
        streetAddress: row['Address'],
        residentialArea: row['ResidentialArea'],
      },
      language: {
        primary: row['PrimaryLanguage'],
        secondary: row['SecondaryLanguage'],
      },
      schooling: {
        daySchoolEmployer: row['DaySchoolEmployer'],
        program: row['Programme'],
        returningStudentYear: row['ReturningStudentYear'],
        custodyDetails: row['CustodyDetails'],
        notes: row['Notes'],
      },
      // Add timestamp for when the record was uploaded
      uploadedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }

    studentCount++
  })
  .on('end', async () => {
    console.log(`\n🔄 Uploading ${Object.keys(students).length} students to Firebase...`)

    try {
      let uploadedCount = 0

      for (const [id, data] of Object.entries(students)) {
        const docRef = doc(db, 'students', id)
        await setDoc(docRef, data)
        uploadedCount++
        console.log(
          `✅ Uploaded student ${uploadedCount}/${Object.keys(students).length}: ${data.personalInfo.firstName} ${data.personalInfo.lastName} (${id})`,
        )
      }

      console.log('\n🎉 Upload completed successfully!')
      console.log(`📊 Summary:`)
      console.log(`   • Total students processed: ${uploadedCount}`)
      console.log(`   • Firebase project: ${process.env.VITE_FIREBASE_PROJECT_ID}`)
      console.log(`   • Firebase collection: students`)
      console.log(`   • Document IDs: SchoolID values`)

      // Verify the upload by reading back the data
      console.log('\n🔍 Verifying upload...')
      const studentsCollection = collection(db, 'students')
      const q = query(studentsCollection, limit(3))
      const studentsSnapshot = await getDocs(q)
      console.log(`✅ Verification: Found ${studentsSnapshot.size} documents in Firebase`)

      studentsSnapshot.forEach((doc) => {
        const data = doc.data()
        console.log(`   • ${doc.id}: ${data.personalInfo.firstName} ${data.personalInfo.lastName}`)
      })
    } catch (error) {
      console.error('❌ Error uploading students:', error)
      console.error('   Make sure your Firebase project has Firestore enabled')
      console.error('   And check your Firebase security rules allow writes')
    }
  })
  .on('error', (error) => {
    console.error('❌ Error reading CSV file:', error)
  })
