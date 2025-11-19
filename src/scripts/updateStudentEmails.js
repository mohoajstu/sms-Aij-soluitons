// Script to update student emails from CSV file
// Run with: node src/scripts/updateStudentEmails.js [path-to-csv-file]
// Example: node src/scripts/updateStudentEmails.js ~/Downloads/Untitled\ spreadsheet\ -\ Sheet1.csv

const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

// Initialize Firebase Admin SDK
try {
  // Check if Firebase Admin is already initialized
  if (!admin.apps.length) {
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json')
    
    // Check if service account key file exists
    if (!fs.existsSync(serviceAccountPath)) {
      console.error('❌ Error: serviceAccountKey.json not found!')
      console.error(`   Expected location: ${serviceAccountPath}`)
      console.error('   Please add your Firebase service account key file to the scripts directory.')
      console.error('   You can download it from: Firebase Console > Project Settings > Service Accounts')
      process.exit(1)
    }
    
    // Try service account key
    try {
      const serviceAccount = require(serviceAccountPath)
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || serviceAccount.project_id,
      })
      console.log('🔥 Firebase initialized with service account key')
    } catch (keyError) {
      console.error('❌ Error loading service account key:', keyError.message)
      console.error('   Please check that serviceAccountKey.json is valid JSON format.')
      process.exit(1)
    }
  }
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message)
  process.exit(1)
}

const db = admin.firestore()

// Configuration
// Parse command line arguments properly
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run') || args.includes('-d') // Set to true to preview changes without updating

// Get CSV file path from command line argument (exclude flags)
const CSV_FILE_PATH = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-')) || 
                      path.join(process.env.HOME || process.env.USERPROFILE || '', 'Downloads/Untitled spreadsheet - Sheet1.csv')

// Track results
const results = {
  successful: [],
  skipped: [],
  errors: [],
  gradeMismatches: [] // Track students matched but in different grade
}

/**
 * Manual overrides for students that couldn't be matched automatically
 * Maps student ID directly to email address
 */
const MANUAL_EMAIL_OVERRIDES = {
  'TS156660': 'ayan.suliman@tarbiyahlearning.ca',  // mohammed ayan Suliman
  'TS436580': 'mohamed.felfel@tarbiyahlearning.ca',  // Mohamad Felfel
  'TLS215683': 'zahran.munir@tarbiyahlearning.ca',  // Mus'aab Zahran Munir
  'TS576495': 'muntaha.hassan@tarbiyahlearning.ca',  // Muntaha Hasan
  'TS446117': 'ahmed.khalil@tarbiyahlearning.ca',  // Ahmed Khalil Damergi
  'TS536285': 'dawood.sayed@tarbiyahlearning.ca',  // Muhammad Dawood Sayed
  'TS516116': 'ahmed.malik@tarbiyahlearning.ca',  // Malik Damergi
  'TS816020': 'nadia.elasobky@tarbiyahlearning.ca',  // Nadia Elsobky
  'TS861904': 'ismail.mobin@tarbiyahlearning.ca',  // Ismail Mobeen
  'TS386703': 'japoksfred@tarbiyahlearning.ca',  // Aasiyah Abdunnur
  'TS435778': 'muhammed.wahid@tarbiyahlearning.ca',  // Mohammad Wahid
}

/**
 * Parse CSV file and extract emails grouped by grade
 */
function parseCSVFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  const gradeEmails = {}
  let currentGrade = null
  
  for (const line of lines) {
    // Check if this line is a grade header
    const gradeMatch = line.match(/^(JK|SK1|SK2|Grade\s*[1-8]):?$/i)
    if (gradeMatch) {
      currentGrade = gradeMatch[1].toLowerCase()
      // Normalize grade names
      if (currentGrade.startsWith('grade')) {
        currentGrade = currentGrade.replace(/\s+/g, '').toLowerCase() // "grade1", "grade2", etc.
      }
      if (!gradeEmails[currentGrade]) {
        gradeEmails[currentGrade] = []
      }
      continue
    }
    
    // If we have a current grade, this should be an email
    if (currentGrade) {
      // Clean up email (remove quotes, commas, whitespace)
      let email = line.replace(/^["']|["']$/g, '').replace(/,$/, '').trim()
      
      // Validate email format
      if (email && email.includes('@tarbiyahlearning.ca')) {
        gradeEmails[currentGrade].push(email)
      }
    }
  }
  
  return gradeEmails
}

/**
 * Extract firstname and lastname from email
 * Format: firstname.lastname@tarbiyahlearning.ca
 */
function extractNameFromEmail(email) {
  const localPart = email.split('@')[0]
  const parts = localPart.split('.')
  
  if (parts.length >= 2) {
    const firstName = parts[0].toLowerCase()
    const lastName = parts.slice(1).join('.').toLowerCase() // Handle cases like "bintzabir" or "al-mdallal"
    return { firstName, lastName }
  }
  
  return null
}

/**
 * Normalize name for comparison (lowercase, remove extra spaces)
 */
function normalizeName(name) {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Check if firstname and lastname match the student's firstName and lastName
 * Handles compound names like "bintzabir" matching "Bint Zabir"
 */
function nameMatches(studentFirstName, studentLastName, emailFirstName, emailLastName) {
  const normalizedStudentFirst = normalizeName(studentFirstName)
  const normalizedStudentLast = normalizeName(studentLastName)
  const normalizedEmailFirst = normalizeName(emailFirstName)
  const normalizedEmailLast = normalizeName(emailLastName)
  
  // Check if email firstname is contained in student firstname and email lastname is contained in student lastname
  const firstNameMatch = normalizedStudentFirst.includes(normalizedEmailFirst) || 
                         normalizedEmailFirst.includes(normalizedStudentFirst)
  
  // For last name, handle compound names:
  // - "bintzabir" should match "Bint Zabir" (remove spaces from both for comparison)
  // - "moalimishak" should match "Moalimishak" or "Moalim Ishak"
  const studentLastNameNoSpaces = normalizedStudentLast.replace(/\s+/g, '')
  const emailLastNameNoSpaces = normalizedEmailLast.replace(/\s+/g, '')
  
  // Try multiple matching strategies for compound names
  const lastNameMatch = 
    // Direct match (with spaces)
    normalizedStudentLast.includes(normalizedEmailLast) || 
    normalizedEmailLast.includes(normalizedStudentLast) ||
    // Match without spaces (handles "bintzabir" = "Bint Zabir")
    studentLastNameNoSpaces === emailLastNameNoSpaces ||
    studentLastNameNoSpaces.includes(emailLastNameNoSpaces) ||
    emailLastNameNoSpaces.includes(studentLastNameNoSpaces) ||
    // Match individual words (handles "moalimishak" = "Moalim Ishak")
    normalizedStudentLast.split(/\s+/).some(word => word === normalizedEmailLast) ||
    normalizedEmailLast.split(/\s+/).some(word => word === normalizedStudentLast)
  
  return firstNameMatch && lastNameMatch
}

/**
 * Find student in Firebase by matching first and last name
 */
async function findStudentByEmail(email, grade) {
  const nameParts = extractNameFromEmail(email)
  if (!nameParts) {
    return { found: false, reason: 'Could not extract name from email' }
  }
  
  const { firstName, lastName } = nameParts
  
  try {
    // Get all students
    const studentsSnapshot = await db.collection('students').get()
    
    // Filter by grade if available
    let candidates = []
    studentsSnapshot.forEach(doc => {
      const data = doc.data()
      const studentGrade = data.schooling?.program || data.program || ''
      const normalizedGrade = studentGrade.toLowerCase().trim()
      
      // Match grade (handle variations like "jk", "grade1", "grade 1", "sk", etc.)
      let gradeMatches = false
      if (grade === 'jk' && normalizedGrade === 'jk') {
        gradeMatches = true
      } else if (grade === 'sk1' && (normalizedGrade === 'sk1' || normalizedGrade === 'sk 1' || normalizedGrade === 'sk')) {
        gradeMatches = true
      } else if (grade === 'sk2' && (normalizedGrade === 'sk2' || normalizedGrade === 'sk 2' || normalizedGrade === 'sk')) {
        gradeMatches = true
      } else if (grade.startsWith('grade') && normalizedGrade.includes(grade.replace('grade', '').trim())) {
        gradeMatches = true
      }
      
      const studentFirstName = normalizeName(data.personalInfo?.firstName || '')
      const studentLastName = normalizeName(data.personalInfo?.lastName || '')
      const fullName = `${studentFirstName} ${studentLastName}`.trim()
      
      // Check if names match (compare firstName to firstName and lastName to lastName)
      // Always check name matches regardless of grade - we'll prefer grade matches later
      if (nameMatches(studentFirstName, studentLastName, firstName, lastName)) {
        candidates.push({
          id: doc.id,
          data: data,
          firstName: studentFirstName,
          lastName: studentLastName,
          fullName: fullName,
          grade: normalizedGrade,
          gradeMatches,
          // Store original grade for better logging
          originalGrade: studentGrade
        })
      }
    })
    
    if (candidates.length === 0) {
      return { found: false, reason: 'No matching student found' }
    }
    
    // Prefer candidates that match the grade
    const gradeMatchedCandidates = candidates.filter(c => c.gradeMatches)
    const candidatesToUse = gradeMatchedCandidates.length > 0 ? gradeMatchedCandidates : candidates
    
    if (candidatesToUse.length === 1) {
      return { found: true, student: candidatesToUse[0] }
    }
    
    // Multiple matches - try to find the best match
    // Prefer exact matches (case-insensitive)
    const exactMatch = candidatesToUse.find(c => 
      normalizeName(c.firstName) === normalizeName(firstName) && 
      normalizeName(c.lastName) === normalizeName(lastName)
    )
    
    if (exactMatch) {
      return { found: true, student: exactMatch }
    }
    
    // Return first match but flag as ambiguous
    return { 
      found: true, 
      student: candidatesToUse[0], 
      ambiguous: true, 
      allMatches: candidatesToUse.map(c => `${c.fullName} (${c.grade})`)
    }
  } catch (error) {
    return { found: false, reason: `Error searching: ${error.message}` }
  }
}

/**
 * Update student email in Firebase
 */
async function updateStudentEmail(studentId, email) {
  try {
    const studentRef = db.collection('students').doc(studentId)
    const studentDoc = await studentRef.get()
    
    if (!studentDoc.exists) {
      return { success: false, error: 'Student document does not exist' }
    }
    
    const studentData = studentDoc.data()
    const existingEmail = studentData.contact?.email || ''
    
    // Skip if email already matches
    if (existingEmail.toLowerCase() === email.toLowerCase()) {
      return { success: true, skipped: true, reason: 'Email already set correctly' }
    }
    
    if (!DRY_RUN) {
      await studentRef.update({
        'contact.email': email,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }
    
    return { success: true, wasUpdated: existingEmail !== '' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Process manual email overrides
 */
async function processManualOverrides() {
  const overrideCount = Object.keys(MANUAL_EMAIL_OVERRIDES).length
  if (overrideCount === 0) {
    return
  }
  
  console.log(`\n🔧 Processing ${overrideCount} manual email overrides...`)
  
  for (const [studentId, email] of Object.entries(MANUAL_EMAIL_OVERRIDES)) {
    try {
      // Get student document
      const studentDoc = await db.collection('students').doc(studentId).get()
      
      if (!studentDoc.exists) {
        results.errors.push({
          email,
          studentId,
          error: `Student document not found: ${studentId}`
        })
        console.log(`  ❌ Error: ${email} → Student ${studentId} not found`)
        continue
      }
      
      const studentData = studentDoc.data()
      const studentName = `${studentData.personalInfo?.firstName || ''} ${studentData.personalInfo?.lastName || ''}`.trim() || studentId
      
      // Update student email
      const updateResult = await updateStudentEmail(studentId, email)
      
      if (updateResult.success) {
        if (updateResult.skipped) {
          results.successful.push({
            email,
            studentId,
            studentName,
            skipped: true,
            reason: updateResult.reason,
            manualOverride: true
          })
          console.log(`  ✓ Already set (manual): ${email} → ${studentName} (${studentId})`)
        } else {
          results.successful.push({
            email,
            studentId,
            studentName,
            wasUpdated: updateResult.wasUpdated || false,
            manualOverride: true
          })
          const action = updateResult.wasUpdated ? 'Updated' : 'Set'
          console.log(`  ✅ ${action} (manual): ${email} → ${studentName} (${studentId})`)
        }
      } else {
        results.errors.push({
          email,
          studentId,
          studentName,
          error: updateResult.error
        })
        console.log(`  ❌ Error (manual): ${email} → ${studentName} (${studentId}) - ${updateResult.error}`)
      }
    } catch (error) {
      results.errors.push({
        email,
        studentId,
        error: `Error processing manual override: ${error.message}`
      })
      console.log(`  ❌ Error (manual): ${email} → ${studentId} - ${error.message}`)
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('📧 Starting student email update process...\n')
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '✏️  LIVE (will update Firebase)'}\n`)
  
  // Check if CSV file exists
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ CSV file not found: ${CSV_FILE_PATH}`)
    console.error('Please provide the path to the CSV file as an argument:')
    console.error('  node src/scripts/updateStudentEmails.js /path/to/file.csv')
    process.exit(1)
  }
  
  // Parse CSV file
  console.log(`📄 Parsing CSV file: ${CSV_FILE_PATH}`)
  const gradeEmails = parseCSVFile(CSV_FILE_PATH)
  
  // Count total emails from CSV
  const totalCSVEmails = Object.values(gradeEmails).reduce((sum, emails) => sum + emails.length, 0)
  const totalManualOverrides = Object.keys(MANUAL_EMAIL_OVERRIDES).length
  
  console.log(`\n📊 Found emails for ${Object.keys(gradeEmails).length} grades:`)
  Object.entries(gradeEmails).forEach(([grade, emails]) => {
    console.log(`  ${grade}: ${emails.length} emails`)
  })
  console.log(`\n📈 Total emails from CSV: ${totalCSVEmails}`)
  console.log(`📈 Total manual overrides: ${totalManualOverrides}`)
  console.log(`📈 Expected total to process: ${totalCSVEmails + totalManualOverrides}`)
  console.log()
  
  // Track emails skipped because they're in manual overrides
  let skippedForManualOverride = 0
  
  // Process each grade
  for (const [grade, emails] of Object.entries(gradeEmails)) {
    console.log(`\n🔍 Processing ${grade} (${emails.length} emails)...`)
    
    for (const email of emails) {
      // Skip if this email is in manual overrides (will be processed separately)
      const isManualOverride = Object.values(MANUAL_EMAIL_OVERRIDES).includes(email.toLowerCase())
      if (isManualOverride) {
        skippedForManualOverride++
        console.log(`  ⏭️  Skipped: ${email} - Will be processed as manual override`)
        continue
      }
      
      const nameParts = extractNameFromEmail(email)
      if (!nameParts) {
        results.skipped.push({
          email,
          grade,
          reason: 'Could not extract name from email'
        })
        console.log(`  ⏭️  Skipped: ${email} - Could not extract name`)
        continue
      }
      
      // Find matching student
      const searchResult = await findStudentByEmail(email, grade)
      
      if (!searchResult.found) {
        results.skipped.push({
          email,
          grade,
          firstName: nameParts.firstName,
          lastName: nameParts.lastName,
          reason: searchResult.reason
        })
        console.log(`  ⏭️  Skipped: ${email} - ${searchResult.reason}`)
        continue
      }
      
      if (searchResult.ambiguous) {
        console.log(`  ⚠️  Ambiguous match for ${email}:`)
        console.log(`      Found ${searchResult.allMatches.length} matches: ${searchResult.allMatches.join(', ')}`)
        console.log(`      Using: ${searchResult.student.fullName} (${searchResult.student.id})`)
      }
      
      // Update student email
      const updateResult = await updateStudentEmail(searchResult.student.id, email)
      
      if (updateResult.success) {
        // Check if grade matches
        const studentGrade = searchResult.student.grade || searchResult.student.originalGrade || ''
        const gradeMismatch = grade && studentGrade && !searchResult.student.gradeMatches
        
        if (updateResult.skipped) {
          results.successful.push({
            email,
            grade,
            studentId: searchResult.student.id,
            studentName: searchResult.student.fullName,
            ambiguous: searchResult.ambiguous || false,
            skipped: true,
            reason: updateResult.reason,
            gradeMismatch
          })
          const gradeNote = gradeMismatch ? ` (⚠️ Grade mismatch: expected ${grade}, found ${studentGrade})` : ''
          console.log(`  ✓ Already set: ${email} → ${searchResult.student.fullName} (${searchResult.student.id})${gradeNote}`)
        } else {
          results.successful.push({
            email,
            grade,
            studentId: searchResult.student.id,
            studentName: searchResult.student.fullName,
            ambiguous: searchResult.ambiguous || false,
            wasUpdated: updateResult.wasUpdated || false,
            gradeMismatch,
            studentGrade
          })
          const action = updateResult.wasUpdated ? 'Updated' : 'Set'
          const gradeNote = gradeMismatch ? ` (⚠️ Grade mismatch: expected ${grade}, found ${studentGrade})` : ''
          console.log(`  ✅ ${action}: ${email} → ${searchResult.student.fullName} (${searchResult.student.id})${gradeNote}`)
          
          if (gradeMismatch) {
            results.gradeMismatches.push({
              email,
              expectedGrade: grade,
              actualGrade: studentGrade,
              studentName: searchResult.student.fullName,
              studentId: searchResult.student.id
            })
          }
        }
      } else {
        results.errors.push({
          email,
          grade,
          studentId: searchResult.student.id,
          studentName: searchResult.student.fullName,
          error: updateResult.error
        })
        console.log(`  ❌ Error: ${email} - ${updateResult.error}`)
      }
    }
  }
  
  // Process manual overrides
  await processManualOverrides()
  
  // Calculate final statistics
  // Note: Emails in both CSV and manual overrides are skipped during CSV processing
  // but processed in manual overrides, so we need to account for that
  const totalProcessed = results.successful.length + results.skipped.length + results.errors.length
  const totalExpected = totalCSVEmails + totalManualOverrides
  const successfulUpdates = results.successful.filter(r => !r.skipped && !r.manualOverride).length
  const successfulManualOverrides = results.successful.filter(r => r.manualOverride && !r.skipped).length
  const alreadySet = results.successful.filter(r => r.skipped).length
  
  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`📥 Total emails from CSV: ${totalCSVEmails}`)
  console.log(`🔧 Total manual overrides: ${totalManualOverrides}`)
  console.log(`📊 Total expected to process: ${totalExpected}`)
  console.log(`✅ Successfully processed: ${results.successful.length}`)
  console.log(`   ├─ Newly set/updated: ${successfulUpdates}`)
  console.log(`   ├─ Manual overrides set: ${successfulManualOverrides}`)
  console.log(`   └─ Already set (skipped): ${alreadySet}`)
  console.log(`⏭️  Skipped (not found): ${results.skipped.length}`)
  console.log(`❌ Errors: ${results.errors.length}`)
  if (results.gradeMismatches.length > 0) {
    console.log(`⚠️  Grade Mismatches: ${results.gradeMismatches.length} (matched but in different grade)`)
  }
  
  // Verification
  console.log('\n' + '='.repeat(60))
  console.log('🔍 VERIFICATION')
  console.log('='.repeat(60))
  console.log(`Total processed: ${totalProcessed}`)
  console.log(`Total expected: ${totalExpected}`)
  if (skippedForManualOverride > 0) {
    console.log(`📝 Note: ${skippedForManualOverride} email(s) from CSV were skipped because they're in manual overrides`)
    console.log(`   These were processed in the manual overrides section instead`)
  }
  const expectedAfterAccounting = totalExpected - skippedForManualOverride
  if (totalProcessed === expectedAfterAccounting) {
    console.log('✅ All emails processed correctly!')
  } else {
    const diff = expectedAfterAccounting - totalProcessed
    console.log(`⚠️  Mismatch: ${diff} email(s) not accounted for`)
    if (diff > 0) {
      console.log('   Please review the skipped and error lists above')
    }
  }
  
  if (results.successful.length > 0) {
    console.log('\n✅ Successfully updated students:')
    results.successful.forEach(r => {
      const ambiguous = r.ambiguous ? ' ⚠️ (ambiguous match)' : ''
      const skipped = r.skipped ? ' (already set)' : ''
      const manual = r.manualOverride ? ' 🔧 (manual override)' : ''
      console.log(`  • ${r.email} → ${r.studentName} (${r.studentId})${ambiguous}${skipped}${manual}`)
    })
  }
  
  if (results.skipped.length > 0) {
    console.log('\n⏭️  Skipped students:')
    results.skipped.forEach(r => {
      const nameInfo = r.firstName && r.lastName ? ` (${r.firstName} ${r.lastName})` : ''
      console.log(`  • ${r.email}${nameInfo} - ${r.reason}`)
    })
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:')
    results.errors.forEach(r => {
      console.log(`  • ${r.email} → ${r.studentName} (${r.studentId}) - ${r.error}`)
    })
  }
  
  if (results.gradeMismatches.length > 0) {
    console.log('\n⚠️  Grade Mismatches (matched but in different grade):')
    results.gradeMismatches.forEach(r => {
      console.log(`  • ${r.email} → ${r.studentName} (${r.studentId})`)
      console.log(`    Expected: ${r.expectedGrade}, Found: ${r.actualGrade}`)
    })
  }
  
  console.log('\n' + '='.repeat(60))
  
  // Save results to file
  const resultsPath = path.join(__dirname, `email-update-results-${Date.now()}.json`)
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2))
  console.log(`\n💾 Results saved to: ${resultsPath}`)
  
  process.exit(0)
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

