import React, { useEffect, useState } from 'react'
import { CCard, CCardBody, CCardHeader, CNav, CNavItem, CNavLink, CTabContent, CTabPane, CListGroup, CListGroupItem, CSpinner, CAlert } from '@coreui/react'
import { storage, firestore } from '../../Firebase/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import useAuth from '../../Firebase/useAuth'
import { loadCurrentUserProfile } from '../../utils/userProfile'

const ParentReportCards = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState([]) // [{ id, name }]
  const [activeIdx, setActiveIdx] = useState(0)
  const [filesByChild, setFilesByChild] = useState({}) // id -> [{ name, url }]
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

        // Load report cards from Firestore by child's tarbiyahId (student doc ID)
        const map = {}
        for (const kid of kids) {
          map[kid.id] = []
          try {
            // Primary: match on tarbiyahId
            const byIdQ = query(collection(firestore, 'reportCards'), where('tarbiyahId', '==', kid.id))
            let rcSnap = await getDocs(byIdQ)

            // Legacy fallback: match on slugged studentName if no results
            if (rcSnap.empty) {
              const legacySlug = kid.name.replace(/\s+/g, '-')
              const byNameQ = query(collection(firestore, 'reportCards'), where('studentName', '==', legacySlug))
              rcSnap = await getDocs(byNameQ)
            }

            rcSnap.forEach((docSnap) => {
              const data = docSnap.data() || {}
              const url = data.url
              const filePath = data.filePath || ''
              const displayName = filePath ? filePath.split('/').pop() : data.type || 'report'
              if (url) {
                map[kid.id].push({ name: displayName, url })
              }
            })
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