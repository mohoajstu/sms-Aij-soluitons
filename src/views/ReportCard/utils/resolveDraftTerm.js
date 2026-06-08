/**
 * Resolve which term a draft belongs to when re-opening it for editing.
 *
 * When a draft is handed off for editing (Past Report Cards, Admin Review,
 * Teacher Progress), the editor must restore the term the draft was saved for.
 * Otherwise the editor defaults to Term 1, and for students who joined in
 * Term 2 (no Term 1 draft) the form re-initializes blank, hiding the saved
 * Term 2 work.
 *
 * Resolution order:
 *   1. An explicit, valid stored term ('term1' | 'term2').
 *   2. The term encoded in the deterministic draft id
 *      (`${uid}_${studentId}_${reportType}_${term}`).
 *   3. Default to 'term1'.
 *
 * @param {string|null|undefined} storedTerm - Term explicitly passed in the handoff
 * @param {string|null|undefined} draftId - The draft document id
 * @returns {'term1'|'term2'}
 */
export const resolveDraftTerm = (storedTerm, draftId) => {
  if (storedTerm === 'term1' || storedTerm === 'term2') {
    return storedTerm
  }

  if (typeof draftId === 'string') {
    if (draftId.endsWith('_term2')) return 'term2'
    if (draftId.endsWith('_term1')) return 'term1'
  }

  return 'term1'
}
