import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Initialize Firebase Admin SDK
let serviceAccount
try {
  const serviceAccountPath = join(__dirname, 'serviceAccountKey.json')
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
  console.log(`📁 Using service account key from: ${serviceAccountPath}`)
} catch (error) {
  console.error('❌ Error loading service account key:', error.message)
  process.exit(1)
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  })
}

const db = admin.firestore()

// Configuration
const DRY_RUN = false // Set to false to actually make changes

async function fixNoReplyUser() {
  try {
    console.log('🚀 Starting no.reply user fix...')
    console.log('📍 Project:', serviceAccount.project_id)
    console.log(`🔍 DRY RUN MODE: ${DRY_RUN ? 'ENABLED (no changes will be made)' : 'DISABLED (changes will be made)'}`)
    console.log('')

    // Find the user document that the app is actually reading from
    const email = 'no.reply@tarbiyahlearning.ca'
    console.log(`🔍 Looking for user with email: ${email}`)
    
    // Check users collection by email
    const usersQuery = await db.collection('users').where('email', '==', email).get()
    
    if (usersQuery.empty) {
      console.log('❌ No user found with that email')
      return
    }

    for (const userDoc of usersQuery.docs) {
      const userData = userDoc.data()
      const docId = userDoc.id
      
      console.log(`\n${'='.repeat(60)}`)
      console.log(`👤 Found user document: ${docId}`)
      console.log(`📄 Current data:`, {
        email: userData.email,
        role: userData.role,
        personalInfo: userData.personalInfo,
        firstName: userData.firstName,
        lastName: userData.lastName
      })

      // Update the role to admin
      const updateData = {
        role: 'admin',
        primaryRole: 'admin',
        personalInfo: {
          ...userData.personalInfo,
          role: 'admin',
          primaryRole: 'admin'
        },
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'fix-no-reply-script'
      }

      if (DRY_RUN) {
        console.log(`🔍 DRY RUN - Would update document ${docId}:`)
        console.log(`   Data:`, JSON.stringify(updateData, null, 2))
      } else {
        await userDoc.ref.set(updateData, { merge: true })
        console.log(`✅ Updated document ${docId} with admin role`)
      }
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log('🎉 Fix complete!')
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

// Run the fix
fixNoReplyUser().catch(console.error)
