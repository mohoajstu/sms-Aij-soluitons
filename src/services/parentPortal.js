import { auth } from '../Firebase/firebase'

const endpoint = `https://northamerica-northeast1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/parentPortal`

// Every parent-portal read goes through the server, which checks that the
// requested child belongs to the signed-in account's family.
export async function parentPortal(action, body = {}) {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw Object.assign(new Error('Sign in to view your family.'), { status: 401 })
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...body, action }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw Object.assign(new Error(result.message || 'Something went wrong. Please try again.'), { status: response.status })
  return result
}
