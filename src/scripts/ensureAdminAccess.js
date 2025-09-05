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
  // Try to load service account key from common locations
  const possiblePaths = [
    join(__dirname, 'serviceAccountKey.json'), // Current directory (src/scripts/)
    join(__dirname, '../../serviceAccountKey.json'),
    join(__dirname, '../../../serviceAccountKey.json'),
    join(process.cwd(), 'serviceAccountKey.json'),
    join(process.cwd(), 'functions/serviceAccountKey.json')
  ]
  
  let serviceAccountPath = null
  for (const path of possiblePaths) {
    try {
      readFileSync(path)
      serviceAccountPath = path
      break
    } catch (e) {
      // Continue to next path
    }
  }
  
  if (!serviceAccountPath) {
    throw new Error('Service account key not found. Please ensure serviceAccountKey.json is in one of these locations: ' + possiblePaths.join(', '))
  }
  
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
const DRY_RUN = false // Set to false to actually make changes to the database

// Target users to ensure have admin access
const TARGET_USERS = [
  {
    email: 'ghazala.choudhary@tarbiyahlearning.ca',
    tarbiyahId: 'TLA0005',
    name: 'Ghazala Choudhary'
  },
  {
    email: 'kiran.elahi@tarbiyahlearning.ca', 
    tarbiyahId: 'TLA0006',
    name: 'Kiran Elahi'
  },
  {
    email: 'no.reply@tarbiyahlearning.ca',
    tarbiyahId: 'TA746711',
    name: 'System Admin'
  }
]

async function checkUserRole(email) {
  console.log(`🔍 Checking role for: ${email}`)
  
  try {
    // Check users collection by email
    const usersSnapshot = await db.collection('users').where('email', '==', email).get()
    
    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0]
      const userData = userDoc.data()
      console.log(`📄 Found in users collection: ${userDoc.id}`)
      console.log(`🔑 Current role: ${userData.role || 'undefined'}`)
      console.log(`🔑 PersonalInfo role: ${userData.personalInfo?.role || 'undefined'}`)
      console.log(`🔑 PrimaryRole: ${userData.primaryRole || 'undefined'}`)
      return { 
        found: true, 
        collection: 'users', 
        docId: userDoc.id, 
        data: userData 
      }
    }
    
    // Check users collection by contact.email
    const contactSnapshot = await db.collection('users').where('contact.email', '==', email).get()
    
    if (!contactSnapshot.empty) {
      const userDoc = contactSnapshot.docs[0]
      const userData = userDoc.data()
      console.log(`📄 Found in users collection (contact.email): ${userDoc.id}`)
      console.log(`🔑 Current role: ${userData.role || 'undefined'}`)
      console.log(`🔑 PersonalInfo role: ${userData.personalInfo?.role || 'undefined'}`)
      console.log(`🔑 PrimaryRole: ${userData.primaryRole || 'undefined'}`)
      return { 
        found: true, 
        collection: 'users', 
        docId: userDoc.id, 
        data: userData 
      }
    }
    
    // Check faculty collection
    const facultySnapshot = await db.collection('faculty').where('personalInfo.email', '==', email).get()
    
    if (!facultySnapshot.empty) {
      const facultyDoc = facultySnapshot.docs[0]
      const facultyData = facultyDoc.data()
      console.log(`📄 Found in faculty collection: ${facultyDoc.id}`)
      console.log(`🔑 Current role: ${facultyData.personalInfo?.role || 'undefined'}`)
      return { 
        found: true, 
        collection: 'faculty', 
        docId: facultyDoc.id, 
        data: facultyData 
      }
    }
    
    // Check admins collection
    const adminsSnapshot = await db.collection('admins').where('personalInfo.email', '==', email).get()
    
    if (!adminsSnapshot.empty) {
      const adminDoc = adminsSnapshot.docs[0]
      const adminData = adminDoc.data()
      console.log(`📄 Found in admins collection: ${adminDoc.id}`)
      console.log(`🔑 Current role: ${adminData.personalInfo?.role || 'undefined'}`)
      return { 
        found: true, 
        collection: 'admins', 
        docId: adminDoc.id, 
        data: adminData 
      }
    }
    
    console.log(`❌ User not found in any collection`)
    return { found: false }
    
  } catch (error) {
    console.error(`❌ Error checking user ${email}:`, error)
    return { found: false, error }
  }
}

