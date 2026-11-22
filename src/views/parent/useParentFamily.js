import { useCallback, useEffect, useState } from 'react'
import useAuth from '../../Firebase/useAuth'
import { parentPortal } from '../../services/parentPortal'

const SELECTED_KEY = 'sms.parentSelectedChild'
// One family lookup per signed-in account, shared by every parent page.
let cache = { email: null, promise: null }

const readSelected = () => {
  try { return sessionStorage.getItem(SELECTED_KEY) } catch { return null }
}
const writeSelected = (id) => {
  try { sessionStorage.setItem(SELECTED_KEY, id) } catch { /* selection just won't persist */ }
}

export const resetParentFamilyCache = () => { cache = { email: null, promise: null } }

const loadFamily = (email) => {
  if (cache.email !== email || !cache.promise) {
    cache = { email, promise: parentPortal('family') }
    cache.promise.catch(() => { if (cache.email === email) resetParentFamilyCache() })
  }
  return cache.promise
}

export default function useParentFamily() {
  const { user } = useAuth()
  const email = user?.email || null
  const [state, setState] = useState({ loading: true, error: '', family: null })
  const [selectedId, setSelectedId] = useState(readSelected)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!email) return undefined
    let active = true
    setState((prev) => ({ ...prev, loading: true, error: '' }))
    loadFamily(email).then((family) => {
      if (active) setState({ loading: false, error: '', family })
    }).catch((err) => {
      console.error('Failed to load parent family:', err)
      if (!active) return
      const error = err.status === 404
        ? 'No students are linked to this account. Please contact the school.'
        : 'Unable to load your family. Please try again.'
      setState({ loading: false, error, family: null })
    })
    return () => { active = false }
  }, [email, retry])

  const children = state.family?.children || []
  const selected = children.find((c) => c.id === selectedId) ||
    children.find((c) => state.family?.signedInStudentIds?.includes(c.id)) || children[0] || null

  const selectChild = useCallback((id) => {
    setSelectedId(id)
    writeSelected(id)
  }, [])

  return {
    ...state,
    children,
    selected,
    selectChild,
    earliestAttendanceDate: state.family?.earliestAttendanceDate || null,
    retry: () => setRetry((n) => n + 1),
  }
}
