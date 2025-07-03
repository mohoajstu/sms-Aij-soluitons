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

const admins = {}
let adminCount = 0
const MAX_ADMINS = Infinity // Process all admins

// Use the correct CSV file path
const csvFilePath = path.join(__dirname, 'adminReport.xlsx - Sheet4.csv')

console.log('👨‍💼 Starting admin upload process...')
console.log(`🔥 Firebase Project: ${process.env.VITE_FIREBASE_PROJECT_ID}`)
console.log(`📄 Reading CSV file: ${csvFilePath}`)
console.log(`🔢 Processing all admins in the CSV file`)

fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', (row) => {
    // Stop processing after MAX_ADMINS
    if (adminCount >= MAX_ADMINS) {
      return
    }

    const id = row['SchoolID']
    if (!id) return

    console.log(
      `📝 Processing admin ${adminCount + 1}: ${row['First Name']} ${row['Last Name']} (ID: ${id})`,
    )

    // Format DOB to YYYY-MM-DD if needed
    let formattedDob = row['DOB'] || ''
    if (formattedDob && formattedDob.includes('/')) {
      // Convert MM/DD/YYYY to YYYY-MM-DD
      const dateParts = formattedDob.split('/')
      if (dateParts.length === 3) {
        const month = dateParts[0].padStart(2, '0')
        const day = dateParts[1].padStart(2, '0')
        const year = dateParts[2]
        formattedDob = `${year}-${month}-${day}`
      }
    }

    admins[id] = {
      active: row['Active']?.trim().toLowerCase() === 'true',
      primaryRole: row['Primary Role'] || 'SchoolAdmin',
      schoolId: id,
      personalInfo: {
        lastName: row['Last Name'] || '',
        firstName: row['First Name'] || '',
        middleName: row['MiddleName'] || '',
        nickName: row['NickName'] || '',
        salutation: row['Salutation'] || '',
        dob: formattedDob,
        gender: row['Gender'] || '',
      },
      citizenship: {
        nationality: row['Nationality'] || '',
        nationalId: row['NationalID'] || '',
        nationalIdExpiry: row['NationalIDExpiry'] || '',
      },
      contact: {
        email: row['Email'] || '',
        phone1: row['Phone1'] || '',
        phone2: row['Phone2'] || '',
        emergencyPhone: row['EmergencyPhone'] || '',
      },
      address: {
        poBox: row['POBox'] || '',
        streetAddress: row['Address'] || '',
        residentialArea: row['ResidentialArea'] || '',
      },
      language: {
        primary: row['PrimaryLanguage'] || '',
        secondary: row['SecondaryLanguage'] || '',
      },
      employment: {
        daySchoolEmployer: row['DaySchoolEmployer'] || '',
        program: row['Programme'] || '',
        notes: row['Notes'] || '',
      },
      timestamps: {
        uploadedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
    }

    adminCount++
  })
  .on('end', async () => {
    console.log(`\n🔄 Uploading ${Object.keys(admins).length} administrators to Firebase...`)

    try {
      let uploadedCount = 0

      for (const [id, data] of Object.entries(admins)) {
        const docRef = doc(db, 'admins', id)
        await setDoc(docRef, data)
        uploadedCount++
        console.log(
          `✅ Uploaded admin ${uploadedCount}/${Object.keys(admins).length}: ${data.personalInfo.firstName} ${data.personalInfo.lastName} (${id})`,
        )
      }

      console.log('\n🎉 Upload completed successfully!')
      console.log(`📊 Summary:`)
      console.log(`   • Total admins processed: ${uploadedCount}`)
      console.log(`   • Firebase project: ${process.env.VITE_FIREBASE_PROJECT_ID}`)
      console.log(`   • Firebase collection: admins`)
      console.log(`   • Document IDs: SchoolID values`)

      // Verify the upload by reading back the data
      console.log('\n🔍 Verifying upload...')
      const adminsCollection = collection(db, 'admins')
      const q = query(adminsCollection, limit(3))
      const adminsSnapshot = await getDocs(q)
      console.log(`✅ Verification: Found ${adminsSnapshot.size} documents in Firebase`)

      adminsSnapshot.forEach((doc) => {
        const data = doc.data()
        console.log(`   • ${doc.id}: ${data.personalInfo.firstName} ${data.personalInfo.lastName}`)
      })
    } catch (error) {
      console.error('❌ Error uploading admins:', error)
      console.error('   Make sure your Firebase project has Firestore enabled')
      console.error('   And check your Firebase security rules allow writes')
    }
  })
  .on('error', (error) => {
    console.error('❌ Error reading CSV file:', error)
  })
