import React from 'react'
import { CContainer, CAlert } from '@coreui/react'

const Forbidden = () => (
  <CContainer className="py-5">
    <CAlert color="danger">
      <h4 className="alert-heading">403 - Forbidden</h4>
      <p>You do not have permission to access this page.</p>
    </CAlert>
  </CContainer>
)

export default Forbidden 