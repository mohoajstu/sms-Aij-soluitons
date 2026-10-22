import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('../../Firebase/firebase', () => ({ adminAuth: { authStateReady: vi.fn(), currentUser: { getIdToken: vi.fn() } },
  auth: { name: 'teacher-auth' }, actAsRequested: true }))
vi.mock('firebase/auth', () => ({ signInWithCustomToken: vi.fn(), signOut: vi.fn() }))
import { adminAuth, auth } from '../../Firebase/firebase'
import { signInWithCustomToken, signOut } from 'firebase/auth'
import { actAsRequest, startActAs, initializeActAs, endActAs, SESSION_KEY } from '../actAs'
let storage
beforeEach(() => {
  vi.clearAllMocks()
  storage = new Map()
  vi.stubGlobal('sessionStorage', { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) })
  vi.stubGlobal('window', { location: { hash: '', reload: vi.fn() } })
  adminAuth.currentUser.getIdToken.mockResolvedValue('admin-token')
  adminAuth.authStateReady.mockResolvedValue(undefined)
})
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })
const respond = (result) => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => result }))
it('starts with the admin token and stores only a session ID before remounting all screens', async () => {
  respond({ customToken: 'secret', session: { id: 'session-id' } })
  await startActAs('t1')
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer admin-token')
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ action: 'start', profileId: 't1' })
  expect([...storage]).toEqual([[SESSION_KEY, 'session-id']])
  expect(window.location.reload).toHaveBeenCalledOnce()
})
it('resume signs into only the separate teacher auth instance', async () => {
  storage.set(SESSION_KEY, 'session-id')
  respond({ customToken: 'teacher-token', session: { id: 'session-id' } })
  await initializeActAs()
  expect(signInWithCustomToken).toHaveBeenCalledWith(auth, 'teacher-token')
  expect(signInWithCustomToken).not.toHaveBeenCalledWith(adminAuth, expect.anything())
})
it('return removes the local teacher and restores the admin even if the endpoint is offline', async () => {
  storage.set(SESSION_KEY, 'session-id')
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Offline')))
  await expect(endActAs()).rejects.toThrow('Could not connect')
  expect(signOut).toHaveBeenCalledWith(auth)
  expect(signOut).not.toHaveBeenCalledWith(adminAuth)
  expect(storage.has(SESSION_KEY)).toBe(false)
  expect(window.location.reload).toHaveBeenCalledOnce()
})
it('shows authorization failures without mounting a target login', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: 'Super-admin access required.' }) }))
  await expect(initializeActAs()).rejects.toThrow('Super-admin access required.')
  expect(signInWithCustomToken).not.toHaveBeenCalled()
})
it.each(['auth', 'token', 'fetch', 'body'])('bounds a stalled %s without saving credentials', async (stage) => {
  vi.useFakeTimers()
  const pending = () => new Promise(() => {})
  if (stage === 'auth') adminAuth.authStateReady.mockImplementation(pending)
  if (stage === 'token') adminAuth.currentUser.getIdToken.mockImplementation(pending)
  vi.stubGlobal('fetch', vi.fn(stage === 'fetch' ? (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })))
  }) : async () => ({ ok: true, json: stage === 'body' ? pending : async () => ({}) })))
  const request = actAsRequest('list')
  const check = expect(request).rejects.toThrow('took too long')
  await vi.advanceTimersByTimeAsync(20000)
  await check
})
