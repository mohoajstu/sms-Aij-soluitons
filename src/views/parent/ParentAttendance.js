import React, { useEffect, useState } from 'react'
import { CCard, CCardBody, CCardHeader, CNav, CNavItem, CNavLink, CTabContent, CTabPane, CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell, CSpinner, CAlert } from '@coreui/react'
import dayjs from 'dayjs'
import { collection, getDocs, query, where, documentId } from 'firebase/firestore'
import { firestore } from '../../Firebase/firebase'
import useAuth from '../../Firebase/useAuth'
import { loadCurrentUserProfile } from '../../utils/userProfile'

const ParentAttendance = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState([]) // [{ id, name }]
  const [activeIdx, setActiveIdx] = useState(0)
  const [recordsByChild, setRecordsByChild] = useState({}) // id -> [{ date, class, status, note }]
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return

    const loadChildren = async () => {
      setLoading(true)
      setError('')
      try {
        const profile = await loadCurrentUserProfile(firestore, user)
        if (!profile) {
          setChildren([])
          setLoading(false)
          return
        }
        const parentId = profile.id

        const qFather = query(
          collection(firestore, 'students'),
          where('parents.father.tarbiyahId', '==', parentId),
        )
        const qMother = query(
          collection(firestore, 'students'),
          where('parents.mother.tarbiyahId', '==', parentId),
        )
        const [snapF, snapM] = await Promise.all([getDocs(qFather), getDocs(qMother)])
        const merged = new Map()
        snapF.forEach((d) => merged.set(d.id, { id: d.id, data: d.data() }))
        snapM.forEach((d) => merged.set(d.id, { id: d.id, data: d.data() }))

        const kids = Array.from(merged.values()).map(({ id, data }) => {
          const first = data?.personalInfo?.firstName || ''
          const last = data?.personalInfo?.lastName || ''
          return { id, name: `${first} ${last}`.trim() || id }
        })
        setChildren(kids)
        setActiveIdx(0)

        // Preload attendance for each child (last 60 days)
        const endDate = dayjs()
        const startDate = endDate.subtract(60, 'day')
        const attQ = query(
          collection(firestore, 'attendance'),
          where(documentId(), '>=', startDate.format('YYYY-MM-DD')),
          where(documentId(), '<=', endDate.format('YYYY-MM-DD')),
        )
        const attSnap = await getDocs(attQ)

        const map = {}
        kids.forEach((k) => (map[k.id] = []))

        attSnap.forEach((docSnap) => {
          const daily = docSnap.data() || {}
          const date = daily.date || docSnap.id
          const courses = daily.courses || []
          courses.forEach((course) => {
            const students = course.students || []
            students.forEach((s) => {
              if (!map[s.studentId]) return
              map[s.studentId].push({
                date,
                class: course.courseTitle || 'Class',
                status: s.status || '—',
                note: s.note || '',
              })
            })
          })
        })

        // Sort each child's records by date desc
        Object.keys(map).forEach((sid) => {
          map[sid].sort((a, b) => (a.date < b.date ? 1 : -1))
        })

        setRecordsByChild(map)
      } catch (e) {
        console.error('Failed to load parent attendance:', e)
        setError('Failed to load attendance.')
      } finally {
        setLoading(false)
      }
    }

    loadChildren()
  }, [user])

  if (loading) return <CSpinner color="primary" />
  if (error) return <CAlert color="danger">{error}</CAlert>

  if (children.length === 0) return <CAlert color="info">No linked students found.</CAlert>

  return (
    <CCard>
      <CCardHeader>
        <h3>Attendance</h3>
      </CCardHeader>
      <CCardBody>
        {children.length > 1 && (
          <CNav variant="tabs" role="tablist" className="mb-3">
            {children.map((child, idx) => (
              <CNavItem key={child.id}>
                <CNavLink active={activeIdx === idx} onClick={() => setActiveIdx(idx)}>
                  {child.name}
                </CNavLink>
              </CNavItem>
            ))}
          </CNav>
        )}

        <CTabContent>
          {children.map((child, idx) => (
            <CTabPane key={child.id} visible={activeIdx === idx}>
              <CTable responsive="md" hover>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell scope="col">Date</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Class</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Status</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Note</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {(recordsByChild[child.id] || []).map((rec, i) => (
                    <CTableRow key={`${child.id}-${i}`}>
                      <CTableDataCell>{rec.date}</CTableDataCell>
                      <CTableDataCell>{rec.class}</CTableDataCell>
                      <CTableDataCell>{rec.status}</CTableDataCell>
                      <CTableDataCell>{rec.note}</CTableDataCell>
                    </CTableRow>
                  ))}
                  {(recordsByChild[child.id] || []).length === 0 && (
                    <CTableRow>
                      <CTableDataCell colSpan={4}>No attendance records.</CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            </CTabPane>
          ))}
        </CTabContent>
      </CCardBody>
    </CCard>
  )
}

export default ParentAttendance 