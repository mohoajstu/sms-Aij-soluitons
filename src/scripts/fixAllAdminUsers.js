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

// Target users to fix
const TARGET_USERS = [
  {
    email: 'ghazala.choudhary@tarbiyahlearning.ca',
    name: 'Ghazala Choudhary'
  },
  {
    email: 'kiran.elahi@tarbiyahlearning.ca', 
    name: 'Kiran Elahi'
  },
  {
    email: 'no.reply@tarbiyahlearning.ca',
    name: 'System Admin'
  }
]

async function fixAllAdminUsers() {
  try {
    console.log('🚀 Starting admin users fix...')
    console.log('📍 Project:', serviceAccount.project_id)
    console.log(`🔍 DRY RUN MODE: ${DRY_RUN ? 'ENABLED (no changes will be made)' : 'DISABLED (changes will be made)'}`)
    console.log('')

    let successCount = 0
    let errorCount = 0

    for (const userInfo of TARGET_USERS) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`👤 Processing: ${userInfo.name}`)
      console.log(`📧 Email: ${userInfo.email}`)

      try {
        // Find all user documents with this email
        const usersQuery = await db.collection('users').where('email', '==', userInfo.email).get()
        
        if (usersQuery.empty) {
          console.log(`❌ No user found with email: ${userInfo.email}`)
          errorCount++
          continue
        }

        console.log(`📄 Found ${usersQuery.docs.length} user document(s)`)

        for (const userDoc of usersQuery.docs) {
          const userData = userDoc.data()
          const docId = userDoc.id
          
          console.log(`\n🔍 Processing document: ${docId}`)
          console.log(`   Current role: ${userData.role}`)
          console.log(`   PersonalInfo role: ${userData.personalInfo?.role}`)

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
            updatedBy: 'fix-all-admin-users-script'
          }

          if (DRY_RUN) {
            console.log(`🔍 DRY RUN - Would update document ${docId}:`)
            console.log(`   Data:`, JSON.stringify(updateData, null, 2))
          } else {
            await userDoc.ref.set(updateData, { merge: true })
            console.log(`✅ Updated document ${docId} with admin role`)
          }
        }

        successCount++

      } catch (error) {
        console.error(`❌ Error processing ${userInfo.email}:`, error.message)
        errorCount++
      }
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log('📊 SUMMARY:')
    if (DRY_RUN) {
      console.log(`🔍 DRY RUN - Would fix: ${successCount} users`)
      console.log(`❌ Would have errors: ${errorCount} users`)
      console.log('💡 To apply changes, set DRY_RUN = false in the script')
    } else {
      console.log(`✅ Successfully fixed: ${successCount} users`)
      console.log(`❌ Errors: ${errorCount} users`)
    }
    console.log('🎉 Fix complete!')
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

// Run the fix
fixAllAdminUsers().catch(console.error)
