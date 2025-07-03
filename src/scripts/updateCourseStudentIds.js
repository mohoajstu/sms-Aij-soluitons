const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')

// Initialize Firebase Admin SDK
try {
  const serviceAccount = require('./serviceAccountKey.json')
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
  console.log('🔥 Firebase Admin SDK initialized successfully.')
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK.')
  console.error('Please make sure serviceAccountKey.json is present in the /scripts directory.')
  process.exit(1)
}

const db = admin.firestore()
const studentReportPath = path.join(__dirname, 'studentReport.xlsx - Sheet.csv')

const readStudentData = () => {
  return new Promise((resolve, reject) => {
    const studentNameToIdMap = new Map()
    let hasLoggedHeaders = false // Flag to log only once
    fs.createReadStream(studentReportPath)
      .pipe(csv())
      .on('data', (row) => {
        // Log the headers of the first row for debugging
        if (!hasLoggedHeaders) {
          console.log('CSV Headers Found:', Object.keys(row))
          hasLoggedHeaders = true
        }

        const firstName = row['First Name']
        const lastName = row['Last Name']
        const studentId = row['SchoolID']
        if (firstName && lastName && studentId) {
          const fullName = `${firstName.trim()} ${lastName.trim()}`
          studentNameToIdMap.set(fullName.toLowerCase(), studentId)
        }
      })
      .on('end', () => {
        console.log(`✅ Finished reading student report. Found ${studentNameToIdMap.size} students.`)
        resolve(studentNameToIdMap)
      })
      .on('error', (error) => {
        reject(error)
      })
  })
}

const updateCourseStudentIds = async (studentNameToIdMap) => {
  console.log('Fetching courses from Firestore...')
  const coursesRef = db.collection('courses')
  const snapshot = await coursesRef.get()

  if (snapshot.empty) {
    console.log('No courses found.')
    return
  }

  let coursesUpdated = 0
  const updatePromises = []

  snapshot.forEach((doc) => {
    const course = doc.data()
    let studentsModified = false

    if (course.students && Array.isArray(course.students)) {
      const updatedStudents = course.students.map((student) => {
        if (student.name && !student.id) {
          const studentId = studentNameToIdMap.get(student.name.toLowerCase())
          if (studentId) {
            studentsModified = true
            return {
              ...student,
              id: studentId,
            }
          }
        }
        return student
      })

      if (studentsModified) {
        coursesUpdated++
        const courseDocRef = coursesRef.doc(doc.id)
        updatePromises.push(courseDocRef.update({ students: updatedStudents }))
        console.log(`- Preparing update for course: ${course.title || doc.id}`)
      }
    }
  })

  if (updatePromises.length > 0) {
    console.log(`\n🔄 Updating ${coursesUpdated} courses in Firestore...`)
    await Promise.all(updatePromises)
    console.log(`\n🎉 Successfully updated ${coursesUpdated} courses.`)
  } else {
    console.log('\nNo courses required updates.')
  }
}

const main = async () => {
  try {
    const studentNameToIdMap = await readStudentData()
    if (studentNameToIdMap.size > 0) {
      await updateCourseStudentIds(studentNameToIdMap)
    }
  } catch (error) {
    console.error('An error occurred during the script execution:', error)
  }
}

main() 