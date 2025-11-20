/*
  Recalculate attendanceStats for all students based on actual attendance records
  
  This script:
  1. Reads all attendance records from the attendance collection
  2. Counts Late and Absent records for each student
  3. Updates student documents' attendanceStats with accurate counts
  
  Note: For "currentTerm" vs "year", we'll use a simple date-based approach:
  - Current term: records from September 1st of current year onwards
  - Year: all records from September 1st of current year onwards
  
  Usage:
  1) Set Google credentials (if not already configured):
     - PowerShell: $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\path\\to\\serviceAccount.json"
     - macOS/Linux: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
  2) Run: node src/scripts/recalculateAttendanceStats.js [--dry-run]
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

const BATCH_SIZE = 400
const DRY_RUN = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run')

/**
 * Determines if a date is in the current term
 * Current term starts September 1st of the current year
 */
function isCurrentTerm(dateStr) {
  if (!dateStr) return false
  
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return false
  
  const currentYear = new Date().getFullYear()
  const termStart = new Date(currentYear, 8, 1) // September 1st (month 8 = September)
  
  return date >= termStart
}

/**
 * Determines if a status counts as Late
 */
function isLateStatus(status) {
  return status === 'Late' || status === 'Excused Late'
}

/**
 * Determines if a status counts as Absent
 */
function isAbsentStatus(status) {
  return status === 'Absent' || status === 'Excused Absent'
}

