// Firestore security-rules regression tests. Run with the emulator:
//   firebase emulators:exec --only firestore "npx vitest run tests/firestore.rules.test.js"
// (needs @firebase/rules-unit-testing; not part of the normal `yarn test:unit` run).
import { readFileSync } from 'node:fs'
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'

let env
const ctx = (uid, email = `${uid}@gmail.com`) =>
  env.authenticatedContext(uid, { email, email_verified: true }).firestore()

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
afterAll(() => env.cleanup())

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore()
    await setDoc(doc(db, 'users', 'admin1'), { role: 'admin', email: 'admin@x.ca' })
    await setDoc(doc(db, 'users', 'fac1'), { role: 'Faculty', email: 'fac@x.ca', tarbiyahId: 'F1' })
    await setDoc(doc(db, 'users', 'parent1'), { role: 'parent', email: 'p@gmail.com' })
    await setDoc(doc(db, 'users', 'P2'), { role: 'Parent', tarbiyahId: 'P2', email: 'p2@gmail.com' })
    await setDoc(doc(db, 'users', 'victim'), { role: 'parent', email: 'v@gmail.com' })
    await setDoc(doc(db, 'faculty', 'F1'), { personalInfo: { email: 'fac@x.ca' } })
    await setDoc(doc(db, 'admins', 'A1'), { personalInfo: { email: 'admin@x.ca' } })
    await setDoc(doc(db, 'systemSettings', 'registration'), { open: true })
    await setDoc(doc(db, 'students', 'S1'), { personalInfo: { firstName: 'x' } })
  })
})

describe('a parent cannot become staff or admin', () => {
  it('cannot self-create a staff/admin/faculty users doc', async () => {
    const db = ctx('newbie')
    for (const role of ['admin', 'schooladmin', 'Faculty', 'staff', 'teacher']) {
      await assertFails(setDoc(doc(db, 'users', 'newbie'), { role, email: 'n@gmail.com' }))
      await assertFails(
        setDoc(doc(db, 'users', 'newbie'), { personalInfo: { role }, email: 'n@gmail.com' }),
      )
      await assertFails(setDoc(doc(db, 'users', 'newbie'), { primaryRole: role }))
    }
    await assertFails(setDoc(doc(db, 'users', 'newbie'), { role: 'parent', adminProfile: {} }))
    await assertFails(
      setDoc(doc(db, 'users', 'newbie'), { role: 'parent', linkedCollection: 'faculty', tarbiyahId: 'F1' }),
    )
  })
  it('can still self-register as a parent', async () => {
    const db = ctx('newbie')
    await assertSucceeds(setDoc(doc(db, 'users', 'newbie'), { role: 'parent', email: 'n@gmail.com' }))
    await assertSucceeds(setDoc(doc(ctx('newbie2'), 'users', 'newbie2'), { role: 'Parent', personalInfo: { role: 'Parent' } }))
  })
  it('cannot promote own existing doc', async () => {
    const db = ctx('parent1')
    await assertFails(updateDoc(doc(db, 'users', 'parent1'), { role: 'admin' }))
    await assertFails(updateDoc(doc(db, 'users', 'parent1'), { 'personalInfo.role': 'admin' }))
    await assertFails(updateDoc(doc(db, 'users', 'parent1'), { primaryRole: 'admin' }))
    await assertFails(updateDoc(doc(db, 'users', 'parent1'), { linkedCollection: 'faculty', tarbiyahId: 'F1' }))
    await assertFails(setDoc(doc(db, 'users', 'parent1'), { role: 'admin' }, { merge: true }))
  })
  it('can still update ordinary own fields', async () => {
    await assertSucceeds(updateDoc(doc(ctx('parent1'), 'users', 'parent1'), { mustChangePassword: false }))
    await assertSucceeds(updateDoc(doc(ctx('P2'), 'users', 'P2'), { lastLogin: 1 }))
    await assertSucceeds(
      setDoc(doc(ctx('parent1'), 'users', 'parent1'), { role: 'Parent', studentId: 'S1' }, { merge: true }),
    )
  })
  it("cannot write anyone else's users doc (parents or faculty)", async () => {
    for (const uid of ['parent1', 'fac1']) {
      await assertFails(updateDoc(doc(ctx(uid), 'users', 'victim'), { role: 'admin' }))
      await assertFails(updateDoc(doc(ctx(uid), 'users', 'victim'), { phone: '1' }))
      await assertFails(deleteDoc(doc(ctx(uid), 'users', 'victim')))
    }
  })
  it('cannot mint admins/faculty/parents records (the collection-membership path)', async () => {
    const db = ctx('parent1')
    await assertFails(setDoc(doc(db, 'admins', 'parent1'), { personalInfo: { email: 'p@gmail.com' } }))
    await assertFails(setDoc(doc(db, 'faculty', 'parent1'), { personalInfo: { email: 'p@gmail.com' } }))
    await assertFails(updateDoc(doc(db, 'admins', 'A1'), { 'personalInfo.email': 'p@gmail.com' }))
    await assertFails(updateDoc(doc(db, 'faculty', 'F1'), { 'personalInfo.email': 'p@gmail.com' }))
    await assertFails(deleteDoc(doc(db, 'admins', 'A1')))
  })
  it('cannot change system settings', async () => {
    await assertFails(setDoc(doc(ctx('parent1'), 'systemSettings', 'registration'), { open: false }))
  })
  it('cannot sign-in-then-claim a unowned staff users doc by email', async () => {
    await assertFails(setDoc(doc(ctx('parent1', 'fac@x.ca'), 'users', 'F1'), { role: 'Faculty' }))
  })
})

