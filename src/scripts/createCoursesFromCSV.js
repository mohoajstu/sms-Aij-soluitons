// Script to create courses from CSV class list files
// Run with: node src/scripts/createCoursesFromCSV.js

const { initializeApp } = require('firebase/app')
const { getFirestore, collection, addDoc, query, where, getDocs, doc, getDoc } = require('firebase/firestore')
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

// Helper function to generate course ID
function generateCourseId(grade, subject) {
  const timestamp = Date.now().toString().slice(-6)
  return `${COURSE_PREFIX}${grade.toString().padStart(2, '0')}${subject.slice(0, 2).toUpperCase()}${timestamp}`
}

// Helper function to generate student ID
function generateStudentId() {
  const timestamp = Date.now().toString().slice(-6)
  return `${STUDENT_PREFIX}${timestamp}`
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
function createCourseDocument(filename, students, grade, gradeLevel, subject) {
  const courseId = generateCourseId(grade, subject)
  
  // Create students array with proper structure
  const studentsArray = students.map((student, index) => ({
    id: student.id || generateStudentId(),
    name: student.NAME || student.name || `Student ${index + 1}`,
    email: student['STUDENT EMAIL'] || student.email || '',
    allergies: student.ALLERGIES || student.allergies || 'None',
    photoConsent: student['PHOTO CONSENT'] || student.photoConsent || 'No',
    comments: student['COMMENTS/SSAP'] || student.COMMENTS || student.comments || '',
    parents: student.PARENTS || student.parents || '',
    parentEmail: student.EMAIL || student.parentEmail || '',
    parentPhone: student.PHONE || student.parentPhone || ''
  }))

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

// Main function to process all CSV files
async function createCoursesFromCSV() {
  try {
    console.log('🚀 Starting course creation from CSV files...')
    console.log('📍 Project:', firebaseConfig.projectId)
    console.log('📅 Academic Year:', ACADEMIC_YEAR)
    
    // Test connection first
    console.log('🔍 Testing Firestore connection...')
    const testQuery = query(collection(db, 'courses'))
    await getDocs(testQuery)
    console.log('✅ Firestore connection successful!')
    
    const csvDir = path.join(__dirname, 'ClassList')
    const files = fs.readdirSync(csvDir).filter(file => file.endsWith('.csv'))
    
    console.log(`📁 Found ${files.length} CSV files to process`)
    
    let totalCourses = 0
    let totalStudents = 0
    let errors = 0
    
    for (const file of files) {
      try {
        console.log(`\n📖 Processing: ${file}`)
        
        const filePath = path.join(csvDir, file)
        const students = await parseCSVFile(filePath)
        
        if (students.length === 0) {
          console.log(`⚠️  No students found in ${file}, skipping`)
          continue
        }
        
        // Extract grade information
        const grade = extractGradeFromFilename(file)
        const gradeLevel = GRADE_LEVEL_MAP[file.match(/(?:GRADE|Grade|SK)\s*\d*/i)?.[0]] || 'Unknown'
        const subject = SUBJECT_MAP[file.match(/(?:GRADE|Grade|SK)\s*\d*/i)?.[0]] || 'General'
        
        console.log(`📊 Grade: ${grade}, Level: ${gradeLevel}, Subject: ${subject}`)
        console.log(`👥 Students: ${students.length}`)
        
        // Create course document
        const courseDoc = createCourseDocument(file, students, grade, gradeLevel, subject)
        
        // Add to Firestore
        const docRef = await addDoc(collection(db, 'courses'), courseDoc)
        console.log(`✅ Course created with ID: ${docRef.id}`)
        
        totalCourses++
        totalStudents += students.length
        
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message)
        errors++
      }
    }
    
    console.log('\n🎉 Course creation completed!')
    console.log(`📊 Summary:`)
    console.log(`   - Total courses created: ${totalCourses}`)
    console.log(`   - Total students processed: ${totalStudents}`)
    console.log(`   - Errors: ${errors}`)
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  createCoursesFromCSV()
    .then(() => {
      console.log('✅ Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Script failed:', error)
      process.exit(1)
    })
}

module.exports = { createCoursesFromCSV }
