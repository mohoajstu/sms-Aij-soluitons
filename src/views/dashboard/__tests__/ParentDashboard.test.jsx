// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'

vi.mock('../../../firebase', () => ({ firestore: {} }))
vi.mock('../../../Firebase/useAuth', () => ({ default: () => ({ user: { email: 'older@tarbiyahlearning.ca' } }) }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), query: vi.fn(), orderBy: vi.fn(), limit: vi.fn(),
  getDocs: vi.fn(async () => ({ docs: [] })),
}))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('../../../services/parentPortal', () => ({ parentPortal: vi.fn() }))
import { parentPortal } from '../../../services/parentPortal'
import ParentDashboard, { attendanceRate } from '../ParentDashboard'
import { resetParentFamilyCache } from '../../parent/useParentFamily'

let root, container
beforeEach(() => {
  resetParentFamilyCache()
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

it('counts late as attended and reports no rate without records', () => {
  expect(attendanceRate([{ status: 'Present' }, { status: 'Late' }, { status: 'Absent' }, { status: 'Excused Absent' }])).toBe(50)
  expect(attendanceRate([])).toBeNull()
})

it('shows every linked child with their own attendance rate', async () => {
  parentPortal.mockImplementation(async (action, body) => {
    if (action === 'family') return { children: [
      { id: 'TLS1', name: 'Older Child', grade: 'Grade 5' },
      { id: 'TLS992671', name: 'Test Student', grade: '8' },
    ], signedInStudentIds: ['TLS1'] }
    return { records: body.studentId === 'TLS1' ? [{ status: 'Present' }] : [{ status: 'Absent' }, { status: 'Present' }] }
  })
  await act(async () => root.render(<ParentDashboard />))
  const cards = [...container.querySelectorAll('.child-card')].map((c) => c.textContent)
  expect(cards).toEqual([
    expect.stringContaining('Older Child'), expect.stringContaining('Test Student'),
  ])
  expect(cards[0]).toContain('Grade 5')
  expect(cards[0]).toContain('100%')
  expect(cards[1]).toContain('Grade 8')
  expect(cards[1]).toContain('50%')
  expect(container.textContent).toContain("Children's Progress")
})
