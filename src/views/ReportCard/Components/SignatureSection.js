import React from 'react'
import { CCol, CRow } from '@coreui/react'
import SignaturePad from './SignaturePad'

const SignatureSection = ({ formData, onFormDataChange }) => {
  const handleSignatureChange = (fieldName, signatureData) => {
    onFormDataChange({ ...formData, [fieldName]: signatureData })
  }

  return (
    <CRow>
      <CCol md={6}>
        <SignaturePad
          title="Teacher's Signature"
          onSignatureChange={(signatureData) => handleSignatureChange('teacherSignature', signatureData)}
        />
      </CCol>
      <CCol md={6}>
        <SignaturePad
          title="Principal's Signature"
          onSignatureChange={(signatureData) =>
            handleSignatureChange('principalSignature', signatureData)
          }
        />
      </CCol>
    </CRow>
  )
}

export default SignatureSection 