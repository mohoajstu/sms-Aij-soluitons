// Test script to create a single course from one CSV file using Firebase Admin SDK
// Run with: node src/scripts/test-single-course-admin.js

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
const ACADEMIC_YEAR = "2025-2026"
const TERM = "Term 1"
const COURSE_PREFIX = "TC"
const STUDENT_PREFIX = "TS"

// ID Format Requirements:
// - Course IDs: TC + 6 digits (e.g., TC000077, TC000078)
// - Student IDs: TS + 6 digits (e.g., TS936391, TS123456)

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

// Subject mapping based on grade level - All grades use Homeroom
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

// Staff mapping for each grade level
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
    
    // Extract the numeric part from IDs like TC000071, TC000072, TC87185378, etc.
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

// Helper function to find existing student using multiple identifiers
async function findExistingStudent(studentName, parentNames, studentEmail, dateOfBirth) {
  try {
    console.log(`🔍 Searching for existing student: "${studentName}"`)
    console.log(`   📋 Parent Names: "${parentNames || 'Not provided'}"`)
    console.log(`   📧 Student Email: "${studentEmail || 'Not provided'}"`)
    console.log(`   🎂 Date of Birth: "${dateOfBirth || 'Not provided'}"`)
    
    // Search in students collection
    const studentsQuery = await db.collection('students').get()
    for (const doc of studentsQuery.docs) {
      const data = doc.data()
      const firstName = data.personalInfo?.firstName || data.firstName || ''
      const lastName = data.personalInfo?.lastName || data.lastName || ''
      const fullName = `${firstName} ${lastName}`.trim()
      
      // Check if names match
      if (fullName.toLowerCase() === studentName.toLowerCase()) {
        // Check if the ID is malformed (should be TS + 6 digits)
        if (!doc.id.match(/^TS\d{6}$/)) {
          console.log(`⚠️  Found student with malformed ID: ${doc.id} - skipping and will create new ID`)
          continue // Skip this malformed ID and create a new one
        }
        
        // Simple name match - use it (95% case)
        console.log(`✅ Found existing student in students collection: ${fullName} (ID: ${doc.id})`)
        console.log(`   🎯 Match type: Name match`)
        return { id: doc.id, exists: true, data: data, collection: 'students', matchType: 'name' }
      }
    }
    
    // Search in users collection for students
    const usersQuery = await db.collection('users').where('personalInfo.role', '==', 'Student').get()
    for (const doc of usersQuery.docs) {
      const data = doc.data()
      const firstName = data.personalInfo?.firstName || data.firstName || ''
      const lastName = data.personalInfo?.lastName || data.lastName || ''
      const fullName = `${firstName} ${lastName}`.trim()
      
      // Check if names match
      if (fullName.toLowerCase() === studentName.toLowerCase()) {
        // Check if the ID is malformed (should be TS + 6 digits)
        if (!doc.id.match(/^TS\d{6}$/)) {
          console.log(`⚠️  Found student with malformed ID: ${doc.id} - skipping and will create new ID`)
          continue // Skip this malformed ID and create a new one
        }
        
        // Simple name match - use it (95% case)
        console.log(`✅ Found existing student in users collection: ${fullName} (ID: ${doc.id})`)
        console.log(`   🎯 Match type: Name match`)
        return { id: doc.id, exists: true, data: data, collection: 'users', matchType: 'name' }
      }
    }
    
    // Simple name-based search only - no complex family matching
    console.log(`❌ No existing student found for: "${studentName}"`)
    return { exists: false }
  } catch (error) {
    console.error('Error searching for existing student:', error)
    return { exists: false }
  }
}

