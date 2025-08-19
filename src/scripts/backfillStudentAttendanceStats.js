/*
  Backfill attendanceStats for all students

  Fields initialized (only if missing or invalid):
  - attendanceStats.currentTermLateCount
  - attendanceStats.yearLateCount
  - attendanceStats.currentTermAbsenceCount
  - attendanceStats.yearAbsenceCount

  Usage:
  1) Set Google credentials (if not already configured):
     - PowerShell: $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\path\\to\\serviceAccount.json"
     - macOS/Linux: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
  2) Run: node src/scripts/backfillStudentAttendanceStats.js
*/

const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

// Initialize Admin SDK using local service account if available; otherwise ADC
if (admin.apps.length === 0) {
  const localKeyPath = path.resolve(__dirname, 'serviceAccountKey.json')
  if (fs.existsSync(localKeyPath)) {
    const serviceAccount = require(localKeyPath)
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
    console.log('🔐 Initialized Admin SDK with local serviceAccountKey.json')
  } else {
    admin.initializeApp()
    console.log('🔐 Initialized Admin SDK with Application Default Credentials')
  }
}

const db = admin.firestore()

const DEFAULT_STATS = {
  currentTermLateCount: 0,
  yearLateCount: 0,
  currentTermAbsenceCount: 0,
  yearAbsenceCount: 0,
}

const BATCH_SIZE = 400

async function backfillAttendanceStats() {
  console.log('🔎 Starting backfill of attendanceStats for all students...')

  const studentsRef = db.collection('students')
  const snapshot = await studentsRef.get()

  console.log(`📄 Found ${snapshot.size} student documents`)

  let batch = db.batch()
  let batchOps = 0
  const commitPromises = []
  let processed = 0
  let updated = 0
  let skipped = 0

  snapshot.forEach((docSnap) => {
    processed += 1
    const data = docSnap.data() || {}
    const stats = data.attendanceStats || {}

    const updateStats = {}
    let needsUpdate = false

    for (const [key, zero] of Object.entries(DEFAULT_STATS)) {
      const value = stats[key]
      if (typeof value !== 'number') {
        updateStats[key] = zero
        needsUpdate = true
      }
    }

    if (needsUpdate) {
      // If no attendanceStats at all, set all four defaults
      const payload = {
        attendanceStats: {
          ...DEFAULT_STATS,
          ...updateStats, // preserve any explicitly computed keys
        },
      }

      batch.set(docSnap.ref, payload, { merge: true })
      batchOps += 1
      updated += 1

      if (batchOps >= BATCH_SIZE) {
        commitPromises.push(
          batch.commit().catch((e) => console.error('Batch commit error:', e)),
        )
        batch = db.batch()
        batchOps = 0
      }
    } else {
      skipped += 1
    }
  })

  if (batchOps > 0) {
    commitPromises.push(batch.commit())
  }

  // Ensure all pending commits complete
  await Promise.all(commitPromises)

  console.log('✅ Backfill complete')
  console.log(`   • Processed: ${processed}`)
  console.log(`   • Updated:   ${updated}`)
  console.log(`   • Skipped:   ${skipped}`)
}

if (require.main === module) {
  backfillAttendanceStats()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Backfill failed:', err)
      process.exit(1)
    })
}

module.exports = { backfillAttendanceStats }


