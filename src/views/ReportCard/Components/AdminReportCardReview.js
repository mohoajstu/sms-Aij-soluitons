import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CButton,
  CFormCheck,
  CSpinner,
  CAlert,
  CBadge,
  CInputGroup,
  CInputGroupText,
  CFormInput,
  CFormSelect,
  CRow,
  CCol,
  CContainer,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheck, cilX, cilUser, cilCloudDownload, cilFilter, cilSearch, cilPencil, cilFindInPage } from '@coreui/icons'
import { collection, getDocs, query, where, orderBy, updateDoc, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { firestore, storage } from '../../../Firebase/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import useAuth from '../../../Firebase/useAuth'
import dayjs from 'dayjs'
import { exportProgressReport1to6 } from '../exportProgressReport1to6'
import { exportProgressReport7to8 } from '../exportProgressReport7to8'
import { exportKGInitialObservations } from '../exportKGInitialObservations'
import { REPORT_CARD_TYPES } from '../utils'

const AdminReportCardReview = () => {
  const [reportCards, setReportCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [teacherFilter, setTeacherFilter] = useState('all')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [teachers, setTeachers] = useState([])
  const [grades, setGrades] = useState([])
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [selectedReportCard, setSelectedReportCard] = useState(null)
  const [selectedReportCardData, setSelectedReportCardData] = useState(null)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [approvingIds, setApprovingIds] = useState(new Set())
  const [batchApproving, setBatchApproving] = useState(false)
  const { user, role } = useAuth()

  // Load report cards from Firestore
  useEffect(() => {
    const loadReportCards = async () => {
      if (role !== 'admin') return

      setLoading(true)
      setError(null)

      try {
        // Load all report card drafts
        const draftsQuery = query(
          collection(firestore, 'reportCardDrafts'),
          orderBy('lastModified', 'desc')
        )
        const draftsSnapshot = await getDocs(draftsQuery)

        const reportCardsList = []
        draftsSnapshot.forEach((doc) => {
          const data = doc.data()
          const grade = data.formData?.grade || data.selectedStudent?.grade || ''
          reportCardsList.push({
            id: doc.id,
            studentName: data.studentName,
            teacherName: data.teacherName,
            reportCardType: data.reportCardType,
            reportCardTypeName: data.reportCardTypeName,
            status: data.adminReviewStatus || 'pending', // pending, approved, needs_revision
            lastModified: data.lastModified?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
            teacherId: data.uid,
            formData: data.formData,
            selectedStudent: data.selectedStudent,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            grade: grade, // Extract grade for filtering
            tarbiyahId: data.tarbiyahId || data.selectedStudent?.schoolId || data.selectedStudent?.id || '',
          })
        })

        setReportCards(reportCardsList)

        // Extract unique teachers
        const uniqueTeachers = [...new Set(reportCardsList.map(rc => rc.teacherName))].map(name => ({
          name,
          id: name
        }))
        setTeachers(uniqueTeachers)

        // Extract unique grades
        const uniqueGrades = [...new Set(reportCardsList.map(rc => rc.grade).filter(g => g))].sort((a, b) => {
          // Sort grades numerically
          const aNum = parseInt(a) || 0
          const bNum = parseInt(b) || 0
          return aNum - bNum
        })
        setGrades(uniqueGrades)
      } catch (err) {
        console.error('Error loading report cards:', err)
        setError('Failed to load report cards for review.')
      } finally {
        setLoading(false)
      }
    }

    loadReportCards()
  }, [role])

  // Update report card status (for needs_revision)
  const updateReportCardStatus = async (reportCardId, newStatus) => {
    try {
      const reportCardRef = doc(firestore, 'reportCardDrafts', reportCardId)
      await updateDoc(reportCardRef, {
        adminReviewStatus: newStatus,
        adminReviewedAt: new Date(),
        adminReviewedBy: user.uid,
      })

      // Update local state
      setReportCards(prev => 
        prev.map(rc => 
          rc.id === reportCardId 
            ? { ...rc, status: newStatus }
            : rc
        )
      )
    } catch (err) {
      console.error('Error updating report card status:', err)
      alert('Failed to update report card status. Please try again.')
    }
  }

  // Approve and publish report card with PDF generation
  const approveAndPublishReportCard = async (reportCard) => {
    setApprovingIds(prev => new Set(prev).add(reportCard.id))
    
    try {
      console.log('🔧 Starting approval process for:', reportCard.studentName)
      
      // Get the report card type configuration
      const reportCardType = REPORT_CARD_TYPES.find(t => t.id === reportCard.reportCardType)
      if (!reportCardType?.pdfPath) {
        throw new Error('Report card type configuration not found')
      }

      // Generate PDF based on report type
      const studentName = (reportCard.studentName || 'student').replace(/\s+/g, '-')
      let finalPdfBytes

      switch (reportCard.reportCardType) {
        case '1-6-progress':
          finalPdfBytes = await exportProgressReport1to6(reportCardType.pdfPath, reportCard.formData, studentName)
          break
        case '7-8-progress':
          finalPdfBytes = await exportProgressReport7to8(reportCardType.pdfPath, reportCard.formData, studentName)
          break
        case 'kg-initial-observations':
          finalPdfBytes = await exportKGInitialObservations(reportCardType.pdfPath, reportCard.formData, studentName)
          break
        // For other report types, notify that they need to be downloaded manually first
        case 'kg-report':
        case '1-6-report-card':
        case '7-8-report-card':
          throw new Error(
            `This report type (${reportCardType.name}) requires manual download first. ` +
            `Please use the "Edit" button to open the report and download it, then the approval will work.`
          )
        default:
          throw new Error(`Unsupported report type: ${reportCard.reportCardType}. Please contact support.`)
      }

      console.log('✅ PDF generated successfully')

      // Upload to Firebase Storage
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' })
      const timestamp = Date.now()
      const filePath = `reportCards/approved/${reportCard.reportCardType}-${studentName}-${timestamp}.pdf`
      const storageRef = ref(storage, filePath)

      await uploadBytes(storageRef, blob)
      const downloadURL = await getDownloadURL(storageRef)
      
      console.log('✅ PDF uploaded to Storage:', downloadURL)

      // Create approved record in reportCards collection (visible to parents)
      await addDoc(collection(firestore, 'reportCards'), {
        uid: reportCard.teacherId,
        type: reportCard.reportCardType,
        filePath,
        url: downloadURL,
        studentName: studentName,
        tarbiyahId: reportCard.tarbiyahId,
        status: 'approved', // Approved status makes it visible to parents
        studentId: reportCard.selectedStudent?.id || '',
        reportCardTypeName: reportCard.reportCardTypeName,
        grade: reportCard.grade || '',
        teacherName: reportCard.teacherName,
        approvedBy: user.uid,
        approvedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      })

      console.log('✅ Approved record created in reportCards')

      // Update the draft with approval info and final PDF URL
      const draftRef = doc(firestore, 'reportCardDrafts', reportCard.id)
      await updateDoc(draftRef, {
        adminReviewStatus: 'approved',
        adminReviewedAt: serverTimestamp(),
        adminReviewedBy: user.uid,
        status: 'complete',
        completedAt: serverTimestamp(),
        finalPdfUrl: downloadURL,
        finalPdfPath: filePath,
        publishedToParents: true,
      })

      console.log('✅ Draft updated with approval status')

      // Update local state
      setReportCards(prev => 
        prev.map(rc => 
          rc.id === reportCard.id 
            ? { ...rc, status: 'approved' }
            : rc
        )
      )

      alert(`✅ Report card approved and published for ${reportCard.studentName}!`)
      
    } catch (err) {
      console.error('❌ Error approving report card:', err)
      alert(`Failed to approve report card: ${err.message}`)
    } finally {
      setApprovingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(reportCard.id)
        return newSet
      })
    }
  }

  // Batch approve all reports for a specific grade
  const batchApproveByGrade = async (grade) => {
    const reportsToApprove = reportCards.filter(
      rc => rc.grade === grade && rc.status === 'pending'
    )

    if (reportsToApprove.length === 0) {
      alert(`No pending reports found for Grade ${grade}`)
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to approve and publish ${reportsToApprove.length} report card(s) for Grade ${grade}? This will make them visible to parents.`
    )

    if (!confirmed) return

    setBatchApproving(true)
    let successCount = 0
    let failCount = 0

    for (const report of reportsToApprove) {
      try {
        await approveAndPublishReportCard(report)
        successCount++
      } catch (err) {
        console.error(`Failed to approve report for ${report.studentName}:`, err)
        failCount++
      }
    }

    setBatchApproving(false)
    alert(
      `Batch approval complete!\n✅ Approved: ${successCount}\n❌ Failed: ${failCount}`
    )
  }

  // Filter report cards
  const filteredReportCards = reportCards.filter(rc => {
    const matchesSearch = !searchTerm || 
      rc.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rc.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rc.reportCardTypeName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || rc.status === statusFilter
    const matchesTeacher = teacherFilter === 'all' || rc.teacherName === teacherFilter
    const matchesGrade = gradeFilter === 'all' || rc.grade === gradeFilter

    return matchesSearch && matchesStatus && matchesTeacher && matchesGrade
  })

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'approved': return 'success'
      case 'needs_revision': return 'warning'
      case 'pending': return 'secondary'
      default: return 'secondary'
    }
  }

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return cilCheck
      case 'needs_revision': return cilX
      case 'pending': return cilUser
      default: return cilUser
    }
  }

  // Handle view button click - load full draft data and show modal
  const handleViewReportCard = async (reportCard) => {
    setLoadingPdf(true)
    setSelectedReportCard(reportCard)
    
    try {
      // Load the full draft document to get finalPdfUrl and complete data
      const draftRef = doc(firestore, 'reportCardDrafts', reportCard.id)
      const draftSnap = await getDoc(draftRef)
      
      if (draftSnap.exists()) {
        const draftData = draftSnap.data()
        setSelectedReportCardData({
          ...reportCard,
          finalPdfUrl: draftData.finalPdfUrl || null,
          formData: draftData.formData || reportCard.formData,
          selectedStudent: draftData.selectedStudent || reportCard.selectedStudent,
          reportCardType: draftData.reportCardType || reportCard.reportCardType,
        })
      } else {
        setSelectedReportCardData(reportCard)
      }
      
      setViewModalVisible(true)
    } catch (err) {
      console.error('Error loading report card data:', err)
      alert('Failed to load report card data. Please try again.')
    } finally {
      setLoadingPdf(false)
    }
  }

  // Handle edit button - navigate to report card edit page
  const handleEditReportCard = (reportCard) => {
    if (!selectedReportCardData) return

    try {
      // Store draft data in localStorage for the ReportCard component to pick up
      localStorage.setItem('editingDraftId', selectedReportCardData.id)
      localStorage.setItem('draftFormData', JSON.stringify(selectedReportCardData.formData || {}))
      localStorage.setItem('draftStudent', JSON.stringify(selectedReportCardData.selectedStudent || {}))
      localStorage.setItem('draftReportType', selectedReportCardData.reportCardType || '')

      // Close modal first
      setViewModalVisible(false)

      // Navigate to report card creation tab
      const event = new CustomEvent('navigateToReportCard', {
        detail: {
          tab: 0, // Create Report Card tab
          draftId: selectedReportCardData.id
        }
      })
      window.dispatchEvent(event)
    } catch (err) {
      console.error('Error setting up edit:', err)
      alert('Failed to load report card for editing. Please try again.')
    }
  }

  if (role !== 'admin') {
    return (
      <CContainer fluid>
        <CCard>
          <CCardBody>
            <CAlert color="warning">
              <CIcon icon={cilX} className="me-2" />
              Access denied. This feature is only available to administrators.
            </CAlert>
          </CCardBody>
        </CCard>
      </CContainer>
    )
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center p-4">
        <CSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <CAlert color="danger">
        <CIcon icon={cilX} className="me-2" />
        {error}
      </CAlert>
    )
  }

  return (
    <CContainer fluid>
      <CCard>
        <CCardHeader>
          <h4 className="mb-0">
            <CIcon icon={cilUser} className="me-2" />
            Report Card Review Dashboard
          </h4>
          <small className="text-muted">
            Review and approve report cards before they are finalized
          </small>
        </CCardHeader>
        <CCardBody>
          {/* Filters */}
          <CRow className="mb-3">
            <CCol md={4}>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilSearch} />
                </CInputGroupText>
                <CFormInput
                  placeholder="Search by student, teacher, or report type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </CInputGroup>
            </CCol>
            <CCol md={2}>
              <CFormSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="needs_revision">Needs Revision</option>
              </CFormSelect>
            </CCol>
            <CCol md={2}>
              <CFormSelect
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
              >
                <option value="all">All Grades</option>
                {grades.map(grade => (
                  <option key={grade} value={grade}>
                    Grade {grade}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={2}>
              <CFormSelect
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
              >
                <option value="all">All Teachers</option>
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.name}>
                    {teacher.name}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={2}>
              <CButton
                color="outline-secondary"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setTeacherFilter('all')
                  setGradeFilter('all')
                }}
                className="w-100"
              >
                <CIcon icon={cilFilter} className="me-1" />
                Clear
              </CButton>
            </CCol>
          </CRow>

          {/* Batch Approval Section - Show when there are pending reports in filtered results */}
          {(() => {
            const pendingInFilter = filteredReportCards.filter(rc => rc.status === 'pending')
            return pendingInFilter.length > 0 && (
              <CRow className="mb-3">
                <CCol>
                  <CAlert color="info" className="mb-0">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <div>
                        <strong>
                          {gradeFilter !== 'all' 
                            ? `Grade ${gradeFilter}: ${pendingInFilter.length} pending report(s)`
                            : `${pendingInFilter.length} pending report(s) in filtered results`}
                        </strong>
                      </div>
                      <div className="d-flex gap-2">
                        {gradeFilter !== 'all' && (
                          <CButton
                            color="success"
                            size="sm"
                            onClick={() => batchApproveByGrade(gradeFilter)}
                            disabled={batchApproving}
                          >
                            {batchApproving ? (
                              <>
                                <CSpinner size="sm" className="me-2" />
                                Approving...
                              </>
                            ) : (
                              <>
                                <CIcon icon={cilCheck} className="me-1" />
                                Approve All Grade {gradeFilter}
                              </>
                            )}
                          </CButton>
                        )}
                        <CButton
                          color="success"
                          size="sm"
                          onClick={async () => {
                            const pendingReports = filteredReportCards.filter(rc => rc.status === 'pending')
                            if (pendingReports.length === 0) {
                              alert('No pending reports to approve in the current filter.')
                              return
                            }

                            const confirmed = window.confirm(
                              `Are you sure you want to approve and publish ${pendingReports.length} report card(s)? This will make them visible to parents.`
                            )

                            if (!confirmed) return

                            setBatchApproving(true)
                            let successCount = 0
                            let failCount = 0

                            for (const report of pendingReports) {
                              try {
                                await approveAndPublishReportCard(report)
                                successCount++
                              } catch (err) {
                                console.error(`Failed to approve report for ${report.studentName}:`, err)
                                failCount++
                              }
                            }

                            setBatchApproving(false)
                            alert(
                              `Batch approval complete!\n✅ Approved: ${successCount}\n❌ Failed: ${failCount}`
                            )
                          }}
                          disabled={batchApproving}
                        >
                          {batchApproving ? (
                            <>
                              <CSpinner size="sm" className="me-2" />
                              Approving...
                            </>
                          ) : (
                            <>
                              <CIcon icon={cilCheck} className="me-1" />
                              Approve All ({pendingInFilter.length})
                            </>
                          )}
                        </CButton>
                      </div>
                    </div>
                  </CAlert>
                </CCol>
              </CRow>
            )
          })()}

          {/* Summary Stats */}
          <CRow className="mb-4">
            <CCol md={3}>
              <CCard className="text-center">
                <CCardBody>
                  <h5 className="text-secondary">
                    {reportCards.filter(rc => rc.status === 'pending').length}
                  </h5>
                  <small>Pending Review</small>
                </CCardBody>
              </CCard>
            </CCol>
            <CCol md={3}>
              <CCard className="text-center">
                <CCardBody>
                  <h5 className="text-success">
                    {reportCards.filter(rc => rc.status === 'approved').length}
                  </h5>
                  <small>Approved</small>
                </CCardBody>
              </CCard>
            </CCol>
            <CCol md={3}>
              <CCard className="text-center">
                <CCardBody>
                  <h5 className="text-warning">
                    {reportCards.filter(rc => rc.status === 'needs_revision').length}
                  </h5>
                  <small>Needs Revision</small>
                </CCardBody>
              </CCard>
            </CCol>
            <CCol md={3}>
              <CCard className="text-center">
                <CCardBody>
                  <h5 className="text-primary">
                    {reportCards.length}
                  </h5>
                  <small>Total Reports</small>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          {/* Report Cards Table */}
          <CTable responsive hover>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Student</CTableHeaderCell>
                <CTableHeaderCell>Grade</CTableHeaderCell>
                <CTableHeaderCell>Teacher</CTableHeaderCell>
                <CTableHeaderCell>Report Type</CTableHeaderCell>
                <CTableHeaderCell>Status</CTableHeaderCell>
                <CTableHeaderCell>Last Modified</CTableHeaderCell>
                <CTableHeaderCell>Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {filteredReportCards.map((reportCard) => {
                const isApproving = approvingIds.has(reportCard.id)
                return (
                  <CTableRow key={reportCard.id}>
                    <CTableDataCell>
                      <strong>{reportCard.studentName}</strong>
                    </CTableDataCell>
                    <CTableDataCell>
                      {reportCard.grade ? `Grade ${reportCard.grade}` : '-'}
                    </CTableDataCell>
                    <CTableDataCell>{reportCard.teacherName}</CTableDataCell>
                    <CTableDataCell>{reportCard.reportCardTypeName}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={getStatusBadgeColor(reportCard.status)}>
                        <CIcon icon={getStatusIcon(reportCard.status)} className="me-1" />
                        {reportCard.status.replace('_', ' ').toUpperCase()}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>
                      {dayjs(reportCard.lastModified).format('MMM DD, YYYY HH:mm')}
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex gap-2">
                        <CButton
                          color="info"
                          size="sm"
                          onClick={() => handleViewReportCard(reportCard)}
                          disabled={loadingPdf || isApproving}
                        >
                          <CIcon icon={cilFindInPage} className="me-1" />
                          View
                        </CButton>
                        
                        {reportCard.status === 'pending' && (
                          <>
                            <CButton
                              color="success"
                              size="sm"
                              onClick={() => approveAndPublishReportCard(reportCard)}
                              disabled={isApproving || batchApproving}
                            >
                              {isApproving ? (
                                <>
                                  <CSpinner size="sm" className="me-1" />
                                  Approving...
                                </>
                              ) : (
                                <>
                                  <CIcon icon={cilCheck} className="me-1" />
                                  Approve & Publish
                                </>
                              )}
                            </CButton>
                            <CButton
                              color="warning"
                              size="sm"
                              onClick={() => updateReportCardStatus(reportCard.id, 'needs_revision')}
                              disabled={isApproving || batchApproving}
                            >
                              <CIcon icon={cilX} className="me-1" />
                              Needs Revision
                            </CButton>
                          </>
                        )}
                        
                        {reportCard.status === 'needs_revision' && (
                          <CButton
                            color="success"
                            size="sm"
                            onClick={() => approveAndPublishReportCard(reportCard)}
                            disabled={isApproving || batchApproving}
                          >
                            {isApproving ? (
                              <>
                                <CSpinner size="sm" className="me-1" />
                                Approving...
                              </>
                            ) : (
                              <>
                                <CIcon icon={cilCheck} className="me-1" />
                                Approve & Publish
                              </>
                            )}
                          </CButton>
                        )}
                      </div>
                    </CTableDataCell>
                  </CTableRow>
                )
              })}
            </CTableBody>
          </CTable>

          {filteredReportCards.length === 0 && (
            <div className="text-center p-4">
              <CIcon icon={cilUser} size="3xl" className="text-muted mb-3" />
              <h5 className="text-muted">No report cards found</h5>
              <p className="text-muted">
                {searchTerm || statusFilter !== 'all' || teacherFilter !== 'all'
                  ? 'Try adjusting your filters to see more results.'
                  : 'No report cards have been submitted for review yet.'
                }
              </p>
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* View Report Card Modal */}
      <CModal
        visible={viewModalVisible}
        onClose={() => {
          setViewModalVisible(false)
          setSelectedReportCard(null)
          setSelectedReportCardData(null)
        }}
        size="xl"
        scrollable
      >
        <CModalHeader>
          <CModalTitle>
            Report Card: {selectedReportCard?.studentName || 'Loading...'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {loadingPdf ? (
            <div className="d-flex justify-content-center p-4">
              <CSpinner />
              <span className="ms-2">Loading report card...</span>
            </div>
          ) : selectedReportCardData ? (
            <div>
              <CRow className="mb-3">
                <CCol md={6}>
                  <strong>Student:</strong> {selectedReportCardData.studentName}
                </CCol>
                <CCol md={6}>
                  <strong>Teacher:</strong> {selectedReportCardData.teacherName}
                </CCol>
              </CRow>
              <CRow className="mb-3">
                <CCol md={6}>
                  <strong>Report Type:</strong> {selectedReportCardData.reportCardTypeName}
                </CCol>
                <CCol md={6}>
                  <strong>Status:</strong>{' '}
                  <CBadge color={getStatusBadgeColor(selectedReportCardData.status)}>
                    {selectedReportCardData.status.replace('_', ' ').toUpperCase()}
                  </CBadge>
                </CCol>
              </CRow>

              {selectedReportCardData.finalPdfUrl ? (
                <div className="mt-4">
                  <h5 className="mb-3">Finalized PDF</h5>
                  <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'auto', maxHeight: '70vh' }}>
                    {/* Use iframe for Firebase Storage URLs to avoid CORS issues */}
                    <iframe
                      src={selectedReportCardData.finalPdfUrl}
                      style={{
                        width: '100%',
                        height: '70vh',
                        minHeight: '600px',
                        border: 'none',
                      }}
                      title="Report Card PDF"
                    />
                  </div>
                </div>
              ) : (
                <CAlert color="info" className="mt-3">
                  <CIcon icon={cilUser} className="me-2" />
                  No finalized PDF available yet. This report card is still in draft status.
                  You can edit it to generate a finalized PDF.
                </CAlert>
              )}
            </div>
          ) : (
            <CAlert color="danger">Failed to load report card data.</CAlert>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => {
              setViewModalVisible(false)
              setSelectedReportCard(null)
              setSelectedReportCardData(null)
            }}
          >
            Close
          </CButton>
          {selectedReportCardData && (
            <CButton
              color="primary"
              onClick={() => handleEditReportCard(selectedReportCardData)}
            >
              <CIcon icon={cilPencil} className="me-1" />
              Edit Report Card
            </CButton>
          )}
        </CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default AdminReportCardReview
