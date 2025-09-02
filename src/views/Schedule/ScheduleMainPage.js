import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CRow,
  CCol,
  CButtonGroup,
} from '@coreui/react'

const SCHEDULES = [
  { 
    label: 'JK', 
    googleDoc: 'https://docs.google.com/document/d/1lMrZT7c-nWlmmdLpgcG9-buGDICRIflN922XRKFChmc/'
  },
  { 
    label: 'SK (Tr. Rafia)', 
    googleDoc: 'https://docs.google.com/document/d/1lXFMTN9v7WzzQkZmGre8Vq58dYM4rmol-oOc8sNbmdI/'
  },
  { 
    label: 'SK (Tr. Huda)', 
    googleDoc: 'https://docs.google.com/document/d/1G_fqg7yLD4K56P8U4V0GW6Lh_wwI_9Jt_JLbaTrP6TA/'
  },
  { 
    label: 'Grade 1', 
    googleDoc: 'https://docs.google.com/document/d/1PQ9jBuP8UgPuM6brcrR6JnZsYqa0EBncbdpLXva1G_8/'
  },
  { 
    label: 'Grade 2', 
    googleDoc: 'https://docs.google.com/document/d/1fSCREemGLCSUxQZl9kHYkkV26qbaiRL3zF4dt1pGj2c/'
  },
  { 
    label: 'Grade 3', 
    googleDoc: 'https://docs.google.com/document/d/1c3KOlATXo4Z5qx3-tk_-KyHe2S7PVMhmrZFfXxHNqVc/'
  },
  { 
    label: 'Grade 4', 
    googleDoc: 'https://docs.google.com/document/d/1y3-qgdN6nAiiieaTqzc_LHj8cMY7t7G9C4CAtgmTQkk/'
  },
  { 
    label: 'Grade 5', 
    googleDoc: 'https://docs.google.com/document/d/1dIX3MytPwXAaZBWarNpoVOVNvESIxRQHQ53NvNdt3fA/'
  },
  { 
    label: 'Grade 6', 
    googleDoc: 'https://docs.google.com/document/d/14fVZAhVwKsAiF5qre4wmF9fvIygmTxbASWBwBMDLOAc/'
  },
  { 
    label: 'Grade 7', 
    googleDoc: 'https://docs.google.com/document/d/19_opBpSeJ2g-3ZgRU8CfJ9lciB4xq1Az6QMSfepKRbg/'
  },
  { 
    label: 'Grade 8', 
    googleDoc: 'https://docs.google.com/document/d/1OGahzavKhjaw2hA02gFfT1fVW3XvNrOx652Dsn9ghxw/'
  },
]

const ScheduleMainPage = () => {
  const [selected, setSelected] = useState(SCHEDULES[0])

  const googleDocUrl = selected.googleDoc

  // Debug logging when component mounts or selection changes
  useEffect(() => {
    console.log('🔍 ScheduleMainPage Debug Info:')
    console.log('📍 Selected schedule:', selected)
    console.log('📝 Google Doc URL:', googleDocUrl)
  }, [selected, googleDocUrl])

  const handleScheduleSelect = (schedule) => {
    console.log('🔄 Selecting schedule:', schedule)
    setSelected(schedule)
  }

  const handleOpenGoogleDoc = () => {
    console.log('🔗 Opening Google Doc:', googleDocUrl)
    window.open(googleDocUrl, '_blank')
  }

  return (
    <CRow className="justify-content-center mt-4">
      <CCol md={10}>
        <CCard>
          <CCardHeader>
            <h3>School Schedules</h3>
            <div className="mb-2">Click a grade to view its schedule.</div>
            
            {/* Grade Selection Buttons */}
            <CButtonGroup className="mb-3">
              {SCHEDULES.map((s, index) => (
                <CButton
                  key={index}
                  color={selected.label === s.label ? 'primary' : 'secondary'}
                  onClick={() => handleScheduleSelect(s)}
                >
                  {s.label}
                </CButton>
              ))}
            </CButtonGroup>
          </CCardHeader>

          <CCardBody style={{ height: '80vh' }}>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '10px' }}>
                <CButton 
                  color="info" 
                  size="sm"
                  onClick={handleOpenGoogleDoc}
                >
                  🔗 Open in New Tab
                </CButton>
              </div>
              <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: '4px' }}>
                <iframe
                  src={googleDocUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 'none', minHeight: '500px' }}
                  title="Schedule Google Doc"
                  allow="clipboard-write"
                  onLoad={() => console.log('✅ Google Doc iframe loaded')}
                  onError={(e) => console.error('❌ Google Doc iframe error:', e)}
                />
              </div>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default ScheduleMainPage 