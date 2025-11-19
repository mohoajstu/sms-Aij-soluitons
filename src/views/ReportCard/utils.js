import React, { useState, useEffect, useCallback, useRef } from 'react'
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
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { useNavigate } from 'react-router-dom'
import { generateFieldNameVariations } from './fieldMappings'
import {
  fillPDFFormWithData,
  updateAllFieldAppearances,
  embedTimesRomanFont,
  fillPDFField,
} from './pdfFillingUtils'
// Import separate export functions for each report type
import { exportProgressReport1to6 } from './exportProgressReport1to6'
import { exportProgressReport7to8 } from './exportProgressReport7to8'
import { exportKGInitialObservations } from './exportKGInitialObservations'
// Firebase Storage & Firestore
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { storage, firestore } from '../../Firebase/firebase'
import useAuth from '../../Firebase/useAuth'
import StudentSelector from '../../components/StudentSelector'

// Board Mission Statement - Auto-filled in boardInfo field
export const BOARD_MISSION_STATEMENT =
  'Tarbiyah Learning recognizes that each child is unique – that all children are creative and need to succeed. Thus, Tarbiyah Learning respects the individual needs of children and fosters a caring and creative environment. Tarbiyah Learning also emphasizes the Islamic, social, and intellectual development of each child.'

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
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Current authenticated user (needed for storage path)
  const { user } = useAuth()

  const navigate = useNavigate()

  // Draft loading state
  const [isLoadingDraft, setIsLoadingDraft] = useState(false)
  const isLoadingDraftRef = useRef(false) // Synchronous guard
  const [currentDraftId, setCurrentDraftId] = useState(null) // Track which draft is loaded

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

  // Handle changing/clearing student selection
  const handleChangeStudent = () => {
    setSelectedStudent(null)
    setFormData({}) // Clear all form data
    // Clear current localStorage entries
    if (selectedReportCard && selectedStudent) {
      Object.keys(REPORT_CARD_TYPES).forEach((reportType) => {
        localStorage.removeItem(`reportcard_form_${reportType}`)
        localStorage.removeItem(`reportcard_form_${reportType}_${selectedStudent.id}`)
      })
    }
  }

  // Handle student selection
  const handleStudentSelect = (student) => {
    setSelectedStudent(student)

    // Clear localStorage for all report card types when selecting a new student
    if (student) {
      // Clear legacy format (without student ID) to prevent cross-contamination
      Object.keys(REPORT_CARD_TYPES).forEach((reportType) => {
        localStorage.removeItem(`reportcard_form_${reportType}`)
      })
      // The new format is student-specific, so no need to clear it
    }

    // Auto-populate form data with student information
    if (student) {
      // Clear previous form data but preserve teacher information
      const newFormData = {
        // Only preserve teacher data from previous form
        teacher: formData.teacher || '',
        teacher_name: formData.teacher_name || '',
        // Basic student info
        student: student.fullName,
        student_name: student.fullName,
        studentId: student.id, // Track which student this data belongs to
        // OEN is stored in schooling information in people management
        OEN: student.schooling?.oen || student.oen || student.OEN || '',
        oen: student.schooling?.oen || student.oen || student.OEN || '',
        // Extract just the number from grade (e.g., "grade 8" -> "8", "Grade 7" -> "7")
        grade: (() => {
          const gradeValue = student.grade || student.program || ''
          if (!gradeValue) return ''
          // Extract number from grade string (handles "grade 8", "Grade 7", "8", etc.)
          const match = gradeValue.toString().match(/\d+/)
          return match ? match[0] : gradeValue
        })(),

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
          board: 'Private',
          principal: 'Ghazala Choudhary',
          telephone: '613 421 1700',
          
          // Board Info - Mission Statement
          boardInfo: BOARD_MISSION_STATEMENT,
          
          // Grade 7-8 Subject Names (for Native Language and Other)
          nativeLanguage: 'Quran and Arabic Studies',
          other: 'Islamic Studies',
          
          // Ensure boardSpace is always blank for 1-6 progress report
          boardSpace: '',
          boardspace: '',
      }
      setFormData(newFormData)
    }
  }

  /**
   * Load existing draft from Firebase for the given student + report type
   * @param {Object} student - Selected student object
   * @param {string} reportType - Report card type ID
   */
  const loadExistingDraft = async (student, reportType) => {
    if (!student || !reportType || !user) {
      console.log('⏭️ Skipping draft load - missing required data')
      return null
    }

    try {
      // Set loading flags IMMEDIATELY (synchronously)
      isLoadingDraftRef.current = true
      setIsLoadingDraft(true)

      console.log('🔍 Checking for existing draft:', {
        studentId: student.id,
        reportType: reportType,
      })

      // Step 1: Try deterministic ID first (userUid_studentId_reportType)
      const draftId = `${user.uid}_${student.id}_${reportType}`
      const draftRef = doc(firestore, 'reportCardDrafts', draftId)
      const draftSnap = await getDoc(draftRef)

      if (draftSnap.exists()) {
        const draftData = draftSnap.data()
        console.log('✅ Found existing draft:', {
          draftId: draftId,
          lastModified: draftData.lastModified?.toDate?.(),
          fieldCount: Object.keys(draftData.formData || {}).length,
        })

        // Hydrate form with draft data
        setFormData(draftData.formData || {})
        setCurrentDraftId(draftId)

        return draftData
      }

      // Step 2: Query for ANY draft with this student + report type (cross-teacher support)
      console.log('🔍 Step 2: Searching for drafts from ANY teacher...')
      const draftsQuery = query(
        collection(firestore, 'reportCardDrafts'),
        where('studentId', '==', student.id),
        where('reportCardType', '==', reportType)
      )
      const querySnapshot = await getDocs(draftsQuery)

      if (!querySnapshot.empty) {
        const existingDraft = querySnapshot.docs[0]
        const draftData = existingDraft.data()
        
        console.log('✅ Found draft from another teacher:', {
          draftId: existingDraft.id,
          originalTeacher: draftData.teacherName,
          lastModified: draftData.lastModified?.toDate?.(),
          fieldCount: Object.keys(draftData.formData || {}).length,
        })

        // Hydrate form with draft data
        setFormData(draftData.formData || {})
        setCurrentDraftId(existingDraft.id)

        return draftData
      }

      // Step 3: No draft found - return null (form will use auto-populated student data)
      console.log('📝 No existing draft found')
      setCurrentDraftId(null)
      return null

    } catch (error) {
      console.error('❌ Error loading draft:', error)
      return null
    } finally {
      // Clear loading flags after a short delay
      setTimeout(() => {
        setIsLoadingDraft(false)
        isLoadingDraftRef.current = false
      }, 300)
    }
  }

  // Load existing draft when student + report type changes
  useEffect(() => {
    // Skip if either is not selected
    if (!selectedStudent || !selectedReportCard) {
      return
    }

    // Skip if we're currently loading from localStorage (Edit button flow)
    const isEditingDraft = localStorage.getItem('editingDraftId')
    if (isEditingDraft) {
      console.log('⏭️ Skipping Firebase draft load - loading from localStorage')
      return
    }

    // Skip if already loading a draft
    if (isLoadingDraftRef.current) {
      console.log('⏭️ Skipping draft load - already loading')
      return
    }

    // Load draft from Firebase
    const loadDraft = async () => {
      const existingDraft = await loadExistingDraft(selectedStudent, selectedReportCard)

      // If no draft found, populate with student basics
      if (!existingDraft) {
        console.log('📝 No draft found - populating with student data')
        const studentData = {
          // Basic student info
          student: selectedStudent.fullName,
          student_name: selectedStudent.fullName,
          studentId: selectedStudent.id,
          OEN: selectedStudent.schooling?.oen || selectedStudent.oen || selectedStudent.OEN || '',
          oen: selectedStudent.schooling?.oen || selectedStudent.oen || selectedStudent.OEN || '',
          grade: (() => {
            const gradeValue = selectedStudent.grade || selectedStudent.program || ''
            if (!gradeValue) return ''
            const match = gradeValue.toString().match(/\d+/)
            return match ? match[0] : gradeValue
          })(),

          // Attendance
          daysAbsent: selectedStudent.currentTermAbsenceCount || 0,
          totalDaysAbsent: selectedStudent.yearAbsenceCount || 0,
          timesLate: selectedStudent.currentTermLateCount || 0,
          totalTimesLate: selectedStudent.yearLateCount || 0,

          // Contact
          email: selectedStudent.email || '',
          phone1: selectedStudent.phone1 || '',
          phone2: selectedStudent.phone2 || '',
          emergencyPhone: selectedStudent.emergencyPhone || '',

          // Address
          address: selectedStudent.streetAddress || '',
          address_1: selectedStudent.streetAddress || '',
          address_2: selectedStudent.residentialArea || '',
          residentialArea: selectedStudent.residentialArea || '',
          poBox: selectedStudent.poBox || '',

          // Citizenship
          nationality: selectedStudent.nationality || '',
          nationalId: selectedStudent.nationalId || '',
          nationalIdExpiry: selectedStudent.nationalIdExpiry || '',

          // Language
          primaryLanguage: selectedStudent.primaryLanguage || '',
          secondaryLanguage: selectedStudent.secondaryLanguage || '',

          // Parents
          fatherName: selectedStudent.fatherName || '',
          motherName: selectedStudent.motherName || '',
          fatherId: selectedStudent.fatherId || '',
          motherId: selectedStudent.motherId || '',
          parent_name: selectedStudent.fatherName || selectedStudent.motherName || '',

          // Personal
          dob: selectedStudent.dob || '',
          gender: selectedStudent.gender || '',
          salutation: selectedStudent.salutation || '',
          nickName: selectedStudent.nickName || '',
          middleName: selectedStudent.middleName || '',

          // Schooling
          program: selectedStudent.program || '',
          daySchoolEmployer: selectedStudent.daySchoolEmployer || '',
          notes: selectedStudent.notes || '',
          returningStudentYear: selectedStudent.returningStudentYear || '',
          custodyDetails: selectedStudent.custodyDetails || '',
          primaryRole: selectedStudent.primaryRole || '',

          // School
          school: 'Tarbiyah Learning Academy',
          schoolAddress: '3990 Old Richmond Rd, Nepean, ON K2H 8W3',
          board: 'Private',
          principal: 'Ghazala Choudhary',
          telephone: '613 421 1700',
          
          // Board Info - Mission Statement
          boardInfo: BOARD_MISSION_STATEMENT,
          
          // Grade 7-8 Subject Names (for Native Language and Other)
          nativeLanguage: 'Quran and Arabic Studies',
          other: 'Islamic Studies',
          
          boardSpace: '',
          boardspace: '',

          // Preserve teacher if already set
          teacher: formData.teacher || '',
          teacher_name: formData.teacher_name || '',
        }

        setFormData(studentData)
      }
    }

    loadDraft()
  }, [selectedStudent, selectedReportCard, user])

  // Handle form data changes with improved structure
  const handleFormDataChange = (newFormData) => {
    // Don't trigger changes while loading draft
    if (isLoadingDraftRef.current) {
      console.log('⏸️ Ignoring form change - still loading draft')
      setFormData(newFormData) // Update state but don't trigger auto-save
      return
    }

    setFormData(newFormData)
    
    // Auto-save logic can go here if needed
    // (For now, manual save via saveDraft button)
  }

  // Save draft report card to Firestore
  const saveDraft = async () => {
    if (!user || !selectedStudent || !selectedReportCard) {
      alert('Please select a student and report card type before saving.')
      return
    }

    console.log('🔍 Starting save draft process:', {
      hasUser: !!user,
      userUid: user?.uid,
      studentId: selectedStudent?.id,
      studentName: selectedStudent?.fullName,
      reportCardType: selectedReportCard,
      formDataKeys: Object.keys(formData),
    })

    setIsSaving(true)
    setSaveMessage('')

    try {
      // Check if firestore is available
      if (!firestore) {
        throw new Error('Firestore is not initialized')
      }

      const reportCardType = getCurrentReportType()

      // Clean formData to remove undefined values (Firestore doesn't allow undefined)
      const cleanFormData = {}
      Object.keys(formData).forEach((key) => {
        const value = formData[key]
        if (value !== undefined && value !== null) {
          // Convert empty strings to empty string (not undefined)
          cleanFormData[key] = value === '' ? '' : value
        }
      })

      console.log('🧹 Cleaned form data, removed undefined values:', {
        originalKeys: Object.keys(formData).length,
        cleanedKeys: Object.keys(cleanFormData).length,
        removedKeys: Object.keys(formData).filter((key) => formData[key] === undefined),
      })

      // Simplified draft data to avoid potential serialization issues
      const draftData = {
        uid: user.uid,
        teacherName: user.displayName || user.email || 'Unknown Teacher',
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        tarbiyahId: selectedStudent.schoolId || selectedStudent.id || '',
        reportCardType: selectedReportCard,
        reportCardTypeName: reportCardType?.name || 'Unknown',
        formData: cleanFormData, // Use cleaned form data
        // Store only essential student data to avoid circular references
        selectedStudent: {
          id: selectedStudent.id,
          fullName: selectedStudent.fullName,
          grade: selectedStudent.grade || '',
          oen: selectedStudent.oen || '',
          schoolId: selectedStudent.schoolId || '',
        },
        status: 'draft',
        lastModified: serverTimestamp(),
        createdAt: serverTimestamp(),
      }

      console.log('📝 Draft data to save:', {
        uid: draftData.uid,
        studentId: draftData.studentId,
        reportCardType: draftData.reportCardType,
        formDataSize: JSON.stringify(draftData.formData).length,
      })

      // Use existing draft ID if we loaded one, otherwise create new
      const draftId = currentDraftId || `${user.uid}_${selectedStudent.id}_${selectedReportCard}`
      const draftRef = doc(firestore, 'reportCardDrafts', draftId)

      console.log('💾 Attempting to save to Firestore with ID:', draftId)
      console.log('📋 Using draft ID:', currentDraftId ? 'Existing draft' : 'New draft')

      // Check if draft already exists
      console.log('🔍 Checking if draft exists...')
      const existingDoc = await getDoc(draftRef)

      if (existingDoc.exists()) {
        console.log('📝 Updating existing draft...')
        const existingData = existingDoc.data()
        
        // Update existing draft - preserve original creator info
        await updateDoc(draftRef, {
          ...draftData,
          createdAt: existingData.createdAt, // Preserve original creation date
          originalTeacherId: existingData.originalTeacherId || existingData.uid,
          originalTeacherName: existingData.originalTeacherName || existingData.teacherName,
          lastModified: serverTimestamp(), // Update modification time
        })
        setSaveMessage('Draft updated successfully!')
        console.log('✅ Draft updated successfully')
      } else {
        console.log('📄 Creating new draft...')
        // Create new draft with original creator info
        await setDoc(draftRef, {
          ...draftData,
          originalTeacherId: user.uid,
          originalTeacherName: user.displayName || user.email || 'Unknown Teacher',
        })
        setSaveMessage('Draft saved successfully!')
        console.log('✅ New draft created successfully')
      }

      // Update currentDraftId after save
      setCurrentDraftId(draftId)

      console.log('✅ Report card draft saved to Firestore')

      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      console.error('❌ Error saving draft:', error)
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack,
      })
      setSaveMessage('Failed to save draft. Please try again.')
      setTimeout(() => setSaveMessage(''), 3000)
    } finally {
      setIsSaving(false)
    }
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
     Draft Loading - Check on component mount
     ------------------------------------------------------------------ */
  // Check for draft data immediately when component mounts
  useEffect(() => {
    const editingDraftId = localStorage.getItem('editingDraftId')
    const draftFormData = localStorage.getItem('draftFormData')
    const draftStudent = localStorage.getItem('draftStudent')
    const draftReportType = localStorage.getItem('draftReportType')

    if (editingDraftId && draftFormData && draftStudent && draftReportType) {
      try {
        const parsedFormData = JSON.parse(draftFormData)
        const parsedStudent = JSON.parse(draftStudent)

        // Set the report card type first (this overrides any presetReportCardId)
        setSelectedReportCard(draftReportType)
        setSelectedStudent(parsedStudent)
        setFormData(parsedFormData)
        setCurrentDraftId(editingDraftId) // Track which draft we're editing

        // Clear the draft editing flags
        localStorage.removeItem('editingDraftId')
        localStorage.removeItem('draftFormData')
        localStorage.removeItem('draftStudent')
        localStorage.removeItem('draftReportType')

        console.log('✅ Loaded draft for editing:', {
          draftId: editingDraftId,
          reportType: draftReportType,
          student: parsedStudent.fullName,
          formDataKeys: Object.keys(parsedFormData),
        })
      } catch (error) {
        console.error('Error loading draft:', error)
        // Clear invalid draft data
        localStorage.removeItem('editingDraftId')
        localStorage.removeItem('draftFormData')
        localStorage.removeItem('draftStudent')
        localStorage.removeItem('draftReportType')
      }
    }
  }, []) // Run only once on mount

  /* ------------------------------------------------------------------
     LocalStorage persistence
     ------------------------------------------------------------------ */
  // Load saved form when report card type changes
  useEffect(() => {
    if (!selectedReportCard) return

    try {
      // Only load localStorage data if we have a selected student
      const storageKey = selectedStudent
        ? `reportcard_form_${selectedReportCard}_${selectedStudent.id}`
        : `reportcard_form_${selectedReportCard}` // Fallback for legacy data
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const savedData = JSON.parse(saved)

        // Validate that the saved data belongs to the current student (if we have a student)
        if (selectedStudent && savedData.studentId && savedData.studentId !== selectedStudent.id) {
          console.warn('Saved form data belongs to a different student, skipping load')
          return
        }

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
          // boardAddress intentionally omitted as per user request
          principal: formData.principal,
          telephone: formData.telephone,
          teacher: formData.teacher,
          teacher_name: formData.teacher_name,
        }

        // Merge saved data with current student data, prioritizing student data
        const mergedData = { ...savedData, ...currentStudentData }
        // Ensure boardSpace is always blank for 1-6 progress report
        if (selectedReportCard === '1-6-progress') {
          mergedData.boardSpace = ''
          mergedData.boardspace = ''
        }
        setFormData(mergedData)
      } else {
        setFormData({})
      }
    } catch (err) {
      console.warn('Unable to parse saved form data:', err)
    }
  }, [selectedReportCard]) // Only depend on selectedReportCard to avoid infinite loops

  // Auto-save current form on every change (tied to specific student)
  useEffect(() => {
    if (!selectedReportCard || !selectedStudent) return
    try {
      const storageKey = `reportcard_form_${selectedReportCard}_${selectedStudent.id}`
      localStorage.setItem(storageKey, JSON.stringify(formData))
    } catch (err) {
      console.warn('Unable to save form data to localStorage:', err)
    }
  }, [formData, selectedReportCard, selectedStudent])

  // NOTE: generateFieldNameVariations is now imported from ./fieldMappings.js (shared with PDFViewer)
  // The old local function below is commented out - remove it later for cleanup
  const OLD_generateFieldNameVariations_REMOVE_ME = (formKey) => {
    if (!formKey) return []

    const variations = [formKey]

    // Add exact mappings based on the exact PDF field names provided by the user
    const exactFieldMappings = {
      // The form uses the exact PDF field names, so map them to themselves first
      // Basic Information - Using actual PDF field names as keys
      student: ['student'],
      grade: ['grade'],
      teacher: ['teacher'],
      OEN: ['OEN'],
      board: ['board'],
      school: ['school'],
      schoolAddress: ['schoolAddress'],
      boardAddress: ['boardAddress'],
      principal: [
        'principal',
        'Principal',
        'PRINCIPAL',
        'Principal:',
        'principal:',
        'PrincipalName',
        'principalName',
        // Handle common misspelling found in some templates
        'Principle',
        'principle',
      ],
      telephone: ['telephone'],
      boardSpace: ['boardSpace'],

      // Attendance - Using actual PDF field names
      daysAbsent: ['daysAbsent'],
      totalDaysAbsent: ['totalDaysAbsent'],
      timesLate: ['timesLate'],
      totalTimesLate: ['totalTimesLate'],

      // Learning Skills - Using actual PDF field names
      responsibility1: ['responsibility1'],
      responsibility2: ['responsibility2'],
      organization1: ['organization1'],
      organization2: ['organization2'],
      independentWork1: ['independentWork1'],
      independentWork2: ['independentWork2'],
      collaboration1: ['collaboration1'],
      collaboration2: ['collaboration2'],
      initiative1: ['initiative1'],
      initiative2: ['initiative2'],
      selfRegulation1: ['selfRegulation1'],
      selfRegulation2: ['selfRegulation2'],

      // Comments and Next Steps
      strengthsAndNextStepsForImprovement: ['strengthsAndNextStepsForImprovement'],
      strengthsAndNextStepsForImprovements2: [
        'strengthsAndNextStepsForImprovements2',
        'boardSpace',
        'boardspace',
        'BoardSpace',
        'BOARDSPACE',
      ],
      nextGrade: ['nextGrade'],

      // Native Language Input
      nativeLanguage: ['nativeLanguage'],
      
      // Other Subject Name Input
      otherSubjectName: ['other'],
      other: ['other'], // Also map 'other' field directly to 'other' PDF field

      // Signature field mappings
      teachersignature: [
        'teacherSignature',
        "Teacher's Signature",
        'Teacher Signature',
        'Signature1',
        'Text_1',
      ],
      principalsignature: [
        'principalSignature',
        "Principal's Signature",
        'Principal Signature',
        'Signature2',
        'Number_1',
      ],
    }

    // Add exact mappings if they exist
    if (exactFieldMappings[formKey]) {
      variations.push(...exactFieldMappings[formKey])
    }

    // Convert underscores to spaces and title case
    const titleCase = formKey
      .replace(/[_-]/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
    variations.push(titleCase)

    // All uppercase
    variations.push(formKey.toUpperCase())
    variations.push(titleCase.toUpperCase())

    // Remove underscores and hyphens
    variations.push(formKey.replace(/[_-]/g, ''))

    // CamelCase
    const camelCase = formKey
      .split(/[_-]/)
      .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
      .join('')
    variations.push(camelCase)

    // PascalCase
    const pascalCase = formKey
      .split(/[_-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
    variations.push(pascalCase)

    // Add common field name patterns
    if (formKey.includes('name')) {
      variations.push('Name', 'NAME', 'Student', 'STUDENT')
    }
    if (formKey.includes('grade')) {
      variations.push('Grade', 'GRADE')
    }
    if (formKey.includes('school')) {
      variations.push('School', 'SCHOOL')
    }

    return [...new Set(variations)] // Remove duplicates
  }

  // Fill a specific PDF field with a value
  const fillPDFField = (field, value, font = null, fontSize =8) => {
    try {
      const fieldType = field.constructor.name
      const fieldName = field.getName()

      console.log(`📝 Filling field "${fieldName}" (${fieldType}) with value:`, value, typeof value)

      // For ambiguous field types like 'e', detect the actual field type by checking available methods
      let actualFieldType = fieldType
      if (fieldType === 'e') {
        // Check if it has checkbox methods
        if (typeof field.check === 'function' && typeof field.isChecked === 'function') {
          actualFieldType = 'PDFCheckBox'
          console.log(`Detected type 'e' as checkbox for field "${fieldName}"`)
        }
        // Check if it has text field methods
        else if (typeof field.setText === 'function' && typeof field.getText === 'function') {
          actualFieldType = 'PDFTextField'
          console.log(`Detected type 'e' as text field for field "${fieldName}"`)
        }
        else {
          console.warn(`Could not determine actual type for field "${fieldName}" with type 'e'`)
        }
      }

      switch (actualFieldType) {
        case 'PDFTextField':
        case 'PDFTextField2':
          const stringValue = value.toString()
          field.setText(stringValue)
          
          // Update field appearance with specified font and font size (10pt Times Roman)
          if (font) {
            try {
              // Set default appearance with font size before updating appearances
              const acroField = field.acroField
              acroField.setDefaultAppearance(`/F1 ${fontSize} Tf`)
              
              // Update appearances with the font
              field.updateAppearances(font)
              
              console.log(`✅ Updated text field "${fieldName}" appearance with font size ${fontSize}pt`)
            } catch (appearanceError) {
              console.warn(`Could not update appearance for "${fieldName}":`, appearanceError)
              // Try to update appearances without setting default appearance
              try {
                field.updateAppearances(font)
              } catch (fallbackError) {
                console.warn(`Fallback appearance update also failed for "${fieldName}"`)
              }
            }
          }
          
          console.log(`✅ Successfully filled text field "${fieldName}" with: "${stringValue}"`)
          return true

        case 'PDFCheckBox':
        case 'PDFCheckBox2':
          // Handle boolean values correctly
          let shouldCheck = false

          if (typeof value === 'boolean') {
            shouldCheck = value
          } else if (typeof value === 'string') {
            const lowerValue = value.toLowerCase().trim()
            shouldCheck = ['true', 'yes', '1', 'checked', 'x', 'on'].includes(lowerValue)
          } else if (typeof value === 'number') {
            shouldCheck = value === 1
          }

          if (shouldCheck) {
            try {
              field.check()
              field.acroField.setValue('Yes')
              field.acroField.setExportValue('Yes')

              const options = field.acroField.getExportValues()
              if (options && options.length > 0) {
                field.acroField.setValue(options[0])
              }

              console.log(`✅ Successfully checked checkbox "${fieldName}"`)
            } catch (error) {
              console.warn(`Error setting checkbox "${fieldName}":`, error)
              field.check()
              console.log(`✅ Successfully checked checkbox "${fieldName}" (fallback method)`)
            }
          } else {
            try {
              field.uncheck()
              field.acroField.setValue('Off')
              field.acroField.setExportValue('Off')
              console.log(`✅ Successfully unchecked checkbox "${fieldName}"`)
            } catch (error) {
              console.warn(`Error unsetting checkbox "${fieldName}":`, error)
              field.uncheck()
              console.log(`✅ Successfully unchecked checkbox "${fieldName}" (fallback method)`)
            }
          }
          return true

        case 'PDFDropdown':
          const stringVal = value.toString()
          const options = field.getOptions()
          if (options.includes(stringVal)) {
            field.select(stringVal)
            console.log(
              `✅ Successfully selected dropdown option "${stringVal}" for field "${fieldName}"`,
            )
            return true
          }
          // Try case-insensitive match
          const matchingOption = options.find(
            (opt) => opt.toLowerCase() === stringVal.toLowerCase(),
          )
          if (matchingOption) {
            field.select(matchingOption)
            console.log(
              `✅ Successfully selected dropdown option "${matchingOption}" (case-insensitive) for field "${fieldName}"`,
            )
            return true
          }
          console.warn(
            `❌ Could not match dropdown value "${stringVal}" for field "${fieldName}". Available options:`,
            options,
          )
          break

        case 'PDFRadioGroup':
          try {
            const radioVal = value.toString()
            field.select(radioVal)
            console.log(
              `✅ Successfully selected radio option "${radioVal}" for field "${fieldName}"`,
            )
            return true
          } catch (radioError) {
            const radioOptions = field.getOptions()
            const matchingRadioOption = radioOptions.find(
              (opt) => opt.toLowerCase() === value.toString().toLowerCase(),
            )
            if (matchingRadioOption) {
              field.select(matchingRadioOption)
              console.log(
                `✅ Successfully selected radio option "${matchingRadioOption}" (case-insensitive) for field "${fieldName}"`,
              )
              return true
            }
            console.warn(
              `❌ Could not match radio value "${value}" for field "${fieldName}". Available options:`,
              radioOptions,
            )
          }
          break

        default:
          // Try to set as text for unknown field types
          if (field.setText) {
            field.setText(value.toString())
            console.log(
              `✅ Successfully filled unknown field type "${fieldName}" (${fieldType}) as text`,
            )
            return true
          }
          console.warn(`❌ Unknown field type "${fieldType}" for field "${fieldName}"`)
          break
      }
    } catch (error) {
      console.error(
        `❌ Error filling field "${field.getName()}" of type ${field.constructor.name}:`,
        error,
      )
    }

    return false
  }

  // Download the filled PDF
  const downloadFilledPDF = async () => {
    setIsGenerating(true)

    const reportCardType = getCurrentReportType()
    if (!reportCardType?.pdfPath) {
      alert('No PDF template selected. Please select a report card type.')
      setIsGenerating(false)
      return
    }

    try {
      console.log(`🔧 Generating PDF for report type: ${reportCardType.id}`)

      const studentName = (formData.student_name || formData.student || 'student').replace(
        /\s+/g,
        '-',
      )

      // Route to the appropriate export function based on report type
      let finalPdfBytes
      switch (reportCardType.id) {
        case '1-6-progress':
          finalPdfBytes = await exportProgressReport1to6(reportCardType.pdfPath, formData, studentName)
          break
        case '7-8-progress':
          finalPdfBytes = await exportProgressReport7to8(reportCardType.pdfPath, formData, studentName)
          break
        case 'kg-initial-observations':
          finalPdfBytes = await exportKGInitialObservations(reportCardType.pdfPath, formData, studentName)
          break
        default:
          // For other report types, use the generic approach (can be extended later)
          console.warn(`⚠️ No specific export function for report type: ${reportCardType.id}`)
          console.log('Using generic PDF filling approach...')
          
          // Fetch the original PDF template
          const response = await fetch(reportCardType.pdfPath)
          if (!response.ok) {
            throw new Error('Failed to fetch PDF template')
          }

          const originalPdfBytes = await response.arrayBuffer()
          const pdfDoc = await PDFDocument.load(originalPdfBytes)
          const form = pdfDoc.getForm()
          const fields = form.getFields()

          console.log(`📋 Found ${fields.length} form fields in original PDF`)

          // Embed Times Roman font for regular text fields (10pt)
          const timesRomanFont = await embedTimesRomanFont(pdfDoc)

          // Fill all form fields using shared utility
          await fillPDFFormWithData(pdfDoc, formData, timesRomanFont, 'Download')

          // Update field appearances BEFORE flattening
          await updateAllFieldAppearances(form, pdfDoc, 'Download')

          // Flatten the form
          if (fields.length > 0) {
            form.flatten()
            const catalog = pdfDoc.catalog
            try {
              catalog.delete('AcroForm')
            } catch (e) {
              console.warn('Could not remove AcroForm:', e)
            }
          }

          finalPdfBytes = await pdfDoc.save({ useObjectStreams: false })
          break
      }

      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' })
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
            tarbiyahId: selectedStudent?.schoolId || selectedStudent?.id || '',
            status: 'complete',
            studentId: selectedStudent?.id || '',
            reportCardTypeName: reportCardType?.name || 'Unknown',
            createdAt: serverTimestamp(),
            completedAt: serverTimestamp(),
          })

          // Convert draft to completed status instead of deleting
          if (selectedStudent) {
            const draftId = `${user.uid}_${selectedStudent.id}_${selectedReportCard}`
            try {
              // Update the draft to mark it as completed
              const draftRef = doc(firestore, 'reportCardDrafts', draftId)
              await updateDoc(draftRef, {
                status: 'complete',
                completedAt: serverTimestamp(),
                tarbiyahId: selectedStudent?.schoolId || selectedStudent?.id || '',
                finalPdfUrl: downloadURL,
                finalPdfPath: filePath,
              })
              console.log('✅ Updated draft to completed status')
            } catch (updateError) {
              console.log('No existing draft to update or error updating draft:', updateError)
            }
          }

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
      onSaveDraft: saveDraft,
      isSaving: isSaving,
      saveMessage: saveMessage,
      selectedStudent: selectedStudent,
      selectedReportCard: selectedReportCard,
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
                  <div className={`step-indicator ${selectedReportCard ? 'completed' : 'active'}`}>
                    <span className="step-number">1</span>
                    <span className="step-text">Select Report Card</span>
                  </div>
                  <div className="step-connector"></div>
                  <div
                    className={`step-indicator ${selectedReportCard && selectedStudent ? 'completed' : selectedReportCard ? 'active' : ''}`}
                  >
                    <span className="step-number">2</span>
                    <span className="step-text">Select Student</span>
                  </div>
                  <div className="step-connector"></div>
                  <div
                    className={`step-indicator ${selectedReportCard && selectedStudent ? 'active' : ''}`}
                  >
                    <span className="step-number">3</span>
                    <span className="step-text">Fill Report Card</span>
                  </div>
                </div>
              </CCardBody>
            </CCard>
          )}

          {/* Report Card Type Selector – hide if a preset report card was supplied */}
          {!presetReportCardId && (
            <CCard className="mb-4">
              <CCardBody>
                <h5 className="mb-3">Step 1: Select Report Card Type</h5>
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

          {/* Student Selection */}
          {!selectedStudent && selectedReportCard && (
            <CCard className="mb-4">
              <CCardBody>
                <h5 className="mb-3">
                  {presetReportCardId ? 'Select Student' : 'Step 2: Select Student'}
                </h5>
                <StudentSelector
                  selectedStudent={selectedStudent}
                  onStudentSelect={handleStudentSelect}
                  placeholder="Search and select a student..."
                  required={true}
                  showClassList={true}
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
                    <div className="col-md-6">
                      <strong>Absences:</strong> {selectedStudent.currentTermAbsenceCount || 0}{' '}
                      (term) / {selectedStudent.yearAbsenceCount || 0} (year)
                    </div>
                    <div className="col-md-6">
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
                    <CButton color="outline-secondary" size="sm" onClick={handleChangeStudent}>
                      Change Student
                    </CButton>
                  </div>
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

                {/* Download PDF Button */}
                <CCard className="mt-3">
                  <CCardBody className="text-center">
                    <h6 className="mb-3">Finalize Report Card</h6>
                    <p className="text-muted mb-3">
                      Ready to complete this report card? Generate the final PDF to convert this
                      draft to a completed report.
                    </p>
                    <CButton
                      color="success"
                      size="lg"
                      onClick={downloadFilledPDF}
                      disabled={isGenerating || !selectedStudent || !selectedReportCard}
                      className="d-flex align-items-center justify-content-center gap-2 mx-auto"
                    >
                      {isGenerating ? (
                        <>
                          <CSpinner size="sm" />
                          Generating & Flattening PDF...
                        </>
                      ) : (
                        <>
                          <CIcon icon={cilCloudDownload} />
                          Download Filled PDF
                        </>
                      )}
                    </CButton>
                    {!selectedStudent || !selectedReportCard ? (
                      <small className="text-muted d-block mt-2">
                        Please select a student and fill out the form to enable PDF generation
                      </small>
                    ) : (
                      <small className="text-muted d-block mt-2">
                        This will save the report as completed and remove it from drafts
                      </small>
                    )}
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>
          )}
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default ReportCard