async function updateUserRole(userInfo, targetRole = 'admin') {
  const { email, tarbiyahId, name } = userInfo
  console.log(`\n🔄 ${DRY_RUN ? 'DRY RUN - Would update' : 'Updating'} role for: ${name} (${email})`)
  
  const roleCheck = await checkUserRole(email)
  
  if (!roleCheck.found) {
    console.log(`❌ User not found, cannot update role`)
    return false
  }
  
  const { collection: collectionName, docId, data } = roleCheck
  
  try {
    if (collectionName === 'users') {
      // Update users collection (using Tarbiyah ID as doc ID)
      const userRef = db.collection('users').doc(tarbiyahId)
      
      const updateData = {
        role: targetRole,
        primaryRole: targetRole,
        personalInfo: {
          ...data.personalInfo,
          role: targetRole,
          primaryRole: targetRole
        },
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'admin-script'
      }
      
      if (DRY_RUN) {
        console.log(`🔍 DRY RUN - Would update users collection for ${tarbiyahId}:`)
        console.log(`   Document: users/${tarbiyahId}`)
        console.log(`   Data:`, JSON.stringify(updateData, null, 2))
      } else {
        await userRef.set(updateData, { merge: true })
        console.log(`✅ Updated users collection for ${tarbiyahId}`)
      }
      
    } else if (collectionName === 'faculty') {
      // Update faculty collection
      const facultyRef = db.collection('faculty').doc(docId)
      
      const updateData = {
        personalInfo: {
          ...data.personalInfo,
          role: targetRole,
          primaryRole: targetRole
        },
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'admin-script'
      }
      
      if (DRY_RUN) {
        console.log(`🔍 DRY RUN - Would update faculty collection for ${docId}:`)
        console.log(`   Document: faculty/${docId}`)
        console.log(`   Data:`, JSON.stringify(updateData, null, 2))
      } else {
        await facultyRef.set(updateData, { merge: true })
        console.log(`✅ Updated faculty collection for ${docId}`)
      }
      
      // Also ensure they exist in users collection with admin role (using Tarbiyah ID as doc ID)
      const userRef = db.collection('users').doc(tarbiyahId)
      const userDoc = await userRef.get()
      
      if (!userDoc.exists()) {
        // Create user document
        const userCreateData = {
          tarbiyahId: tarbiyahId,
          linkedCollection: 'faculty',
          role: targetRole,
          primaryRole: targetRole,
          personalInfo: {
            firstName: data.personalInfo?.firstName || name.split(' ')[0],
            lastName: data.personalInfo?.lastName || name.split(' ').slice(1).join(' '),
            email: email,
            role: targetRole,
            primaryRole: targetRole
          },
          emailDomain: email.split('@')[1],
          isVerified: true,
          isAuthorizedDomain: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastLogin: admin.firestore.FieldValue.serverTimestamp(),
          loginCount: 1,
          active: true,
          createdBy: 'admin-script'
        }
        
        if (DRY_RUN) {
          console.log(`🔍 DRY RUN - Would create user document for ${tarbiyahId}:`)
          console.log(`   Document: users/${tarbiyahId}`)
          console.log(`   Data:`, JSON.stringify(userCreateData, null, 2))
        } else {
          await userRef.set( userCreateData)
          console.log(`✅ Created user document for ${tarbiyahId}`)
        }
      } else {
        // Update existing user document
        const userUpdateData = {
          role: targetRole,
          primaryRole: targetRole,
          personalInfo: {
            ...userDoc.data().personalInfo,
            role: targetRole,
            primaryRole: targetRole
          },
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'admin-script'
        }
        
        if (DRY_RUN) {
          console.log(`🔍 DRY RUN - Would update existing user document for ${tarbiyahId}:`)
          console.log(`   Document: users/${tarbiyahId}`)
          console.log(`   Data:`, JSON.stringify(userUpdateData, null, 2))
        } else {
          await userRef.set( userUpdateData, { merge: true })
          console.log(`✅ Updated existing user document for ${tarbiyahId}`)
        }
      }
    } else if (collectionName === 'admins') {
      // Update admins collection
      const adminRef = db.collection('admins').doc(docId)
      
      const updateData = {
        personalInfo: {
          ...data.personalInfo,
          role: targetRole,
          primaryRole: targetRole
        },
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'admin-script'
      }
      
      if (DRY_RUN) {
        console.log(`🔍 DRY RUN - Would update admins collection for ${docId}:`)
        console.log(`   Document: admins/${docId}`)
        console.log(`   Data:`, JSON.stringify(updateData, null, 2))
      } else {
        await setDoc(adminRef, updateData, { merge: true })
        console.log(`✅ Updated admins collection for ${docId}`)
      }
      
      // Also ensure they exist in users collection with admin role (using Tarbiyah ID as doc ID)
      const userRef = db.collection('users').doc(tarbiyahId)
      const userDoc = await userRef.get()
      
      if (!userDoc.exists()) {
        // Create user document
        const adminUserCreateData = {
          tarbiyahId: tarbiyahId,
          linkedCollection: 'admins',
          role: targetRole,
          primaryRole: targetRole,
          personalInfo: {
            firstName: data.personalInfo?.firstName || name.split(' ')[0],
            lastName: data.personalInfo?.lastName || name.split(' ').slice(1).join(' '),
            email: email,
            role: targetRole,
            primaryRole: targetRole
          },
          emailDomain: email.split('@')[1],
          isVerified: true,
          isAuthorizedDomain: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastLogin: admin.firestore.FieldValue.serverTimestamp(),
          loginCount: 1,
          active: true,
          createdBy: 'admin-script'
        }
        
        if (DRY_RUN) {
          console.log(`🔍 DRY RUN - Would create user document for ${tarbiyahId}:`)
          console.log(`   Document: users/${tarbiyahId}`)
          console.log(`   Data:`, JSON.stringify(adminUserCreateData, null, 2))
        } else {
          await userRef.set( adminUserCreateData)
          console.log(`✅ Created user document for ${tarbiyahId}`)
        }
      } else {
        // Update existing user document
        const adminUserUpdateData = {
          role: targetRole,
          primaryRole: targetRole,
          personalInfo: {
            ...userDoc.data().personalInfo,
            role: targetRole,
            primaryRole: targetRole
          },
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'admin-script'
        }
        
        if (DRY_RUN) {
          console.log(`🔍 DRY RUN - Would update existing user document for ${tarbiyahId}:`)
          console.log(`   Document: users/${tarbiyahId}`)
          console.log(`   Data:`, JSON.stringify(adminUserUpdateData, null, 2))
        } else {
          await userRef.set( adminUserUpdateData, { merge: true })
          console.log(`✅ Updated existing user document for ${tarbiyahId}`)
        }
      }
    }
    
    return true
    
  } catch (error) {
    console.error(`❌ Error updating role for ${email}:`, error)
    return false
  }
}

