import { describe, it, expect } from 'vitest'
import {
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
    const existing = [
      { savedAt: '2024-01-01T00:00:00Z', formData: { a: 1 } },
    ]
    const draftData = { uid: 'u1', teacherName: 'T', term: 'term1' }
    const nextFormData = { a: 2, b: 1 }
    const versions = appendDraftVersion(existing, draftData, nextFormData, { a: 1 }, 5)
    const latest = versions[versions.length - 1]
    expect(latest.formData).toEqual(nextFormData)
    expect(latest.changedFields).toContain('a')
    expect(latest.changedFields).toContain('b')
  })
})
