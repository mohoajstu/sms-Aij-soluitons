import React, { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { CButton, CAlert } from '@coreui/react'
import { auth } from '../../../Firebase/firebase'
import { isDemoMode } from '../../../utils/demoMode'
import accounts from '../../../config/demoAccounts.json'

/** One-click sign-in for the synthetic demo accounts. Renders nothing outside demo mode. */
const DemoAccounts = ({ onSignedIn }) => {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  if (!isDemoMode()) return null

  const signIn = async (account) => {
    setError('')
    setBusy(account.email)
    try {
      await signInWithEmailAndPassword(
        auth,
        account.email,
        import.meta.env.VITE_DEMO_PASSWORD || '',
      )
      onSignedIn?.()
    } catch (err) {
      setError(
        'Demo sign-in failed. Has the demo data been seeded? (' + (err.code || err.message) + ')',
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-4 pt-3 border-top" data-testid="demo-accounts">
      <h6 className="mb-1">Demo accounts</h6>
      <p className="text-body-secondary small mb-2">
        Everything here is fictional. Pick a role to explore it.
      </p>
      {error && <CAlert color="danger">{error}</CAlert>}
      <div className="d-grid gap-2">
        {accounts.map((account) => (
          <CButton
            key={account.email}
            color="secondary"
            variant="outline"
            className="text-start"
            disabled={!!busy}
            onClick={() => signIn(account)}
          >
            <strong>{account.label}</strong>
            <div className="small text-body-secondary">{account.description}</div>
          </CButton>
        ))}
      </div>
    </div>
  )
}

export default DemoAccounts
