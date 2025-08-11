import React, { useState, useEffect } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CForm,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormCheck,
  CInputGroup,
  CInputGroupText,
  CSpinner,
} from '@coreui/react'
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  updateDoc,
} from 'firebase/firestore'
import { firestore } from '../../firebase'
import { arrayUnion } from 'firebase/firestore'

// Util to generate a temporary Tarbiyah/School ID – you can adjust the prefix as needed
const generateSchoolId = () => {
  const rand = Math.floor(100000 + Math.random() * 900000)
  return `TLS${rand}`
}

// Generate a Tarbiyah ID for parents (e.g., TP935871)
const generateTarbiyahId = () => {
  const rand = Math.floor(100000 + Math.random() * 900000)
  return `TP${rand}`
}

/*****************************************************************************
 * StudentForm
 * -------------
 * A small form for creating a brand-new student document in Firestore.  The
 * component is intended to be rendered inside a modal.  When the save is
 * successful, `onCreated` will be called with a lightweight object containing
 * the new student id and display name so that upstream components (like the
 * selector modal) can immediately incorporate the freshly-created student.
 *****************************************************************************/
export const StudentForm = ({ visible, onClose, onCreated }) => {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    schoolId: generateSchoolId(),
    active: true,
    personalInfo: {
      firstName: '',
      middleName: '',
      lastName: '',
      nickName: '',
      salutation: 'Mr./Ms.',
      dob: '',
      gender: 'F',
      primaryRole: 'Student',
      schoolId: '',
    },
    address: {
      poBox: '',
      residentialArea: 'Unknown',
      streetAddress: '',
    },
    citizenship: {
      nationalId: '',
      nationalIdExpiry: '',
      nationality: '',
    },
    contact: {
      email: '',
      phone1: '',
      phone2: '',
      emergencyPhone: '',
    },
    language: {
      primary: 'English',
      secondary: 'English',
    },
    parents: {
      father: {
        name: '',
        tarbiyahId: '',
      },
      mother: {
        name: '',
        tarbiyahId: '',
      },
    },
    schooling: {
      custodyDetails: '',
      daySchoolEmployer: '',
      notes: '',
      program: '',
      returningStudentYear: '',
    },
  })

  const handleChange = (path, value) => {
    // path like 'personalInfo.firstName'
    const keys = path.split('.')
    setFormData((prev) => {
      const updated = { ...prev }
      let cur = updated
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i]
        cur[k] = { ...cur[k] }
        cur = cur[k]
      }
      cur[keys[keys.length - 1]] = value
      return updated
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Derive display name for convenience
      const firstName = formData.personalInfo.firstName.trim()
      const lastName = formData.personalInfo.lastName.trim()
      const displayName = `${firstName} ${lastName}`.trim()

      if (!firstName || !lastName) {
        alert('Please provide both first and last name for the student.')
        setSaving(false)
        return
      }

      // Ensure parents have Tarbiyah IDs (auto-generate if absent)
      const fatherId = formData.parents.father.tarbiyahId || generateTarbiyahId()
      const motherId = formData.parents.mother.tarbiyahId || generateTarbiyahId()

      const docId = formData.schoolId || generateSchoolId()
      const studentRef = doc(firestore, 'students', docId)

      const payload = {
        ...formData,
        schoolId: docId,
        parents: {
          father: {
            ...formData.parents.father,
            tarbiyahId: fatherId,
          },
          mother: {
            ...formData.parents.mother,
            tarbiyahId: motherId,
          },
        },
        uploadedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }

      await setDoc(studentRef, payload)

      // Ensure a corresponding user document exists for this student
      try {
        const userRef = doc(firestore, 'users', docId)
        const userDocPayload = {
          tarbiyahId: docId,
          role: 'Student',
          linkedCollection: 'students',
          active: payload.active ?? true,
          personalInfo: {
            firstName,
            lastName,
          },
          dashboard: { theme: 'default' },
          stats: { loginCount: 0, lastLoginAt: null },
          createdAt: serverTimestamp(),
        }
        await setDoc(userRef, userDocPayload, { merge: true })
      } catch (e) {
        console.error('Failed to create/update users doc for student:', e)
      }

      onCreated && onCreated({ id: docId, name: displayName })
      onClose()
    } catch (error) {
      console.error('Error creating student:', error)
      alert('Failed to save student. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CModal size="lg" visible={visible} onClose={onClose} scrollable>
      <CModalHeader onClose={onClose}>
        <CModalTitle>Create New Student</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CForm className="p-2">
          {/* Basic info */}
          <CRow className="mb-3">
            <CCol md={4}>
              <CFormLabel>School ID (Tarbiyah ID)</CFormLabel>
              <CInputGroup>
                <CInputGroupText>ID</CInputGroupText>
                <CFormInput
                  value={formData.schoolId}
                  onChange={(e) => handleChange('schoolId', e.target.value)}
                  placeholder="e.g. TLS575926"
                />
              </CInputGroup>
            </CCol>
            <CCol md={4}>
              <CFormLabel>First Name *</CFormLabel>
              <CFormInput
                value={formData.personalInfo.firstName}
                onChange={(e) => handleChange('personalInfo.firstName', e.target.value)}
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel>Last Name *</CFormLabel>
              <CFormInput
                value={formData.personalInfo.lastName}
                onChange={(e) => handleChange('personalInfo.lastName', e.target.value)}
              />
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={4}>
              <CFormLabel>Gender</CFormLabel>
              <CFormInput
                value={formData.personalInfo.gender}
                onChange={(e) => handleChange('personalInfo.gender', e.target.value)}
                placeholder="M / F"
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel>Date of Birth</CFormLabel>
              <CFormInput
                type="date"
                value={formData.personalInfo.dob}
                onChange={(e) => handleChange('personalInfo.dob', e.target.value)}
              />
            </CCol>
            <CCol md={4} className="d-flex align-items-end">
              <CFormCheck
                id="active"
                label="Active"
                checked={formData.active}
                onChange={(e) => handleChange('active', e.target.checked)}
              />
            </CCol>
          </CRow>

          {/* Contact */}
          <h6>Contact</h6>
          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel>Email</CFormLabel>
              <CFormInput
                value={formData.contact.email}
                onChange={(e) => handleChange('contact.email', e.target.value)}
                placeholder="example@email.com"
              />
            </CCol>
            <CCol md={3}>
              <CFormLabel>Phone 1</CFormLabel>
              <CFormInput
                value={formData.contact.phone1}
                onChange={(e) => handleChange('contact.phone1', e.target.value)}
              />
            </CCol>
            <CCol md={3}>
              <CFormLabel>Phone 2</CFormLabel>
              <CFormInput
                value={formData.contact.phone2}
                onChange={(e) => handleChange('contact.phone2', e.target.value)}
              />
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={4}>
              <CFormLabel>Emergency Phone</CFormLabel>
              <CFormInput
                value={formData.contact.emergencyPhone}
                onChange={(e) => handleChange('contact.emergencyPhone', e.target.value)}
              />
            </CCol>
          </CRow>

          {/* Address */}
          <h6>Address</h6>
          <CRow className="mb-3">
            <CCol md={4}>
              <CFormLabel>Street Address</CFormLabel>
              <CFormInput
                value={formData.address.streetAddress}
                onChange={(e) => handleChange('address.streetAddress', e.target.value)}
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel>Residential Area</CFormLabel>
              <CFormInput
                value={formData.address.residentialArea}
                onChange={(e) => handleChange('address.residentialArea', e.target.value)}
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel>PO Box</CFormLabel>
              <CFormInput
                value={formData.address.poBox}
                onChange={(e) => handleChange('address.poBox', e.target.value)}
              />
            </CCol>
          </CRow>

          {/* Parents */}
          <h6>Parents</h6>
          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel>Father's Name</CFormLabel>
              <CFormInput
                value={formData.parents.father.name}
                onChange={(e) => handleChange('parents.father.name', e.target.value)}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Father Tarbiyah ID</CFormLabel>
              <CFormInput
                value={formData.parents.father.tarbiyahId}
                onChange={(e) => handleChange('parents.father.tarbiyahId', e.target.value)}
              />
            </CCol>
          </CRow>
          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel>Mother's Name</CFormLabel>
              <CFormInput
                value={formData.parents.mother.name}
                onChange={(e) => handleChange('parents.mother.name', e.target.value)}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Mother Tarbiyah ID</CFormLabel>
              <CFormInput
                value={formData.parents.mother.tarbiyahId}
                onChange={(e) => handleChange('parents.mother.tarbiyahId', e.target.value)}
              />
            </CCol>
          </CRow>
        </CForm>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <CSpinner size="sm" className="me-2" /> Saving...
            </>
          ) : (
            'Save Student'
          )}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

