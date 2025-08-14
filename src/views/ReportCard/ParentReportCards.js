import React, { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CAlert,
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CBadge,
  CListGroup,
  CListGroupItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilDescription,
  cilDownload,
  cilCalendar,
  cilInfo,
  cilWarning,
} from '@coreui/icons'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { ref, getDownloadURL } from 'firebase/storage'
import { firestore, storage } from '../../Firebase/firebase'
import useAuth from '../../Firebase/useAuth'

const ParentReportCards = () => {
  const { selectedChild } = useOutletContext()
  const { canAccessStudent } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [reportCards, setReportCards] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const loadReportCards = async () => {
      if (!selectedChild) {
        setLoading(false)
        return
      }

      // Check if user has access to this child
      if (!canAccessStudent(selectedChild.id)) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        // Query report cards for the selected child from the per-student subcollection
        const reportCardsQuery = query(
          collection(firestore, `students/${selectedChild.id}/reportCards`),
          orderBy('createdAt', 'desc')
        )
        
        const reportCardsSnapshot = await getDocs(reportCardsQuery)
        const cards = reportCardsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        }))
        
        setReportCards(cards)
        
      } catch (error) {
        console.error('Error loading report cards:', error)
      } finally {
        setLoading(false)
      }
    }

    loadReportCards()
  }, [selectedChild, canAccessStudent])

  const handleViewReport = async (report) => {
    setSelectedReport(report)
    setPdfLoading(true)
    setShowModal(true)
    
    try {
      // Get secure download URL from per-student storage path
      const fileRef = ref(storage, `reportCards/${selectedChild.id}/${report.fileName}`)
      const url = await getDownloadURL(fileRef)
      setPdfUrl(url)
    } catch (error) {
      console.error('Error loading PDF:', error)
      setPdfUrl('')
    } finally {
      setPdfLoading(false)
    }
  }

  const handleDownload = async (report) => {
    try {
      const fileRef = ref(storage, `reportCards/${selectedChild.id}/${report.fileName}`)
      const url = await getDownloadURL(fileRef)
      
      // Create a temporary link to download the file
      const link = document.createElement('a')
      link.href = url
      link.download = `${selectedChild.name}_${report.title}_ReportCard.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading report card:', error)
    }
  }

  const getTermBadgeColor = (term) => {
    switch (term?.toLowerCase()) {
      case 'term 1':
      case 'fall':
        return 'primary'
      case 'term 2':
      case 'winter':
        return 'info'
      case 'term 3':
      case 'spring':
        return 'success'
      case 'final':
      case 'year end':
        return 'warning'
      default:
        return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <CSpinner color="primary" />
      </div>
    )
  }

  if (!selectedChild) {
    return (
      <CAlert color="info">
        <CIcon icon={cilInfo} className="me-2" />
        Please select a child to view their report cards.
      </CAlert>
    )
  }

  if (!canAccessStudent(selectedChild.id)) {
    return (
      <CAlert color="danger">
        <CIcon icon={cilWarning} className="me-2" />
        You don't have permission to view report cards for this child.
      </CAlert>
    )
  }

  return (
    <div>
      {/* Header */}
      <CCard className="mb-4">
        <CCardBody>
          <h2>Report Cards</h2>
          <p className="text-muted mb-0">
            Viewing report cards for {selectedChild.name} ({selectedChild.grade})
          </p>
        </CCardBody>
      </CCard>

      {/* Report Cards List */}
      <CRow>
        <CCol>
          <CCard>
            <CCardHeader>
              <div className="d-flex align-items-center">
                <CIcon icon={cilDescription} className="me-2" />
                <strong>Available Report Cards</strong>
              </div>
            </CCardHeader>
            <CCardBody>
              {reportCards.length > 0 ? (
                <CListGroup flush>
                  {reportCards.map((report) => (
                    <CListGroupItem 
                      key={report.id}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div className="d-flex align-items-center">
                        <CIcon icon={cilDescription} className="me-3 text-primary" />
                        <div>
                          <h6 className="mb-1">{report.title}</h6>
                          <div className="d-flex align-items-center gap-2">
                            <CBadge color={getTermBadgeColor(report.term)}>
                              {report.term || 'N/A'}
                            </CBadge>
                            <small className="text-muted">
                              <CIcon icon={cilCalendar} className="me-1" />
                              {report.createdAt.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </small>
                          </div>
                        </div>
                      </div>
                      
                      <div className="d-flex gap-2">
                        <CButton
                          color="primary"
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReport(report)}
                        >
                          <CIcon icon={cilDescription} className="me-1" />
                          View
                        </CButton>
                        <CButton
                          color="success"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(report)}
                        >
                          <CIcon icon={cilDownload} className="me-1" />
                          Download
                        </CButton>
                      </div>
                    </CListGroupItem>
                  ))}
                </CListGroup>
              ) : (
                <div className="text-center py-5">
                  <CIcon icon={cilDescription} size="3xl" className="text-muted mb-3" />
                  <h5 className="text-muted">No Report Cards Available</h5>
                  <p className="text-muted">
                    Report cards will appear here once they are published by the school.
                  </p>
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* PDF Viewer Modal */}
      <CModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        size="xl"
        scrollable
      >
        <CModalHeader>
          <CModalTitle>
            {selectedReport?.title} - {selectedChild.name}
          </CModalTitle>
        </CModalHeader>
        <CModalBody style={{ height: '70vh' }}>
          {pdfLoading ? (
            <div className="d-flex justify-content-center align-items-center h-100">
              <CSpinner color="primary" />
              <span className="ms-2">Loading report card...</span>
            </div>
          ) : pdfUrl ? (
            <object
              data={pdfUrl}
              type="application/pdf"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            >
              <p>
                Your browser doesn't support PDF viewing. 
                <CButton 
                  color="link" 
                  onClick={() => handleDownload(selectedReport)}
                  className="p-0 ms-1"
                >
                  Download the report card instead
                </CButton>
              </p>
            </object>
          ) : (
            <CAlert color="warning">
              <CIcon icon={cilWarning} className="me-2" />
              Unable to load the report card. Please try downloading it instead.
            </CAlert>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="success"
            onClick={() => handleDownload(selectedReport)}
            disabled={!selectedReport}
          >
            <CIcon icon={cilDownload} className="me-1" />
            Download
          </CButton>
          <CButton color="secondary" onClick={() => setShowModal(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default ParentReportCards 