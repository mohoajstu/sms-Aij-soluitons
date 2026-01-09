import React, { useState } from 'react'
import {
  CContainer,
  CRow,
  CCol,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
} from '@coreui/react'
import AttendanceSmsSettings from '../attendance/AttendanceSmsSettings'
import ReportCardSmsSettings from './ReportCardSmsSettings'
import RegistrationSettings from './RegistrationSettings'
import useAuth from '../../Firebase/useAuth'

/**
 * Admin SMS Settings Page
 * Consolidates SMS Attendance Settings and Report Cards Settings
 */
const SmsSettings = () => {
  const { role } = useAuth()
  const [activeTab, setActiveTab] = useState(0)

  // Only admins should access this page
  if (role?.toLowerCase() !== 'admin') {
    return (
      <CContainer>
        <div className="alert alert-danger">Access denied. Admin only.</div>
      </CContainer>
    )
  }

  return (
    <CContainer fluid>
      <h2 className="mb-4">SMS Settings</h2>
      
      <CNav variant="tabs" role="tablist">
        <CNavItem>
          <CNavLink
            active={activeTab === 0}
            onClick={() => setActiveTab(0)}
            style={{ cursor: 'pointer' }}
          >
            Attendance SMS
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink
            active={activeTab === 1}
            onClick={() => setActiveTab(1)}
            style={{ cursor: 'pointer' }}
          >
            Report Cards
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink
            active={activeTab === 2}
            onClick={() => setActiveTab(2)}
            style={{ cursor: 'pointer' }}
          >
            Registration
          </CNavLink>
        </CNavItem>
      </CNav>

      <CTabContent>
        <CTabPane visible={activeTab === 0}>
          <div className="mt-4">
            <AttendanceSmsSettings />
          </div>
        </CTabPane>
        <CTabPane visible={activeTab === 1}>
          <div className="mt-4">
            <ReportCardSmsSettings />
          </div>
        </CTabPane>
        <CTabPane visible={activeTab === 2}>
          <div className="mt-4">
            <RegistrationSettings />
          </div>
        </CTabPane>
      </CTabContent>
    </CContainer>
  )
}

export default SmsSettings

