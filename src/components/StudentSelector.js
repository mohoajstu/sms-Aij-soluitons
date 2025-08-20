import React, { useState, useEffect } from 'react'
import {
  CFormSelect,
  CFormLabel,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CSpinner,
  CAlert,
} from '@coreui/react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { firestore } from '../firebase'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilUser } from '@coreui/icons'

const StudentSelector = ({
  selectedStudent,
  onStudentSelect,
  placeholder = 'Search and select a student...',
  showLabel = true,
  required = false,
}) => {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState(null)

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
              oen: data.personalInfo?.oen || data.oen || data.schoolId || '', // Fall back to schoolId if no OEN
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
              // Schooling
              program: data.schooling?.program || '',
              daySchoolEmployer: data.schooling?.daySchoolEmployer || '',
              notes: data.schooling?.notes || '',
              returningStudentYear: data.schooling?.returningStudentYear || '',
              custodyDetails: data.schooling?.custodyDetails || '',
              primaryRole: data.personalInfo?.primaryRole || '',
              // Include only necessary original data (avoid nested objects)
              id: doc.id,
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

  // Filter students based on search term
  const filteredStudents = students.filter((student) => {
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

      <CInputGroup>
        <CInputGroupText>
          {loading ? <CSpinner size="sm" /> : <CIcon icon={cilSearch} />}
        </CInputGroupText>
        <CFormInput
          placeholder={loading ? 'Loading students...' : 'Search students by name or ID...'}
          value={searchTerm}
          onChange={handleSearchChange}
          disabled={loading}
        />
      </CInputGroup>

      <CFormSelect
        id="student-selector"
        value={selectedStudent?.id || ''}
        onChange={handleStudentChange}
        disabled={loading}
        required={required}
        className="mt-2"
      >
        <option value="">{loading ? 'Loading...' : placeholder}</option>
        {filteredStudents.map((student) => (
          <option key={student.id} value={student.id}>
            {student.fullName} - {student.grade || student.program} (ID: {student.schoolId})
            {student.oen && ` - OEN: ${student.oen}`}
          </option>
        ))}
      </CFormSelect>

      {filteredStudents.length === 0 && searchTerm && !loading && (
        <small className="text-muted">No students found matching "{searchTerm}"</small>
      )}
    </div>
  )
}

export default StudentSelector
