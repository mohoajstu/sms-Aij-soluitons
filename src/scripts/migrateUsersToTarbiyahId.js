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
const DRY_RUN = true // Set to false to actually make changes

async function migrateUsers() {
  try {
    console.log('🚀 Starting user migration...')
    console.log('📍 Project:', serviceAccount.project_id)
    console.log(`🔍 DRY RUN MODE: ${DRY_RUN ? 'ENABLED (no changes will be made)' : 'DISABLED (changes will be made)'}`)
    console.log('')

    const usersSnap = await db.collection('users').get()
    console.log(`📊 Found ${usersSnap.size} users to check`)

    let migrated = 0
    let skipped = 0
    let errors = 0

    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data()
      const uidDocId = userDoc.id

      console.log(`\n${'='.repeat(60)}`)
      console.log(`👤 Processing user: ${uidDocId}`)

      // Skip if already a tarbiyahId (e.g., matches faculty/admin doc IDs you use)
      // Check if this looks like a Tarbiyah ID (starts with TLA, TS, etc.)
      if (uidDocId.match(/^(TLA|TS|TA)\d+/)) {
        console.log(`✅ Already using Tarbiyah ID format: ${uidDocId}`)
        skipped++
        continue
      }

      // Try to find a matching admin/faculty by email
      const email = data.personalInfo?.email || data.email
      if (!email) {
        console.log(`❌ No email found for user ${uidDocId}`)
        errors++
        continue
      }

      console.log(`📧 Looking up email: ${email}`)

      // Find admin doc by email
      let adminDoc = null
      try {
        const adminQuery1 = await db.collection('admins').where('email', '==', email).get()
        if (!adminQuery1.empty) {
          adminDoc = adminQuery1.docs[0]
        } else {
          const adminQuery2 = await db.collection('admins').where('personalInfo.email', '==', email).get()
          if (!adminQuery2.empty) {
            adminDoc = adminQuery2.docs[0]
          }
        }
      } catch (e) {
        console.log(`⚠️ Error querying admins: ${e.message}`)
      }

      // Find faculty doc by email
      let facultyDoc = null
      if (!adminDoc) {
        try {
          const facultyQuery = await db.collection('faculty').where('personalInfo.email', '==', email).get()
          if (!facultyQuery.empty) {
            facultyDoc = facultyQuery.docs[0]
          }
        } catch (e) {
          console.log(`⚠️ Error querying faculty: ${e.message}`)
        }
      }

      const target = adminDoc || facultyDoc
      if (!target) {
        console.log(`❌ No admin/faculty match found for ${email}`)
        errors++
        continue
      }

      const tarbiyahId = target.id
      const role = adminDoc ? 'admin' : 'faculty'
      const linkedCollection = adminDoc ? 'admins' : 'faculty'

      console.log(`✅ Found match: ${role} with Tarbiyah ID: ${tarbiyahId}`)

      // Check if target already exists
      const targetRef = db.collection('users').doc(tarbiyahId)
      const targetDoc = await targetRef.get()

      if (targetDoc.exists()) {
        console.log(`⚠️ Target document already exists: users/${tarbiyahId}`)
        console.log(`🔍 Merging data instead of creating new document`)
        
        if (DRY_RUN) {
          console.log(`🔍 DRY RUN - Would merge data into users/${tarbiyahId}`)
          console.log(`   Data to merge:`, {
            role,
            linkedCollection,
            personalInfo: {
              firstName: data.personalInfo?.firstName || data.firstName || '',
              lastName: data.personalInfo?.lastName || data.lastName || '',
              email,
            },
            emailDomain: email.split('@')[1] || '',
            isVerified: !!data.isVerified,
            isAuthorizedDomain: !!data.isAuthorizedDomain,
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
            loginCount: Math.max((data.loginCount || 0), (targetDoc.data()?.loginCount || 0)),
            stats: {
              lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
              loginCount: Math.max((data.stats?.loginCount || data.loginCount || 0), (targetDoc.data()?.stats?.loginCount || 0)),
            },
            active: data.active !== false,
          })
        } else {
          await targetRef.set({
            role,
            linkedCollection,
            personalInfo: {
              firstName: data.personalInfo?.firstName || data.firstName || '',
              lastName: data.personalInfo?.lastName || data.lastName || '',
              email,
            },
            emailDomain: email.split('@')[1] || '',
            isVerified: !!data.isVerified,
            isAuthorizedDomain: !!data.isAuthorizedDomain,
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
            loginCount: Math.max((data.loginCount || 0), (targetDoc.data()?.loginCount || 0)),
            stats: {
              lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
              loginCount: Math.max((data.stats?.loginCount || data.loginCount || 0), (targetDoc.data()?.stats?.loginCount || 0)),
            },
            active: data.active !== false,
          }, { merge: true })
          console.log(`✅ Merged data into users/${tarbiyahId}`)
        }
      } else {
        if (DRY_RUN) {
          console.log(`🔍 DRY RUN - Would create users/${tarbiyahId}`)
          console.log(`   Data:`, {
            tarbiyahId,
            linkedCollection,
            role,
            personalInfo: {
              firstName: data.personalInfo?.firstName || data.firstName || '',
              lastName: data.personalInfo?.lastName || data.lastName || '',
              email,
            },
            emailDomain: email.split('@')[1] || '',
            isVerified: !!data.isVerified,
            isAuthorizedDomain: !!data.isAuthorizedDomain,
            createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
            loginCount: data.loginCount || 0,
            stats: {
              lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
              loginCount: data.stats?.loginCount || data.loginCount || 0,
            },
            active: data.active !== false,
            dashboard: data.dashboard || { theme: 'default' },
          })
        } else {
          await targetRef.set({
            tarbiyahId,
            linkedCollection,
            role,
            personalInfo: {
              firstName: data.personalInfo?.firstName || data.firstName || '',
              lastName: data.personalInfo?.lastName || data.lastName || '',
              email,
            },
            emailDomain: email.split('@')[1] || '',
            isVerified: !!data.isVerified,
            isAuthorizedDomain: !!data.isAuthorizedDomain,
            createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
            loginCount: data.loginCount || 0,
            stats: {
              lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
              loginCount: data.stats?.loginCount || data.loginCount || 0,
            },
            active: data.active !== false,
            dashboard: data.dashboard || { theme: 'default' },
          })
          console.log(`✅ Created users/${tarbiyahId}`)
        }
      }

      // Optionally delete old uid doc
      if (DRY_RUN) {
        console.log(`🔍 DRY RUN - Would delete old document: users/${uidDocId}`)
      } else {
        await userDoc.ref.delete()
        console.log(`🗑️ Deleted old document: users/${uidDocId}`)
      }

      migrated++
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log('📊 MIGRATION SUMMARY:')
    if (DRY_RUN) {
      console.log(`🔍 DRY RUN - Would migrate: ${migrated} users`)
      console.log(`⏭️ Would skip: ${skipped} users`)
      console.log(`❌ Would have errors: ${errors} users`)
      console.log('💡 To apply changes, set DRY_RUN = false in the script')
    } else {
      console.log(`✅ Successfully migrated: ${migrated} users`)
      console.log(`⏭️ Skipped: ${skipped} users`)
      console.log(`❌ Errors: ${errors} users`)
    }
    console.log('🎉 Migration complete!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

// Run the migration
migrateUsers().catch(console.error)
