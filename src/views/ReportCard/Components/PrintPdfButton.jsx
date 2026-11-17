import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { CButton, CSpinner } from '@coreui/react'
import { printPdfUrl } from '../utils/printPdf'

/** Prints a stored report PDF directly, instead of printing the web page. */
const PrintPdfButton = ({ url, label = 'Print', print = printPdfUrl, ...buttonProps }) => {
  const [busy, setBusy] = useState(false)
  const onClick = async () => {
    setBusy(true)
    try {
      await print(url)
    } catch (error) {
      window.alert(`Could not print this report card: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }
  return (
    <CButton color="primary" size="sm" {...buttonProps} onClick={onClick} disabled={!url || busy}>
      {busy ? <CSpinner size="sm" className="me-1" /> : null}
      {busy ? 'Preparing...' : label}
    </CButton>
  )
}

PrintPdfButton.propTypes = {
  url: PropTypes.string,
  label: PropTypes.string,
  print: PropTypes.func,
}

export default PrintPdfButton
