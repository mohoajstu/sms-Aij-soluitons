import React, { useState, useEffect } from 'react'
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

// Import PDF files so they're included in the build
import jkPdf from '/assets/Schedules/Junior Kindergarten Schedule 2025-2026.pdf'
import skRafiaPdf from '/assets/Schedules/Senior Kindergarten Schedule 2025-2026 (Tr. Rafia).pdf'
import skHudaPdf from '/assets/Schedules/Senior Kindergarten Schedule 2025-2026 (Tr. Huda).pdf'
import grade1Pdf from '/assets/Schedules/Grade 1 Schedule 2025-2026.pdf'
import grade2Pdf from '/assets/Schedules/Grade 2 Schedule 2025-2026.pdf'
import grade3Pdf from '/assets/Schedules/Grade 3 Schedule 25-26.pdf'
import grade4Pdf from '/assets/Schedules/Grade 4 Schedule 25-26.pdf'
import grade5Pdf from '/assets/Schedules/Grade 5 Schedule 25-26.pdf'
import grade6Pdf from '/assets/Schedules/Grade 6 Schedule 25-26.pdf'
import grade7Pdf from '/assets/Schedules/Grade 7 Schedule 25-26.pdf'
import grade8Pdf from '/assets/Schedules/Grade 8 Schedule 25-26.pdf'

const SCHEDULES = [
  { 
    label: 'JK', 
    file: 'Junior Kindergarten Schedule 2025-2026.pdf',
    pdfUrl: jkPdf,
    googleDoc: 'https://docs.google.com/document/d/1lMrZT7c-nWlmmdLpgcG9-buGDICRIflN922XRKFChmc/'
  },
  { 
    label: 'SK (Tr. Rafia)', 
    file: 'Senior Kindergarten Schedule 2025-2026 (Tr. Rafia).pdf',
    pdfUrl: skRafiaPdf,
    googleDoc: 'https://docs.google.com/document/d/1lXFMTN9v7WzzQkZmGre8Vq58dYM4rmol-oOc8sNbmdI/'
  },
  { 
    label: 'SK (Tr. Huda)', 
    file: 'Senior Kindergarten Schedule 2025-2026 (Tr. Huda).pdf',
    pdfUrl: skHudaPdf,
    googleDoc: 'https://docs.google.com/document/d/1G_fqg7yLD4K56P8U4V0GW6Lh_wwI_9Jt_JLbaTrP6TA/'
  },
  { 
    label: 'Grade 1', 
    file: 'Grade 1 Schedule 2025-2026.pdf',
    pdfUrl: grade1Pdf,
    googleDoc: 'https://docs.google.com/document/d/1PQ9jBuP8UgPuM6brcrR6JnZsYqa0EBncbdpLXva1G_8/'
  },
  { 
    label: 'Grade 2', 
    file: 'Grade 2 Schedule 2025-2026.pdf',
    pdfUrl: grade2Pdf,
    googleDoc: 'https://docs.google.com/document/d/1fSCREemGLCSUxQZl9kHYkkV26qbaiRL3zF4dt1pGj2c/'
  },
  { 
    label: 'Grade 3', 
    file: 'Grade 3 Schedule 25-26.pdf',
    pdfUrl: grade3Pdf,
    googleDoc: 'https://docs.google.com/document/d/1c3KOlATXo4Z5qx3-tk_-KyHe2S7PVMhmrZFfXxHNqVc/'
  },
  { 
    label: 'Grade 4', 
    file: 'Grade 4 Schedule 25-26.pdf',
    pdfUrl: grade4Pdf,
    googleDoc: 'https://docs.google.com/document/d/1y3-qgdN6nAiiieaTqzc_LHj8cMY7t7G9C4CAtgmTQkk/'
  },
  { 
    label: 'Grade 5', 
    file: 'Grade 5 Schedule 25-26.pdf',
    pdfUrl: grade5Pdf,
    googleDoc: 'https://docs.google.com/document/d/1dIX3MytPwXAaZBWarNpoVOVNvESIxRQHQ53NvNdt3fA/'
  },
  { 
    label: 'Grade 6', 
    file: 'Grade 6 Schedule 25-26.pdf',
    pdfUrl: grade6Pdf,
    googleDoc: 'https://docs.google.com/document/d/14fVZAhVwKsAiF5qre4wmF9fvIygmTxbASWBwBMDLOAc/'
  },
  { 
    label: 'Grade 7', 
    file: 'Grade 7 Schedule 25-26.pdf',
    pdfUrl: grade7Pdf,
    googleDoc: 'https://docs.google.com/document/d/19_opBpSeJ2g-3ZgRU8CfJ9lciB4xq1Az6QMSfepKRbg/'
  },
  { 
    label: 'Grade 8', 
    file: 'Grade 8 Schedule 25-26.pdf',
    pdfUrl: grade8Pdf,
    googleDoc: 'https://docs.google.com/document/d/1OGahzavKhjaw2hA02gFfT1fVW3XvNrOx652Dsn9ghxw/'
  },
]

