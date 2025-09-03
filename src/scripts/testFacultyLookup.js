import { initializeApp } from 'firebase/app'
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore'
import dotenv from 'dotenv'

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

/**
 * Test script to verify faculty lookup is working correctly
 */
async function testFacultyLookup() {
  try {
    console.log('🧪 Testing faculty lookup functionality...')
    
    // Test 1: Check faculty collection structure
    console.log('\n📊 Test 1: Checking faculty collection structure...')
    const facultySnapshot = await getDocs(collection(db, 'faculty'))
    console.log(`Found ${facultySnapshot.size} faculty members`)
    
    if (facultySnapshot.size > 0) {
      const sampleFaculty = facultySnapshot.docs[0]
      console.log('Sample faculty document:')
      console.log('  ID:', sampleFaculty.id)
      console.log('  Data:', JSON.stringify(sampleFaculty.data(), null, 2))
    }
    
    // Test 2: Check users collection for staff users
    console.log('\n📊 Test 2: Checking users collection for staff users...')
    const staffQuery = query(
      collection(db, 'users'),
      where('role', '==', 'staff'),
      where('emailDomain', '==', 'tarbiyahlearning.ca')
    )
    const staffSnapshot = await getDocs(staffQuery)
    console.log(`Found ${staffSnapshot.size} staff users with tarbiyahlearning.ca emails`)
    
    if (staffSnapshot.size > 0) {
      const sampleStaff = staffSnapshot.docs[0]
      console.log('Sample staff user:')
      console.log('  ID:', sampleStaff.id)
      console.log('  Data:', JSON.stringify(sampleStaff.data(), null, 2))
    }
    
    // Test 3: Check if any faculty emails exist in users collection
    console.log('\n📊 Test 3: Checking for faculty emails in users collection...')
    if (facultySnapshot.size > 0) {
      const facultyEmails = facultySnapshot.docs.map(doc => doc.data()?.personalInfo?.email).filter(Boolean)
      console.log(`Found ${facultyEmails.length} faculty emails:`, facultyEmails)
      
      for (const email of facultyEmails.slice(0, 3)) { // Test first 3 emails
        const userQuery = query(collection(db, 'users'), where('email', '==', email))
        const userSnapshot = await getDocs(userQuery)
        console.log(`Email ${email}: ${userSnapshot.size} user documents found`)
        
        if (userSnapshot.size > 0) {
          const userDoc = userSnapshot.docs[0]
          console.log(`  User document ID: ${userDoc.id}`)
          console.log(`  User role: ${userDoc.data().role}`)
        }
      }
    }
    
    console.log('\n✅ Faculty lookup test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testFacultyLookup()
  .then(() => {
    console.log('🎉 Test completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Test failed:', error)
    process.exit(1)
  })
