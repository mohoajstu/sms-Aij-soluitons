// StaffSelectorModal.js - Modal for managing course staff/teachers
import React, { useState, useEffect } from 'react'
import { CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CButton, CFormInput, CFormLabel, CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell, CSpinner, CBadge } from '@coreui/react'
import { collection, getDocs, query, where, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore'
import { firestore } from '../../firebase'

const StaffSelectorModal = ({ visible, courseId, courseData, onClose, onUpdate, mode = 'staff' }) => {
  // mode can be 'staff' or 'ece' - determines if we're managing staff or ECE
  const [availableStaff, setAvailableStaff] = useState([])
  const [currentStaff, setCurrentStaff] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)

  // Load available staff from faculty collection and users collection
  const loadAvailableStaff = async () => {
    setLoading(true)
    try {
      const staffList = []

      // Get faculty from faculty collection
      const facultySnapshot = await getDocs(collection(firestore, 'faculty'))
      facultySnapshot.docs.forEach(doc => {
        const data = doc.data()
        const firstName = data.personalInfo?.firstName || data.firstName || ''
        const lastName = data.personalInfo?.lastName || data.lastName || ''
        const name = `${firstName} ${lastName}`.trim() || 'Unnamed Faculty'
        
        staffList.push({
          id: doc.id,
          name: name,
          email: data.contact?.email || data.personalInfo?.email || data.email || '',
          role: 'Faculty',
          source: 'faculty',
          schoolId: data.schoolId || data.personalInfo?.schoolId || ''
        })
      })

      // Get staff from users collection
      const usersQuery = query(collection(firestore, 'users'), where('role', 'in', ['Faculty', 'faculty', 'Staff', 'staff']))
      const usersSnapshot = await getDocs(usersQuery)
      usersSnapshot.docs.forEach(doc => {
        const data = doc.data()
        const firstName = data.personalInfo?.firstName || data.firstName || ''
        const lastName = data.personalInfo?.lastName || data.lastName || ''
        const name = `${firstName} ${lastName}`.trim() || 'Unnamed Staff'
        
        // Check if not already added from faculty collection
        if (!staffList.some(staff => staff.id === doc.id)) {
          staffList.push({
            id: doc.id,
            name: name,
            email: data.personalInfo?.email || data.email || '',
            role: data.role || 'Staff',
            source: 'users',
            schoolId: data.schoolId || data.personalInfo?.schoolId || ''
          })
        }
      })

      setAvailableStaff(staffList)
    } catch (error) {
      console.error('Error loading staff:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load current course staff or ECE
  const loadCurrentStaff = () => {
    if (mode === 'ece') {
      // For ECE mode, show current ECE as a single-item array
      if (courseData && courseData.ece) {
        setCurrentStaff([courseData.ece])
      } else {
        setCurrentStaff([])
      }
    } else {
      // For staff mode, show all teachers
      if (courseData && courseData.teacher) {
        setCurrentStaff(Array.isArray(courseData.teacher) ? courseData.teacher : [])
      } else {
        setCurrentStaff([])
      }
    }
  }

  useEffect(() => {
    if (visible) {
      loadAvailableStaff()
      loadCurrentStaff()
    }
  }, [visible, courseData])

  // Add staff member or ECE to course
  const handleAddStaff = async (staffMember) => {
    if (updating) return
    
    try {
      setUpdating(true)
      
      const courseRef = doc(firestore, 'courses', courseId)
      const newStaffMember = {
        name: staffMember.name,
        schoolId: staffMember.schoolId || '',
        id: staffMember.id,
        role: staffMember.role,
        source: staffMember.source
      }

      if (mode === 'ece') {
        // For ECE, replace the existing ECE (single person)
        await updateDoc(courseRef, {
          ece: newStaffMember,
          updatedAt: serverTimestamp()
        })
        // Update local state - replace existing ECE
        setCurrentStaff([newStaffMember])
      } else {
        // For staff, add to teacher array
        await updateDoc(courseRef, {
          teacher: arrayUnion(newStaffMember),
          teacherIds: arrayUnion(staffMember.id)
        })
        // Update local state
        setCurrentStaff(prev => [...prev, newStaffMember])
      }
      
      // Notify parent component
      if (onUpdate) {
        onUpdate()
      }
      
    } catch (error) {
      console.error(`Error adding ${mode === 'ece' ? 'ECE' : 'staff member'}:`, error)
      alert(`Failed to add ${mode === 'ece' ? 'ECE' : 'staff member'}. Please try again.`)
    } finally {
      setUpdating(false)
    }
  }

  // Remove staff member or ECE from course
  const handleRemoveStaff = async (staffMember) => {
    if (updating) return
    
    try {
      setUpdating(true)
      
      const courseRef = doc(firestore, 'courses', courseId)
      
      if (mode === 'ece') {
        // For ECE, set to null
        await updateDoc(courseRef, {
          ece: null,
          updatedAt: serverTimestamp()
        })
        // Update local state
        setCurrentStaff([])
      } else {
        // For staff, remove from teacher array
        await updateDoc(courseRef, {
          teacher: arrayRemove(staffMember),
          teacherIds: arrayRemove(staffMember.id)
        })
        // Update local state
        setCurrentStaff(prev => prev.filter(staff => staff.id !== staffMember.id))
      }
      
      // Notify parent component
      if (onUpdate) {
        onUpdate()
      }
      
    } catch (error) {
      console.error(`Error removing ${mode === 'ece' ? 'ECE' : 'staff member'}:`, error)
      alert(`Failed to remove ${mode === 'ece' ? 'ECE' : 'staff member'}. Please try again.`)
    } finally {
      setUpdating(false)
    }
  }

  // Filter available staff based on search
  const filteredAvailableStaff = availableStaff.filter(staff => {
    const isAlreadyAdded = currentStaff.some(current => current.id === staff.id)
    const matchesSearch = staff.name.toLowerCase().includes(search.toLowerCase()) ||
                         staff.email.toLowerCase().includes(search.toLowerCase())
    return !isAlreadyAdded && matchesSearch
  })

  // For ECE mode, if one is already assigned, show message
  const hasECE = mode === 'ece' && currentStaff.length > 0

  return (
    <CModal size="xl" visible={visible} onClose={onClose}>
      <CModalHeader>
        <CModalTitle>{mode === 'ece' ? 'Assign Early Childhood Educator (ECE)' : 'Manage Course Staff'}</CModalTitle>
      </CModalHeader>
      
      <CModalBody>
        <div className="row">
          {/* Current Staff or ECE */}
          <div className="col-md-6">
            <h5>{mode === 'ece' ? 'Current ECE' : `Current Staff (${currentStaff.length})`}</h5>
            {currentStaff.length === 0 ? (
              <p className="text-muted">{mode === 'ece' ? 'No ECE assigned to this course' : 'No staff assigned to this course'}</p>
            ) : (
              <CTable striped bordered>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>Role</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {currentStaff.map((staff, index) => (
                    <CTableRow key={index}>
                      <CTableDataCell>
                        <div>
                          <strong>{staff.name}</strong>
                          {staff.schoolId && (
                            <div className="text-muted small">ID: {staff.schoolId}</div>
                          )}
                        </div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge color="primary">{staff.role || 'Staff'}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CButton
                          color="danger"
                          size="sm"
                          onClick={() => handleRemoveStaff(staff)}
                          disabled={updating}
                        >
                          {updating ? <CSpinner size="sm" /> : 'Remove'}
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}
          </div>

          {/* Available Staff */}
          <div className="col-md-6">
            <h5>{mode === 'ece' ? 'Available Staff (Select ECE)' : 'Available Staff'}</h5>
            {mode === 'ece' && hasECE && (
              <div className="alert alert-info mb-3">
                <small>
                  An ECE is already assigned. Selecting a new one will replace the current ECE.
                </small>
              </div>
            )}
            <div className="mb-3">
              <CFormLabel>Search Staff</CFormLabel>
              <CFormInput
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            {loading ? (
              <div className="text-center">
                <CSpinner />
                <p>Loading staff...</p>
              </div>
            ) : (
              <div className="available-staff-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {filteredAvailableStaff.length === 0 ? (
                  <p className="text-muted">
                    {search ? 'No staff found matching your search' : 'No available staff'}
                  </p>
                ) : (
                  filteredAvailableStaff.map((staff) => (
                    <div key={staff.id} className="card mb-2">
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-1">{staff.name}</h6>
                            <div className="text-muted small">
                              {staff.email && <div>Email: {staff.email}</div>}
                              {staff.schoolId && <div>ID: {staff.schoolId}</div>}
                              <div>Source: {staff.source}</div>
                            </div>
                          </div>
                          <CButton
                            color="success"
                            size="sm"
                            onClick={() => handleAddStaff(staff)}
                            disabled={updating}
                          >
                            {updating ? <CSpinner size="sm" /> : mode === 'ece' ? 'Assign' : 'Add'}
                          </CButton>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </CModalBody>
      
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default StaffSelectorModal


