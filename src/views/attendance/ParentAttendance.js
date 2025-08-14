import React, { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CBadge,
  CSpinner,
  CAlert,
  CFormSelect,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCalendar,
  cilCheckCircle,
  cilXCircle,
  cilClock,
  cilWarning,
} from '@coreui/icons'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { firestore } from '../../Firebase/firebase'
import useAuth from '../../Firebase/useAuth'

const ParentAttendance = () => {
  const { selectedChild } = useOutletContext()
  const { canAccessStudent } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [filterMonth, setFilterMonth] = useState('all')

  useEffect(() => {
    const loadAttendanceData = async () => {
      if (!selectedChild) {
        setLoading(false)
        return
      }

      // Check if user has access to this child
      if (!canAccessStudent(selectedChild.id)) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        const attendanceQuery = query(
          collection(firestore, 'attendance'),
          orderBy('date', 'desc'),
          limit(90) // Last 90 days
        )
        
        const attendanceSnapshot = await getDocs(attendanceQuery)
        const records = []
        
        attendanceSnapshot.forEach((doc) => {
          const data = doc.data()
          const childAttendance = data.courses?.find(course => 
            course.courseId === selectedChild.id || 
            course.students?.some(student => student.studentId === selectedChild.id)
          )
          
          if (childAttendance) {
            const childRecord = childAttendance.students?.find(student => 
              student.studentId === selectedChild.id
            )
            
            if (childRecord) {
              records.push({
                id: doc.id,
                date: data.date,
                status: childRecord.status,
                note: childRecord.note || '',
                courseTitle: childAttendance.courseTitle || 'Unknown Course',
              })
            }
          }
        })
        
        setAttendanceRecords(records)
        
      } catch (error) {
        console.error('Error loading attendance data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAttendanceData()
  }, [selectedChild, canAccessStudent])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Present':
        return <CIcon icon={cilCheckCircle} className="text-success" />
      case 'Absent':
        return <CIcon icon={cilXCircle} className="text-danger" />
      case 'Late':
        return <CIcon icon={cilClock} className="text-warning" />
      case 'Excused':
        return <CIcon icon={cilWarning} className="text-info" />
      default:
        return <CIcon icon={cilWarning} className="text-secondary" />
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Present':
        return <CBadge color="success">Present</CBadge>
      case 'Absent':
        return <CBadge color="danger">Absent</CBadge>
      case 'Late':
        return <CBadge color="warning">Late</CBadge>
      case 'Excused':
        return <CBadge color="info">Excused</CBadge>
      default:
        return <CBadge color="secondary">{status}</CBadge>
    }
  }

  const filteredRecords = filterMonth === 'all' 
    ? attendanceRecords 
    : attendanceRecords.filter(record => {
        const recordDate = new Date(record.date)
        const recordMonth = recordDate.getMonth()
        const recordYear = recordDate.getFullYear()
        const currentDate = new Date()
        const currentMonth = currentDate.getMonth()
        const currentYear = currentDate.getFullYear()
        
        return recordMonth === currentMonth && recordYear === currentYear
      })

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <CSpinner color="primary" />
      </div>
    )
  }

  if (!selectedChild) {
    return (
      <CAlert color="info">
        <CIcon icon={cilCalendar} className="me-2" />
        Please select a child to view their attendance.
      </CAlert>
    )
  }

  if (!canAccessStudent(selectedChild.id)) {
    return (
      <CAlert color="danger">
        <CIcon icon={cilXCircle} className="me-2" />
        You don't have permission to view attendance for this child.
      </CAlert>
    )
  }

  return (
    <div>
      <CCard className="mb-4">
        <CCardBody>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>Attendance Records</h2>
              <p className="text-muted mb-0">
                Viewing attendance for {selectedChild.name} ({selectedChild.grade})
              </p>
            </div>
            <div style={{ minWidth: '200px' }}>
              <CFormSelect
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                size="sm"
              >
                <option value="all">All Records</option>
                <option value="current">Current Month</option>
              </CFormSelect>
            </div>
          </div>
        </CCardBody>
      </CCard>

      <CRow className="mb-4">
        <CCol md={3}>
          <CCard>
            <CCardBody className="text-center">
              <h3 className="text-success">
                {attendanceRecords.filter(r => r.status === 'Present').length}
              </h3>
              <p className="text-muted mb-0">Present</p>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={3}>
          <CCard>
            <CCardBody className="text-center">
              <h3 className="text-danger">
                {attendanceRecords.filter(r => r.status === 'Absent').length}
              </h3>
              <p className="text-muted mb-0">Absent</p>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={3}>
          <CCard>
            <CCardBody className="text-center">
              <h3 className="text-warning">
                {attendanceRecords.filter(r => r.status === 'Late').length}
              </h3>
              <p className="text-muted mb-0">Late</p>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={3}>
          <CCard>
            <CCardBody className="text-center">
              <h3 className="text-info">
                {attendanceRecords.filter(r => r.status === 'Excused').length}
              </h3>
              <p className="text-muted mb-0">Excused</p>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CCard>
        <CCardBody>
          <CTable hover>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Date</CTableHeaderCell>
                <CTableHeaderCell>Status</CTableHeaderCell>
                <CTableHeaderCell>Note</CTableHeaderCell>
                <CTableHeaderCell>Course</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {filteredRecords.map((record) => (
                <CTableRow key={record.id}>
                  <CTableDataCell>{new Date(record.date).toLocaleDateString()}</CTableDataCell>
                  <CTableDataCell>{getStatusBadge(record.status)}</CTableDataCell>
                  <CTableDataCell>{record.note}</CTableDataCell>
                  <CTableDataCell>{record.courseTitle}</CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default ParentAttendance 