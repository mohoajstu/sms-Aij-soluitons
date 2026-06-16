const path = require('path')
const admin = require('firebase-admin')

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json')
const serviceAccount = require(serviceAccountPath)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
})

const db = admin.firestore()

const APPLICABLE_TYPES = ['1-6-report-card', '7-8-report-card']

const getNextGrade = (grade) => {
  const str = `${grade || ''}`.trim().toLowerCase()
  const num = str.match(/\d+/)
  if (num) return String(Number(num[0]) + 1)
  if (str === 'sk') return '1'
  if (str === 'jk') return 'SK'
  return null
}

const getLatestFormData = (draftData) => {
  const versions = Array.isArray(draftData?.versions) ? draftData.versions : []
  if (versions.length > 0) {
    const sorted = [...versions].sort((a, b) =>
      new Date(a.savedAt || 0).getTime() - new Date(b.savedAt || 0).getTime()
    )
    return sorted[sorted.length - 1].formData || draftData.formData || {}
  }
  return draftData?.formData || {}
}

const run = async () => {
  const snap = await db.collection('reportCardDrafts').get()
  console.log(`Total drafts: ${snap.size}`)

  const toFix = []

  snap.forEach((d) => {
    const data = d.data()
    if (!APPLICABLE_TYPES.includes(data.reportCardType)) return
    if (data.term !== 'term2') return

    const formData = getLatestFormData(data)
    if (formData.nextGrade && formData.nextGrade.toString().trim() !== '') return

    const grade = (formData.grade || data.grade || '').toString()
    const nextGrade = getNextGrade(grade)
    if (!nextGrade) return

    const studentName = data.studentName || formData.student_name || formData.student || ''
    toFix.push({ id: d.id, data, studentName, grade, nextGrade })
  })

  console.log(`\nFound ${toFix.length} drafts missing nextGrade:`)
  const byGrade = {}
  toFix.forEach(({ grade, nextGrade }) => {
    const key = `Grade ${grade} → ${nextGrade}`
    byGrade[key] = (byGrade[key] || 0) + 1
  })
  Object.entries(byGrade).forEach(([k, v]) => console.log(`  ${k}: ${v} drafts`))

  if (toFix.length === 0) {
    console.log('Nothing to fix.')
    return
  }

  const args = process.argv.slice(2)
  if (!args.includes('--apply')) {
    console.log('\nDry run — pass --apply to write changes.')
    return
  }

  let updated = 0
  for (const { id, data, nextGrade } of toFix) {
    const versions = Array.isArray(data.versions) ? data.versions : []
    const updatePayload = {}

    if (versions.length > 0) {
      const sorted = [...versions].sort((a, b) =>
        new Date(a.savedAt || 0).getTime() - new Date(b.savedAt || 0).getTime()
      )
      const latestIdx = versions.indexOf(sorted[sorted.length - 1])
      updatePayload.versions = versions.map((v, i) => {
        if (i !== latestIdx) return v
        const fd = v.formData
        if (!fd || (fd.nextGrade && fd.nextGrade.toString().trim() !== '')) return v
        return { ...v, formData: { ...fd, nextGrade } }
      })
    }

    if (data.formData && (!data.formData.nextGrade || data.formData.nextGrade.toString().trim() === '')) {
      updatePayload.formData = { ...data.formData, nextGrade }
    }

    if (Object.keys(updatePayload).length > 0) {
      await db.collection('reportCardDrafts').doc(id).update(updatePayload)
      updated++
    }
  }

  console.log(`\nDone. Updated ${updated} drafts.`)
}

run().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