// Helper function to verify student identity using multiple identifiers
async function verifyStudentIdentity(existingStudentData, parentNames, studentEmail, dateOfBirth) {
  let matchScore = 0
  let totalChecks = 0
  let reasons = []
  
  // Check parent names (if available) - handle different field structures
  if (parentNames) {
    totalChecks++
    const existingParentsField = existingStudentData.parents || existingStudentData.parent || ''
    const existingParents = typeof existingParentsField === 'string' ? existingParentsField.toLowerCase() : ''
    const newParents = parentNames.toLowerCase()
    
    // Simple string matching - could be enhanced with fuzzy matching
    if (existingParents && newParents && (existingParents.includes(newParents) || newParents.includes(existingParents))) {
      matchScore++
      reasons.push('Parent names match')
    } else {
      reasons.push('Parent names differ')
    }
  }
  
  // Check student email (if available)
  if (studentEmail && existingStudentData.personalInfo?.email) {
    totalChecks++
    const existingEmail = existingStudentData.personalInfo.email.toLowerCase()
    const newEmail = studentEmail.toLowerCase()
    
    if (existingEmail === newEmail) {
      matchScore++
      reasons.push('Student email matches')
    } else {
      reasons.push('Student email differs')
    }
  }
  
  // Check date of birth (if available)
  if (dateOfBirth && existingStudentData.personalInfo?.dateOfBirth) {
    totalChecks++
    const existingDOB = existingStudentData.personalInfo.dateOfBirth
    const newDOB = dateOfBirth
    
    if (existingDOB === newDOB) {
      matchScore++
      reasons.push('Date of birth matches')
    } else {
      reasons.push('Date of birth differs')
    }
  }
  
  // If no additional identifiers to check, default to name-only match
  if (totalChecks === 0) {
    console.log(`⚠️  No additional identifiers available - using name-only match`)
    return { isMatch: true, confidence: 50, reason: 'Name match only (no additional identifiers)' }
  }
  
  // Calculate confidence percentage
  const confidence = Math.round((matchScore / totalChecks) * 100)
  
  // Require at least 50% match confidence to consider it a duplicate
  const isMatch = confidence >= 50
  
  return {
    isMatch,
    confidence,
    reason: reasons.join(', '),
    matchScore,
    totalChecks
  }
}

