import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { assertDraftScope, getReportYear, getReportTerm, matchesReportScope } from './reportScope'
import { appendDraftVersion, getLatestFormData } from './draftVersioning'
import { draftRevision } from './saveScopedDraft'

export const publishScopedReport = async (db, report, current, publication, draftPatch, expectedRevision, existingId = null) => {
  const year = getReportYear(report, current)
  const term = getReportTerm(report)
  if (year === 'unknown' || term === 'unknown') throw new Error('The school year and term must be known before publishing this report.')
  const draftRef = doc(db, 'reportCardDrafts', report.id)
  const publishedRef = doc(db, 'reportCards', existingId || `${report.id}_published`)
  await runTransaction(db, async (transaction) => {
    const draft = await transaction.get(draftRef)
    const published = await transaction.get(publishedRef)
    if (!draft.exists()) throw new Error('Draft no longer exists. Refresh the review list.')
    const data = draft.data()
    assertDraftScope({ ...data, id: report.id }, {
      studentId: report.studentId || report.selectedStudent?.id,
      type: report.reportCardType, term, year, current,
    })
    if (draftRevision(data) !== expectedRevision) throw new Error('This report was edited after you opened it. Reopen the latest version before approving.')
    if (published.exists() && (!matchesReportScope({ ...published.data(), id: publishedRef.id }, year, term, current) ||
      published.data().studentId !== data.studentId || published.data().type !== data.reportCardType)) {
      throw new Error('Published report belongs to another reporting period. No records were changed.')
    }
    transaction.set(publishedRef, {
      ...publication, studentId: data.studentId, schoolYear: year, term, sourceDraftId: report.id,
      createdAt: published.exists() ? published.data().createdAt || serverTimestamp() : serverTimestamp(),
    }, { merge: true })
    transaction.update(draftRef, { ...draftPatch, schoolYear: year, term,
      ...(draftPatch.formData && {
        versions: appendDraftVersion(data.versions, { uid: publication.approvedBy, teacherName: 'Admin', term },
          draftPatch.formData, getLatestFormData(data), 10), lastModified: serverTimestamp(),
      }),
    })
  })
}
