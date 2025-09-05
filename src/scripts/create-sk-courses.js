// Script to create SK1 and SK2 homeroom courses
// Run with: node src/scripts/create-sk-courses.js

const { initializeApp } = require('firebase/app')
const { getFirestore, collection, getDocs, doc, getDoc, setDoc } = require('firebase/firestore')
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth')
const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')

// Load environment variables
dotenv.config()

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

// Configuration
const ACADEMIC_YEAR = "2025-2026"
const TERM = "Term 1"
const COURSE_PREFIX = "TC"
const DRY_RUN = false // Set to false to actually create courses

// Staff mapping for SK1 and SK2
const STAFF_MAP = {
  'SK1': { name: 'Rafia Husain', role: 'Faculty', source: 'faculty' },
  'SK2': { name: 'Huda Abdelbaqi', role: 'Faculty', source: 'faculty' }
}

// Helper function to generate sequential course ID
async function generateSequentialCourseId() {
  const existingCoursesSnapshot = await getDocs(collection(db, 'courses'))
  
  let highestId = 0
  
  existingCoursesSnapshot.docs.forEach(doc => {
    const data = doc.data()
    const courseId = data.courseId || data.courseID || ''
    
    // Extract the numeric part from IDs like TC000071, TC000072, etc.
    const match = courseId.match(/TC(\d+)/)
    if (match) {
      const numericId = parseInt(match[1])
      if (numericId > highestId) {
        highestId = numericId
      }
    }
  })
  
  // Generate the next sequential ID
  const nextId = highestId + 1
  
  // Use 6-digit format for consistency with existing IDs
  const courseId = `TC${nextId.toString().padStart(6, '0')}`
  
  console.log(`📊 Found highest existing ID: TC${highestId.toString().padStart(6, '0')}`)
  console.log(`🎯 Generating next sequential ID: ${courseId}`)
  
  return courseId
}

// Helper function to find teacher in faculty collection
async function findTeacher(teacherName) {
  try {
    console.log(`🔍 Searching for teacher: "${teacherName}"`)
    
    // Search in faculty collection
    const facultyQuery = await getDocs(collection(db, 'faculty'))
    for (const doc of facultyQuery.docs) {
      const data = doc.data()
      const firstName = data.personalInfo?.firstName || data.firstName || ''
      const lastName = data.personalInfo?.lastName || data.lastName || ''
      const fullName = `${firstName} ${lastName}`.trim()
      
      if (fullName.toLowerCase() === teacherName.toLowerCase()) {
        console.log(`✅ Found teacher: ${fullName} (ID: ${doc.id})`)
        return { id: doc.id, exists: true, data: data }
      }
    }
    
    console.log(`⚠️  Teacher not found: ${teacherName}`)
    return { exists: false }
  } catch (error) {
    console.error('Error finding teacher:', error)
    return { exists: false }
  }
}

// Helper function to parse CSV file
async function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const students = []
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        if (row.NAME && row.NAME.trim()) {
          students.push({
            name: row.NAME.trim(),
            parents: row.PARENTS || '',
            email: row.EMAIL || '',
            phone: row.PHONE || '',
            allergies: row.ALLERGIES || '',
            photoConsent: row['PHOTO CONSENT'] || ''
          })
        }
      })
      .on('end', () => {
        resolve(students)
      })
      .on('error', reject)
  })
}

// Helper function to find existing students
async function findExistingStudents(studentNames) {
  const students = []
  const skippedStudents = []
  
  for (const studentName of studentNames) {
    try {
      // Search in students collection
      const studentsQuery = await getDocs(collection(db, 'students'))
      let found = false
      
      for (const doc of studentsQuery.docs) {
        const data = doc.data()
        const firstName = data.personalInfo?.firstName || data.firstName || ''
        const lastName = data.personalInfo?.lastName || data.lastName || ''
        const fullName = `${firstName} ${lastName}`.trim()
        
        if (fullName.toLowerCase() === studentName.toLowerCase()) {
          students.push({
            id: doc.id,
            name: fullName,
            ...data
          })
          found = true
          break
        }
      }
      
      if (!found) {
        skippedStudents.push({
          name: studentName,
          reason: 'Student not found in database'
        })
      }
    } catch (error) {
      console.error(`Error finding student ${studentName}:`, error)
      skippedStudents.push({
        name: studentName,
        reason: 'Error during search'
      })
    }
  }
  
  return { students, skippedStudents }
}

