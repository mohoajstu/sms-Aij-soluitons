import React, { useEffect, useState } from 'react'
import { CCard, CCardBody, CCardHeader, CNav, CNavItem, CNavLink, CTabContent, CTabPane, CListGroup, CListGroupItem, CSpinner, CAlert } from '@coreui/react'
import { storage, firestore } from '../../Firebase/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import useAuth from '../../Firebase/useAuth'

const ParentReportCards = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState([]) // [{ id, name }]
  const [activeIdx, setActiveIdx] = useState(0)
  const [filesByChild, setFilesByChild] = useState({}) // id -> [{ name, url }]
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user || !user.email) return

    const loadChildren = async () => {
      setLoading(true)
      setError('')
      try {
        // Find student by the logged-in email (parent logs in with child's email)
        const studentsQuery = query(
          collection(firestore, 'students'),
          where('contact.email', '==', user.email)
        )
        const studentsSnapshot = await getDocs(studentsQuery)

        if (studentsSnapshot.empty) {
          setChildren([])
          setLoading(false)
          return
        }

        // Get the student document (should be only one)
        const studentDoc = studentsSnapshot.docs[0]
        const studentId = studentDoc.id
        const studentData = studentDoc.data()

        const first = studentData?.personalInfo?.firstName || ''
        const last = studentData?.personalInfo?.lastName || ''
        const kids = [{
          id: studentId,
          name: `${first} ${last}`.trim() || studentId
        }]
        setChildren(kids)
        setActiveIdx(0)

        // Load report cards from Firestore by child's tarbiyahId (student doc ID)
        const map = {}
        for (const kid of kids) {
          map[kid.id] = []
          try {
            // Primary: match on tarbiyahId and only show approved/published reports
            const byIdQ = query(
              collection(firestore, 'reportCards'),
              where('tarbiyahId', '==', kid.id),
              where('status', 'in', ['approved', 'published'])
            )
            let rcSnap = await getDocs(byIdQ)

            // Legacy fallback: match on slugged studentName if no results
            if (rcSnap.empty) {
              const legacySlug = kid.name.replace(/\s+/g, '-')
              const byNameQ = query(
                collection(firestore, 'reportCards'),
                where('studentName', '==', legacySlug),
                where('status', 'in', ['approved', 'published'])
              )
              rcSnap = await getDocs(byNameQ)
            }

            // Group by report type ID and keep only the latest approved one for each type
            // This ensures parents see only ONE report card per type (e.g., one "1-6 progress", one "7-8 progress")
            const reportsByType = new Map()
            
            rcSnap.forEach((docSnap) => {
              const data = docSnap.data() || {}
              const url = data.url
              const filePath = data.filePath || ''
              // Use reportCardType (ID) as the unique key, fallback to reportCardTypeName or type
              const reportTypeId = data.reportCardType || data.type || 'unknown'
              const reportTypeName = data.reportCardTypeName || data.type || 'Report Card'
              const approvedAt = data.approvedAt?.toDate?.() || data.createdAt?.toDate?.() || new Date()
              
              if (url) {
                // Use report type ID as the unique key (e.g., "1-6-progress", "7-8-progress", "kg-initial-observations")
                const reportKey = reportTypeId
                
                // If we haven't seen this type, or this one is newer, keep it
                if (!reportsByType.has(reportKey) || approvedAt > reportsByType.get(reportKey).approvedAt) {
                  const displayName = reportTypeName // Show the friendly name, not the filename
                  reportsByType.set(reportKey, {
                    name: displayName,
                    url,
                    grade: data.grade || '',
                    approvedAt: approvedAt,
                    type: reportTypeName,
                    typeId: reportTypeId
                  })
                }
              }
            })
            
            // Convert map to array and sort by approval date (newest first)
            map[kid.id] = Array.from(reportsByType.values()).sort((a, b) => b.approvedAt - a.approvedAt)
          } catch (inner) {
            console.warn('Error fetching reportCards for', kid.id, inner)
          }
        }
        setFilesByChild(map)
      } catch (e) {
        console.error('Failed to load parent report cards:', e)
        setError('Failed to load report cards.')
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
        <h3>Report Cards</h3>
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
              <CListGroup>
                {(filesByChild[child.id] || []).map((f, i) => (
                  <CListGroupItem key={`${child.id}-${i}`}>
                    <a href={f.url} target="_blank" rel="noopener noreferrer">
                      {f.name}
                    </a>
                  </CListGroupItem>
                ))}
                {(filesByChild[child.id] || []).length === 0 && (
                  <CListGroupItem>No report cards found.</CListGroupItem>
                )}
              </CListGroup>
            </CTabPane>
          ))}
        </CTabContent>
      </CCardBody>
    </CCard>
  )
}

export default ParentReportCards 