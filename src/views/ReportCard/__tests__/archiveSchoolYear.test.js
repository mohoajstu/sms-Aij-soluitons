import { describe, it, expect, vi, beforeEach } from 'vitest'

const batches = []
let nextCommitError = null
const mockGetDocs = vi.fn()
const mockSetDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: (_db, name) => ({ collection: name }),
  doc: (_db, ...segments) => ({ path: segments.join('/') }),
  getDocs: (...args) => mockGetDocs(...args),
  setDoc: (...args) => mockSetDoc(...args),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
  writeBatch: () => {
    const error = nextCommitError
    nextCommitError = null
    const batch = {
      sets: [],
      updates: [],
      commit: vi.fn(() => (error ? Promise.reject(error) : Promise.resolve())),
    }
    batch.set = (ref, data) => batch.sets.push({ ref, data })
    batch.update = (ref, data) => batch.updates.push({ ref, data })
    batches.push(batch)
    return batch
  },
}))

import { archiveAndStartNewSchoolYear } from '../utils/archiveSchoolYear'

const makeStudent = (id, data) => ({ id, ref: { path: `students/${id}` }, data: () => data })

describe('archiveAndStartNewSchoolYear', () => {
  beforeEach(() => {
    batches.length = 0
    nextCommitError = null
    vi.clearAllMocks()
  })

  it('archives each student under the outgoing year, resets counters, then advances the year', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        makeStudent('S1', {
          fullName: 'Noora Khan',
          grade: '8',
          attendanceStats: { yearAbsenceCount: 4, yearLateCount: 2 },
        }),
        makeStudent('S2', {
          personalInfo: { firstName: 'Ali', lastName: 'Ahmed' },
          program: 'Jr Kindergarten',
        }),
      ],
    })

    const result = await archiveAndStartNewSchoolYear(
      {},
      { outgoingLabel: '2026-2027', newLabel: '2027-2028', newStartDate: '2027-09-02' },
    )

    expect(result).toEqual({ studentsArchived: 2 })
    expect(batches).toHaveLength(1)
    const [batch] = batches

    expect(batch.sets.map((s) => s.ref.path)).toEqual([
      'attendanceArchives/S1_2026-2027',
      'attendanceArchives/S2_2026-2027',
    ])
    expect(batch.sets[0].data).toMatchObject({
      studentId: 'S1',
      studentName: 'Noora Khan',
      schoolYear: '2026-2027',
      grade: '8',
      attendanceStats: { yearAbsenceCount: 4, yearLateCount: 2 },
    })
    expect(batch.sets[1].data).toMatchObject({
      studentName: 'Ali Ahmed',
      grade: 'Jr Kindergarten',
      attendanceStats: {},
    })

    const zeroed = {
      attendanceStats: {
        currentTermLateCount: 0,
        yearLateCount: 0,
        currentTermAbsenceCount: 0,
        yearAbsenceCount: 0,
      },
    }
    expect(batch.updates).toEqual([
      { ref: { path: 'students/S1' }, data: zeroed },
      { ref: { path: 'students/S2' }, data: zeroed },
    ])
    expect(batch.commit).toHaveBeenCalled()

    // Settings only advance after every batch committed.
    expect(mockSetDoc).toHaveBeenCalledTimes(1)
    expect(mockSetDoc.mock.calls[0][0]).toEqual({ path: 'systemSettings/schoolYear' })
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({
      label: '2027-2028',
      startDate: '2027-09-02',
    })
  })

  it('keeps every batch under Firestore’s 500-write limit', async () => {
    mockGetDocs.mockResolvedValue({
      docs: Array.from({ length: 450 }, (_, i) => makeStudent(`S${i}`, {})),
    })

    await archiveAndStartNewSchoolYear(
      {},
      { outgoingLabel: '2026-2027', newLabel: '2027-2028', newStartDate: '2027-09-02' },
    )

    expect(batches.length).toBe(3)
    batches.forEach((b) => expect(b.sets.length + b.updates.length).toBeLessThanOrEqual(500))
    expect(batches.reduce((n, b) => n + b.sets.length, 0)).toBe(450)
  })

  it('refuses to run without all inputs, or when reusing the current label', async () => {
    await expect(
      archiveAndStartNewSchoolYear(
        {},
        { outgoingLabel: '2026-2027', newLabel: '', newStartDate: '2027-09-02' },
      ),
    ).rejects.toThrow()
    await expect(
      archiveAndStartNewSchoolYear(
        {},
        { outgoingLabel: '2026-2027', newLabel: '2026-2027', newStartDate: '2027-09-02' },
      ),
    ).rejects.toThrow(/must differ/)
    expect(mockGetDocs).not.toHaveBeenCalled()
    expect(mockSetDoc).not.toHaveBeenCalled()
  })

  it('does not advance the school year if a batch fails partway', async () => {
    mockGetDocs.mockResolvedValue({ docs: [makeStudent('S1', {})] })
    nextCommitError = new Error('network')
    await expect(
      archiveAndStartNewSchoolYear(
        {},
        { outgoingLabel: '2026-2027', newLabel: '2027-2028', newStartDate: '2027-09-02' },
      ),
    ).rejects.toThrow('network')
    expect(mockSetDoc).not.toHaveBeenCalled()
  })
})
