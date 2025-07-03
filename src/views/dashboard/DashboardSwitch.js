// src/views/dashboard/DashboardSwitch.jsx
import React from 'react'
import { CSpinner } from '@coreui/react'
import useAuth from '../../Firebase/useAuth'

// 🟢 swap in the two real pages you already have
const RegularDashboard = React.lazy(() => import('./Dashboard')) // original
const ParentDashboard = React.lazy(() => import('./ParentDashboard')) // parent view

const DashboardSwitch = () => {
  const { role, loading } = useAuth()

  if (loading) return <CSpinner color="primary" />

  return role === 'parent' ? <ParentDashboard /> : <RegularDashboard />
}

export default DashboardSwitch
