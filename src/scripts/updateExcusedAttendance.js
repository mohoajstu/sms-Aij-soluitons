/*
  Update all "Excused" attendance records based on CSV data
  
  Logic:
  - If note contains "late" (case-insensitive) → change to "Late"
  - If note contains words like "away", "sick", "travelling" or other clear absence indicators → change to "Absent"
  - All other "Excused" records (including those without notes) → change to "Absent"
  
  Usage:
  1) Set Google credentials (if not already configured):
     - PowerShell: $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\path\\to\\serviceAccount.json"
     - macOS/Linux: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
  2) Run the script:
     - Dry run (preview only, no changes): 
       node src/scripts/updateExcusedAttendance.js --dry-run
     - With default CSV (src/scripts/Attendance Report - 11_19_2025 - Sheet1.csv):
       node src/scripts/updateExcusedAttendance.js
     - With custom CSV file:
       node src/scripts/updateExcusedAttendance.js "/path/to/file.csv"
     - Dry run with custom CSV:
       node src/scripts/updateExcusedAttendance.js "/path/to/file.csv" --dry-run
*/

const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')

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

// Configuration
const DRY_RUN = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run')
const DEFAULT_CSV_PATH = path.join(__dirname, 'Attendance Report - 11_19_2025 - Sheet1.csv')

// Words/phrases that indicate absence
const ABSENCE_INDICATORS = [
  'away',
  'sick',
  'travelling',
  'traveling',
  'ill',
  'illness',
  'medical',
  'appointment',
  'doctor',
  'hospital',
  'emergency',
  'family emergency',
  'absent',
  'not present',
  'did not attend',
  'missed',
]

/**
 * Normalizes a string for comparison (lowercase, trim, remove extra spaces)
 */
function normalizeString(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Normalizes class name for matching
 */
function normalizeClassName(className) {
  if (!className) return ''
  // Remove "Homeroom" prefix variations and normalize
  return normalizeString(className.replace(/^homeroom\s*/i, ''))
}

/**
 * Determines the new status based on the note
 * @param {string} note - The note/comment from the attendance record
 * @returns {string} - The new status: "Late" or "Absent"
 */
function determineNewStatus(note) {
  if (!note || typeof note !== 'string') {
    // No note or empty note → Absent
    return 'Absent'
  }

  const noteLower = note.toLowerCase().trim()

  // Check if note contains "late"
  if (noteLower.includes('late')) {
    return 'Late'
  }

  // Check if note contains any absence indicators
  for (const indicator of ABSENCE_INDICATORS) {
    if (noteLower.includes(indicator)) {
      return 'Absent'
    }
  }

  // Default: all other excused records are absences
  return 'Absent'
}

/**
 * Parses CSV file and returns array of records
 */
async function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = []
    if (!fs.existsSync(filePath)) {
      reject(new Error(`CSV file not found: ${filePath}`))
      return
    }

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        // Skip empty rows
        if (data.Date && data.Student) {
          results.push({
            date: data.Date.trim(),
            class: data.Class ? data.Class.trim() : '',
            student: data.Student.trim(),
            status: data.Status ? data.Status.trim() : 'Excused',
            note: data.Note ? data.Note.trim() : '',
          })
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject)
  })
}

/**
 * Creates a lookup key for matching CSV records with Firebase records
 */
function createLookupKey(date, className, studentName) {
  return `${date}|${normalizeClassName(className)}|${normalizeString(studentName)}`
}

