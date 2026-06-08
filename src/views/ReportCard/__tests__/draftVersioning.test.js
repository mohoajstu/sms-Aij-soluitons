import { describe, it, expect } from 'vitest'
import {
  appendDraftBaselineVersion,
  buildDraftHistoryEntries,
  consolidateDraftVersionHistories,
  diffFormData,
  normalizeVersions,
  getLatestFormData,
  appendDraftVersion,
} from '../utils/draftVersioning'

describe('draftVersioning', () => {
  it('diffFormData returns changed keys', () => {
    const prev = { a: 1, b: 2, c: { x: 1 } }
    const next = { a: 1, b: 3, c: { x: 2 } }
    const diff = diffFormData(prev, next)
    expect(diff).toContain('b')
    expect(diff).toContain('c')
    expect(diff).not.toContain('a')
  })

  it('normalizeVersions keeps last N', () => {
    const versions = [
      { savedAt: '2024-01-01T00:00:00Z' },
      { savedAt: '2024-01-02T00:00:00Z' },
      { savedAt: '2024-01-03T00:00:00Z' },
    ]
    const normalized = normalizeVersions(versions, 2)
    expect(normalized.length).toBe(2)
    expect(normalized[0].savedAt).toBe('2024-01-02T00:00:00Z')
    expect(normalized[1].savedAt).toBe('2024-01-03T00:00:00Z')
  })

  it('getLatestFormData prefers latest version', () => {
    const draft = {
      formData: { a: 1 },
      versions: [
        { savedAt: '2024-01-01T00:00:00Z', formData: { a: 2 } },
        { savedAt: '2024-01-02T00:00:00Z', formData: { a: 3 } },
      ],
    }
    expect(getLatestFormData(draft)).toEqual({ a: 3 })
  })

  it('appendDraftVersion adds version and records changed fields', () => {
    const existing = [{ savedAt: '2024-01-01T00:00:00Z', formData: { a: 1 } }]
    const draftData = { uid: 'u1', teacherName: 'T', term: 'term1' }
    const nextFormData = { a: 2, b: 1 }
    const versions = appendDraftVersion(existing, draftData, nextFormData, { a: 1 }, 5)
    const latest = versions[versions.length - 1]
    expect(latest.formData).toEqual(nextFormData)
    expect(latest.changedFields).toContain('a')
    expect(latest.changedFields).toContain('b')
  })

  it('appendDraftBaselineVersion marks every field as the new starting point', () => {
    const draftData = { uid: 'u1', teacherName: 'T', term: 'term2' }
    const nextFormData = { a: 2, b: 1 }
    const versions = appendDraftBaselineVersion([], draftData, nextFormData, 5)
    const latest = versions[versions.length - 1]

    expect(latest.formData).toEqual(nextFormData)
    expect(latest.changedFields).toEqual(['a', 'b'])
    expect(latest.consolidatedBaseline).toBe(true)
  })

  it('buildDraftHistoryEntries uses legacy formData when versions are missing', () => {
    const entries = buildDraftHistoryEntries({
      id: 'draft-a',
      data: {
        uid: 'u1',
        teacherName: 'Teacher A',
        term: 'term2',
        lastModified: '2024-01-02T00:00:00Z',
        formData: { a: 1 },
      },
    })

    expect(entries).toHaveLength(1)
    expect(entries[0].draftId).toBe('draft-a')
    expect(entries[0].changedFields).toEqual(['a'])
    expect(entries[0].formData).toEqual({ a: 1 })
  })

  it('consolidateDraftVersionHistories picks the latest value per field across fragmented drafts', () => {
    const result = consolidateDraftVersionHistories([
      {
        id: 'teacher-a',
        data: {
          versions: [
            {
              savedAt: '2024-01-01T00:00:00Z',
              formData: { math: 'B', language: 'A' },
              changedFields: ['math', 'language'],
            },
            {
              savedAt: '2024-01-03T00:00:00Z',
              formData: { math: 'A-', language: 'A' },
              changedFields: ['math'],
            },
          ],
          formData: { math: 'A-', language: 'A' },
        },
      },
      {
        id: 'teacher-b',
        data: {
          versions: [
            {
              savedAt: '2024-01-02T00:00:00Z',
              formData: { math: 'B', language: 'B+' },
              changedFields: ['language'],
            },
          ],
          formData: { math: 'B', language: 'B+' },
        },
      },
    ])

    expect(result.formData).toEqual({ math: 'A-', language: 'B+' })
    expect(result.sourceDraftIds).toEqual(['teacher-a', 'teacher-b'])
    expect(result.versions.map((version) => version.draftId)).toEqual([
      'teacher-a',
      'teacher-b',
      'teacher-a',
    ])
  })
})
