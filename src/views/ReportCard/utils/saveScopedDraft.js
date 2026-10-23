import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { assertDraftScope } from './reportScope'
import { appendDraftBaselineVersion, appendDraftVersion, getLatestFormData } from './draftVersioning'

const canonical = (value) => JSON.stringify(value, (_, item) =>
  item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item)
export const draftRevision = (record) => canonical([
  record.versions?.length || 0, getLatestFormData(record),
])

export const saveScopedDraft = async (db, id, data, scope, expectedRevision, consolidation = null) => {
  const target = doc(db, 'reportCardDrafts', id)
  let saved
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(target)
    const existing = snapshot.exists() ? snapshot.data() : null
    for (const [sourceId, revision] of Object.entries(consolidation?.sourceRevisions || {})) {
      const source = await transaction.get(doc(db, 'reportCardDrafts', sourceId))
      if (!source.exists() || draftRevision(source.data()) !== revision) {
        throw new Error('A teacher updated one of the shared drafts. Reopen this report before saving the combined version.')
      }
      assertDraftScope({ ...source.data(), id: sourceId }, scope)
    }
    if (existing) {
      assertDraftScope({ ...existing, id }, scope)
      if (!expectedRevision || expectedRevision !== draftRevision(existing)) {
        throw new Error('This report has a newer saved version. Your changes are still on screen. Copy them before reopening the latest report to reconcile the edits.')
      }
    }
    const approved = existing?.adminReviewStatus === 'approved' || existing?.status === 'complete'
    const baseVersions = consolidation?.versions || existing?.versions || []
    const versions = consolidation
      ? appendDraftBaselineVersion(baseVersions, data, data.formData, Math.max(10, baseVersions.length + 1))
      : appendDraftVersion(baseVersions, data, data.formData, existing ? getLatestFormData(existing) : {}, 10)
    saved = {
      ...data,
      uid: existing?.uid || data.uid,
      teacherName: existing?.teacherName || data.teacherName,
      contributorIds: [...new Set([...(existing?.contributorIds || []), existing?.uid, data.uid].filter(Boolean))],
      lastEditedBy: data.uid,
      lastEditedByName: data.teacherName,
      createdAt: existing?.createdAt || serverTimestamp(),
      lastModified: serverTimestamp(),
      originalTeacherId: existing?.originalTeacherId || existing?.uid || data.uid,
      originalTeacherName: existing?.originalTeacherName || existing?.teacherName || data.teacherName,
      versions,
      status: approved ? 'draft' : existing?.status || 'draft',
      adminReviewStatus: approved ? 'pending' : existing?.adminReviewStatus || 'pending',
      ...(approved && { adminReviewedAt: null, adminReviewedBy: null, publishedToParents: false }),
      ...(consolidation && { consolidatedDraftIds: consolidation.sourceDraftIds, consolidatedAt: serverTimestamp() }),
    }
    // Merge retains approval metadata and fields outside the editor's payload.
    transaction.set(target, saved, { merge: true })
  })
  // The version/content token remains stable even before a server timestamp resolves.
  return { saved }
}