async function recalculateAttendanceStats() {
  if (DRY_RUN) {
    console.log('🧪 DRY RUN MODE - No changes will be made to Firebase\n')
  }

  console.log('🔎 Recalculating attendance stats from attendance records...\n')

  // Step 1: Read all attendance records
  console.log('📂 Reading attendance records...')
  const attendanceRef = db.collection('attendance')
  const attendanceSnapshot = await attendanceRef.get()
  
  console.log(`📄 Found ${attendanceSnapshot.size} attendance documents\n`)

  // Step 2: Count attendance by student
  const studentStats = new Map() // studentId -> { currentTermLate, yearLate, currentTermAbsent, yearAbsent }

  attendanceSnapshot.forEach((docSnap) => {
    const dateId = docSnap.id // Format: YYYY-MM-DD
    const dailyData = docSnap.data() || {}
    const courses = dailyData.courses || []
    const inCurrentTerm = isCurrentTerm(dateId)

    courses.forEach((course) => {
      const students = course.students || []

      students.forEach((student) => {
        const studentId = student.studentId
        const status = student.status || ''

        if (!studentId) return

        // Initialize stats for this student if not exists
        if (!studentStats.has(studentId)) {
          studentStats.set(studentId, {
            currentTermLate: 0,
            yearLate: 0,
            currentTermAbsent: 0,
            yearAbsent: 0,
          })
        }

        const stats = studentStats.get(studentId)

        // Count Late
        if (isLateStatus(status)) {
          stats.yearLate++
          if (inCurrentTerm) {
            stats.currentTermLate++
          }
        }

        // Count Absent
        if (isAbsentStatus(status)) {
          stats.yearAbsent++
          if (inCurrentTerm) {
            stats.currentTermAbsent++
          }
        }
      })
    })
  })

  console.log(`📊 Calculated stats for ${studentStats.size} students\n`)

  // Step 3: Update student documents
  console.log('📝 Updating student documents...\n')

  const studentsRef = db.collection('students')
  const studentsSnapshot = await studentsRef.get()

  let updated = 0
  let skipped = 0
  let notFound = 0
  const updates = []

  studentsSnapshot.forEach((docSnap) => {
    const studentId = docSnap.id
    const studentData = docSnap.data() || {}
    const stats = studentStats.get(studentId)

    if (!stats) {
      // Student has no attendance records, set to zero
      const currentStats = studentData.attendanceStats || {}
      const needsUpdate =
        currentStats.currentTermLateCount !== 0 ||
        currentStats.yearLateCount !== 0 ||
        currentStats.currentTermAbsenceCount !== 0 ||
        currentStats.yearAbsenceCount !== 0

      if (needsUpdate) {
        updates.push({
          studentId,
          studentName: `${studentData.personalInfo?.firstName || ''} ${studentData.personalInfo?.lastName || ''}`.trim() || studentId,
          ref: docSnap.ref,
          stats: {
            currentTermLateCount: 0,
            yearLateCount: 0,
            currentTermAbsenceCount: 0,
            yearAbsenceCount: 0,
          },
        })
        updated++
      } else {
        skipped++
      }
    } else {
      // Student has attendance records, update with calculated stats
      const currentStats = studentData.attendanceStats || {}
      const needsUpdate =
        currentStats.currentTermLateCount !== stats.currentTermLate ||
        currentStats.yearLateCount !== stats.yearLate ||
        currentStats.currentTermAbsenceCount !== stats.currentTermAbsent ||
        currentStats.yearAbsenceCount !== stats.yearAbsent

      if (needsUpdate) {
        updates.push({
          studentId,
          studentName: `${studentData.personalInfo?.firstName || ''} ${studentData.personalInfo?.lastName || ''}`.trim() || studentId,
          ref: docSnap.ref,
          stats: {
            currentTermLateCount: stats.currentTermLate,
            yearLateCount: stats.yearLate,
            currentTermAbsenceCount: stats.currentTermAbsent,
            yearAbsenceCount: stats.yearAbsent,
          },
          oldStats: currentStats,
        })
        updated++
      } else {
        skipped++
      }
    }
  })

  // Check for students in attendance but not in students collection
  studentStats.forEach((stats, studentId) => {
    const studentDoc = studentsSnapshot.docs.find((doc) => doc.id === studentId)
    if (!studentDoc) {
      notFound++
      console.log(`⚠️  Student ${studentId} has attendance records but no student document`)
    }
  })

  console.log(`📊 Summary:`)
  console.log(`   • Students to update: ${updated}`)
  console.log(`   • Students already correct: ${skipped}`)
  console.log(`   • Students in attendance but not in students collection: ${notFound}\n`)

  if (updates.length === 0) {
    console.log('✅ No updates needed. All stats are already correct!')
    return
  }

  // Show sample updates
  console.log('📋 Sample updates (first 10):')
  updates.slice(0, 10).forEach((update) => {
    const old = update.oldStats || {}
    console.log(
      `   • ${update.studentName} (${update.studentId}):`,
    )
    console.log(
      `     Current Term: Late ${old.currentTermLateCount || 0} → ${update.stats.currentTermLateCount}, Absent ${old.currentTermAbsenceCount || 0} → ${update.stats.currentTermAbsenceCount}`,
    )
    console.log(
      `     Year: Late ${old.yearLateCount || 0} → ${update.stats.yearLateCount}, Absent ${old.yearAbsenceCount || 0} → ${update.stats.yearAbsenceCount}`,
    )
  })
  if (updates.length > 10) {
    console.log(`   ... and ${updates.length - 10} more\n`)
  } else {
    console.log()
  }

  if (DRY_RUN) {
    console.log('🧪 DRY RUN complete - No changes were made to Firebase')
    console.log('💡 To apply these changes, run without --dry-run flag')
    return
  }

  // Apply updates in batches
  console.log(`🔄 Applying ${updates.length} updates...\n`)

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = db.batch()
    const batchUpdates = updates.slice(i, i + BATCH_SIZE)

    batchUpdates.forEach((update) => {
      batch.update(update.ref, {
        attendanceStats: update.stats,
      })
    })

    await batch.commit()
    console.log(`✅ Committed batch ${Math.floor(i / BATCH_SIZE) + 1} (${batchUpdates.length} students)\n`)
  }

  console.log('✅ Recalculation complete!')
  console.log(`   • Updated: ${updated} students`)
  console.log(`   • Skipped: ${skipped} students`)
  console.log(`   • Students with attendance but no document: ${notFound}`)
}

if (require.main === module) {
  recalculateAttendanceStats()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Recalculation failed:', err)
      process.exit(1)
    })
}

module.exports = { recalculateAttendanceStats }