describe('flows that key records by Tarbiyah ID, not auth uid', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (c) => {
      const db = c.firestore()
      await setDoc(doc(db, 'users', 'T100'), {
        tarbiyahId: 'T100', role: 'Parent', contact: { email: 'mom@gmail.com' },
      })
      await setDoc(doc(db, 'users', 'F55'), {
        tarbiyahId: 'F55', linkedCollection: 'faculty', role: 'Faculty', contact: { email: 'teach@tarbiyahlearning.ca' },
      })
    })
  })
  it('Login.js: the verified email owner can refresh their Tarbiyah-ID keyed doc', async () => {
    const db = ctx('googleUid1', 'mom@gmail.com')
    await assertSucceeds(
      setDoc(doc(db, 'users', 'T100'), {
        tarbiyahId: 'T100', role: 'Parent', contact: { email: 'mom@gmail.com' },
        firebaseAuthUID: 'googleUid1', email: 'mom@gmail.com', loginCount: 2,
      }, { merge: true }),
    )
  })
  it('...but cannot use that to change role or staff links', async () => {
    const db = ctx('googleUid1', 'mom@gmail.com')
    await assertFails(updateDoc(doc(db, 'users', 'T100'), { role: 'admin' }))
    await assertFails(updateDoc(doc(db, 'users', 'T100'), { 'personalInfo.role': 'Faculty' }))
    await assertFails(updateDoc(doc(db, 'users', 'T100'), { linkedCollection: 'admins', tarbiyahId: 'A1' }))
  })
  it("a different person cannot touch someone else's Tarbiyah-ID doc", async () => {
    const db = ctx('googleUid2', 'attacker@gmail.com')
    await assertFails(updateDoc(doc(db, 'users', 'T100'), { phone: '1' }))
    await assertFails(updateDoc(doc(db, 'users', 'F55'), { role: 'admin' }))
  })
  it('an unverified email does not establish ownership', async () => {
    const db = env.authenticatedContext('u3', { email: 'mom@gmail.com', email_verified: false }).firestore()
    await assertFails(updateDoc(doc(db, 'users', 'T100'), { phone: '1' }))
  })
  it('staff keep refreshing their own login stats without changing role', async () => {
    const db = ctx('googleStaff', 'teach@tarbiyahlearning.ca')
    await assertSucceeds(
      setDoc(doc(db, 'users', 'F55'), { lastLogin: 1, loginCount: 4, isVerified: true }, { merge: true }),
    )
  })
  it('Login.js can still provision a TEMP parent record for an unknown Google account', async () => {
    const db = ctx('g9', 'new@gmail.com')
    await assertSucceeds(
      setDoc(doc(db, 'users', 'TEMP_1731500000000'), {
        tarbiyahId: 'TEMP_1731500000000', role: 'Parent', personalInfo: { role: 'Parent' },
        contact: { email: 'new@gmail.com' }, active: true,
      }),
    )
    await assertFails(
      setDoc(doc(db, 'users', 'TEMP_1731500000001'), {
        tarbiyahId: 'TEMP_1731500000001', role: 'admin', contact: { email: 'new@gmail.com' },
      }),
    )
    // cannot borrow a real student/staff id via the TEMP carve-out
    await assertFails(
      setDoc(doc(db, 'users', 'S1'), { tarbiyahId: 'S1', role: 'Parent', contact: { email: 'new@gmail.com' } }),
    )
  })
})