const ScheduleMainPage = () => {
  const [selected, setSelected] = useState(SCHEDULES[0])
  const [viewMode, setViewMode] = useState('pdf') // 'pdf' or 'google'
  const [pdfLoadError, setPdfLoadError] = useState(false)

  const pdfUrl = selected.pdfUrl
  const googleDocUrl = selected.googleDoc

  // Debug logging when component mounts or selection changes
  useEffect(() => {
    console.log('🔍 ScheduleMainPage Debug Info:')
    console.log('📍 Selected schedule:', selected)
    console.log('📄 PDF URL:', pdfUrl)
    console.log('📝 Google Doc URL:', googleDocUrl)
    console.log('👁️ View mode:', viewMode)
    console.log('🌐 Current domain:', window.location.origin)
    console.log('🔗 Full PDF URL:', window.location.origin + pdfUrl)
    
    // Test if PDF URL is accessible
    fetch(pdfUrl, { method: 'HEAD' })
      .then(response => {
        console.log('✅ PDF fetch response:', response.status, response.statusText)
        if (!response.ok) {
          console.error('❌ PDF not accessible:', response.status, response.statusText)
          setPdfLoadError(true)
        } else {
          console.log('✅ PDF is accessible')
          setPdfLoadError(false)
        }
      })
      .catch(error => {
        console.error('❌ PDF fetch error:', error)
        setPdfLoadError(true)
      })
  }, [selected, pdfUrl, viewMode])

  const handleScheduleSelect = (schedule) => {
    console.log('🔄 Selecting schedule:', schedule)
    setSelected(schedule)
    setPdfLoadError(false) // Reset error state
  }

  const handleViewModeChange = (mode) => {
    console.log('🔄 Changing view mode to:', mode)
    setViewMode(mode)
  }

  const handleDownloadPdf = () => {
    console.log('📥 Downloading PDF:', pdfUrl)
    window.open(pdfUrl, '_blank')
  }

  const handleOpenGoogleDoc = () => {
    console.log('🔗 Opening Google Doc:', googleDocUrl)
    window.open(googleDocUrl, '_blank')
  }

  const handlePdfLoad = () => {
    console.log('✅ PDF loaded successfully')
    setPdfLoadError(false)
  }

  const handlePdfError = (error) => {
    console.error('❌ PDF load error:', error)
    setPdfLoadError(true)
  }

  const handleIframeLoad = () => {
    console.log('✅ PDF iframe loaded successfully')
    setPdfLoadError(false)
  }

  const handleIframeError = (error) => {
    console.error('❌ PDF iframe error:', error)
    setPdfLoadError(true)
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
              {SCHEDULES.map((s) => (
                <CButton
                  key={s.file}
                  color={selected.file === s.file ? 'primary' : 'secondary'}
                  onClick={() => handleScheduleSelect(s)}
                >
                  {s.label}
                </CButton>
              ))}
            </CButtonGroup>

            {/* View Mode Toggle */}
            <CButtonToolbar className="mb-3">
              <CButton
                color={viewMode === 'pdf' ? 'success' : 'outline-success'}
                onClick={() => handleViewModeChange('pdf')}
                className="me-2"
              >
                📄 View PDF
              </CButton>
              <CButton
                color={viewMode === 'google' ? 'success' : 'outline-success'}
                onClick={() => handleViewModeChange('google')}
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
                    onClick={handleDownloadPdf}
                  >
                    📥 Download PDF
                  </CButton>
                  {pdfLoadError && (
                    <span style={{ color: 'red', marginLeft: '10px' }}>
                      ⚠️ PDF load error detected
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: '4px' }}>
                  <iframe
                    src={pdfUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 'none', minHeight: '500px' }}
                    title="Schedule PDF"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                  >
                    <embed
                      src={pdfUrl}
                      type="application/pdf"
                      width="100%"
                      height="100%"
                      style={{ minHeight: '500px' }}
                    />
                    <p>
                      PDF cannot be displayed. 
                      <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                        Click here to download the PDF
                      </a>
                    </p>
                  </iframe>
                </div>
              </div>
            ) : (
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
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default ScheduleMainPage 