import { describe, it, expect, vi, beforeEach } from 'vitest'

const batches = []
const collections = {}

vi.mock('firebase/firestore', () => ({
  collection: (_db, name) => name,
  getDocs: async (name) => collections[name],
  writeBatch: () => {
    const batch = { updates: [], commit: vi.fn().mockResolvedValue() }
    batch.update = (ref, data) => batch.updates.push({ ref, data })
    batches.push(batch)
    return batch
  },
}))

import { recalculateAttendanceStatsFromDate } from '../recalculateAttendanceStats'

// Mimics a Firestore QuerySnapshot: supports forEach over docs.
const snapshot = (docs) => ({ docs, forEach: (fn) => docs.forEach(fn) })
const attendanceDay = (date, courses) => ({ id: date, data: () => ({ date, courses }) })
const studentDoc = (id) => ({ id, ref: { path: `students/${id}` } })

const statsFor = (studentId) =>
  batches.flatMap((b) => b.updates).find((u) => u.ref.path === `students/${studentId}`)?.data
    .attendanceStats

describe('recalculateAttendanceStatsFromDate', () => {
  beforeEach(() => {
    batches.length = 0
  })

  it('only counts attendance on/after the school-year start date', async () => {
    collections.attendance = snapshot([
      // Last school year — must be ignored.
      attendanceDay('2026-05-12', [{ students: [{ studentId: 'S1', status: 'Absent' }] }]),
      attendanceDay('2026-06-20', [{ students: [{ studentId: 'S1', status: 'Late' }] }]),
      // This school year.
      attendanceDay('2026-09-02', [{ students: [{ studentId: 'S1', status: 'Absent' }] }]),
      attendanceDay('2026-10-05', [
        { students: [{ studentId: 'S1', status: 'Excused Late' }] },
        { students: [{ studentId: 'S1', status: 'Present' }] },
      ]),
    ])
    collections.students = snapshot([studentDoc('S1')])

    await recalculateAttendanceStatsFromDate({}, '2026-09-02')

    expect(statsFor('S1')).toEqual({
      currentTermLateCount: 1,
      yearLateCount: 1,
      currentTermAbsenceCount: 1,
      yearAbsenceCount: 1,
    })
  })

  it('counts Excused Absent/Late, and zeroes students with no records this year', async () => {
    collections.attendance = snapshot([
      attendanceDay('2026-09-10', [
        {
          students: [
            { studentId: 'S1', status: 'Excused Absent' },
            { studentId: 'S2', status: 'Present' },
          ],
        },
      ]),
      attendanceDay('2026-04-01', [{ students: [{ studentId: 'S3', status: 'Absent' }] }]),
    ])
    collections.students = snapshot([studentDoc('S1'), studentDoc('S2'), studentDoc('S3')])

    const result = await recalculateAttendanceStatsFromDate({}, '2026-09-02')

    expect(result).toEqual({ studentsUpdated: 3 })
    expect(statsFor('S1').yearAbsenceCount).toBe(1)
    expect(statsFor('S2')).toEqual({
      currentTermLateCount: 0,
      yearLateCount: 0,
      currentTermAbsenceCount: 0,
      yearAbsenceCount: 0,
    })
    // S3's only absence was last year.
    expect(statsFor('S3').yearAbsenceCount).toBe(0)
  })

  it('skips malformed attendance docs and records without a studentId', async () => {
    collections.attendance = snapshot([
      attendanceDay('not-a-date', [{ students: [{ studentId: 'S1', status: 'Absent' }] }]),
      attendanceDay('2026-09-15', [{ students: [{ status: 'Absent' }] }]),
      { id: '2026-09-16', data: () => ({}) },
    ])
    collections.students = snapshot([studentDoc('S1')])

    await recalculateAttendanceStatsFromDate({}, '2026-09-02')

    expect(statsFor('S1').yearAbsenceCount).toBe(0)
  })

  it('batches writes under the 500-op limit and reports progress', async () => {
    collections.attendance = snapshot([])
    collections.students = snapshot(Array.from({ length: 900 }, (_, i) => studentDoc(`S${i}`)))
    const onProgress = vi.fn()

    await recalculateAttendanceStatsFromDate({}, '2026-09-02', { onProgress })

    expect(batches.length).toBe(3)
    batches.forEach((b) => expect(b.updates.length).toBeLessThanOrEqual(500))
    expect(onProgress).toHaveBeenLastCalledWith(900, 900)
  })
})
