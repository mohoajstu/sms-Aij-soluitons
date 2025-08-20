import React, { useState, useEffect, useCallback } from 'react'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CSpinner,
  CAlert,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CFormSelect,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilDescription, cilCloudDownload, cilHistory } from '@coreui/icons'
import { saveAs } from 'file-saver'

import PDFViewer from './Components/PDFViewer'
import KindergartenInitialUI from './Components/KindergartenInitialUI'
import KindergartenReportUI from './Components/KindergartenReportUI'
import Elementary1to6ProgressUI from './Components/Elementary1to6ProgressUI'
import Elementary1to6ReportUI from './Components/Elementary1to6ReportUI'
import Elementary7to8ProgressUI from './Components/Elementary7to8ProgressUI'
import Elementary7to8ReportUI from './Components/Elementary7to8ReportUI'
import './ReportCard.css'
import './ModernReportCard.css'
import { PDFDocument } from 'pdf-lib'
import { useNavigate } from 'react-router-dom'
// Firebase Storage & Firestore
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { storage, firestore } from '../../Firebase/firebase'
import useAuth from '../../Firebase/useAuth'
import StudentSelector from '../../components/StudentSelector'

// NOTE: All PDF assets are served from the public folder so we can access them by URL at runtime.
// The folder name is "ReportCards" (no space).
export const REPORT_CARD_TYPES = [
  {
    id: 'kg-initial-observations',
    name: 'Kindergarten – Communication of Learning (Initial Observations)',
    pdfPath: '/assets/ReportCards/kg-cl-initial-Observations.pdf',
    description: 'Kindergarten progress report – initial observations',
    route: '/reportcards/kg-initial',
    uiComponent: 'KindergartenInitialUI',
  },
  {
    id: 'kg-report',
    name: 'Kindergarten – Communication of Learning (Report Card)',
    pdfPath: '/assets/ReportCards/edu-Kindergarten-Communication-of-Learning-public-schools.pdf',
    description: 'Kindergarten formal report card',
    route: '/reportcards/kg-report',
    uiComponent: 'KindergartenReportUI',
  },
  {
    id: '1-6-progress',
    name: 'Grades 1–6 – Elementary Progress Report',
    pdfPath: '/assets/ReportCards/1-6-edu-elementary-progress-report-card-public-schools.pdf',
    description: 'Elementary progress report card for grades 1-6',
    route: '/reportcards/1-6-progress',
    uiComponent: 'Elementary1to6ProgressUI',
  },
  {
    id: '1-6-report-card',
    name: 'Grades 1–6 – Elementary Provincial Report Card',
    pdfPath: '/assets/ReportCards/1-6-edu-elementary-provincial-report-card-public-schools.pdf',
    description: 'Elementary provincial report card for grades 1-6',
    route: '/reportcards/1-6-report',
    uiComponent: 'Elementary1to6ReportUI',
  },
  {
    id: '7-8-progress',
    name: 'Grades 7–8 – Elementary Progress Report',
    pdfPath: '/assets/ReportCards/7-8-edu-elementary-progress-report-card-public-schools.pdf',
    description: 'Elementary progress report card for grades 7-8',
    route: '/reportcards/7-8-progress',
    uiComponent: 'Elementary7to8ProgressUI',
  },
  {
    id: '7-8-report-card',
    name: 'Grades 7–8 – Elementary Provincial Report Card',
    pdfPath: '/assets/ReportCards/7-8-edu-elementary-provincial-report-card-public-schools.pdf',
    description: 'Elementary provincial report card for grades 7-8',
    route: '/reportcards/7-8-report',
    uiComponent: 'Elementary7to8ReportUI',
  },
]

// Define the structure of our form data with JSDoc
/**
 * @typedef {Object} ReportCardData
 * @property {string} student_name - Student name
 * @property {string} grade - Grade level
 * @property {string} teacher_name - Teacher name
 * @property {string} school_year - School year
 * @property {string} date - Date
 * @property {string} oen - Ontario Education Number
 * @property {string} days_absent - Days absent
 * @property {string} total_days_absent - Total days absent
 * @property {string} times_late - Times late
 * @property {string} total_times_late - Total times late
 * @property {string} board - School board
 * @property {string} school - School name
 * @property {string} address_1 - Address line 1
 * @property {string} address_2 - Address line 2
 * @property {string} principal - Principal name
 * @property {string} telephone - Telephone
 * @property {string} responsibility - Responsibility rating
 * @property {string} organization - Organization rating
 * @property {string} independent_work - Independent work rating
 * @property {string} collaboration - Collaboration rating
 * @property {string} initiative - Initiative rating
 * @property {string} self_regulation - Self-regulation rating
 * @property {string} strengths_next_steps - Strengths and next steps
 * @property {string} teacher_signature - Teacher signature
 * @property {string} parent_signature - Parent signature
 * @property {string} principal_signature - Principal signature
 */

