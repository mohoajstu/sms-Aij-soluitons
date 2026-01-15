import React, { useState, useEffect } from 'react'
import {
  CFormSelect,
  CFormLabel,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CSpinner,
  CAlert,
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CButtonGroup,
  CRow,
  CCol,
  CBadge,
} from '@coreui/react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { firestore } from '../firebase'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilUser, cilList, cilFilter, cilEducation } from '@coreui/icons'
import useAuth from '../Firebase/useAuth'

const StudentSelector = ({
  selectedStudent,
  onStudentSelect,
  placeholder = 'Search and select a student...',
  showLabel = true,
  required = false,
  showClassList = true,
  reportCardType = null, // Filter classes based on selected report card type
}) => {
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [viewMode, setViewMode] = useState('search') // 'search' or 'class'
  const [error, setError] = useState(null)
  const { user, role } = useAuth()

  // Load classes from Firestore
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const classesRef = collection(firestore, 'courses')
        const classesQuery = query(classesRef, where('archived', '==', false))
        const snapshot = await getDocs(classesQuery)

        const classesList = snapshot.docs
          .map((doc) => {
            const data = doc.data()
            const grade = data.grade || data.gradeLevel || ''
            const name = data.name || data.title || doc.id
            
            // Clean up the name to avoid "Unknown" labels
            let cleanName = name
            if (name.includes('Unknown') || name.includes('unknown')) {
              // Try to extract grade from the name or use the grade field
              const gradeFromName = name.match(/Grade\s*(\w+)/i) || name.match(/(\w+)\s*Grade/i)
              if (gradeFromName) {
                cleanName = `Homeroom ${gradeFromName[1]}`
              } else if (grade) {
                cleanName = `Homeroom ${grade}`
              } else {
                cleanName = `Homeroom ${doc.id}`
              }
            }
            
            return {
              id: doc.id,
              name: cleanName,
              grade: grade,
              teachers: data.teachers || data.teacher || [],
              students: data.students || data.enrolledList || [],
            }
          })
          .filter((cls) => cls.students && cls.students.length > 0) // Only classes with students

        // Filter out "moho" classes for non-admin users
        let classesToShow = classesList
        if (role !== 'admin') {
          classesToShow = classesList.filter((cls) => {
            const name = (cls.name || '').toLowerCase()
            const id = (cls.id || '').toLowerCase()
            // Hide classes with "moho" in name or id for non-admins
            return !name.includes('moho') && !id.includes('moho')
          })
        }

        // Filter classes based on report card type
        let filteredClasses = classesToShow
        if (reportCardType) {
          filteredClasses = classesToShow.filter((cls) => {
            const grade = (cls.grade || '').toString().toLowerCase()
            const name = (cls.name || '').toLowerCase()
            const gradeNumber = grade.match(/\d+/)?.[0]
            
            // Check for JK (Junior Kindergarten)
            const isJK = grade.includes('jk') || name.includes('jk') || grade === 'junior kindergarten'
            
            // Check for SK (Senior Kindergarten) - including SK1, SK2, etc.
            // SK1 and SK2 are still kindergarten, not grade 1-6
            const isSK = 
              grade.includes('sk') || 
              name.includes('sk') || 
              grade === 'senior kindergarten' ||
              name.includes('sk1') ||
              name.includes('sk2') ||
              grade.includes('sk1') ||
              grade.includes('sk2')
            
            const isKindergarten = isJK || isSK

            // KG report cards → only show KG classes (including SK1, SK2)
            if (reportCardType.includes('kg-') || reportCardType.includes('kindergarten')) {
              return isKindergarten
            }
            
            // Grades 1-6 report cards → only show Gr 1-6 classes (exclude SK1, SK2)
            if (reportCardType.includes('1-6') || reportCardType.includes('1to6')) {
              // Exclude kindergarten classes (JK, SK, SK1, SK2)
              if (isKindergarten) return false
              // Only show classes with grade numbers 1-6
              return gradeNumber && ['1', '2', '3', '4', '5', '6'].includes(gradeNumber)
            }
            
            // Grades 7-8 report cards → only show Gr 7-8 classes
            if (reportCardType.includes('7-8') || reportCardType.includes('7to8')) {
              // Exclude kindergarten classes
              if (isKindergarten) return false
              // Only show classes with grade numbers 7-8
              return gradeNumber && ['7', '8'].includes(gradeNumber)
            }
            
            // Quran report cards → only show Gr 1-8 classes (exclude kindergarten)
            if (reportCardType === 'quran-report' || reportCardType.includes('quran')) {
              // Exclude kindergarten classes (JK, SK, SK1, SK2)
              if (isKindergarten) return false
              // Only show classes with grade numbers 1-8
              return gradeNumber && ['1', '2', '3', '4', '5', '6', '7', '8'].includes(gradeNumber)
            }

            // If report card type doesn't match any pattern, show all classes
            return true
          })
        } else {
          filteredClasses = classesToShow
        }

        setClasses(filteredClasses)
      } catch (err) {
        console.error('Error loading classes:', err)
      }
    }

    if (showClassList) {
      loadClasses()
    }
  }, [showClassList, reportCardType]) // Re-filter when report card type changes

  // Clear selected class when report card type changes
  useEffect(() => {
    if (reportCardType) {
      setSelectedClass('')
      setSearchTerm('')
    }
  }, [reportCardType])

  // Load students from Firestore
  useEffect(() => {
    const loadStudents = async () => {
      setLoading(true)
      setError(null)

      try {
        const studentsRef = collection(firestore, 'students')
        const studentsQuery = query(studentsRef, orderBy('personalInfo.firstName'))
        const snapshot = await getDocs(studentsQuery)

        const studentsList = snapshot.docs
          .map((doc) => {
            const data = doc.data()
            const firstName = data.personalInfo?.firstName || data.firstName || ''
            const lastName = data.personalInfo?.lastName || data.lastName || ''
            const fullName = `${firstName} ${lastName}`.trim()

            return {
              id: doc.id,
              fullName,
              firstName,
              lastName,
              grade: data.schooling?.program || data.personalInfo?.grade || data.grade || '',
              oen: data.schooling?.oen || data.personalInfo?.oen || data.oen || '', // OEN is stored in schooling information
              schoolId: data.personalInfo?.schoolId || data.schoolId || data.tarbiyahId || doc.id,
              // Attendance data
              currentTermAbsenceCount: data.attendanceStats?.currentTermAbsenceCount || 0,
              currentTermLateCount: data.attendanceStats?.currentTermLateCount || 0,
              yearAbsenceCount: data.attendanceStats?.yearAbsenceCount || 0,
              yearLateCount: data.attendanceStats?.yearLateCount || 0,
              // Contact information
              email: data.contact?.email || '',
              phone1: data.contact?.phone1 || '',
              phone2: data.contact?.phone2 || '',
              emergencyPhone: data.contact?.emergencyPhone || '',
              // Address information
              streetAddress: data.address?.streetAddress || '',
              residentialArea: data.address?.residentialArea || '',
              poBox: data.address?.poBox || '',
              // Citizenship
              nationality: data.citizenship?.nationality || '',
              nationalId: data.citizenship?.nationalId || '',
              nationalIdExpiry: data.citizenship?.nationalIdExpiry || '',
              // Language
              primaryLanguage: data.language?.primary || '',
              secondaryLanguage: data.language?.secondary || '',
              // Parents
              fatherName: data.parents?.father?.name || '',
              motherName: data.parents?.mother?.name || '',
              fatherId: data.parents?.father?.tarbiyahId || '',
              motherId: data.parents?.mother?.tarbiyahId || '',
              // Personal info
              dob: data.personalInfo?.dob || '',
              gender: data.personalInfo?.gender || '',
              salutation: data.personalInfo?.salutation || '',
              nickName: data.personalInfo?.nickName || '',
              middleName: data.personalInfo?.middleName || '',
              // Schooling (OEN is stored here in people management)
              program: data.schooling?.program || '',
              daySchoolEmployer: data.schooling?.daySchoolEmployer || '',
              notes: data.schooling?.notes || '',
              returningStudentYear: data.schooling?.returningStudentYear || '',
              custodyDetails: data.schooling?.custodyDetails || '',
              schooling: {
                ...data.schooling,
                oen: data.schooling?.oen || '',
              },
              primaryRole: data.personalInfo?.primaryRole || '',
              // Include only necessary original data (avoid nested objects)
              active: data.active,
              createdAt: data.createdAt,
              uploadedAt: data.uploadedAt,
            }
          })
          .filter((student) => student.fullName) // Only include students with names

        setStudents(studentsList)
      } catch (err) {
        console.error('Error loading students:', err)
        setError('Failed to load students. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadStudents()
  }, [])

  // Filter students based on search term, class selection, and report card type
  const filteredStudents = students.filter((student) => {
    // Filter by report card type (grade restrictions)
    if (reportCardType) {
      const grade = (student.grade || student.program || '').toString().toLowerCase()
      const gradeNumber = grade.match(/\d+/)?.[0]
      
      // Check for kindergarten
      const isJK = grade.includes('jk') || grade === 'junior kindergarten'
      const isSK = grade.includes('sk') || grade === 'senior kindergarten' || 
                   grade.includes('sk1') || grade.includes('sk2')
      const isKindergarten = isJK || isSK
      
      // Quran report cards → only show Gr 1-8 students (exclude kindergarten)
      if (reportCardType === 'quran-report' || reportCardType.includes('quran')) {
        if (isKindergarten) return false
        // Only show students with grade numbers 1-8
        if (!gradeNumber || !['1', '2', '3', '4', '5', '6', '7', '8'].includes(gradeNumber)) {
          return false
        }
      }
      
      // KG report cards → only show KG students
      if (reportCardType.includes('kg-') || reportCardType.includes('kindergarten')) {
        if (!isKindergarten) return false
      }
      
      // Grades 1-6 report cards → only show Gr 1-6 students
      if (reportCardType.includes('1-6') || reportCardType.includes('1to6')) {
        if (isKindergarten) return false
        if (!gradeNumber || !['1', '2', '3', '4', '5', '6'].includes(gradeNumber)) {
          return false
        }
      }
      
      // Grades 7-8 report cards → only show Gr 7-8 students
      if (reportCardType.includes('7-8') || reportCardType.includes('7to8')) {
        if (isKindergarten) return false
        if (!gradeNumber || !['7', '8'].includes(gradeNumber)) {
          return false
        }
      }
    }
    
    // If class is selected, filter by class first
    if (selectedClass && viewMode === 'class') {
      const selectedClassData = classes.find(cls => cls.id === selectedClass)
      if (selectedClassData) {
        const isInClass = selectedClassData.students.some(classStudent => 
          classStudent.id === student.id || 
          classStudent.schoolId === student.schoolId ||
          classStudent.tarbiyahId === student.schoolId
        )
        if (!isInClass) return false
      }
    }

    // Then apply search term filter
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    return (
      student.fullName.toLowerCase().includes(searchLower) ||
      student.firstName.toLowerCase().includes(searchLower) ||
      student.lastName.toLowerCase().includes(searchLower) ||
      student.schoolId.toLowerCase().includes(searchLower) ||
      (student.oen && student.oen.includes(searchTerm)) ||
      (student.grade && student.grade.toLowerCase().includes(searchLower)) ||
      (student.program && student.program.toLowerCase().includes(searchLower)) ||
      (student.fatherName && student.fatherName.toLowerCase().includes(searchLower)) ||
      (student.motherName && student.motherName.toLowerCase().includes(searchLower))
    )
  })

  const handleStudentChange = (e) => {
    const studentId = e.target.value
    if (studentId) {
      const student = students.find((s) => s.id === studentId)
      onStudentSelect(student)
    } else {
      onStudentSelect(null)
    }
  }

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleClassChange = (e) => {
    setSelectedClass(e.target.value)
    setSearchTerm('') // Clear search when switching classes
  }

  const handleViewModeChange = (mode) => {
    setViewMode(mode)
    setSelectedClass('')
    setSearchTerm('')
  }

  if (error) {
    return (
      <div className="mb-3">
        {showLabel && <CFormLabel>Student</CFormLabel>}
        <CAlert color="danger">
          <CIcon icon={cilUser} className="me-2" />
          {error}
        </CAlert>
      </div>
    )
  }

  return (
    <div className="mb-3">
      {showLabel && (
        <CFormLabel htmlFor="student-selector">
          Student {required && <span className="text-danger">*</span>}
        </CFormLabel>
      )}

      {/* View Mode Toggle */}
      {showClassList && role !== 'parent' && (
        <div className="mb-3">
          <CButtonGroup role="group" aria-label="View mode">
            <CButton
              color={viewMode === 'search' ? 'primary' : 'outline-primary'}
              size="sm"
              onClick={() => handleViewModeChange('search')}
            >
              <CIcon icon={cilSearch} className="me-1" />
              Search All
            </CButton>
            <CButton
              color={viewMode === 'class' ? 'primary' : 'outline-primary'}
              size="sm"
              onClick={() => handleViewModeChange('class')}
            >
              <CIcon icon={cilEducation} className="me-1" />
              By Class
            </CButton>
          </CButtonGroup>
        </div>
      )}

      {/* Class Selection */}
      {showClassList && viewMode === 'class' && (
        <div className="mb-3">
          <CFormLabel htmlFor="class-selector">Select Class</CFormLabel>
          <CFormSelect
            id="class-selector"
            value={selectedClass}
            onChange={handleClassChange}
            disabled={loading}
          >
            <option value="">Choose a class...</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.grade}) - {cls.students.length} students
              </option>
            ))}
          </CFormSelect>
        </div>
      )}

      {/* Search Input */}
      <CInputGroup>
        <CInputGroupText>
          {loading ? <CSpinner size="sm" /> : <CIcon icon={cilSearch} />}
        </CInputGroupText>
        <CFormInput
          placeholder={
            loading 
              ? 'Loading students...' 
              : viewMode === 'class' && selectedClass
                ? 'Search within selected class...'
                : 'Search students by name or ID...'
          }
          value={searchTerm}
          onChange={handleSearchChange}
          disabled={loading}
        />
      </CInputGroup>

      {/* Student Selection */}
      <CFormSelect
        id="student-selector"
        value={selectedStudent?.id || ''}
        onChange={handleStudentChange}
        disabled={loading}
        required={required}
        className="mt-2"
      >
        <option value="">
          {loading 
            ? 'Loading...' 
            : viewMode === 'class' && !selectedClass
              ? 'Select a class first...'
              : placeholder
          }
        </option>
        {filteredStudents.map((student) => (
          <option key={student.id} value={student.id}>
            {student.fullName} - {student.grade || student.program} (ID: {student.schoolId})
            {student.oen && ` - OEN: ${student.oen}`}
          </option>
        ))}
      </CFormSelect>

      {/* Status Messages */}
      {filteredStudents.length === 0 && searchTerm && !loading && (
        <small className="text-muted">No students found matching "{searchTerm}"</small>
      )}
      
      {viewMode === 'class' && selectedClass && filteredStudents.length === 0 && !searchTerm && !loading && (
        <small className="text-muted">No students found in this class</small>
      )}

      {/* Class Info */}
      {viewMode === 'class' && selectedClass && (
        <div className="mt-2">
          <CBadge color="info" className="me-2">
            <CIcon icon={cilEducation} className="me-1" />
            {classes.find(cls => cls.id === selectedClass)?.name}
          </CBadge>
          <CBadge color="secondary">
            {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
          </CBadge>
        </div>
      )}
    </div>
  )
}

export default StudentSelector
