// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
const state = vi.hoisted(() => ({ records: new Map(), uid: 'teacher-a', fail: false, users: { 'teacher-a': { uid: 'teacher-a', displayName: 'teacher-a', email: 'a@example.test' }, 'teacher-b': { uid: 'teacher-b', displayName: 'teacher-b', email: 'b@example.test' } } }))
vi.mock('../../../Firebase/firebase', () => ({ firestore: {}, storage: {} }))
vi.mock('../../../Firebase/useAuth', () => ({ default: () => ({ user: state.users[state.uid], role: 'Faculty' }) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('../Components/PDFViewer', () => ({ default: () => null }))
vi.mock('../../../components/StudentSelector', () => ({ default: ({ onStudentSelect }) => <button data-testid="student" onClick={() => onStudentSelect({ id: 'S1', fullName: 'Test Student', grade: 'Jr Kindergarten', schoolId: 'S1' })}>Select test student</button> }))
vi.mock('../Components/KindergartenInitialUI', () => ({ default: ({ formData, onFormDataChange }) => <div>
  <output data-testid="comment">{formData.keyLearning || ''}</output>
  <button data-testid="edit" onClick={() => onFormDataChange({ ...formData, keyLearning: `Edited by ${state.uid}` })}>Edit test comment</button>
</div> }))
vi.mock('../utils/homeroomTeacher', () => ({ getHomeroomTeacherName: async () => 'Test Teacher' }))
vi.mock('../utils/getECE', () => ({ getECEName: async () => '' }))
vi.mock('../utils/syncGradesToCourse', () => ({ syncGradesToCourse: async () => {} }))
vi.mock('firebase/firestore', () => {
  const snapshot = (ref) => ({ id: ref.id, exists: () => state.records.has(ref.path), data: () => state.records.get(ref.path) })
  return {
    doc: (_db, name, id) => ({ id, path: `${name}/${id}` }), collection: (_db, name) => name,
    where: (field, op, value) => ({ field, op, value }), query: (collection, ...filters) => ({ collection, filters }),
    serverTimestamp: () => new Date('2026-10-22T15:00:00Z'),
    getDoc: async (ref) => snapshot(ref),
    getDocs: async (q) => {
      const docs = [...state.records].filter(([path, data]) => path.startsWith(`${q.collection}/`) && q.filters.every(({ field, value }) => data[field] === value))
        .map(([path]) => snapshot({ path, id: path.split('/').at(-1) }))
      return { docs, empty: docs.length === 0, forEach: (fn) => docs.forEach(fn) }
    },
    setDoc: async (ref, data) => state.records.set(ref.path, data),
    updateDoc: async (ref, data) => state.records.set(ref.path, { ...state.records.get(ref.path), ...data }),
    addDoc: vi.fn(), deleteDoc: vi.fn(),
    runTransaction: async (_db, callback) => {
      const writes = []
      await callback({ get: async (ref) => snapshot(ref), set: (ref, data) => writes.push([ref, data]), update: (ref, data) => writes.push([ref, data]) })
      if (state.fail) throw new Error('network interrupted')
      for (const [ref, data] of writes) state.records.set(ref.path, { ...state.records.get(ref.path), ...data })
    },
  }
})
import ReportCard from '../utils'
let root, host
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  state.records.clear(); state.uid = 'teacher-a'; state.fail = false; localStorage.clear()
  state.records.set('systemSettings/schoolYear', { label: '2026-2027', startDate: '2026-09-02' })
  state.records.set('systemSettings/reportCardSms', { defaultTerm: 'term1' })
  vi.stubGlobal('alert', vi.fn()); vi.stubGlobal('confirm', vi.fn(() => true))
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })))
  host = document.createElement('div'); document.body.append(host)
})
afterEach(async () => { if (root) await act(async () => root.unmount()); root = null; host.remove(); vi.unstubAllGlobals() })
const click = async (selector) => { await act(async () => host.querySelector(selector).click()) }
const open = async () => {
  root = createRoot(host)
  await act(async () => root.render(<ReportCard presetReportCardId="kg-initial-observations" />))
  await click('[data-testid="student"]')
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 350)) })
}
const save = async () => {
  const button = [...host.querySelectorAll('button')].find((item) => /Save All/.test(item.textContent))
  if (!button) throw new Error(`Save button missing: ${host.textContent}`)
  await act(async () => button.click())
}
it('saves current-year edits, reopens them for another teacher, and preserves last year', async () => {
  const legacy = { studentId: 'S1', reportCardType: 'kg-initial-observations', uid: 'teacher-a', term: 'term1', schoolYear: '2025-2026', formData: { keyLearning: 'Last year' } }
  state.records.set('reportCardDrafts/old', legacy)
  await open()
  expect(host.querySelector('[data-testid="comment"]').textContent).toBe('')
  await click('[data-testid="edit"]'); await save()
  const path = 'reportCardDrafts/S1_kg-initial-observations_2026-2027_term1'
  expect(state.records.get(path).formData.keyLearning).toBe('Edited by teacher-a')
  expect(state.records.get('reportCardDrafts/old')).toEqual(legacy)
  await act(async () => root.unmount()); root = null; state.uid = 'teacher-b'
  await open()
  expect(host.querySelector('[data-testid="comment"]').textContent).toBe('Edited by teacher-a')
  await click('[data-testid="edit"]'); await save()
  expect(state.records.get(path).formData.keyLearning).toBe('Edited by teacher-b')
  expect(state.records.get(path).contributorIds).toEqual(['teacher-a', 'teacher-b'])
})
it('keeps failed saves on screen and shows success only after retry', async () => {
  await open(); await click('[data-testid="edit"]'); state.fail = true; await save()
  expect(host.textContent).toContain('Not saved: network interrupted')
  expect(host.querySelector('[data-testid="comment"]').textContent).toBe('Edited by teacher-a')
  state.fail = false; await save()
  expect(host.textContent).toContain('Draft saved successfully!')
})
it('keeps Term 2 work out of a fresh Term 1 and saves the two terms independently', async () => {
  const t2path = 'reportCardDrafts/S1_kg-initial-observations_2026-2027_term2'
  state.records.set(t2path, { uid: 'teacher-a', teacherName: 'teacher-a', studentId: 'S1', reportCardType: 'kg-initial-observations',
    term: 'term2', schoolYear: '2026-2027', createdAt: new Date('2026-10-22T15:00:00Z'), formData: { keyLearning: 'Saved Term 2' } })
  await open()
  expect(host.querySelector('[data-testid="comment"]').textContent).toBe('')
  const chooseTerm = async (name) => {
    const tab = [...host.querySelectorAll('.nav-link')].find((item) => item.textContent.trim() === name)
    await act(async () => tab.click())
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 350)) })
  }
  await chooseTerm('Term 2')
  expect(host.querySelector('[data-testid="comment"]').textContent).toBe('Saved Term 2')
  await chooseTerm('Term 1')
  expect(host.querySelector('[data-testid="comment"]').textContent).toBe('')
  await click('[data-testid="edit"]'); await save()
  expect(state.records.get(t2path).formData.keyLearning).toBe('Saved Term 2')
  expect(state.records.get('reportCardDrafts/S1_kg-initial-observations_2026-2027_term1').formData.keyLearning).toBe('Edited by teacher-a')
})
