import { auth } from '../Firebase/firebase'
// Hosting forwards production requests to the authenticated function. Local Vite
// development still uses the function directly because it has no Hosting rewrites.
const endpoint = import.meta.env.DEV
  ? `https://northamerica-northeast1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/staffTimesheets`
  : '/api/staffTimesheets'
export const timesheetRequest = async (action, body) => {
  const controller = new AbortController()
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(action === 'load'
        ? 'Loading your timesheet took too long. Check your connection and try again.'
        : 'The request took too long. Reload the saved version to check whether it completed before trying again.'))
      controller.abort()
    }, 30000)
  })
  const request = async () => {
    const token = await auth.currentUser?.getIdToken()
    if (!token) throw new Error('Sign in to access your timesheet.')
    const response = await fetch(endpoint, { method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...body }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.message || 'Timesheet request failed.')
    return result
  }
  try { return await Promise.race([request(), timeout]) }
  catch (error) {
    if (error instanceof TypeError) throw new Error(action === 'load'
      ? 'Could not connect to your timesheet. Check your connection and try again. If it keeps happening, try another network or browser.'
      : 'The connection was interrupted. Reload the saved version to check whether your request completed before trying again.')
    throw error
  }
  finally { clearTimeout(timer) }
}
