// Script to check what courses currently exist in the database
// Run with: node src/scripts/check-existing-courses.js

const { initializeApp } = require('firebase/app')
const { getFirestore, collection, getDocs } = require('firebase/firestore')

// Firebase config - you'll need to update this with your actual config
let firebaseConfig

try {
  // Try to import from external config file
  firebaseConfig = require('./firebase-config.js')
} catch (error) {
  // Fallback to inline config - update these values with your actual Firebase config
  firebaseConfig = {
    apiKey: "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // Replace with your actual API key
    authDomain: "tarbiyah-sms.firebaseapp.com", // Replace with your actual domain
    projectId: "tarbiyah-sms", // Replace with your actual project ID
    storageBucket: "tarbiyah-sms.appspot.com", // Replace with your actual storage bucket
    messagingSenderId: "123456789", // Replace with your actual sender ID
    appId: "1:123456789:web:abcdef123456" // Replace with your actual app ID
  }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function checkExistingCourses() {
  try {
    console.log('🔍 Checking existing courses in the database...')
    
    const coursesSnapshot = await getDocs(collection(db, 'courses'))
    const courses = []
    
    coursesSnapshot.docs.forEach(doc => {
      const data = doc.data()
      courses.push({
        id: doc.id,
        courseId: data.courseId || data.courseID,
        title: data.title,
        name: data.name,
        gradeLevel: data.gradeLevel,
        subject: data.subject,
        archived: data.archived,
        teachers: data.teachers || data.teacher,
        studentCount: data.students?.length || data.enrolledList?.length || 0
      })
    })
    
    console.log(`\n📊 Found ${courses.length} total courses:`)
    console.log('='.repeat(80))
    
    // Group by grade level
    const groupedCourses = {}
    courses.forEach(course => {
      const grade = course.gradeLevel || 'Unknown'
      if (!groupedCourses[grade]) {
        groupedCourses[grade] = []
      }
      groupedCourses[grade].push(course)
    })
    
    // Display by grade level
    Object.keys(groupedCourses).sort().forEach(grade => {
      const gradeCourses = groupedCourses[grade]
      console.log(`\n📚 ${grade} (${gradeCourses.length} courses):`)
      gradeCourses.forEach(course => {
        const status = course.archived ? '📦 ARCHIVED' : '✅ ACTIVE'
        const teacherNames = Array.isArray(course.teachers) 
          ? course.teachers.map(t => typeof t === 'string' ? t : t.name || t).join(', ')
          : course.teachers || 'No teacher'
        console.log(`   ${status} ${course.title || course.name} (${course.courseId}) - ${course.studentCount} students - ${teacherNames}`)
      })
    })
    
    // Check specifically for SK courses
    console.log('\n🔍 SK Course Analysis:')
    const skCourses = courses.filter(course => 
      course.title?.toLowerCase().includes('sk') || 
      course.name?.toLowerCase().includes('sk') ||
      course.gradeLevel?.toLowerCase().includes('sk')
    )
    
    if (skCourses.length === 0) {
      console.log('❌ No SK courses found in the database')
    } else {
      console.log(`✅ Found ${skCourses.length} SK-related courses:`)
      skCourses.forEach(course => {
        const status = course.archived ? '📦 ARCHIVED' : '✅ ACTIVE'
        console.log(`   ${status} ${course.title || course.name} (${course.courseId}) - ${course.studentCount} students`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error checking courses:', error)
  }
}

// Run the check
checkExistingCourses()


