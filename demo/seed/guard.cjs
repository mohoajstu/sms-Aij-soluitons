'use strict'
/**
 * Safety checks for the seed runner. It writes (and with --reset deletes) data,
 * so it refuses to run against anything that is not clearly a demo target.
 */
const PROTECTED = new Set(['tarbiyah-sms', 'tarbiyah-sms-staging'])
const EMULATOR_VARS = ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST']

function assertSafeTarget({ projectId, env = process.env }) {
  if (!projectId) throw new Error('Pass --project <demo-project-id> explicitly.')
  if (PROTECTED.has(projectId)) throw new Error(`Refusing to seed "${projectId}": that is a real school project.`)
  if (!/demo/i.test(projectId)) {
    throw new Error(`Refusing to seed "${projectId}": the project ID must contain "demo" (e.g. tarbiyah-sms-demo).`)
  }
  const emulators = EMULATOR_VARS.filter((v) => env[v])
  // A half-configured emulator would send Auth (or Firestore) traffic to the cloud project.
  if (emulators.length && emulators.length !== EMULATOR_VARS.length) {
    throw new Error(`Set both ${EMULATOR_VARS.join(' and ')} to use the emulators, or neither to use the cloud project.`)
  }
  return { emulator: emulators.length === EMULATOR_VARS.length, storageEmulator: !!env.FIREBASE_STORAGE_EMULATOR_HOST }
}

/** Existing data may only be reset/overwritten if it is all demo data. */
async function assertNoRealData(db) {
  for (const col of ['students', 'parents', 'faculty', 'admins']) {
    const snap = await db.collection(col).limit(200).get()
    const real = snap.docs.filter((d) => d.data().isDemo !== true)
    if (real.length) {
      throw new Error(`Refusing to continue: ${col}/${real[0].id} is not demo data. This does not look like an empty demo project.`)
    }
  }
}

module.exports = { assertSafeTarget, assertNoRealData, PROTECTED }