// Accept an optional presetReportCardId. If provided the dropdown is hidden and the supplied
// template will be used immediately. This lets us reuse this component inside wrapper pages.
const ReportCard = ({ presetReportCardId = null }) => {
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [selectedReportCard, setSelectedReportCard] = useState(presetReportCardId || '')
  const [formData, setFormData] = useState({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [fields, setFields] = useState([])
  const [filledPdfBytes, setFilledPdfBytes] = useState(null)
  const [currentTab, setCurrentTab] = useState('form')
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState(null)

  // Current authenticated user (needed for storage path)
  const { user } = useAuth()

  const navigate = useNavigate()

  // Get current report card configuration
  const getCurrentReportType = () => {
    return REPORT_CARD_TYPES.find((type) => type.id === selectedReportCard)
  }

  /**
   * This callback receives the generated PDF data from the viewer component.
   * @param {string} url - A temporary blob URL for the preview (managed by PDFViewer).
   * @param {Uint8Array} bytes - The raw byte data of the filled PDF.
   */
  const handlePdfGenerated = (url, bytes) => {
    // We only need to store the raw bytes for downloading and uploading.
    // The URL is handled internally by the PDFViewer for the live preview.
    setFilledPdfBytes(bytes)
  }

  // Handle student selection
  const handleStudentSelect = (student) => {
    setSelectedStudent(student)

    // Auto-populate form data with student information
    if (student) {
      const newFormData = {
        ...formData,
        // Basic student info
        student: student.fullName,
        student_name: student.fullName,
        OEN: student.oen || '',
        oen: student.oen || '',
        grade: student.grade || student.program || '',

        // Attendance data
        daysAbsent: student.currentTermAbsenceCount || 0,
        totalDaysAbsent: student.yearAbsenceCount || 0,
        timesLate: student.currentTermLateCount || 0,
        totalTimesLate: student.yearLateCount || 0,

        // Contact information
        email: student.email || '',
        phone1: student.phone1 || '',
        phone2: student.phone2 || '',
        emergencyPhone: student.emergencyPhone || '',

        // Address information
        address: student.streetAddress || '',
        address_1: student.streetAddress || '',
        address_2: student.residentialArea || '',
        residentialArea: student.residentialArea || '',
        poBox: student.poBox || '',

        // Citizenship
        nationality: student.nationality || '',
        nationalId: student.nationalId || '',
        nationalIdExpiry: student.nationalIdExpiry || '',

        // Language
        primaryLanguage: student.primaryLanguage || '',
        secondaryLanguage: student.secondaryLanguage || '',

        // Parents
        fatherName: student.fatherName || '',
        motherName: student.motherName || '',
        fatherId: student.fatherId || '',
        motherId: student.motherId || '',
        parent_name: student.fatherName || student.motherName || '',

        // Personal info
        dob: student.dob || '',
        gender: student.gender || '',
        salutation: student.salutation || '',
        nickName: student.nickName || '',
        middleName: student.middleName || '',

        // Schooling
        program: student.program || '',
        daySchoolEmployer: student.daySchoolEmployer || '',
        notes: student.notes || '',
        returningStudentYear: student.returningStudentYear || '',
        custodyDetails: student.custodyDetails || '',
        primaryRole: student.primaryRole || '',

        // School information
        school: 'Tarbiyah Learning Academy',
        schoolAddress: '3990 Old Richmond Rd, Nepean, ON K2H 8W3',
        board: 'Tarbiyah Learning Academy',
        principal: 'Ghazala Choudhary',
        telephone: student.phone1 || student.emergencyPhone || '',

        // Keep existing teacher name if already set
        teacher: formData.teacher || '',
        teacher_name: formData.teacher_name || '',
      }
      setFormData(newFormData)
    }
  }

  // Ensure student data is preserved when switching report card types
  useEffect(() => {
    if (selectedStudent && selectedReportCard) {
      // Re-apply student data to ensure it's available in all report card types
      const studentData = {
        student: selectedStudent.fullName,
        student_name: selectedStudent.fullName,
        OEN: selectedStudent.oen || '',
        oen: selectedStudent.oen || '',
        grade: selectedStudent.grade || selectedStudent.program || '',
        daysAbsent: selectedStudent.currentTermAbsenceCount || 0,
        totalDaysAbsent: selectedStudent.yearAbsenceCount || 0,
        timesLate: selectedStudent.currentTermLateCount || 0,
        totalTimesLate: selectedStudent.yearLateCount || 0,
        email: selectedStudent.email || '',
        phone1: selectedStudent.phone1 || '',
        phone2: selectedStudent.phone2 || '',
        emergencyPhone: selectedStudent.emergencyPhone || '',
        address: selectedStudent.streetAddress || '',
        address_1: selectedStudent.streetAddress || '',
        address_2: selectedStudent.residentialArea || '',
        residentialArea: selectedStudent.residentialArea || '',
        poBox: selectedStudent.poBox || '',
        nationality: selectedStudent.nationality || '',
        nationalId: selectedStudent.nationalId || '',
        nationalIdExpiry: selectedStudent.nationalIdExpiry || '',
        primaryLanguage: selectedStudent.primaryLanguage || '',
        secondaryLanguage: selectedStudent.secondaryLanguage || '',
        fatherName: selectedStudent.fatherName || '',
        motherName: selectedStudent.motherName || '',
        fatherId: selectedStudent.fatherId || '',
        motherId: selectedStudent.motherId || '',
        parent_name: selectedStudent.fatherName || selectedStudent.motherName || '',
        dob: selectedStudent.dob || '',
        gender: selectedStudent.gender || '',
        salutation: selectedStudent.salutation || '',
        nickName: selectedStudent.nickName || '',
        middleName: selectedStudent.middleName || '',
        program: selectedStudent.program || '',
        daySchoolEmployer: selectedStudent.daySchoolEmployer || '',
        notes: selectedStudent.notes || '',
        returningStudentYear: selectedStudent.returningStudentYear || '',
        custodyDetails: selectedStudent.custodyDetails || '',
        primaryRole: selectedStudent.primaryRole || '',
        school: 'Tarbiyah Learning Academy',
        schoolAddress: '3990 Old Richmond Rd, Nepean, ON K2H 8W3',
        board: 'Tarbiyah Learning Academy',
        principal: 'Ghazala Choudhary',
        telephone: selectedStudent.phone1 || selectedStudent.emergencyPhone || '',
      }

      // Merge with existing form data, preserving any user-entered data
      setFormData((prevData) => ({
        ...prevData,
        ...studentData,
        // Preserve teacher name if already set
        teacher: prevData.teacher || '',
        teacher_name: prevData.teacher_name || '',
      }))
    }
  }, [selectedStudent, selectedReportCard])

  // Handle form data changes with improved structure
  const handleFormDataChange = (newFormData) => {
    setFormData(newFormData)
  }

  // Handle report card type change
  const handleReportTypeChange = (e) => {
    const id = e.target.value
    setSelectedReportCard(id)

    // Don't navigate to individual routes when selecting from dropdown
    // This prevents duplicate rendering of the ReportCard component
    // The form will be rendered based on the selected type
  }

  /* ------------------------------------------------------------------
     LocalStorage persistence
     ------------------------------------------------------------------ */
  // Load saved form when report card type changes
  useEffect(() => {
    if (!selectedReportCard) return
    try {
      const saved = localStorage.getItem(`reportcard_form_${selectedReportCard}`)
      if (saved) {
        const savedData = JSON.parse(saved)
        // Preserve auto-populated student data when switching report card types
        const currentStudentData = {
          student: formData.student,
          student_name: formData.student_name,
          OEN: formData.OEN,
          oen: formData.oen,
          grade: formData.grade,
          daysAbsent: formData.daysAbsent,
          totalDaysAbsent: formData.totalDaysAbsent,
          timesLate: formData.timesLate,
          totalTimesLate: formData.totalTimesLate,
          email: formData.email,
          phone1: formData.phone1,
          phone2: formData.phone2,
          emergencyPhone: formData.emergencyPhone,
          address: formData.address,
          address_1: formData.address_1,
          address_2: formData.address_2,
          residentialArea: formData.residentialArea,
          poBox: formData.poBox,
          nationality: formData.nationality,
          nationalId: formData.nationalId,
          nationalIdExpiry: formData.nationalIdExpiry,
          primaryLanguage: formData.primaryLanguage,
          secondaryLanguage: formData.secondaryLanguage,
          fatherName: formData.fatherName,
          motherName: formData.motherName,
          fatherId: formData.fatherId,
          motherId: formData.motherId,
          parent_name: formData.parent_name,
          dob: formData.dob,
          gender: formData.gender,
          salutation: formData.salutation,
          nickName: formData.nickName,
          middleName: formData.middleName,
          program: formData.program,
          daySchoolEmployer: formData.daySchoolEmployer,
          notes: formData.notes,
          returningStudentYear: formData.returningStudentYear,
          school: formData.school,
          schoolAddress: formData.schoolAddress,
          board: formData.board,
          boardAddress: formData.boardAddress,
          principal: formData.principal,
          telephone: formData.telephone,
          teacher: formData.teacher,
          teacher_name: formData.teacher_name,
        }

        // Merge saved data with current student data, prioritizing student data
        const mergedData = { ...savedData, ...currentStudentData }
        setFormData(mergedData)
      } else {
        setFormData({})
      }
    } catch (err) {
      console.warn('Unable to parse saved form data:', err)
    }
  }, [selectedReportCard]) // Only depend on selectedReportCard to avoid infinite loops

  // Auto-save current form on every change
  useEffect(() => {
    if (!selectedReportCard) return
    try {
      localStorage.setItem(`reportcard_form_${selectedReportCard}`, JSON.stringify(formData))
    } catch (err) {
      console.warn('Unable to save form data to localStorage:', err)
    }
  }, [formData, selectedReportCard])

  // Download the filled PDF
  const downloadFilledPDF = async () => {
    setIsGenerating(true)

    if (!filledPdfBytes) {
      alert(
        'The PDF has not been generated yet. Please fill out the form and wait for the preview to update.',
      )
      console.error('Download failed: filledPdfBytes is null.')
      setIsGenerating(false)
      return
    }

    try {
      const blob = new Blob([filledPdfBytes], { type: 'application/pdf' })
      const reportCardType = getCurrentReportType()
      const studentName = (formData.student_name || formData.student || 'student').replace(
        /\\s+/g,
        '-',
      )
      const fileName = `${reportCardType?.name || 'report-card'}-${studentName}-filled.pdf`

      // Upload to Firebase first
      if (user) {
        try {
          const timestamp = Date.now()
          const filePath = `reportCards/${user.uid}/${selectedReportCard || 'report'}-${timestamp}.pdf`
          const storageRef = ref(storage, filePath)

          await uploadBytes(storageRef, blob)
          const downloadURL = await getDownloadURL(storageRef)

          // Store a reference in Firestore
          await addDoc(collection(firestore, 'reportCards'), {
            uid: user.uid,
            type: selectedReportCard,
            filePath,
            url: downloadURL,
            studentName: studentName,
            createdAt: serverTimestamp(),
          })

          console.log('✅ Report card uploaded to Firebase Storage:', downloadURL)
        } catch (uploadError) {
          console.error('Error uploading PDF to Firebase Storage:', uploadError)
          alert(
            'Failed to save the report card to the cloud, but the file will be downloaded locally.',
          )
        }
      } else {
        console.warn('User not authenticated. Skipping Firebase upload.')
      }

      // Then trigger the local download
      saveAs(blob, fileName)
      console.log(`✅ Successfully triggered download for: ${fileName}`)
    } catch (error) {
      console.error('Error during PDF processing and download:', error)
      alert('An error occurred while trying to process or download the PDF.')
    } finally {
      setIsGenerating(false)
    }
  }

  const renderModernForm = () => {
    const reportType = getCurrentReportType()
    const formProps = {
      fields,
      formData,
      onFormDataChange: handleFormDataChange,
      loading: formLoading,
      error: formError,
    }

    switch (reportType?.uiComponent) {
      case 'KindergartenInitialUI':
        return <KindergartenInitialUI {...formProps} />
      case 'KindergartenReportUI':
        return <KindergartenReportUI {...formProps} />
      case 'Elementary1to6ProgressUI':
        return <Elementary1to6ProgressUI {...formProps} />
      case 'Elementary1to6ReportUI':
        return <Elementary1to6ReportUI {...formProps} />
      case 'Elementary7to8ProgressUI':
        return <Elementary7to8ProgressUI {...formProps} />
      case 'Elementary7to8ReportUI':
        return <Elementary7to8ReportUI {...formProps} />
      default:
        // Default to the initial Kindergarten UI if no specific component is found
        return <KindergartenInitialUI {...formProps} />
    }
  }

  return (
    <CContainer fluid>
      <CRow>
        <CCol>
          <h2>
            {presetReportCardId
              ? `${getCurrentReportType()?.name || 'Report Card Generator'}`
              : 'Report Card Generator'}
          </h2>

          {/* Progress Indicator - Only show when not on individual report card page */}
          {!presetReportCardId && (
            <CCard className="mb-4">
              <CCardBody>
                <div className="d-flex align-items-center">
                  <div className={`step-indicator ${selectedStudent ? 'completed' : 'active'}`}>
                    <span className="step-number">1</span>
                    <span className="step-text">Select Student</span>
                  </div>
                  <div className="step-connector"></div>
                  <div
                    className={`step-indicator ${selectedStudent && selectedReportCard ? 'completed' : selectedStudent ? 'active' : ''}`}
                  >
                    <span className="step-number">2</span>
                    <span className="step-text">Select Report Card</span>
                  </div>
                  <div className="step-connector"></div>
                  <div
                    className={`step-indicator ${selectedStudent && selectedReportCard ? 'active' : ''}`}
                  >
                    <span className="step-number">3</span>
                    <span className="step-text">Fill Report Card</span>
                  </div>
                </div>
              </CCardBody>
            </CCard>
          )}

          {/* Student Selection */}
          {!selectedStudent && (
            <CCard className="mb-4">
              <CCardBody>
                <h5 className="mb-3">
                  {presetReportCardId ? 'Select Student' : 'Step 1: Select Student'}
                </h5>
                <StudentSelector
                  selectedStudent={selectedStudent}
                  onStudentSelect={handleStudentSelect}
                  placeholder="Search and select a student..."
                  required={true}
                />
              </CCardBody>
            </CCard>
          )}

          {/* Selected Student Info */}
          {selectedStudent && (
            <CCard className="mb-4">
              <CCardBody>
                <h5 className="mb-3">Selected Student</h5>
                <div className="p-3 bg-light rounded">
                  <div className="row">
                    <div className="col-md-6">
                      <strong>Name:</strong> {selectedStudent.fullName}
                    </div>
                    <div className="col-md-3">
                      <strong>Grade:</strong>{' '}
                      {selectedStudent.grade || selectedStudent.program || 'Not specified'}
                    </div>
                    <div className="col-md-3">
                      <strong>ID:</strong> {selectedStudent.schoolId}
                    </div>
                  </div>
                  <div className="row mt-2">
                    <div className="col-md-4">
                      <strong>OEN:</strong> {selectedStudent.oen || 'Not specified'}
                    </div>
                    <div className="col-md-4">
                      <strong>Absences:</strong> {selectedStudent.currentTermAbsenceCount || 0}{' '}
                      (term) / {selectedStudent.yearAbsenceCount || 0} (year)
                    </div>
                    <div className="col-md-4">
                      <strong>Late:</strong> {selectedStudent.currentTermLateCount || 0} (term) /{' '}
                      {selectedStudent.yearLateCount || 0} (year)
                    </div>
                  </div>
                  {selectedStudent.streetAddress && (
                    <div className="row mt-2">
                      <div className="col-md-12">
                        <strong>Address:</strong> {selectedStudent.streetAddress}
                        {selectedStudent.residentialArea && `, ${selectedStudent.residentialArea}`}
                        {selectedStudent.poBox && `, PO Box: ${selectedStudent.poBox}`}
                      </div>
                    </div>
                  )}
                  <div className="mt-3">
                    <CButton
                      color="outline-secondary"
                      size="sm"
                      onClick={() => setSelectedStudent(null)}
                    >
                      Change Student
                    </CButton>
                  </div>
                </div>
              </CCardBody>
            </CCard>
          )}

          {/* Report Card Type Selector – hide if a preset report card was supplied */}
          {!presetReportCardId && (
            <CCard className="mb-4">
              <CCardBody>
                <h5 className="mb-3">Step 2: Select Report Card Type</h5>
                <div className="report-card-type-selector">
                  <label htmlFor="reportCardType" className="form-label">
                    Report Card Type:
                  </label>
                  <CFormSelect
                    id="reportCardType"
                    value={selectedReportCard}
                    onChange={handleReportTypeChange}
                    className="mb-3"
                  >
                    <option value="">Choose a report card type...</option>
                    {REPORT_CARD_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
              </CCardBody>
            </CCard>
          )}

          {/* Main Content */}
          {selectedReportCard && selectedStudent && (
            <CRow>
              {/* PDF Section */}
              <CCol lg={6} className="pdf-section">
                <CCard>
                  <CCardHeader>
                    <h5>Report Card Preview</h5>
                    <small className="text-muted">Live preview - changes appear as you type</small>
                  </CCardHeader>
                  <CCardBody>
                    <PDFViewer
                      pdfUrl={getCurrentReportType()?.pdfPath}
                      className="report-card-pdf-viewer"
                      formData={formData}
                      showPreview={true}
                      onFilledPdfGenerated={handlePdfGenerated}
                    />
                  </CCardBody>
                </CCard>
              </CCol>

              {/* Form Section */}
              <CCol lg={6} className="form-section">
                {renderModernForm()}
              </CCol>
            </CRow>
          )}
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default ReportCard
