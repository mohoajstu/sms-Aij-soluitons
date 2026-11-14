import React from 'react'
import { CButton, CCard, CCardBody, CContainer } from '@coreui/react'
import useAuth from '../../Firebase/useAuth'

// Shown to a signed-in person whose account is not set up in the school's records.
const NoAccess = () => {
  const { user, signOut } = useAuth()
  return (
    <CContainer className="min-vh-100 d-flex align-items-center justify-content-center">
      <CCard style={{ maxWidth: 520 }}>
        <CCardBody className="text-center p-4">
          <h1 className="h4">Your account isn&apos;t set up yet</h1>
          <p className="text-body-secondary">
            {user?.email ? `${user.email} is` : 'This account is'} not linked to a parent, student
            or staff record at Tarbiyah Learning Academy, so there is nothing to show.
            Please contact the school office and ask them to add or link your account, then
            sign in again.
          </p>
          <CButton color="primary" onClick={signOut}>
            Sign out
          </CButton>
        </CCardBody>
      </CCard>
    </CContainer>
  )
}

export default NoAccess
