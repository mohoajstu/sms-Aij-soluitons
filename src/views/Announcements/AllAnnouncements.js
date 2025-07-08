import React, { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore'
import { firestore, auth } from '../../firebase'
import { onAuthStateChanged } from 'firebase/auth'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CSpinner,
  CAlert,
  CButton,
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCalendar, cilTrash } from '@coreui/icons'
import './AllAnnouncements.css'

const AllAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [announcementToDelete, setAnnouncementToDelete] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // TODO: Replace with actual user role fetch
        setUserRole('admin')
      }
    })
    fetchAnnouncements()
    return () => unsubscribe()
  }, [])

  const fetchAnnouncements = async () => {
    setLoading(true)
    setError('')
    try {
      const announcementsRef = collection(firestore, 'announcements')
      const qy = query(announcementsRef, orderBy('date', 'desc'))
      const snapshot = await getDocs(qy)
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setAnnouncements(data)
    } catch (err) {
      setError('Failed to fetch announcements.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id) => {
    setAnnouncementToDelete(id)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!announcementToDelete) return
    setDeletingId(announcementToDelete)
    try {
      await deleteDoc(doc(firestore, 'announcements', announcementToDelete))
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcementToDelete))
      setShowDeleteModal(false)
      setAnnouncementToDelete(null)
    } catch (err) {
      setError('Failed to delete announcement.')
    } finally {
      setDeletingId(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setAnnouncementToDelete(null)
  }

  return (
    <div className="all-announcements-container" style={{ maxWidth: 700, margin: '2rem auto' }}>
      <CCard>
        <CCardHeader>
          <h2>All Announcements</h2>
        </CCardHeader>
        <CCardBody>
          <CModal visible={showDeleteModal} onClose={cancelDelete} alignment="center">
            <CModalHeader onClose={cancelDelete}>Confirm Delete</CModalHeader>
            <CModalBody>
              Are you sure you want to delete this announcement?
            </CModalBody>
            <CModalFooter>
              <CButton color="secondary" onClick={cancelDelete} disabled={!!deletingId}>
                Cancel
              </CButton>
              <CButton color="danger" onClick={confirmDelete} disabled={!!deletingId}>
                {deletingId ? <CSpinner size="sm" /> : 'Delete'}
              </CButton>
            </CModalFooter>
          </CModal>
          {loading && (
            <div className="text-center py-4">
              <CSpinner color="primary" />
            </div>
          )}
          {error && <CAlert color="danger">{error}</CAlert>}
          {!loading && !error && announcements.length === 0 && (
            <CAlert color="info">No announcements found.</CAlert>
          )}
          {!loading && !error && announcements.length > 0 && (
            <div className="announcements-container">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`announcement-item priority-${announcement.priority}`}
                >
                  <div className="announcement-header-row">
                    <div className="announcement-title-row">
                      <h4 className="announcement-title">{announcement.title}</h4>
                    </div>
                    <div className="announcement-actions">
                      <span className={`announcement-priority priority-${announcement.priority}`}>
                        {announcement.priority?.toUpperCase()} PRIORITY
                      </span>
                      {userRole === 'admin' && (
                        <button
                          className="announcement-delete-btn"
                          title="Delete announcement"
                          onClick={() => handleDelete(announcement.id)}
                          disabled={!!deletingId}
                        >
                          {deletingId === announcement.id ? (
                            <CSpinner size="sm" />
                          ) : (
                            <CIcon icon={cilTrash} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="announcement-meta">
                    <span className="announcement-date">
                      <CIcon icon={cilCalendar} className="me-1" />
                      {announcement.date}
                    </span>
                  </div>
                  {announcement.description && (
                    <div className="announcement-description mt-2">{announcement.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CCardBody>
      </CCard>
    </div>
  )
}

export default AllAnnouncements 