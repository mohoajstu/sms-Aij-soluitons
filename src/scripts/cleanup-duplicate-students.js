// Script to clean up duplicate students in the students collection
// This script identifies duplicates based on name matching and keeps the oldest record
// Run with: node src/scripts/cleanup-duplicate-students.js

const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

// Initialize Firebase Admin with service account
const serviceAccount = require('./serviceAccountKey.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// Configuration
const DRY_RUN = false // Set to false to actually delete duplicates
const MIN_CONFIDENCE_THRESHOLD = 100 // Only consider 100% exact matches as duplicates
const PROBLEM_DATE = new Date('2024-09-04') // Remove duplicates created on this date

// Helper function to normalize names for comparison
function normalizeName(name) {
  if (!name) return ''
  return name.toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s]/g, '') // Remove special characters except spaces
}

// Helper function to calculate name similarity (Levenshtein distance)
function calculateNameSimilarity(name1, name2) {
  const normalized1 = normalizeName(name1)
  const normalized2 = normalizeName(name2)
  
  if (normalized1 === normalized2) return 100
  
  const len1 = normalized1.length
  const len2 = normalized2.length
  
  if (len1 === 0) return len2 === 0 ? 100 : 0
  if (len2 === 0) return 0
  
  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null))
  
  for (let i = 0; i <= len1; i++) matrix[0][i] = i
  for (let j = 0; j <= len2; j++) matrix[j][0] = j
  
  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const cost = normalized1[i - 1] === normalized2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + cost // substitution
      )
    }
  }
  
  const distance = matrix[len2][len1]
  const maxLen = Math.max(len1, len2)
  return Math.round(((maxLen - distance) / maxLen) * 100)
}

// Helper function to extract student name from different field structures
function extractStudentName(studentData) {
  // Try different field structures
  if (studentData.personalInfo?.name) {
    return studentData.personalInfo.name
  }
  
  if (studentData.personalInfo?.firstName && studentData.personalInfo?.lastName) {
    return `${studentData.personalInfo.firstName} ${studentData.personalInfo.lastName}`.trim()
  }
  
  if (studentData.firstName && studentData.lastName) {
    return `${studentData.firstName} ${studentData.lastName}`.trim()
  }
  
  if (studentData.name) {
    return studentData.name
  }
  
  return 'Unknown'
}

// Helper function to get creation date from student data
function getCreationDate(studentData) {
  // Try different timestamp fields
  if (studentData.createdAt) {
    return studentData.createdAt.toDate ? studentData.createdAt.toDate() : new Date(studentData.createdAt)
  }
  
  if (studentData.timestamps?.createdAt) {
    return studentData.timestamps.createdAt.toDate ? studentData.timestamps.createdAt.toDate() : new Date(studentData.timestamps.createdAt)
  }
  
  // If no creation date, use a very old date to prioritize records with dates
  return new Date('1900-01-01')
}

// Helper function to check if a date is on the problem date (September 4th, 2024)
function isProblemDate(date) {
  const problemDate = new Date(PROBLEM_DATE)
  const checkDate = new Date(date)
  
  return checkDate.getFullYear() === problemDate.getFullYear() &&
         checkDate.getMonth() === problemDate.getMonth() &&
         checkDate.getDate() === problemDate.getDate()
}

// Helper function to find duplicate students
async function findDuplicateStudents() {
  console.log('🔍 Scanning students collection for duplicates...')
  
  const studentsSnapshot = await db.collection('students').get()
  const students = []
  
  // Collect all students with their data
  studentsSnapshot.docs.forEach(doc => {
    const data = doc.data()
    const name = extractStudentName(data)
    const createdAt = getCreationDate(data)
    
    students.push({
      id: doc.id,
      name: name,
      fullName: name,
      createdAt: createdAt,
      data: data,
      doc: doc
    })
  })
  
  console.log(`📊 Found ${students.length} students in collection`)
  
  // Group students by similar names
  const duplicateGroups = []
  const processed = new Set()
  
  for (let i = 0; i < students.length; i++) {
    if (processed.has(students[i].id)) continue
    
    const currentStudent = students[i]
    const similarStudents = [currentStudent]
    processed.add(currentStudent.id)
    
    // Find similar students
    for (let j = i + 1; j < students.length; j++) {
      if (processed.has(students[j].id)) continue
      
      const otherStudent = students[j]
      const similarity = calculateNameSimilarity(currentStudent.name, otherStudent.name)
      
      if (similarity >= MIN_CONFIDENCE_THRESHOLD) {
        similarStudents.push(otherStudent)
        processed.add(otherStudent.id)
        console.log(`🎯 Found exact duplicate: "${currentStudent.name}" (${currentStudent.id}) and "${otherStudent.name}" (${otherStudent.id}) - ${similarity}% similarity`)
      }
    }
    
    // Only add groups with more than one student
    if (similarStudents.length > 1) {
      duplicateGroups.push(similarStudents)
    }
  }
  
  return duplicateGroups
}

