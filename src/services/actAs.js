import { signInWithCustomToken, signOut } from 'firebase/auth'
import { adminAuth, auth, actAsRequested } from '../Firebase/firebase'

export const SESSION_KEY = 'sms.actAsSession'
export const SUPER_ADMIN_EMAIL = 'nuralhuda.co@gmail.com'
const endpoint = import.meta.env.DEV
  ? `https://northamerica-northeast1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/actAs`
  : '/api/actAs'
let session = null
export const getActAsSession = () => session
export const isActingAs = () => actAsRequested
export const canActAs = (user) => user?.emailVerified === true && user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL && !actAsRequested

export async function actAsRequest(action, body = {}) {
  const controller = new AbortController()
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error('Timed out'), { name: 'AbortError' }))
      controller.abort()
    }, 20000)
  })
  const request = async () => {
    await adminAuth.authStateReady()
    const token = await adminAuth.currentUser?.getIdToken()
    if (!token) throw new Error('Sign in with your admin account to use Act as.')
    if (controller.signal.aborted) throw Object.assign(new Error('Timed out'), { name: 'AbortError' })
    const response = await fetch(endpoint, { method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...body, action }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.message || 'Act as could not complete. Try again.')
    return result
  }
  try { return await Promise.race([request(), timeout]) } catch (error) {
    if (error.name === 'AbortError') throw new Error('Act as took too long. Check your connection and try again.')
    if (error instanceof TypeError) throw new Error('Could not connect to Act as. Check your connection and try again.')
    throw error
  } finally { clearTimeout(timer) }
}

export async function startActAs(profileId) {
  const result = await actAsRequest('start', { profileId })
  // No custom tokens, refresh tokens or passwords are saved by this feature.
  sessionStorage.setItem(SESSION_KEY, result.session.id)
  window.location.hash = '#/dashboard'
  window.location.reload()
}

export async function initializeActAs() {
  if (!actAsRequested) return null
  const sessionId = sessionStorage.getItem(SESSION_KEY)
  const result = await actAsRequest('resume', { sessionId })
  await signInWithCustomToken(auth, result.customToken)
  session = result.session
  return session
}

export async function endActAs() {
  const sessionId = sessionStorage.getItem(SESSION_KEY)
  try {
    // Clear the teacher locally even when the audit endpoint is offline.
    if (actAsRequested) await signOut(auth)
    if (sessionId) await actAsRequest('end', { sessionId })
  } finally {
    session = null
    sessionStorage.removeItem(SESSION_KEY)
    window.location.hash = '#/dashboard'
    window.location.reload()
  }
}
