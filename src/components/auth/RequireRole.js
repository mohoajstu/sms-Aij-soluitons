import React from 'react'
import { Navigate } from 'react-router-dom'
import { CSpinner, CAlert } from '@coreui/react'

const RequireRole = ({ role, claims, children, fallback = null }) => {
  // Show loading spinner while claims are being fetched
  if (claims === undefined) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <CSpinner color="primary" />
      </div>
    )
  }

  // If no claims (user not authenticated), redirect to login
  if (!claims) {
    return <Navigate to="/login" replace />
  }

  // Check if user has the required role
  if (claims.role !== role) {
    if (fallback) {
      return fallback
    }
    
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <CAlert color="danger">
          <h4>Access Denied</h4>
          <p>You don't have permission to access this page.</p>
          <p>Your role: <strong>{claims.role || 'none'}</strong></p>
          <p>Required role: <strong>{role}</strong></p>
        </CAlert>
      </div>
    )
  }

  // User has the required role, render the children
  return children
}

export default RequireRole 