import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('../../Firebase/firebase', () => ({ auth: { currentUser: { getIdToken: vi.fn() } } }))
import { auth } from '../../Firebase/firebase'
import { timesheetRequest } from '../staffTimesheets'
import { readFileSync } from 'node:fs'
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
describe('timesheet request deadline', () => {
  it('routes production requests through Hosting before the app fallback', async () => {
    vi.stubEnv('DEV', false)
    vi.resetModules()
    try {
      const { timesheetRequest: productionRequest } = await import('../staffTimesheets')
      auth.currentUser.getIdToken.mockResolvedValue('token')
      const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ records: [] }) }))
      vi.stubGlobal('fetch', fetchMock)
      await productionRequest('load', { periodIndex: 1 })
      expect(fetchMock.mock.calls[0][0]).toBe('/api/staffTimesheets')
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer token')
      const config = JSON.parse(readFileSync('firebase.json', 'utf8'))
      expect(config.hosting[0].rewrites[0]).toEqual({ source: '/api/staffTimesheets',
        function: { functionId: 'staffTimesheets', region: 'northamerica-northeast1' } })
    } finally { vi.unstubAllEnvs() }
  })
  it('explains a network failure without automatically resubmitting a save', async () => {
    auth.currentUser.getIdToken.mockResolvedValue('token')
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)
    await expect(timesheetRequest('save', {})).rejects.toThrow('Reload the saved version')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it.each(['token', 'fetch', 'body'])('bounds a stalled %s and aborts the connection', async (stage) => {
    vi.useFakeTimers()
    const pending = () => new Promise(() => {})
    auth.currentUser.getIdToken.mockImplementation(stage === 'token' ? pending : async () => 'token')
    const fetchMock = vi.fn(stage === 'fetch' ? pending : async () => ({ ok: true, json: pending }))
    vi.stubGlobal('fetch', fetchMock)
    const request = timesheetRequest('load', { periodIndex: 1 })
    const assertion = expect(request).rejects.toThrow('Check your connection and try again')
    await vi.advanceTimersByTimeAsync(30000)
    await assertion
    if (stage !== 'token') expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('returns successful data and clears the deadline', async () => {
    vi.useFakeTimers()
    auth.currentUser.getIdToken.mockResolvedValue('token')
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ records: [] }) })))
    await expect(timesheetRequest('load', {})).resolves.toEqual({ records: [] })
    expect(vi.getTimerCount()).toBe(0)
  })
})
