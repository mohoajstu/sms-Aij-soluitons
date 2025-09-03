// Simple script to fix faculty users
// Run with: node fix-faculty-users.js

const { initializeApp } = require('firebase/app')
const { getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc } = require('firebase/firestore')

// Firebase config - update these values with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // Replace with your actual API key
  authDomain: "tarbiyah-sms.firebaseapp.com", // Replace with your actual domain
  projectId: "tarbiyah-sms", // Replace with your actual project ID
  storageBucket: "tarbiyah-sms.appspot.com", // Replace with your actual storage bucket
  messagingSenderId: "123456789", // Replace with your actual sender ID
  appId: "1:123456789:web:abcdef123456" // Replace with your actual app ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function fixFacultyUsers() {
  try {
    console.log('🔧 Starting faculty user fix...')
    console.log('📍 Project:', firebaseConfig.projectId)
    
    // Test connection first
    console.log('🔍 Testing Firestore connection...')
    const testQuery = query(collection(db, 'users'), where('role', '==', 'staff'))
    await getDocs(testQuery)
    console.log('✅ Firestore connection successful!')
    
    // Find all users with role 'staff' and tarbiyahlearning.ca emails
    console.log('🔍 Finding staff users with tarbiyahlearning.ca emails...')
    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'staff'),
      where('emailDomain', '==', 'tarbiyahlearning.ca')
    )
    
    const usersSnapshot = await getDocs(usersQuery)
    console.log(`📊 Found ${usersSnapshot.size} staff users to fix`)
    
    if (usersSnapshot.size === 0) {
      console.log('✅ No users to fix!')
      return
    }
    
    let fixed = 0
    let skipped = 0
    let errors = 0
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data()
      const userEmail = userData.email
      const firebaseUid = userDoc.id
      
      console.log(`\n🔍 Processing: ${userEmail}`)
      
      try {
        // Check if user exists in faculty collection
        const facultyQuery = query(
          collection(db, 'faculty'),
          where('contact.email', '==', userEmail)
        )
        const facultySnapshot = await getDocs(facultyQuery)
        
        if (facultySnapshot.empty) {
          console.log(`⚠️  Not found in faculty collection, skipping`)
          skipped++
          continue
        }
        
        const facultyDoc = facultySnapshot.docs[0]
        const tarbiyahId = facultyDoc.id
        const facultyData = facultyDoc.data()
        
        console.log(`✅ Found in faculty collection: ${tarbiyahId}`)
        
        // Create new user document with Tarbiyah ID
        const newUserData = {
          tarbiyahId: tarbiyahId,
          linkedCollection: 'faculty',
          personalInfo: {
            firstName: facultyData.personalInfo?.firstName || facultyData.firstName || userData.firstName || '',
            lastName: facultyData.personalInfo?.lastName || facultyData.lastName || userData.lastName || '',
            email: userEmail,
            role: 'Faculty'
          },
          role: 'Faculty',
          emailDomain: userData.emailDomain,
          isVerified: userData.isVerified,
          isAuthorizedDomain: userData.isAuthorizedDomain,
          createdAt: userData.createdAt,
          lastLogin: userData.lastLogin,
          loginCount: userData.loginCount,
          active: true,
          dashboard: { theme: 'default' },
          stats: {
            lastLoginAt: userData.lastLogin,
            loginCount: userData.loginCount
          }
        }
        
        await setDoc(doc(db, 'users', tarbiyahId), newUserData)
        console.log(`✅ Created user document with Tarbiyah ID`)
        
        // Delete old document
        await deleteDoc(doc(db, 'users', firebaseUid))
        console.log(`🗑️  Deleted old document`)
        
        fixed++
        
      } catch (error) {
        console.error(`❌ Error: ${error.message}`)
        errors++
      }
    }
    
    console.log('\n📊 Summary:')
    console.log(`✅ Fixed: ${fixed}`)
    console.log(`⚠️  Skipped: ${skipped}`)
    console.log(`❌ Errors: ${errors}`)
    
  } catch (error) {
    console.error('❌ Script failed:', error.message)
  }
}

// Run the script
fixFacultyUsers()
  .then(() => console.log('🎉 Done!'))
  .catch(console.error)
