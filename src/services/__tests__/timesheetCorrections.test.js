import { describe, it, expect, vi } from 'vitest'
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn(), serverTimestamp: vi.fn() }))
vi.mock('../../Firebase/firebase', () => ({ firestore: {} }))
import { buildStaffTimesheet, zonedTime } from '../timesheetExport'
import { applyCommentCorrections, correctionAudit, approvedCorrectionFor } from '../timesheetCorrections'
const email = 'teacher@school.ca'
const date = '2026-09-14'
const records = [
  { id: 'in', email, type: 'in', notes: 'Original note', at: zonedTime(new Date(`${date}T00:00:00Z`), '08:00') },
  { id: 'out', email, type: 'out', notes: 'Second note', at: zonedTime(new Date(`${date}T00:00:00Z`), '12:00') },
  { id: 'other', email: 'other@school.ca', type: 'in', notes: 'Private', at: zonedTime(new Date(`${date}T00:00:00Z`), '08:00') },
]
const correction = { id: 'c1', email, status: 'approved', revision: 1, rows: [{ date, hours: 0, note: 'Corrected note', reason: 'Unpaid absence' }] }
describe('staff timesheet corrections', () => {
  it('keeps the last approved payroll version while new edits are pending or rejected', () => {
    const pending = { ...correction, status: 'pending', revision: 2, rows: [{ ...correction.rows[0], hours: 8 }],
      approved: { revision: 1, rows: correction.rows } }
    expect(approvedCorrectionFor(pending).rows[0].hours).toBe(0)
    expect(approvedCorrectionFor(pending).revision).toBe(1)
    expect(approvedCorrectionFor(pending, true).rows[0].hours).toBe(8)
    expect(approvedCorrectionFor({ ...pending, status: 'rejected' }).revision).toBe(1)
    expect(approvedCorrectionFor({ ...pending, approved: null })).toBeNull()
  })
  it('overrides Main Role only for approved owner corrections, including zero', () => {
    const args = { email, periodIndex: 2, records, settings: { expectedCheckInTime: '08:00', expectedCheckOutTime: '15:30' } }
    expect(buildStaffTimesheet({ ...args, corrections: [{ ...correction, status: 'pending' }] }).hours[0]).toBe(4)
    expect(buildStaffTimesheet({ ...args, corrections: [correction] }).hours[0]).toBe(0)
    expect(buildStaffTimesheet({ ...args, email: 'other@school.ca', corrections: [correction] }).hours[0]).toBe(7.5)
  })
  it('preserves raw comments and other people while replacing the interpreted day comment', () => {
    const changed = applyCommentCorrections(records, [correction])
    expect(records[0].notes).toBe('Original note')
    expect(changed.find((record) => record.id === 'in').notes).toBe('')
    expect(changed.find((record) => record.id === 'other').notes).toBe('Private')
    expect(changed.at(-1).notes).toBe('Corrected note')
    expect(changed.at(-1).type).toBe('comment')
    expect(correctionAudit([correction], records)[0].note).toContain('Original note / Second note')
  })
  it('an approved explicit hour correction supersedes a prep auto-top-up', () => {
    const sheet = buildStaffTimesheet({ email, periodIndex: 2, records,
      settings: { expectedCheckInTime: '08:00', expectedCheckOutTime: '15:30' },
      claims: [{ email, date, category: 'prepAtHome' }], corrections: [correction] })
    expect(sheet.hours[0]).toBe(0)
    expect(sheet.prepAtHome).toEqual([])
  })
})
