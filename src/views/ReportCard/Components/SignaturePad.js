import React, { useState, useRef } from 'react'
import PropTypes from 'prop-types'
import { CButton, CButtonGroup, CFormInput } from '@coreui/react'
import SignatureCanvas from 'react-signature-canvas'

const SignaturePad = ({ title, onSignatureChange }) => {
  const [mode, setMode] = useState('typed') // 'typed', 'drawn'
  const [typedName, setTypedName] = useState('')
  const signatureCanvasRef = useRef(null)

  const handleModeChange = (newMode) => {
    setMode(newMode)
    // Clear previous signature when mode changes
    if (newMode === 'typed') {
      if (signatureCanvasRef.current) signatureCanvasRef.current.clear()
      onSignatureChange({ type: 'typed', value: typedName })
    } else if (newMode === 'drawn') {
      setTypedName('')
      onSignatureChange({ type: 'drawn', value: null })
    }
  }

  const handleTypedNameChange = (e) => {
    const newName = e.target.value
    setTypedName(newName)
    onSignatureChange({ type: 'typed', value: newName })
  }

  const handleDrawEnd = () => {
    if (signatureCanvasRef.current) {
      const dataUrl = signatureCanvasRef.current.toDataURL('image/png')
      onSignatureChange({ type: 'drawn', value: dataUrl })
    }
  }

  const handleClear = () => {
    if (mode === 'drawn' && signatureCanvasRef.current) {
      signatureCanvasRef.current.clear()
      onSignatureChange({ type: 'drawn', value: null })
    } else if (mode === 'typed') {
      setTypedName('')
      onSignatureChange({ type: 'typed', value: '' })
    }
  }

  return (
    <div className="signature-pad-container mb-4">
      <h6 className="mb-2">{title}</h6>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <CButtonGroup>
          <CButton color="secondary" active={mode === 'typed'} onClick={() => handleModeChange('typed')}>
            Keyboard
          </CButton>
          <CButton color="secondary" active={mode === 'drawn'} onClick={() => handleModeChange('drawn')}>
            Trackpad
          </CButton>
        </CButtonGroup>
        <CButton color="danger" variant="outline" size="sm" onClick={handleClear}>
          Clear
        </CButton>
      </div>

      {mode === 'typed' && (
        <CFormInput
          type="text"
          placeholder="Type your full name"
          value={typedName}
          onChange={handleTypedNameChange}
          style={{ fontFamily: '"Dancing Script", cursive', fontSize: '2rem', height: 'auto' }}
        />
      )}

      {mode === 'drawn' && (
        <div style={{ border: '1px solid #ccc', borderRadius: '4px' }}>
          <SignatureCanvas
            ref={signatureCanvasRef}
            penColor="black"
            canvasProps={{
              width: 500,
              height: 150,
              className: 'signature-canvas',
              style: { width: '100%' },
            }}
            onEnd={handleDrawEnd}
          />
        </div>
      )}
    </div>
  )
}

SignaturePad.propTypes = {
  title: PropTypes.string.isRequired,
  onSignatureChange: PropTypes.func.isRequired,
}

export default SignaturePad 