// Helper function to create course document
async function createCourseDocument(filename, students, gradeLevel, teacherInfo) {
  const courseId = await generateSequentialCourseId()
  
  // Find existing students
  const studentNames = students.map(s => s.name)
  const { students: existingStudents, skippedStudents } = await findExistingStudents(studentNames)
  
  const studentsArray = existingStudents.map(student => ({
    id: student.id,
    name: student.name,
    email: student.personalInfo?.email || '',
    grade: gradeLevel
  }))
  
  const enrolledList = existingStudents.map(student => student.id)
  
  console.log(`📚 Creating course: ${courseId}`)
  console.log(`👥 Students in CSV: ${students.length}`)
  console.log(`✅ Existing students found: ${existingStudents.length}`)
  console.log(`⚠️  Skipped students: ${skippedStudents.length}`)
  
  // Create course document
  const courseDoc = {
    academicYear: ACADEMIC_YEAR,
    archived: false,
    budget: {
      accumulatedCost: 0,
      itemList: [],
      totalBudget: 0
    },
    courseID: courseId,
    courseId: courseId,
    description: `Homeroom course for ${gradeLevel}`,
    enrolledList: enrolledList,
    grade: gradeLevel,
    gradeLevel: gradeLevel,
    name: `Homeroom ${gradeLevel}`,
    resources: [],
    schedule: {
      classDays: ["Monday", "Wednesday", "Friday"],
      days: ["Monday", "Wednesday", "Friday"],
      endTime: "17:00",
      location: "",
      room: "101",
      startTime: "16:00",
      section: Math.floor(Math.random() * 9999) + 1000
    },
    students: studentsArray,
    subject: 'Homeroom',
    teacher: teacherInfo && teacherInfo.exists ? [{
      id: teacherInfo.id,
      name: teacherInfo.data.personalInfo?.firstName + ' ' + teacherInfo.data.personalInfo?.lastName || teacherInfo.data.personalInfo?.name || 'Unknown',
      role: teacherInfo.data.personalInfo?.role || 'Faculty',
      schoolId: teacherInfo.id,
      source: 'faculty'
    }] : [],
    teacherIds: teacherInfo && teacherInfo.exists ? [teacherInfo.id] : [],
    teacherAuthUIDs: [],
    teacherTarbiyahIds: teacherInfo && teacherInfo.exists ? [teacherInfo.id] : [],
    teachers: teacherInfo && teacherInfo.exists ? [teacherInfo.data.personalInfo?.firstName + ' ' + teacherInfo.data.personalInfo?.lastName || teacherInfo.data.personalInfo?.name || 'Unknown'] : [],
    term: TERM,
    timestamps: {
      createdAt: new Date(),
      updatedAt: new Date()
    },
    title: `Homeroom ${gradeLevel}`,
    updatedAt: new Date(),
    // Add metadata about skipped students
    metadata: {
      totalStudentsInCSV: students.length,
      existingStudentsAdded: studentsArray.length,
      nonExistingStudentsSkipped: skippedStudents.length,
      skippedStudents: skippedStudents
    }
  }
  
  return courseDoc
}

