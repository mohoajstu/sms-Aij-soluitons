import React, { useState } from 'react'
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
} from '@coreui/icons'
import { DataGrid } from '@mui/x-data-grid'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import ApplicationDetailModal from './ApplicationDetailModal'
import PaymentModal from './PaymentModal'
import './registrationPage.css'

// Mock data for demonstration
const mockApplications = [
  {
    id: 'APP001',
    studentName: 'John Smith',
    grade: 'Grade 1',
    schoolYear: '2025',
    applicationDate: '2024-01-15',
    status: 'pending',
    parentEmail: 'parent@email.com',
    paymentStatus: 'completed',
    paymentAmount: 150,
    archived: false,
    files: {
      immunization: 'immunization_john_smith.pdf',
      reportCard: null,
      osrPermission: 'osr_john_smith.pdf',
      governmentId: 'birth_cert_john_smith.pdf',
    },
  },
  {
    id: 'APP002',
    studentName: 'Sarah Johnson',
    grade: 'Grade 3',
    schoolYear: '2025',
    applicationDate: '2024-01-12',
    status: 'approved',
    parentEmail: 'johnson@email.com',
    paymentStatus: 'completed',
    paymentAmount: 200,
    archived: false,
    files: {
      immunization: 'immunization_sarah_johnson.pdf',
      reportCard: 'report_sarah_johnson.pdf',
      osrPermission: 'osr_sarah_johnson.pdf',
      governmentId: 'passport_sarah_johnson.pdf',
    },
  },
  {
    id: 'APP003',
    studentName: 'Michael Brown',
    grade: 'Grade 2',
    schoolYear: '2025',
    applicationDate: '2024-01-10',
    status: 'denied',
    parentEmail: 'brown@email.com',
    paymentStatus: 'pending',
    paymentAmount: 0,
    archived: false,
    files: {
      immunization: 'immunization_michael_brown.pdf',
      reportCard: 'report_michael_brown.pdf',
      osrPermission: null,
      governmentId: 'birth_cert_michael_brown.pdf',
    },
  },
  {
    id: 'APP004',
    studentName: 'Emily Davis',
    grade: 'Grade 4',
    schoolYear: '2024',
    applicationDate: '2023-12-15',
    status: 'approved',
    parentEmail: 'davis@email.com',
    paymentStatus: 'completed',
    paymentAmount: 175,
    archived: true,
    files: {
      immunization: 'immunization_emily_davis.pdf',
      reportCard: 'report_emily_davis.pdf',
      osrPermission: 'osr_emily_davis.pdf',
      governmentId: 'birth_cert_emily_davis.pdf',
    },
  },
]

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
  const [applications, setApplications] = useState(mockApplications)
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

  const getStatusBadgeColor = (status) => {
    const colorMap = {
      pending: 'warning',
      approved: 'success',
      denied: 'danger',
    }
    return colorMap[status] || 'secondary'
  }

  const handleStatusChange = (appId, newStatus) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app)),
    )
    setConfirmationDialog({ open: false, type: null, application: null })
  }

  const handleArchiveApplication = (appId) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, archived: !app.archived } : app)),
    )
    setConfirmationDialog({ open: false, type: null, application: null })
  }

  const handlePaymentUpdate = (appId, paymentStatus, paymentAmount) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, paymentStatus, paymentAmount } : app)),
    )
  }

  const openConfirmationDialog = (type, application) => {
    setConfirmationDialog({ open: true, type, application })
  }

  const handleConfirmAction = () => {
    if (!confirmationDialog.application || !confirmationDialog.type) return

    switch (confirmationDialog.type) {
      case 'archive':
        handleArchiveApplication(confirmationDialog.application.id)
        break
      case 'approve':
        handleStatusChange(confirmationDialog.application.id, 'approved')
        break
      case 'deny':
        handleStatusChange(confirmationDialog.application.id, 'denied')
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
      flex: 1.2,
      renderCell: (params) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      renderCell: (params) => (
        <CBadge color={getStatusBadgeColor(params.value)} shape="rounded-pill" className="px-3 py-1">
          {params.value.charAt(0).toUpperCase() + params.value.slice(1)}
        </CBadge>
      ),
    },
    {
      field: 'paymentStatus',
      headerName: 'Payment',
      flex: 1,
      renderCell: (params) =>
        params.value === 'completed' ? (
          <CBadge color="dark" className="px-3 py-1 rounded-pill">
            Completed
          </CBadge>
        ) : (
          <CBadge
            color="light"
            className="text-secondary border border-secondary px-3 py-1 rounded-pill"
          >
            Pending
          </CBadge>
        ),
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
                <CIcon icon={cilSearch} />
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
    <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
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
              {showArchived ? 'Show Active' : 'Show Archived'} (
              {showArchived ? archivedApplications.length : activeApplications.length})
            </CButton>
          </div>

          {/* Stats Cards - Only show for active applications */}
          {!showArchived && (
            <CRow className="g-4 mb-4">
              <CCol sm={6} lg={3}>
                <CCard>
                  <CCardBody>
                    <div className="d-flex align-items-center">
                      <CIcon icon={cilUser} height={32} className="text-medium-emphasis me-3" />
                      <div>
                        <div className="text-medium-emphasis small">Total Applications</div>
                        <div className="fs-4 fw-semibold">{activeApplications.length}</div>
                      </div>
                    </div>
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol sm={6} lg={3}>
                <CCard>
                  <CCardBody>
                    <div className="d-flex align-items-center">
                      <CIcon icon={cilCalendar} height={32} className="text-warning me-3" />
                      <div>
                        <div className="text-medium-emphasis small">Pending</div>
                        <div className="fs-4 fw-semibold text-warning">{statusCounts.pending}</div>
                      </div>
                    </div>
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol sm={6} lg={3}>
                <CCard>
                  <CCardBody>
                    <div className="d-flex align-items-center">
                      <CIcon icon={cilCheckAlt} height={32} className="text-success me-3" />
                      <div>
                        <div className="text-medium-emphasis small">Approved</div>
                        <div className="fs-4 fw-semibold text-success">{statusCounts.approved}</div>
                      </div>
                    </div>
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol sm={6} lg={3}>
                <CCard>
                  <CCardBody>
                    <div className="d-flex align-items-center">
                      <CIcon icon={cilX} height={32} className="text-danger me-3" />
                      <div>
                        <div className="text-medium-emphasis small">Denied</div>
                        <div className="fs-4 fw-semibold text-danger">{statusCounts.denied}</div>
                      </div>
                    </div>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>
          )}

          {/* Search Bar */}
          <CCard className="my-4">
            <CCardBody>
              <div className="flex-1">
                <CFormLabel htmlFor="search">Search Applications</CFormLabel>
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
            </CCardBody>
          </CCard>

          {/* Applications Table */}
          <CCard>
            <CCardHeader className="form-card-header">
              <CCardTitle className="form-card-title">
                {showArchived ? 'Archived Applications' : 'Active Applications'} (
                {filteredApplications.length})
              </CCardTitle>
            </CCardHeader>
            <CCardBody>
              <div style={{ height: 600, width: '100%' }}>
                <ThemeProvider theme={theme}>
                  <DataGrid
                    rows={filteredApplications}
                    columns={columns}
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