const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

// Import Firebase Admin SDK
const admin = require('firebase-admin')

// Initialize Firebase Admin SDK using service account key
try {
  // Check if Firebase Admin is already initialized
  if (!admin.apps.length) {
    // Try service account key first
    try {
      const serviceAccount = require('./serviceAccountKey.json')
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      })
      console.log('🔥 Firebase initialized with service account key')
    } catch (keyError) {
      // Fallback to default credentials
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      })
      console.log('🔥 Firebase Admin SDK initialized with default credentials')
    }
  }
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message)
  console.error('   Please set up Firebase authentication or add serviceAccountKey.json')
  process.exit(1)
}

const db = admin.firestore()

async function connectParentsToStudents() {
  console.log('👨‍👩‍👧‍👦 Starting parent-student connection process...')
  console.log(`🔥 Firebase Project: ${process.env.VITE_FIREBASE_PROJECT_ID}`)

  try {
    // Step 1: Fetch all students
    console.log('\n📚 Fetching all students...')
    const studentsSnapshot = await db.collection('students').get()
    console.log(`✅ Found ${studentsSnapshot.size} students`)

    // Step 2: Fetch all parents
    console.log('\n👥 Fetching all parents...')
    const parentsSnapshot = await db.collection('parents').get()
    console.log(`✅ Found ${parentsSnapshot.size} parents`)

    // Step 3: Create a map of tarbiyahId -> parent document
    console.log('\n🗺️  Creating parent lookup map...')
    const parentMap = new Map()

    parentsSnapshot.forEach((doc) => {
      const parentData = doc.data()
      const parentId = doc.id
      parentMap.set(parentId, {
        docId: parentId,
        data: parentData,
      })
    })

    console.log(`✅ Created lookup map for ${parentMap.size} parents`)

    // Step 4: Process each student and find their parents
    console.log('\n🔗 Connecting students to parents...')
    
    let connectionsFound = 0
    let updatesPerformed = 0
    const parentUpdates = new Map() // Map to accumulate student data for each parent

    studentsSnapshot.forEach((studentDoc) => {
      const studentData = studentDoc.data()
      const studentId = studentDoc.id
      const studentFullName = `${studentData.personalInfo.firstName} ${studentData.personalInfo.lastName}`.trim()

      console.log(`\n📝 Processing student: ${studentFullName} (ID: ${studentId})`)

      // Check for father connection
      if (studentData.parents?.father?.tarbiyahId) {
        const fatherTarbiyahId = studentData.parents.father.tarbiyahId
        console.log(`   👨 Father tarbiyahId: ${fatherTarbiyahId}`)

        if (parentMap.has(fatherTarbiyahId)) {
          const parent = parentMap.get(fatherTarbiyahId)
          const parentFullName = `${parent.data.personalInfo.firstName} ${parent.data.personalInfo.lastName}`.trim()
          
          console.log(`   ✅ Found father: ${parentFullName}`)
          connectionsFound++

          // Initialize parent update entry if not exists
          if (!parentUpdates.has(fatherTarbiyahId)) {
            parentUpdates.set(fatherTarbiyahId, {
              parentName: parentFullName,
              students: [...(parent.data.students || [])] // Copy existing students array
            })
          }

          // Add student to the parent's students array if not already present
          const parentUpdate = parentUpdates.get(fatherTarbiyahId)
          const existingStudent = parentUpdate.students.find(s => s.studentId === studentId)
          
          if (!existingStudent) {
            parentUpdate.students.push({
              studentId: studentId,
              studentName: studentFullName,
              relationship: 'child'
            })
            console.log(`   ➕ Added student to father's list`)
          } else {
            console.log(`   ⚠️  Student already in father's list`)
          }
        } else {
          console.log(`   ❌ Father not found with tarbiyahId: ${fatherTarbiyahId}`)
        }
      } else {
        console.log(`   ⚠️  No father tarbiyahId found`)
      }

      // Check for mother connection
      if (studentData.parents?.mother?.tarbiyahId) {
        const motherTarbiyahId = studentData.parents.mother.tarbiyahId
        console.log(`   👩 Mother tarbiyahId: ${motherTarbiyahId}`)

        if (parentMap.has(motherTarbiyahId)) {
          const parent = parentMap.get(motherTarbiyahId)
          const parentFullName = `${parent.data.personalInfo.firstName} ${parent.data.personalInfo.lastName}`.trim()
          
          console.log(`   ✅ Found mother: ${parentFullName}`)
          connectionsFound++

          // Initialize parent update entry if not exists
          if (!parentUpdates.has(motherTarbiyahId)) {
            parentUpdates.set(motherTarbiyahId, {
              parentName: parentFullName,
              students: [...(parent.data.students || [])] // Copy existing students array
            })
          }

          // Add student to the parent's students array if not already present
          const parentUpdate = parentUpdates.get(motherTarbiyahId)
          const existingStudent = parentUpdate.students.find(s => s.studentId === studentId)
          
          if (!existingStudent) {
            parentUpdate.students.push({
              studentId: studentId,
              studentName: studentFullName,
              relationship: 'child'
            })
            console.log(`   ➕ Added student to mother's list`)
          } else {
            console.log(`   ⚠️  Student already in mother's list`)
          }
        } else {
          console.log(`   ❌ Mother not found with tarbiyahId: ${motherTarbiyahId}`)
        }
      } else {
        console.log(`   ⚠️  No mother tarbiyahId found`)
      }
    })

    // Step 5: Apply all updates to Firestore
    console.log('\n💾 Updating parent documents in Firestore...')
    
    for (const [parentId, updateData] of parentUpdates) {
      try {
        await db.collection('parents').doc(parentId).update({
          students: updateData.students,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        })
        
        updatesPerformed++
        console.log(`   ✅ Updated ${updateData.parentName} (${parentId}) with ${updateData.students.length} students`)
      } catch (error) {
        console.error(`   ❌ Error updating parent ${parentId}:`, error.message)
      }
    }

    // Step 6: Summary
    console.log('\n🎉 Connection process completed!')
    console.log(`📊 Summary:`)
    console.log(`   • Total students processed: ${studentsSnapshot.size}`)
    console.log(`   • Total parents available: ${parentsSnapshot.size}`)
    console.log(`   • Parent-child connections found: ${connectionsFound}`)
    console.log(`   • Parent documents updated: ${updatesPerformed}`)
    console.log(`   • Firebase project: ${process.env.VITE_FIREBASE_PROJECT_ID}`)

    // Step 7: Verification - show a few examples
    console.log('\n🔍 Verification - Sample parent documents:')
    const sampleParentsQuery = await db.collection('parents').where('students', '!=', []).limit(3).get()
    
    sampleParentsQuery.forEach((doc) => {
      const data = doc.data()
      const parentName = `${data.personalInfo.firstName} ${data.personalInfo.lastName}`.trim()
      console.log(`   • ${parentName} (${doc.id}): ${data.students.length} students`)
      data.students.forEach((student, index) => {
        console.log(`     ${index + 1}. ${student.studentName} (${student.studentId})`)
      })
    })

  } catch (error) {
    console.error('❌ Error during connection process:', error)
    console.error('   Make sure you have proper Firebase authentication set up')
  }
}

// Run the connection process
connectParentsToStudents()
  .then(() => {
    console.log('\n✨ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  }) 