import { describe, it, expect } from 'vitest'
import { toggleErsOption } from '../utils/ersToggle'

describe('ERS toggle logic', () => {
  it('enforces single selection for ERS completed', () => {
    const start = { ERSCompletedYes: true, ERSCompletedNo: true, ERSCompletedNA: true }
    const next = toggleErsOption(start, 'ERSCompletedYes', true)
    expect(next.ERSCompletedYes).toBe(true)
    expect(next.ERSCompletedNo).toBe(false)
    expect(next.ERSCompletedNA).toBe(false)
  })

  it('enforces single selection for benchmark', () => {
    const start = { ERSBenchmarkYes: true, ERSBenchmarkNo: true, ERSBenchmarkNA: true }
    const next = toggleErsOption(start, 'ERSBenchmarkNo', true)
    expect(next.ERSBenchmarkYes).toBe(false)
    expect(next.ERSBenchmarkNo).toBe(true)
    expect(next.ERSBenchmarkNA).toBe(false)
  })
})
