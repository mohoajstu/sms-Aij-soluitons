const path = require('path')
const admin = require('firebase-admin')

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json')
const serviceAccount = require(serviceAccountPath)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
})

const db = admin.firestore()

const OLD_TEACHER = 'Nadia Jam'
const NEW_TEACHER = 'Sara Sultan'

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

const getNextGrade = (grade) => {
  const num = `${grade || ''}`.match(/\d+/)
  if (num) return String(Number(num[0]) + 1)
  if (`${grade}`.toLowerCase() === 'sk') return '1'
  if (`${grade}`.toLowerCase() === 'jk') return 'SK'
  return null
}

const fixFormData = (formData) => {
  if (!formData) return null
  const updated = { ...formData }
  let changed = false

  if (updated.teacher === OLD_TEACHER) { updated.teacher = NEW_TEACHER; changed = true }
  if (updated.teacher_name === OLD_TEACHER) { updated.teacher_name = NEW_TEACHER; changed = true }
  if (updated.teacherSignature?.value === OLD_TEACHER) {
    updated.teacherSignature = { ...updated.teacherSignature, value: NEW_TEACHER }
    changed = true
  }

  // Also fill in nextGrade if blank
  if (!updated.nextGrade || updated.nextGrade.toString().trim() === '') {
    const next = getNextGrade(updated.grade)
    if (next) { updated.nextGrade = next; changed = true }
  }

  return changed ? updated : null
}

const run = async () => {
  const snap = await db.collection('reportCardDrafts').get()

  const toFix = []
  snap.forEach((d) => {
    const data = d.data()
    const formData = getLatestFormData(data)
    const grade = (formData.grade || data.grade || '').toString()
    const studentName = data.studentName || formData.student_name || formData.student || ''

    if (
      (/^5$/.test(grade.trim()) || /grade\s*5/i.test(grade)) &&
      data.reportCardType === '1-6-report-card' &&
      data.term === 'term2' &&
      (formData.teacher === OLD_TEACHER ||
        formData.teacher_name === OLD_TEACHER ||
        formData.teacherSignature?.value === OLD_TEACHER)
    ) {
      toFix.push({ id: d.id, data, studentName })
    }
  })

  console.log(`\nFound ${toFix.length} grade 5 term2 drafts to fix:`)
  toFix.forEach((d) => console.log(`  - ${d.studentName} (${d.id})`))

  // Also grab grade 5 term2 drafts that are missing nextGrade
  snap.forEach((d) => {
    const data = d.data()
    const formData = getLatestFormData(data)
    const grade = (formData.grade || data.grade || '').toString()

    if (
      (/^5$/.test(grade.trim()) || /grade\s*5/i.test(grade)) &&
      data.reportCardType === '1-6-report-card' &&
      data.term === 'term2' &&
      (!formData.nextGrade || formData.nextGrade.toString().trim() === '') &&
      !toFix.find((x) => x.id === d.id)
    ) {
      const studentName = data.studentName || formData.student_name || formData.student || ''
      toFix.push({ id: d.id, data, studentName })
    }
  })

  if (toFix.length === 0) {
    console.log('Nothing to fix.')
    return
  }

  // Dry run first
  const args = process.argv.slice(2)
  if (!args.includes('--apply')) {
    console.log('\nDry run — pass --apply to write changes.')
    return
  }

  let updated = 0
  for (const { id, data } of toFix) {
    const versions = Array.isArray(data.versions) ? data.versions : []

    // Update the latest version's formData
    let updatedVersions = versions
    if (versions.length > 0) {
      const sorted = [...versions].sort((a, b) =>
        new Date(a.savedAt || 0).getTime() - new Date(b.savedAt || 0).getTime()
      )
      const latestIdx = versions.indexOf(sorted[sorted.length - 1])
      updatedVersions = versions.map((v, i) => {
        if (i !== latestIdx) return v
        const fixedFormData = fixFormData(v.formData)
        return fixedFormData ? { ...v, formData: fixedFormData } : v
      })
    }

    // Update top-level formData too (some older drafts store it there)
    const topLevelFormData = fixFormData(data.formData)

    const updatePayload = {}
    if (updatedVersions !== versions) {
      updatePayload.versions = updatedVersions
    }
    if (topLevelFormData) {
      updatePayload.formData = topLevelFormData
    }

    if (Object.keys(updatePayload).length > 0) {
      await db.collection('reportCardDrafts').doc(id).update(updatePayload)
      console.log(`✅ Fixed: ${id}`)
      updated++
    }
  }

  console.log(`\nDone. Updated ${updated} drafts.`)
}

run().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
