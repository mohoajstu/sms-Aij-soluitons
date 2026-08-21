/**
 * Delete junk and duplicate faculty docs identified on 2026-08-21.
 *
 * Verified before listing (see inspectFaculty.js):
 *   - none of these match the login lookup (personalInfo.email), so no
 *     sign-in path changes;
 *   - the two duplicates keep their real doc: Hanaa Alanqar keeps TL416234,
 *     Saima Qureshi keeps TL486514 (referenced by Homeroom Grade 4).
 *
 * Usage:
 *   node src/scripts/deleteJunkFaculty.js            # dry run, prints targets
 *   node src/scripts/deleteJunkFaculty.js --commit   # actually deletes
 */

const path = require('path')
const admin = require('firebase-admin')

const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'))
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

const COMMIT = process.argv.includes('--commit')

const TARGETS = [
  ['TLA00022', 'mo ho (test account)'],
  ['TLA000027', 'Mohammed Abdul (dev account)'],
  ['TL516693', 'Mohammed Abdul Jabbar (dev account)'],
  ['TLA000029', 'Mohammed AJ (dev account)'],
  ['TLA00024', 'test faculty t'],
  ['TLA00020', 'TEST_FACULTY_001 TEST'],
  ['TLA00023', 'unnamed doc, info@aijsolutions.com'],
  ['TLA00035', 'duplicate Hanaa Alanqar (no email; TL416234 stays)'],
  ['Wxjic0nexBVYFxkz0YyL7YlBXLv1', 'duplicate Saima Qureshi (TL486514 stays)'],
]

const main = async () => {
  console.log(COMMIT ? 'COMMIT MODE — deleting:' : 'DRY RUN — would delete:')
  for (const [id, label] of TARGETS) {
    const ref = db.collection('faculty').doc(id)
    const snap = await ref.get()
    if (!snap.exists) {
      console.log('  skip (already gone):', id, '—', label)
      continue
    }
    if (COMMIT) await ref.delete()
    console.log(' ', COMMIT ? 'deleted' : 'target', 'faculty/' + id, '—', label)
  }
  const left = await db.collection('faculty').get()
  console.log('faculty docs now in collection:', left.size)
}

main().then(() => process.exit(0))
