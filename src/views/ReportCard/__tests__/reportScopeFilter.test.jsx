// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
vi.mock('../../../Firebase/firebase', () => ({ firestore: {} }))
vi.mock('firebase/firestore', () => ({ doc: (_db, _collection, id) => id,
  getDoc: async (id) => ({ exists: () => true, data: () => id === 'schoolYear'
    ? { label: '2026-2027', startDate: '2026-09-02' } : { defaultTerm: 'term1' } }) }))
import { useReportScope } from '../utils/useReportScope'
import ReportScopeFilter from '../Components/ReportScopeFilter'
const records = [
  { studentName: 'Current T1', schoolYear: '2026-2027', term: 'term1' },
  { studentName: 'Current T2', schoolYear: '2026-2027', term: 'term2' },
  { studentName: 'Previous T1', schoolYear: '2025-2026', term: 'term1' },
  { studentName: 'Legacy uncertain', createdAt: '2026-06-15' },
]
let root, host
const Harness = () => { const scope = useReportScope(records); return <><ReportScopeFilter scope={scope} />
  <ul>{scope.records.map((r) => <li key={r.studentName}>{r.studentName}</li>)}</ul></> }
beforeEach(async () => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; host = document.createElement('div'); document.body.append(host); root = createRoot(host); await act(async () => root.render(<Harness />)) })
afterEach(async () => { await act(async () => root.unmount()); host.remove() })
const select = async (label, value) => {
  const labelNode = [...host.querySelectorAll('label')].find((item) => item.textContent === label)
  const control = document.getElementById(labelNode.htmlFor)
  await act(async () => { control.value = value; control.dispatchEvent(new Event('change', { bubbles: true })) })
}
describe('year/term controls', () => {
  it('starts in current school year and configured term; all terms never mixes years', async () => {
    expect(host.querySelector('ul').textContent).toBe('Current T1')
    await select('Term', 'term2')
    expect(host.querySelector('ul').textContent).toBe('Current T2')
    await select('Term', 'all')
    expect(host.querySelector('ul').textContent).toBe('Current T1Current T2')
  })
  it('lets teachers view previous years and explicitly find records with unrecorded terms', async () => {
    await select('School year', '2025-2026')
    expect(host.querySelector('ul').textContent).toBe('Previous T1')
    await select('Term', 'unknown')
    expect(host.querySelector('ul').textContent).toBe('Legacy uncertain')
    await select('Term', 'term2')
    expect(host.querySelector('ul').textContent).toBe('')
    expect(host.querySelectorAll('select')).toHaveLength(2)
  })
})
