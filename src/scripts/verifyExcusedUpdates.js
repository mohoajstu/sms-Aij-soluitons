/*
  Verify that "Excused" attendance records were updated correctly
  
  This script checks:
  1. How many "Excused" records still exist (should be 0 or very few)
  2. How many "Late" and "Absent" records exist that were previously "Excused"
  3. Shows sample records to verify the updates
  
  Usage:
  node src/scripts/verifyExcusedUpdates.js
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

async function verifyUpdates() {
  console.log('🔍 Verifying attendance record updates...\n')

  const attendanceRef = db.collection('attendance')
  const snapshot = await attendanceRef.get()

  console.log(`📄 Found ${snapshot.size} attendance documents\n`)

  let totalExcused = 0
  let totalLate = 0
  let totalAbsent = 0
  let totalPresent = 0
  let excusedRecords = []
  let lateRecords = []
  let absentRecords = []

  snapshot.forEach((docSnap) => {
    const dateId = docSnap.id
    const dailyData = docSnap.data() || {}
    const courses = dailyData.courses || []

    courses.forEach((course) => {
      const students = course.students || []
      const courseTitle = course.courseTitle || 'Unknown'

      students.forEach((student) => {
        const status = student.status || 'Unknown'
        const studentName = student.studentName || 'Unknown'
        const studentId = student.studentId || 'Unknown'
        const note = student.note || ''

        const record = {
          date: dateId,
          class: courseTitle,
          student: studentName,
          studentId: studentId,
          status: status,
          note: note,
        }

        switch (status) {
          case 'Excused':
            totalExcused++
            excusedRecords.push(record)
            break
          case 'Late':
            totalLate++
            if (lateRecords.length < 10) {
              lateRecords.push(record)
            }
            break
          case 'Absent':
            totalAbsent++
            if (absentRecords.length < 10) {
              absentRecords.push(record)
            }
            break
          case 'Present':
            totalPresent++
            break
        }
      })
    })
  })

  console.log('📊 Current Status Summary:')
  console.log(`   • Present: ${totalPresent}`)
  console.log(`   • Late: ${totalLate}`)
  console.log(`   • Absent: ${totalAbsent}`)
  console.log(`   • Excused: ${totalExcused} ⚠️\n`)

  if (totalExcused > 0) {
    console.log(`⚠️  Found ${totalExcused} "Excused" records still in the database:`)
    excusedRecords.forEach((record, index) => {
      console.log(
        `   ${index + 1}. ${record.date} | ${record.class} | ${record.student} (${record.studentId}) | Note: "${record.note || '(no note)'}"`,
      )
    })
    console.log()
  } else {
    console.log('✅ No "Excused" records found - all have been updated!\n')
  }

  if (lateRecords.length > 0) {
    console.log(`📋 Sample "Late" records (showing ${lateRecords.length} of ${totalLate}):`)
    lateRecords.forEach((record, index) => {
      console.log(
        `   ${index + 1}. ${record.date} | ${record.class} | ${record.student} (${record.studentId}) | Note: "${record.note || '(no note)'}"`,
      )
    })
    console.log()
  }

  if (absentRecords.length > 0) {
    console.log(`📋 Sample "Absent" records (showing ${absentRecords.length} of ${totalAbsent}):`)
    absentRecords.forEach((record, index) => {
      console.log(
        `   ${index + 1}. ${record.date} | ${record.class} | ${record.student} (${record.studentId}) | Note: "${record.note || '(no note)'}"`,
      )
    })
    console.log()
  }

  // Check specific dates that were updated
  console.log('🔍 Checking specific dates from the update:')
  const checkDates = ['2025-09-22', '2025-10-14', '2025-11-04', '2025-11-14']
  let foundRecords = 0

  for (const checkDate of checkDates) {
    const dateDoc = await attendanceRef.doc(checkDate).get()
    if (dateDoc.exists) {
      const dailyData = dateDoc.data()
      const courses = dailyData.courses || []
      let dateHasExcused = false
      let dateLateCount = 0
      let dateAbsentCount = 0

      courses.forEach((course) => {
        const students = course.students || []
        students.forEach((student) => {
          if (student.status === 'Excused') {
            dateHasExcused = true
          } else if (student.status === 'Late') {
            dateLateCount++
          } else if (student.status === 'Absent') {
            dateAbsentCount++
          }
        })
      })

      if (dateHasExcused) {
        console.log(`   ⚠️  ${checkDate}: Still has "Excused" records`)
      } else {
        console.log(`   ✅ ${checkDate}: No "Excused" records (${dateLateCount} Late, ${dateAbsentCount} Absent)`)
        foundRecords++
      }
    } else {
      console.log(`   ⚠️  ${checkDate}: Document not found`)
    }
  }

  console.log()
  console.log('✅ Verification complete!')
  console.log(
    `   • If you see 0 "Excused" records, the update was successful`,
  )
  console.log(
    `   • If you see "Excused" records, they may be new records added after the update`,
  )
}

if (require.main === module) {
  verifyUpdates()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Verification failed:', err)
      process.exit(1)
    })
}

module.exports = { verifyUpdates }

