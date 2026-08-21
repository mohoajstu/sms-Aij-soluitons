/**
 * READ-ONLY faculty inspection: list every faculty doc with the fields that
 * matter for cleanup, and show which courses reference each doc id.
 *
 * Usage:  node src/scripts/inspectFaculty.js
 */

const path = require('path')
const admin = require('firebase-admin')

const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'))
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

const main = async () => {
  const [facultySnap, coursesSnap] = await Promise.all([
    db.collection('faculty').get(),
    db.collection('courses').get(),
  ])

  // Map faculty id -> course titles that reference it via any teacher field
  const refs = new Map()
  coursesSnap.docs.forEach((c) => {
    const d = c.data()
    const ids = new Set(
      []
        .concat(d.teacherIds || [], d.teacherTarbiyahIds || [], d.teacherAuthUIDs || [])
        .concat((d.teacher || []).flatMap((t) => [t.tarbiyahId, t.schoolId, t.authUID]))
        .filter(Boolean),
    )
    ids.forEach((id) => {
      if (!refs.has(id)) refs.set(id, [])
      refs.get(id).push(`${d.title || d.name || c.id}${d.archived ? ' [archived]' : ''}`)
    })
  })

  console.log(`faculty docs: ${facultySnap.size}\n`)
  facultySnap.docs
    .map((f) => {
      const d = f.data()
      const p = d.personalInfo || {}
      return {
        id: f.id,
        name: `${p.firstName || d.firstName || ''} ${p.lastName || d.lastName || ''}`.trim(),
        email: p.email || d.email || (d.contact || {}).email || '',
        active: d.active !== false,
        courses: Array.isArray(d.courses) ? d.courses.length : 0,
        refs: refs.get(f.id) || [],
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((r) => {
      console.log(
        `${r.id.padEnd(24)} ${(r.name || '(no name)').padEnd(28)} ${(r.email || '(no email)').padEnd(36)} active=${r.active} coursesField=${r.courses} referencedBy=[${r.refs.join(', ')}]`,
      )
    })
}

main().then(() => process.exit(0))
