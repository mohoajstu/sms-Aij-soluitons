import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updatePassword } from 'firebase/auth'
import { doc, updateDoc, getFirestore } from 'firebase/firestore'
import { auth } from '../../../Firebase/firebase'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CForm,
  CFormInput,
  CAlert,
} from '@coreui/react'

const ChangePassword = () => {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const user = auth.currentUser
    if (!user) {
      setError('Not authenticated. Please log in again.')
      return
    }

    setLoading(true)
    try {
      await updatePassword(user, newPassword)
      // Flip the flag off in Firestore
      const db = getFirestore()
      await updateDoc(doc(db, 'users', user.uid), { mustChangePassword: false })
      setSuccess('Password changed successfully!')
      setTimeout(() => navigate('/'), 800)
    } catch (err) {
      console.error('Failed to change password:', err)
      setError(err.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <CCard style={{ maxWidth: 480, width: '100%' }}>
        <CCardHeader>
          <h4 className="mb-0">Change Password</h4>
        </CCardHeader>
        <CCardBody>
          {error && (
            <CAlert color="danger" className="mb-3">
              {error}
            </CAlert>
          )}
          {success && (
            <CAlert color="success" className="mb-3">
              {success}
            </CAlert>
          )}
          <CForm onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">New Password</label>
              <CFormInput
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Enter a new password"
              />
            </div>
            <div className="mb-4">
              <label className="form-label">Confirm Password</label>
              <CFormInput
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Re-enter the new password"
              />
            </div>
            <div className="d-flex justify-content-end gap-2">
              <CButton color="secondary" type="button" onClick={() => navigate('/')} disabled={loading}>
                Cancel
              </CButton>
              <CButton color="primary" type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Password'}
              </CButton>
            </div>
          </CForm>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default ChangePassword


