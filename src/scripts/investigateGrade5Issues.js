const fs = require('fs')
const path = require('path')
const admin = require('firebase-admin')

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json')
const serviceAccount = require(serviceAccountPath)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
})

const db = admin.firestore()

const getLatestFormData = (draftData) => {
  const versions = Array.isArray(draftData?.versions) ? draftData.versions : []
  if (versions.length > 0) {
    const sorted = [...versions].sort((a, b) => {
      const aTime = new Date(a.savedAt || 0).getTime()
      const bTime = new Date(b.savedAt || 0).getTime()
      return aTime - bTime
    })
    return sorted[sorted.length - 1].formData || draftData.formData || {}
  }
  return draftData?.formData || {}
}

const run = async () => {
  // Check courses for grade 5 homeroom
  const coursesSnap = await db.collection('courses').get()
  const grade5Courses = []
  coursesSnap.forEach((d) => {
    const data = d.data()
    const name = (data.name || data.title || '').toLowerCase()
    const grade = (data.grade || data.gradeLevel || '').toString().toLowerCase()
    if (
      (grade === '5' || /grade\s*5/i.test(grade) || name.includes('5')) &&
      (name.includes('homeroom') || name.includes('home room') || grade === '5')
    ) {
      grade5Courses.push({
        id: d.id,
        name: data.name || data.title,
        grade: data.grade || data.gradeLevel,
        archived: data.archived,
        teacher: data.teacher,
        teachers: data.teachers,
      })
    }
  })
  console.log('\n=== Grade 5 homeroom courses ===')
  console.log(JSON.stringify(grade5Courses, null, 2))

  // Check grade 5 report card drafts
  const draftsSnap = await db.collection('reportCardDrafts').get()
  console.log(`\nTotal drafts: ${draftsSnap.size}`)

  const grade5Term2 = []
  draftsSnap.forEach((d) => {
    const data = d.data()
    const formData = getLatestFormData(data)
    const grade = (formData.grade || data.grade || '').toString()
    const studentName = data.studentName || formData.student_name || formData.student || ''

    if (
      (/^5$/.test(grade.trim()) || /grade\s*5/i.test(grade)) &&
      data.reportCardType === '1-6-report-card' &&
      data.term === 'term2'
    ) {
      grade5Term2.push({
        id: d.id,
        studentName,
        teacher: formData.teacher || formData.teacher_name || '',
        teacherSignature: formData.teacherSignature || '',
        versionsCount: (data.versions || []).length,
      })
    }
  })

  console.log('\n=== Grade 5 term2 report card teacher info ===')
  console.log(JSON.stringify(grade5Term2, null, 2))
}

run().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
