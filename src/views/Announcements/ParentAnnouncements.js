import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CAlert,
  CBadge,
  CFormSelect,
  CInputGroup,
  CFormInput,
  CButton,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilBullhorn,
  cilCalendar,
  cilSearch,
  cilInfo,
  cilWarning,
} from '@coreui/icons'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { firestore } from '../../Firebase/firebase'

const ParentAnnouncements = () => {
  const [loading, setLoading] = useState(true)
  const [announcements, setAnnouncements] = useState([])
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setLoading(true)
        
        // Query announcements visible to parents
        const announcementsQuery = query(
          collection(firestore, 'announcements'),
          where('visibleTo', 'array-contains', 'parent'),
          orderBy('createdAt', 'desc'),
          limit(50) // Limit to last 50 announcements
        )
        
        const announcementsSnapshot = await getDocs(announcementsQuery)
        const announcements = announcementsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        }))
        
        setAnnouncements(announcements)
        setFilteredAnnouncements(announcements)
        
      } catch (error) {
        console.error('Error loading announcements:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAnnouncements()
  }, [])

  // Filter announcements based on search term and priority
  useEffect(() => {
    let filtered = announcements

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(announcement =>
        announcement.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        announcement.content?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by priority
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(announcement => 
        announcement.priority?.toLowerCase() === priorityFilter.toLowerCase()
      )
    }

    setFilteredAnnouncements(filtered)
  }, [announcements, searchTerm, priorityFilter])

  const getPriorityBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'urgent':
        return <CBadge color="danger">High Priority</CBadge>
      case 'medium':
        return <CBadge color="warning">Medium Priority</CBadge>
      case 'low':
        return <CBadge color="info">Low Priority</CBadge>
      default:
        return <CBadge color="secondary">Normal</CBadge>
    }
  }

  const getPriorityIcon = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'urgent':
        return <CIcon icon={cilWarning} className="text-danger" />
      case 'medium':
        return <CIcon icon={cilInfo} className="text-warning" />
      default:
        return <CIcon icon={cilBullhorn} className="text-primary" />
    }
  }

  const formatDate = (date) => {
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return 'Today'
    } else if (diffDays === 2) {
      return 'Yesterday'
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <CSpinner color="primary" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <CCard className="mb-4">
        <CCardBody>
          <h2>School Announcements</h2>
          <p className="text-muted mb-0">
            Stay up to date with important news and information from Tarbiyah Learning Academy
          </p>
        </CCardBody>
      </CCard>

      {/* Filters */}
      <CCard className="mb-4">
        <CCardBody>
          <CRow>
            <CCol md={8}>
              <CInputGroup>
                <span className="input-group-text">
                  <CIcon icon={cilSearch} />
                </span>
                <CFormInput
                  placeholder="Search announcements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </CInputGroup>
            </CCol>
            <CCol md={4}>
              <CFormSelect
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </CFormSelect>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* Announcements List */}
      <CRow>
        <CCol>
          {filteredAnnouncements.length > 0 ? (
            <div>
              {filteredAnnouncements.map((announcement) => (
                <CCard key={announcement.id} className="mb-3">
                  <CCardHeader>
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="d-flex align-items-center">
                        {getPriorityIcon(announcement.priority)}
                        <h5 className="ms-2 mb-0">{announcement.title}</h5>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {getPriorityBadge(announcement.priority)}
                        <small className="text-muted">
                          <CIcon icon={cilCalendar} className="me-1" />
                          {formatDate(announcement.createdAt)}
                        </small>
                      </div>
                    </div>
                  </CCardHeader>
                  <CCardBody>
                    <div 
                      className="announcement-content"
                      style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}
                    >
                      {announcement.content}
                    </div>
                    
                    {announcement.author && (
                      <div className="mt-3 pt-3 border-top">
                        <small className="text-muted">
                          <strong>Posted by:</strong> {announcement.author}
                        </small>
                      </div>
                    )}
                  </CCardBody>
                </CCard>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <CCard>
              <CCardBody>
                <div className="text-center py-5">
                  <CIcon icon={cilBullhorn} size="3xl" className="text-muted mb-3" />
                  <h5 className="text-muted">No Announcements</h5>
                  <p className="text-muted">
                    There are currently no announcements to display. Check back later for updates.
                  </p>
                </div>
              </CCardBody>
            </CCard>
          ) : (
            <CCard>
              <CCardBody>
                <div className="text-center py-5">
                  <CIcon icon={cilSearch} size="3xl" className="text-muted mb-3" />
                  <h5 className="text-muted">No Results Found</h5>
                  <p className="text-muted">
                    No announcements match your current search criteria. Try adjusting your filters.
                  </p>
                  <CButton
                    color="primary"
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('')
                      setPriorityFilter('all')
                    }}
                  >
                    Clear Filters
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          )}
        </CCol>
      </CRow>

      {/* Quick Stats */}
      {announcements.length > 0 && (
        <CCard className="mt-4">
          <CCardBody>
            <CRow className="text-center">
              <CCol md={3}>
                <h4 className="text-primary">{announcements.length}</h4>
                <small className="text-muted">Total Announcements</small>
              </CCol>
              <CCol md={3}>
                <h4 className="text-danger">
                  {announcements.filter(a => a.priority?.toLowerCase() === 'high').length}
                </h4>
                <small className="text-muted">High Priority</small>
              </CCol>
              <CCol md={3}>
                <h4 className="text-warning">
                  {announcements.filter(a => a.priority?.toLowerCase() === 'medium').length}
                </h4>
                <small className="text-muted">Medium Priority</small>
              </CCol>
              <CCol md={3}>
                <h4 className="text-success">
                  {announcements.filter(a => {
                    const weekAgo = new Date()
                    weekAgo.setDate(weekAgo.getDate() - 7)
                    return a.createdAt >= weekAgo
                  }).length}
                </h4>
                <small className="text-muted">This Week</small>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      )}
    </div>
  )
}

export default ParentAnnouncements 