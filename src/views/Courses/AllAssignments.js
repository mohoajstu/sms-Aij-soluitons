import React, { useEffect, useState } from 'react'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { firestore } from '../../firebase'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableBody,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CSpinner,
  CAlert,
  CButton,
} from '@coreui/react'

const AllAssignments = () => {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true)
      setError('')
      try {
        // Try top-level assignments collection first
        const assignmentsSnapshot = await getDocs(collection(firestore, 'assignments'))
        let assignmentsData = []
        if (assignmentsSnapshot.docs.length > 0) {
          assignmentsData = await Promise.all(
            assignmentsSnapshot.docs.map(async (docSnap) => {
              const data = docSnap.data()
              let courseTitle = ''
              if (data.courseId) {
                try {
                  const courseDoc = await getDoc(doc(firestore, 'courses', data.courseId))
                  courseTitle = courseDoc.exists() ? (courseDoc.data().title || courseDoc.data().name || '') : ''
                } catch (err) {
                  console.error('Error fetching course for assignment', docSnap.id, err)
                }
              }
              return {
                id: docSnap.id,
                ...data,
                courseTitle,
              }
            })
          )
        } else {
          // If no top-level assignments, try fetching from all courses' subcollections
          const coursesSnapshot = await getDocs(collection(firestore, 'courses'))
          const allAssignments = []
          for (const courseDoc of coursesSnapshot.docs) {
            const courseId = courseDoc.id
            const courseTitle = courseDoc.data().title || courseDoc.data().name || ''
            const subAssignmentsSnapshot = await getDocs(collection(firestore, 'courses', courseId, 'assignments'))
            subAssignmentsSnapshot.forEach((aDoc) => {
              const data = aDoc.data()
              allAssignments.push({
                id: aDoc.id,
                ...data,
                courseTitle,
                courseId,
              })
            })
          }
          assignmentsData = allAssignments
        }
        setAssignments(assignmentsData)
      } catch (err) {
        setError('Failed to fetch assignments.')
        console.error('Assignment fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAssignments()
  }, [])

  return (
    <div className="all-assignments-container" style={{ maxWidth: 900, margin: '2rem auto' }}>
      <CCard>
        <CCardHeader>
          <h2>All Assignments</h2>
        </CCardHeader>
        <CCardBody>
          {loading && (
            <div className="text-center py-4">
              <CSpinner color="primary" />
            </div>
          )}
          {error && <CAlert color="danger">{error}</CAlert>}
          {!loading && !error && assignments.length === 0 && (
            <CAlert color="info">No assignments found.</CAlert>
          )}
          {!loading && !error && assignments.length > 0 && (
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Title</CTableHeaderCell>
                  <CTableHeaderCell>Course</CTableHeaderCell>
                  <CTableHeaderCell>Due Date</CTableHeaderCell>
                  <CTableHeaderCell>Priority</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {assignments.map((a) => (
                  <CTableRow key={a.id}>
                    <CTableDataCell>{a.title || a.name || 'Untitled'}</CTableDataCell>
                    <CTableDataCell>{a.courseTitle || a.courseId || '-'}</CTableDataCell>
                    <CTableDataCell>{a.dueDate || '-'}</CTableDataCell>
                    <CTableDataCell>{a.priority ? a.priority.charAt(0).toUpperCase() + a.priority.slice(1) : '-'}</CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>
    </div>
  )
}

export default AllAssignments 