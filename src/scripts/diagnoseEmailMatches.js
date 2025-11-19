// Diagnostic script to identify why student email matches failed
// Run with: node src/scripts/diagnoseEmailMatches.js [path-to-csv-file]

const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

// Initialize Firebase Admin SDK
try {
  if (!admin.apps.length) {
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json')
    
    if (!fs.existsSync(serviceAccountPath)) {
      console.error('❌ Error: serviceAccountKey.json not found!')
      process.exit(1)
    }
    
    const serviceAccount = require(serviceAccountPath)
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || serviceAccount.project_id,
    })
    console.log('🔥 Firebase initialized\n')
  }
} catch (error) {
  console.error('❌ Error initializing Firebase:', error.message)
  process.exit(1)
}

const db = admin.firestore()

/**
 * Parse CSV file and extract emails grouped by grade
 */
function parseCSVFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  const gradeEmails = {}
  let currentGrade = null
  
  for (const line of lines) {
    const gradeMatch = line.match(/^(JK|SK1|SK2|Grade\s*[1-8]):?$/i)
    if (gradeMatch) {
      currentGrade = gradeMatch[1].toLowerCase()
      if (currentGrade.startsWith('grade')) {
        currentGrade = currentGrade.replace(/\s+/g, '').toLowerCase()
      }
      if (!gradeEmails[currentGrade]) {
        gradeEmails[currentGrade] = []
      }
      continue
    }
    
    if (currentGrade) {
      let email = line.replace(/^["']|["']$/g, '').replace(/,$/, '').trim()
      if (email && email.includes('@tarbiyahlearning.ca')) {
        gradeEmails[currentGrade].push(email)
      }
    }
  }
  
  return gradeEmails
}

/**
 * Extract firstname and lastname from email
 */
function extractNameFromEmail(email) {
  const localPart = email.split('@')[0]
  const parts = localPart.split('.')
  
  if (parts.length >= 2) {
    const firstName = parts[0].toLowerCase()
    const lastName = parts.slice(1).join('.').toLowerCase()
    return { firstName, lastName }
  }
  
  return null
}

/**
 * Normalize name for comparison
 */
function normalizeName(name) {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Find potential matches for a student
 */
async function findPotentialMatches(email, grade) {
  const nameParts = extractNameFromEmail(email)
  if (!nameParts) {
    return { error: 'Could not extract name from email' }
  }
  
  const { firstName, lastName } = nameParts
  
  try {
    const studentsSnapshot = await db.collection('students').get()
    const potentialMatches = []
    
    studentsSnapshot.forEach(doc => {
      const data = doc.data()
      const studentFirstName = normalizeName(data.personalInfo?.firstName || '')
      const studentLastName = normalizeName(data.personalInfo?.lastName || '')
      const studentGrade = normalizeName(data.schooling?.program || data.program || '')
      const fullName = `${studentFirstName} ${studentLastName}`.trim()
      
      // Check various matching criteria
      const firstNameMatch = studentFirstName.includes(firstName) || firstName.includes(studentFirstName)
      const lastNameMatch = studentLastName.includes(lastName) || lastName.includes(studentLastName)
      const fullNameMatch = fullName.includes(`${firstName} ${lastName}`) || 
                           fullName.includes(firstName) && fullName.includes(lastName)
      
      // Check grade
      let gradeMatches = false
      if (grade === 'jk' && (studentGrade === 'jk' || studentGrade === 'JK')) {
        gradeMatches = true
      } else if (grade === 'sk1' && (studentGrade === 'sk1' || studentGrade === 'sk 1' || studentGrade === 'sk')) {
        gradeMatches = true
      } else if (grade === 'sk2' && (studentGrade === 'sk2' || studentGrade === 'sk 2')) {
        gradeMatches = true
      } else if (grade && grade.startsWith('grade') && studentGrade.includes(grade.replace('grade', '').trim())) {
        gradeMatches = true
      }
      
      // Score the match
      let score = 0
      if (firstNameMatch) score += 2
      if (lastNameMatch) score += 2
      if (fullNameMatch) score += 1
      if (gradeMatches) score += 1
      
      if (score > 0) {
        potentialMatches.push({
          id: doc.id,
          firstName: data.personalInfo?.firstName || '',
          lastName: data.personalInfo?.lastName || '',
          fullName: fullName,
          grade: studentGrade,
          gradeMatches,
          score,
          existingEmail: data.contact?.email || ''
        })
      }
    })
    
    // Sort by score (highest first)
    potentialMatches.sort((a, b) => b.score - a.score)
    
    return {
      email,
      emailFirstName: firstName,
      emailLastName: lastName,
      expectedGrade: grade,
      matches: potentialMatches
    }
  } catch (error) {
    return { error: error.message }
  }
}

/**
 * Main function
 */
async function main() {
  const CSV_FILE_PATH = process.argv[2] || path.join(process.env.HOME || '', 'Downloads/Untitled spreadsheet - Sheet1.csv')
  
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ CSV file not found: ${CSV_FILE_PATH}`)
    process.exit(1)
  }
  
  console.log('🔍 Diagnosing email matching issues...\n')
  console.log(`📄 CSV file: ${CSV_FILE_PATH}\n`)
  
  // Parse CSV
  const gradeEmails = parseCSVFile(CSV_FILE_PATH)
  
  // Get all students from Firebase for reference
  console.log('📚 Loading all students from Firebase...')
  const allStudents = []
  const studentsSnapshot = await db.collection('students').get()
  studentsSnapshot.forEach(doc => {
    const data = doc.data()
    allStudents.push({
      id: doc.id,
      firstName: data.personalInfo?.firstName || '',
      lastName: data.personalInfo?.lastName || '',
      fullName: `${data.personalInfo?.firstName || ''} ${data.personalInfo?.lastName || ''}`.trim(),
      grade: normalizeName(data.schooling?.program || data.program || ''),
      email: data.contact?.email || ''
    })
  })
  console.log(`✅ Loaded ${allStudents.length} students from Firebase\n`)
  
  // Analyze each skipped email
  const diagnostics = []
  
  for (const [grade, emails] of Object.entries(gradeEmails)) {
    console.log(`\n🔍 Analyzing ${grade} (${emails.length} emails)...`)
    
    for (const email of emails) {
      const result = await findPotentialMatches(email, grade)
      
      if (result.error) {
        diagnostics.push({
          email,
          grade,
          issue: result.error,
          suggestions: []
        })
        continue
      }
      
      if (result.matches.length === 0) {
        // No matches at all - check if name exists in different grade
        const nameParts = extractNameFromEmail(email)
        const nameOnlyMatches = allStudents.filter(s => {
          const firstNameMatch = normalizeName(s.firstName).includes(nameParts.firstName) || 
                                nameParts.firstName.includes(normalizeName(s.firstName))
          const lastNameMatch = normalizeName(s.lastName).includes(nameParts.lastName) || 
                               nameParts.lastName.includes(normalizeName(s.lastName))
          return firstNameMatch && lastNameMatch
        })
        
        diagnostics.push({
          email,
          grade,
          emailFirstName: nameParts.firstName,
          emailLastName: nameParts.lastName,
          expectedGrade: grade,
          issue: 'No matches found',
          nameOnlyMatches: nameOnlyMatches.map(m => ({
            id: m.id,
            name: m.fullName,
            grade: m.grade,
            existingEmail: m.email
          })),
          suggestions: nameOnlyMatches.length > 0 
            ? [`Found ${nameOnlyMatches.length} student(s) with matching name but different grade(s): ${nameOnlyMatches.map(m => `${m.fullName} (${m.grade})`).join(', ')}`]
            : ['Student may not exist in Firebase, or name spelling is different']
        })
      } else {
        // Has matches but wasn't matched - analyze why
        const bestMatch = result.matches[0]
        const issues = []
        
        if (!bestMatch.gradeMatches) {
          issues.push(`Grade mismatch: Expected ${grade}, but student is in ${bestMatch.grade}`)
        }
        
        if (bestMatch.score < 4) {
          issues.push(`Name match is partial: firstName=${bestMatch.firstName.includes(result.emailFirstName) ? '✓' : '✗'}, lastName=${bestMatch.lastName.includes(result.emailLastName) ? '✓' : '✗'}`)
        }
        
        diagnostics.push({
          email,
          grade,
          emailFirstName: result.emailFirstName,
          emailLastName: result.emailLastName,
          expectedGrade: grade,
          issue: 'Match found but not used',
          bestMatch: {
            id: bestMatch.id,
            name: bestMatch.fullName,
            grade: bestMatch.grade,
            score: bestMatch.score,
            existingEmail: bestMatch.existingEmail
          },
          allMatches: result.matches.slice(0, 5).map(m => ({
            id: m.id,
            name: m.fullName,
            grade: m.grade,
            score: m.score
          })),
          issues,
          suggestions: [
            bestMatch.gradeMatches 
              ? 'Match should work - check if grade filtering is too strict'
              : `Student exists but in grade "${bestMatch.grade}" instead of "${grade}"`
          ]
        })
      }
    }
  }
  
  // Print diagnostics
  console.log('\n' + '='.repeat(80))
  console.log('📊 DIAGNOSTIC RESULTS')
  console.log('='.repeat(80))
  
  const noMatches = diagnostics.filter(d => d.issue === 'No matches found' && (!d.nameOnlyMatches || d.nameOnlyMatches.length === 0))
  const wrongGrade = diagnostics.filter(d => d.bestMatch && !d.bestMatch.gradeMatches)
  const nameVariations = diagnostics.filter(d => d.nameOnlyMatches && d.nameOnlyMatches.length > 0)
  
  console.log(`\n❌ No matches at all: ${noMatches.length}`)
  console.log(`⚠️  Wrong grade: ${wrongGrade.length}`)
  console.log(`🔍 Name variations found: ${nameVariations.length}`)
  
  if (noMatches.length > 0) {
    console.log('\n❌ Students with NO matches:')
    noMatches.forEach(d => {
      console.log(`\n  📧 ${d.email}`)
      console.log(`     Looking for: ${d.emailFirstName} ${d.emailLastName} in ${d.expectedGrade}`)
      if (d.suggestions.length > 0) {
        console.log(`     💡 ${d.suggestions[0]}`)
      }
    })
  }
  
  if (wrongGrade.length > 0) {
    console.log('\n⚠️  Students found but in WRONG GRADE:')
    wrongGrade.forEach(d => {
      console.log(`\n  📧 ${d.email}`)
      console.log(`     Expected: ${d.emailFirstName} ${d.emailLastName} in ${d.expectedGrade}`)
      console.log(`     Found: ${d.bestMatch.name} (${d.bestMatch.id}) in ${d.bestMatch.grade}`)
      console.log(`     💡 Suggestion: Update grade filter or manually match`)
    })
  }
  
  if (nameVariations.length > 0) {
    console.log('\n🔍 Students with NAME VARIATIONS (found in different grades):')
    nameVariations.forEach(d => {
      console.log(`\n  📧 ${d.email}`)
      console.log(`     Looking for: ${d.emailFirstName} ${d.emailLastName} in ${d.expectedGrade}`)
      console.log(`     Found in other grades:`)
      d.nameOnlyMatches.forEach(m => {
        console.log(`       • ${m.name} (${m.id}) - Grade: ${m.grade} - Email: ${m.existingEmail || 'none'}`)
      })
    })
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, `email-match-diagnostics-${Date.now()}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(diagnostics, null, 2))
  console.log(`\n💾 Detailed diagnostics saved to: ${reportPath}`)
  
  process.exit(0)
}

main().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

