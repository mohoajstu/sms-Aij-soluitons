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

async function checkNoReplyInCollections() {
  try {
    console.log('🚀 Checking no.reply@tarbiyahlearning.ca in all collections...')
    console.log('📍 Project:', serviceAccount.project_id)
    console.log('')

    const email = 'no.reply@tarbiyahlearning.ca'

    // Check users collection
    console.log('🔍 Checking users collection...')
    const usersQuery = await db.collection('users').where('email', '==', email).get()
    if (!usersQuery.empty) {
      console.log(`✅ Found in users collection: ${usersQuery.docs.length} documents`)
      for (const doc of usersQuery.docs) {
        const data = doc.data()
        console.log(`   Document ID: ${doc.id}`)
        console.log(`   Role: ${data.role}`)
        console.log(`   PersonalInfo Role: ${data.personalInfo?.role}`)
      }
    } else {
      console.log('❌ Not found in users collection')
    }

    // Check admins collection by email
    console.log('\n🔍 Checking admins collection (by email)...')
    const adminsQuery1 = await db.collection('admins').where('email', '==', email).get()
    if (!adminsQuery1.empty) {
      console.log(`✅ Found in admins collection (by email): ${adminsQuery1.docs.length} documents`)
      for (const doc of adminsQuery1.docs) {
        const data = doc.data()
        console.log(`   Document ID: ${doc.id}`)
        console.log(`   Role: ${data.role}`)
        console.log(`   PersonalInfo Role: ${data.personalInfo?.role}`)
      }
    } else {
      console.log('❌ Not found in admins collection (by email)')
    }

    // Check admins collection by personalInfo.email
    console.log('\n🔍 Checking admins collection (by personalInfo.email)...')
    const adminsQuery2 = await db.collection('admins').where('personalInfo.email', '==', email).get()
    if (!adminsQuery2.empty) {
      console.log(`✅ Found in admins collection (by personalInfo.email): ${adminsQuery2.docs.length} documents`)
      for (const doc of adminsQuery2.docs) {
        const data = doc.data()
        console.log(`   Document ID: ${doc.id}`)
        console.log(`   Role: ${data.role}`)
        console.log(`   PersonalInfo Role: ${data.personalInfo?.role}`)
      }
    } else {
      console.log('❌ Not found in admins collection (by personalInfo.email)')
    }

    // Check faculty collection
    console.log('\n🔍 Checking faculty collection...')
    const facultyQuery = await db.collection('faculty').where('personalInfo.email', '==', email).get()
    if (!facultyQuery.empty) {
      console.log(`✅ Found in faculty collection: ${facultyQuery.docs.length} documents`)
      for (const doc of facultyQuery.docs) {
        const data = doc.data()
        console.log(`   Document ID: ${doc.id}`)
        console.log(`   Role: ${data.personalInfo?.role}`)
      }
    } else {
      console.log('❌ Not found in faculty collection')
    }

    console.log('\n🎉 Check complete!')
    
  } catch (error) {
    console.error('❌ Check failed:', error)
  }
}

// Run the check
checkNoReplyInCollections().catch(console.error)
