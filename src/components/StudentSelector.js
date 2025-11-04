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

        setClasses(classesList)
      } catch (err) {
        console.error('Error loading classes:', err)
      }
    }

    if (showClassList) {
      loadClasses()
    }
  }, [showClassList])

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

  // Filter students based on search term and class selection
  const filteredStudents = students.filter((student) => {
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
