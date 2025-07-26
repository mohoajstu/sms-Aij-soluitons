import React, { useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CRow,
  CCol,
  CButtonGroup,
  CButtonToolbar,
} from '@coreui/react'

const SCHEDULES = [
  { 
    label: 'JK', 
    file: 'Junior Kindergarten Schedule 2025-2026.pdf',
    googleDoc: 'https://docs.google.com/document/d/1lMrZT7c-nWlmmdLpgcG9-buGDICRIflN922XRKFChmc/edit?usp=sharing'
  },
  { 
    label: 'SK (Tr. Rafia)', 
    file: 'Senior Kindergarten Schedule 2025-2026 (Tr. Rafia).pdf',
    googleDoc: 'https://docs.google.com/document/d/1lXFMTN9v7WzzQkZmGre8Vq58dYM4rmol-oOc8sNbmdI/edit?usp=sharing'
  },
  { 
    label: 'SK (Tr. Huda)', 
    file: 'Senior Kindergarten Schedule 2025-2026 (Tr. Huda).pdf',
    googleDoc: 'https://docs.google.com/document/d/1G_fqg7yLD4K56P8U4V0GW6Lh_wwI_9Jt_JLbaTrP6TA/edit?usp=sharing'
  },
  { 
    label: 'Grade 1', 
    file: 'Grade 1 Schedule 2025-2026.pdf',
    googleDoc: 'https://docs.google.com/document/d/1PQ9jBuP8UgPuM6brcrR6JnZsYqa0EBncbdpLXva1G_8/edit?usp=sharing'
  },
  { 
    label: 'Grade 2', 
    file: 'Grade 2 Schedule 2025-2026.pdf',
    googleDoc: 'https://docs.google.com/document/d/1fSCREemGLCSUxQZl9kHYkkV26qbaiRL3zF4dt1pGj2c/edit?usp=sharing'
  },
  { 
    label: 'Grade 3', 
    file: 'Grade 3 Schedule 25-26.pdf',
    googleDoc: 'https://docs.google.com/document/d/1c3KOlATXo4Z5qx3-tk_-KyHe2S7PVMhmrZFfXxHNqVc/edit?usp=sharing'
  },
  { 
    label: 'Grade 4', 
    file: 'Grade 4 Schedule 25-26.pdf',
    googleDoc: 'https://docs.google.com/document/d/1y3-qgdN6nAiiieaTqzc_LHj8cMY7t7G9C4CAtgmTQkk/edit?usp=sharing'
  },
  { 
    label: 'Grade 5', 
    file: 'Grade 5 Schedule 25-26.pdf',
    googleDoc: 'https://docs.google.com/document/d/1dIX3MytPwXAaZBWarNpoVOVNvESIxRQHQ53NvNdt3fA/edit?usp=sharing'
  },
  { 
    label: 'Grade 6', 
    file: 'Grade 6 Schedule 25-26.pdf',
    googleDoc: 'https://docs.google.com/document/d/14fVZAhVwKsAiF5qre4wmF9fvIygmTxbASWBwBMDLOAc/edit?usp=sharing'
  },
  { 
    label: 'Grade 7', 
    file: 'Grade 7 Schedule 25-26.pdf',
    googleDoc: 'https://docs.google.com/document/d/19_opBpSeJ2g-3ZgRU8CfJ9lciB4xq1Az6QMSfepKRbg/edit?usp=sharing'
  },
  { 
    label: 'Grade 8', 
    file: 'Grade 8 Schedule 25-26.pdf',
    googleDoc: 'https://docs.google.com/document/d/1OGahzavKhjaw2hA02gFfT1fVW3XvNrOx652Dsn9ghxw/edit?usp=sharing'
  },
]

const ScheduleMainPage = () => {
  const [selected, setSelected] = useState(SCHEDULES[0])
  const [viewMode, setViewMode] = useState('pdf') // 'pdf' or 'google'

  const pdfUrl = `../assets/Schedules/${encodeURIComponent(selected.file)}`
  const googleDocUrl = selected.googleDoc

  return (
    <CRow className="justify-content-center mt-4">
      <CCol md={10}>
        <CCard>
          <CCardHeader>
            <h3>School Schedules</h3>
            <div className="mb-2">Click a grade to view its schedule.</div>
            
            {/* Grade Selection Buttons */}
            <CButtonGroup className="mb-3">
              {SCHEDULES.map((s) => (
                <CButton
                  key={s.file}
                  color={selected.file === s.file ? 'primary' : 'secondary'}
                  onClick={() => setSelected(s)}
                >
                  {s.label}
                </CButton>
              ))}
            </CButtonGroup>

            {/* View Mode Toggle */}
            <CButtonToolbar className="mb-3">
              <CButton
                color={viewMode === 'pdf' ? 'success' : 'outline-success'}
                onClick={() => setViewMode('pdf')}
                className="me-2"
              >
                📄 View PDF
              </CButton>
              <CButton
                color={viewMode === 'google' ? 'success' : 'outline-success'}
                onClick={() => setViewMode('google')}
              >
                📝 View Google Doc
              </CButton>
            </CButtonToolbar>
          </CCardHeader>

          <CCardBody style={{ height: '80vh' }}>
            {viewMode === 'pdf' ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '10px' }}>
                  <CButton 
                    color="info" 
                    size="sm"
                    onClick={() => window.open(pdfUrl, '_blank')}
                  >
                    📥 Download PDF
                  </CButton>
                </div>
                <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: '4px' }}>
                  <object
                    data={pdfUrl}
                    type="application/pdf"
                    width="100%"
                    height="100%"
                    style={{ minHeight: '500px' }}
                  >
                    <p>
                      PDF cannot be displayed. 
                      <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                        Click here to download the PDF
                      </a>
                    </p>
                  </object>
                </div>
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '10px' }}>
                  <CButton 
                    color="info" 
                    size="sm"
                    onClick={() => window.open(googleDocUrl, '_blank')}
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
                  />
                </div>
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default ScheduleMainPage 