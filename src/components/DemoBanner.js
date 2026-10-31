import React from 'react'
import { isDemoMode } from '../utils/demoMode'

/** Always-visible reminder that this is the demo site with fictional data. */
const DemoBanner = () => {
  if (!isDemoMode()) return null
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: 12,
        bottom: 12,
        zIndex: 2000,
        maxWidth: 'calc(100vw - 24px)',
        padding: '6px 12px',
        borderRadius: 999,
        background: '#6f42c1',
        color: '#fff',
        fontSize: 12,
        fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0,0,0,.25)',
        pointerEvents: 'none',
      }}
    >
      DEMO · fictional students, parents and staff · SMS and email are never sent
    </div>
  )
}

export default DemoBanner
