// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'

vi.mock('../../../Firebase/firebase', () => ({ firestore: {} }))
vi.mock('../../../Firebase/useAuth', () => ({ default: () => ({ user: { email: 'test@tarbiyahlearning.ca' } }) }))
vi.mock('firebase/firestore', () => ({
  collection: (_db, name) => name,
  query: (name, ...filters) => ({ name, filters }),
  where: (field, op, value) => ({ field, op, value }),
  documentId: () => '__name__', orderBy: () => ({ oldest: true }), limit: () => ({}),
  doc: vi.fn(), getDoc: vi.fn(), getDocs: vi.fn(), setDoc: vi.fn(),
}))
import { getDoc, getDocs } from 'firebase/firestore'
import ParentAttendance, { attendanceSchoolYears } from '../ParentAttendance'

const current = { label: '2026-2027', startDate: '2026-09-02' }
const snapshot = (docs) => ({ docs, empty: docs.length === 0, forEach: (fn) => docs.forEach(fn) })
const daily = (id, status, studentId = 'test-student') => ({ id, data: () => ({
  date: id, courses: [{ courseTitle: 'Test Homeroom', students: [{ studentId, status }] }],
}) })
let root, container
beforeEach(() => {
  vi.resetAllMocks()
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  getDoc.mockResolvedValue({ exists: () => true, data: () => current })
  getDocs.mockImplementation(async ({ name, filters }) => {
    if (name === 'students') return snapshot([{ id: 'test-student', data: () => ({ personalInfo: { firstName: 'Test', lastName: 'Student' } }) }])
    if (filters.some((filter) => filter.oldest)) return snapshot([daily('2025-10-01', 'Present')])
    const start = filters.find((filter) => filter.op === '>=').value
    return snapshot(start === current.startDate
      ? [daily('2026-10-01', 'Present'), daily('2026-10-02', 'Private other child', 'other-student')]
      : [daily('2025-10-01', 'Absent')])
  })
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

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

it('loads the current year, keeps prior years collapsed, and fetches a prior year only once when opened', async () => {
  await act(async () => root.render(<ParentAttendance />))
  expect(container.querySelector('section').textContent).toContain('2026-2027')
  expect(container.querySelector('section').textContent).toContain('2026-10-01')
  expect(container.textContent).not.toContain('Private other child')
  const details = container.querySelector('details')
  expect(details.open).toBe(false)
  expect(details.textContent).toBe('2025-2026')
  const yearQueries = () => getDocs.mock.calls.filter(([q]) => q.filters.some((f) => f.op === '>='))
  expect(yearQueries()).toHaveLength(1)
  await act(async () => {
    details.open = true
    details.dispatchEvent(new Event('toggle'))
  })
  expect(details.textContent).toContain('2025-10-01')
  expect(details.textContent).toContain('Absent')
  expect(yearQueries()).toHaveLength(2)
  expect(yearQueries()[1][0].filters).toContainEqual({ field: '__name__', op: '<=', value: '2026-09-01' })
  await act(async () => { details.open = false; details.dispatchEvent(new Event('toggle')) })
  await act(async () => { details.open = true; details.dispatchEvent(new Event('toggle')) })
  expect(yearQueries()).toHaveLength(2)
})

it('keeps the year visible and allows retry after an attendance request fails', async () => {
  const load = getDocs.getMockImplementation()
  let fail = true
  getDocs.mockImplementation(async (q) => {
    if (q.filters.some((f) => f.op === '>=') && fail) {
      fail = false
      throw new Error('network-request-failed')
    }
    return load(q)
  })
  await act(async () => root.render(<ParentAttendance />))
  expect(container.textContent).toContain('Unable to load attendance for this school year.')
  expect(container.querySelector('section').textContent).toContain('Current school year')
  await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent === 'Try again').click())
  expect(container.textContent).toContain('2026-10-01')
  expect(container.textContent).not.toContain('Unable to load')
})
