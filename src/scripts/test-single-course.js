// Test script to create a single course from one CSV file
// Run with: node src/scripts/test-single-course.js

const { initializeApp } = require('firebase/app')
const { getFirestore, collection, query, getDocs, addDoc, where } = require('firebase/firestore')
const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')

// Firebase config - import from external file or update here
let firebaseConfig

try {
  // Try to import from external config file
  firebaseConfig = require('./firebase-config.js')
} catch (error) {
  // Fallback to inline config - update these values with your actual Firebase config
  firebaseConfig = {
    apiKey: "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // Replace with your actual API key
    authDomain: "tarbiyah-sms.firebaseapp.com", // Replace with your actual domain
    projectId: "tarbiyah-sms", // Replace with your actual project ID
    storageBucket: "tarbiyah-sms.appspot.com", // Replace with your actual storage bucket
    messagingSenderId: "123456789", // Replace with your actual sender ID
    appId: "1:123456789:web:abcdef123456" // Replace with your actual app ID
  }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Configuration
const ACADEMIC_YEAR = "2025-2026"
const TERM = "Term 1"
const COURSE_PREFIX = "TC"
const STUDENT_PREFIX = "TS"

// Grade level mapping
const GRADE_LEVEL_MAP = {
  'SK1': 'Senior Kindergarten 1',
  'SK2': 'Senior Kindergarten 2',
  'Grade 1': 'Grade 1',
  'GRADE 1': 'Grade 1',
  'GRADE 2': 'Grade 2',
  'GRADE 3': 'Grade 3',
  'GRADE 4': 'Grade 4',
  'GRADE 5': 'Grade 5',
  'GRADE 6': 'Grade 6',
  'GRADE 7': 'Grade 7',
  'GRADE 8': 'Grade 8'
}

// Subject mapping based on grade level
const SUBJECT_MAP = {
  'SK1': 'Early Learning',
  'SK2': 'Early Learning',
  'Grade 1': 'Quran',
  'GRADE 1': 'Quran',
  'GRADE 2': 'Quran',
  'GRADE 3': 'Quran',
  'GRADE 4': 'Quran',
  'GRADE 5': 'Quran',
  'GRADE 6': 'Quran',
  'GRADE 7': 'Quran',
  'GRADE 8': 'Quran'
}

// Helper function to extract grade number from filename
function extractGradeFromFilename(filename) {
  const gradeMatch = filename.match(/(?:GRADE|Grade)\s*(\d+)/i)
  if (gradeMatch) {
    return parseInt(gradeMatch[1])
  }
  
  if (filename.includes('SK1')) return 0
  if (filename.includes('SK2')) return 0
  
  return null
}

// Helper function to generate unique course ID
async function generateUniqueCourseId(grade, subject) {
  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    const timestamp = Date.now().toString().slice(-6)
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const courseId = `${COURSE_PREFIX}${grade.toString().padStart(2, '0')}${subject.slice(0, 2).toUpperCase()}${timestamp}${randomSuffix}`
    
    // Check if this ID already exists
    const existingQuery = query(collection(db, 'courses'), where('courseId', '==', courseId))
    const existingDocs = await getDocs(existingQuery)
    
    if (existingDocs.empty) {
      return courseId
    }
    
    attempts++
  }
  
  throw new Error('Could not generate unique course ID after multiple attempts')
}

// Helper function to generate unique student ID
async function generateUniqueStudentId() {
  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    const timestamp = Date.now().toString().slice(-6)
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const studentId = `${STUDENT_PREFIX}${timestamp}${randomSuffix}`
    
    // Check if this ID already exists in any course
    const existingQuery = query(collection(db, 'courses'), where('enrolledList', 'array-contains', studentId))
    const existingDocs = await getDocs(existingQuery)
    
    if (existingDocs.empty) {
      return studentId
    }
    
    attempts++
  }
  
  throw new Error('Could not generate unique student ID after multiple attempts')
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

// Helper function to create course document
async function createCourseDocument(filename, students, grade, gradeLevel, subject) {
  const courseId = await generateUniqueCourseId(grade, subject)
  
  // Create students array with proper structure and unique IDs
  const studentsArray = []
  for (let i = 0; i < students.length; i++) {
    const student = students[i]
    const studentId = await generateUniqueStudentId()
    
    studentsArray.push({
      id: studentId,
      name: student.NAME || student.name || `Student ${i + 1}`,
      email: student['STUDENT EMAIL'] || student.email || '',
      allergies: student.ALLERGIES || student.allergies || 'None',
      photoConsent: student['PHOTO CONSENT'] || student.photoConsent || 'No',
      comments: student['COMMENTS/SSAP'] || student.COMMENTS || student.comments || '',
      parents: student.PARENTS || student.parents || '',
      parentEmail: student.EMAIL || student.parentEmail || '',
      parentPhone: student.PHONE || student.parentPhone || ''
    })
  }

  // Create enrolled list (just IDs)
  const enrolledList = studentsArray.map(student => student.id)

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
    description: `${subject} course for ${gradeLevel}`,
    enrolledList: enrolledList,
    grade: grade,
    gradeLevel: gradeLevel,
    name: `${subject} ${gradeLevel}`,
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
    subject: subject,
    teacher: [
      {
        name: "TBD",
        schoolId: ""
      }
    ],
    teacherIds: [],
    teachers: ["TBD"],
    term: TERM,
    timestamps: {
      createdAt: new Date(),
      updatedAt: new Date()
    },
    title: `${subject} ${gradeLevel}`,
    updatedAt: new Date()
  }

  return courseDoc
}

