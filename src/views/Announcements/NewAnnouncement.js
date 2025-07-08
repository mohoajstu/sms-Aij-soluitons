import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { firestore } from '../../firebase'
import { collection, addDoc, Timestamp } from 'firebase/firestore'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CFormSelect,
  CAlert,
  CSpinner,
} from '@coreui/react'

const PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const NewAnnouncement = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    date: '',
    priority: 'medium',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (!form.title || !form.date || !form.priority) {
        setError('Please fill in all required fields.')
        setLoading(false)
        return
      }
      await addDoc(collection(firestore, 'announcements'), {
        title: form.title,
        date: form.date,
        priority: form.priority,
        description: form.description,
        createdAt: Timestamp.now(),
      })
      setSuccess('Announcement created!')
      setTimeout(() => navigate('/'), 1200)
    } catch (err) {
      setError('Failed to create announcement.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="new-announcement-container" style={{ maxWidth: 600, margin: '2rem auto' }}>
      <CCard>
        <CCardHeader>
          <h2>New Announcement</h2>
        </CCardHeader>
        <CCardBody>
          {error && <CAlert color="danger">{error}</CAlert>}
          {success && <CAlert color="success">{success}</CAlert>}
          <CForm onSubmit={handleSubmit}>
            <div className="mb-3">
              <CFormLabel htmlFor="title">Title *</CFormLabel>
              <CFormInput
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel htmlFor="date">Date *</CFormLabel>
              <CFormInput
                id="date"
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel htmlFor="priority">Priority *</CFormLabel>
              <CFormSelect
                id="priority"
                name="priority"
                value={form.priority}
                onChange={handleChange}
                required
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </CFormSelect>
            </div>
            <div className="mb-3">
              <CFormLabel htmlFor="description">Description</CFormLabel>
              <CFormTextarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
              />
            </div>
            <div className="d-flex gap-2">
              <CButton type="submit" color="primary" disabled={loading}>
                {loading ? <CSpinner size="sm" /> : 'Create'}
              </CButton>
              <CButton type="button" color="secondary" onClick={() => navigate(-1)} disabled={loading}>
                Cancel
              </CButton>
            </div>
          </CForm>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default NewAnnouncement 