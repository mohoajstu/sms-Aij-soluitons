import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, _collection, id) => ({ id })),
  getDoc: vi.fn(),
}))
vi.mock('../../Firebase/firebase', () => ({ firestore: {} }))

import { getDoc } from 'firebase/firestore'
import { rosterEntriesFromCourse, missingRosterEntries, loadRosterStudents } from '../courseRoster'

// Homeroom Grade 3 as it stood in Firestore before the repair: roster entries
// whose student documents had been deleted, so the attendance page rendered a
// short list while the course page kept showing every stored name.
const GRADE_3 = {
  id: 'MlqJ3RQF172SI1kGb117',
  title: 'Homeroom Grade 3',
  students: [
    { id: 'TS893768', name: 'Chahayaa Setijoso' },
    { id: 'TS204143', name: 'Marwan Damergi' },
    { id: 'TLS992634', name: 'Galo Sow' },
    { id: 'TLS992629', name: 'Nusaybah Chatha' },
  ],
  enrolledList: ['TS893768', 'TS204143', 'TLS992634', 'TLS992629'],
}

const LIVE_IDS = new Set(['TLS992634', 'TLS992629'])

describe('rosterEntriesFromCourse', () => {
  it('reads the students array in preference to enrolledList', () => {
    expect(rosterEntriesFromCourse(GRADE_3)).toEqual([
      { id: 'TS893768', name: 'Chahayaa Setijoso' },
      { id: 'TS204143', name: 'Marwan Damergi' },
      { id: 'TLS992634', name: 'Galo Sow' },
      { id: 'TLS992629', name: 'Nusaybah Chatha' },
    ])
  })

  it('falls back to enrolledList when there is no students array', () => {
    const course = { enrolledList: ['TLS992634', 'TLS992629'] }
    expect(rosterEntriesFromCourse(course)).toEqual([
      { id: 'TLS992634', name: '' },
      { id: 'TLS992629', name: '' },
    ])
  })

  it('reads an enrolledList of objects, which is how the course form writes it', () => {
    const course = { enrolledList: [{ id: 'TLS992634', name: 'Galo Sow' }] }
    expect(rosterEntriesFromCourse(course)).toEqual([{ id: 'TLS992634', name: 'Galo Sow' }])
  })

  it('drops entries with no id and collapses repeats', () => {
    const course = {
      students: [
        { name: 'No Id At All' },
        { id: 'TLS992634', name: 'Galo Sow' },
        { id: 'TLS992634', name: 'Galo Sow' },
      ],
    }
    expect(rosterEntriesFromCourse(course)).toEqual([{ id: 'TLS992634', name: 'Galo Sow' }])
  })

  it('returns an empty list for a course with no roster', () => {
    expect(rosterEntriesFromCourse(null)).toEqual([])
    expect(rosterEntriesFromCourse({})).toEqual([])
  })
})

describe('missingRosterEntries', () => {
  it('names the roster entries whose student document did not load', () => {
    const loaded = [{ id: 'TLS992634' }, { id: 'TLS992629' }]
    expect(missingRosterEntries(rosterEntriesFromCourse(GRADE_3), loaded)).toEqual([
      { id: 'TS893768', name: 'Chahayaa Setijoso' },
      { id: 'TS204143', name: 'Marwan Damergi' },
    ])
  })

  it('returns nothing when every roster entry loaded', () => {
    const entries = rosterEntriesFromCourse(GRADE_3)
    expect(missingRosterEntries(entries, entries)).toEqual([])
  })

  it('falls back to the id when the roster entry carries no name', () => {
    const entries = [{ id: 'TS893768', name: '' }]
    expect(missingRosterEntries(entries, [])).toEqual([{ id: 'TS893768', name: '' }])
  })
})

describe('loadRosterStudents', () => {
  beforeEach(() => {
    getDoc.mockReset()
    getDoc.mockImplementation(async (ref) => ({
      id: ref.id,
      exists: () => LIVE_IDS.has(ref.id),
      data: () => ({ personalInfo: { firstName: 'Loaded', lastName: ref.id } }),
    }))
  })

  it('returns the students that loaded and names the ones that did not', async () => {
    const { entries, students, missing } = await loadRosterStudents(GRADE_3)

    expect(entries).toHaveLength(4)
    expect(students.map((s) => s.id)).toEqual(['TLS992634', 'TLS992629'])
    expect(missing).toEqual([
      { id: 'TS893768', name: 'Chahayaa Setijoso' },
      { id: 'TS204143', name: 'Marwan Damergi' },
    ])
  })

  it('accounts for every roster entry, so the two pages agree on the count', async () => {
    const { entries, students, missing } = await loadRosterStudents(GRADE_3)
    expect(students.length + missing.length).toBe(entries.length)
  })

  it('reads nothing for a course with no roster', async () => {
    const result = await loadRosterStudents({})
    expect(result).toEqual({ entries: [], students: [], missing: [] })
    expect(getDoc).not.toHaveBeenCalled()
  })
})