// Helper function to analyze duplicate groups
function analyzeDuplicateGroups(duplicateGroups) {
  console.log(`\n📊 Duplicate Analysis:`)
  console.log(`   🔍 Found ${duplicateGroups.length} groups of potential duplicates`)
  
  let totalDuplicates = 0
  let totalToKeep = 0
  let totalToDelete = 0
  
  duplicateGroups.forEach((group, index) => {
    console.log(`\n📋 Group ${index + 1}: ${group.length} students`)
    
    // Sort by creation date (oldest first)
    group.sort((a, b) => a.createdAt - b.createdAt)
    
    // Special handling for September 4th duplicates
    const problemDateStudents = group.filter(student => isProblemDate(student.createdAt))
    const nonProblemDateStudents = group.filter(student => !isProblemDate(student.createdAt))
    
    let toKeep, toDelete
    
    if (problemDateStudents.length > 0 && nonProblemDateStudents.length > 0) {
      // If we have both problem date and non-problem date students, keep the non-problem date ones
      toKeep = nonProblemDateStudents[0] // Oldest non-problem date
      toDelete = [...problemDateStudents, ...nonProblemDateStudents.slice(1)]
      console.log(`   🚨 Special case: Found students from problem date (Sept 4th) - keeping non-problem date student`)
    } else if (problemDateStudents.length > 0) {
      // If all students are from problem date, keep the oldest
      toKeep = problemDateStudents[0]
      toDelete = problemDateStudents.slice(1)
      console.log(`   ⚠️  All students from problem date (Sept 4th) - keeping oldest`)
    } else {
      // Normal case: keep oldest
      toKeep = group[0]
      toDelete = group.slice(1)
    }
    
    totalToKeep++
    totalToDelete += toDelete.length
    totalDuplicates += group.length
    
    const keepDateFlag = isProblemDate(toKeep.createdAt) ? ' 🚨' : ''
    console.log(`   ✅ KEEP: ${toKeep.name} (${toKeep.id}) - Created: ${toKeep.createdAt.toISOString()}${keepDateFlag}`)
    
    toDelete.forEach(student => {
      const deleteDateFlag = isProblemDate(student.createdAt) ? ' 🚨' : ''
      console.log(`   ❌ DELETE: ${student.name} (${student.id}) - Created: ${student.createdAt.toISOString()}${deleteDateFlag}`)
    })
  })
  
  console.log(`\n📈 Summary:`)
  console.log(`   📊 Total students in duplicate groups: ${totalDuplicates}`)
  console.log(`   ✅ Students to keep: ${totalToKeep}`)
  console.log(`   ❌ Students to delete: ${totalToDelete}`)
  
  return { duplicateGroups, totalToKeep, totalToDelete }
}

// Helper function to delete duplicate students
async function deleteDuplicateStudents(duplicateGroups) {
  if (DRY_RUN) {
    console.log(`\n🧪 DRY RUN MODE - No actual deletions will be performed`)
    console.log(`   To perform actual deletions, set DRY_RUN = false in the script`)
    return
  }
  
  console.log(`\n🗑️  Starting deletion of duplicate students...`)
  
  let deletedCount = 0
  let errorCount = 0
  
  for (let groupIndex = 0; groupIndex < duplicateGroups.length; groupIndex++) {
    const group = duplicateGroups[groupIndex]
    
    // Sort by creation date (oldest first)
    group.sort((a, b) => a.createdAt - b.createdAt)
    
    // Special handling for September 4th duplicates
    const problemDateStudents = group.filter(student => isProblemDate(student.createdAt))
    const nonProblemDateStudents = group.filter(student => !isProblemDate(student.createdAt))
    
    let toKeep, toDelete
    
    if (problemDateStudents.length > 0 && nonProblemDateStudents.length > 0) {
      // If we have both problem date and non-problem date students, keep the non-problem date ones
      toKeep = nonProblemDateStudents[0] // Oldest non-problem date
      toDelete = [...problemDateStudents, ...nonProblemDateStudents.slice(1)]
    } else if (problemDateStudents.length > 0) {
      // If all students are from problem date, keep the oldest
      toKeep = problemDateStudents[0]
      toDelete = problemDateStudents.slice(1)
    } else {
      // Normal case: keep oldest
      toKeep = group[0]
      toDelete = group.slice(1)
    }
    
    console.log(`\n📋 Processing Group ${groupIndex + 1}: Keeping "${toKeep.name}" (${toKeep.id})`)
    
    for (const student of toDelete) {
      try {
        console.log(`   🗑️  Deleting: ${student.name} (${student.id})`)
        
        // Delete from students collection
        await db.collection('students').doc(student.id).delete()
        
        // Also delete from users collection if it exists
        const userDoc = await db.collection('users').doc(student.id).get()
        if (userDoc.exists) {
          await db.collection('users').doc(student.id).delete()
          console.log(`     ✅ Deleted from users collection`)
        }
        
        deletedCount++
        console.log(`     ✅ Successfully deleted ${student.name} (${student.id})`)
        
      } catch (error) {
        errorCount++
        console.error(`     ❌ Error deleting ${student.name} (${student.id}):`, error.message)
      }
    }
  }
  
  console.log(`\n📊 Deletion Summary:`)
  console.log(`   ✅ Successfully deleted: ${deletedCount} students`)
  console.log(`   ❌ Errors: ${errorCount} students`)
}

