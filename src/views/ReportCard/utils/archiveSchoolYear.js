import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore'
import { saveSchoolYearSettings } from './schoolYear'

// Each student touched writes 2 ops (archive doc + reset), so keep batches
// well under Firestore's 500-op limit per commit.
const STUDENTS_PER_BATCH = 200

/**
 * Archives every student's current attendanceStats under the outgoing
 * school year, resets those counters to zero, then advances the stored
 * school year settings to the new year. Report card drafts/reports are not
 * moved or deleted — they're simply tagged with `schoolYear` as they're
 * saved from now on, and the year boundary this writes is what keeps old
 * ones from being picked up as "current" (see utils/schoolYear.js).
 *
 * @param {import('firebase/firestore').Firestore} firestoreInstance
 * @param {{outgoingLabel: string, newLabel: string, newStartDate: string}} params
 * @param {{onProgress?: (done: number, total: number) => void}} [options]
 * @returns {Promise<{studentsArchived: number}>}
 */
export const archiveAndStartNewSchoolYear = async (
  firestoreInstance,
  { outgoingLabel, newLabel, newStartDate },
  { onProgress } = {},
) => {
  if (!outgoingLabel || !newLabel || !newStartDate) {
    throw new Error('outgoingLabel, newLabel, and newStartDate are all required')
  }

  const studentsSnapshot = await getDocs(collection(firestoreInstance, 'students'))
  const studentDocs = studentsSnapshot.docs

  for (let i = 0; i < studentDocs.length; i += STUDENTS_PER_BATCH) {
    const batch = writeBatch(firestoreInstance)
    const chunk = studentDocs.slice(i, i + STUDENTS_PER_BATCH)

    chunk.forEach((studentDoc) => {
      const data = studentDoc.data() || {}
      const archiveRef = doc(
        firestoreInstance,
        'attendanceArchives',
        `${studentDoc.id}_${outgoingLabel}`,
      )
      batch.set(archiveRef, {
        studentId: studentDoc.id,
        studentName:
          data.fullName ||
          `${data.personalInfo?.firstName || ''} ${data.personalInfo?.lastName || ''}`.trim(),
        schoolYear: outgoingLabel,
        grade: data.grade || data.program || '',
        attendanceStats: data.attendanceStats || {},
        archivedAt: serverTimestamp(),
      })
      batch.update(studentDoc.ref, {
        attendanceStats: {
          currentTermLateCount: 0,
          yearLateCount: 0,
          currentTermAbsenceCount: 0,
          yearAbsenceCount: 0,
        },
      })
    })

    await batch.commit()
    onProgress?.(Math.min(i + STUDENTS_PER_BATCH, studentDocs.length), studentDocs.length)
  }

  await saveSchoolYearSettings(firestoreInstance, { label: newLabel, startDate: newStartDate })

  return { studentsArchived: studentDocs.length }
}
