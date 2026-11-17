// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { writeFileSync } from 'node:fs'

vi.mock('../../../Firebase/firebase', () => ({ firestore: {} }))
vi.mock('../../../Firebase/useAuth', () => ({ default: () => ({ user: authUser }) }))
const authUser = { email: 'sample@tarbiyahlearning.ca' }
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), query: vi.fn(), where: vi.fn(), doc: vi.fn(),
  getDocs: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn(),
}))
import { getDoc, getDocs } from 'firebase/firestore'
import ParentReportCards from '../ParentReportCards'
import { groupParentReports } from '../parentReportGroups'

const current = { label: '2026-2027', startDate: '2026-09-02' }
const report = (id, extra = {}) => ({
  id, schoolYear: current.label, term: 'term1', type: '1-6-report-card',
  reportCardTypeName: 'Elementary Provincial Report Card', grade: '4',
  createdAt: '2026-11-01', approvedAt: '2026-11-02', url: `https://example.com/${id}.pdf`, ...extra,
})
let root, container
beforeEach(() => {
  vi.resetAllMocks()
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
const renderReports = async (records) => {
  getDocs.mockResolvedValueOnce({ empty: false, docs: [{
    id: 'sample-student', data: () => ({ personalInfo: { firstName: 'Sample', lastName: 'Student' } }),
  }] }).mockResolvedValueOnce({
    empty: records.length === 0,
    forEach: (fn) => records.forEach(({ id, ...data }) => fn({ id, data: () => data })),
  })
  // Empty primary results cause the existing legacy-name lookup.
  if (!records.length) getDocs.mockResolvedValueOnce({ empty: true, forEach: () => {} })
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

it('shows a load error instead of presenting a failed request as no reports', async () => {
  getDocs.mockRejectedValue(new Error('permission-denied'))
  await act(async () => root.render(<ParentReportCards />))
  expect(container.textContent).toContain('Unable to load report cards.')
  expect(container.textContent).not.toContain('No report cards')
})
