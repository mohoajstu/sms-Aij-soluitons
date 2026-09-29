// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
vi.mock('../../../firebase', () => ({ auth: {}, firestore: {} }))
vi.mock('firebase/auth', () => ({ onAuthStateChanged: vi.fn() }))
vi.mock('firebase/firestore', () => ({ collection: (_db, name) => name, doc: (_db, name, id) => ({ name, id }),
  getDocs: vi.fn(), getDoc: vi.fn(), query: vi.fn(), where: vi.fn(), updateDoc: vi.fn(), serverTimestamp: vi.fn() }))
vi.mock('../../../utils/userProfile', async (original) => ({ ...(await original()), loadCurrentUserProfile: vi.fn() }))
import { onAuthStateChanged } from 'firebase/auth'
import { getDocs, getDoc } from 'firebase/firestore'
import { loadCurrentUserProfile } from '../../../utils/userProfile'
import CoursesPage from '../courses'
let root, container, listener
const user = { uid: 'auth-teacher', email: 'teacher@example.com' }
const snap = (id, data) => ({ id, exists: () => true, data: () => data })
beforeEach(() => {
  vi.clearAllMocks()
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  onAuthStateChanged.mockImplementation((_auth, cb) => { listener = cb; return vi.fn() })
  getDocs.mockResolvedValue({ docs: [snap('g7', { title: 'Homeroom Grade 7', archived: false }), snap('old', { title: 'Archived Class', archived: true })] })
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container)
})
afterEach(async () => { await act(async () => root.unmount()); container.remove() })
async function mount() { await act(async () => root.render(<MemoryRouter><CoursesPage /></MemoryRouter>)) }
it('loads admin courses once even when the admin record has no role field', async () => {
  loadCurrentUserProfile.mockResolvedValue({ id: 'admin1', collection: 'admins', data: { primaryRole: 'SchoolAdmin' } })
  await mount()
  await act(async () => listener(user))
  expect(container.textContent).toContain('Homeroom Grade 7')
  expect(onAuthStateChanged).toHaveBeenCalledTimes(1)
  expect(loadCurrentUserProfile).toHaveBeenCalledTimes(1)
  expect(getDocs).toHaveBeenCalledTimes(1)
})
it('starts assigned course reads together and excludes archived courses for faculty', async () => {
  loadCurrentUserProfile.mockResolvedValue({ id: 'teacher1', collection: 'faculty', data: { courses: ['g7', 'old'] } })
  const pending = []
  getDoc.mockImplementation((ref) => new Promise((resolve) => pending.push(() => resolve(snap(ref.id, { title: ref.id === 'g7' ? 'Homeroom Grade 7' : 'Archived Class', archived: ref.id === 'old' })))))
  await mount()
  let loading
  await act(async () => { loading = listener(user); await Promise.resolve() })
  expect(getDoc).toHaveBeenCalledTimes(2)
  await act(async () => { pending.forEach((resolve) => resolve()); await loading })
  expect(container.textContent).toContain('Homeroom Grade 7')
  expect(container.textContent).not.toContain('Archived Class')
})
it('does not display an earlier user response after sign-out', async () => {
  let resolveProfile
  loadCurrentUserProfile.mockReturnValue(new Promise((resolve) => { resolveProfile = resolve }))
  await mount()
  let loading
  await act(async () => { loading = listener(user) })
  await act(async () => listener(null))
  await act(async () => { resolveProfile({ id: 'admin1', collection: 'admins', data: {} }); await loading })
  expect(getDocs).not.toHaveBeenCalled()
  expect(container.textContent).not.toContain('Homeroom Grade 7')
})
