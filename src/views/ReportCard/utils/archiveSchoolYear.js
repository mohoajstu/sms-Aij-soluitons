import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore'
import { saveSchoolYearSettings } from './schoolYear'

// Each student touched writes 2 ops (archive doc + reset), so keep batches
// well under Firestore's 500-op limit per commit.
const STUDENTS_PER_BATCH = 200

// Archiving closes out the *current* year, so running it early (e.g. "to
// start fresh" in October) would zero this year's attendance and hide all of
// this year's drafts. Only allow it once the year is ~10 months in.
const MIN_DAYS_BEFORE_ARCHIVE = 300
const DAY_MS = 24 * 60 * 60 * 1000

export const getEarliestArchiveDate = (currentStartDate) => {
  const start = new Date(currentStartDate)
  if (Number.isNaN(start.getTime())) return null
  return new Date(start.getTime() + MIN_DAYS_BEFORE_ARCHIVE * DAY_MS)
}

export const canStartNewSchoolYear = (currentStartDate, now = new Date()) => {
  const earliest = getEarliestArchiveDate(currentStartDate)
  return !!earliest && now >= earliest
}

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
  { outgoingLabel, outgoingStartDate, newLabel, newStartDate },
  { onProgress, now = new Date() } = {},
) => {
  if (!outgoingLabel || !newLabel || !newStartDate) {
    throw new Error('outgoingLabel, newLabel, and newStartDate are all required')
  }
  if (newLabel === outgoingLabel) {
    throw new Error('The new school year label must differ from the current one')
  }
  if (!canStartNewSchoolYear(outgoingStartDate, now)) {
    const earliest = getEarliestArchiveDate(outgoingStartDate)
    throw new Error(
      earliest
        ? `${outgoingLabel} is still in progress; a new school year can be started from ${earliest.toISOString().slice(0, 10)}`
        : 'The current school year has no valid start date',
    )
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
