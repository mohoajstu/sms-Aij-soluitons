// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../../../Firebase/firebase', () => ({ firestore: {} }))
vi.mock('../../../services/staffTimesheets', () => ({ timesheetRequest: vi.fn() }))
vi.mock('../../../services/timekeepingSettings', async (importOriginal) => ({
  ...(await importOriginal()), getTimekeepingSettings: vi.fn(async () => ({
    expectedCheckInTime: '08:00', expectedCheckOutTime: '15:30', graceMinutes: 5,
  })),
}))
vi.mock('../../../services/staffCheckins', () => ({ getStaffCheckInsBetween: vi.fn(async () => [
  { email: 'one@tarbiyahlearning.ca', type: 'in', notes: 'Original note', createdAt: new Date('2026-09-25T12:00:00Z') },
  { email: 'one@tarbiyahlearning.ca', type: 'out', notes: '', createdAt: new Date('2026-09-25T19:00:00Z') },
]) }))
import { timesheetRequest } from '../../../services/staffTimesheets'
import TimesheetApprovals from '../TimesheetApprovals'

let root, container
const pending = [
  { id: 'one', email: 'one@tarbiyahlearning.ca', revision: 2, status: 'pending', rows: [
    { date: '2026-09-25', hours: 7.5, note: 'Prep at home', reason: 'Added prep time' },
  ] },
  { id: 'two', email: 'two@tarbiyahlearning.ca', revision: 4, status: 'pending', rows: [
    { date: '2026-09-25', hours: 6, note: null, reason: 'Corrected hours' },
  ] },
]
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-27T12:00:00Z'))
  timesheetRequest.mockReset().mockImplementation(async (action) => {
    if (action === 'adminList') return { corrections: pending }
    if (action === 'summarize') return { entries: [{ id: 'one', summary: 'Prep comment and hours changed.' }] }
    return { saved: true }
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers() })
describe('staff timesheet approval queue', () => {
  it('shows AI advisory text and exact source changes, then approves all loaded revisions', async () => {
    await act(async () => root.render(<TimesheetApprovals />))
    expect(container.textContent).toContain('Prep comment and hours changed.')
    expect(container.textContent).toContain('Added prep time')
    expect(container.textContent).toContain('Original note → Prep at home')
    await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent === 'Approve all pending').click())
    expect(timesheetRequest).toHaveBeenCalledWith('review', { periodIndex: 2, decisions: [
      { id: 'one', revision: 2, status: 'approved' }, { id: 'two', revision: 4, status: 'approved' },
    ] })
  })
})
