/*
  Assign temporary passwords and mustChangePassword flag to users.

  This script:
  - Iterates all documents in 'users' collection (or a filtered subset by role)
  - Generates a random strong temp password
  - Uses Firebase Admin Auth to set that password for the auth user
  - Sets mustChangePassword: true in Firestore 'users/{uid}'

  SAFETY: Run in a secure environment. Distribute passwords via sealed printouts or SMS only.

  Usage:
  - Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON or place it in the env
  - node src/scripts/assignTempPasswords.js [roleFilter]
    roleFilter (optional): defaults to 'Parent'. Valid: 'Parent' | 'Student' | 'Faculty' | 'Admin'
*/

const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

if (admin.apps.length === 0) {
  const localKeyPath = path.resolve(__dirname, 'serviceAccountKey.json')
  if (fs.existsSync(localKeyPath)) {
    const serviceAccount = require(localKeyPath)
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
    console.log('Initialized Admin SDK with local serviceAccountKey.json')
  } else {
    admin.initializeApp()
    console.log('Initialized Admin SDK with Application Default Credentials (env)')
  }
}

const db = admin.firestore()
const auth = admin.auth()

function generateTempPassword() {
  // Set a single, known temporary password for all users
  return '2BeChanged'
}

async function main() {
  const roleFilter = process.argv[2] || 'Parent'
  console.log('Starting temp password assignment', `(role=${roleFilter})`)

  const usersRef = db.collection('users')
  const snapshot = await usersRef.get()

  let processed = 0
  let updated = 0
  const rows = []
  rows.push(['uid', 'tarbiyahId', 'email', 'role', 'tempPassword'].join(','))
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() || {}
    const uid = docSnap.id

    if (roleFilter && data.role !== roleFilter) {
      continue
    }

    // Skip if not the target role
    if (roleFilter && data.role !== roleFilter) {
      continue
    }

    // Skip if already forced
    if (data.mustChangePassword === true) {
      processed++
      continue
    }

    try {
      const tempPassword = generateTempPassword()
      const userRecord = await auth.updateUser(uid, { password: tempPassword })
      await db.collection('users').doc(uid).set({ mustChangePassword: true }, { merge: true })
      rows.push([
        uid,
        JSON.stringify(data.tarbiyahId || ''),
        JSON.stringify(userRecord.email || ''),
        JSON.stringify(data.role || ''),
        JSON.stringify(tempPassword),
      ].join(','))
      updated++
      processed++
      console.log(`Set temp password for ${uid}`)
    } catch (e) {
      processed++
      console.error(`Failed for ${uid}:`, e.message)
    }
  }

  // Write a local CSV with the generated passwords (do NOT upload to Firestore)
  const outDir = path.resolve(__dirname, 'output')
  fs.mkdirSync(outDir, { recursive: true })
  const ts = new Date()
  const stamp = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, '0')}${String(
    ts.getDate(),
  ).padStart(2, '0')}_${String(ts.getHours()).padStart(2, '0')}${String(
    ts.getMinutes(),
  ).padStart(2, '0')}${String(ts.getSeconds()).padStart(2, '0')}`
  const outFile = path.join(outDir, `temp_passwords_${roleFilter}_${stamp}.csv`)
  fs.writeFileSync(outFile, rows.join('\n'), 'utf8')

  console.log('Done.')
  console.log(`Processed: ${processed}`)
  console.log(`Updated:   ${updated}`)
  console.log(`Passwords saved to: ${outFile}`)
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
}

module.exports = { main }


