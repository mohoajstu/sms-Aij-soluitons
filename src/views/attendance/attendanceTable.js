import React, { useState, useEffect } from 'react'
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CFormSwitch,
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CFormInput,
  CAlert,
  CSpinner,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilChatBubble, cilBellExclamation } from '@coreui/icons'
import { toast } from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router-dom'
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore'
import { firestore } from '../../Firebase/firebase'
import useAuth from '../../Firebase/useAuth'
import './attendanceTable.css'

const AttendanceTable = () => {
  const location = useLocation()
  const selectedCourse = location.state?.selectedCourse
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [attendanceData, setAttendanceData] = useState({})
  const [originalAttendanceData, setOriginalAttendanceData] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [commentInput, setCommentInput] = useState('')
  const [allPresent, setAllPresent] = useState(false)
  const [attendanceDate, setAttendanceDate] = useState(
    location.state?.selectedDate ? new Date(location.state.selectedDate) : new Date(),
  )

  const { user } = useAuth()
  const navigate = useNavigate()
  const [attendanceLoaded, setAttendanceLoaded] = useState(false)
  const [attendanceExists, setAttendanceExists] = useState(false)

  useEffect(() => {
    const fetchEnrolledStudents = async () => {
      setStudentsLoading(true)
      let studentIds = []

      // Check for the 'students' array in the course object first
      if (selectedCourse?.students && Array.isArray(selectedCourse.students)) {
        studentIds = selectedCourse.students.map((student) => student.id).filter(Boolean)
      }
      // Fallback to 'enrolledList' if 'students' isn't there
      else if (selectedCourse?.enrolledList) {
        studentIds = selectedCourse.enrolledList
      }

      if (studentIds.length > 0) {
        try {
          const studentDocs = await Promise.all(
            studentIds.map(async (id) => {
              const docRef = doc(firestore, 'students', id)
              const docSnap = await getDoc(docRef)
              if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() }
              } else {
                console.warn(`Student with ID ${id} could not be found.`)
                return null
              }
            }),
          )
          setStudents(studentDocs.filter(Boolean))
        } catch (err) {
          setStudents([])
          console.error('Error fetching enrolled students:', err)
        } finally {
          setStudentsLoading(false)
        }
      } else {
        // If no course is selected or it has no students, clear the list
        setStudents([])
        setStudentsLoading(false)
      }
    }
    fetchEnrolledStudents()
  }, [selectedCourse])

  // Load existing attendance for this date/course
  useEffect(() => {
    const loadAttendance = async () => {
      setAttendanceLoaded(false)
      setAttendanceExists(false)
      if (!selectedCourse) return

      const dateId = attendanceDate.toISOString().split('T')[0]
      const courseId = selectedCourse.id
      const attendanceDocRef = doc(firestore, 'attendance', dateId)

      try {
        const docSnap = await getDoc(attendanceDocRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          const courseData = data.courses?.find((c) => c.courseId === courseId)

          if (courseData && courseData.students) {
            const loadedAttendance = {}
            courseData.students.forEach((student) => {
              loadedAttendance[student.studentId] = {
                status: student.status,
                comment: student.note || '',
              }
            })
            setAttendanceData(loadedAttendance)
            setOriginalAttendanceData(loadedAttendance)
            setAttendanceExists(true)
          } else {
            setAttendanceData({})
            setOriginalAttendanceData({})
          }
        } else {
          setAttendanceData({})
          setOriginalAttendanceData({})
        }
      } catch (err) {
        console.error('Error loading attendance:', err)
      } finally {
        setAttendanceLoaded(true)
      }
    }
    loadAttendance()
    // Only reload if course or date changes
  }, [selectedCourse, attendanceDate])



  const handleSetAllPresent = (checked) => {
    const newAttendance = {}
    students.forEach((student) => {
      newAttendance[student.id] = {
        status: checked ? 'Present' : 'Absent',
        comment: attendanceData[student.id]?.comment || '',
      }
    })
    setAttendanceData(newAttendance)
    setAllPresent(checked)
  }

  const handleAttendanceChange = async (student, status) => {
    // Update attendance status
    setAttendanceData({
      ...attendanceData,
      [student.id]: {
        status,
        comment: attendanceData[student.id]?.comment || '',
      },
    })
  }



  const openCommentModal = (student) => {
    setSelectedStudent(student)
    setCommentInput(attendanceData[student.id]?.comment || '')
    setShowModal(true)
  }

  const saveComment = () => {
    setAttendanceData({
      ...attendanceData,
      [selectedStudent.id]: {
        status: attendanceData[selectedStudent.id]?.status || 'Absent',
        comment: commentInput,
      },
    })
    setShowModal(false)
  }

  const handleComplete = async () => {
    if (!selectedCourse) {
      toast.error('No course selected!')
      return
    }
    if (!user || !user.uid) {
      toast.error('You must be logged in to record attendance.')
      return
    }
    const dateId = attendanceDate.toISOString().split('T')[0] // YYYY-MM-DD
    const attendanceDocRef = doc(firestore, 'attendance', dateId)

    const studentRecords = Object.entries(attendanceData).map(([studentId, data]) => {
      const studentInfo = students.find((s) => s.id === studentId)
      const studentName = studentInfo?.personalInfo
        ? `${studentInfo.personalInfo.firstName || ''} ${studentInfo.personalInfo.lastName || ''}`.trim()
        : studentInfo?.name || 'Unknown Student'

      return {
        studentId,
        studentName,
        status: data.status,
        note: data.comment || '',
      }
    })

    const newCourseRecord = {
      courseId: selectedCourse.id,
      courseTitle: selectedCourse.name || selectedCourse.label || 'Untitled Course',
      recordedAt: new Date(),
      recordedBy: user.uid,
      students: studentRecords,
    }

    try {
      const docSnap = await getDoc(attendanceDocRef)

      if (docSnap.exists()) {
        const existingData = docSnap.data()
        const courses = existingData.courses || []
        const courseIndex = courses.findIndex((c) => c.courseId === selectedCourse.id)

        if (courseIndex > -1) {
          courses[courseIndex] = newCourseRecord
        } else {
          courses.push(newCourseRecord)
        }

        await updateDoc(attendanceDocRef, { courses })
      } else {
        await setDoc(attendanceDocRef, {
          date: dateId,
          courses: [newCourseRecord],
        })
      }

      // Update attendance counters on student docs based on deltas
      const updatePromises = []
      students.forEach((student) => {
        const studentId = student.id
        const prevStatus = originalAttendanceData[studentId]?.status
        const newStatus = attendanceData[studentId]?.status

        if (prevStatus === newStatus || !newStatus) {
          return
        }

        let lateDelta = 0
        let absenceDelta = 0

        // Late includes both 'Late' and 'Excused Late'
        const wasLate = prevStatus === 'Late' || prevStatus === 'Excused Late'
        const isLate = newStatus === 'Late' || newStatus === 'Excused Late'
        if (!wasLate && isLate) lateDelta += 1
        if (wasLate && !isLate) lateDelta -= 1

        // Absent includes both 'Absent' and 'Excused Absent'
        const wasAbsent = prevStatus === 'Absent' || prevStatus === 'Excused Absent'
        const isAbsent = newStatus === 'Absent' || newStatus === 'Excused Absent'
        if (!wasAbsent && isAbsent) absenceDelta += 1
        if (wasAbsent && !isAbsent) absenceDelta -= 1

        if (lateDelta !== 0 || absenceDelta !== 0) {
          const studentRef = doc(firestore, 'students', studentId)
          const updatePayload = {}
          if (lateDelta !== 0) {
            updatePayload['attendanceStats.currentTermLateCount'] = increment(lateDelta)
            updatePayload['attendanceStats.yearLateCount'] = increment(lateDelta)
          }
          if (absenceDelta !== 0) {
            updatePayload['attendanceStats.currentTermAbsenceCount'] = increment(absenceDelta)
            updatePayload['attendanceStats.yearAbsenceCount'] = increment(absenceDelta)
          }
          updatePromises.push(updateDoc(studentRef, updatePayload))
        }
      })

      await Promise.all(updatePromises)

      toast.success('Attendance saved!')
      navigate('/attendance')
    } catch (err) {
      console.error('Error saving attendance:', err)
      toast.error('Failed to save attendance.')
    }
  }



  return (
    <div style={{ position: 'relative', paddingBottom: '60px' }}>
      {/* Attendance already exists alert */}
      {attendanceExists && (
        <CAlert color="warning" className="d-flex align-items-center mb-3">
          <CIcon icon={cilBellExclamation} className="flex-shrink-0 me-2" />
          <div>
            Attendance for this class and date has already been taken. You may update and resubmit if
            needed.
          </div>
        </CAlert>
      )}



      {/* Mark All Present Switch */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <CFormSwitch
          label="Mark All Present"
          checked={allPresent}
          onChange={(e) => handleSetAllPresent(e.target.checked)}
        />

        <div className="d-flex align-items-center bg-light rounded p-2 shadow-sm">
          <CFormInput
            type="date"
            value={attendanceDate.toISOString().split('T')[0]}
            readOnly
            style={{
              minWidth: '160px',
              borderRadius: '8px',
              border: '2px solid #e3e6f0',
              padding: '8px 12px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: '#f8f9fa',
            }}
          />
        </div>
      </div>

      {/* Attendance Table */}
      <div className="attendance-table-container-fixed">
        <CTable bordered responsive className="attendance-fixed-table">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell style={{ width: '22%' }}>Students</CTableHeaderCell>
              <CTableHeaderCell style={{ width: '18%' }}>Attendance Codes</CTableHeaderCell>
              <CTableHeaderCell style={{ width: '18%' }}>Status</CTableHeaderCell>
              <CTableHeaderCell style={{ width: '42%' }}>Comments</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {students.map((student) => {
              // Prefer Firestore fields if present
              const fullName = student.personalInfo
                ? `${student.personalInfo.firstName || ''} ${
                    student.personalInfo.lastName || ''
                  }`.trim()
                : student.name
              const grade = student.schooling?.program || student.grade || ''
              const avatar = student.avatar || 'https://i.pravatar.cc/40?img=1'
              return (
                <CTableRow key={student.id} style={{ background: '#fff' }}>
                  <CTableDataCell style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* <img src={avatar} alt={fullName} style={{ borderRadius: '50%' }} /> */}
                    <div>
                      {fullName}
                      <br />
                      <small>
                        #{student.id} • {grade}
                      </small>
                    </div>
                  </CTableDataCell>

                  <CTableDataCell>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}>
                      <CButton
                        color="success"
                        variant="outline"
                        onClick={() => handleAttendanceChange(student, 'Present')}
                        style={{
                          width: 110,
                          backgroundColor:
                            attendanceData[student.id]?.status === 'Present' ? '#28a745' : 'white',
                          color:
                            attendanceData[student.id]?.status === 'Present' ? 'white' : 'black',
                          border: '1px solid #28a745',
                          borderRadius: '6px',
                        }}
                      >
                        ✅ Present
                      </CButton>

                      <CButton
                        color="danger"
                        variant="outline"
                        onClick={() => handleAttendanceChange(student, 'Absent')}
                        style={{
                          width: 110,
                          backgroundColor:
                            attendanceData[student.id]?.status === 'Absent' ? '#dc3545' : 'white',
                          color:
                            attendanceData[student.id]?.status === 'Absent' ? 'white' : 'black',
                          border: '1px solid #dc3545',
                          borderRadius: '6px',
                        }}
                      >
                        ❌ Absent
                      </CButton>

                      <CButton
                        color="warning"
                        variant="outline"
                        onClick={() => handleAttendanceChange(student, 'Late')}
                        style={{
                          width: 110,
                          backgroundColor:
                            attendanceData[student.id]?.status === 'Late' ? '#ffc107' : 'white',
                          color: attendanceData[student.id]?.status === 'Late' ? 'black' : 'black',
                          border: '1px solid #ffc107',
                          borderRadius: '6px',
                        }}
                      >
                        ⏳ Late
                      </CButton>

                      <CButton
                        color="info"
                        variant="outline"
                        onClick={() => handleAttendanceChange(student, 'Excused Late')}
                        style={{
                          width: 110,
                          backgroundColor:
                            attendanceData[student.id]?.status === 'Excused Late' ? '#17a2b8' : 'white',
                          color:
                            attendanceData[student.id]?.status === 'Excused Late' ? 'white' : 'black',
                          border: '1px solid #17a2b8',
                          borderRadius: '6px',
                        }}
                      >
                        📝⏳ Exc. Late
                      </CButton>

                      <CButton
                        color="secondary"
                        variant="outline"
                        onClick={() => handleAttendanceChange(student, 'Excused Absent')}
                        style={{
                          width: 110,
                          backgroundColor:
                            attendanceData[student.id]?.status === 'Excused Absent' ? '#6c757d' : 'white',
                          color:
                            attendanceData[student.id]?.status === 'Excused Absent' ? 'white' : 'black',
                          border: '1px solid #6c757d',
                          borderRadius: '6px',
                        }}
                      >
                        📝❌ Exc. Abs.
                      </CButton>
                    </div>
                  </CTableDataCell>
                  <CTableDataCell>
                    {attendanceData[student.id]?.status && (
                      <CBadge
                        color={
                          attendanceData[student.id]?.status === 'Present'
                            ? 'success'
                            : attendanceData[student.id]?.status === 'Late'
                            ? 'warning'
                            : attendanceData[student.id]?.status === 'Absent'
                            ? 'danger'
                            : attendanceData[student.id]?.status === 'Excused Late'
                            ? 'info'
                            : attendanceData[student.id]?.status === 'Excused Absent'
                            ? 'secondary'
                            : 'primary'
                        }
                      >
                        {attendanceData[student.id]?.status}
                      </CBadge>
                    )}
                  </CTableDataCell>
                  <CTableDataCell
                    style={{
                      minWidth: 200,
                      maxWidth: 400,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    }}
                  >
                    <CIcon
                      icon={cilChatBubble}
                      size="lg"
                      style={{
                        color: attendanceData[student.id]?.comment ? 'green' : 'black',
                        cursor: 'pointer',
                      }}
                      onClick={() => openCommentModal(student)}
                    />
                    {attendanceData[student.id]?.comment && (
                      <small className="ms-2 text-muted">
                        {attendanceData[student.id]?.comment.substring(0, 120)}
                      </small>
                    )}
                  </CTableDataCell>
                </CTableRow>
              )
            })}
          </CTableBody>
        </CTable>
      </div>

      {/* Comment Modal */}
      <CModal visible={showModal} onClose={() => setShowModal(false)}>
        <CModalHeader closeButton>
          Comment for {selectedStudent?.personalInfo 
            ? `${selectedStudent.personalInfo.firstName || ''} ${selectedStudent.personalInfo.lastName || ''}`.trim()
            : selectedStudent?.name || 'Student'}
        </CModalHeader>
        <CModalBody>
          <CFormInput
            type="text"
            placeholder="Enter comment..."
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={saveComment}>
            Save Comment
          </CButton>
        </CModalFooter>
      </CModal>



      {/* Complete Button at Bottom Right */}
      <CButton
        color="dark"
        style={{
          position: 'absolute',
          bottom: '10px',
          right: '20px',
          padding: '10px 20px',
          fontSize: '16px',
          borderRadius: '100px',
        }}
        onClick={handleComplete}
      >
        Complete Attendance
      </CButton>
    </div>
  )
}

export default AttendanceTable
