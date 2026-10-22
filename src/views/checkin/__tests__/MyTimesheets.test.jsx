// @vitest-environment jsdom
import React, { act } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot } from 'react-dom/client'
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn(), serverTimestamp: vi.fn() }))
vi.mock('../../../Firebase/firebase', () => ({ firestore: {}, auth: {} }))
vi.mock('../../../Firebase/useAuth', () => ({ default: vi.fn() }))
vi.mock('../../../services/staffTimesheets', () => ({ timesheetRequest: vi.fn() }))
vi.mock('../../../services/timesheetWorkbook', () => ({ fetchTemplate: vi.fn(), fillTimesheet: vi.fn() }))
vi.mock('file-saver', () => ({ saveAs: vi.fn() }))
import useAuth from '../../../Firebase/useAuth'
import { timesheetRequest } from '../../../services/staffTimesheets'
import MyTimesheets, { changedRows } from '../MyTimesheets'
const result = { email: 'asma@tarbiyahlearning.ca', person: { firstName: 'Asma' }, correction: null,
  settings: { expectedCheckInTime: '08:00', expectedCheckOutTime: '15:30' }, records: [
    { id: 'tap', email: 'asma@tarbiyahlearning.ca', type: 'in', notes: 'Forgot to check out', at: '2026-09-14T12:00:00Z' },
  ] }
let root
let container
const render = async () => { await act(async () => root.render(<MyTimesheets />)) }
const field = (label) => container.querySelector(`[aria-label="${label}"]`)
const change = async (element, value) => {
  await act(async () => {
    const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  })
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-27T12:00:00Z'))
  useAuth.mockReturnValue({ user: { uid: 'asma', email: result.email }, role: 'faculty', loading: false })
  timesheetRequest.mockReset().mockResolvedValue(result)
})
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers() })
describe('My Timesheets', () => {
  it('lets staff retry a failed load', async () => {
    timesheetRequest.mockRejectedValueOnce(new Error('Loading your timesheet took too long.'))
    await render()
    expect(container.textContent).toContain('took too long')
    await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent === 'Try again').click())
    expect(field('Hours 2026-09-14')).toBeTruthy()
    expect(container.textContent).not.toContain('took too long')
  })
  it('opens for faculty and submits corrected hours/comment with a reason', async () => {
    await render()
    expect(field('Hours 2026-09-14')).toBeTruthy()
    await change(field('Hours 2026-09-14'), '7.25')
    await change(field('Comment 2026-09-14'), 'Prep at home')
    await change(field('Reason 2026-09-14'), 'Correcting my missed tap')
    await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent === 'Submit corrections').click())
    expect(timesheetRequest).toHaveBeenCalledWith('save', {
      periodIndex: 2, revision: 0, rows: [{ date: '2026-09-14', hours: 7.25, note: 'Prep at home', reason: 'Correcting my missed tap' }],
    })
    expect(timesheetRequest).toHaveBeenCalledWith('load', { periodIndex: 2 })
  })
  it('does not request staff data for a parent account', async () => {
    useAuth.mockReturnValue({ user: { uid: 'parent', email: 'parent@example.com' }, role: 'parent', loading: false })
    await render()
    expect(container.textContent).toContain('Use your staff account')
    expect(timesheetRequest).not.toHaveBeenCalled()
  })
  it('explains an empty pay period instead of implying the blank sheet is broken', async () => {
    timesheetRequest.mockResolvedValue({ ...result, records: [] })
    await render()
    expect(container.textContent).toContain('No check-ins or submitted corrections were found')
    expect(field('Hours 2026-09-14').value).toBe('')
  })
  it('does not silently treat blank, zero, or unexplained corrections as equivalent', () => {
    const baseline = { hours: [7.5], notes: { '2026-09-14': '' } }
    expect(changedRows([{ date: '2026-09-14', hours: 0, note: '', reason: 'Unpaid day' }], baseline)[0].hours).toBe(0)
    expect(() => changedRows([{ date: '2026-09-14', hours: '', note: '', reason: 'Clear day' }], baseline)).toThrow()
    expect(() => changedRows([{ date: '2026-09-14', hours: 7, note: '', reason: '' }], baseline)).toThrow()
  })
})
