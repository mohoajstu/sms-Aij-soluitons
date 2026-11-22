// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'

vi.mock('../../../Firebase/firebase', () => ({ firestore: {} }))
vi.mock('../../../Firebase/useAuth', () => ({ default: () => ({ user: { email: 'test@tarbiyahlearning.ca' } }) }))
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), getDoc: vi.fn() }))
vi.mock('../../../services/parentPortal', () => ({ parentPortal: vi.fn() }))
import { getDoc } from 'firebase/firestore'
import { parentPortal } from '../../../services/parentPortal'
import ParentAttendance, { attendanceSchoolYears } from '../ParentAttendance'
import { resetParentFamilyCache } from '../useParentFamily'

const current = { label: '2026-2027', startDate: '2026-09-02' }
const family = (children) => ({ children, signedInStudentIds: [children[0].id], earliestAttendanceDate: '2025-10-01' })
const row = (date, status) => ({ date, class: 'Test Homeroom', status, note: '' })
let root, container, children
beforeEach(() => {
  vi.resetAllMocks()
  resetParentFamilyCache()
  sessionStorage.clear()
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  children = [{ id: 'test-student', name: 'Test Student', grade: 'Grade 8' }]
  getDoc.mockResolvedValue({ exists: () => true, data: () => current })
  parentPortal.mockImplementation(async (action, body) => {
    if (action === 'family') return family(children)
    if (action === 'attendance') {
      if (body.studentId === 'sibling') return { records: [row('2026-10-05', 'Late')] }
      return { records: body.startDate === current.startDate ? [row('2026-10-01', 'Present')] : [row('2025-10-01', 'Absent')] }
    }
    throw new Error(`unexpected ${action}`)
  })
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})
const attendanceCalls = () => parentPortal.mock.calls.filter(([action]) => action === 'attendance')

it('uses school-year boundaries and configured current start rather than a rolling 60 days', () => {
  expect(attendanceSchoolYears('2025-01-10', current, '2026-11-13')).toEqual([
    { label: '2026-2027', current: true, startDate: '2026-09-02', endDate: '2026-11-13' },
    { label: '2025-2026', current: false, startDate: '2025-09-02', endDate: '2026-09-01' },
    { label: '2024-2025', current: false, startDate: '2024-09-02', endDate: '2025-09-01' },
  ])
  const custom = attendanceSchoolYears('2025-10-01', { label: '2026-2027', startDate: '2026-08-31' }, '2026-11-13')
  expect(custom[0].startDate).toBe('2026-08-31')
  expect(custom[1].endDate).toBe('2026-08-30')
  expect(attendanceSchoolYears(null, current, '2026-11-13')).toHaveLength(1)
})

it('loads the current year from the server, keeps prior years collapsed, and fetches a prior year only once', async () => {
  await act(async () => root.render(<ParentAttendance />))
  expect(container.textContent).toContain('Test Student · Grade 8')
  expect(container.querySelector('select')).toBeNull()
  expect(container.querySelector('section').textContent).toContain('2026-10-01')
  const details = container.querySelector('details')
  expect(details.open).toBe(false)
  expect(details.textContent).toBe('2025-2026')
  expect(attendanceCalls()).toHaveLength(1)
  expect(attendanceCalls()[0][1]).toMatchObject({ studentId: 'test-student', startDate: '2026-09-02' })
  await act(async () => { details.open = true; details.dispatchEvent(new Event('toggle')) })
  expect(details.textContent).toContain('2025-10-01')
  expect(details.textContent).toContain('Absent')
  expect(attendanceCalls()).toHaveLength(2)
  expect(attendanceCalls()[1][1]).toMatchObject({ startDate: '2025-09-02', endDate: '2026-09-01' })
  await act(async () => { details.open = false; details.dispatchEvent(new Event('toggle')) })
  await act(async () => { details.open = true; details.dispatchEvent(new Event('toggle')) })
  expect(attendanceCalls()).toHaveLength(2)
})

it('lets a parent with several children switch, and remembers the choice', async () => {
  children = [...children, { id: 'sibling', name: 'Younger Sibling', grade: '3' }]
  await act(async () => root.render(<ParentAttendance />))
  const select = container.querySelector('select')
  expect([...select.options].map((o) => o.textContent)).toEqual(['Test Student · Grade 8', 'Younger Sibling · Grade 3'])
  expect(select.value).toBe('test-student')
  await act(async () => {
    select.value = 'sibling'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  expect(container.querySelector('section').textContent).toContain('2026-10-05')
  expect(container.querySelector('section').textContent).not.toContain('2026-10-01')
  expect(sessionStorage.getItem('sms.parentSelectedChild')).toBe('sibling')
})

it('keeps the year visible and allows retry after an attendance request fails', async () => {
  const load = parentPortal.getMockImplementation()
  let fail = true
  parentPortal.mockImplementation(async (action, body) => {
    if (action === 'attendance' && fail) {
      fail = false
      throw new Error('network-request-failed')
    }
    return load(action, body)
  })
  await act(async () => root.render(<ParentAttendance />))
  expect(container.textContent).toContain('Unable to load attendance for this school year.')
  expect(container.querySelector('section').textContent).toContain('Current school year')
  await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent === 'Try again').click())
  expect(container.textContent).toContain('2026-10-01')
  expect(container.textContent).not.toContain('Unable to load')
})

it('explains when the account has no linked student', async () => {
  parentPortal.mockRejectedValue(Object.assign(new Error('none'), { status: 404 }))
  await act(async () => root.render(<ParentAttendance />))
  expect(container.textContent).toContain('No students are linked to this account.')
})
