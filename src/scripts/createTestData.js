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
const auth = admin.auth()

// Helper function to convert tarbiyahId to email format (same as existing system)
function tarbiyahIdToEmail(tarbiyahId) {
  return `${tarbiyahId}@gmail.com`
}

async function createTestData() {
  console.log('🧪 Creating test parent and student data...')
  console.log(`🔥 Firebase Project: ${process.env.VITE_FIREBASE_PROJECT_ID}`)

  try {
    // Test parent data with mostly blank fields
    const testParent = {
      active: true,
      primaryRole: 'Parent',
      schoolId: 'TEST_PARENT_001',
      personalInfo: {
        lastName: 'TestParent',
        firstName: 'Test',
        middleName: '',
        salutation: '',
        dob: '',
        gender: '',
      },
      students: [], // This should be populated by the connection script
      citizenship: {
        nationality: '',
        nationalId: '',
        nationalIdExpiry: '',
      },
      contact: {
        email: '',
        phone1: '',
        phone2: '',
        emergencyPhone: '',
      },
      address: {
        poBox: '',
        streetAddress: '',
        residentialArea: '',
      },
      language: {
        primary: '',
        secondary: '',
      },
      schooling: {
        daySchoolEmployer: '',
        custodyDetails: '',
        notes: '',
      },
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    // Test student 1 - child of test parent
    const testStudent1 = {
      active: true,
      primaryRole: 'Student',
      schoolId: 'TEST_STUDENT_001',
      personalInfo: {
        lastName: 'TestChild',
        firstName: 'Test',
        middleName: '',
        nickName: '',
        salutation: '',
        dob: '',
        gender: '',
      },
      parents: {
        father: {
          name: 'Test TestParent',
          tarbiyahId: 'TEST_PARENT_001', // This should match the parent's schoolId
        },
        mother: {
          name: '',
          tarbiyahId: '',
        },
      },
      citizenship: {
        nationality: '',
        nationalId: '',
        nationalIdExpiry: '',
      },
      contact: {
        email: '',
        phone1: '',
        phone2: '',
        emergencyPhone: '',
      },
      address: {
        poBox: '',
        streetAddress: '',
        residentialArea: '',
      },
      language: {
        primary: '',
        secondary: '',
      },
      schooling: {
        daySchoolEmployer: '',
        program: '',
        returningStudentYear: '',
        custodyDetails: '',
        notes: '',
      },
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    // Test student 2 - second child of same test parent
    const testStudent2 = {
      active: true,
      primaryRole: 'Student',
      schoolId: 'TEST_STUDENT_002',
      personalInfo: {
        lastName: 'TestChild',
        firstName: 'TestTwo',
        middleName: '',
        nickName: '',
        salutation: '',
        dob: '',
        gender: '',
      },
      parents: {
        father: {
          name: 'Test TestParent',
          tarbiyahId: 'TEST_PARENT_001', // Same parent as first child
        },
        mother: {
          name: '',
          tarbiyahId: '',
        },
      },
      citizenship: {
        nationality: '',
        nationalId: '',
        nationalIdExpiry: '',
      },
      contact: {
        email: '',
        phone1: '',
        phone2: '',
        emergencyPhone: '',
      },
      address: {
        poBox: '',
        streetAddress: '',
        residentialArea: '',
      },
      language: {
        primary: '',
        secondary: '',
      },
      schooling: {
        daySchoolEmployer: '',
        program: '',
        returningStudentYear: '',
        custodyDetails: '',
        notes: '',
      },
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    console.log('\n📝 Creating test parent document...')
    await db.collection('parents').doc('TEST_PARENT_001').set(testParent)
    console.log('✅ Created test parent: Test TestParent (TEST_PARENT_001)')

    console.log('\n👶 Creating test student documents...')
    await db.collection('students').doc('TEST_STUDENT_001').set(testStudent1)
    console.log('✅ Created test student 1: Test TestChild (TEST_STUDENT_001)')

    await db.collection('students').doc('TEST_STUDENT_002').set(testStudent2)
    console.log('✅ Created test student 2: TestTwo TestChild (TEST_STUDENT_002)')

    // Create Firebase Auth user for the test parent
    console.log('\n🔐 Creating Firebase Authentication user...')
    const tarbiyahId = 'TEST_PARENT_001'
    const email = tarbiyahIdToEmail(tarbiyahId)
    const password = 'Password' // Same default password as your existing system

    try {
      // Try to get existing user first
      const existingUser = await auth.getUser(tarbiyahId)
      console.log(`⚠️  Auth user ${tarbiyahId} already exists, updating...`)
      
      // Update the user to ensure correct email and password
      await auth.updateUser(tarbiyahId, {
        email: email,
        password: password
      })
      console.log('✅ Updated existing auth user')
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create new user
        await auth.createUser({
          uid: tarbiyahId,
          email: email,
          password: password,
          displayName: 'Test TestParent'
        })
        console.log(`✅ Created auth user: ${tarbiyahId} with email: ${email}`)
      } else {
        throw error
      }
    }

    // Create user document in 'users' collection for role-based access
    console.log('\n👤 Creating user document for authentication...')
    const userDoc = {
      tarbiyahId: tarbiyahId,
      role: 'Parent',
      linkedCollection: 'parents',
      active: true,
      personalInfo: {
        firstName: 'Test',
        lastName: 'TestParent',
      },
      dashboard: {
        theme: 'default',
      },
      stats: {
        loginCount: 0,
        lastLoginAt: null,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    await db.collection('users').doc(tarbiyahId).set(userDoc)
    console.log(`✅ Created user document: ${tarbiyahId}`)

    console.log('\n🎉 Test data creation completed!')
    console.log('📊 Summary:')
    console.log('   • 1 test parent created with mostly blank fields')
    console.log('   • 2 test students created with mostly blank fields')
    console.log('   • Students are linked to parent via tarbiyahId: TEST_PARENT_001')
    console.log('   • Parent has empty students array (to be populated by connection script)')
    console.log('   • Firebase Auth user created for login')
    console.log('   • User document created for role-based access')
    
    console.log('\n🔍 Verification:')
    console.log('Parent document:')
    const parentDoc = await db.collection('parents').doc('TEST_PARENT_001').get()
    if (parentDoc.exists) {
      const parentData = parentDoc.data()
      console.log(`   • Name: ${parentData.personalInfo.firstName} ${parentData.personalInfo.lastName}`)
      console.log(`   • ID: ${parentData.schoolId}`)
      console.log(`   • Students array length: ${parentData.students.length}`)
    }

    console.log('\nStudent documents:')
    const student1Doc = await db.collection('students').doc('TEST_STUDENT_001').get()
    if (student1Doc.exists) {
      const student1Data = student1Doc.data()
      console.log(`   • Student 1: ${student1Data.personalInfo.firstName} ${student1Data.personalInfo.lastName}`)
      console.log(`   • Father tarbiyahId: ${student1Data.parents.father.tarbiyahId}`)
    }

    const student2Doc = await db.collection('students').doc('TEST_STUDENT_002').get()
    if (student2Doc.exists) {
      const student2Data = student2Doc.data()
      console.log(`   • Student 2: ${student2Data.personalInfo.firstName} ${student2Data.personalInfo.lastName}`)
      console.log(`   • Father tarbiyahId: ${student2Data.parents.father.tarbiyahId}`)
    }

    console.log('\nAuth user:')
    const authUser = await auth.getUser(tarbiyahId)
    console.log(`   • UID: ${authUser.uid}`)
    console.log(`   • Email: ${authUser.email}`)
    console.log(`   • Display Name: ${authUser.displayName}`)

    console.log('\nUser document:')
    const userDocData = await db.collection('users').doc(tarbiyahId).get()
    if (userDocData.exists) {
      const userData = userDocData.data()
      console.log(`   • Role: ${userData.role}`)
      console.log(`   • Linked Collection: ${userData.linkedCollection}`)
    }

    console.log('\n🎯 Login Instructions:')
    console.log('   To login as the test parent:')
    console.log('   1. Go to Parent Login page')
    console.log('   2. Use Tarbiyah ID: TEST_PARENT_001')
    console.log('   3. Use Password: Password')
    console.log('   4. Or use email: TEST_PARENT_001@gmail.com with same password')

    console.log('\n💡 Next step: Run the connectParentsToStudents.js script to test the connection logic!')

  } catch (error) {
    console.error('❌ Error creating test data:', error)
    console.error('   Make sure you have proper Firebase authentication set up')
  }
}

// Run the test data creation
createTestData()
  .then(() => {
    console.log('\n✨ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  }) 