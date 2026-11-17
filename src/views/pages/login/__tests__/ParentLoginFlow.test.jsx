// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ auth: { user: null, loading: false } }))
vi.mock('react-router-dom', async (original) => {
  const router = await original()
  return {
    ...router,
    HashRouter: ({ children }) => <router.MemoryRouter initialEntries={['/login/parent']}>{children}</router.MemoryRouter>,
  }
})
vi.mock('../../../../Firebase/useAuth', () => ({ default: () => state.auth }))
vi.mock('../../../../Firebase/firebase', () => ({
  auth: { signOut: vi.fn() }, firestore: {},
}))
vi.mock('../../../../services/actAs', () => ({ isActingAs: () => false }))
vi.mock('../../../../layout/DefaultLayout', () => ({ default: () => <div>Signed-in dashboard</div> }))
vi.mock('../../home/home', () => ({ default: () => <div>Public home</div> }))
vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(), GoogleAuthProvider: class {
    setCustomParameters(parameters) { this.customParameters = parameters }
  },
}))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), query: vi.fn(), where: vi.fn(), doc: vi.fn(),
  getDocs: vi.fn(), setDoc: vi.fn(), serverTimestamp: () => 'timestamp',
}))

import App from '../../../../App'
import { auth } from '../../../../Firebase/firebase'
import { signInWithPopup } from 'firebase/auth'
import { getDocs, setDoc } from 'firebase/firestore'
import '../ParentLogin'

let root, container
const user = { uid: 'parent-uid', email: 'child@tarbiyahlearning.ca' }
const deferred = () => {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}
const render = async () => {
  await act(async () => {
    root.render(<App />)
    await vi.dynamicImportSettled()
  })
}
const clickLogin = async () => {
  await vi.waitFor(async () => {
    await act(async () => { await vi.dynamicImportSettled() })
    expect(container.textContent).toContain('Sign in with Google')
  }, { timeout: 3000 })
  await act(async () => {
    [...container.querySelectorAll('button')].find((b) => b.textContent.includes('Sign in with Google')).click()
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  state.auth = { user: null, loading: false }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

it('keeps parent login mounted across auth loading and preserves a student-not-found error after sign-out', async () => {
  const popup = deferred(), students = deferred()
  signInWithPopup.mockReturnValue(popup.promise)
  getDocs.mockReturnValue(students.promise)
  auth.signOut.mockImplementation(async () => {
    state.auth = { user: null, loading: false }
    root.render(<App />)
  })
  await render()
  await clickLogin()
  state.auth = { user, loading: true }
  await render()
  expect(container.textContent).toContain('Signing In...')
  await act(async () => popup.resolve({ user }))
  state.auth = { user, loading: false }
  await render()
  expect(container.textContent).toContain('Signing In...')
  await act(async () => students.resolve({ empty: true, docs: [] }))
  expect(container.textContent).toContain('No student found with email: child@tarbiyahlearning.ca')
  expect(container.textContent).not.toContain('Public home')
  expect(setDoc).not.toHaveBeenCalled()
})

it('does not enter the dashboard until the student profile write completes', async () => {
  const popup = deferred(), write = deferred()
  signInWithPopup.mockReturnValue(popup.promise)
  getDocs.mockResolvedValue({ empty: false, docs: [{ id: 'test-student', data: () => ({}) }] })
  setDoc.mockReturnValue(write.promise)
  await render()
  await clickLogin()
  state.auth = { user, loading: false }
  await render()
  await act(async () => popup.resolve({ user }))
  expect(setDoc).toHaveBeenCalledOnce()
  expect(container.textContent).not.toContain('Signed-in dashboard')
  await act(async () => { write.resolve(); await vi.dynamicImportSettled() })
  await vi.waitFor(() => expect(container.textContent).toContain('Signed-in dashboard'), { timeout: 3000 })
})

it('keeps a profile-write failure visible instead of silently redirecting', async () => {
  signInWithPopup.mockResolvedValue({ user })
  getDocs.mockResolvedValue({ empty: false, docs: [{ id: 'test-student', data: () => ({}) }] })
  setDoc.mockRejectedValue(new Error('Missing or insufficient permissions.'))
  await render()
  await clickLogin()
  state.auth = { user, loading: false }
  await render()
  expect(container.textContent).toContain('Missing or insufficient permissions.')
})

it('requests the school account chooser on every attempt and keeps personal-account rejection on screen', async () => {
  const personalUser = { uid: 'personal-uid', email: 'parent@gmail.com' }
  signInWithPopup.mockResolvedValue({ user: personalUser })
  auth.signOut.mockImplementation(async () => {
    state.auth = { user: null, loading: false }
    root.render(<App />)
  })
  await render()
  await clickLogin()
  expect(signInWithPopup.mock.calls[0][1].customParameters).toEqual({
    prompt: 'select_account', hd: 'tarbiyahlearning.ca',
  })
  expect(auth.signOut).toHaveBeenCalledOnce()
  expect(getDocs).not.toHaveBeenCalled()
  expect(setDoc).not.toHaveBeenCalled()
  expect(container.textContent).toContain('Personal accounts cannot access this portal.')
  expect(container.textContent).not.toContain('Public home')
  // Google must be asked again even after a previous choice or rejection.
  signInWithPopup.mock.calls[0][1].customParameters = {}
  await clickLogin()
  expect(signInWithPopup).toHaveBeenCalledTimes(2)
  expect(signInWithPopup.mock.calls[1][1].customParameters.prompt).toBe('select_account')
})
