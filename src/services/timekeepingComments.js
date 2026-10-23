import { auth } from '../Firebase/firebase'

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
const ENDPOINT = `https://northamerica-northeast1-${projectId}.cloudfunctions.net/interpretTimekeepingComments`

export const interpretTimekeepingComments = async (records) => {
  const comments = records
    .filter((record) => typeof record.notes === 'string' && record.notes.trim())
    .map((record) => ({ id: record.id, note: record.notes.trim() }))
  if (!comments.length) return []
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Sign in again to interpret timekeeping notes.')

  const entries = []
  for (let offset = 0; offset < comments.length; offset += 100) {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ comments: comments.slice(offset, offset + 100) }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message || 'Could not interpret timekeeping notes.')
    if (!Array.isArray(body.entries)) throw new Error('Invalid timekeeping interpretation response.')
    entries.push(...body.entries)
  }
  return entries
}