describe('faculty documents', () => {
  it('course creation can still add courses to an instructor record', async () => {
    await assertSucceeds(updateDoc(doc(ctx('parent1'), 'faculty', 'F1'), { courses: ['C1'], updatedAt: 1 }))
  })
  it('...but identity fields on faculty docs cannot be rewritten', async () => {
    const db = ctx('parent1')
    await assertFails(updateDoc(doc(db, 'faculty', 'F1'), { role: 'admin' }))
    await assertFails(updateDoc(doc(db, 'faculty', 'F1'), { active: false }))
    await assertFails(updateDoc(doc(db, 'faculty', 'F1'), { contact: { email: 'p@gmail.com' } }))
    await assertFails(updateDoc(doc(db, 'faculty', 'F1'), { 'personalInfo.role': 'admin' }))
  })
})

describe('server-granted admin claim', () => {
  it('a token carrying the admin claim can manage staff', async () => {
    const db = env.authenticatedContext('claimAdmin', { email: 'a@x.ca', email_verified: true, admin: true }).firestore()
    await assertSucceeds(setDoc(doc(db, 'faculty', 'F77'), { personalInfo: { email: 'z@x.ca' } }))
    await assertSucceeds(updateDoc(doc(db, 'users', 'victim'), { role: 'faculty' }))
  })
  it('a client cannot forge the claim by writing a field', async () => {
    await assertFails(updateDoc(doc(ctx('parent1'), 'users', 'parent1'), { admin: true, role: 'admin' }))
    await assertFails(setDoc(doc(ctx('parent1'), 'faculty', 'F77'), { personalInfo: { email: 'p@gmail.com' }, admin: true }))
  })
})

describe('legitimate access keeps working', () => {
  it('admin manages users, admins, faculty and settings', async () => {
    const db = ctx('admin1')
    await assertSucceeds(updateDoc(doc(db, 'users', 'victim'), { role: 'faculty' }))
    await assertSucceeds(setDoc(doc(db, 'users', 'brandnew'), { role: 'Faculty' }))
    await assertSucceeds(setDoc(doc(db, 'faculty', 'F9'), { personalInfo: { email: 'n@x.ca' } }))
    await assertSucceeds(setDoc(doc(db, 'admins', 'A9'), { personalInfo: { email: 'n@x.ca' } }))
    await assertSucceeds(setDoc(doc(db, 'systemSettings', 'registration'), { open: false }))
  })
  it('signed-in users can still read staff lookups used at login', async () => {
    await assertSucceeds(getDoc(doc(ctx('parent1'), 'faculty', 'F1')))
    await assertSucceeds(getDoc(doc(ctx('parent1'), 'admins', 'A1')))
    await assertSucceeds(getDoc(doc(ctx('parent1'), 'users', 'parent1')))
  })
  it('anonymous users get nothing', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'users', 'parent1')))
    await assertFails(setDoc(doc(db, 'users', 'x'), { role: 'admin' }))
  })
  it('other collections keep working for signed-in users (no regression)', async () => {
    await assertSucceeds(setDoc(doc(ctx('parent1'), 'students', 'S1'), { a: 1 }, { merge: true }))
    await assertSucceeds(setDoc(doc(ctx('parent1'), 'someCollection', 'd1'), { a: 1 }))
  })
})