async function updateExcusedAttendance(csvFilePath) {
  if (DRY_RUN) {
    console.log('🧪 DRY RUN MODE - No changes will be made to Firebase\n')
  }

  console.log('🔎 Starting update of "Excused" attendance records from CSV...')
  console.log('📋 Logic:')
  console.log('   • Notes containing "late" → "Late"')
  console.log('   • Notes containing absence indicators (away, sick, travelling, etc.) → "Absent"')
  console.log('   • All other "Excused" records → "Absent"\n')

  // Parse CSV file
  console.log(`📂 Reading CSV file: ${csvFilePath}\n`)
  const csvRecords = await parseCSVFile(csvFilePath)
  console.log(`📊 Found ${csvRecords.length} records in CSV\n`)

  // Create lookup map from CSV: date|class|student -> note
  const csvLookup = new Map()
  csvRecords.forEach((record) => {
    const key = createLookupKey(record.date, record.class, record.student)
    csvLookup.set(key, record.note)
  })

  console.log(`🔑 Created lookup map with ${csvLookup.size} entries\n`)

  // Fetch all attendance documents
  const attendanceRef = db.collection('attendance')
  const snapshot = await attendanceRef.get()

  console.log(`📄 Found ${snapshot.size} attendance documents in Firebase\n`)

  let totalExcused = 0
  let matchedFromCSV = 0
  let notMatched = 0
  let updatedToLate = 0
  let updatedToAbsent = 0
  let skipped = 0
  let processedDates = 0

  const updates = [] // Store all updates to batch them
  const dateDocuments = {} // Store document data to avoid re-reading
  const unmatchedRecords = [] // Track records that couldn't be matched

  // Single pass: collect all updates and store document data
  snapshot.forEach((docSnap) => {
    const dateId = docSnap.id
    const dailyData = docSnap.data() || {}
    const courses = dailyData.courses || []

    // Store document data for later use
    dateDocuments[dateId] = dailyData

    let dateHasUpdates = false

    courses.forEach((course, courseIndex) => {
      const students = course.students || []
      const courseTitle = course.courseTitle || ''

      students.forEach((student, studentIndex) => {
        if (student.status === 'Excused') {
          totalExcused++
          const studentName = student.studentName || 'Unknown'

          // Try to match with CSV record
          const lookupKey = createLookupKey(dateId, courseTitle, studentName)
          let note = student.note || ''
          let matched = false

          if (csvLookup.has(lookupKey)) {
            // Use note from CSV
            note = csvLookup.get(lookupKey)
            matched = true
            matchedFromCSV++
            csvLookup.delete(lookupKey) // Remove from map to track unmatched CSV records
          } else {
            // Try alternative matching: just by date and student name
            for (const [key, csvNote] of csvLookup.entries()) {
              const [csvDate, , csvStudent] = key.split('|')
              if (csvDate === dateId && normalizeString(csvStudent) === normalizeString(studentName)) {
                note = csvNote
                matched = true
                matchedFromCSV++
                csvLookup.delete(key)
                break
              }
            }
          }

          if (!matched) {
            notMatched++
            unmatchedRecords.push({
              date: dateId,
              class: courseTitle,
              student: studentName,
              studentId: student.studentId || 'Unknown',
              note: note || '(no note)',
            })
          }

          // Determine new status based on note
          const newStatus = determineNewStatus(note)

          if (newStatus !== 'Excused') {
            updates.push({
              dateId,
              courseIndex,
              studentIndex,
              oldStatus: 'Excused',
              newStatus,
              note,
              studentName,
              studentId: student.studentId || 'Unknown',
              matched,
            })

            if (newStatus === 'Late') {
              updatedToLate++
            } else if (newStatus === 'Absent') {
              updatedToAbsent++
            }

            dateHasUpdates = true
          } else {
            skipped++
          }
        }
      })
    })

    if (dateHasUpdates) {
      processedDates++
    }
  })

  // Report unmatched CSV records
  if (csvLookup.size > 0) {
    console.log(`⚠️  Warning: ${csvLookup.size} CSV records were not matched to Firebase records:`)
    csvLookup.forEach((note, key) => {
      const [date, className, student] = key.split('|')
      console.log(`   • ${date} | ${className} | ${student} | Note: "${note || '(no note)'}"`)
    })
    console.log()
  }

  console.log(`📊 Analysis complete:`)
  console.log(`   • Total "Excused" records found in Firebase: ${totalExcused}`)
  console.log(`   • Matched with CSV records: ${matchedFromCSV}`)
  console.log(`   • Not matched (using existing note): ${notMatched}`)
  console.log(`   • Will update to "Late": ${updatedToLate}`)
  console.log(`   • Will update to "Absent": ${updatedToAbsent}`)
  console.log(`   • Will skip (no change needed): ${skipped}`)
  console.log(`   • Dates with updates: ${processedDates}`)

  if (unmatchedRecords.length > 0) {
    console.log(`\n⚠️  ${unmatchedRecords.length} Firebase records couldn't be matched with CSV:`)
    unmatchedRecords.slice(0, 10).forEach((record) => {
      console.log(
        `   • ${record.date} | ${record.class} | ${record.student} (${record.studentId}) | Note: "${record.note}"`,
      )
    })
    if (unmatchedRecords.length > 10) {
      console.log(`   ... and ${unmatchedRecords.length - 10} more`)
    }
  }
  console.log()

  if (updates.length === 0) {
    console.log('✅ No updates needed. All done!')
    return
  }

  // Group updates by date for efficient batching
  const updatesByDate = {}
  updates.forEach((update) => {
    if (!updatesByDate[update.dateId]) {
      updatesByDate[update.dateId] = []
    }
    updatesByDate[update.dateId].push(update)
  })

  if (DRY_RUN) {
    console.log(`🧪 DRY RUN: Would apply ${updates.length} updates across ${Object.keys(updatesByDate).length} dates...\n`)
    console.log('📋 Preview of updates that would be made:\n')

    // Show preview of updates
    const dateIds = Object.keys(updatesByDate)
    dateIds.forEach((dateId) => {
      const dateUpdates = updatesByDate[dateId]
      console.log(`📅 Date: ${dateId} (${dateUpdates.length} updates)`)
      dateUpdates.forEach((update) => {
        const matchIndicator = update.matched ? '✓' : '⚠'
        console.log(
          `   ${matchIndicator} ${update.studentName} (${update.studentId}) | "${update.oldStatus}" → "${update.newStatus}" | Note: "${update.note || '(no note)'}"`,
        )
      })
      console.log()
    })

    console.log('🧪 DRY RUN complete - No changes were made to Firebase')
    console.log('💡 To apply these changes, run without --dry-run flag')
    return
  }

  console.log(`🔄 Applying ${updates.length} updates across ${Object.keys(updatesByDate).length} dates...\n`)

  // Process updates in batches
  const dateIds = Object.keys(updatesByDate)
  let batchCount = 0

  for (let i = 0; i < dateIds.length; i += BATCH_SIZE) {
    const dateBatch = dateIds.slice(i, i + BATCH_SIZE)
    const batch = db.batch()

    for (const dateId of dateBatch) {
      const dateUpdates = updatesByDate[dateId]
      const dateRef = db.collection('attendance').doc(dateId)
      const dailyData = dateDocuments[dateId]

      if (!dailyData) {
        console.warn(`⚠️  Document ${dateId} data not found, skipping`)
        continue
      }

      // Create a deep copy of courses array to avoid mutating the original
      const courses = JSON.parse(JSON.stringify(dailyData.courses || []))

      // Apply all updates for this date
      dateUpdates.forEach((update) => {
        const course = courses[update.courseIndex]
        if (course && course.students && course.students[update.studentIndex]) {
          course.students[update.studentIndex].status = update.newStatus
          const matchIndicator = update.matched ? '✓' : '⚠'
          console.log(
            `   ${matchIndicator} ${dateId} | ${update.studentName} (${update.studentId}) | "${update.oldStatus}" → "${update.newStatus}" | Note: "${update.note || '(no note)'}"`,
          )
        }
      })

      // Update the document
      batch.update(dateRef, { courses })
      batchCount++
    }

    // Commit this batch
    await batch.commit()
    console.log(`✅ Committed batch ${Math.floor(i / BATCH_SIZE) + 1} (${dateBatch.length} dates)\n`)
  }

  console.log('✅ Update complete!')
  console.log(`   • Total "Excused" records processed: ${totalExcused}`)
  console.log(`   • Matched with CSV: ${matchedFromCSV}`)
  console.log(`   • Updated to "Late": ${updatedToLate}`)
  console.log(`   • Updated to "Absent": ${updatedToAbsent}`)
  console.log(`   • Skipped: ${skipped}`)
  console.log(`   • Dates updated: ${processedDates}`)
}

if (require.main === module) {
  // Get CSV file path from command line argument, or use default
  let csvFilePath = process.argv.find((arg) => arg.endsWith('.csv') && !arg.startsWith('--'))
  
  if (!csvFilePath) {
    // Use default CSV file in scripts directory
    csvFilePath = DEFAULT_CSV_PATH
    if (!fs.existsSync(csvFilePath)) {
      console.error('❌ Error: CSV file not found')
      console.error(`   Default path: ${csvFilePath}`)
      console.error('   Usage: node src/scripts/updateExcusedAttendance.js [<path-to-csv-file>] [--dry-run]')
      console.error('   Example: node src/scripts/updateExcusedAttendance.js --dry-run')
      console.error('   Example: node src/scripts/updateExcusedAttendance.js "/path/to/file.csv" --dry-run')
      process.exit(1)
    }
  }

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ Error: CSV file not found: ${csvFilePath}`)
    process.exit(1)
  }

  updateExcusedAttendance(csvFilePath)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Update failed:', err)
      process.exit(1)
    })
}

module.exports = { updateExcusedAttendance, determineNewStatus }

