import { collection, getDocs, query, where } from 'firebase/firestore'

const toDate = (value) => value?.toDate?.() || value || null

/** Same fields and status rules as the Admin Report Card Review list. */
export const toPrintRecord = (id, data) => ({
  ...data,
  id,
  studentName: data.studentName || data.selectedStudent?.fullName || '',
  status: data.adminReviewStatus || 'pending',
  grade: data.formData?.grade || data.selectedStudent?.grade || '',
  finalPdfUrl: data.finalPdfUrl || null,
  term: data.term || null,
  createdAt: toDate(data.createdAt),
  lastModified: toDate(data.lastModified) || toDate(data.createdAt),
})

// Firestore "in" queries accept at most 30 values.
const IN_LIMIT = 30

/** Loads every report draft for the given student ids (all years and terms). */
export const loadCourseReports = async (db, studentIds) => {
  const ids = [...new Set(studentIds.map(String).filter(Boolean))]
  const records = []
  for (let i = 0; i < ids.length; i += IN_LIMIT) {
    const snapshot = await getDocs(
      query(
        collection(db, 'reportCardDrafts'),
        where('studentId', 'in', ids.slice(i, i + IN_LIMIT)),
      ),
    )
    snapshot.forEach((docSnap) => records.push(toPrintRecord(docSnap.id, docSnap.data())))
  }
  return records
}
