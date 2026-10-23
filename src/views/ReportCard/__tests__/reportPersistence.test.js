import { beforeEach, describe, it, expect, vi } from 'vitest'
const state = vi.hoisted(() => ({ records: new Map(), fail: false }))
vi.mock('firebase/firestore', () => ({
  doc: (_db, collection, id) => ({ id, path: `${collection}/${id}` }),
  serverTimestamp: () => '2026-10-23T02:00:00.000Z',
  runTransaction: async (_db, callback) => {
    const writes = []
    await callback({
      get: async (ref) => ({ exists: () => state.records.has(ref.path), data: () => state.records.get(ref.path) }),
      set: (ref, data, options) => writes.push([ref, data, options?.merge]),
      update: (ref, data) => writes.push([ref, data, true]),
    })
    if (state.fail) throw new Error('network interrupted')
    for (const [ref, data, merge] of writes) {
      state.records.set(ref.path, structuredClone({ ...(merge ? state.records.get(ref.path) : {}), ...data }))
    }
  },
}))
import { saveScopedDraft, draftRevision } from '../utils/saveScopedDraft'
import { publishScopedReport } from '../utils/publishScopedReport'
import { draftDocumentId } from '../utils/reportScope'
const current = { label: '2026-2027', startDate: '2026-09-02' }
const scope = { studentId: 'S1', type: 'kg-initial', term: 'term1', year: current.label, current }
const id = draftDocumentId('teacher-a', 'S1', scope.type, scope.term, scope.year)
const path = `reportCardDrafts/${id}`
const payload = (comments, uid = 'teacher-a') => ({ uid, teacherName: uid, studentId: 'S1', reportCardType: scope.type,
  schoolYear: scope.year, term: scope.term, formData: { comments } })
