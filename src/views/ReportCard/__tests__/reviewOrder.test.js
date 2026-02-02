import { describe, it, expect } from 'vitest'
import { buildReviewOrderPayload } from '../utils/reviewOrder'
import { getNextDraftId } from '../utils/reviewNavigation'

describe('Review order utilities', () => {
  it('builds ids and index from ordered reports', () => {
    const reports = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const payload = buildReviewOrderPayload(reports, 'b')
    expect(payload.ids).toEqual(['a', 'b', 'c'])
    expect(payload.index).toBe(1)
  })

  it('defaults index to 0 when current id is missing', () => {
    const reports = [{ id: 'a' }, { id: 'b' }]
    const payload = buildReviewOrderPayload(reports, 'z')
    expect(payload.index).toBe(0)
  })

  it('navigates next/previous with wraparound', () => {
    const ids = ['a', 'b', 'c']
    expect(getNextDraftId(ids, 'a', 'next')).toBe('b')
    expect(getNextDraftId(ids, 'a', 'previous')).toBe('c')
    expect(getNextDraftId(ids, 'c', 'next')).toBe('a')
  })
})
