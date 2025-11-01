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
  CProgress,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheck, cilX, cilUser, cilPencil, cilList } from '@coreui/icons'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { firestore } from '../../../Firebase/firebase'
import useAuth from '../../../Firebase/useAuth'
import dayjs from 'dayjs'

const TeacherReportProgress = () => {
  const [reportCards, setReportCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedStudent, setSelectedStudent] = useState('all')
  const [students, setStudents] = useState([])
  const { user, role } = useAuth()

  // Load report cards for current teacher
  useEffect(() => {
    const loadReportCards = async () => {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        // Load report card drafts for current teacher
        const draftsQuery = query(
          collection(firestore, 'reportCardDrafts'),
          where('uid', '==', user.uid),
          orderBy('lastModified', 'desc')
        )
        const draftsSnapshot = await getDocs(draftsQuery)

        const reportCardsList = []
        const studentsSet = new Set()

        draftsSnapshot.forEach((doc) => {
          const data = doc.data()
          const reportCard = {
            id: doc.id,
            studentName: data.studentName,
            studentId: data.selectedStudent?.id,
            reportCardType: data.reportCardType,
            reportCardTypeName: data.reportCardTypeName,
            status: data.adminReviewStatus || 'draft',
            lastModified: data.lastModified?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
            createdAt: data.createdAt?.toDate?.() || new Date(),
            formData: data.formData,
            selectedStudent: data.selectedStudent,
            completionStatus: getCompletionStatus(data.formData, data.reportCardType),
          }
          
          reportCardsList.push(reportCard)
          studentsSet.add(data.studentName)
        })

        setReportCards(reportCardsList)
        setStudents(Array.from(studentsSet).map(name => ({ name, id: name })))
      } catch (err) {
        console.error('Error loading report cards:', err)
        // Check if it's a Firebase index error
        if (err.code === 'failed-precondition' || err.message.includes('index')) {
          // Try a simpler query without ordering
          try {
            const simpleQuery = query(
              collection(firestore, 'reportCardDrafts'),
              where('uid', '==', user.uid)
            )
            const simpleSnapshot = await getDocs(simpleQuery)
            
            const reportCardsList = []
            const studentsSet = new Set()

            simpleSnapshot.forEach((doc) => {
              const data = doc.data()
              const reportCard = {
                id: doc.id,
                studentName: data.studentName,
                studentId: data.selectedStudent?.id,
                reportCardType: data.reportCardType,
                reportCardTypeName: data.reportCardTypeName,
                status: data.adminReviewStatus || 'draft',
                lastModified: data.lastModified?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
                createdAt: data.createdAt?.toDate?.() || new Date(),
                formData: data.formData,
                selectedStudent: data.selectedStudent,
                completionStatus: getCompletionStatus(data.formData, data.reportCardType),
              }
              
              reportCardsList.push(reportCard)
              studentsSet.add(data.studentName)
            })

            // Sort manually by lastModified
            reportCardsList.sort((a, b) => b.lastModified - a.lastModified)

            setReportCards(reportCardsList)
            setStudents(Array.from(studentsSet).map(name => ({ name, id: name })))
            
            // If no report cards found, don't show error - show empty state instead
            if (reportCardsList.length === 0) {
              setError(null)
            }
          } catch (simpleErr) {
            console.error('Error with simple query:', simpleErr)
            setError('Failed to load your report cards. Please contact your administrator.')
          }
        } else {
          setError('Failed to load your report cards.')
        }
      } finally {
        setLoading(false)
      }
    }

    loadReportCards()
  }, [user])

  // Calculate completion status for a report card
  const getCompletionStatus = (formData, reportCardType) => {
    if (!formData) return { completed: 0, total: 0, sections: [] }

    const sections = []
    let completed = 0

    // Check basic information
    const basicInfoComplete = formData.student_name && formData.grade && formData.teacher_name
    sections.push({ name: 'Basic Information', completed: basicInfoComplete })
    if (basicInfoComplete) completed++

    // Check attendance
    const attendanceComplete = formData.daysAbsent !== undefined && formData.timesLate !== undefined
    sections.push({ name: 'Attendance', completed: attendanceComplete })
    if (attendanceComplete) completed++

    // Check learning skills (for applicable report types)
    if (reportCardType.includes('Elementary')) {
      const learningSkillsComplete = formData.responsibility && formData.organization && 
                                   formData.independent_work && formData.collaboration &&
                                   formData.initiative && formData.self_regulation
      sections.push({ name: 'Learning Skills', completed: learningSkillsComplete })
      if (learningSkillsComplete) completed++
    }

    // Check subject areas
    const subjectFields = Object.keys(formData).filter(key => 
      key.includes('_mark') || key.includes('_comment') || key.includes('_level')
    )
    const subjectComplete = subjectFields.length > 0 && subjectFields.some(field => formData[field])
    sections.push({ name: 'Subject Areas', completed: subjectComplete })
    if (subjectComplete) completed++

    // Check comments
    const commentsComplete = formData.teacher_comments || formData.strengths_next_steps
    sections.push({ name: 'Comments', completed: commentsComplete })
    if (commentsComplete) completed++

    return {
      completed,
      total: sections.length,
      sections,
      percentage: Math.round((completed / sections.length) * 100)
    }
  }

  // Filter report cards
  const filteredReportCards = reportCards.filter(rc => {
    const matchesSearch = !searchTerm || 
      rc.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rc.reportCardTypeName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || rc.status === statusFilter
    const matchesStudent = selectedStudent === 'all' || rc.studentName === selectedStudent

    return matchesSearch && matchesStatus && matchesStudent
  })

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'approved': return 'success'
      case 'needs_revision': return 'warning'
      case 'draft': return 'secondary'
      default: return 'secondary'
    }
  }

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return cilCheck
      case 'needs_revision': return cilX
      case 'draft': return cilUser
      default: return cilUser
    }
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
            <CIcon icon={cilList} className="me-2" />
            My Report Card Progress
          </h4>
          <small className="text-muted">
            Track your report card completion status and progress
          </small>
        </CCardHeader>
        <CCardBody>
          {/* Filters */}
          <CRow className="mb-4">
            <CCol md={4}>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilUser} />
                </CInputGroupText>
                <CFormInput
                  placeholder="Search by student or report type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </CInputGroup>
            </CCol>
            <CCol md={3}>
              <CFormSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="needs_revision">Needs Revision</option>
              </CFormSelect>
            </CCol>
            <CCol md={3}>
              <CFormSelect
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
              >
                <option value="all">All Students</option>
                {students.map(student => (
                  <option key={student.id} value={student.name}>
                    {student.name}
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
                  setSelectedStudent('all')
                }}
              >
                Clear
              </CButton>
            </CCol>
          </CRow>

          {/* Summary Stats */}
          <CRow className="mb-4">
            <CCol md={3}>
              <CCard className="text-center">
                <CCardBody>
                  <h5 className="text-secondary">
                    {reportCards.filter(rc => rc.status === 'draft').length}
                  </h5>
                  <small>In Progress</small>
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
                <CTableHeaderCell>Report Type</CTableHeaderCell>
                <CTableHeaderCell>Progress</CTableHeaderCell>
                <CTableHeaderCell>Status</CTableHeaderCell>
                <CTableHeaderCell>Last Modified</CTableHeaderCell>
                <CTableHeaderCell>Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {filteredReportCards.map((reportCard) => (
                <CTableRow key={reportCard.id}>
                  <CTableDataCell>
                    <strong>{reportCard.studentName}</strong>
                  </CTableDataCell>
                  <CTableDataCell>{reportCard.reportCardTypeName}</CTableDataCell>
                  <CTableDataCell>
                    <div className="mb-2">
                      <CProgress
                        value={reportCard.completionStatus.percentage}
                        color={reportCard.completionStatus.percentage === 100 ? 'success' : 'primary'}
                        className="mb-1"
                      />
                      <small className="text-muted">
                        {reportCard.completionStatus.completed}/{reportCard.completionStatus.total} sections
                      </small>
                    </div>
                    <div className="mt-2">
                      {reportCard.completionStatus.sections.map((section, index) => (
                        <CBadge
                          key={index}
                          color={section.completed ? 'success' : 'secondary'}
                          className="me-1 mb-1"
                        >
                          <CIcon icon={section.completed ? cilCheck : cilX} className="me-1" />
                          {section.name}
                        </CBadge>
                      ))}
                    </div>
                  </CTableDataCell>
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
                    <CButton
                      color="primary"
                      size="sm"
                      onClick={async () => {
                        try {
                          // Load the full draft data from Firebase
                          const { doc, getDoc } = await import('firebase/firestore')
                          const { firestore } = await import('../../../Firebase/firebase')
                          
                          const draftRef = doc(firestore, 'reportCardDrafts', reportCard.id)
                          const draftSnap = await getDoc(draftRef)
                          
                          if (draftSnap.exists()) {
                            const draftData = draftSnap.data()
                            
                            // Store draft data in localStorage for the ReportCard component to pick up
                            localStorage.setItem('editingDraftId', reportCard.id)
                            localStorage.setItem('draftFormData', JSON.stringify(draftData.formData || {}))
                            localStorage.setItem('draftStudent', JSON.stringify(draftData.selectedStudent))
                            localStorage.setItem('draftReportType', draftData.reportCardType)
                            
                            // Navigate to report card creation tab
                            const event = new CustomEvent('navigateToReportCard', { 
                              detail: { 
                                tab: 0, // Create Report Card tab
                                draftId: reportCard.id
                              } 
                            })
                            window.dispatchEvent(event)
                            
                            console.log('✅ Loaded draft for editing:', {
                              draftId: reportCard.id,
                              student: draftData.selectedStudent?.fullName,
                              reportType: draftData.reportCardType
                            })
                          } else {
                            console.error('❌ Draft not found:', reportCard.id)
                          }
                        } catch (error) {
                          console.error('❌ Error loading draft:', error)
                        }
                      }}
                    >
                      <CIcon icon={cilPencil} className="me-1" />
                      {reportCard.status === 'draft' ? 'Continue' : 'View'}
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>

          {filteredReportCards.length === 0 && !loading && (
            <div className="text-center p-4">
              <CIcon icon={cilUser} size="3xl" className="text-muted mb-3" />
              <h5 className="text-muted">No report cards found</h5>
              <p className="text-muted">
                {searchTerm || statusFilter !== 'all' || selectedStudent !== 'all'
                  ? 'Try adjusting your filters to see more results.'
                  : 'You haven\'t started any report cards yet. Click "Create Report Card" to begin creating your first report card.'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && selectedStudent === 'all' && (
                <div className="mt-3">
                  <CButton 
                    color="primary" 
                    onClick={() => {
                      // Navigate to the report card creation tab
                      const event = new CustomEvent('navigateToReportCard', { detail: { tab: 0 } })
                      window.dispatchEvent(event)
                    }}
                    className="me-2"
                  >
                    <CIcon icon={cilPencil} className="me-1" />
                    Create Report Card
                  </CButton>
                </div>
              )}
            </div>
          )}
        </CCardBody>
      </CCard>
    </CContainer>
  )
}

export default TeacherReportProgress
