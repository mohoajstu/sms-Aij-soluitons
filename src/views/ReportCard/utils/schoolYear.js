import { getReportYear } from './reportScope'
import { doc, getDoc, setDoc } from 'firebase/firestore'

/**
 * School-year boundary used to stop attendance totals and report card
 * drafts/reports from one year bleeding into the next.
 *
 * Settings live in a single admin-editable doc: systemSettings/schoolYear.
 * Until an admin saves one (see SchoolYearSettings), callers fall back to a
 * computed default anchored on September 2nd.
 */

const SETTINGS_COLLECTION = 'systemSettings'
const SETTINGS_DOC_ID = 'schoolYear'

// The school's academic year starts September 2nd.
const START_MONTH_INDEX = 8 // 0-indexed: August=7, September=8
const START_DAY = 2

/**
 * Compute a sensible {label, startDate} before any admin has saved explicit
 * settings, based on today's date.
 * @param {Date} [now]
 */
export const computeDefaultSchoolYear = (now = new Date()) => {
  const isOnOrAfterStart =
    now.getMonth() > START_MONTH_INDEX ||
    (now.getMonth() === START_MONTH_INDEX && now.getDate() >= START_DAY)
  const startYear = isOnOrAfterStart ? now.getFullYear() : now.getFullYear() - 1
  const startDate = `${startYear}-09-02`
  return { label: `${startYear}-${startYear + 1}`, startDate }
}

/**
 * Read the current school year settings, falling back to a computed
 * default if an admin hasn't saved one yet.
 */
export const fetchSchoolYearSettings = async (firestoreInstance) => {
  try {
    const snap = await getDoc(doc(firestoreInstance, SETTINGS_COLLECTION, SETTINGS_DOC_ID))
    if (snap.exists()) {
      const data = snap.data()
      if (data?.label && data?.startDate) {
        return { label: data.label, startDate: data.startDate }
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not load school year settings, using computed default:', error)
  }
  return computeDefaultSchoolYear()
}

export const saveSchoolYearSettings = async (firestoreInstance, { label, startDate }) => {
  await setDoc(doc(firestoreInstance, SETTINGS_COLLECTION, SETTINGS_DOC_ID), {
    label,
    startDate,
    updatedAt: new Date().toISOString(),
  })
}

/**
 * True if a Firestore Timestamp, Date, or ISO date string falls on/after the
 * given school-year start date.
 */
export const isOnOrAfterSchoolYearStart = (when, startDate) => {
  if (!when || !startDate) return false
  const whenDate = typeof when?.toDate === 'function' ? when.toDate() : new Date(when)
  if (Number.isNaN(whenDate.getTime())) return false
  return whenDate >= new Date(startDate)
}

/**
 * Decide whether a saved draft/report belongs to the current school year.
 * Explicit `schoolYear` tagging (added going forward) wins; older documents
 * that predate that tagging use their stable creation date (or stay unclassified), so
 * last year's carryover doesn't masquerade as "already filled in" this year.
 */
export const isFromCurrentSchoolYear = (docData, schoolYearInfo) => {
  return !!docData && !!schoolYearInfo && getReportYear(docData, schoolYearInfo) === schoolYearInfo.label
}
