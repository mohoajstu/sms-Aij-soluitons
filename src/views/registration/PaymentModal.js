import React, { useState, useEffect } from 'react'
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
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilDollar, cilUser, cilEnvelopeClosed, cilCalendar, cilSave, cilX } from '@coreui/icons'
import { doc, updateDoc } from 'firebase/firestore'
import { firestore } from 'src/firebase'

const PaymentModal = ({ application, onClose, onPaymentUpdate }) => {
  const [paymentStatus, setPaymentStatus] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (application && application.payment) {
      setPaymentStatus(application.payment.status || 'pending')
      setPaymentAmount(application.payment.amount || '')
    }
  }, [application])

  const renderStatusBadge = () => {
    const status = application.payment?.status || 'n/a'

    if (status === 'completed') {
      return (
        <CBadge color="dark" shape="rounded-pill" className="px-3 py-1">
          Completed
        </CBadge>
      )
    }

    if (status === 'pending') {
      return (
        <CBadge
          color="light"
          className="text-secondary border border-secondary px-3 py-1 rounded-pill"
        >
          Pending
        </CBadge>
      )
    }

    return (
      <CBadge color="secondary" shape="rounded-pill" className="px-3 py-1">
        N/A
      </CBadge>
    )
  }

  const handlePayment = async () => {
    if (!application || !application.id) return
    setIsSaving(true)

    const newPaymentData = {
      status: paymentStatus,
      amount: Number(paymentAmount) || 0,
    }

    try {
      const appDocRef = doc(firestore, 'registrations', application.id)
      await updateDoc(appDocRef, {
        payment: newPaymentData,
      })

      // Update parent state
      onPaymentUpdate(application.id, newPaymentData)
      onClose()
    } catch (error) {
      console.error('Error updating payment:', error)
      alert('Failed to update payment details.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!application) return null

  return (
    <CModal visible={true} onClose={onClose}>
      <CModalHeader>
        <CModalTitle>
          <CIcon icon={cilDollar} className="me-2" />
          Payment Management
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="p-3 mb-4 bg-light rounded">
          <div className="d-flex align-items-center mb-2">
            <CIcon icon={cilUser} className="me-3" />
            <span>{application.studentName}</span>
          </div>
          <div className="d-flex align-items-center mb-2">
            <CIcon icon={cilEnvelopeClosed} className="me-3" />
            <span>{application.contact?.primaryEmail || application.parentEmail}</span>
          </div>
          <div className="d-flex align-items-center">
            <CIcon icon={cilCalendar} className="me-3" />
            <span>Application ID: {application.id}</span>
          </div>
        </div>

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

        <div className="mb-3">
          <CFormLabel htmlFor="payment-amount">Payment Amount ($)</CFormLabel>
          <CInputGroup className="mb-3">
            <CInputGroupText>$</CInputGroupText>
            <CFormInput
              id="payment-amount"
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </CInputGroup>
        </div>

        <div className="mt-4 p-3 bg-light rounded d-flex justify-content-between align-items-center">
          <span className="fw-semibold">Current Status:</span>
          {renderStatusBadge()}
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={handlePayment} disabled={isSaving}>
          <CIcon icon={cilSave} className="me-2" />
          {isSaving ? 'Saving...' : 'Save Payment'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default PaymentModal 