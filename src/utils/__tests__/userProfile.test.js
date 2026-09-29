import { describe, it, expect, vi, beforeEach } from 'vitest'

// Minimal in-memory Firestore. Mirrors the call shapes userProfile.js uses:
// collection() -> query(where()) -> getDocs(), and doc() -> getDoc().
const DB = {}

const valueAt = (data, fieldPath) =>
  fieldPath.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), data)

vi.mock('firebase/firestore', () => ({
  collection: (_db, name) => ({ __collection: name }),
  where: (field, op, value) => ({ field, op, value }),
  query: (coll, clause) => ({ coll, clause }),
  getDocs: async ({ coll, clause }) => {
    const docs = Object.entries(DB[coll.__collection] || {})
      .filter(([, data]) => valueAt(data, clause.field) === clause.value)
      .map(([id, data]) => ({ id, data: () => data }))
    return { empty: docs.length === 0, docs }
  },
  doc: (_db, name, id) => ({ __collection: name, __id: id }),
  getDoc: async (ref) => {
    const data = (DB[ref.__collection] || {})[ref.__id]
    return { exists: () => data !== undefined, id: ref.__id, data: () => data }
  },
  setDoc: vi.fn(async () => {}),
}))

import { loadCurrentUserProfile, resolveProfileRole } from '../userProfile'

const seed = () => {
  DB.faculty = {
    // Real shape in production: the email lives at contact.email, never at
    // personalInfo.email.
    TLA0015: {
      personalInfo: { firstName: 'Rafia', lastName: 'Husain', role: 'Faculty' },
      contact: { email: 'rafia.husain@tarbiyahlearning.ca' },
    },
    // 6 of the 39 live faculty docs carry no role field at all.
    TLA000028: {
      personalInfo: { firstName: 'Wala', lastName: 'Omorri' },
      contact: { email: 'wala.omorri@tarbiyahlearning.ca' },
    },
    TLA000029: {
      personalInfo: { firstName: 'Asma', role: 'Parent' },
    },
    TLA00023: {
      personalInfo: { role: 'Faculty' },
      contact: { email: 'dev@aijsolutions.com' },
      isTestAccount: true,
    },
  }
  DB.admins = {
    TLA0005: {
      personalInfo: { firstName: 'Ghazala', lastName: 'Choudhary', role: 'SchoolAdmin' },
      contact: { email: 'ghazala.choudhary@tarbiyahlearning.ca' },
    },
  }
  DB.users = {
    // The junk doc StaffLogin mints when the faculty lookup misses.
    BKcJzLQnUcVo179WMK2fyzONr0X2: {
      email: 'rafia.husain@tarbiyahlearning.ca',
      role: 'staff',
    },
    TLA1234: {
      personalInfo: { firstName: 'A', lastName: 'Parent', role: 'Parent' },
      contact: { email: 'a.parent@example.com' },
    },
    staffLogin: {
      email: 'asma.murtuza@tarbiyahlearning.ca',
      role: 'staff',
      linkedCollection: 'faculty',
      tarbiyahId: 'TLA000029',
    },
  }
}

const authUser = (email, uid = 'uid-none') => ({ email, uid })

describe('loadCurrentUserProfile', () => {
  beforeEach(seed)

  it('resolves a faculty member whose email is stored at contact.email', async () => {
    const profile = await loadCurrentUserProfile(
      {},
      authUser('rafia.husain@tarbiyahlearning.ca', 'BKcJzLQnUcVo179WMK2fyzONr0X2'),
    )
    expect(profile).not.toBeNull()
    expect(profile.id).toBe('TLA0015')
    expect(profile.collection).toBe('faculty')
  })

  it('prefers the faculty doc over the role-"staff" users doc keyed by auth uid', async () => {
    const profile = await loadCurrentUserProfile(
      {},
      authUser('rafia.husain@tarbiyahlearning.ca', 'BKcJzLQnUcVo179WMK2fyzONr0X2'),
    )
    expect(resolveProfileRole(profile)).toBe('faculty')
  })

  it('resolves an admin whose email is stored at contact.email', async () => {
    const profile = await loadCurrentUserProfile(
      {},
      authUser('ghazala.choudhary@tarbiyahlearning.ca'),
    )
    expect(profile.id).toBe('TLA0005')
    expect(resolveProfileRole(profile)).toBe('admin')
  })

  it('resolves a linked faculty record even when only the login record has the email', async () => {
    const profile = await loadCurrentUserProfile({}, authUser('asma.murtuza@tarbiyahlearning.ca'))
    expect(profile.collection).toBe('faculty')
    expect(profile.id).toBe('TLA000029')
    expect(resolveProfileRole(profile)).toBe('faculty')
  })

  it('matches regardless of the casing the user signs in with', async () => {
    const profile = await loadCurrentUserProfile({}, authUser('Rafia.Husain@TarbiyahLearning.ca'))
    expect(profile.id).toBe('TLA0015')
  })

  it('skips faculty docs flagged isTestAccount', async () => {
    const profile = await loadCurrentUserProfile({}, authUser('dev@aijsolutions.com'))
    expect(profile).toBeNull()
  })

  it('still resolves a parent from users.contact.email', async () => {
    const profile = await loadCurrentUserProfile({}, authUser('a.parent@example.com'))
    expect(profile.id).toBe('TLA1234')
    expect(profile.collection).toBe('users')
    expect(resolveProfileRole(profile)).toBe('parent')
  })

  it('returns null when nothing matches', async () => {
    expect(await loadCurrentUserProfile({}, authUser('nobody@example.com'))).toBeNull()
  })
})

describe('resolveProfileRole', () => {
  beforeEach(seed)

  it('derives faculty from the collection when the doc has no role field', async () => {
    const profile = await loadCurrentUserProfile({}, authUser('wala.omorri@tarbiyahlearning.ca'))
    expect(profile.id).toBe('TLA000028')
    expect(resolveProfileRole(profile)).toBe('faculty')
  })

  it('normalizes SchoolAdmin to admin', () => {
    expect(resolveProfileRole({ collection: 'admins', data: { role: 'SchoolAdmin' } })).toBe(
      'admin',
    )
  })

  it('uses faculty collection membership over conflicting staff or parent role fields', () => {
    expect(resolveProfileRole({ collection: 'faculty', data: { role: 'staff' } })).toBe('faculty')
    expect(resolveProfileRole({ collection: 'faculty', data: { role: 'Parent' } })).toBe('faculty')
  })

  it('does not trust an unverified linkedCollection field on a users document', () => {
    expect(resolveProfileRole({ collection: 'users', data: { linkedCollection: 'faculty' } })).toBe(
      'guest',
    )
  })

  it('returns guest for no profile', () => {
    expect(resolveProfileRole(null)).toBe('guest')
  })
})
