import { getFieldTerm } from './termFieldSeparation'

/**
 * Report types whose cards have term-specific (Report1 / Report2) fields.
 * Only these carry forward Term 1 data into Term 2.
 */
export const REPORT_TYPES_WITH_TERM_FIELDS = ['1-6-report-card', '7-8-report-card', 'quran-report']

/**
 * Decide whether a Term 2 draft is "stale" — i.e. a leftover from before the
 * Term 1 → Term 2 carry-forward feature that should be discarded so the editor
 * re-seeds from Term 1.
 *
 * A draft is stale ONLY when all of these hold:
 *   1. We're loading Term 2, and
 *   2. The report type has term-specific fields, and
 *   3. The student actually has Term 1 data to re-seed from, and
 *   4. The draft contains no Term 1 (Report1) fields.
 *
 * Condition 3 is the fix: a student who joined in Term 2 has no Term 1 data
 * anywhere, so their Term 2 draft will never contain Report1 fields. Without
 * this gate such legitimate drafts were wrongly discarded — blanking the form
 * on reopen and forking a separate draft per teacher instead of consolidating.
 *
 * @param {Object} params
 * @param {string} params.term - 'term1' | 'term2'
 * @param {string} params.reportType - report card type id
 * @param {Object} params.formData - the draft's form data
 * @param {boolean} params.studentHasTerm1 - whether the student has any Term 1 data
 * @returns {boolean}
 */
export const isStaleTerm2Draft = ({ term, reportType, formData, studentHasTerm1 }) => {
  if (term !== 'term2') return false
  if (!REPORT_TYPES_WITH_TERM_FIELDS.includes(reportType)) return false
  if (!studentHasTerm1) return false

  const hasTerm1Field = Object.keys(formData || {}).some((key) => getFieldTerm(key) === 'term1')
  return !hasTerm1Field
}
