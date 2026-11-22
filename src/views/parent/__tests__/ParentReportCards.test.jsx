// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { writeFileSync } from 'node:fs'

vi.mock('../../../Firebase/firebase', () => ({ firestore: {} }))
vi.mock('../../../Firebase/useAuth', () => ({ default: () => ({ user: authUser }) }))
const authUser = { email: 'sample@tarbiyahlearning.ca' }
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), getDoc: vi.fn() }))
vi.mock('../../../services/parentPortal', () => ({ parentPortal: vi.fn() }))
import { getDoc } from 'firebase/firestore'
import { parentPortal } from '../../../services/parentPortal'
import ParentReportCards from '../ParentReportCards'
import { groupParentReports } from '../parentReportGroups'
import { resetParentFamilyCache } from '../useParentFamily'

const current = { label: '2026-2027', startDate: '2026-09-02' }
const report = (id, extra = {}) => ({
  id, schoolYear: current.label, term: 'term1', type: '1-6-report-card',
  reportCardTypeName: 'Elementary Provincial Report Card', grade: '4',
  createdAt: '2026-11-01', approvedAt: '2026-11-02', url: `https://example.com/${id}.pdf`, ...extra,
})
let root, container
beforeEach(() => {
  vi.resetAllMocks()
  resetParentFamilyCache()
  sessionStorage.clear()
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  getDoc.mockResolvedValue({ exists: () => true, data: () => current })
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})
const sample = { id: 'sample-student', name: 'Sample Student', grade: '4' }
const mockPortal = (byChild, children = [sample]) => parentPortal.mockImplementation(async (action, body) => {
  if (action === 'family') return { children, signedInStudentIds: [children[0].id], earliestAttendanceDate: null }
  if (action === 'reportCards') return { reports: byChild[body.studentId] || [] }
  throw new Error(`unexpected ${action}`)
})
const renderReports = async (records) => {
  mockPortal({ 'sample-student': records })
  await act(async () => root.render(<ParentReportCards />))
}

it('keeps separate years and terms while choosing only the latest revision in each period', () => {
  const groups = groupParentReports([
    report('old-revision'), report('new-revision', { approvedAt: '2026-11-03' }),
    report('term2', { term: 'term2' }),
    report('last-year', { schoolYear: '2025-2026' }),
    report('no-file', { url: '' }),
  ], current)
  expect(groups.map((g) => g.year)).toEqual(['2026-2027', '2025-2026'])
  expect(groups[0].reports.map((r) => r.id)).toEqual(['new-revision', 'term2'])
  expect(groups[1].reports[0].id).toBe('last-year')
})

it('uses stable creation dates for legacy years and leaves undated reports unclassified', () => {
  const groups = groupParentReports([
    report('legacy', { schoolYear: null, createdAt: '2025-11-01', approvedAt: '2026-11-13' }),
    report('unknown', { schoolYear: null, createdAt: null, approvedAt: '2026-11-13' }),
  ], current)
  expect(groups.map((g) => g.year)).toEqual(['2026-2027', '2025-2026', 'unknown'])
  expect(groups[0].reports).toEqual([])
  expect(groups[1].reports[0].id).toBe('legacy')
})

it('shows the current year first and previous years collapsed with both terms available', async () => {
  await renderReports([
    report('current'), report('older-term1', { schoolYear: '2025-2026', grade: '3' }),
    report('older-term2', { schoolYear: '2025-2026', term: 'term2', grade: '3' }),
  ])
  expect(container.querySelector('section').textContent).toContain('2026-2027')
  expect(container.querySelector('section').textContent).toContain('Current school year')
  expect(container.querySelectorAll('details')).toHaveLength(1)
  expect(container.querySelector('details').open).toBe(false)
  expect(container.querySelector('summary').textContent).toContain('2025-2026')
  expect(container.querySelector('details').textContent).toContain('Term 1')
  expect(container.querySelector('details').textContent).toContain('Term 2')
  expect(container.querySelectorAll('a[href]')).toHaveLength(3)
  if (process.env.PARENT_REPORT_QA_FILE) writeFileSync(process.env.PARENT_REPORT_QA_FILE, container.innerHTML)
})

it('shows a current-year empty state even when only last year has reports', async () => {
  await renderReports([report('old-only', { schoolYear: '2025-2026' })])
  expect(container.querySelector('section').textContent).toContain('No report cards have been released for this school year yet.')
  expect(container.querySelector('details').open).toBe(false)
})

it('lists every linked child and shows only the selected child\'s reports', async () => {
  const sibling = { id: 'TLS992671', name: 'Test Student', grade: 'Grade 8' }
  mockPortal({ 'sample-student': [report('mine')], TLS992671: [report('sibling-report', { reportCardTypeName: 'Grade 8 Report' })] }, [sample, sibling])
  await act(async () => root.render(<ParentReportCards />))
  const select = container.querySelector('select')
  expect([...select.options].map((o) => o.textContent)).toEqual(['Sample Student · Grade 4', 'Test Student · Grade 8'])
  expect(container.textContent).not.toContain('Grade 8 Report')
  await act(async () => {
    select.value = 'TLS992671'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  expect(container.textContent).toContain('Grade 8 Report')
  expect(parentPortal).toHaveBeenCalledWith('reportCards', { studentId: 'TLS992671' })
})

it('shows a load error instead of presenting a failed request as no reports', async () => {
  parentPortal.mockImplementation(async (action) => {
    if (action === 'family') return { children: [sample], signedInStudentIds: ['sample-student'] }
    throw new Error('permission-denied')
  })
  await act(async () => root.render(<ParentReportCards />))
  expect(container.textContent).toContain('Unable to load report cards.')
  expect(container.textContent).not.toContain('No report cards')
})
