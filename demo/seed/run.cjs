#!/usr/bin/env node
'use strict'
/**
 * Seed the SMS demo with synthetic data.
 *
 *   node demo/seed/run.cjs --project <demo-project-id> [--reset] [--today YYYY-MM-DD]
 *                          [--bucket <bucket>] [--skip-storage] [--dry-run]
 *
 * Cloud project: authenticate with `gcloud auth application-default login`.
 * Emulators:     run through `firebase emulators:exec` (see demo/README.md), which sets the
 *                *_EMULATOR_HOST variables this script reads.
 */
const crypto = require('node:crypto')
const { generate } = require('./generate.cjs')
const { assertSafeTarget, assertNoRealData } = require('./guard.cjs')

function parseArgs(argv) {
  const out = { flags: new Set() }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) throw new Error(`Unexpected argument: ${a}`)
    const key = a.slice(2)
    if (['project', 'today', 'bucket'].includes(key)) out[key] = argv[++i]
    else if (['reset', 'dry-run', 'skip-storage'].includes(key)) out.flags.add(key)
    else throw new Error(`Unknown option: ${a}`)
  }
  return out
}

async function reportPdf({ studentName, typeName, grade, schoolYear, comment }) {
  const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')
  const doc = await PDFDocument.create()
  const page = doc.addPage([612, 792])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const text = (t, y, size = 12, f = font) => page.drawText(t, { x: 54, y, size, font: f, color: rgb(0.1, 0.1, 0.1) })
  text('DEMO ACADEMY', 720, 22, bold)
  text(typeName, 690, 13, bold)
  text(`Student: ${studentName}   Grade: ${grade}   School year: ${schoolYear}   Term 1`, 660)
  text('Fictional student and fictional report - generated for demonstration only.', 640, 10)
  const words = comment.split(' ')
  let line = ''
  let y = 600
  for (const w of words) {
    if ((line + w).length > 80) { text(line, y); y -= 16; line = '' }
    line += `${w} `
  }
  if (line) text(line, y)
  return Buffer.from(await doc.save())
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const projectId = args.project
  const target = assertSafeTarget({ projectId })
  const today = args.today ? new Date(`${args.today}T00:00:00Z`) : new Date()
  const dryRun = args.flags.has('dry-run')
  const useStorage = !args.flags.has('skip-storage') && (!target.emulator || target.storageEmulator)
  const bucketName = args.bucket || `${projectId}.firebasestorage.app`
  const tokens = new Map()
  const downloadUrl = (path) => {
    const token = tokens.get(path) || crypto.randomUUID()
    tokens.set(path, token)
    const base = target.storageEmulator
      ? `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}`
      : 'https://firebasestorage.googleapis.com'
    return `${base}/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`
  }

  const data = generate({ today, reportCardUrl: downloadUrl })
  console.log(`School year ${data.schoolYear.label}; ${Object.values(data.counts).reduce((a, b) => a + b, 0)} documents:`)
  console.table(data.counts)
  if (dryRun) { console.log('Dry run: nothing written.'); return }

  const admin = require('firebase-admin')
  admin.initializeApp({ projectId, storageBucket: bucketName })
  const db = admin.firestore()
  const auth = admin.auth()
  console.log(`Target: ${projectId} (${target.emulator ? 'emulators' : 'cloud'})`)

  await assertNoRealData(db)

  if (args.flags.has('reset')) {
    console.log('Resetting: removing existing demo data ...')
    const collections = new Set([...Object.keys(data.collections), 'attendanceArchives', 'actAsSessions', 'systemCounters'])
    for (const name of collections) await db.recursiveDelete(db.collection(name))
    let page
    do {
      const res = await auth.listUsers(1000, page)
      if (res.users.length) await auth.deleteUsers(res.users.map((u) => u.uid))
      page = res.pageToken
    } while (page)
  }

  // Auth users: uid === Tarbiyah ID, which several screens rely on.
  const password = process.env.DEMO_PASSWORD || 'DemoSchool-2026'
  for (const u of data.authUsers) {
    const props = { email: u.email, password, displayName: u.displayName, emailVerified: true, disabled: false }
    try { await auth.updateUser(u.uid, props) } catch (e) {
      if (e.code === 'auth/user-not-found') await auth.createUser({ uid: u.uid, ...props })
      else throw e
    }
  }
  console.log(`Auth users ready: ${data.authUsers.length}`)

  for (const [name, docs] of Object.entries(data.collections)) {
    const entries = Object.entries(docs)
    for (let i = 0; i < entries.length; i += 400) {
      const batch = db.batch()
      entries.slice(i, i + 400).forEach(([id, doc]) => batch.set(db.collection(name).doc(id), doc))
      await batch.commit()
    }
    console.log(`  ${name}: ${entries.length}`)
  }

  if (useStorage) {
    const bucket = admin.storage().bucket()
    for (const pdf of data.reportPdfs) {
      await bucket.file(pdf.path).save(await reportPdf(pdf), {
        contentType: 'application/pdf',
        metadata: { metadata: { firebaseStorageDownloadTokens: tokens.get(pdf.path) } },
      })
    }
    console.log(`Report card PDFs uploaded: ${data.reportPdfs.length}`)
  } else {
    console.log('Skipping report card PDFs (no storage target). Parent report card downloads will not open.')
  }
  console.log('Done. Sign-in accounts: see src/config/demoAccounts.json (password from DEMO_PASSWORD, default in README).')
}

main().catch((e) => { console.error(`\nSeed failed: ${e.message}`); process.exit(1) })
