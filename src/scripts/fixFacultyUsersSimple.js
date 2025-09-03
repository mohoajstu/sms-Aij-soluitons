import { initializeApp } from 'firebase/app'
import { getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
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
 * Simple script to fix faculty users - no authentication required
 * This script will:
 * 1. Find all users in the 'users' collection with role 'staff' and tarbiyahlearning.ca emails
 * 2. Check if they exist in the 'faculty' collection
 * 3. If they exist in faculty collection, recreate their user document with proper Tarbiyah ID
 * 4. Delete the old document created with Firebase Auth UID
 */
async function fixFacultyUsersSimple() {
  try {
    console.log('🔧 Starting faculty user fix process (simple version)...')
    console.log('⚠️  Note: This script will only work if you have proper Firestore permissions')
    
    // Get all users with role 'staff' and tarbiyahlearning.ca emails
    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'staff'),
      where('emailDomain', '==', 'tarbiyahlearning.ca')
    )
    
    const usersSnapshot = await getDocs(usersQuery)
    console.log(`📊 Found ${usersSnapshot.size} staff users with tarbiyahlearning.ca emails`)
    
    if (usersSnapshot.size === 0) {
      console.log('✅ No staff users found to fix!')
      return
    }
    
    let fixedCount = 0
    let skippedCount = 0
    let errorCount = 0
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data()
      const userEmail = userData.email
      const firebaseUid = userDoc.id
      
      console.log(`\n🔍 Processing user: ${userEmail} (Firebase UID: ${firebaseUid})`)
      
      try {
        // Check if user exists in faculty collection
        const facultyQuery = query(
          collection(db, 'faculty'),
          where('personalInfo.email', '==', userEmail)
        )
        const facultySnapshot = await getDocs(facultyQuery)
        
        if (facultySnapshot.empty) {
          console.log(`⚠️  User not found in faculty collection, skipping: ${userEmail}`)
          skippedCount++
          continue
        }
        
        const facultyDoc = facultySnapshot.docs[0]
        const tarbiyahId = facultyDoc.id
        const facultyData = facultyDoc.data()
        
        console.log(`✅ Found in faculty collection with Tarbiyah ID: ${tarbiyahId}`)
        
        // Check if user document already exists with Tarbiyah ID
        const existingUserDoc = await getDoc(doc(db, 'users', tarbiyahId))
        
        if (existingUserDoc.exists()) {
          console.log(`⚠️  User document already exists with Tarbiyah ID: ${tarbiyahId}`)
          // Update the existing document with current data
          await setDoc(doc(db, 'users', tarbiyahId), {
            lastLogin: userData.lastLogin,
            loginCount: userData.loginCount,
            emailDomain: userData.emailDomain,
            isVerified: userData.isVerified,
            isAuthorizedDomain: userData.isAuthorizedDomain,
            'stats.lastLoginAt': userData.lastLogin
          }, { merge: true })
          console.log(`✅ Updated existing user document with Tarbiyah ID: ${tarbiyahId}`)
        } else {
          // Create new user document with Tarbiyah ID
          const newUserData = {
            tarbiyahId: tarbiyahId,
            linkedCollection: 'faculty',
            personalInfo: {
              firstName: facultyData.personalInfo?.firstName || userData.firstName || '',
              lastName: facultyData.personalInfo?.lastName || userData.lastName || '',
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
            dashboard: {
              theme: 'default'
            },
            stats: {
              lastLoginAt: userData.lastLogin,
              loginCount: userData.loginCount
            }
          }
          
          await setDoc(doc(db, 'users', tarbiyahId), newUserData)
          console.log(`✅ Created new user document with Tarbiyah ID: ${tarbiyahId}`)
        }
        
        // Delete the old document created with Firebase Auth UID
        await deleteDoc(doc(db, 'users', firebaseUid))
        console.log(`🗑️  Deleted old user document with Firebase UID: ${firebaseUid}`)
        
        fixedCount++
        
      } catch (error) {
        console.error(`❌ Error processing user ${userEmail}:`, error)
        errorCount++
      }
    }
    
    console.log('\n📊 Fix process completed!')
    console.log(`✅ Fixed: ${fixedCount} users`)
    console.log(`⚠️  Skipped: ${skippedCount} users`)
    console.log(`❌ Errors: ${errorCount} users`)
    
    if (errorCount > 0) {
      console.log('\n💡 If you got permission errors, you may need to:')
      console.log('   1. Run this from your React app while logged in as admin')
      console.log('   2. Or use the Firebase Admin SDK with service account')
      console.log('   3. Or manually fix users through Firebase Console')
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error)
    console.log('\n💡 This usually means:')
    console.log('   1. Firestore permissions issue')
    console.log('   2. Firebase config problem')
    console.log('   3. Network connectivity issue')
  }
}

// Run the script
fixFacultyUsersSimple()
  .then(() => {
    console.log('🎉 Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  })
