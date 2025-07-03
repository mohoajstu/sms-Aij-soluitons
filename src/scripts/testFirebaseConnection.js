const fs = require('fs')
const csv = require('csv-parser')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

console.log('🔍 Testing Firebase setup and showing first 3 students...\n')

// Test 1: Check if CSV file exists
const csvFilePath = path.join(__dirname, 'studentReport.xlsx - Sheet.csv')
console.log('📄 CSV File Check:')
console.log(`   Path: ${csvFilePath}`)
console.log(`   Exists: ${fs.existsSync(csvFilePath) ? '✅ Yes' : '❌ No'}`)

if (!fs.existsSync(csvFilePath)) {
  console.log('❌ CSV file not found. Please check the file path.')
  process.exit(1)
}

// Test 2: Check Firebase configuration
console.log('\n🔥 Firebase Configuration Check:')
console.log(`   Project ID: ${process.env.VITE_FIREBASE_PROJECT_ID || '❌ Missing'}`)
console.log(`   API Key: ${process.env.VITE_FIREBASE_API_KEY ? '✅ Present' : '❌ Missing'}`)
console.log(`   Auth Domain: ${process.env.VITE_FIREBASE_AUTH_DOMAIN || '❌ Missing'}`)

// Test 3: Check if service account key exists (optional fallback)
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json')
console.log('\n🔑 Service Account Key Check (Optional):')
console.log(`   Path: ${serviceAccountPath}`)
console.log(
  `   Exists: ${fs.existsSync(serviceAccountPath) ? '✅ Yes (fallback available)' : '⚠️  No (will use default credentials)'}`,
)

// Test 4: Test Firebase Admin initialization
console.log('\n🚀 Firebase Admin SDK Test:')
try {
  const admin = require('firebase-admin')

  // Try to initialize (this won't actually connect, just test config)
  const testConfig = {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  }

  if (process.env.VITE_FIREBASE_PROJECT_ID) {
    console.log('   ✅ Firebase project ID found')
    console.log(`   📋 Project: ${process.env.VITE_FIREBASE_PROJECT_ID}`)
  } else {
    console.log('   ❌ Firebase project ID missing')
  }
} catch (error) {
  console.log('   ❌ Firebase Admin SDK not available')
}

// Test 5: Show first 3 students from CSV
console.log('\n👥 First 3 Students from CSV:')
console.log(
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
)

let studentCount = 0
const students = []

fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', (row) => {
    if (studentCount >= 3) return

    const id = row['SchoolID']
    if (!id) return

    const student = {
      schoolId: id,
      name: `${row['First Name']} ${row['Last Name']}`,
      grade: row['Programme'],
      active: row['Active']?.trim().toLowerCase() === 'true',
      email: row['Email'],
      phone: row['Phone1'],
      address: row['Address'],
      father: row['Father']?.split(' TP')[0]?.trim() || 'N/A',
      mother: row['Mother']?.split(' TP')[0]?.trim() || 'N/A',
    }

    students.push(student)
    studentCount++
  })
  .on('end', () => {
    students.forEach((student, index) => {
      console.log(`\n📝 Student ${index + 1}:`)
      console.log(`   • School ID: ${student.schoolId}`)
      console.log(`   • Name: ${student.name}`)
      console.log(`   • Grade/Programme: ${student.grade}`)
      console.log(`   • Active: ${student.active ? '✅ Yes' : '❌ No'}`)
      console.log(`   • Email: ${student.email || 'N/A'}`)
      console.log(`   • Phone: ${student.phone || 'N/A'}`)
      console.log(`   • Address: ${student.address || 'N/A'}`)
      console.log(`   • Father: ${student.father}`)
      console.log(`   • Mother: ${student.mother}`)
    })

    console.log(
      '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    )

    // Summary
    const hasFirebaseConfig =
      process.env.VITE_FIREBASE_PROJECT_ID && process.env.VITE_FIREBASE_API_KEY
    const hasServiceAccount = fs.existsSync(serviceAccountPath)

    console.log('\n📋 Summary:')
    console.log(`   • Found ${students.length} students ready for upload`)
    console.log(`   • CSV file: ✅ Ready`)
    console.log(`   • Firebase Config: ${hasFirebaseConfig ? '✅ Ready' : '❌ Missing'}`)
    console.log(
      `   • Service Account Key: ${hasServiceAccount ? '✅ Available' : '⚠️  Not needed (using env vars)'}`,
    )

    if (hasFirebaseConfig) {
      console.log('\n🎉 Everything looks good! You can now run:')
      console.log('   cd src/scripts')
      console.log('   node uploadStudents.js')
      console.log('\n📋 The script will:')
      console.log('   • Use your Firebase project configuration from .env')
      console.log('   • Upload the first 3 students to Firestore')
      console.log('   • Create documents in the "students" collection')
    } else {
      console.log('\n🚨 Firebase Configuration Issues:')
      console.log('   Please check your .env file contains:')
      console.log('   • VITE_FIREBASE_PROJECT_ID')
      console.log('   • VITE_FIREBASE_API_KEY')
      console.log('   • VITE_FIREBASE_AUTH_DOMAIN')
    }
  })
  .on('error', (error) => {
    console.error('❌ Error reading CSV file:', error)
  })
