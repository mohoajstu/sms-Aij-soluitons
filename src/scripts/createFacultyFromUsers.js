// Script to create faculty documents from users who don't have faculty documents yet
// Run with: node src/scripts/createFacultyFromUsers.js

const admin = require('firebase-admin')
const path = require('path')

// Initialize Firebase Admin with service account
let serviceAccount

try {
  // Try to load service account from file
  serviceAccount = require('./serviceAccountKey.json')
} catch (error) {
  console.error('❌ Could not load serviceAccountKey.json')
  console.log('Please make sure serviceAccountKey.json is in the scripts directory')
  process.exit(1)
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// Helper function to generate unique Tarbiyah ID for faculty
async function generateUniqueTarbiyahFacultyId() {
  const facultySnapshot = await db.collection('faculty').get()
  let highestId = 0
  
  facultySnapshot.docs.forEach(doc => {
    const tarbiyahId = doc.id
    const match = tarbiyahId.match(/^TLA(\d+)$/)
    if (match) {
      const numericId = parseInt(match[1])
      if (numericId > highestId) {
        highestId = numericId
      }
    }
  })
  
  const nextId = highestId + 1
  return `TLA${nextId.toString().padStart(6, '0')}`
}

/**
 * Script to create faculty documents from users who don't have faculty documents yet
 * This script will:
 * 1. Find all users in the 'users' collection with role 'Faculty' or 'staff'
 * 2. Check if they exist in the 'faculty' collection
 * 3. If they don't exist in faculty collection, create a faculty document for them
 * 4. Update their user document to link to the faculty collection
 */
async function createFacultyFromUsers() {
  try {
    console.log('🔧 Starting faculty creation from users process...')
    console.log(`📍 Project: ${serviceAccount.project_id}`)
    
    // Test connection
    console.log('\n🔍 Testing Firestore connection...')
    const testQuery = await db.collection('courses').limit(1).get()
    console.log('✅ Firestore connection successful!')
    
    // Get all users with role 'Faculty' or 'staff'
    const usersSnapshot = await db.collection('users')
      .where('role', 'in', ['Faculty', 'staff'])
      .get()
    
    console.log(`📊 Found ${usersSnapshot.size} faculty/staff users`)
    
    let createdCount = 0
    let skippedCount = 0
    let errorCount = 0
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data()
      const userEmail = userData.email || userData.personalInfo?.email
      const firebaseUid = userDoc.id
      
      console.log(`\n🔍 Processing user: ${userEmail} (Firebase UID: ${firebaseUid})`)
      
      try {
        // Check if user already has a faculty document
        if (userData.linkedCollection === 'faculty' && userData.tarbiyahId) {
          const facultyDoc = await db.collection('faculty').doc(userData.tarbiyahId).get()
          if (facultyDoc.exists) {
            console.log(`✅ User already has faculty document: ${userData.tarbiyahId}`)
            skippedCount++
            continue
          }
        }
        
        // First, search for existing faculty by name in personalInfo
        const firstName = userData.personalInfo?.firstName || userData.firstName || ''
        const lastName = userData.personalInfo?.lastName || userData.lastName || ''
        const fullName = `${firstName} ${lastName}`.trim()
        
        if (!fullName) {
          console.log(`⚠️  No name found, skipping user: ${firebaseUid}`)
          skippedCount++
          continue
        }
        
        console.log(`🔍 Searching for faculty member: ${fullName}`)
        
        // Search by name in personalInfo
        const facultySnapshot = await db.collection('faculty')
          .where('personalInfo.firstName', '==', firstName)
          .where('personalInfo.lastName', '==', lastName)
          .get()
        
        if (!facultySnapshot.empty) {
          const existingFaculty = facultySnapshot.docs[0]
          const existingTarbiyahId = existingFaculty.id
          console.log(`✅ Found existing faculty member: ${fullName} (ID: ${existingTarbiyahId})`)
          
          // Update user document to link to existing faculty
          const updatedUserData = {
            tarbiyahId: existingTarbiyahId,
            linkedCollection: 'faculty',
            personalInfo: {
              ...userData.personalInfo,
              role: 'Faculty'
            },
            role: 'Faculty'
          }
          
          await db.collection('users').doc(firebaseUid).set(updatedUserData, { merge: true })
          console.log(`✅ Updated user document to link to existing faculty: ${existingTarbiyahId}`)
          
          skippedCount++
          continue
        }
        
        // Create faculty document with correct schema
        const tarbiyahId = await generateUniqueTarbiyahFacultyId()
        const currentDate = new Date()
        
        const facultyData = {
          active: true,
          address: {
            poBox: "",
            residentialArea: "Unknown",
            streetAddress: ""
          },
          citizenship: {
            nationalId: "",
            nationalIdExpiry: "12/31/1861",
            nationality: "Canada"
          },
          contact: {
            email: userEmail || "",
            emergencyPhone: "",
            phone1: "",
            phone2: ""
          },
          courses: [],
          createdAt: currentDate,
          employment: {
            daySchoolEmployer: "Tarbiyah Learning Academy",
            notes: "",
            program: ""
          },
          language: {
            primary: "English",
            secondary: "English"
          },
          personalInfo: {
            dob: "12/31/1861",
            firstName: firstName,
            gender: "",
            lastName: lastName,
            middleName: "",
            nickName: "",
            salutation: "",
            primaryRole: "Faculty",
            schoolId: tarbiyahId
          },
          uploadedAt: currentDate
        }
        
        await db.collection('faculty').doc(tarbiyahId).set(facultyData)
        console.log(`✅ Created faculty document: ${tarbiyahId}`)
        
        // Update user document to link to faculty collection
        const updatedUserData = {
          tarbiyahId: tarbiyahId,
          linkedCollection: 'faculty',
          personalInfo: {
            ...userData.personalInfo,
            role: 'Faculty'
          },
          role: 'Faculty'
        }
        
        await db.collection('users').doc(firebaseUid).set(updatedUserData, { merge: true })
        console.log(`✅ Updated user document to link to faculty: ${tarbiyahId}`)
        
        createdCount++
        
      } catch (error) {
        console.error(`❌ Error processing user ${userEmail}:`, error)
        errorCount++
      }
    }
    
    console.log('\n📊 Faculty creation process completed!')
    console.log(`✅ Created: ${createdCount} faculty documents`)
    console.log(`⚠️  Skipped: ${skippedCount} users`)
    console.log(`❌ Errors: ${errorCount} users`)
    
  } catch (error) {
    console.error('❌ Script failed:', error)
  }
}

// Run the script
createFacultyFromUsers()
  .then(() => {
    console.log('🎉 Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  })
