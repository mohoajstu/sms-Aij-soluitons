/**
 * READ-ONLY account audit — incident response for the 2026-08-10 exposure.
 *
 * Two things made unauthorized access possible:
 *   1. Firestore rules allowed anonymous read/write of everything (leaves no
 *      trace unless Data Access audit logs were enabled — they are off by
 *      default in GCP).
 *   2. The public /register form let anyone self-assign role "admin". This one
 *      DOES leave a trace: a Firebase Auth account plus a users/{uid} doc.
 *
 * This script looks for (2). It writes nothing and changes nothing.
 *
 * Usage:  node src/scripts/auditAccounts.js
 * Needs:  src/scripts/serviceAccountKey.json (gitignored, already present)
 */

const path = require('path')
const admin = require('firebase-admin')

const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'))

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })

const auth = admin.auth()
const db = admin.firestore()

// The catch-all rule became `if true` in commit 14196e2 on this date. Accounts
// created on or after it fall inside the exposure window.
const EXPOSURE_START = new Date('2025-11-19T00:00:00Z')

const PRIVILEGED = ['admin', 'schooladmin', 'school_admin', 'faculty', 'teacher']

function rolesOf(data) {
  if (!data) return []
  const p = data.personalInfo || {}
  return [data.role, data.primaryRole, p.role, p.primaryRole]
    .filter(Boolean)
    .map((r) => String(r).toLowerCase())
}

async function listAllAuthUsers() {
  const all = []
  let pageToken
  do {
    const res = await auth.listUsers(1000, pageToken)
    all.push(...res.users)
    pageToken = res.pageToken
  } while (pageToken)
  return all
}

async function main() {
  console.log('Reading Firebase Auth accounts...')
  const users = await listAllAuthUsers()
  console.log(`  ${users.length} accounts\n`)

  const rows = []
  for (const u of users) {
    const snap = await db.collection('users').doc(u.uid).get()
    const data = snap.exists ? snap.data() : null
    const roles = rolesOf(data)
    rows.push({
      uid: u.uid,
      email: u.email || '(no email)',
      created: new Date(u.metadata.creationTime),
      lastSignIn: u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime) : null,
      roles,
      privileged: roles.some((r) => PRIVILEGED.includes(r)),
      hasUserDoc: snap.exists,
    })
  }

  const fmt = (d) => (d ? d.toISOString().slice(0, 16).replace('T', ' ') : 'never')
  const line = (r) =>
    `  ${fmt(r.created)}  ${fmt(r.lastSignIn).padEnd(16)}  ${(r.roles.join('/') || '(none)').padEnd(14)}  ${r.email}`

  const privileged = rows.filter((r) => r.privileged).sort((a, b) => a.created - b.created)
  console.log(`=== PRIVILEGED ACCOUNTS (${privileged.length}) ===`)
  console.log('  created           last sign-in      role            email')
  privileged.forEach((r) => console.log(line(r)))

  const suspect = privileged.filter((r) => r.created >= EXPOSURE_START)
  console.log(`\n=== PRIVILEGED ACCOUNTS CREATED INSIDE THE EXPOSURE WINDOW (${suspect.length}) ===`)
  console.log(`(on/after ${EXPOSURE_START.toISOString().slice(0, 10)} — review every one of these by hand)`)
  if (suspect.length === 0) {
    console.log('  none')
  } else {
    suspect.forEach((r) => console.log(line(r)))
  }

  const orphans = rows.filter((r) => !r.hasUserDoc)
  console.log(`\n=== AUTH ACCOUNTS WITH NO users/ DOC (${orphans.length}) ===`)
  console.log('(created an account but never completed signup — or probed the system)')
  orphans
    .sort((a, b) => a.created - b.created)
    .forEach((r) => console.log(line(r)))

  const recent = rows
    .filter((r) => r.created >= EXPOSURE_START)
    .sort((a, b) => a.created - b.created)
  console.log(`\n=== ALL ACCOUNTS CREATED INSIDE THE EXPOSURE WINDOW (${recent.length}) ===`)
  recent.forEach((r) => console.log(line(r)))

  console.log(
    '\nNOTE: a clean result here does NOT mean no data was taken. The anonymous\n' +
      'read path required no account at all and, without Data Access audit logs,\n' +
      'left no record. Absence of evidence is not evidence of absence.',
  )

  await admin.app().delete()
}

main().catch((err) => {
  console.error('Audit failed:', err.message)
  process.exit(1)
})