beforeEach(() => { state.records.clear(); state.fail = false })
describe('report persistence across teachers and periods', () => {
  it.each(['kg-initial-observations', 'kg-report', '1-6-progress', '7-8-progress', '1-6-report-card', '7-8-report-card', 'quran-report'])('round-trips %s for both terms and multiple teachers, retaining clears and history', async (type) => {
    for (const term of ['term1', 'term2']) {
      const period = { ...scope, type, term }
      const target = draftDocumentId('a', 'S1', type, term, scope.year)
      let saved = await saveScopedDraft({}, target, { ...payload('First'), reportCardType: type, term }, period)
      saved = await saveScopedDraft({}, target, { ...payload('Second', 'teacher-b'), reportCardType: type, term }, period, draftRevision(saved.saved))
      const persisted = state.records.get(`reportCardDrafts/${target}`)
      expect(persisted.formData.comments).toBe('Second')
      expect(persisted.uid).toBe('teacher-a')
      expect(persisted.contributorIds).toEqual(['teacher-a', 'teacher-b'])
      const cleared = await saveScopedDraft({}, target, { ...payload('', 'teacher-b'), reportCardType: type, term }, period, draftRevision(persisted))
      expect(cleared.saved.formData.comments).toBe('')
      expect(cleared.saved.versions).toHaveLength(3)
      expect(cleared.saved.versions[0].formData.comments).toBe('First')
    }
  })
  it('leaves last year and the other term unchanged while creating this year’s report', async () => {
    state.records.set('reportCardDrafts/teacher-a_S1_kg-initial_term1', { ...payload('Last year'), schoolYear: '2025-2026' })
    const before = structuredClone([...state.records])
    await saveScopedDraft({}, id, payload('This year'), scope)
    expect(state.records.get(before[0][0])).toEqual(before[0][1])
    expect(state.records.get(path).formData.comments).toBe('This year')
    await expect(saveScopedDraft({}, before[0][0].split('/').at(-1), payload('Overwrite'), scope, draftRevision(before[0][1]))).rejects.toThrow('different')
  })
  it('rejects a stale teacher’s save without changing the latest content', async () => {
    const initial = await saveScopedDraft({}, id, payload('First'), scope)
    const oldRevision = draftRevision(initial.saved)
    await saveScopedDraft({}, id, payload('Newer', 'teacher-b'), scope, oldRevision)
    await expect(saveScopedDraft({}, id, payload('Stale'), scope, oldRevision)).rejects.toThrow('newer saved version')
    expect(state.records.get(path).formData.comments).toBe('Newer')
  })
  it('does not create a document on failed writes and permits a retry', async () => {
    state.fail = true
    await expect(saveScopedDraft({}, id, payload('Retry me'), scope)).rejects.toThrow('network')
    expect(state.records.has(path)).toBe(false)
    state.fail = false
    await saveScopedDraft({}, id, payload('Retry me'), scope)
    expect(state.records.get(path).formData.comments).toBe('Retry me')
  })
  it('detects newer edits in any source of a consolidated legacy report', async () => {
    const first = await saveScopedDraft({}, id, payload('First'), scope)
    const other = { ...payload('Other', 'teacher-b'), versions: [] }
    state.records.set('reportCardDrafts/other', other)
    const consolidation = { sourceDraftIds: [id, 'other'], versions: [], sourceRevisions: {
      [id]: draftRevision(first.saved), other: draftRevision(other),
    } }
    state.records.set('reportCardDrafts/other', { ...other, formData: { comments: 'Updated' } })
    await expect(saveScopedDraft({}, id, payload('Combined'), scope, draftRevision(first.saved), consolidation)).rejects.toThrow('shared drafts')
    expect(state.records.get(path).formData.comments).toBe('First')
  })

  it('updates a current legacy ID without duplicating it, preserves creation and resets approval', async () => {
    const legacy = { ...payload('Approved'), createdAt: '2026-09-15', status: 'complete', adminReviewStatus: 'approved', publishedToParents: true }
    state.records.set('reportCardDrafts/legacy', legacy)
    await saveScopedDraft({}, 'legacy', payload('Revised', 'teacher-b'), scope, draftRevision(legacy))
    expect(state.records.size).toBe(1)
    expect(state.records.get('reportCardDrafts/legacy')).toMatchObject({ createdAt: legacy.createdAt, adminReviewStatus: 'pending', publishedToParents: false, uid: 'teacher-a' })
  })
})
describe('scoped publication', () => {
  it('atomically tags the published record and approves its own draft', async () => {
    const saved = await saveScopedDraft({}, id, payload('Ready'), scope)
    await publishScopedReport({}, { ...saved.saved, id }, current,
      { type: scope.type, url: 'new.pdf' }, { status: 'complete' }, draftRevision(saved.saved))
    expect(state.records.get(`reportCards/${id}_published`)).toMatchObject({ schoolYear: scope.year, term: 'term1', sourceDraftId: id, studentId: 'S1' })
    expect(state.records.get(path).status).toBe('complete')
  })
  it('cannot reapprove into another year or term’s published record', async () => {
    const saved = await saveScopedDraft({}, id, payload('Ready'), scope)
    for (const period of [{ schoolYear: '2025-2026', term: 'term1' }, { schoolYear: scope.year, term: 'term2' }]) {
      const old = { ...period, studentId: 'S1', type: scope.type, url: 'historical.pdf' }
      state.records.set('reportCards/old', old)
      await expect(publishScopedReport({}, { ...saved.saved, id }, current,
        { type: scope.type, url: 'new.pdf' }, { status: 'complete' }, draftRevision(saved.saved), 'old')).rejects.toThrow('another reporting period')
      expect(state.records.get('reportCards/old')).toEqual(old)
    }
  })
  it('does not mark a draft complete if cloud publication fails', async () => {
    const first = await saveScopedDraft({}, id, payload('Draft'), scope)
    state.fail = true
    await expect(publishScopedReport({}, { ...first.saved, id }, current,
      { type: scope.type, url: 'copy.pdf' }, { status: 'complete' }, draftRevision(first.saved))).rejects.toThrow('network')
    expect(state.records.get(path).status).toBe('draft')
    expect([...state.records.keys()].some((key) => key.startsWith('reportCards/'))).toBe(false)
  })

  it('does not publish a stale review after another teacher edits', async () => {
    const first = await saveScopedDraft({}, id, payload('First'), scope)
    await saveScopedDraft({}, id, payload('New edit'), scope, draftRevision(first.saved))
    await expect(publishScopedReport({}, { ...first.saved, id }, current,
      { type: scope.type, url: 'stale.pdf' }, { status: 'complete' }, draftRevision(first.saved))).rejects.toThrow('edited after')
    expect([...state.records.keys()].some((key) => key.startsWith('reportCards/'))).toBe(false)
  })
})
