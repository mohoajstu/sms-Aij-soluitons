import React, { useState } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilDollar, cilUser, cilEnvelopeClosed, cilCalendar } from '@coreui/icons'

const PaymentModal = ({ application, onClose, onPaymentUpdate }) => {
  const [paymentStatus, setPaymentStatus] = useState(application.paymentStatus)
  const [paymentAmount, setPaymentAmount] = useState(
    application.paymentAmount ? application.paymentAmount.toString() : '',
  )

  const handleSave = () => {
    const amount = paymentAmount ? parseFloat(paymentAmount) : 0
    onPaymentUpdate(application.id, paymentStatus, amount)
    onClose()
  }

  return (
    <CModal visible={true} onClose={onClose}>
      <CModalHeader>
        <CModalTitle>
          <CIcon icon={cilDollar} className="me-2" />
          Payment Management
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="space-y-6">
          {/* Application Info */}
          <div className="bg-light p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <CIcon icon={cilUser} className="text-secondary" />
              <span className="font-weight-bold">{application.studentName}</span>
            </div>
            <div className="flex items-center gap-2">
              <CIcon icon={cilEnvelopeClosed} className="text-secondary" />
              <span className="text-sm">{application.parentEmail}</span>
            </div>
            <div className="flex items-center gap-2">
              <CIcon icon={cilCalendar} className="text-secondary" />
              <span className="text-sm">Application ID: {application.id}</span>
            </div>
          </div>

          {/* Payment Status */}
          <div className="mb-3">
            <CFormLabel htmlFor="payment-status">Payment Status</CFormLabel>
            <CFormSelect
              id="payment-status"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </CFormSelect>
          </div>

          {/* Payment Amount */}
          <div className="mb-3">
            <CFormLabel htmlFor="payment-amount">Payment Amount ($)</CFormLabel>
            <CFormInput
              id="payment-amount"
              type="number"
              placeholder="0.00"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          {/* Current Status Display */}
          <div className="p-3 bg-light rounded-lg">
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-sm font-weight-bold">Current Status:</span>
              <CBadge color={application.paymentStatus === 'completed' ? 'success' : 'warning'}>
                {application.paymentStatus}
              </CBadge>
            </div>
            {application.paymentAmount && (
              <div className="d-flex justify-content-between align-items-center mt-2">
                <span className="text-sm font-weight-bold">Current Amount:</span>
                <span className="text-sm">${application.paymentAmount}</span>
              </div>
            )}
          </div>
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={handleSave}>
          Update Payment
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default PaymentModal 