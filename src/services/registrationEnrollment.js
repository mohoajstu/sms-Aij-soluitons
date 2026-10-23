import { auth } from '../Firebase/firebase'
const endpoint = `https://northamerica-northeast1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/registrationEnrollment`
export async function registrationEnrollment(action, body) {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Sign in to approve an application.')
  const response = await fetch(endpoint, { method: 'POST', headers: {
    'Content-Type': 'application/json', Authorization: `Bearer ${token}`,
  }, body: JSON.stringify({ ...body, action }) })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message || 'Could not complete enrollment. Please retry.')
  return result
}
