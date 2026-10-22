// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('react-router-dom', async (original) => ({
  ...await original(), useNavigate: () => navigate,
}))
vi.mock('../../../../Firebase/firebase', () => ({ auth: { signOut: vi.fn() }, firestore: {} }))
vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: class {
    addScope() {}
    static credentialFromResult() { return null }
  },
}))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(), collection: vi.fn(), query: vi.fn(), where: vi.fn(),
  getDocs: vi.fn(async () => ({ empty: true, docs: [] })),
  getDoc: vi.fn(async () => ({ exists: () => true, data: () => ({}) })),
  setDoc: vi.fn(), serverTimestamp: vi.fn(() => 'timestamp'),
}))
vi.mock('../../../../utils/userProfile', async (original) => ({
  ...await original(), loadCurrentUserProfile: vi.fn(),
}))
vi.mock('react-hot-toast', () => ({ toast: { error: vi.fn() } }))

import { auth } from '../../../../Firebase/firebase'
import { signInWithPopup } from 'firebase/auth'
import { loadCurrentUserProfile } from '../../../../utils/userProfile'
import StaffLogin from '../StaffLogin'

let container, root
beforeEach(() => {
  vi.clearAllMocks()
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  signInWithPopup.mockResolvedValue({ user: {
    uid: 'admin-uid', email: 'nuralhuda.co@gmail.com', emailVerified: true,
  } })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})
const signIn = async () => {
  await act(async () => root.render(<MemoryRouter><StaffLogin /></MemoryRouter>))
  await act(async () => {
    [...container.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Continue with Google')).click()
  })
}

it('allows an administrator whose canonical admin profile only has primaryRole', async () => {
  loadCurrentUserProfile.mockResolvedValue({
    id: 'TA746708', collection: 'admins', data: { primaryRole: 'SchoolAdmin' },
  })
  await signIn()
  expect(auth.signOut).not.toHaveBeenCalled()
  expect(navigate).toHaveBeenCalledWith('/')
  expect(container.textContent).not.toContain('Access denied')
})

it('continues to reject a parent using an unauthorized staff email domain', async () => {
  loadCurrentUserProfile.mockResolvedValue({
    id: 'parent', collection: 'users', data: { personalInfo: { role: 'Parent' } },
  })
  await signIn()
  expect(auth.signOut).toHaveBeenCalledOnce()
  expect(navigate).not.toHaveBeenCalled()
  expect(container.textContent).toContain('Access denied')
})