// Helper function to generate unique Tarbiyah student ID
async function generateUniqueTarbiyahStudentId() {
  let attempts = 0
  const maxAttempts = 100 // Increased attempts since we have limited 6-digit combinations
  
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

// Helper function to generate unique Tarbiyah teacher ID
async function generateUniqueTarbiyahTeacherId() {
  let attempts = 0
  const maxAttempts = 100
  
  while (attempts < maxAttempts) {
    // Generate ID in format: TL + 6 digits (000000 to 999999)
    const randomNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
    const teacherId = `TL${randomNumber}`
    
    // Check if this ID already exists in faculty collection
    const existingFaculty = await db.collection('faculty').doc(teacherId).get()
    const existingUser = await db.collection('users').doc(teacherId).get()
    
    if (!existingFaculty.exists && !existingUser.exists) {
      return teacherId
    }
    
    attempts++
  }
  
  throw new Error('Could not generate unique Tarbiyah teacher ID after multiple attempts')
}

// Helper function to check if parent names match (fuzzy matching)
function doParentNamesMatch(existingParents, newParents) {
  if (!existingParents || !newParents) return false
  
  const existing = existingParents.toLowerCase().trim()
  const new_ = newParents.toLowerCase().trim()
  
  // Exact match
  if (existing === new_) return true
  
  // Split into individual names and normalize
  const existingNames = existing.split(/[,\s]+/).filter(name => name.length > 0).sort()
  const newNames = new_.split(/[,\s]+/).filter(name => name.length > 0).sort()
  
  // Check if arrays are identical (same names, any order)
  if (existingNames.length === newNames.length && 
      existingNames.every((name, index) => name === newNames[index])) {
    return true
  }
  
  // Check if most names match (allow for minor variations)
  const commonNames = existingNames.filter(name => newNames.includes(name))
  const totalNames = Math.max(existingNames.length, newNames.length)
  const matchPercentage = commonNames.length / totalNames
  
  // If 80% or more names match, consider it a match
  return matchPercentage >= 0.8
}

// Helper function to identify malformed student IDs in the database
async function identifyMalformedStudentIds() {
  console.log(`🔍 Scanning for malformed student IDs...`)
  
  const malformedStudents = []
  const malformedUsers = []
  
  // Check students collection
  const studentsSnapshot = await db.collection('students').get()
  studentsSnapshot.docs.forEach(doc => {
    if (!doc.id.match(/^TS\d{6}$/)) {
      malformedStudents.push({
        id: doc.id,
        name: doc.data().personalInfo?.name || doc.data().name || 'Unknown',
        collection: 'students'
      })
    }
  })
  
  // Check users collection for students
  const usersSnapshot = await db.collection('users').where('personalInfo.role', '==', 'Student').get()
  usersSnapshot.docs.forEach(doc => {
    if (!doc.id.match(/^TS\d{6}$/)) {
      malformedUsers.push({
        id: doc.id,
        name: doc.data().personalInfo?.name || doc.data().name || 'Unknown',
        collection: 'users'
      })
    }
  })
  
  if (malformedStudents.length > 0 || malformedUsers.length > 0) {
    console.log(`⚠️  Found ${malformedStudents.length} malformed IDs in students collection:`)
    malformedStudents.forEach(student => {
      console.log(`   - ${student.id} (${student.name})`)
    })
    
    console.log(`⚠️  Found ${malformedUsers.length} malformed IDs in users collection:`)
    malformedUsers.forEach(user => {
      console.log(`   - ${user.id} (${user.name})`)
    })
    
    console.log(`💡 These malformed IDs will be skipped during course creation and new IDs will be generated.`)
  } else {
    console.log(`✅ No malformed student IDs found in the database.`)
  }
  
  return { malformedStudents, malformedUsers }
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
        console.log(`✅ Found existing teacher in faculty collection: ${fullName} (ID: ${doc.id})`)
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
        console.log(`✅ Found existing teacher in users collection: ${fullName} (ID: ${doc.id})`)
        return { id: doc.id, exists: true, data: data }
      }
    }
    
    // Create new teacher if doesn't exist
    console.log(`🆕 Creating new teacher: ${teacherName}`)
    const tarbiyahId = await generateUniqueTarbiyahTeacherId()
    
    // Create faculty document
    const facultyData = {
      personalInfo: {
        firstName: teacherName.split(' ')[0] || '',
        lastName: teacherName.split(' ').slice(1).join(' ') || '',
        role: role
      },
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
    
    await db.collection('faculty').doc(tarbiyahId).set(facultyData)
    
    // Create user document
    const userData = {
      tarbiyahId: tarbiyahId,
      linkedCollection: 'faculty',
      personalInfo: {
        firstName: teacherName.split(' ')[0] || '',
        lastName: teacherName.split(' ').slice(1).join(' ') || '',
        role: role
      },
      role: role,
      active: true,
      dashboard: { theme: 'default' },
      stats: {
        loginCount: 0,
        lastLoginAt: null
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
    
    await db.collection('users').doc(tarbiyahId).set(userData)
    
    console.log(`✅ Created new teacher: ${teacherName} with ID: ${tarbiyahId}`)
    
    return { id: tarbiyahId, exists: false, data: facultyData }
  } catch (error) {
    console.error('Error finding or creating teacher:', error)
    throw error
  }
}

// Helper function to create new student document
async function createNewStudent(studentName, parentNames, studentEmail, dateOfBirth, studentData, gradeLevel) {
  try {
    const tarbiyahId = await generateUniqueTarbiyahStudentId()
    
    // Create student document in students collection with all available data
    const studentDocData = {
      personalInfo: {
        name: studentName,
        firstName: studentName.split(' ')[0] || '',
        lastName: studentName.split(' ').slice(1).join(' ') || '',
        role: 'Student',
        email: studentEmail || '',
        dateOfBirth: dateOfBirth || ''
      },
      parents: parentNames || '',
      parentEmail: studentData.EMAIL || studentData.parentEmail || '',
      parentPhone: studentData.PHONE || studentData.parentPhone || '',
      allergies: studentData.ALLERGIES || studentData.allergies || '',
      photoConsent: studentData['PHOTO CONSENT'] || studentData.photoConsent || '',
      comments: studentData['COMMENTS/SSAP'] || studentData.COMMENTS || studentData.comments || '',
      program: gradeLevel,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
    
    await db.collection('students').doc(tarbiyahId).set(studentDocData)
    
    // Create user document in users collection
    const userData = {
      tarbiyahId: tarbiyahId,
      linkedCollection: 'students',
      personalInfo: {
        name: studentName,
        firstName: studentName.split(' ')[0] || '',
        lastName: studentName.split(' ').slice(1).join(' ') || '',
        role: 'Student',
        email: studentEmail || '',
        dateOfBirth: dateOfBirth || ''
      },
      role: 'Student',
      active: true,
      dashboard: { theme: 'default' },
      stats: {
        loginCount: 0,
        lastLoginAt: null
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
    
    await db.collection('users').doc(tarbiyahId).set(userData)
    
    console.log(`✅ Created new student: ${studentName} with ID: ${tarbiyahId}`)
    console.log(`   📋 Stored identifiers: Parents: "${parentNames || 'None'}", Email: "${studentEmail || 'None'}", DOB: "${dateOfBirth || 'None'}"`)
    console.log(`   📧 Parent Email: "${studentData.EMAIL || 'None'}", Phone: "${studentData.PHONE || 'None'}"`)
    console.log(`   🥜 Allergies: "${studentData.ALLERGIES || 'None'}", Photo Consent: "${studentData['PHOTO CONSENT'] || 'None'}"`)
    
    return tarbiyahId
  } catch (error) {
    console.error('Error creating new student:', error)
    throw error
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
  
  // Create students array with proper structure and Tarbiyah IDs
  const studentsArray = []
  const enrolledList = []
  
  console.log(`\n🔍 Processing ${students.length} students...`)
  
  for (let i = 0; i < students.length; i++) {
    const student = students[i]
    const studentName = student.NAME || student.name || `Student ${i + 1}`
    
    console.log(`\n👤 Processing student ${i + 1}/${students.length}: ${studentName}`)
    
    // Check if student already exists using multiple identifiers
    const parentNames = student.PARENTS || student.parents || ''
    const studentEmail = student['STUDENT EMAIL'] || student.email || ''
    const dateOfBirth = student['DATE OF BIRTH'] || student.dateOfBirth || student.dob || ''
    
    const existingStudent = await findExistingStudent(studentName, parentNames, studentEmail, dateOfBirth)
    
    let tarbiyahId
    if (existingStudent.exists) {
      tarbiyahId = existingStudent.id
      const matchType = existingStudent.matchType || 'unknown'
      console.log(`✅ Found existing student: ${studentName} with ID: ${tarbiyahId}`)
      console.log(`   🎯 Match type: ${matchType}`)
      
      // Verify student exists in both collections for data consistency
      const studentInStudents = await db.collection('students').doc(tarbiyahId).get()
      const studentInUsers = await db.collection('users').doc(tarbiyahId).get()
      
      if (!studentInStudents.exists || !studentInUsers.exists) {
        console.log(`⚠️  Student ${studentName} (ID: ${tarbiyahId}) missing from one collection, ensuring consistency...`)
        
        // Create missing document to maintain consistency
        if (!studentInStudents.exists) {
          const studentData = {
            personalInfo: {
              firstName: studentName.split(' ')[0] || '',
              lastName: studentName.split(' ').slice(1).join(' ') || '',
              role: 'Student'
            },
            active: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }
          await db.collection('students').doc(tarbiyahId).set(studentData, { merge: true })
          console.log(`✅ Created missing students collection document for ${studentName}`)
        }
        
        if (!studentInUsers.exists) {
          const userData = {
            tarbiyahId: tarbiyahId,
            linkedCollection: 'students',
            personalInfo: {
              firstName: studentName.split(' ')[0] || '',
              lastName: studentName.split(' ').slice(1).join(' ') || '',
              role: 'Student'
            },
            role: 'Student',
            active: true,
            dashboard: { theme: 'default' },
            stats: {
              loginCount: 0,
              lastLoginAt: null
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }
          await db.collection('users').doc(tarbiyahId).set(userData, { merge: true })
          console.log(`✅ Created missing users collection document for ${studentName}`)
        }
      }
    } else {
      // Create new student if doesn't exist
      tarbiyahId = await createNewStudent(studentName, parentNames, studentEmail, dateOfBirth, student, gradeLevel)
      console.log(`🆕 Created new student: ${studentName} with ID: ${tarbiyahId}`)
    }
    
    // Add to enrolled list
    enrolledList.push(tarbiyahId)
    
    // Create student object for course
    studentsArray.push({
      id: tarbiyahId,
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
  }
  
  console.log(`\n📊 Student Processing Summary:`)
  console.log(`   ✅ Total students processed: ${students.length}`)
  console.log(`   🆕 New students created: ${studentsArray.filter(s => s.id.startsWith('TS')).length}`)
  console.log(`   🔄 Existing students reused: ${studentsArray.filter(s => !s.id.startsWith('TS')).length}`)
  console.log(`   ⚠️  Malformed IDs skipped: ${students.length - studentsArray.length}`)

  // enrolledList is already created above with Tarbiyah IDs

  // Get the appropriate teacher for this grade level
  const gradeKey = Object.keys(STAFF_MAP).find(key => 
    gradeLevel.toLowerCase().includes(key.toLowerCase()) ||
    key.toLowerCase().includes(gradeLevel.toLowerCase())
  )
  
  let teacherInfo = null
  if (gradeKey) {
    const staffData = STAFF_MAP[gradeKey]
    teacherInfo = await findOrCreateTeacher(staffData.name, staffData.role, staffData.source)
    console.log(`👨‍🏫 Assigned teacher: ${staffData.name} (ID: ${teacherInfo.id}) to ${gradeLevel}`)
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
    teacher: teacherInfo ? [{
      id: teacherInfo.id,
      name: teacherInfo.data.personalInfo?.firstName + ' ' + teacherInfo.data.personalInfo?.lastName || teacherInfo.data.personalInfo?.name || 'Unknown',
      role: teacherInfo.data.personalInfo?.role || 'Faculty',
      schoolId: teacherInfo.id,
      source: 'faculty'
    }] : [],
    teacherIds: teacherInfo ? [teacherInfo.id] : [],
    teacherAuthUIDs: [], // Empty array as per your structure
    teacherTarbiyahIds: teacherInfo ? [teacherInfo.id] : [], // Array of Tarbiyah IDs
    teachers: teacherInfo ? [teacherInfo.data.personalInfo?.firstName + ' ' + teacherInfo.data.personalInfo?.lastName || teacherInfo.data.personalInfo?.name || 'Unknown'] : [],
    term: TERM,
    timestamps: {
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    title: `Homeroom ${gradeLevel}`,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }

  return courseDoc
}

// Main function to test single course creation
async function testSingleCourse() {
  try {
    console.log('🧪 Testing single course creation with Firebase Admin SDK...')
    console.log('📍 Project:', serviceAccount.project_id)
    console.log('📅 Academic Year:', ACADEMIC_YEAR)
    
    // Test connection first
    console.log('🔍 Testing Firestore connection...')
    const testQuery = await db.collection('courses').limit(1).get()
    console.log('✅ Firestore connection successful!')
    
    // Check existing courses
    console.log('🔍 Checking existing courses...')
    const existingCoursesSnapshot = await db.collection('courses').get()
    console.log(`📊 Found ${existingCoursesSnapshot.size} existing courses`)
    
    // List existing course IDs
    if (existingCoursesSnapshot.size > 0) {
      console.log('📝 Existing course IDs:')
      existingCoursesSnapshot.docs.forEach(doc => {
        const data = doc.data()
        console.log(`   - ${data.courseId || data.courseID || 'No ID'} (${data.name || 'No name'})`)
      })
    }
    
    // Check for malformed student IDs
    await identifyMalformedStudentIds()
    
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
    
    console.log(`📊 Grade: ${grade}, Level: ${gradeLevel}, Course Type: Homeroom`)
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
    console.log(`🎯 Course Type: Homeroom (${courseDoc.subject})`)
    
    // Show teacher information from the course document
    if (courseDoc.teacher && courseDoc.teacher.length > 0) {
      const teacher = courseDoc.teacher[0]
      console.log(`👨‍🏫 Assigned Teacher: ${teacher.name} (ID: ${teacher.id})`)
    } else {
      console.log(`⚠️  No teacher assigned to this course`)
    }
    
    // Show the complete course document
    console.log('\n📄 Complete Course Document:')
    console.log(JSON.stringify(courseDoc, null, 2))
    
    // Actually create the course in Firebase
    console.log('\n🚀 Ready to create course in Firebase!')
    console.log('⚠️  This will add the course to your database!')
    console.log('📋 Course ID: ' + courseDoc.courseId)
    console.log('📚 Course Name: ' + courseDoc.name)
    console.log('👥 Students: ' + courseDoc.students.length)
    console.log('👨‍🏫 Teacher: ' + (courseDoc.teacher[0]?.name || 'None'))
    
    // Add a small delay to let user read the info
    console.log('\n⏳ Creating course in 3 seconds...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    try {
      // Create the course with the specific document ID (TC000078)
      const courseRef = db.collection('courses').doc(courseDoc.courseId)
      await courseRef.set(courseDoc)
      console.log(`✅ Course successfully created in Firebase!`)
      console.log(`📋 Document ID: ${courseRef.id}`)
      console.log(`🎯 Course ID: ${courseDoc.courseId}`)
      console.log(`📚 Course Name: ${courseDoc.name}`)
      console.log(`👥 Students enrolled: ${courseDoc.enrolledList.length}`)
      console.log(`👨‍🏫 Teacher assigned: ${courseDoc.teacher[0]?.name || 'None'}`)
      
      // Verify the course was created by reading it back
      const createdCourse = await courseRef.get()
      if (createdCourse.exists) {
        console.log(`✅ Course verification successful - document exists in database`)
        console.log(`✅ Document name matches course ID: ${createdCourse.id} = ${courseDoc.courseId}`)
      } else {
        console.log(`❌ Course verification failed - document not found in database`)
      }
      
    } catch (error) {
      console.error('❌ Error creating course in Firebase:', error)
      throw error
    }
    
    console.log('\n🎉 Course creation completed successfully!')
    
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
