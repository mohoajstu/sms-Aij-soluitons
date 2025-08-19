import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCardTitle,
  CButton,
  CBadge,
  CFormInput,
  CFormLabel,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CTooltip,
  CRow,
  CCol,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch,
  cilUser,
  cilCalendar,
  cilInbox,
  cilDollar,
  cilCheckAlt,
  cilX,
  cilFindInPage,
} from '@coreui/icons'
import { DataGrid } from '@mui/x-data-grid'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore'
import { firestore } from 'src/firebase'
import ApplicationDetailModal from './ApplicationDetailModal'
import PaymentModal from './PaymentModal'
import './registrationPage.css'

// Create MUI theme to match app styles
const theme = createTheme({
  palette: {
    mode: 'light',
  },
  components: {
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #dee2e6',
          },
          '& .MuiDataGrid-cell:focus-within': {
            outline: 'none !important',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #dee2e6',
          },
        },
      },
    },
  },
})

const RegistrationProcessingDashboard = () => {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [confirmationDialog, setConfirmationDialog] = useState({
    open: false,
    type: null,
    application: null,
  })

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true)
      try {
        const q = query(collection(firestore, 'registrations'), orderBy('timestamp', 'desc'))
        const querySnapshot = await getDocs(q)
        const appsData = querySnapshot.docs.map((doc) => {
          const data = doc.data()
          const student = data.student || {}
          return {
            id: doc.id,
            ...data,
            studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
            applicationDate: data.timestamp?.toDate() || null,
            // Flatten payment status for grid display
            paymentStatus: data.payment?.status || 'n/a',
            files: data.uploadedFiles || {},
          }
        })
        setApplications(appsData)
      } catch (error) {
        console.error('Error fetching applications:', error)
        // Optionally, set an error state to show in the UI
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [])

  const getStatusBadgeColor = (status) => {
    const colorMap = {
      pending: 'warning',
      approved: 'success',
      denied: 'danger',
    }
    return colorMap[status] || 'secondary'
  }

  const handleStatusChange = async (appId, newStatus) => {
    try {
      const appDocRef = doc(firestore, 'registrations', appId)
      await updateDoc(appDocRef, { status: newStatus })

      setApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app)),
      )
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status. Please try again.')
    } finally {
      setConfirmationDialog({ open: false, type: null, application: null })
    }
  }

  const handleArchiveApplication = async (appId, currentArchivedStatus) => {
    const newArchivedStatus = !currentArchivedStatus
    try {
      const appDocRef = doc(firestore, 'registrations', appId)
      await updateDoc(appDocRef, { archived: newArchivedStatus })

      setApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, archived: newArchivedStatus } : app)),
      )
    } catch (error) {
      console.error('Error updating archive status:', error)
      alert('Failed to update archive status. Please try again.')
    } finally {
      setConfirmationDialog({ open: false, type: null, application: null })
    }
  }

  const handlePaymentUpdate = (appId, newPaymentData) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId
          ? {
              ...app,
              payment: { ...app.payment, ...newPaymentData },
              // Update flattened status for immediate UI response
              paymentStatus: newPaymentData.status || app.paymentStatus,
            }
          : app,
      ),
    )
  }

  const openConfirmationDialog = (type, application) => {
    setConfirmationDialog({ open: true, type, application })
  }

  const handleConfirmAction = () => {
    if (!confirmationDialog.application || !confirmationDialog.type) return

    const { id, archived } = confirmationDialog.application

    switch (confirmationDialog.type) {
      case 'archive':
        handleArchiveApplication(id, archived)
        break
      case 'approve':
        handleStatusChange(id, 'approved')
        break
      case 'deny':
        handleStatusChange(id, 'denied')
        break
    }
  }

  const getConfirmationText = () => {
    if (!confirmationDialog.application || !confirmationDialog.type) return ''

    const studentName = confirmationDialog.application.studentName

    switch (confirmationDialog.type) {
      case 'archive':
        return `Are you sure you want to ${
          confirmationDialog.application.archived ? 'unarchive' : 'archive'
        } ${studentName}'s application?`
      case 'approve':
        return `Are you sure you want to approve ${studentName}'s application?`
      case 'deny':
        return `Are you sure you want to deny ${studentName}'s application?`
      default:
        return ''
    }
  }

  const activeApplications = applications.filter((app) => !app.archived)
  const archivedApplications = applications.filter((app) => app.archived)
  const currentApplications = showArchived ? archivedApplications : activeApplications

  const filteredApplications = currentApplications.filter((app) => {
    const matchesSearch =
      app.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const handleViewApplication = (application) => {
    setSelectedApplication(application)
    setShowDetailModal(true)
  }

  const handleManagePayment = (application) => {
    setSelectedApplication(application)
    setShowPaymentModal(true)
  }

  const statusCounts = activeApplications.reduce(
    (acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1
      return acc
    },
    { pending: 0, approved: 0, denied: 0 },
  )

  const columns = [
    {
      field: 'id',
      headerName: 'App. ID',
      flex: 0.7,
    },
    {
      field: 'studentName',
      headerName: 'Student Name',
      flex: 1.5,
    },
    {
      field: 'grade',
      headerName: 'Grade',
      flex: 0.7,
    },
    {
      field: 'schoolYear',
      headerName: 'School Year',
      flex: 0.7,
    },
    {
      field: 'applicationDate',
      headerName: 'Application Date',
      type: 'date',
      flex: 1.2,
      valueFormatter: (value) => (value ? new Date(value).toLocaleDateString() : ''),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      renderCell: (params) => {
        const status = params.value || 'n/a'
        return (
          <CBadge color={getStatusBadgeColor(status)} shape="rounded-pill" className="px-3 py-1">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </CBadge>
        )
      },
    },
    {
      field: 'paymentStatus',
      headerName: 'Payment',
      flex: 1,
      renderCell: (params) => {
        const paymentStatus = params.value || 'n/a';

        if (paymentStatus === 'completed') {
          return (
            <CBadge color="dark" className="px-3 py-1 rounded-pill">
              Completed
            </CBadge>
          );
        }
        
        if (paymentStatus === 'pending') {
          return (
            <CBadge
              color="light"
              className="text-secondary border border-secondary px-3 py-1 rounded-pill"
            >
              Pending
            </CBadge>
          );
        }

        // Default case for 'n/a' or any other status
        return (
          <CBadge color="secondary" className="px-3 py-1 rounded-pill">
            N/A
          </CBadge>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 2,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const application = params.row
        return (
          <div className="d-flex flex-wrap gap-2 py-2">
            <CTooltip content="View">
              <CButton
                variant="outline"
                color="secondary"
                size="sm"
                onClick={() => handleViewApplication(application)}
                className="action-button-secondary"
              >
                <CIcon icon={cilFindInPage} />
              </CButton>
            </CTooltip>

            <CTooltip content="Payment">
              <CButton
                variant="outline"
                color="secondary"
                size="sm"
                onClick={() => handleManagePayment(application)}
                className="action-button-secondary"
              >
                <CIcon icon={cilDollar} />
              </CButton>
            </CTooltip>

            <CTooltip content={application.archived ? 'Unarchive' : 'Archive'}>
              <CButton
                variant="outline"
                color="secondary"
                size="sm"
                onClick={() => openConfirmationDialog('archive', application)}
                className="action-button-secondary"
              >
                <CIcon icon={cilInbox} />
              </CButton>
            </CTooltip>

            {application.status === 'pending' && !application.archived && (
              <>
                <CTooltip content="Approve">
                  <CButton
                    variant="outline"
                    color="success"
                    size="sm"
                    onClick={() => openConfirmationDialog('approve', application)}
                  >
                    <CIcon icon={cilCheckAlt} />
                  </CButton>
                </CTooltip>
                <CTooltip content="Deny">
                  <CButton
                    variant="outline"
                    color="danger"
                    size="sm"
                    onClick={() => openConfirmationDialog('deny', application)}
                  >
                    <CIcon icon={cilX} />
                  </CButton>
                </CTooltip>
              </>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', overflowY: 'scroll' }}>
      <div className="p-4 md:p-6">
        <div className="mx-auto">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h2 fw-bold">Registration Processing</h1>
              <p className="text-medium-emphasis mt-1">Review and process student applications</p>
            </div>
              <CButton
                variant="outline"
                color="secondary"
                onClick={() => setShowArchived(!showArchived)}
                className="d-flex align-items-center gap-2"
              >
                <CIcon icon={cilInbox} />
                {showArchived
                  ? `Show Active (${activeApplications.length})`
                  : 'Show Archived'}
              </CButton>
          </div>

          {/* Stats Cards - Only show for active applications */}
          {!showArchived && (
            <CRow className="g-4 mb-4">
              <CCol sm={6} lg={3}>
                <CCard>
                  <CCardHeader className="form-card-header summary-card-header">
                    <div className="small text-white">Total Applications</div>
                  </CCardHeader>
                  <CCardBody className="d-flex align-items-center">
                    <CIcon icon={cilUser} height={32} className="text-medium-emphasis me-3" />
                    <div className="fs-4 fw-semibold">{activeApplications.length}</div>
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol sm={6} lg={3}>
                <CCard>
                  <CCardHeader className="form-card-header summary-card-header">
                    <div className="small text-white">Pending</div>
                  </CCardHeader>
                  <CCardBody className="d-flex align-items-center">
                    <CIcon icon={cilCalendar} height={32} className="text-warning me-3" />
                    <div className="fs-4 fw-semibold text-warning">{statusCounts.pending}</div>
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol sm={6} lg={3}>
                <CCard>
                  <CCardHeader className="form-card-header summary-card-header">
                    <div className="small text-white">Approved</div>
                  </CCardHeader>
                  <CCardBody className="d-flex align-items-center">
                    <CIcon icon={cilCheckAlt} height={32} className="text-success me-3" />
                    <div className="fs-4 fw-semibold text-success">{statusCounts.approved}</div>
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol sm={6} lg={3}>
                <CCard>
                  <CCardHeader className="form-card-header summary-card-header">
                    <div className="small text-white">Denied</div>
                  </CCardHeader>
                  <CCardBody className="d-flex align-items-center">
                    <CIcon icon={cilX} height={32} className="text-danger me-3" />
                    <div className="fs-4 fw-semibold text-danger">{statusCounts.denied}</div>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>
          )}

          {/* Applications Table */}
          <CCard>
            <CCardHeader className="form-card-header">
              <CCardTitle className="form-card-title">
                {showArchived ? 'Archived Applications' : 'Active Applications'} (
                {filteredApplications.length})
              </CCardTitle>
            </CCardHeader>
              <div className="px-3 pt-3 pb-1">
                <CFormLabel htmlFor="search" className="visually-hidden">
                  Search Applications
                </CFormLabel>
                <div className="position-relative">
                  <span className="position-absolute top-50 start-0 translate-middle-y ms-3">
                    <CIcon icon={cilSearch} className="text-medium-emphasis" />
                  </span>
                  <CFormInput
                    id="search"
                    placeholder="Search by student name or application ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="ps-5"
                  />
                </div>
              </div>
            <CCardBody className="pt-0">
              <div style={{ height: 600, width: '100%' }}>
                <ThemeProvider theme={theme}>
                  <DataGrid
                    rows={filteredApplications}
                    columns={columns}
                    loading={loading}
                    initialState={{
                      pagination: {
                        paginationModel: { page: 0, pageSize: 10 },
                      },
                    }}
                    pageSizeOptions={[5, 10, 25]}
                    disableRowSelectionOnClick
                  />
                </ThemeProvider>
              </div>
            </CCardBody>
          </CCard>
        </div>

        {/* Application Detail Modal */}
        {showDetailModal && selectedApplication && (
          <ApplicationDetailModal
            application={selectedApplication}
            onClose={() => setShowDetailModal(false)}
            onStatusChange={handleStatusChange}
          />
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedApplication && (
          <PaymentModal
            application={selectedApplication}
            onClose={() => setShowPaymentModal(false)}
            onPaymentUpdate={handlePaymentUpdate}
          />
        )}

        {/* Confirmation Dialog */}
        <CModal
          visible={confirmationDialog.open}
          onClose={() => setConfirmationDialog({ open: false, type: null, application: null })}
        >
          <CModalHeader>
            <CModalTitle>Confirm Action</CModalTitle>
          </CModalHeader>
          <CModalBody>{getConfirmationText()}</CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              onClick={() => setConfirmationDialog({ open: false, type: null, application: null })}
            >
              Cancel
            </CButton>
            <CButton color="primary" onClick={handleConfirmAction}>
              Confirm
            </CButton>
          </CModalFooter>
        </CModal>
      </div>
    </div>
  )
}

export default RegistrationProcessingDashboard 