async function main() {
  try {
    console.log('🚀 Starting admin access verification...')
    console.log('📍 Project:', serviceAccount.project_id)
    console.log(`🔍 DRY RUN MODE: ${DRY_RUN ? 'ENABLED (no changes will be made)' : 'DISABLED (changes will be made)'}`)
    console.log('')
    
    // Test connection
    console.log('🔍 Testing Firestore connection...')
    const testSnapshot = await db.collection('users').where('role', '==', 'admin').limit(1).get()
    console.log('✅ Firestore connection successful!')
    
    let successCount = 0
    let errorCount = 0
    
    for (const userInfo of TARGET_USERS) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`👤 Processing: ${userInfo.name}`)
      console.log(`📧 Email: ${userInfo.email}`)
      console.log(`🆔 Tarbiyah ID: ${userInfo.tarbiyahId}`)
      
      const success = await updateUserRole(userInfo, 'admin')
      if (success) {
        successCount++
      } else {
        errorCount++
      }
    }
    
    console.log(`\n${'='.repeat(60)}`)
    console.log('📊 SUMMARY:')
    if (DRY_RUN) {
      console.log(`🔍 DRY RUN - Would update: ${successCount} users`)
      console.log(`❌ Errors: ${errorCount} users`)
      console.log('💡 To apply changes, set DRY_RUN = false in the script')
    } else {
      console.log(`✅ Successfully updated: ${successCount} users`)
      console.log(`❌ Errors: ${errorCount} users`)
    }
    console.log('🎉 Admin access verification complete!')
    
  } catch (error) {
    console.error('❌ Script failed:', error)
  }
}

// Run the script
main().catch(console.error)
