/**
 * Build /staffDirectory — the identity table the new Firestore rules depend on.
 *
 * WHY THIS EXISTS
 * Firestore rules can only look documents up BY PATH; they cannot query by
 * field. The app resolves staff by email query (src/utils/userProfile.js), and
 * staff docs are keyed by tarbiyahId, not by Firebase Auth uid. So the old
 * helpers — get(/users/$(request.auth.uid)) — resolve to nothing for imported
 * staff. That is why every rule silently depended on the `if true` catch-all.
 *
 * This builds a table keyed by something rules CAN derive from the auth token:
 * the caller's lowercased email.
 *
 *     staffDirectory/{lowercased email} = { role, tarbiyahId, source, name }
 *
 * Rules then do:  get(/staffDirectory/$(request.auth.token.email.lower())).data.role
 *
 * The collection is locked to `if false` in the rules. That is intentional and
 * not a mistake: get()/exists() inside rules are NOT subject to rules, so the
 * lookup still works while remaining unreadable to every client.
 *
 * Sources are merged in ascending order of trust, so a later source wins:
 *   users  ->  faculty  ->  admins
 *
 * Usage:
 *   node src/scripts/buildStaffDirectory.js            # dry run, writes nothing
 *   node src/scripts/buildStaffDirectory.js --commit   # actually writes
 *
 * Idempotent: safe to re-run. Re-run it after onboarding staff, until roles
 * move to custom claims.
 */

const path = require('path')
const admin = require('firebase-admin')

const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'))
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

const COMMIT = process.argv.includes('--commit')

const ADMIN_ROLES = ['admin', 'schooladmin', 'school_admin']
const STAFF_ROLES = [...ADMIN_ROLES, 'faculty', 'teacher']

// Email and role live under different shapes depending on which importer or
// form created the document. Check every known location.
function extractEmail(d) {
  const c = d.contact || {}
  const p = d.personalInfo || {}
  const raw = c.email || p.email || d.email || null
  return raw ? String(raw).trim().toLowerCase() : null
}

function extractRole(d) {
  const p = d.personalInfo || {}
  const raw = d.primaryRole || d.role || p.role || p.primaryRole || null
  return raw ? String(raw).trim().toLowerCase() : null
}

function nameOf(d) {
  const p = d.personalInfo || {}
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || '(unknown)'
}

async function collect(collectionName, defaultRole, into) {
  const snap = await db.collection(collectionName).get()
  let kept = 0
  let skipped = 0

  snap.forEach((doc) => {
    const d = doc.data() || {}
    const email = extractEmail(d)
    if (!email) {
      skipped++
      return
    }

    const role = extractRole(d) || defaultRole
    // /users holds parents and students too — only staff belong in this table.
    if (!STAFF_ROLES.includes(role)) return

    into.set(email, {
      role: ADMIN_ROLES.includes(role) ? 'admin' : 'faculty',
      rawRole: role,
      tarbiyahId: d.schoolId || d.tarbiyahId || doc.id,
      source: collectionName,
      name: nameOf(d),
    })
    kept++
  })

  console.log(
    `  ${collectionName.padEnd(9)} ${snap.size} docs -> ${kept} staff` +
      (skipped ? `  (${skipped} had no email)` : ''),
  )
}

async function main() {
  console.log(COMMIT ? 'MODE: COMMIT (will write)\n' : 'MODE: DRY RUN (writes nothing)\n')
  console.log('Scanning source collections...')

  const table = new Map()
  // Ascending trust — later sources overwrite earlier ones.
  await collect('users', null, table)
  await collect('faculty', 'faculty', table)
  await collect('admins', 'admin', table)

  const entries = [...table.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const admins = entries.filter(([, v]) => v.role === 'admin')
  const faculty = entries.filter(([, v]) => v.role === 'faculty')

  console.log(`\n=== RESOLVED: ${entries.length} staff (${admins.length} admin, ${faculty.length} faculty) ===\n`)
  console.log('ADMIN')
  admins.forEach(([email, v]) => console.log(`  ${email.padEnd(38)} ${v.tarbiyahId}  ${v.name}  [${v.source}]`))
  console.log('\nFACULTY')
  faculty.forEach(([email, v]) => console.log(`  ${email.padEnd(38)} ${v.tarbiyahId}  ${v.name}  [${v.source}]`))

  if (admins.length === 0) {
    console.error(
      '\nABORT: zero admins resolved. Deploying rules against this table would ' +
        'lock every administrator out. Investigate before continuing.',
    )
    process.exit(1)
  }

  // Cross-check against Firebase Auth: a staff member with no auth account
  // cannot sign in, and an email mismatch is the most likely cause of a
  // post-deploy lockout. Surface it now rather than after the rules go live.
  console.log('\n=== CROSS-CHECK AGAINST FIREBASE AUTH ===')
  const authEmails = new Set()
  let pageToken
  do {
    const res = await admin.auth().listUsers(1000, pageToken)
    res.users.forEach((u) => u.email && authEmails.add(u.email.toLowerCase()))
    pageToken = res.pageToken
  } while (pageToken)

  const noAuthAccount = entries.filter(([email]) => !authEmails.has(email))
  if (noAuthAccount.length === 0) {
    console.log('  every staff email has a matching Firebase Auth account')
  } else {
    console.log(`  ${noAuthAccount.length} staff have NO Auth account (cannot sign in either way):`)
    noAuthAccount.forEach(([email, v]) => console.log(`    ${email}  ${v.name}`))
  }

  if (!COMMIT) {
    console.log('\nDry run complete. Nothing was written.')
    console.log('Review the ADMIN list above — confirm the principal and IT are present.')
    console.log('Then re-run with --commit')
    await admin.app().delete()
    return
  }

  console.log('\nWriting /staffDirectory ...')
  let batch = db.batch()
  let n = 0
  for (const [email, v] of entries) {
    batch.set(db.collection('staffDirectory').doc(email), {
      ...v,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    if (++n % 400 === 0) {
      await batch.commit()
      batch = db.batch()
    }
  }
  await batch.commit()
  console.log(`Wrote ${entries.length} entries.`)
  console.log('\nStaff directory is in place. Rules can now be deployed.')

  await admin.app().delete()
}

main().catch((err) => {
  console.error('Failed:', err.message)
  process.exit(1)
})