// Main function to create SK courses
async function createSKCourses() {
  try {
    console.log('🏫 Starting SK course creation...')
    console.log(`📍 Project: ${firebaseConfig.projectId}`)
    console.log(`📅 Academic Year: ${ACADEMIC_YEAR}`)
    console.log(`🧪 Dry run mode: ${DRY_RUN}`)
    
    // Sign in as admin
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD
    
    if (!adminEmail || !adminPassword) {
      console.error('❌ Admin credentials not provided in environment variables')
      console.log('Please set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file')
      return
    }
    
    console.log(`🔐 Signing in as admin: ${adminEmail}`)
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
    console.log('✅ Admin authentication successful')
    
    // Test connection
    console.log('\n🔍 Testing Firestore connection...')
    const testQuery = await getDocs(collection(db, 'courses'))
    console.log('✅ Firestore connection successful!')
    
    // Get SK CSV files
    const csvDir = path.join(__dirname, 'ClassList')
    const allFiles = fs.readdirSync(csvDir).filter(file => file.endsWith('.csv'))
    const skFiles = allFiles.filter(file => 
      file.toLowerCase().includes('sk1') || file.toLowerCase().includes('sk2')
    )
    
    console.log(`\n📁 Found ${allFiles.length} total CSV files`)
    console.log(`🎯 Filtering for SK files: ${skFiles.length} found`)
    
    if (skFiles.length === 0) {
      console.log('⚠️  No SK CSV files found in ClassList directory')
      return
    }
    
    // List SK files to be processed
    console.log('\n📋 SK CSV files to process:')
    skFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`)
    })
    
    // Process SK CSV files
    for (let fileIndex = 0; fileIndex < skFiles.length; fileIndex++) {
      const filename = skFiles[fileIndex]
      console.log(`\n${'='.repeat(60)}`)
      console.log(`📚 Processing file ${fileIndex + 1}/${skFiles.length}: ${filename}`)
      console.log(`${'='.repeat(60)}`)
      
      const filePath = path.join(csvDir, filename)
      const students = await parseCSVFile(filePath)
      
      if (students.length === 0) {
        console.log(`⚠️  No students found in ${filename}`)
        continue
      }
      
      // Determine grade level and teacher
      let gradeLevel, teacherName
      if (filename.toLowerCase().includes('sk1')) {
        gradeLevel = 'SK1'
        teacherName = STAFF_MAP.SK1.name
      } else if (filename.toLowerCase().includes('sk2')) {
        gradeLevel = 'SK2'
        teacherName = STAFF_MAP.SK2.name
      } else {
        console.log(`⚠️  Could not determine grade level from filename: ${filename}`)
        continue
      }
      
      console.log(`📊 Grade Level: ${gradeLevel}`)
      console.log(`👨‍🏫 Teacher: ${teacherName}`)
      console.log(`👥 Students in CSV: ${students.length}`)
      
      // Find teacher
      const teacherInfo = await findTeacher(teacherName)
      
      // Create course document
      console.log('\n🔨 Creating course document...')
      const courseDoc = await createCourseDocument(filename, students, gradeLevel, teacherInfo)
      
      console.log(`✅ Course document created successfully!`)
      console.log(`📋 Course ID: ${courseDoc.courseId}`)
      console.log(`📚 Course Name: ${courseDoc.name}`)
      console.log(`👥 Students enrolled: ${courseDoc.students.length}`)
      console.log(`👨‍🏫 Teacher: ${courseDoc.teacher[0]?.name || 'None assigned'}`)
      
      // Actually create the course in Firebase if not in dry run mode
      if (!DRY_RUN) {
        console.log('\n🚀 Creating course in Firebase...')
        await setDoc(doc(db, 'courses', courseDoc.courseId), courseDoc)
        console.log(`✅ Course created in Firebase: ${courseDoc.courseId}`)
      } else {
        console.log('\n🧪 DRY RUN: Course would be created in Firebase')
      }
    }
    
    console.log('\n🎉 SK course creation completed!')
    
  } catch (error) {
    console.error('❌ Script failed:', error)
  }
}

// Run the script
createSKCourses()
  .then(() => {
    console.log('🎉 Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  })