// Helper function to verify cleanup results
async function verifyCleanupResults() {
  console.log(`\n🔍 Verifying cleanup results...`)
  
  const studentsSnapshot = await db.collection('students').get()
  const students = []
  
  studentsSnapshot.docs.forEach(doc => {
    const data = doc.data()
    const name = extractStudentName(data)
    students.push({ id: doc.id, name: name })
  })
  
  console.log(`📊 Remaining students: ${students.length}`)
  
  // Check for any remaining duplicates
  const remainingDuplicates = []
  const processed = new Set()
  
  for (let i = 0; i < students.length; i++) {
    if (processed.has(students[i].id)) continue
    
    const currentStudent = students[i]
    const similarStudents = [currentStudent]
    processed.add(currentStudent.id)
    
    for (let j = i + 1; j < students.length; j++) {
      if (processed.has(students[j].id)) continue
      
      const otherStudent = students[j]
      const similarity = calculateNameSimilarity(currentStudent.name, otherStudent.name)
      
      if (similarity >= MIN_CONFIDENCE_THRESHOLD) {
        similarStudents.push(otherStudent)
        processed.add(otherStudent.id)
      }
    }
    
    if (similarStudents.length > 1) {
      remainingDuplicates.push(similarStudents)
    }
  }
  
  if (remainingDuplicates.length > 0) {
    console.log(`⚠️  Found ${remainingDuplicates.length} remaining duplicate groups:`)
    remainingDuplicates.forEach((group, index) => {
      console.log(`   Group ${index + 1}: ${group.map(s => `${s.name} (${s.id})`).join(', ')}`)
    })
  } else {
    console.log(`✅ No remaining duplicates found!`)
  }
}

// Main cleanup function
async function cleanupDuplicateStudents() {
  try {
    console.log('🧹 Starting duplicate student cleanup...')
    console.log(`📍 Project: ${serviceAccount.project_id}`)
    console.log(`🎯 Only detecting 100% exact name matches`)
    console.log(`🚨 Special handling for duplicates created on September 4th, 2024`)
    console.log(`🧪 Dry run mode: ${DRY_RUN}`)
    
    // Test connection
    console.log('\n🔍 Testing Firestore connection...')
    const testQuery = await db.collection('students').limit(1).get()
    console.log('✅ Firestore connection successful!')
    
    // Find duplicate students
    const duplicateGroups = await findDuplicateStudents()
    
    if (duplicateGroups.length === 0) {
      console.log('\n✅ No duplicate students found!')
      return
    }
    
    // Analyze duplicates
    const analysis = analyzeDuplicateGroups(duplicateGroups)
    
    // Ask for confirmation before deletion
    if (!DRY_RUN) {
      console.log(`\n⚠️  WARNING: This will delete ${analysis.totalToDelete} duplicate students!`)
      console.log(`   This action cannot be undone.`)
      console.log(`   Make sure you have a backup of your data.`)
      
      // Add a delay to let user read the warning
      console.log('\n⏳ Proceeding with deletion in 5 seconds...')
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
    
    // Delete duplicates
    await deleteDuplicateStudents(duplicateGroups)
    
    // Verify results
    await verifyCleanupResults()
    
    console.log('\n🎉 Duplicate cleanup completed successfully!')
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupDuplicateStudents()
    .then(() => {
      console.log('\n✅ Cleanup completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Cleanup failed:', error)
      process.exit(1)
    })
}

module.exports = { cleanupDuplicateStudents }
