// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ drafts: [], queries: [] }))
vi.mock('../../../Firebase/firebase', () => ({ firestore: {} }))
vi.mock('firebase/firestore', () => ({
  collection: (_db, name) => name,
  where: (field, op, value) => ({ field, op, value }),
  query: (coll, filter) => ({ coll, filter }),
  doc: (_db, name, id) => ({ path: `${name}/${id}` }),
  getDoc: async (ref) => ({
    exists: () => true,
    data: () => (ref.path === 'systemSettings/schoolYear' ? { label: '2026-2027', startDate: '2026-09-02' } : { defaultTerm: 'term1' }),
  }),
  getDocs: async (q) => {
    state.queries.push(q.filter.value)
    const docs = state.drafts.filter(([, d]) => q.filter.value.includes(d.studentId))
    return { forEach: (fn) => docs.forEach(([id, data]) => fn({ id, data: () => data })) }
  },
}))
vi.mock('../utils/schoolYear', async (orig) => ({
  ...(await orig()),
  fetchSchoolYearSettings: async () => ({ label: '2026-2027', startDate: '2026-09-02' }),
}))
import CourseReportCardsDownload from '../Components/CourseReportCardsDownload'

let root, host
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  state.drafts = []; state.queries = []
  host = document.createElement('div'); document.body.append(host)
})
afterEach(async () => { if (root) await act(async () => root.unmount()); root = null; host.remove(); document.body.innerHTML = '' })

const draft = (studentId, over = {}) => [`${studentId}_${over.reportCardType || '7-8-progress'}_2026-2027_${over.term || 'term1'}`, {
  studentId, studentName: `Student ${studentId}`, reportCardType: '7-8-progress', reportCardTypeName: 'Gr 7-8 Progress',
  schoolYear: '2026-2027', term: 'term1', adminReviewStatus: 'approved', finalPdfUrl: `u/${studentId}`, pdfRenderVersion: 2, ...over,
}]

it('loads the roster in batches of 30 and offers only this term and type, listing students with no report', async () => {
  const roster = Array.from({ length: 31 }, (_, i) => ({ id: `s${i}`, name: `Kid ${i}` }))
  state.drafts = [
    draft('s0'), draft('s1', { adminReviewStatus: 'pending' }), draft('s30'),
    draft('s2', { term: 'term2' }),
    draft('s3', { reportCardType: '7-8-report-card', reportCardTypeName: 'Gr 7-8 Report Card' }),
    draft('outsider'),
  ]
  root = createRoot(host)
  await act(async () => root.render(<CourseReportCardsDownload roster={roster} />))
  await act(async () => { await new Promise((r) => setTimeout(r, 0)) })

  expect(state.queries.map((ids) => ids.length)).toEqual([30, 1])
  const select = host.querySelector('#course-report-type')
  expect([...select.options].map((o) => o.textContent)).toEqual(['Gr 7-8 Progress (3)', 'Gr 7-8 Report Card (1)'])
  const open = [...host.querySelectorAll('button')].find((b) => b.textContent.startsWith('Print or download'))
  expect(open.textContent).toBe('Print or download (2 of 31 approved)')

  await act(async () => open.click())
  expect(document.body.textContent).toContain('Download 2 as ZIP'); expect(document.body.textContent).toContain('Print 2')
  const missing = document.querySelector('[data-testid="no-report"]').textContent
  expect(missing).toContain('28 student(s) in this class have no report of this type')
  expect(missing).toContain('Kid 2')
  expect(missing).not.toContain('Kid 30')
})