/*****************************************************************************
 * StudentSelectorModal
 * --------------------
 * Allows the user to: 1) search and select multiple existing students and 2)
 * create a new student on the fly (via the StudentForm above).  When the user
 * confirms, the selected students are added to the supplied course document.
 *****************************************************************************/
const StudentSelectorModal = ({ visible, courseId, onClose }) => {
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [creatingStudent, setCreatingStudent] = useState(false)

  const loadStudents = async () => {
    setLoading(true)
    try {
      const studentsRef = collection(firestore, 'students')
      // Fetch all students – in a production app you might paginate
      const snapshot = await getDocs(studentsRef)
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      setStudents(list)
    } catch (error) {
      console.error('Error loading students:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (visible) {
      loadStudents()
      setSelected(new Set())
    }
  }, [visible])

  const toggleSelect = (studentId) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(studentId) ? next.delete(studentId) : next.add(studentId)
      return next
    })
  }

  const handleConfirm = async () => {
    if (selected.size === 0) return

    try {
      const courseRef = doc(firestore, 'courses', courseId)
      const courseSnap = await getDoc(courseRef)
      if (!courseSnap.exists()) throw new Error('Course not found')

      const courseData = courseSnap.data()
      const current = Array.isArray(courseData.students) ? courseData.students : []

      const selectedArr = students.filter((s) => selected.has(s.id))
      const newEntries = selectedArr.map((s) => {
        const name = s.personalInfo
          ? `${s.personalInfo.firstName || ''} ${s.personalInfo.lastName || ''}`.trim()
          : s.name || 'Unnamed Student'
        return { id: s.id, name }
      })

      // Merge without duplicates
      const merged = [...current]
      newEntries.forEach((n) => {
        if (!merged.some((m) => m.id === n.id)) merged.push(n)
      })

      await updateDoc(courseRef, {
        students: merged,
        enrolledList: merged.map((s) => s.id), // keep enrolledList in sync if it exists
      })

      onClose()
    } catch (error) {
      console.error('Failed to add students to course:', error)
      alert('Failed to add students. Please try again.')
    }
  }

  const filteredStudents = students.filter((s) => {
    const name = s.personalInfo
      ? `${s.personalInfo.firstName} ${s.personalInfo.lastName}`
      : s.name || ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <>
      <CModal size="lg" visible={visible} onClose={onClose} scrollable>
        <CModalHeader onClose={onClose}>
          <CModalTitle>Select Students</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CInputGroup className="mb-3">
            <CInputGroupText>Search</CInputGroupText>
            <CFormInput
              placeholder="Search students by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CInputGroup>

          {loading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {filteredStudents.map((s) => {
                const name = s.personalInfo
                  ? `${s.personalInfo.firstName} ${s.personalInfo.lastName}`
                  : s.name || 'Unnamed Student'
                return (
                  <CFormCheck
                    key={s.id}
                    id={`student-${s.id}`}
                    label={`${name} (${s.id})`}
                    checked={selected.has(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    className="mb-1"
                  />
                )
              })}
              {filteredStudents.length === 0 && <p className="text-muted">No students found.</p>}
            </div>
          )}

          <CButton color="link" className="mt-3" onClick={() => setCreatingStudent(true)}>
            + Create New Student
          </CButton>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={onClose}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleConfirm} disabled={selected.size === 0}>
            Add Selected
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Nested modal for creating a student */}
      {creatingStudent && (
        <StudentForm
          visible={creatingStudent}
          onClose={() => setCreatingStudent(false)}
          onCreated={(newStu) => {
            // Add the new student to list & auto-select
            setStudents((prev) => [...prev, { id: newStu.id, personalInfo: { firstName: newStu.name.split(' ')[0], lastName: newStu.name.split(' ').slice(1).join(' ') } }])
            setSelected((prev) => new Set(prev).add(newStu.id))
          }}
        />
      )}
    </>
  )
}

export default StudentSelectorModal 