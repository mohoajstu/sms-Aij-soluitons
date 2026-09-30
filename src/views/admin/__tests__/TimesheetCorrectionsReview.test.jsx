// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
vi.mock('../../../firebase', () => ({ firestore: {} }))
vi.mock('../../../Firebase/firebase', () => ({ firestore: {}, auth: {} }))
vi.mock('../../../services/timekeepingSettings', () => ({ getTimekeepingSettings: vi.fn(async () => ({})), resolveStaffSettings: vi.fn() }))
vi.mock('../../../services/staffCheckins', () => ({ getStaffCheckInsBetween: vi.fn(async () => []) }))
vi.mock('../../Courses/staffDirectory', () => ({ loadFacultyAndAdmins: vi.fn(async () => [
  { email: 'staff@school.ca', firstName: 'Staff' },
  { email: 'admin@school.ca', firstName: 'Admin', excludeFromTimesheetExport: true },
]) }))
vi.mock('../../../services/staffTimesheets', () => ({ timesheetRequest: vi.fn() }))
vi.mock('../../../services/timekeepingComments', () => ({ interpretTimekeepingComments: vi.fn(async () => []) }))
vi.mock('../../../services/timesheetWorkbook', () => ({ generateTimesheetZip: vi.fn(async () => ({ blob: new Blob(), fileName: 'review.zip', summary: [] })) }))
vi.mock('file-saver', () => ({ saveAs: vi.fn() }))
import { timesheetRequest } from '../../../services/staffTimesheets'
import { generateTimesheetZip } from '../../../services/timesheetWorkbook'
import TimesheetExport from '../TimesheetExport'
let root, container, correction
const click = async (label) => { await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent === label).click()) }
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-27T12:00:00Z'))
  correction = { id: 'c1', email: 'staff@school.ca', periodIndex: 2, revision: 1, status: 'pending', rows: [
    { date: '2026-09-14', hours: 0, note: null, reason: 'Unpaid absence' },
  ] }
  timesheetRequest.mockReset().mockImplementation(async (action, body) => {
    if (action === 'adminList') return { corrections: [correction] }
    if (action === 'review') { correction = { ...correction, status: body.decisions[0].status }; return { saved: true } }
  })
  generateTimesheetZip.mockClear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers() })
describe('admin correction review', () => {
  it('omits identities excluded from timesheet export', async () => {
    correction = { ...correction, rows: [], approved: { revision: 0, rows: [] } }
    await act(async () => root.render(<TimesheetExport />))
    await click('Export timesheets')
    expect(generateTimesheetZip.mock.calls[0][0].people).toEqual([
      expect.objectContaining({ email: 'staff@school.ca' }),
    ])
  })

  it('proposes the latest pending submission but waits for explicit admin confirmation', async () => {
    await act(async () => root.render(<TimesheetExport />))
    await click('Export timesheets')
    expect(generateTimesheetZip).not.toHaveBeenCalled()
    expect(container.querySelector('input[type="checkbox"]').checked).toBe(true)
    await click('Save review decisions and continue')
    expect(timesheetRequest).toHaveBeenCalledWith('review', { periodIndex: 2, decisions: [{ id: 'c1', revision: 1, status: 'approved' }] })
    expect(generateTimesheetZip.mock.calls[0][0].corrections[0].rows[0].hours).toBe(0)
  })
  it('excludes rejected latest revisions and retains an earlier approved version', async () => {
    correction.approved = { revision: 0, rows: [{ date: '2026-09-14', hours: 7, note: null, reason: 'Earlier approved' }] }
    await act(async () => root.render(<TimesheetExport />))
    await click('Export timesheets')
    await act(async () => container.querySelector('input[type="checkbox"]').click())
    await click('Save review decisions and continue')
    expect(timesheetRequest).toHaveBeenCalledWith('review', { periodIndex: 2, decisions: [{ id: 'c1', revision: 1, status: 'rejected' }] })
    expect(generateTimesheetZip.mock.calls[0][0].corrections[0].status).toBe('approved')
    expect(generateTimesheetZip.mock.calls[0][0].corrections[0].revision).toBe(0)
  })
  it('includes the confirmed latest revision and audit in the export', async () => {
    await act(async () => root.render(<TimesheetExport />))
    await click('Export timesheets')
    await click('Save review decisions and continue')
    expect(generateTimesheetZip.mock.calls[0][0].corrections[0].status).toBe('approved')
    expect(generateTimesheetZip.mock.calls[0][0].commentDecisions[0].resolution).toContain('Main Role 0 h')
  })
})
