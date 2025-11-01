import React from 'react'
import { CButton, CSpinner, CLink } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSave } from '@coreui/icons'
import PropTypes from 'prop-types'

/**
 * Reusable Save Button component for report card sections
 */
const SaveButton = ({
  onSave,
  isSaving,
  saveMessage,
  disabled,
  className = '',
  size = 'sm',
  variant = 'outline',
  color = 'success',
  asLink = false, // New prop to render as link instead of button
}) => {
  const buttonContent = isSaving ? (
    <>
      <CSpinner size="sm" />
      Saving...
    </>
  ) : (
    <>
      <CIcon icon={cilSave} size="sm" />
      Save Draft
    </>
  )

  return (
    <div className={`d-flex align-items-center gap-2 ${className}`}>
      {asLink ? (
        <CLink
          as="span"
          className={`btn btn-${color} btn-${variant} btn-${size} d-flex align-items-center gap-1`}
          onClick={onSave}
          style={{ cursor: disabled || isSaving ? 'not-allowed' : 'pointer', opacity: disabled || isSaving ? 0.6 : 1 }}
        >
          {buttonContent}
        </CLink>
      ) : (
        <CButton
          color={color}
          variant={variant}
          size={size}
          onClick={onSave}
          disabled={disabled || isSaving}
          className="d-flex align-items-center gap-1"
        >
          {buttonContent}
        </CButton>
      )}

      {saveMessage && (
        <small
          className={`${
            saveMessage.includes('success') ? 'text-success' : 'text-danger'
          } fw-medium`}
        >
          {saveMessage}
        </small>
      )}
    </div>
  )
}

SaveButton.propTypes = {
  onSave: PropTypes.func.isRequired,
  isSaving: PropTypes.bool,
  saveMessage: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  size: PropTypes.string,
  variant: PropTypes.string,
  color: PropTypes.string,
  asLink: PropTypes.bool,
}

export default SaveButton