// Main function to test single course creation
async function testSingleCourse() {
  try {
    console.log('🧪 Testing single course creation...')
    console.log('📍 Project:', firebaseConfig.projectId)
    console.log('📅 Academic Year:', ACADEMIC_YEAR)
    
    // Test connection first
    console.log('🔍 Testing Firestore connection...')
    const testQuery = query(collection(db, 'courses'))
    await getDocs(testQuery)
    console.log('✅ Firestore connection successful!')
    
    // Check existing courses
    console.log('🔍 Checking existing courses...')
    const existingCoursesQuery = query(collection(db, 'courses'))
    const existingCoursesSnapshot = await getDocs(existingCoursesQuery)
    console.log(`📊 Found ${existingCoursesSnapshot.size} existing courses`)
    
    // List existing course IDs
    if (existingCoursesSnapshot.size > 0) {
      console.log('📝 Existing course IDs:')
      existingCoursesSnapshot.docs.forEach(doc => {
        const data = doc.data()
        console.log(`   - ${data.courseId || data.courseID || 'No ID'} (${data.name || 'No name'})`)
      })
    }
    
    // Get CSV files
    const csvDir = path.join(__dirname, 'ClassList')
    const files = fs.readdirSync(csvDir).filter(file => file.endsWith('.csv'))
    
    console.log(`\n📁 Found ${files.length} CSV files`)
    
    // Let user choose which file to test
    console.log('\n📋 Available files:')
    files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`)
    })
    
    // For testing, let's use the first file
    const testFile = files[0]
    console.log(`\n🎯 Testing with file: ${testFile}`)
    
    const filePath = path.join(csvDir, testFile)
    const students = await parseCSVFile(filePath)
    
    if (students.length === 0) {
      console.log(`⚠️  No students found in ${testFile}`)
      return
    }
    
    // Extract grade information
    const grade = extractGradeFromFilename(testFile)
    const gradeLevel = GRADE_LEVEL_MAP[testFile.match(/(?:GRADE|Grade|SK)\s*\d*/i)?.[0]] || 'Unknown'
    const subject = SUBJECT_MAP[testFile.match(/(?:GRADE|Grade|SK)\s*\d*/i)?.[0]] || 'General'
    
    console.log(`📊 Grade: ${grade}, Level: ${gradeLevel}, Subject: ${subject}`)
    console.log(`👥 Students: ${students.length}`)
    
    // Show sample student data
    if (students.length > 0) {
      console.log(`\n📝 Sample student data from CSV:`)
      const sampleStudent = students[0]
      console.log(`   Name: ${sampleStudent.NAME || sampleStudent.name || 'Unknown'}`)
      console.log(`   Email: ${sampleStudent['STUDENT EMAIL'] || sampleStudent.email || 'No email'}`)
      console.log(`   Parents: ${sampleStudent.PARENTS || sampleStudent.parents || 'Unknown'}`)
      console.log(`   Parent Email: ${sampleStudent.EMAIL || sampleStudent.parentEmail || 'No email'}`)
      console.log(`   Allergies: ${sampleStudent.ALLERGIES || sampleStudent.allergies || 'None'}`)
      console.log(`   Photo Consent: ${sampleStudent['PHOTO CONSENT'] || sampleStudent.photoConsent || 'No'}`)
    }
    
    // Create course document
    console.log('\n🔨 Creating course document...')
    const courseDoc = await createCourseDocument(testFile, students, grade, gradeLevel, subject)
    
    console.log(`✅ Course document created successfully!`)
    console.log(`📋 Course ID: ${courseDoc.courseId}`)
    console.log(`📚 Course Name: ${courseDoc.name}`)
    console.log(`👥 Student Count: ${courseDoc.students.length}`)
    
    // Show the complete course document
    console.log('\n📄 Complete Course Document:')
    console.log(JSON.stringify(courseDoc, null, 2))
    
    // Ask user if they want to actually create this course
    console.log('\n❓ Do you want to create this course in Firebase? (y/n)')
    console.log('⚠️  This will add the course to your database!')
    
    // For now, just show what would be created
    console.log('\n💡 To actually create the course, you would call:')
    console.log('   await addDoc(collection(db, "courses"), courseDoc)')
    
    console.log('\n🎉 Test completed successfully!')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Run the test
if (require.main === module) {
  testSingleCourse()
    .then(() => {
      console.log('\n✅ Test completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error)
      process.exit(1)
    })
}

module.exports = { testSingleCourse }
