import { auth } from '../Firebase/firebase'
const endpoint = `https://northamerica-northeast1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/staffTimesheets`
export const timesheetRequest = async (action, body) => {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Sign in to access your timesheet.')
  const response = await fetch(endpoint, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...body }) })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message || 'Timesheet request failed.')
  return result
}
