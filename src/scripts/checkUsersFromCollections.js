const path = require('path')
const { initializeApp } = require('firebase/app')
const {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} = require('firebase/firestore')

require('dotenv').config({ path: path.join(__dirname, '../../.env') })

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const argv = process.argv.slice(2)
const shouldFix = argv.includes('--fix')

function requireString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function requireBool(value) {
  return typeof value === 'boolean'
}

function requireNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

async function checkCollectionUsers(collectionName) {
  const snap = await getDocs(collection(db, collectionName))
  const issues = []
  let created = 0
  let updated = 0

  for (const docSnap of snap.docs) {
    const tarbiyahId = docSnap.id
    const src = docSnap.data() || {}

    const userRef = doc(db, 'users', tarbiyahId)
    const userSnap = await getDoc(userRef)
    const exists = userSnap.exists()
    const user = userSnap.data() || {}

    const problems = []

    // Presence/type checks per schema
    if (!requireBool(user.active)) problems.push('active missing/not boolean')
    if (!user.createdAt) problems.push('createdAt missing')
    if (typeof user.dashboard !== 'object') problems.push('dashboard missing/not map')
    if (!requireString(user.theme)) problems.push('theme missing/not string')
    if (!requireString(user.linkedCollection)) problems.push('linkedCollection missing')
    if (!user.personalInfo || typeof user.personalInfo !== 'object') {
      problems.push('personalInfo missing')
    } else {
      if (!requireString(user.personalInfo.firstName)) problems.push('personalInfo.firstName missing')
      if (!requireString(user.personalInfo.lastName)) problems.push('personalInfo.lastName missing')
      if (!requireString(user.personalInfo.role)) problems.push('personalInfo.role missing')
    }
    if (!user.stats || typeof user.stats !== 'object') {
      problems.push('stats missing')
    } else {
      if (!(user.stats.lastLoginAt === null || !!user.stats.lastLoginAt)) {
        problems.push('stats.lastLoginAt missing/null')
      }
      if (!requireNumber(user.stats.loginCount)) problems.push('stats.loginCount missing/not number')
    }
    if (user.tarbiyaId || user.tarbiyahId === undefined) {
      // Note: prefer tarbiyahId exact key
      problems.push('tarbiyahId missing/wrong key')
    }

    if (!exists || problems.length > 0) {
      issues.push({ id: tarbiyahId, exists, problems })
      if (shouldFix) {
        const firstName = src.personalInfo?.firstName || ''
        const lastName = src.personalInfo?.lastName || ''
        const role = collectionName === 'faculty' ? 'Faculty' : (src.primaryRole || 'Admin')
        const active = typeof src.active === 'boolean' ? src.active : true

        const patch = {
          active,
          createdAt: user.createdAt || serverTimestamp(),
          dashboard: user.dashboard || {},
          theme: user.theme || 'default',
          linkedCollection: user.linkedCollection || collectionName,
          personalInfo: {
            firstName: user.personalInfo?.firstName || firstName,
            lastName: user.personalInfo?.lastName || lastName,
            role: user.personalInfo?.role || role,
          },
          stats: {
            lastLoginAt: user.stats?.lastLoginAt ?? null,
            loginCount: user.stats?.loginCount ?? 0,
          },
          tarbiyahId,
        }

        await setDoc(userRef, patch, { merge: true })
        if (!exists) created++
        else updated++
      }
    }
  }

  return { collectionName, total: snap.size, issues, created, updated }
}

;(async () => {
  console.log('🔎 Checking users against collections: admins, faculty')
  const results = []
  results.push(await checkCollectionUsers('admins'))
  results.push(await checkCollectionUsers('faculty'))

  for (const r of results) {
    console.log(`\nCollection: ${r.collectionName}`)
    console.log(`  Total: ${r.total}`)
    console.log(`  With issues: ${r.issues.length}`)
    if (shouldFix) {
      console.log(`  Created: ${r.created}  Updated: ${r.updated}`)
    }
    for (const issue of r.issues.slice(0, 20)) {
      console.log(`   - ${issue.id}: ${issue.exists ? 'exists' : 'missing'} -> ${issue.problems.join(', ')}`)
    }
    if (r.issues.length > 20) console.log(`   ... and ${r.issues.length - 20} more`)
  }

  const totalIssues = results.reduce((n, r) => n + r.issues.length, 0)
  if (totalIssues > 0 && !shouldFix) {
    console.log('\nRun with --fix to create/merge missing users and fields.')
    process.exit(1)
  }
  console.log('\n✅ Check complete.')
})().catch((e) => {
  console.error('❌ Check failed:', e)
  process.exit(1)
}) 