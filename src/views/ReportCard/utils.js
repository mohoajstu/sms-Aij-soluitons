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
  CTabs,
  CTabList,
  CTab,
  CTabPanel,
  CFormSelect,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilDescription, cilCloudDownload, cilHistory, cilSave } from '@coreui/icons'
import { saveAs } from 'file-saver'

import PDFViewer from './Components/PDFViewer'
import KindergartenInitialUI from './Components/KindergartenInitialUI'
import KindergartenReportUI from './Components/KindergartenReportUI'
import Elementary1to6ProgressUI from './Components/Elementary1to6ProgressUI'
import Elementary1to6ReportUI from './Components/Elementary1to6ReportUI'
import Elementary7to8ProgressUI from './Components/Elementary7to8ProgressUI'
import Elementary7to8ReportUI from './Components/Elementary7to8ReportUI'
import QuranReportUI from './Components/QuranReportUI'
import './ReportCard.css'
import './ModernReportCard.css'
import { PDFDocument, StandardFonts, PDFNumber, PDFName } from 'pdf-lib'
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
import { exportQuranReport } from './exportQuranReport'
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
import { getHomeroomTeacherName } from './utils/homeroomTeacher'
import { getECEName } from './utils/getECE'
import { syncGradesToCourse } from './utils/syncGradesToCourse'
import {
  separateTermFields,
  mergeTermFields,
  copyTerm1ToTerm2,
} from './utils/termFieldSeparation'


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
  {
    id: 'quran-report',
    name: 'Quran Studies Report Card',
    pdfPath: '/assets/ReportCards/Quran Report Card Template 2026.pdf',
    description: 'Quran Studies report card for all grades',
    route: '/reportcards/quran-report',
    uiComponent: 'QuranReportUI',
    gradesApplicable: 'all', // Available for all grades
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
  // B7: Term 1/Term 2 tabs
  const [selectedTerm, setSelectedTerm] = useState('term1') // 'term1' or 'term2'

  // Current authenticated user (needed for storage path)
  const { user, role } = useAuth()

  const navigate = useNavigate()

  // B9 & B3: Load report card settings and sync date field
  const [reportCardDateSetting, setReportCardDateSetting] = useState('')
  useEffect(() => {
    const loadSettings = async () => {
      // All users should respect settings (not just admins)
      try {
        const settingsDoc = await getDoc(doc(firestore, 'systemSettings', 'reportCardSms'))
        if (settingsDoc.exists()) {
          const settingsData = settingsDoc.data()
          setDisableEditing(settingsData.disableEditing || false)
          setHideProgressReports(settingsData.hideProgressReports || false)
          setReportCardDateSetting(settingsData.reportCardDate || '')
        }
      } catch (error) {
        console.error('Error loading report card settings:', error)
      }
    }
    loadSettings()
  }, [])

  // Auto-fill date field from settings whenever it changes or formData is updated
  useEffect(() => {
    if (selectedStudent && reportCardDateSetting) {
      // Only update if date is empty or not set
      if (!formData.date || formData.date.trim() === '') {
        setFormData((prevData) => ({
          ...prevData,
          date: reportCardDateSetting,
        }))
      }
    } else if (selectedStudent && !reportCardDateSetting) {
      // If no setting, use today's date if date is empty
      if (!formData.date || formData.date.trim() === '') {
        const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD format
        setFormData((prevData) => ({
          ...prevData,
          date: today,
        }))
      }
    }
  }, [reportCardDateSetting, selectedStudent])

  // Draft loading state
  const [isLoadingDraft, setIsLoadingDraft] = useState(false)
  const isLoadingDraftRef = useRef(false) // Synchronous guard
  const [currentDraftId, setCurrentDraftId] = useState(null) // Track which draft is loaded
  // B9: Disable editing setting
  const [disableEditing, setDisableEditing] = useState(false)
  // B3: Hide progress reports setting
  const [hideProgressReports, setHideProgressReports] = useState(false)
  // B5: Next/Previous navigation
  const [classStudents, setClassStudents] = useState([])
  const [currentStudentIndex, setCurrentStudentIndex] = useState(-1)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  // When admin opens "Edit Report Card" from Admin Review, allow editing even if global disableEditing is on
  const [allowEditFromReview, setAllowEditFromReview] = useState(false)

  // Get current report card configuration
  const getCurrentReportType = () => {
    return REPORT_CARD_TYPES.find((type) => type.id === selectedReportCard)
  }

  // B3 & B4: Get filtered report card types based on settings and student grade
  const getFilteredReportCardTypes = () => {
    let filtered = [...REPORT_CARD_TYPES]

    // B3: Filter out progress reports if setting is enabled
    if (hideProgressReports) {
      filtered = filtered.filter(type => {
        const isProgress = 
          type.id.includes('progress') || 
          type.id.includes('initial-observations') ||
          type.name.toLowerCase().includes('progress')
        return !isProgress
      })
    }

    // B4: Strict grade-based filtering - only show matching grade options
    if (selectedStudent) {
      const grade = selectedStudent.grade || selectedStudent.program || ''
      const gradeLower = grade.toString().toLowerCase()
      
      // Normalize grade (extract number if present)
      const gradeNumber = gradeLower.match(/\d+/)?.[0]
      const isJK = gradeLower.includes('jk') || gradeLower === 'junior kindergarten'
      const isSK = gradeLower.includes('sk') || gradeLower === 'senior kindergarten'
      const isKindergarten = isJK || isSK

      filtered = filtered.filter(type => {
        // Always show reports that are applicable to all grades (e.g., Quran report)
        if (type.gradesApplicable === 'all') {
          return true
        }
        
        // Kindergarten reports (JK/SK) - only show KG options
        if (isKindergarten) {
          return type.id.includes('kg-') || type.id.includes('kindergarten')
        }
        
        // Grades 1-6 - only show Gr 1-6 options
        if (gradeNumber && ['1', '2', '3', '4', '5', '6'].includes(gradeNumber)) {
          return type.id.includes('1-6') || type.id.includes('1to6')
        }
        
        // Grades 7-8 - only show Gr 7-8 options
        if (gradeNumber && ['7', '8'].includes(gradeNumber)) {
          return type.id.includes('7-8') || type.id.includes('7to8')
        }

        // Strict filtering: if grade doesn't match any pattern, show nothing
        return false
      })
    }

    return filtered
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

  // B5: Load class students for navigation
  const loadClassStudents = async (student) => {
    if (!student) {
      setClassStudents([])
      setCurrentStudentIndex(-1)
      return
    }

    try {
      // Find the student's class/course
      const coursesRef = collection(firestore, 'courses')
      const coursesQuery = query(
        coursesRef,
        where('archived', '==', false),
        where('enrolledList', 'array-contains', student.id)
      )
      const coursesSnapshot = await getDocs(coursesQuery)

      if (!coursesSnapshot.empty) {
        // Get the first matching course (assuming student is in one primary class)
        const courseDoc = coursesSnapshot.docs[0]
        const courseData = courseDoc.data()
        const enrolledList = courseData.enrolledList || courseData.students || []

        // Load all students in this class
        const studentsPromises = enrolledList.map(async (studentId) => {
          try {
            const studentDoc = await getDoc(doc(firestore, 'students', studentId))
            if (studentDoc.exists()) {
              const studentData = studentDoc.data()
              const firstName = studentData.personalInfo?.firstName || studentData.firstName || ''
              const lastName = studentData.personalInfo?.lastName || studentData.lastName || ''
              return {
                id: studentDoc.id,
                fullName: `${firstName} ${lastName}`.trim(),
                ...studentData,
                // Include all the fields that handleStudentSelect expects
                grade: studentData.schooling?.program || studentData.personalInfo?.grade || studentData.grade || '',
                oen: studentData.schooling?.oen || studentData.personalInfo?.oen || studentData.oen || '',
                schoolId: studentData.personalInfo?.schoolId || studentData.schoolId || studentData.tarbiyahId || studentDoc.id,
                currentTermAbsenceCount: studentData.attendanceStats?.currentTermAbsenceCount || 0,
                currentTermLateCount: studentData.attendanceStats?.currentTermLateCount || 0,
                yearAbsenceCount: studentData.attendanceStats?.yearAbsenceCount || 0,
                yearLateCount: studentData.attendanceStats?.yearLateCount || 0,
                email: studentData.contact?.email || '',
                phone1: studentData.contact?.phone1 || '',
                phone2: studentData.contact?.phone2 || '',
                emergencyPhone: studentData.contact?.emergencyPhone || '',
                streetAddress: studentData.address?.streetAddress || '',
                residentialArea: studentData.address?.residentialArea || '',
                poBox: studentData.address?.poBox || '',
                nationality: studentData.citizenship?.nationality || '',
                nationalId: studentData.citizenship?.nationalId || '',
                nationalIdExpiry: studentData.citizenship?.nationalIdExpiry || '',
                primaryLanguage: studentData.language?.primary || '',
                secondaryLanguage: studentData.language?.secondary || '',
                fatherName: studentData.parents?.father?.name || '',
                motherName: studentData.parents?.mother?.name || '',
                fatherId: studentData.parents?.father?.tarbiyahId || '',
                motherId: studentData.parents?.mother?.tarbiyahId || '',
                dob: studentData.personalInfo?.dob || '',
                gender: studentData.personalInfo?.gender || '',
                salutation: studentData.personalInfo?.salutation || '',
                nickName: studentData.personalInfo?.nickName || '',
                middleName: studentData.personalInfo?.middleName || '',
                program: studentData.schooling?.program || '',
                daySchoolEmployer: studentData.daySchoolEmployer || '',
                notes: studentData.notes || '',
                returningStudentYear: studentData.returningStudentYear || '',
                custodyDetails: studentData.custodyDetails || '',
                primaryRole: studentData.primaryRole || '',
              }
            }
            return null
          } catch (error) {
            console.error(`Error loading student ${studentId}:`, error)
            return null
          }
        })

        const studentsList = (await Promise.all(studentsPromises)).filter(Boolean)
        // Sort by name
        studentsList.sort((a, b) => a.fullName.localeCompare(b.fullName))

        setClassStudents(studentsList)

        // Find current student index
        const currentIndex = studentsList.findIndex((s) => s.id === student.id)
        setCurrentStudentIndex(currentIndex >= 0 ? currentIndex : -1)
      } else {
        // No class found, just set current student
        setClassStudents([student])
        setCurrentStudentIndex(0)
      }
    } catch (error) {
      console.error('Error loading class students:', error)
      setClassStudents([student])
      setCurrentStudentIndex(0)
    }
  }

  // (debug logging removed)

  // B5: Handle navigation between students
  const handleNavigateStudent = async (direction) => {
    if (classStudents.length === 0 || currentStudentIndex < 0) return

    const newIndex =
      direction === 'next'
        ? (currentStudentIndex + 1) % classStudents.length
        : currentStudentIndex === 0
        ? classStudents.length - 1
        : currentStudentIndex - 1

    const newStudent = classStudents[newIndex]
    if (newStudent) {
      // Check for unsaved changes
      if (hasUnsavedChanges) {
        const confirmNavigate = window.confirm(
          'You have unsaved changes. Are you sure you want to navigate to another student?'
        )
        if (!confirmNavigate) return
      }

      setCurrentStudentIndex(newIndex)
      // Use handleStudentSelect to properly load the new student
      await handleStudentSelect(newStudent)
    }
  }

  // Handle student selection
  const handleStudentSelect = async (student) => {
    setSelectedStudent(student)

    // B5: Load class students for navigation
    await loadClassStudents(student)

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
      // B6: Get homeroom teacher name (pass report type for Quran-specific handling)
      const homeroomTeacherPromise = getHomeroomTeacherName(student, selectedReportCard)
      
      // B10: Autofill date (from settings or today's date)
      let dateString = ''
      try {
        const settingsDoc = await getDoc(doc(firestore, 'systemSettings', 'reportCardSms'))
        if (settingsDoc.exists()) {
          const settingsData = settingsDoc.data()
          dateString = settingsData.reportCardDate || ''
        }
      } catch (error) {
        console.warn('Error loading report card date setting:', error)
      }
      
      // If no setting or empty, use today's date
      if (!dateString) {
        const today = new Date()
        dateString = today.toLocaleDateString('en-CA') // YYYY-MM-DD format
      }
      
      // Clear previous form data but preserve teacher information
      const newFormData = {
        // Only preserve teacher data from previous form if not empty
        teacher: formData.teacher || '',
        teacher_name: formData.teacher_name || '',
        // Basic student info
        student: student.fullName,
        student_name: student.fullName,
        name: student.fullName, // For Quran Report PDF which uses 'name' field
        studentId: student.id, // Track which student this data belongs to
        // OEN is stored in schooling information in people management
        OEN: student.schooling?.oen || student.oen || student.OEN || '',
        oen: student.schooling?.oen || student.oen || student.OEN || '',
        // Extract grade - preserve JK/SK for kindergarten, extract number for other grades
        grade: (() => {
          const gradeValue = student.grade || student.program || ''
          if (!gradeValue) return ''
          const gradeLower = gradeValue.toString().toLowerCase()
          // Preserve JK/SK for kindergarten reports
          if (gradeLower.includes('jk') || gradeLower === 'junior kindergarten') {
            return 'JK'
          }
          if (gradeLower.includes('sk') || gradeLower === 'senior kindergarten') {
            return 'SK'
          }
          // Extract number from grade string (handles "grade 8", "Grade 7", "8", etc.)
          const match = gradeValue.toString().match(/\d+/)
          return match ? match[0] : gradeValue
        })(),

        // B10: Autofill date (always use setting if available, otherwise today's date)
        date: dateString,
        
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
          principal: 'Ghazala Choudary',
          telephone: '613 421 1700',
          
          // Board Info - Empty by default
          boardInfo: '',
          
          // Grade 7-8 Subject Names (for Native Language and Other)
          nativeLanguage: 'Arabic Studies',
          other: 'Islamic Studies',
          
          // Ensure boardSpace is always blank for 1-6 progress report
          boardSpace: '',
          boardspace: '',
          
          // B12: Auto-check French Core checkbox for all reports
          frenchCore: true,
          
          // B16: Set Dance, Drama, Music to N/A by default
          danceNA: true,
          dramaNA: true,
          musicNA: true,
          
          // Initialize signatures (will be updated when teacher loads)
          teacherSignature: { type: 'typed', value: '' },
          principalSignature: { type: 'typed', value: 'Ghazala Choudary' },
      }
      
      // B6: Set homeroom teacher name (async, update after initial set)
      // Also get ECE for kindergarten reports
      const ecePromise = (selectedReportCard === 'kg-initial-observations' || selectedReportCard === 'kg-report') 
        ? getECEName(student) 
        : Promise.resolve('')
      
      // DO NOT set formData here - let the useEffect handle it!
      // The useEffect will either load an existing draft OR initialize fresh data
      // If we set formData here, it will overwrite any draft data loaded by the useEffect
      // (React might batch the state updates, causing race conditions)
      
      // Store the newFormData for use in the useEffect if no draft is found
      // We'll use this in the Promise.all below to update teacher fields
      
      // (debug logging removed)
      
      // Load homeroom teacher and ECE asynchronously
      // This will update formData with teacher/ECE AFTER the useEffect has loaded the draft or initialized fresh data
      Promise.all([homeroomTeacherPromise, ecePromise]).then(([teacherName, eceName]) => {
        console.log('🎯 Homeroom Teacher Promise resolved:', {
          teacherName,
          eceName,
          reportType: selectedReportCard,
          studentName: student.fullName,
        })
        
        if (teacherName) {
          console.log('✅ Setting teacher fields:', teacherName)
          setFormData((prevData) => {
            console.log('📝 Previous formData teacher fields:', {
              teacher: prevData.teacher,
              teacher_name: prevData.teacher_name,
            })
            
            // Create a new object to ensure React detects the change
            const updatedData = {
              ...prevData,
              teacher: teacherName,
              teacher_name: teacherName,
            }
            
            // Auto-fill teacher signature if not already set
            if (!prevData.teacherSignature?.value || prevData.teacherSignature.value.trim() === '') {
              updatedData.teacherSignature = { type: 'typed', value: teacherName }
              console.log('✅ Set teacherSignature:', updatedData.teacherSignature)
            }
            
            // Auto-fill principal signature if not already set
            if (!prevData.principalSignature?.value || prevData.principalSignature.value.trim() === '') {
              updatedData.principalSignature = { type: 'typed', value: 'Ghazala Choudary' }
              console.log('✅ Set principalSignature:', updatedData.principalSignature)
            }
            
            // Auto-fill ECE for kindergarten reports
            if (eceName && (selectedReportCard === 'kg-initial-observations' || selectedReportCard === 'kg-report')) {
              // Always update ECE fields with the current ECE from the course
              updatedData.earlyChildEducator = eceName
              updatedData.earlyChildhoodEducator = eceName
              console.log('✅ Set ECE fields:', eceName)
            }
            
            console.log('📤 Updated formData teacher fields:', {
              teacher: updatedData.teacher,
              teacher_name: updatedData.teacher_name,
              teacherSignature: updatedData.teacherSignature,
              principalSignature: updatedData.principalSignature,
            })
            console.log('📤 Full updated formData keys:', Object.keys(updatedData))
            console.log('📤 Teacher value in updatedData:', updatedData.teacher)
            console.log('📤 Teacher_name value in updatedData:', updatedData.teacher_name)
            console.log('📤 Returning updated formData - React should re-render now')
            
            // Return a new object to ensure React detects the change
            return { ...updatedData }
          })
        } else {
          console.warn('⚠️ No teacher name returned from getHomeroomTeacherName')
        }
      }).catch((error) => {
        console.error('❌ Error loading homeroom teacher or ECE:', error)
      })
    }
  }

  /**
   * Map old field names to new field names for backward compatibility
   * This handles the migration from individual PE/Visual Arts comment fields
   * to combined Health & PE and Arts comment fields
   * 
   * @param {Object} formData - Form data with potentially old field names
   * @param {string} reportType - Report card type ID to determine correct mapping
   * @returns {Object} Form data with old field names mapped to new ones
   */
  const mapOldFieldNamesToNew = (formData, reportType) => {
    if (!formData || typeof formData !== 'object') {
      return formData
    }

    const mappedData = { ...formData }
    let hasMappings = false

    // Map old PE field to new combined Health & PE field
    if (mappedData.peStrengthAndNextStepsForImprovement) {
      // Only map if the new field doesn't already have a value
      if (!mappedData.healthAndPEStrengthsAndNextStepsForImprovement) {
        mappedData.healthAndPEStrengthsAndNextStepsForImprovement = mappedData.peStrengthAndNextStepsForImprovement
        hasMappings = true
        console.log('🔄 Mapped old field: peStrengthAndNextStepsForImprovement → healthAndPEStrengthsAndNextStepsForImprovement')
      }
      // Remove the old field after mapping
      delete mappedData.peStrengthAndNextStepsForImprovement
    }

    // Map old Visual Arts field to new combined Arts field
    if (mappedData.visualArtsStrengthAndNextStepsForImprovement) {
      // Determine the correct new field name based on report type
      const newArtsFieldName = reportType === '7-8-report-card' 
        ? 'artsStrengthsAndNextStepsForImprovement' 
        : 'artsStrengthAndNextStepsForImprovement'
      
      // Only map if the new field doesn't already have a value
      if (!mappedData[newArtsFieldName]) {
        mappedData[newArtsFieldName] = mappedData.visualArtsStrengthAndNextStepsForImprovement
        hasMappings = true
        console.log(`🔄 Mapped old field: visualArtsStrengthAndNextStepsForImprovement → ${newArtsFieldName}`)
      }
      // Remove the old field after mapping
      delete mappedData.visualArtsStrengthAndNextStepsForImprovement
    }

    if (hasMappings) {
      console.log('✅ Applied field name mappings for backward compatibility')
    }

    return mappedData
  }

  /**
   * Load existing draft from Firebase for the given student + report type + term
   * Order of persistence:
   * 1. If draft exists for this student + report type + term, load it
   * 2. For Term 2: If no Term 2 draft, use final Term 1 form, or latest Term 1 draft
   * 3. If nothing found, return null (will create new draft)
   * 
   * @param {Object} student - Selected student object
   * @param {string} reportType - Report card type ID
   * @param {string} term - Term identifier ('term1' or 'term2')
   */
  const loadExistingDraft = async (student, reportType, term = selectedTerm) => {
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
        term: term,
        userId: user.uid,
      })

      // Step 1: Try deterministic ID first (userUid_studentId_reportType_term)
      const draftId = `${user.uid}_${student.id}_${reportType}_${term}`
      const draftRef = doc(firestore, 'reportCardDrafts', draftId)
      const draftSnap = await getDoc(draftRef)

      if (draftSnap.exists()) {
        const draftData = draftSnap.data()
        let loadedFormData = draftData.formData || {}
        
        console.log('✅ Found existing draft with deterministic ID:', {
          draftId: draftId,
          term: term,
          status: draftData.status,
          lastModified: draftData.lastModified?.toDate?.(),
          fieldCount: Object.keys(loadedFormData).length,
          hasFormData: !!loadedFormData && Object.keys(loadedFormData).length > 0,
        })

        // Map old field names to new field names for backward compatibility
        loadedFormData = mapOldFieldNamesToNew(loadedFormData, reportType)

        // Separate term-specific and shared fields from loaded data
        const { termData: loadedTermData, sharedData: loadedSharedData } = separateTermFields(loadedFormData, term)
        
        // Merge term-specific and shared fields
        const mergedFormData = mergeTermFields(loadedTermData, loadedSharedData, {})
        
        // ALWAYS refresh attendance with latest student data
        // Also ensure date and teacher are set
        const refreshedFormData = {
          ...mergedFormData,
          daysAbsent: student.currentTermAbsenceCount || 0,
          totalDaysAbsent: student.yearAbsenceCount || 0,
          timesLate: student.currentTermLateCount || 0,
          totalTimesLate: student.yearLateCount || 0,
        }
        
        // Auto-fill date from settings if not already set
        if (!refreshedFormData.date) {
          try {
            const settingsDoc = await getDoc(doc(firestore, 'systemSettings', 'reportCardSms'))
            if (settingsDoc.exists()) {
              const settingsData = settingsDoc.data()
              refreshedFormData.date = settingsData.reportCardDate || new Date().toLocaleDateString('en-CA')
            } else {
              refreshedFormData.date = new Date().toLocaleDateString('en-CA')
            }
          } catch (error) {
            refreshedFormData.date = new Date().toLocaleDateString('en-CA')
          }
        }
        
        // Auto-fill teacher if not already set
        if (!refreshedFormData.teacher && !refreshedFormData.teacher_name) {
          const teacherName = await getHomeroomTeacherName(student, selectedReportCard)
          if (teacherName) {
            refreshedFormData.teacher = teacherName
            refreshedFormData.teacher_name = teacherName
          }
        }
        
        // Auto-fill signatures if not already set
        if (!refreshedFormData.teacherSignature?.value && (refreshedFormData.teacher_name || refreshedFormData.teacher)) {
          refreshedFormData.teacherSignature = { type: 'typed', value: refreshedFormData.teacher_name || refreshedFormData.teacher }
        }
        if (!refreshedFormData.principalSignature?.value) {
          refreshedFormData.principalSignature = { type: 'typed', value: 'Ghazala Choudary' }
        }
        
        setFormData(refreshedFormData)
        setCurrentDraftId(draftId)

        console.log('📊 Loaded draft data:', {
          term: term,
          termSpecificFields: Object.keys(loadedTermData).length,
          sharedFields: Object.keys(loadedSharedData).length,
          totalFields: Object.keys(refreshedFormData).length,
        })

        return draftData
      } else {
        console.log('❌ Draft not found with deterministic ID:', draftId)
      }

      // Step 2: Query for ANY draft with this student + report type + term (cross-teacher support)
      console.log('🔍 Step 2: Searching for drafts from ANY teacher for this term...')
      try {
        // Try with term filter first
        let draftsQuery = query(
          collection(firestore, 'reportCardDrafts'),
          where('studentId', '==', student.id),
          where('reportCardType', '==', reportType),
          where('term', '==', term)
        )
        let querySnapshot = await getDocs(draftsQuery)

        // If query fails or returns empty, try without term filter and filter in memory
        if (querySnapshot.empty) {
          console.log('🔍 Step 2a: Trying query without term filter...')
          draftsQuery = query(
            collection(firestore, 'reportCardDrafts'),
            where('studentId', '==', student.id),
            where('reportCardType', '==', reportType)
          )
          querySnapshot = await getDocs(draftsQuery)
        }

        if (!querySnapshot.empty) {
          const allDrafts = querySnapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data(),
            lastModified: doc.data().lastModified?.toDate?.() || doc.data().createdAt?.toDate?.() || new Date(0),
          }))

          // Get the most recent draft matching the term
          const drafts = allDrafts.filter(draft => draft.data.term === term)
          
          // If no drafts match the selected term, fall back to the latest draft
          // to ensure saved work is visible even if term selection was off.
          const draftsToConsider = drafts.length > 0 ? drafts : allDrafts
          if (drafts.length === 0 && allDrafts.length > 0) {
            console.warn('⚠️ No drafts matched selected term, falling back to latest draft', {
              requestedTerm: term,
              latestDraftTerm: allDrafts[0]?.data?.term,
            })
          }

          if (draftsToConsider.length > 0) {
            // Sort by lastModified descending
            draftsToConsider.sort((a, b) => b.lastModified - a.lastModified)
            const existingDraft = draftsToConsider[0]
            const draftData = existingDraft.data
            let loadedFormData = draftData.formData || {}
            const effectiveTerm = draftData.term || term
            
            console.log('✅ Found draft from any teacher:', {
              draftId: existingDraft.id,
              term: effectiveTerm,
              originalTeacher: draftData.teacherName,
              lastModified: existingDraft.lastModified,
              fieldCount: Object.keys(loadedFormData).length,
            })

            // Map old field names to new field names for backward compatibility
            loadedFormData = mapOldFieldNamesToNew(loadedFormData, reportType)

            // Keep UI term in sync with the draft we loaded
            if (effectiveTerm && effectiveTerm !== term) {
              setSelectedTerm(effectiveTerm)
            }

            // Separate term-specific and shared fields
            const { termData: loadedTermData, sharedData: loadedSharedData } = separateTermFields(loadedFormData, effectiveTerm)
            
            // Merge term-specific and shared fields
            const mergedFormData = mergeTermFields(loadedTermData, loadedSharedData, {})
            
            // ALWAYS refresh attendance with latest student data
            // Also ensure date and teacher are set
            const refreshedFormData = {
              ...mergedFormData,
              daysAbsent: student.currentTermAbsenceCount || 0,
              totalDaysAbsent: student.yearAbsenceCount || 0,
              timesLate: student.currentTermLateCount || 0,
              totalTimesLate: student.yearLateCount || 0,
            }
            
            // Auto-fill date from settings if not already set
            if (!refreshedFormData.date) {
              try {
                const settingsDoc = await getDoc(doc(firestore, 'systemSettings', 'reportCardSms'))
                if (settingsDoc.exists()) {
                  const settingsData = settingsDoc.data()
                  refreshedFormData.date = settingsData.reportCardDate || new Date().toLocaleDateString('en-CA')
                } else {
                  refreshedFormData.date = new Date().toLocaleDateString('en-CA')
                }
              } catch (error) {
                refreshedFormData.date = new Date().toLocaleDateString('en-CA')
              }
            }
            
            // Auto-fill teacher if not already set
            if (!refreshedFormData.teacher && !refreshedFormData.teacher_name) {
              const teacherName = await getHomeroomTeacherName(student, selectedReportCard)
              if (teacherName) {
                refreshedFormData.teacher = teacherName
                refreshedFormData.teacher_name = teacherName
              }
            }
            
            // Auto-fill signatures if not already set
            if (!refreshedFormData.teacherSignature?.value && (refreshedFormData.teacher_name || refreshedFormData.teacher)) {
              refreshedFormData.teacherSignature = { type: 'typed', value: refreshedFormData.teacher_name || refreshedFormData.teacher }
            }
            if (!refreshedFormData.principalSignature?.value) {
              refreshedFormData.principalSignature = { type: 'typed', value: 'Ghazala Choudary' }
            }
            
            setFormData(refreshedFormData)
            setCurrentDraftId(existingDraft.id)

            console.log('📊 Loaded cross-teacher draft:', {
              term: effectiveTerm,
              termSpecificFields: Object.keys(loadedTermData).length,
              sharedFields: Object.keys(loadedSharedData).length,
            })

            return draftData
          }
        }
      } catch (queryError) {
        console.warn('⚠️ Error querying drafts (may not have index):', queryError)
        // Continue to next step
      }

      // Step 3: For Term 2, try to load from final Term 1 form or latest Term 1 draft
      if (term === 'term2') {
        console.log('🔍 Step 3: Term 2 - Looking for final Term 1 form or latest Term 1 draft...')
        
        // First, try to find completed Term 1 report in reportCards collection
        // Then get the formData from the associated draft (which should still exist with status: 'complete')
        try {
          // Try querying without status filter first (filter in memory)
          let completedReportsQuery = query(
            collection(firestore, 'reportCards'),
            where('studentId', '==', student.id),
            where('type', '==', reportType),
            where('term', '==', 'term1')
          )
          let completedReportsSnapshot = await getDocs(completedReportsQuery)
          
          // Filter for completed/approved status in memory
          const completedReports = completedReportsSnapshot.docs
            .map(doc => ({
              id: doc.id,
              data: doc.data(),
              completedAt: doc.data().completedAt?.toDate?.() || doc.data().createdAt?.toDate?.() || new Date(0),
            }))
            .filter(report => {
              const status = report.data.status
              return status === 'complete' || status === 'approved'
            })
          
          if (completedReports.length > 0) {
            // Get the most recent completed report
            completedReports.sort((a, b) => b.completedAt - a.completedAt)
            const latestCompleted = completedReports[0]
            
            console.log('✅ Found completed Term 1 report:', {
              reportId: latestCompleted.id,
              completedAt: latestCompleted.completedAt,
              status: latestCompleted.data.status,
            })
            
            // Try to get the formData from the associated draft
            // First try current user's draft, then try querying for any Term 1 draft
            let term1DraftSnap = null
            const term1DraftId = `${user.uid}_${student.id}_${reportType}_term1`
            const term1DraftRef = doc(firestore, 'reportCardDrafts', term1DraftId)
            term1DraftSnap = await getDoc(term1DraftRef)
            
            // If not found, query for any Term 1 draft for this student
            if (!term1DraftSnap.exists()) {
              console.log('🔍 Current user draft not found, searching for any Term 1 draft...')
              const term1DraftsQuery = query(
                collection(firestore, 'reportCardDrafts'),
                where('studentId', '==', student.id),
                where('reportCardType', '==', reportType),
                where('term', '==', 'term1')
              )
              const term1DraftsSnapshot = await getDocs(term1DraftsQuery)
              
              if (!term1DraftsSnapshot.empty) {
                // Get the most recent Term 1 draft (prefer completed ones)
                const term1Drafts = term1DraftsSnapshot.docs.map(doc => ({
                  id: doc.id,
                  data: doc.data(),
                  lastModified: doc.data().lastModified?.toDate?.() || doc.data().createdAt?.toDate?.() || new Date(0),
                  isComplete: doc.data().status === 'complete',
                }))
                
                // Sort: completed first, then by lastModified
                term1Drafts.sort((a, b) => {
                  if (a.isComplete !== b.isComplete) return b.isComplete - a.isComplete
                  return b.lastModified - a.lastModified
                })
                
                const latestTerm1Draft = term1Drafts[0]
                term1DraftSnap = { exists: () => true, data: () => latestTerm1Draft.data }
                console.log('✅ Found Term 1 draft from any teacher:', latestTerm1Draft.id)
              }
            }
            
            if (term1DraftSnap && term1DraftSnap.exists()) {
              const term1DraftData = term1DraftSnap.data()
              let term1FormData = term1DraftData.formData || {}
              
              console.log('📋 Using completed Term 1 draft as base for Term 2', {
                draftId: term1DraftId,
                fieldCount: Object.keys(term1FormData).length,
              })
              
              // Map old field names to new field names for backward compatibility
              term1FormData = mapOldFieldNamesToNew(term1FormData, reportType)
              
              // Convert Term 1 fields to Term 2 equivalents
              const term2FormData = copyTerm1ToTerm2(term1FormData)
              
              // C18: Autofill Placement only in Term 2 for KG reports
              if (reportType && (reportType.includes('kg') || reportType.includes('kindergarten'))) {
                const grade = student.grade || student.program || ''
                const gradeLower = grade.toString().toLowerCase()
                
                // SK -> Grade 1, JK -> KG Year 2
                if (gradeLower.includes('sk') || gradeLower === 'senior kindergarten') {
                  term2FormData.placementInSeptemberGrade1 = true
                  term2FormData.placementInSeptemberKG2 = false
                } else if (gradeLower.includes('jk') || gradeLower === 'junior kindergarten') {
                  term2FormData.placementInSeptemberKG2 = true
                  term2FormData.placementInSeptemberGrade1 = false
                }
              }
              
              // ALWAYS refresh attendance with latest student data
              // Also ensure date and teacher are set
              const refreshedFormData = {
                ...term2FormData,
                daysAbsent: student.currentTermAbsenceCount || 0,
                totalDaysAbsent: student.yearAbsenceCount || 0,
                timesLate: student.currentTermLateCount || 0,
                totalTimesLate: student.yearLateCount || 0,
              }
              
              // Auto-fill date from settings if not already set
              if (!refreshedFormData.date) {
                try {
                  const settingsDoc = await getDoc(doc(firestore, 'systemSettings', 'reportCardSms'))
                  if (settingsDoc.exists()) {
                    const settingsData = settingsDoc.data()
                    refreshedFormData.date = settingsData.reportCardDate || new Date().toLocaleDateString('en-CA')
                  } else {
                    refreshedFormData.date = new Date().toLocaleDateString('en-CA')
                  }
                } catch (error) {
                  refreshedFormData.date = new Date().toLocaleDateString('en-CA')
                }
              }
              
              // Auto-fill teacher if not already set
              if (!refreshedFormData.teacher && !refreshedFormData.teacher_name) {
                const teacherName = await getHomeroomTeacherName(student)
                if (teacherName) {
                  refreshedFormData.teacher = teacherName
                  refreshedFormData.teacher_name = teacherName
                }
              }
              
              // Auto-fill signatures if not already set
              if (!refreshedFormData.teacherSignature?.value && (refreshedFormData.teacher_name || refreshedFormData.teacher)) {
                refreshedFormData.teacherSignature = { type: 'typed', value: refreshedFormData.teacher_name || refreshedFormData.teacher }
              }
              if (!refreshedFormData.principalSignature?.value) {
                refreshedFormData.principalSignature = { type: 'typed', value: 'Ghazala Choudary' }
              }
              
              setFormData(refreshedFormData)
              setCurrentDraftId(null) // Will create new Term 2 draft
              
              console.log('📊 Loaded Term 1 completed form as base for Term 2')
              return { formData: term2FormData, isFromTerm1: true }
            }
          }
        } catch (completedError) {
          console.warn('⚠️ Error querying completed reports:', completedError)
          // Continue to try Term 1 draft
        }
        
        // If no completed Term 1 form, try to get latest Term 1 draft
        try {
          // Try with term filter first
          let term1DraftsQuery = query(
            collection(firestore, 'reportCardDrafts'),
            where('studentId', '==', student.id),
            where('reportCardType', '==', reportType),
            where('term', '==', 'term1')
          )
          let term1DraftsSnapshot = await getDocs(term1DraftsQuery)
          
          // If empty, try without term filter and filter in memory
          if (term1DraftsSnapshot.empty) {
            console.log('🔍 Trying Term 1 draft query without term filter...')
            term1DraftsQuery = query(
              collection(firestore, 'reportCardDrafts'),
              where('studentId', '==', student.id),
              where('reportCardType', '==', reportType)
            )
            term1DraftsSnapshot = await getDocs(term1DraftsQuery)
          }
          
          if (!term1DraftsSnapshot.empty) {
            // Get the most recent Term 1 draft (prefer completed ones)
            const term1Drafts = term1DraftsSnapshot.docs
              .map(doc => ({
                id: doc.id,
                data: doc.data(),
                lastModified: doc.data().lastModified?.toDate?.() || doc.data().createdAt?.toDate?.() || new Date(0),
                isComplete: doc.data().status === 'complete',
                term: doc.data().term || 'term1',
              }))
              .filter(draft => draft.term === 'term1') // Filter by term in memory if needed
            
            if (term1Drafts.length > 0) {
              // Sort: completed first, then by lastModified
              term1Drafts.sort((a, b) => {
                if (a.isComplete !== b.isComplete) return b.isComplete - a.isComplete
                return b.lastModified - a.lastModified
              })
              
              const latestTerm1Draft = term1Drafts[0]
              let term1FormData = latestTerm1Draft.data.formData || {}
              
              console.log('📋 Using latest Term 1 draft as base for Term 2:', {
                draftId: latestTerm1Draft.id,
                lastModified: latestTerm1Draft.lastModified,
                isComplete: latestTerm1Draft.isComplete,
                fieldCount: Object.keys(term1FormData).length,
              })
              
              // Map old field names to new field names for backward compatibility
              term1FormData = mapOldFieldNamesToNew(term1FormData, reportType)
              
              // Convert Term 1 fields to Term 2 equivalents
              const term2FormData = copyTerm1ToTerm2(term1FormData)
              
              // C18: Autofill Placement only in Term 2 for KG reports
              if (reportType && (reportType.includes('kg') || reportType.includes('kindergarten'))) {
                const grade = student.grade || student.program || ''
                const gradeLower = grade.toString().toLowerCase()
                
                // SK -> Grade 1, JK -> KG Year 2
                if (gradeLower.includes('sk') || gradeLower === 'senior kindergarten') {
                  term2FormData.placementInSeptemberGrade1 = true
                  term2FormData.placementInSeptemberKG2 = false
                } else if (gradeLower.includes('jk') || gradeLower === 'junior kindergarten') {
                  term2FormData.placementInSeptemberKG2 = true
                  term2FormData.placementInSeptemberGrade1 = false
                }
              }
              
              // ALWAYS refresh attendance with latest student data
              const refreshedFormData = {
                ...term2FormData,
                daysAbsent: student.currentTermAbsenceCount || 0,
                totalDaysAbsent: student.yearAbsenceCount || 0,
                timesLate: student.currentTermLateCount || 0,
                totalTimesLate: student.yearLateCount || 0,
              }
              
              // Auto-fill signatures if not already set
              if (!refreshedFormData.teacherSignature?.value && refreshedFormData.teacher_name) {
                // Only add ERS if not already present (case-insensitive check)
          refreshedFormData.teacherSignature = { type: 'typed', value: refreshedFormData.teacher_name }
              }
              if (!refreshedFormData.principalSignature?.value) {
                refreshedFormData.principalSignature = { type: 'typed', value: 'Ghazala Choudary' }
              }
              
              setFormData(refreshedFormData)
              setCurrentDraftId(null) // Will create new Term 2 draft
              
              console.log('📊 Loaded Term 1 draft as base for Term 2')
              return { formData: term2FormData, isFromTerm1: true }
            }
          }
        } catch (term1DraftError) {
          console.warn('⚠️ Error querying Term 1 drafts:', term1DraftError)
        }
      }

      // Step 4: No draft found - return null (form will use auto-populated student data)
      console.log('📝 No existing draft found - will create new draft')
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

  // Load existing draft when student + report type + term changes
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
      const existingDraft = await loadExistingDraft(selectedStudent, selectedReportCard, selectedTerm)

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
          principal: 'Ghazala Choudary',
          telephone: '613 421 1700',
          
          // Board Info - Empty by default
          boardInfo: '',
          
          // Grade 7-8 Subject Names (for Native Language and Other)
          nativeLanguage: 'Arabic Studies',
          other: 'Islamic Studies',
          
          boardSpace: '',
          boardspace: '',
          
          // B12: Auto-check French Core checkbox for all reports
          frenchCore: true,
          
          // B16: Set Dance, Drama, Music to N/A by default
          danceNA: true,
          dramaNA: true,
          musicNA: true,

          // Preserve teacher if already set
          teacher: formData.teacher || '',
          teacher_name: formData.teacher_name || '',
          
          // Initialize signatures (will be updated when teacher loads)
          teacherSignature: { type: 'typed', value: '' },
          principalSignature: { type: 'typed', value: 'Ghazala Choudary' },
        }

        // Auto-fill date from settings (always use current setting to keep dates in sync)
        if (reportCardDateSetting) {
          studentData.date = reportCardDateSetting
        } else if (!studentData.date || studentData.date.trim() === '') {
          // Only use today's date if no setting and no existing date
          const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD format
          studentData.date = today
        }

        // Auto-fill signatures if not already set
        if (!studentData.teacherSignature?.value && studentData.teacher_name) {
          studentData.teacherSignature = { type: 'typed', value: studentData.teacher_name }
        }
        if (!studentData.principalSignature?.value) {
          studentData.principalSignature = { type: 'typed', value: 'Ghazala Choudary' }
        }

        // Merge with any existing formData to avoid overwriting freshly-set fields (e.g., teacher)
        setFormData((prev) => ({
          ...studentData,
          // Preserve teacher fields/signatures if they were already populated
          teacher: prev.teacher || studentData.teacher,
          teacher_name: prev.teacher_name || studentData.teacher_name,
          teacherSignature: prev.teacherSignature || studentData.teacherSignature,
          principalSignature: prev.principalSignature || studentData.principalSignature,
        }))
      }
    }

    loadDraft()
  }, [selectedStudent, selectedReportCard, selectedTerm, user, reportCardDateSetting]) // B7: Include selectedTerm and reportCardDateSetting in dependencies

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

  // B17: Save All functionality - saves the entire report card
  const saveAll = async () => {
    await saveDraft()
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

      // Separate term-specific fields from shared fields
      const { termData, sharedData } = separateTermFields(formData, selectedTerm)
      
      // Clean formData to remove undefined values (Firestore doesn't allow undefined)
      const cleanTermData = {}
      Object.keys(termData).forEach((key) => {
        const value = termData[key]
        if (value !== undefined && value !== null) {
          cleanTermData[key] = value === '' ? '' : value
        }
      })
      
      const cleanSharedData = {}
      Object.keys(sharedData).forEach((key) => {
        const value = sharedData[key]
        if (value !== undefined && value !== null) {
          cleanSharedData[key] = value === '' ? '' : value
        }
      })
      
      // Merge term-specific and shared data for storage
      const cleanFormData = {
        ...cleanSharedData,
        ...cleanTermData,
      }

      console.log('🧹 Separated and cleaned form data:', {
        term: selectedTerm,
        termSpecificFields: Object.keys(cleanTermData).length,
        sharedFields: Object.keys(cleanSharedData).length,
        totalFields: Object.keys(cleanFormData).length,
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
        term: selectedTerm, // B7: Store term in draft
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
      // B7: Include term in draft ID to separate Term 1 and Term 2 documents
      const draftId = currentDraftId || `${user.uid}_${selectedStudent.id}_${selectedReportCard}_${selectedTerm}`
      const draftRef = doc(firestore, 'reportCardDrafts', draftId)

      console.log('💾 Attempting to save to Firestore with ID:', draftId)
      console.log('📋 Using draft ID:', currentDraftId ? 'Existing draft' : 'New draft')

      // Check if draft already exists
      console.log('🔍 Checking if draft exists...')
      const existingDoc = await getDoc(draftRef)

      if (existingDoc.exists()) {
        console.log('📝 Updating existing draft...')
        const existingData = existingDoc.data()
        
        // If this draft was previously approved, reset it to pending when edited
        const wasApproved = existingData.adminReviewStatus === 'approved' || existingData.status === 'complete'
        const resetApprovalStatus = wasApproved ? 'pending' : (existingData.adminReviewStatus || 'pending')
        
        if (wasApproved) {
          console.log('⚠️ Draft was previously approved - resetting to pending status for re-approval')
        }
        
        // Update existing draft - preserve original creator info
        await updateDoc(draftRef, {
          ...draftData,
          createdAt: existingData.createdAt, // Preserve original creation date
          originalTeacherId: existingData.originalTeacherId || existingData.uid,
          originalTeacherName: existingData.originalTeacherName || existingData.teacherName,
          lastModified: serverTimestamp(), // Update modification time
          // Reset approval status if it was previously approved
          adminReviewStatus: resetApprovalStatus,
          status: wasApproved ? 'draft' : (existingData.status || 'draft'),
          // Clear approval metadata if resetting
          ...(wasApproved && {
            adminReviewedAt: null,
            adminReviewedBy: null,
            publishedToParents: false,
          }),
        })
        setSaveMessage(wasApproved ? 'Draft updated successfully - requires re-approval!' : 'Draft updated successfully!')
        setHasUnsavedChanges(false) // B5: Clear unsaved changes flag
        console.log('✅ Draft updated successfully', wasApproved ? '(reset to pending)' : '')
        
        // Sync grades to course if this is a report card (not progress report)
        if (selectedReportCard && !selectedReportCard.includes('progress') && !selectedReportCard.includes('initial')) {
          syncGradesToCourse(cleanFormData, selectedStudent.id, selectedTerm, selectedReportCard)
            .catch(error => console.error('Error syncing grades:', error))
        }
      } else {
        console.log('📄 Creating new draft...')
        // Create new draft with original creator info
        await setDoc(draftRef, {
          ...draftData,
          originalTeacherId: user.uid,
          originalTeacherName: user.displayName || user.email || 'Unknown Teacher',
        })
        setSaveMessage('Draft saved successfully!')
        setHasUnsavedChanges(false) // B5: Clear unsaved changes flag
        console.log('✅ New draft created successfully')
        
        // Sync grades to course if this is a report card (not progress report)
        if (selectedReportCard && !selectedReportCard.includes('progress') && !selectedReportCard.includes('initial')) {
          syncGradesToCourse(cleanFormData, selectedStudent.id, selectedTerm, selectedReportCard)
            .catch(error => console.error('Error syncing grades:', error))
        }
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
        // When opening via "Edit Report Card" (Admin Review or Past Reports), allow Next/Previous and Save All
        setAllowEditFromReview(true)

        let parsedFormData = JSON.parse(draftFormData)
        const parsedStudent = JSON.parse(draftStudent)

        // Map old field names to new field names for backward compatibility
        parsedFormData = mapOldFieldNamesToNew(parsedFormData, draftReportType)

        // ALWAYS refresh attendance data with latest student counts
        const refreshedFormData = {
          ...parsedFormData,
          daysAbsent: parsedStudent.currentTermAbsenceCount || 0,
          totalDaysAbsent: parsedStudent.yearAbsenceCount || 0,
          timesLate: parsedStudent.currentTermLateCount || 0,
          totalTimesLate: parsedStudent.yearLateCount || 0,
        }

        // Set the report card type first (this overrides any presetReportCardId)
        setSelectedReportCard(draftReportType)
        setSelectedStudent(parsedStudent)
        setFormData(refreshedFormData) // Use refreshed data
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
        let savedData = JSON.parse(saved)

        // Validate that the saved data belongs to the current student (if we have a student)
        if (selectedStudent && savedData.studentId && savedData.studentId !== selectedStudent.id) {
          console.warn('Saved form data belongs to a different student, skipping load')
          return
        }

        // Map old field names to new field names for backward compatibility
        if (savedData && typeof savedData === 'object') {
          savedData = mapOldFieldNamesToNew(savedData, selectedReportCard)
        }

        // Preserve auto-populated student data when switching report card types
        // ALWAYS use latest attendance data from selectedStudent
        const currentStudentData = {
          student: formData.student,
          student_name: formData.student_name,
          OEN: formData.OEN,
          oen: formData.oen,
          grade: formData.grade,
          // ALWAYS refresh attendance data from latest student info
          daysAbsent: selectedStudent?.currentTermAbsenceCount || 0,
          totalDaysAbsent: selectedStudent?.yearAbsenceCount || 0,
          timesLate: selectedStudent?.currentTermLateCount || 0,
          totalTimesLate: selectedStudent?.yearLateCount || 0,
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

      // Attendance - Using actual PDF field names (7-8 provincial report uses timeLate/totalTimeLate singular)
      daysAbsent: ['daysAbsent'],
      totalDaysAbsent: ['totalDaysAbsent'],
      timesLate: ['timesLate', 'timeLate'],
      totalTimesLate: ['totalTimesLate', 'totalTimeLate'],

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

  // Determine if a field should be left-aligned
  // Fields like name, grade, teacher, principal, and comments should be left-aligned
  const shouldBeLeftAligned = (fieldName) => {
    if (!fieldName) return false
    const lowerName = fieldName.toLowerCase()
    
    // Fields that should be left-aligned
    const leftAlignFields = [
      'name', 'student', 'studentname',
      'grade',
      'teacher', 'teachernam', 'teachername',
      'principal', 'principle', 'principalname',
      'sans', // Comments field
      'strengths', 'nextsteps', 'improvement',
      'comments', 'comment',
    ]
    
    return leftAlignFields.some(field => lowerName.includes(field))
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
              // Set text alignment using quadding (Q) property
              // 0=left, 1=center, 2=right
              const alignment = shouldBeLeftAligned(fieldName) ? 0 : 1
              acroField.setDefaultAppearance(`/F1 ${fontSize} Tf 0 g`)
              
              // Set the quadding (Q) property on the field's dictionary
              // This controls text alignment within the field
              try {
                acroField.dict.set(PDFName.of('Q'), PDFNumber.of(alignment))
              } catch (quaddingError) {
                console.warn(`Could not set quadding for "${fieldName}":`, quaddingError)
              }
              
              // Update appearances with the font
              field.updateAppearances(font)
              
              console.log(`✅ Updated text field "${fieldName}" appearance with font size ${fontSize}pt, alignment: ${alignment === 0 ? 'left' : 'center'}`)
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
        case 'quran-report':
          finalPdfBytes = await exportQuranReport(reportCardType.pdfPath, formData, studentName)
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
          // B7: Include term in saved report card document
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
            term: selectedTerm, // B7: Store term (term1 or term2)
            createdAt: serverTimestamp(),
            completedAt: serverTimestamp(),
          })

          // Convert draft to completed status instead of deleting
          // B7: Include term in draft ID
          if (selectedStudent) {
            const draftId = `${user.uid}_${selectedStudent.id}_${selectedReportCard}_${selectedTerm}`
            try {
              // Update the draft to mark it as completed
              const draftRef = doc(firestore, 'reportCardDrafts', draftId)
              await updateDoc(draftRef, {
                status: 'complete',
                completedAt: serverTimestamp(),
                tarbiyahId: selectedStudent?.schoolId || selectedStudent?.id || '',
                finalPdfUrl: downloadURL,
                finalPdfPath: filePath,
                term: selectedTerm, // Store term in draft
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
      onSaveAll: saveAll, // B17: Save All functionality
      isSaving: isSaving,
      saveMessage: saveMessage,
      selectedStudent: selectedStudent,
      selectedReportCard: selectedReportCard,
      disableEditing: disableEditing, // B9: Pass disable editing flag
      selectedTerm: selectedTerm, // B7: Pass selected term to filter fields
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
      case 'QuranReportUI':
        return <QuranReportUI {...formProps} />
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
                    {getFilteredReportCardTypes().map((type) => (
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
                  reportCardType={selectedReportCard}
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
                  <div className="mt-3 d-flex gap-2 align-items-center">
                    <CButton color="outline-secondary" size="sm" onClick={handleChangeStudent}>
                      Change Student
                    </CButton>
                    {/* B5: Next/Previous navigation */}
                    {classStudents.length > 0 && currentStudentIndex >= 0 && (
                      <div className="d-flex align-items-center gap-2">
                        <CButton
                          color="outline-primary"
                          size="sm"
                          onClick={() => handleNavigateStudent('previous')}
                          disabled={(!allowEditFromReview && disableEditing) || classStudents.length <= 1}
                          variant="outline"
                        >
                          ← Previous
                        </CButton>
                        <CButton
                          color="outline-primary"
                          size="sm"
                          onClick={() => handleNavigateStudent('next')}
                          disabled={(!allowEditFromReview && disableEditing) || classStudents.length <= 1}
                          variant="outline"
                        >
                          Next →
                        </CButton>
                        {classStudents.length > 1 && (
                          <small className="text-muted ms-2">
                            ({currentStudentIndex + 1} of {classStudents.length})
                          </small>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CCardBody>
            </CCard>
          )}

          {/* B7: Term 1/Term 2 Tabs */}
          {selectedReportCard && selectedStudent && (
            <CCard className="mb-4">
              <CCardBody>
                <h5 className="mb-3">Select Term</h5>
                <CNav variant="tabs" role="tablist">
                  <CNavItem>
                    <CNavLink
                      active={selectedTerm === 'term1'}
                      onClick={() => {
                        setSelectedTerm('term1')
                        setCurrentDraftId(null) // Reset draft ID to reload
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      Term 1
                    </CNavLink>
                  </CNavItem>
                  <CNavItem>
                    <CNavLink
                      active={selectedTerm === 'term2'}
                      onClick={() => {
                        setSelectedTerm('term2')
                        setCurrentDraftId(null) // Reset draft ID to reload
                        // The useEffect will automatically call loadExistingDraft when selectedTerm changes
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      Term 2
                    </CNavLink>
                  </CNavItem>
                </CNav>
                <div className="mt-2">
                  <small className="text-muted">
                    {selectedTerm === 'term1' 
                      ? 'Term 1: First term report card data. Save Term 1 before moving to Term 2.'
                      : 'Term 2: Second term report card. Term 1 data will be used as baseline if Term 2 is new. Term 2 saves to a separate document.'}
                  </small>
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

                {/* B17: Save All Button */}
                <CCard className="mt-3">
                  <CCardBody className="text-center">
                    <h6 className="mb-3">Save Report Card</h6>
                    <CButton
                      color="primary"
                      size="lg"
                      onClick={saveAll}
                      disabled={isSaving || !selectedStudent || !selectedReportCard || (!allowEditFromReview && disableEditing)}
                      className="d-flex align-items-center justify-content-center gap-2 mx-auto"
                    >
                      {isSaving ? (
                        <>
                          <CSpinner size="sm" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CIcon icon={cilSave} />
                          Save All
                        </>
                      )}
                    </CButton>
                    {saveMessage && (
                      <div className={`alert ${saveMessage.includes('successfully') ? 'alert-success' : 'alert-danger'} mt-3`}>
                        {saveMessage}
                      </div>
                    )}
                  </CCardBody>
                </CCard>

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
