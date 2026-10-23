import React, { useEffect, useState } from 'react'
import { CAlert, CButton, CSpinner } from '@coreui/react'
import { actAsRequested } from '../Firebase/firebase'
import { initializeActAs, endActAs } from '../services/actAs'

// Mount no school screens until the teacher identity has been verified.
const ActAsBoundary = ({ children }) => {
  const [ready, setReady] = useState(!actAsRequested)
  const [error, setError] = useState('')
  const [expired, setExpired] = useState(false)
  const [returning, setReturning] = useState(false)
  useEffect(() => {
    if (!actAsRequested) return
    let active = true
    let timer
    initializeActAs().then((session) => {
      if (!active) return
      if (session.expiresAt <= Date.now()) { setExpired(true); return }
      setReady(true)
      timer = setTimeout(() => setExpired(true), session.expiresAt - Date.now())
    }).catch((err) => { if (active) setError(err.message) })
    return () => { active = false; clearTimeout(timer) }
  }, [])
  if (error || expired) return (
    <main className="container py-5">
      <CAlert color="warning">{error || 'Your Act as session has ended.'}</CAlert>
      <CButton color="primary" disabled={returning} onClick={() => {
        setReturning(true)
        endActAs().catch(() => setReturning(false))
      }}>{returning ? 'Returning…' : 'Return to my admin account'}</CButton>
    </main>
  )
  if (!ready) return <main className="p-5 text-center">
    <div className="mb-3" role="status"><CSpinner size="sm" /> Opening teacher view…</div>
    <CButton color="primary" variant="outline" disabled={returning} onClick={() => {
      setReturning(true)
      endActAs().catch(() => setReturning(false))
    }}>{returning ? 'Returning…' : 'Return to my admin account'}</CButton>
  </main>
  return children
}
export default ActAsBoundary
