import React, { useEffect, useState } from 'react'
import { CCard, CCardBody, CCardHeader, CNav, CNavItem, CNavLink, CTabContent, CTabPane, CListGroup, CListGroupItem, CSpinner, CAlert } from '@coreui/react'
import { firestore } from '../../Firebase/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import useAuth from '../../Firebase/useAuth'
import { fetchSchoolYearSettings } from '../ReportCard/utils/schoolYear'
import { groupParentReports, parentReportTermLabel } from './parentReportGroups'
import './ParentReportCards.css'

const ParentReportCards = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState([]) // [{ id, name }]
  const [activeIdx, setActiveIdx] = useState(0)
  const [filesByChild, setFilesByChild] = useState({}) // id -> school-year groups
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user || !user.email) return

    const loadChildren = async () => {
      setLoading(true)
      setError('')
      try {
        const schoolYear = await fetchSchoolYearSettings(firestore)
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

            const records = []
            rcSnap.forEach((report) => records.push({ ...report.data(), id: report.id }))
            map[kid.id] = groupParentReports(records, schoolYear)
          } catch (inner) {
            console.warn('Error fetching reportCards for', kid.id, inner)
            throw inner
          }
        }
        setFilesByChild(map)
      } catch (e) {
        console.error('Failed to load parent report cards:', e)
        setError('Unable to load report cards. Please refresh the page to try again.')
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
        <h3 className="mb-0">Report Cards</h3>
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
              <p className="mb-4">{child.name}</p>
              {(filesByChild[child.id] || []).map((group) => {
                const title = group.year === 'unknown' ? 'School year not recorded' : group.year
                const reports = (
                  <CListGroup flush>
                    {group.reports.map((report) => (
                      <CListGroupItem key={report.id} className="parent-report-item">
                        <a href={report.url} target="_blank" rel="noopener noreferrer">
                          {report.name}
                          <span className="visually-hidden"> (opens PDF in a new tab)</span>
                        </a>
                        <span className="parent-report-meta">
                          {parentReportTermLabel(report.term)}
                          {report.grade ? ` · ${/grade|kindergarten|^jk$|^sk$/i.test(report.grade) ? report.grade : `Grade ${report.grade}`}` : ''}
                        </span>
                      </CListGroupItem>
                    ))}
                  </CListGroup>
                )
                return group.current ? (
                  <section key={group.year} className="parent-report-current" aria-label={`Current school year ${title}`}>
                    <h4>{title} <span className="badge text-bg-primary">Current school year</span></h4>
                    {group.reports.length ? reports : (
                      <p className="mb-0">No report cards have been released for this school year yet.</p>
                    )}
                  </section>
                ) : (
                  <details key={`${child.id}-${group.year}`} className="parent-report-year">
                    <summary>
                      <span>{title}</span>
                      <span className="parent-report-count">{group.reports.length} {group.reports.length === 1 ? 'report' : 'reports'}</span>
                    </summary>
                    {reports}
                  </details>
                )
              })}
            </CTabPane>
          ))}
        </CTabContent>
      </CCardBody>
    </CCard>
  )
}

export default ParentReportCards
