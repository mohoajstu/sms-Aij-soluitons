// Script to create classes from CSV class lists - only adds existing students
// Skips non-existing students for manual handling
// Run with: node src/scripts/create-classes-from-csv.js

const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')
const createCsvWriter = require('csv-writer').createObjectCsvWriter

// Initialize Firebase Admin with service account
const serviceAccount = require('./serviceAccountKey.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// Configuration
const ACADEMIC_YEAR = "2025-2026"
const TERM = "Term 1"
const COURSE_PREFIX = "TC"
const DRY_RUN = false // Set to false to actually create courses

// Grade level mapping
const GRADE_LEVEL_MAP = {
  'JK': 'JK',
  'SK1': 'SK',
  'SK2': 'SK',
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

// Subject mapping - All grades use Homeroom
const SUBJECT_MAP = {
  'JK': 'Homeroom',
  'SK1': 'Homeroom',
  'SK2': 'Homeroom',
  'Grade 1': 'Homeroom',
  'GRADE 1': 'Homeroom',
  'GRADE 2': 'Homeroom',
  'GRADE 3': 'Homeroom',
  'GRADE 4': 'Homeroom',
  'GRADE 5': 'Homeroom',
  'GRADE 6': 'Homeroom',
  'GRADE 7': 'Homeroom',
  'GRADE 8': 'Homeroom'
}

// Staff mapping for each grade level (from test-single-course-admin.js)
const STAFF_MAP = {
  'JK': { name: 'Amera Syed', role: 'Faculty', source: 'faculty' },
  'SK1': { name: 'Rafia Husain', role: 'Faculty', source: 'faculty' },
  'SK2': { name: 'Huda Abdelbaqi', role: 'Faculty', source: 'faculty' },
  'GRADE 1': { name: 'Wala Omorri', role: 'Faculty', source: 'faculty' },
  'GRADE 2': { name: 'Filiz Camlibel', role: 'Faculty', source: 'faculty' },
  'GRADE 3': { name: 'Nadia Rahim Mirza', role: 'Faculty', source: 'faculty' },
  'GRADE 4': { name: 'Saima Qureshi', role: 'Faculty', source: 'faculty' },
  'GRADE 5': { name: 'Sara Sultan', role: 'Faculty', source: 'faculty' },
  'GRADE 6': { name: 'Saba Alvi', role: 'Faculty', source: 'faculty' },
  'GRADE 7': { name: 'Hasna Charanek', role: 'Faculty', source: 'faculty' },
  'GRADE 8': { name: 'Saba Alvi', role: 'Faculty', source: 'faculty' }
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

// Helper function to generate sequential course ID
async function generateSequentialCourseId() {
  // Get all existing courses to find the highest ID
  const existingCoursesSnapshot = await db.collection('courses').get()
  
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

// Helper function to normalize names for comparison (ignoring middle names)
function normalizeName(name) {
  if (!name) return ''
  
  // Convert to lowercase and clean up
  let normalized = name.toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s]/g, '') // Remove special characters except spaces
  
  // Split into words and keep only first and last name (ignore middle names)
  const words = normalized.split(' ').filter(word => word.length > 0)
  
  if (words.length === 0) return ''
  if (words.length === 1) return words[0] // Single name
  if (words.length === 2) return words.join(' ') // First and last name
  
  // More than 2 words - keep only first and last
  return `${words[0]} ${words[words.length - 1]}`
}

// Helper function to check if names are similar (ignoring middle names)
function isNameMatch(csvName, dbName) {
  const normalizedCsv = normalizeName(csvName)
  const normalizedDb = normalizeName(dbName)
  
  // Exact match (after normalizing and ignoring middle names)
  if (normalizedCsv === normalizedDb) {
    return { match: true, confidence: 100, type: 'exact' }
  }
  
  // Since we've already normalized to first + last name only, 
  // we don't need complex partial matching anymore
  return { match: false, confidence: 0, type: 'no-match' }
}

// Helper function to find existing student by name with flexible matching
async function findExistingStudent(studentName) {
  try {
    console.log(`🔍 Searching for existing student: "${studentName}"`)
    
    const matches = []
    
    // Search in students collection
    const studentsQuery = await db.collection('students').get()
    for (const doc of studentsQuery.docs) {
      const data = doc.data()
      const firstName = data.personalInfo?.firstName || data.firstName || ''
      const lastName = data.personalInfo?.lastName || data.lastName || ''
      const fullName = `${firstName} ${lastName}`.trim()
      
      // Check if the ID is properly formatted (TS + 6 digits) or malformed (TLS + 6 digits)
      if (!doc.id.match(/^TS\d{6}$/) && !doc.id.match(/^TLS\d{6}$/)) {
        continue // Skip other malformed IDs
      }
      
      // Check for name matches with flexible matching
      const nameMatch = isNameMatch(studentName, fullName)
      if (nameMatch.match) {
        matches.push({
          id: doc.id,
          name: fullName,
          confidence: nameMatch.confidence,
          type: nameMatch.type,
          data: data
        })
      }
    }
    
    if (matches.length === 0) {
      console.log(`❌ No existing student found for: "${studentName}"`)
      return { exists: false }
    }
    
    // Sort matches by confidence (highest first)
    matches.sort((a, b) => b.confidence - a.confidence)
    
    if (matches.length === 1) {
      // Single match - use it
      const match = matches[0]
      console.log(`✅ Found existing student: ${match.name} (ID: ${match.id}) - ${match.confidence}% confidence (${match.type})`)
      return { id: match.id, exists: true, data: match.data }
    } else {
      // Multiple matches - show all and use the highest confidence one
      console.log(`⚠️  Found ${matches.length} potential matches for "${studentName}":`)
      matches.forEach((match, index) => {
        console.log(`   ${index + 1}. ${match.name} (ID: ${match.id}) - ${match.confidence}% confidence (${match.type})`)
      })
      
      const bestMatch = matches[0]
      console.log(`✅ Using best match: ${bestMatch.name} (ID: ${bestMatch.id}) - ${bestMatch.confidence}% confidence`)
      return { id: bestMatch.id, exists: true, data: bestMatch.data }
    }
    
  } catch (error) {
    console.error('Error searching for existing student:', error)
    return { exists: false }
  }
}

// Helper function to find or create teacher in faculty collection
async function findOrCreateTeacher(teacherName, role, source) {
  try {
    console.log(`🔍 Searching for existing teacher: "${teacherName}"`)
    
    // Search in faculty collection
    const facultyQuery = await db.collection('faculty').get()
    for (const doc of facultyQuery.docs) {
      const data = doc.data()
      const firstName = data.personalInfo?.firstName || data.firstName || ''
      const lastName = data.personalInfo?.lastName || data.lastName || ''
      const fullName = `${firstName} ${lastName}`.trim()
      
      if (fullName.toLowerCase() === teacherName.toLowerCase()) {
        console.log(`✅ Found existing teacher: ${fullName} (ID: ${doc.id})`)
        return { id: doc.id, exists: true, data: data }
      }
    }
    
    // Search in users collection for faculty
    const usersQuery = await db.collection('users').where('personalInfo.role', '==', 'Faculty').get()
    for (const doc of usersQuery.docs) {
      const data = doc.data()
      const firstName = data.personalInfo?.firstName || data.firstName || ''
      const lastName = data.personalInfo?.lastName || data.lastName || ''
      const fullName = `${firstName} ${lastName}`.trim()
      
      if (fullName.toLowerCase() === teacherName.toLowerCase()) {
        console.log(`✅ Found existing teacher: ${fullName} (ID: ${doc.id})`)
        return { id: doc.id, exists: true, data: data }
      }
    }
    
    console.log(`⚠️  Teacher not found: ${teacherName} - will need manual assignment`)
    return { exists: false }
  } catch (error) {
    console.error('Error finding teacher:', error)
    return { exists: false }
  }
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
  const courseId = await generateSequentialCourseId()
  
  // Process students - only add existing ones
  const studentsArray = []
  const enrolledList = []
  const skippedStudents = []
  
  console.log(`\n🔍 Processing ${students.length} students from CSV...`)
  
  for (let i = 0; i < students.length; i++) {
    const student = students[i]
    const studentName = student.NAME || student.name || `Student ${i + 1}`
    
    console.log(`\n👤 Processing student ${i + 1}/${students.length}: ${studentName}`)
    
    // Check if student exists
    const existingStudent = await findExistingStudent(studentName)
    
    if (existingStudent.exists) {
      // Add existing student to course
      enrolledList.push(existingStudent.id)
      
      studentsArray.push({
        id: existingStudent.id,
        name: studentName,
        email: student['STUDENT EMAIL'] || student.email || '',
        allergies: student.ALLERGIES || student.allergies || 'None',
        photoConsent: student['PHOTO CONSENT'] || student.photoConsent || 'No',
        comments: student['COMMENTS/SSAP'] || student.COMMENTS || student.comments || '',
        parents: student.PARENTS || student.parents || '',
        parentEmail: student.EMAIL || student.parentEmail || '',
        parentPhone: student.PHONE || student.parentPhone || '',
        program: gradeLevel
      })
      
      console.log(`✅ Added existing student: ${studentName} (ID: ${existingStudent.id})`)
    } else {
      // Skip non-existing student
      skippedStudents.push({
        name: studentName,
        email: student['STUDENT EMAIL'] || student.email || '',
        parents: student.PARENTS || student.parents || '',
        parentEmail: student.EMAIL || student.parentEmail || '',
        parentPhone: student.PHONE || student.parentPhone || ''
      })
      
      console.log(`⏭️  Skipped non-existing student: ${studentName} (will handle manually)`)
    }
  }
  
  console.log(`\n📊 Student Processing Summary:`)
  console.log(`   ✅ Total students in CSV: ${students.length}`)
  console.log(`   ✅ Existing students added: ${studentsArray.length}`)
  console.log(`   ⏭️  Non-existing students skipped: ${skippedStudents.length}`)
  
  if (skippedStudents.length > 0) {
    console.log(`\n📋 Students to handle manually:`)
    skippedStudents.forEach((student, index) => {
      console.log(`   ${index + 1}. ${student.name}`)
      console.log(`      📧 Email: ${student.email || 'None'}`)
      console.log(`      👨‍👩‍👧‍👦 Parents: ${student.parents || 'None'}`)
      console.log(`      📧 Parent Email: ${student.parentEmail || 'None'}`)
      console.log(`      📞 Parent Phone: ${student.parentPhone || 'None'}`)
    })
  }

  // Get the appropriate teacher for this grade level
  const gradeKey = Object.keys(STAFF_MAP).find(key => 
    gradeLevel.toLowerCase().includes(key.toLowerCase()) ||
    key.toLowerCase().includes(gradeLevel.toLowerCase())
  )
  
  let teacherInfo = null
  if (gradeKey) {
    const staffData = STAFF_MAP[gradeKey]
    teacherInfo = await findOrCreateTeacher(staffData.name, staffData.role, staffData.source)
    
    if (teacherInfo.exists) {
      console.log(`👨‍🏫 Assigned teacher: ${staffData.name} (ID: ${teacherInfo.id}) to ${gradeLevel}`)
    } else {
      console.log(`⚠️  Teacher not found: ${staffData.name} - will need manual assignment`)
    }
  } else {
    console.log(`⚠️  No teacher mapping found for grade level: ${gradeLevel}`)
  }

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
    grade: grade,
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
    subject: subject,
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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    title: `Homeroom ${gradeLevel}`,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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

// Helper function to write skipped students to CSV
async function writeSkippedStudentsToCSV(allSkippedStudents) {
  if (allSkippedStudents.length === 0) {
    console.log('\n✅ No students were skipped - no CSV file needed')
    return
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const csvFileName = `skipped_students_${timestamp}.csv`
  const csvFilePath = path.join(__dirname, csvFileName)

  const csvWriter = createCsvWriter({
    path: csvFilePath,
    header: [
      { id: 'name', title: 'Student Name' },
      { id: 'email', title: 'Student Email' },
      { id: 'parents', title: 'Parents' },
      { id: 'parentEmail', title: 'Parent Email' },
      { id: 'parentPhone', title: 'Parent Phone' },
      { id: 'grade', title: 'Grade' },
      { id: 'csvFile', title: 'Source CSV File' },
      { id: 'reason', title: 'Reason Skipped' }
    ]
  })

  try {
    await csvWriter.writeRecords(allSkippedStudents)
    console.log(`\n📄 Skipped students CSV created: ${csvFileName}`)
    console.log(`📁 Location: ${csvFilePath}`)
    console.log(`📊 Total skipped students: ${allSkippedStudents.length}`)
  } catch (error) {
    console.error('❌ Error writing CSV file:', error)
  }
}

// Main function to create classes from CSV files
async function createClassesFromCSV() {
  try {
    console.log('🏫 Starting class creation from CSV files...')
    console.log(`📍 Project: ${serviceAccount.project_id}`)
    console.log(`📅 Academic Year: ${ACADEMIC_YEAR}`)
    console.log(`🎯 Processing all courses`)
    console.log(`🧪 Dry run mode: ${DRY_RUN}`)
    
    // Test connection
    console.log('\n🔍 Testing Firestore connection...')
    const testQuery = await db.collection('courses').limit(1).get()
    console.log('✅ Firestore connection successful!')
    
    // Get CSV files - process all courses
    const csvDir = path.join(__dirname, 'ClassList')
    const files = fs.readdirSync(csvDir).filter(file => file.endsWith('.csv'))
    
    console.log(`\n📁 Found ${files.length} CSV files to process`)
    
    if (files.length === 0) {
      console.log('⚠️  No CSV files found in ClassList directory')
      return
    }
    
    // List all files to be processed
    console.log('\n📋 CSV files to process:')
    files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`)
    })
    
    // Track all skipped students across all files
    const allSkippedStudents = []
    
    // Process all CSV files
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const filename = files[fileIndex]
      console.log(`\n${'='.repeat(60)}`)
      console.log(`📚 Processing file ${fileIndex + 1}/${files.length}: ${filename}`)
      console.log(`${'='.repeat(60)}`)
      
      const filePath = path.join(csvDir, filename)
      const students = await parseCSVFile(filePath)
      
      if (students.length === 0) {
        console.log(`⚠️  No students found in ${filename}`)
        continue
      }
      
      // Extract grade information
      const grade = extractGradeFromFilename(filename)
      const gradeLevel = GRADE_LEVEL_MAP[filename.match(/(?:GRADE|Grade|SK)\s*\d*/i)?.[0]] || 'Unknown'
      const subject = SUBJECT_MAP[filename.match(/(?:GRADE|Grade|SK)\s*\d*/i)?.[0]] || 'General'
      
      console.log(`📊 Grade: ${grade}, Level: ${gradeLevel}, Subject: ${subject}`)
      console.log(`👥 Students in CSV: ${students.length}`)
      
      // Create course document
      console.log('\n🔨 Creating course document...')
      const courseDoc = await createCourseDocument(filename, students, grade, gradeLevel, subject)
      
      console.log(`✅ Course document created successfully!`)
      console.log(`📋 Course ID: ${courseDoc.courseId}`)
      console.log(`📚 Course Name: ${courseDoc.name}`)
      console.log(`👥 Students enrolled: ${courseDoc.students.length}`)
      console.log(`👨‍🏫 Teacher: ${courseDoc.teacher[0]?.name || 'None assigned'}`)
      
      // Add skipped students to the global list
      if (courseDoc.metadata.nonExistingStudentsSkipped > 0) {
        console.log(`\n⏭️  Skipped ${courseDoc.metadata.nonExistingStudentsSkipped} non-existing students for manual handling`)
        
        // Add each skipped student to the global list with additional metadata
        courseDoc.metadata.skippedStudents.forEach(skippedStudent => {
          allSkippedStudents.push({
            name: skippedStudent.name,
            email: skippedStudent.email,
            parents: skippedStudent.parents,
            parentEmail: skippedStudent.parentEmail,
            parentPhone: skippedStudent.parentPhone,
            grade: gradeLevel,
            csvFile: filename,
            reason: 'Student not found in database'
          })
        })
      }
      
      // Actually create the course in Firebase if not in dry run mode
      if (!DRY_RUN) {
        console.log('\n🚀 Creating course in Firebase...')
        
        try {
          const courseRef = db.collection('courses').doc(courseDoc.courseId)
          await courseRef.set(courseDoc)
          console.log(`✅ Course successfully created in Firebase!`)
          console.log(`📋 Document ID: ${courseRef.id}`)
          
          // Verify the course was created
          const createdCourse = await courseRef.get()
          if (createdCourse.exists) {
            console.log(`✅ Course verification successful - document exists in database`)
          } else {
            console.log(`❌ Course verification failed - document not found in database`)
          }
          
        } catch (error) {
          console.error('❌ Error creating course in Firebase:', error)
          throw error
        }
      } else {
        console.log('\n🧪 DRY RUN - Course not actually created in Firebase')
        console.log('   To create courses, set DRY_RUN = false in the script')
      }
    }
    
    // Write all skipped students to CSV file
    await writeSkippedStudentsToCSV(allSkippedStudents)
    
    console.log('\n🎉 Class creation completed successfully!')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  createClassesFromCSV()
    .then(() => {
      console.log('\n✅ Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error)
      process.exit(1)
    })
}

module.exports = { createClassesFromCSV }
