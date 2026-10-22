import { collection, getDocs, writeBatch } from 'firebase/firestore'

/**
 * Client-side counterpart to src/scripts/recalculateAttendanceStats.js, for
 * admins to run from the deployed app (no service account needed).
 *
 * Recomputes every student's attendanceStats from the actual `attendance`
 * records on/after a given school-year start date, so counts stop
 * including attendance from a prior academic year.
 */

const isLateStatus = (status) => status === 'Late' || status === 'Excused Late'
const isAbsentStatus = (status) => status === 'Absent' || status === 'Excused Absent'

const BATCH_SIZE = 400

/**
 * @param {import('firebase/firestore').Firestore} firestoreInstance
 * @param {string} startDate - ISO date string (YYYY-MM-DD); attendance docs are keyed by date.
 * @param {{onProgress?: (done: number, total: number) => void}} [options]
 * @returns {Promise<{studentsUpdated: number}>}
 */
export const recalculateAttendanceStatsFromDate = async (
  firestoreInstance,
  startDate,
  { onProgress } = {},
) => {
  const startDateObj = new Date(startDate)

  const attendanceSnapshot = await getDocs(collection(firestoreInstance, 'attendance'))
  const studentStats = new Map() // studentId -> { late, absent }

  attendanceSnapshot.forEach((docSnap) => {
    const dateId = docSnap.id // Format: YYYY-MM-DD
    const date = new Date(dateId)
    if (Number.isNaN(date.getTime()) || date < startDateObj) return

    const courses = docSnap.data()?.courses || []
    courses.forEach((course) => {
      ;(course.students || []).forEach((student) => {
        const studentId = student.studentId
        if (!studentId) return

        if (!studentStats.has(studentId)) {
          studentStats.set(studentId, { late: 0, absent: 0 })
        }
        const stats = studentStats.get(studentId)

        if (isLateStatus(student.status)) stats.late += 1
        if (isAbsentStatus(student.status)) stats.absent += 1
      })
    })
  })

  const studentsSnapshot = await getDocs(collection(firestoreInstance, 'students'))
  const updates = []
  studentsSnapshot.forEach((docSnap) => {
    const stats = studentStats.get(docSnap.id) || { late: 0, absent: 0 }
    updates.push({
      ref: docSnap.ref,
      stats: {
        currentTermLateCount: stats.late,
        yearLateCount: stats.late,
        currentTermAbsenceCount: stats.absent,
        yearAbsenceCount: stats.absent,
      },
    })
  })

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = writeBatch(firestoreInstance)
    const chunk = updates.slice(i, i + BATCH_SIZE)
    chunk.forEach(({ ref, stats }) => {
      batch.update(ref, { attendanceStats: stats })
    })
    await batch.commit()
    onProgress?.(Math.min(i + BATCH_SIZE, updates.length), updates.length)
  }

  return { studentsUpdated: updates.length }
}
