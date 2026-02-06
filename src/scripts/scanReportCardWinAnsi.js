const fs = require('fs')
const path = require('path')
const admin = require('firebase-admin')

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json')
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ serviceAccountKey.json not found at:', serviceAccountPath)
  process.exit(1)
}

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

const getOffendingChars = (value) => {
  const offenders = []
  for (const ch of value) {
    const codePoint = ch.codePointAt(0)
    if (codePoint > 0xff) {
      offenders.push({ ch, codePoint })
    }
  }
  return offenders
}

const scanFormData = (formData) => {
  const failures = []
  if (!formData || typeof formData !== 'object') return failures

  for (const [field, value] of Object.entries(formData)) {
    if (typeof value !== 'string' || value.trim() === '') continue
    const offenders = getOffendingChars(value)
    if (offenders.length > 0) {
      const unique = new Map()
      offenders.forEach(({ ch, codePoint }) => {
        unique.set(ch, codePoint)
      })
      failures.push({
        field,
        offenders: Array.from(unique.entries()).map(([ch, codePoint]) => ({
          ch,
          codePoint: `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`,
        })),
        sample: value.slice(0, 200),
      })
    }
  }

  return failures
}

const CUTOFF_DATE = new Date('2026-01-30T00:00:00-05:00')

const getDateValue = (value) => {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value.toDate === 'function') {
    try {
      return value.toDate()
    } catch (err) {
      return null
    }
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const getDraftTimestamp = (data) => {
  return (
    getDateValue(data.lastModified) ||
    getDateValue(data.createdAt) ||
    getDateValue(data.completedAt) ||
    null
  )
}

const run = async () => {
  const results = []
  let lastDoc = null
  let totalDocs = 0
  let skippedOld = 0

  console.log('🔎 Scanning reportCardDrafts for non-WinAnsi characters...')
  console.log(`📅 Only scanning drafts on/after: ${CUTOFF_DATE.toISOString()}`)

  while (true) {
    let query = db
      .collection('reportCardDrafts')
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(500)
    if (lastDoc) {
      query = query.startAfter(lastDoc)
    }
    const snap = await query.get()
    if (snap.empty) break

    for (const doc of snap.docs) {
      totalDocs += 1
      const data = doc.data()
      const draftDate = getDraftTimestamp(data)
      if (!draftDate || draftDate < CUTOFF_DATE) {
        skippedOld += 1
        continue
      }
      const formData = getLatestFormData(data)
      const failures = scanFormData(formData)
      if (failures.length > 0) {
        results.push({
          id: doc.id,
          studentName: data.studentName || formData.student_name || formData.student || '',
          reportCardType: data.reportCardType || '',
          term: data.term || '',
          teacherName: data.teacherName || '',
          failures,
        })
      }
    }

    lastDoc = snap.docs[snap.docs.length - 1]
    console.log(`...scanned ${totalDocs} drafts (${skippedOld} skipped before cutoff)`)
  }

  const outputPath = path.join(__dirname, '..', '..', 'tmp', 'reportcard-winansi-failures.json')
  const safeOutputPath = path.resolve(outputPath)
  try {
    fs.mkdirSync(path.dirname(safeOutputPath), { recursive: true })
    fs.writeFileSync(safeOutputPath, JSON.stringify({ count: results.length, results }, null, 2))
    console.log(`✅ Scan complete. Found ${results.length} draft(s) with offending chars.`)
    console.log(`📄 Output: ${safeOutputPath}`)
  } catch (err) {
    console.error('❌ Failed to write output file:', err)
  }
}

run().catch((err) => {
  console.error('❌ Scan failed:', err)
  process.exit(1)
})
