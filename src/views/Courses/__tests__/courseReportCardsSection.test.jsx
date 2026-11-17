// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ role: 'admin', authListener: null }))
vi.mock('../../../Firebase/firebase', () => ({ auth: {}, firestore: {}, storage: {} }))
vi.mock('../../../firebase', () => ({
  auth: { onAuthStateChanged: (cb) => { state.authListener = cb; return () => {} } },
  firestore: {},
}))
vi.mock('../../../services/calendarService', () => ({
  initializeGoogleApi: async () => {}, initializeGIS: async () => {}, authenticate: vi.fn(),
  createEvent: vi.fn(), assignmentToEvent: vi.fn(), isAuthenticated: () => false,
}))
vi.mock('../CourseGrades', () => ({ default: () => null }))
vi.mock('../../ReportCard/utils/schoolYear', async (orig) => ({
  ...(await orig()), fetchSchoolYearSettings: async () => ({ label: '2026-2027', startDate: '2026-09-02' }),
}))
const roster = [{ id: 'TS486239', name: 'Chahayaa Setijoso' }, { id: 'TS726241', name: 'Marwan Damergi' }]
vi.mock('firebase/firestore', () => ({
  doc: (_db, name, id) => ({ path: `${name}/${id}`, id }),
  collection: (_db, name) => name, where: (f, op, value) => ({ value }), query: (c, w) => w,
  updateDoc: vi.fn(), arrayRemove: vi.fn(), deleteField: vi.fn(), serverTimestamp: vi.fn(),
  getDoc: async (ref) => {
    const data = ref.path === 'courses/g3' ? { title: 'Homeroom Grade 3', students: roster, enrolledList: roster.map((s) => s.id), teacher: [] }
      : ref.path.startsWith('users/') ? { role: state.role }
      : ref.path.startsWith('students/') ? { personalInfo: { firstName: 'x' } }
      : ref.path === 'systemSettings/reportCardSms' ? { defaultTerm: 'term1' } : {}
    return { id: ref.id, exists: () => true, data: () => data }
  },
  getDocs: async (q) => ({ forEach: (fn) => q.value.includes('TS486239') && fn({ id: 'd1', data: () => ({
    studentId: 'TS486239', studentName: 'Chahayaa Setijoso', reportCardType: '1-6-progress', reportCardTypeName: 'Gr 1-6 Progress',
    schoolYear: '2026-2027', term: 'term1', adminReviewStatus: 'approved', finalPdfUrl: 'u/1', pdfRenderVersion: 2 }) }) }),
}))
import CourseDetailPage from '../courseDetails'

let root, host
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; host = document.createElement('div'); document.body.append(host) })
afterEach(async () => { await act(async () => root.unmount()); host.remove() })

const mount = async () => {
  root = createRoot(host)
  await act(async () => root.render(<MemoryRouter initialEntries={['/courses/g3']}><Routes>
    <Route path="/courses/:id" element={<CourseDetailPage />} /></Routes></MemoryRouter>))
  await act(async () => { await state.authListener({ uid: 'u1' }) })
  await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
}

it('shows the Report Cards section below the course overview for admins', async () => {
  state.role = 'admin'
  await mount()
  expect(host.textContent).toContain('Homeroom Grade 3')
  expect(host.textContent).toContain('Report Cards')
  expect(host.textContent).toContain('Print or download (1 of 2 approved)')
})

it('hides it from teachers, who can only read their own report drafts', async () => {
  state.role = 'faculty'
  await mount()
  expect(host.textContent).toContain('Homeroom Grade 3')
  expect(host.textContent).not.toContain('Print or download')
})
