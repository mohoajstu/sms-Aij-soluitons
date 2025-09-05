// Script to create JK students with proper schema for both students and users collections
// Run with: node src/scripts/create-jk-students.js

const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')

// Initialize Firebase Admin with service account
const serviceAccount = require('./serviceAccountKey.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// Configuration
const DRY_RUN = false // Set to false to actually create students
const GRADE_LEVEL = "JK"

// Helper function to generate unique Tarbiyah student ID
async function generateUniqueTarbiyahStudentId() {
  let attempts = 0
  const maxAttempts = 100
  
  while (attempts < maxAttempts) {
    // Generate ID in format: TS + 6 digits (000000 to 999999)
    const randomNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
    const studentId = `TS${randomNumber}`
    
    // Check if this ID already exists in BOTH collections to prevent duplicates
    const existingStudent = await db.collection('students').doc(studentId).get()
    const existingUser = await db.collection('users').doc(studentId).get()
    
    if (!existingStudent.exists && !existingUser.exists) {
      return studentId
    }
    
    attempts++
  }
  
  throw new Error('Could not generate unique Tarbiyah student ID after multiple attempts')
}

// Helper function to parse CSV file
async function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = []
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject)
  })
}

// Helper function to create comprehensive student document
async function createJKStudent(studentData, tarbiyahId) {
  const studentName = studentData.NAME || studentData.name || 'Unknown'
  const parentNames = studentData.PARENTS || studentData.parents || ''
  const parentEmail = studentData.EMAIL || studentData.parentEmail || ''
  const parentPhone = studentData.PHONE || studentData.parentPhone || ''
  const allergies = studentData.ALLERGIES || studentData.allergies || ''
  const photoConsent = studentData['PHOTO CONSENT'] || studentData.photoConsent || ''
  
  // Parse name into first and last
  const nameParts = studentName.trim().split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''
  
  // Parse parents (assuming format: "Parent1, Parent2" or "Parent1 Parent2")
  const parentList = parentNames.split(',').map(p => p.trim()).filter(p => p.length > 0)
  const fatherName = parentList[0] || ''
  const motherName = parentList[1] || ''
  
  // Create comprehensive student document for students collection (matching exact schema)
  const studentDocData = {
    active: true,
    address: {
      poBox: '',
      residentialArea: 'Unknown',
      streetAddress: ''
    },
    attendanceStats: {
      currentTermAbsenceCount: 0,
      currentTermLateCount: 0,
      yearAbsenceCount: 0,
      yearLateCount: 0
    },
    citizenship: {
      nationalId: '',
      nationalIdExpiry: '',
      nationality: ''
    },
    contact: {
      email: '', // Student email not provided in CSV
      emergencyPhone: parentPhone,
      phone1: '',
      phone2: ''
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    language: {
      primary: '',
      secondary: ''
    },
    parents: {
      father: {
        name: fatherName,
        tarbiyahId: '' // Will need to be linked later if parent exists
      },
      mother: {
        name: motherName,
        tarbiyahId: '' // Will need to be linked later if parent exists
      }
    },
    personalInfo: {
      dob: '', // Not provided in CSV
      firstName: firstName,
      gender: '', // Not provided in CSV
      lastName: lastName,
      middleName: '', // Not provided in CSV
      nickName: '', // Not provided in CSV
      salutation: '', // Not provided in CSV
      primaryRole: 'Student',
      schoolId: tarbiyahId
    },
    schooling: {
      custodyDetails: '',
      daySchoolEmployer: 'Tarbiyah Learning Academy',
      notes: `Notes: Allergies: ${allergies || 'N/A'} Can Photo: ${photoConsent || 'No'}`,
      program: GRADE_LEVEL.toLowerCase(), // "jk" instead of "JK"
      returningStudentYear: ''
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    uploadedAt: admin.firestore.FieldValue.serverTimestamp()
  }
  
  // Create user document for users collection (matching exact schema)
  const userData = {
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    dashboard: {
      theme: 'default'
    },
    linkedCollection: 'students',
    personalInfo: {
      firstName: firstName,
      lastName: lastName,
      role: 'Student'
    },
    stats: {
      lastLoginAt: null,
      loginCount: 0
    },
    tarbiyahId: tarbiyahId
  }
  
  return { studentDocData, userData }
}

// Main function to create JK students
async function createJKStudents() {
  try {
    console.log('👶 Starting JK student creation...')
    console.log(`📍 Project: ${serviceAccount.project_id}`)
    console.log(`🎯 Grade Level: ${GRADE_LEVEL}`)
    console.log(`🧪 Dry run mode: ${DRY_RUN}`)
    
    // Test connection
    console.log('\n🔍 Testing Firestore connection...')
    const testQuery = await db.collection('students').limit(1).get()
    console.log('✅ Firestore connection successful!')
    
    // Check if JK CSV file exists
    const csvDir = path.join(__dirname, 'ClassList')
    const jkCsvFile = path.join(csvDir, 'JK CLASS LIST 25-26 - Sheet1.csv')
    
    if (!fs.existsSync(jkCsvFile)) {
      console.log('⚠️  JK CSV file not found. Please convert the Excel file to CSV first.')
      console.log(`   Expected file: ${jkCsvFile}`)
      return
    }
    
    // Parse CSV file
    console.log('\n📄 Parsing JK CSV file...')
    const students = await parseCSVFile(jkCsvFile)
    
    if (students.length === 0) {
      console.log('⚠️  No students found in JK CSV file')
      return
    }
    
    console.log(`📊 Found ${students.length} students in JK CSV`)
    
    // Show sample data
    if (students.length > 0) {
      console.log('\n📝 Sample student data:')
      const sampleStudent = students[0]
      console.log(`   Name: ${sampleStudent.NAME || 'Unknown'}`)
      console.log(`   Parents: ${sampleStudent.PARENTS || 'Unknown'}`)
      console.log(`   Parent Email: ${sampleStudent.EMAIL || 'No email'}`)
      console.log(`   Parent Phone: ${sampleStudent.PHONE || 'No phone'}`)
      console.log(`   Allergies: ${sampleStudent.ALLERGIES || 'None'}`)
      console.log(`   Photo Consent: ${sampleStudent['PHOTO CONSENT'] || 'No'}`)
    }
    
    // Process each student
    console.log('\n🔨 Creating JK students...')
    const createdStudents = []
    const errors = []
    
    for (let i = 0; i < students.length; i++) {
      const student = students[i]
      const studentName = student.NAME || student.name || `Student ${i + 1}`
      
      console.log(`\n👤 Processing student ${i + 1}/${students.length}: ${studentName}`)
      
      try {
        // Generate unique ID
        const tarbiyahId = await generateUniqueTarbiyahStudentId()
        console.log(`   🆔 Generated ID: ${tarbiyahId}`)
        
        // Create student documents
        const { studentDocData, userData } = await createJKStudent(student, tarbiyahId)
        
        if (!DRY_RUN) {
          // Create student document in students collection
          await db.collection('students').doc(tarbiyahId).set(studentDocData)
          console.log(`   ✅ Created student document in students collection`)
          
          // Create user document in users collection
          await db.collection('users').doc(tarbiyahId).set(userData)
          console.log(`   ✅ Created user document in users collection`)
        } else {
          console.log(`   🧪 DRY RUN - Would create student with ID: ${tarbiyahId}`)
        }
        
        createdStudents.push({
          id: tarbiyahId,
          name: studentName,
          parents: student.PARENTS || '',
          parentEmail: student.EMAIL || '',
          parentPhone: student.PHONE || ''
        })
        
        console.log(`   ✅ Successfully processed: ${studentName}`)
        
      } catch (error) {
        console.error(`   ❌ Error processing ${studentName}:`, error.message)
        errors.push({ name: studentName, error: error.message })
      }
    }
    
    // Summary
    console.log('\n📊 JK Student Creation Summary:')
    console.log(`   ✅ Total students processed: ${students.length}`)
    console.log(`   ✅ Successfully created: ${createdStudents.length}`)
    console.log(`   ❌ Errors: ${errors.length}`)
    
    if (createdStudents.length > 0) {
      console.log('\n📋 Created students:')
      createdStudents.forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.name} (ID: ${student.id})`)
        console.log(`      👨‍👩‍👧‍👦 Parents: ${student.parents}`)
        console.log(`      📧 Parent Email: ${student.parentEmail}`)
        console.log(`      📞 Parent Phone: ${student.parentPhone}`)
      })
    }
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:')
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.name}: ${error.error}`)
      })
    }
    
    if (DRY_RUN) {
      console.log('\n🧪 DRY RUN COMPLETED - No students were actually created')
      console.log('   To create students, set DRY_RUN = false in the script')
    } else {
      console.log('\n🎉 JK students created successfully!')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  createJKStudents()
    .then(() => {
      console.log('\n✅ Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error)
      process.exit(1)
    })
}

module.exports = { createJKStudents }
