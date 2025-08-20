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
  CFormCheck,
  CFormSelect,
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
  cilEnvelopeClosed,
} from '@coreui/icons'
import { DataGrid } from '@mui/x-data-grid'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  where,
  writeBatch,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore'
import { firestore } from 'src/firebase'
import ApplicationDetailModal from './ApplicationDetailModal'
import PaymentModal from './PaymentModal'
import SendAcceptanceEmailModal from './SendAcceptanceEmailModal'
import './registrationPage.css'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'

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
  const [showEmailModal, setShowEmailModal] = useState(false)
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

  const generateIds = async (collectionName, count = 1) => {
    const prefix = {
      students: 'TLS',
      parents: 'TP',
    }
    const collRef = collection(firestore, collectionName)
    const snapshot = await getDocs(collRef)
    const existingIds = snapshot.docs.map((doc) => {
      const id = doc.data().schoolId || doc.id
      if (id && id.startsWith(prefix[collectionName])) {
        const numberPart = id.replace(prefix[collectionName], '')
        return parseInt(numberPart, 10) || 0
      }
      return 0
    })

    const baseNumber = {
      students: 138747,
      parents: 105624,
    }

    let maxNumber =
      existingIds.length > 0 ? Math.max(...existingIds) : baseNumber[collectionName] - 1

    const newIds = []
    for (let i = 0; i < count; i++) {
      maxNumber++
      const nextNumber = maxNumber.toString().padStart(6, '0')
      newIds.push(`${prefix[collectionName]}${nextNumber}`)
    }
    return newIds
  }

  // Registration code no longer used

  const handleStatusChange = async (application, newStatus) => {
    try {
      const appRef = doc(firestore, 'registrations', application.id)
      let appData = application

      // If full data isn't present, fetch it
      if (!appData.student || !appData.mother || !appData.father) {
        const docSnap = await getDoc(appRef)
        if (docSnap.exists()) {
          appData = { id: docSnap.id, ...docSnap.data() }
        } else {
          throw new Error('Application document not found.')
        }
      }

      const updateData = { status: newStatus }
      const batch = writeBatch(firestore)

      if (newStatus === 'approved') {
        // Registration codes removed; no code generated or stored

        // Default to empty objects to handle incomplete application data
        const studentData = appData.student || {}
        const primaryGuardianData = appData.primaryGuardian || {}
        const secondaryGuardianData = appData.secondaryGuardian || {}
        const hasSecondaryGuardian = !!secondaryGuardianData.firstName
        const primaryGuardianExists = !!primaryGuardianData.schoolId
        const secondaryGuardianExists = !!secondaryGuardianData.schoolId

        // Create student and parent documents
        const [studentId] = await generateIds('students', 1)
        const parentIdsToCreate = [!primaryGuardianExists, hasSecondaryGuardian && !secondaryGuardianExists].filter(Boolean).length
        const newParentIds = await generateIds('parents', parentIdsToCreate)
        const motherId = primaryGuardianExists ? primaryGuardianData.schoolId : newParentIds.shift()
        const fatherId = hasSecondaryGuardian ? (secondaryGuardianExists ? secondaryGuardianData.schoolId : newParentIds.shift()) : null

        // Onboarding codes are no longer used


        console.log('--- Creating Documents ---')
        console.log('Student ID:', studentId)
        console.log('Primary Guardian (Mother) ID:', motherId)
        if (hasSecondaryGuardian) {
          console.log('Secondary Guardian (Father) ID:', fatherId)
        }
        console.log('--------------------------')

        const studentRef = doc(firestore, 'students', studentId)
        const motherRef = doc(firestore, 'parents', motherId)
        const studentUserRef = doc(firestore, 'users', studentId)
        const motherUserRef = doc(firestore, 'users', motherId)

        // Prepare student's parents field
        const studentParentsField = {
          mother: {
            name: `${primaryGuardianData.firstName || ''} ${
              primaryGuardianData.lastName || ''
            }`.trim(),
            tarbiyahId: motherId,
          },
          father: {
            name: hasSecondaryGuardian
              ? `${secondaryGuardianData.firstName || ''} ${
                  secondaryGuardianData.lastName || ''
                }`.trim()
              : '',
            tarbiyahId: fatherId || '',
          },
        }

        // Student document
        const studentDocData = {
          active: true,
          address: {
            poBox: '',
            residentialArea: 'Unknown',
            streetAddress: appData.contact?.studentAddress || '',
          },
          citizenship: {
            nationalId: '',
            nationalIdExpiry: '',
            nationality: '',
          },
          contact: {
            email: '', // Student-specific email not on registration form
            emergencyPhone: appData.contact?.emergencyPhone || '',
            phone1: appData.contact?.primaryPhone || '',
            phone2: '',
          },
          language: {
            primary: '',
            secondary: '',
          },
          attendanceStats: {
            currentTermLateCount: 0,
            yearLateCount: 0,
            currentTermAbsenceCount: 0,
            yearAbsenceCount: 0,
          },
          parents: studentParentsField,
          personalInfo: {
            dob: studentData.dateOfBirth || '',
            firstName: studentData.firstName || '',
            middleName: '', // Not collected in registration
            lastName: studentData.lastName || '',
            gender: studentData.gender || '',
            nickName: '', // Not collected in registration
            salutation: '', // Not collected in registration
          },
          primaryRole: 'Student',
          schoolId: studentId,
          schooling: {
            custodyDetails: '',
            daySchoolEmployer: '',
            notes: `Allergies/Medical Conditions: ${
              studentData.allergies || 'N/A'
            }\nOEN: ${studentData.oen || 'N/A'}\nPrevious School: ${
              studentData.previousSchool || 'N/A'
            }\nPhoto Permission: ${studentData.photoPermission || 'N/A'}`,
            program: appData.grade || '',
            returningStudentYear: appData.schoolYear || '',
          },
          createdAt: serverTimestamp(),
          uploadedAt: serverTimestamp(),
        }
        batch.set(studentRef, studentDocData)

        // Mother document
        if (!primaryGuardianExists) {
          const motherDocData = {
            active: true,
            address: {
              poBox: primaryGuardianData.poBox || '',
              residentialArea: primaryGuardianData.residentialArea || 'Unknown',
              streetAddress: primaryGuardianData.address || '',
            },
            citizenship: {
              nationalId: primaryGuardianData.nationalId || '',
              nationalIdExpiry: primaryGuardianData.nationalIdExpiry || '',
              nationality: primaryGuardianData.nationality || '',
            },
            contact: {
              email: primaryGuardianData.email || '',
              emergencyPhone: appData.contact?.emergencyPhone || '',
              phone1: primaryGuardianData.phone || '',
              phone2: '',
            },
            language: {
              primary: '',
              secondary: '',
            },
            personalInfo: {
              dob: primaryGuardianData.dob || '',
              firstName: primaryGuardianData.firstName || '',
              middleName: primaryGuardianData.middleName || '',
              lastName: primaryGuardianData.lastName || '',
              gender: primaryGuardianData.gender || '',
              nickName: '',
              salutation: '',
            },
            primaryRole: 'Parent',
            schoolId: motherId,
            schooling: {
              custodyDetails: '',
              daySchoolEmployer: '',
              notes: '',
            },
            students: [
              {
                studentId: studentId,
                studentName: `${studentData.firstName || ''} ${studentData.lastName || ''}`.trim(),
                relationship: 'child',
              },
            ],
            onboarding: false,
            createdAt: serverTimestamp(),
            uploadedAt: serverTimestamp(),
          }
          batch.set(motherRef, motherDocData)
        } else {
          // Update existing parent
          const existingStudents = primaryGuardianData.students || []
          batch.update(motherRef, {
            students: [...existingStudents, { studentId: studentId, studentName: `${studentData.firstName || ''} ${studentData.lastName || ''}`.trim(), relationship: 'child' }]
          })
        }

        // User documents
        batch.set(studentUserRef, {
          active: true,
          createdAt: serverTimestamp(),
          dashboard: {
            theme: 'default',
          },
          linkedCollection: 'students',
          personalInfo: {
            firstName: studentData.firstName || '',
            lastName: studentData.lastName || '',
          },
          role: 'Student',
          stats: {
            lastLoginAt: null,
            loginCount: 0,
          },
          tarbiyahId: studentId,
        })

        if (!primaryGuardianExists) {
          batch.set(motherUserRef, {
            active: true,
            createdAt: serverTimestamp(),
            dashboard: {
              theme: 'default',
            },
            linkedCollection: 'parents',
            personalInfo: {
              firstName: primaryGuardianData.firstName || '',
              lastName: primaryGuardianData.lastName || '',
            },
            role: 'Parent',
            stats: {
              lastLoginAt: null,
              loginCount: 0,
            },
            tarbiyahId: motherId,
            mustChangePassword: true,
          })
        }

        // Father and Father's User documents (conditional)
        if (hasSecondaryGuardian && fatherId) {
          const fatherRef = doc(firestore, 'parents', fatherId)
          const fatherUserRef = doc(firestore, 'users', fatherId)

          if (!secondaryGuardianExists) {
            const fatherDocData = {
              active: true,
              address: {
                poBox: secondaryGuardianData.poBox || '',
                residentialArea: secondaryGuardianData.residentialArea || 'Unknown',
                streetAddress: secondaryGuardianData.address || '',
              },
              citizenship: {
                nationalId: secondaryGuardianData.nationalId || '',
                nationalIdExpiry: secondaryGuardianData.nationalIdExpiry || '',
                nationality: secondaryGuardianData.nationality || '',
              },
              contact: {
                email: secondaryGuardianData.email || '',
                emergencyPhone: appData.contact?.emergencyPhone || '',
                phone1: secondaryGuardianData.phone || '',
                phone2: '',
              },
              language: {
                primary: '',
                secondary: '',
              },
              personalInfo: {
                dob: secondaryGuardianData.dob || '',
                firstName: secondaryGuardianData.firstName || '',
                middleName: secondaryGuardianData.middleName || '',
                lastName: secondaryGuardianData.lastName || '',
                gender: secondaryGuardianData.gender || '',
                nickName: '',
                salutation: '',
              },
              primaryRole: 'Parent',
              schoolId: fatherId,
              schooling: {
                custodyDetails: '',
                daySchoolEmployer: '',
                notes: '',
              },
              students: [
                {
                  studentId: studentId,
                  studentName: `${studentData.firstName || ''} ${
                    studentData.lastName || ''
                  }`.trim(),
                  relationship: 'child',
                },
              ],
              onboarding: false,
              createdAt: serverTimestamp(),
              uploadedAt: serverTimestamp(),
            }
            batch.set(fatherRef, fatherDocData)
          } else {
            // Update existing parent
            const existingStudents = secondaryGuardianData.students || []
            batch.update(fatherRef, {
              students: [
                ...existingStudents,
                {
                  studentId: studentId,
                  studentName: `${studentData.firstName || ''} ${
                    studentData.lastName || ''
                  }`.trim(),
                  relationship: 'child',
                },
              ],
            })
          }
          if (!secondaryGuardianExists) {
            batch.set(fatherUserRef, {
              active: true,
              createdAt: serverTimestamp(),
              dashboard: {
                theme: 'default',
              },
              linkedCollection: 'parents',
              personalInfo: {
                firstName: secondaryGuardianData.firstName || '',
                lastName: secondaryGuardianData.lastName || '',
              },
              role: 'Parent',
              stats: {
                lastLoginAt: null,
                loginCount: 0,
              },
              tarbiyahId: fatherId,
              mustChangePassword: true,
            })
          }
        }
      }

      batch.update(appRef, updateData)
      await batch.commit()

      setApplications((prev) =>
        prev.map((app) => (app.id === application.id ? { ...app, ...updateData } : app)),
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
        handleStatusChange(confirmationDialog.application, 'approved')
        break
      case 'deny':
        handleStatusChange(confirmationDialog.application, 'denied')
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

  const schoolYears = ['All', ...new Set(applications.map((app) => app.schoolYear).filter(Boolean))]

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
            <div className="d-flex gap-2">
              <CButton
                color="primary"
                onClick={() => setShowEmailModal(true)}
                disabled={loading || !applications.some((app) => app.status === 'approved')}
              >
                <CIcon icon={cilEnvelopeClosed} className="me-2" />
                Send Acceptance Emails
              </CButton>
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
            <CCardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  {/* <CFormSelect
                    style={{ width: 'auto', display: 'inline-block' }}
                    value={selectedSchoolYear}
                    onChange={(e) => setSelectedSchoolYear(e.target.value)}
                  >
                    {schoolYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </CFormSelect> */}
                </div>
                <CFormCheck
                  id="showArchivedSwitch"
                  label="Show Archived"
                  checked={showArchived}
                  onChange={() => setShowArchived(!showArchived)}
                />
              </div>
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
                    autoHeight
                    rowHeight={60}
                    sx={{
                      '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: '#f4f4f4',
                        fontWeight: 'bold',
                      },
                      '& .MuiDataGrid-cell': {
                        padding: '0 16px',
                      },
                      '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
                        outline: 'none',
                      },
                    }}
                    getRowClassName={(params) =>
                      params.indexRelativeToCurrentPage % 2 === 0 ? 'even-row' : 'odd-row'
                    }
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
        <Dialog
          open={confirmationDialog.open}
          onClose={() => setConfirmationDialog({ open: false, type: null, application: null })}
        >
          <DialogTitle>Confirm Action</DialogTitle>
          <DialogContent>
            <p>{getConfirmationText()}</p>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setConfirmationDialog({ open: false, type: null, application: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmAction} color="primary" autoFocus>
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        {/* Send Acceptance Email Modal */}
        <SendAcceptanceEmailModal
          visible={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          applications={applications}
          onEmailsSent={() => {
            setShowEmailModal(false)
            // Optionally, refresh applications or update UI to show emails have been sent
          }}
        />
      </div>
    </div>
  )
}

export default RegistrationProcessingDashboard 