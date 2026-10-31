import { afterEach, describe, expect, it, vi } from 'vitest'
import { functionsBase, smsFetch } from '../functionsBase'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('functionsBase', () => {
  it('keeps the production host outside demo mode', () => {
    expect(functionsBase()).toBe('https://northamerica-northeast1-tarbiyah-sms.cloudfunctions.net')
  })

  it('points a demo build at the demo project, never production', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'tarbiyah-sms-demo')
    expect(functionsBase()).toBe(
      'https://northamerica-northeast1-tarbiyah-sms-demo.cloudfunctions.net',
    )
    vi.stubEnv('VITE_USE_EMULATORS', 'true')
    expect(functionsBase()).toBe('http://127.0.0.1:5001/tarbiyah-sms-demo/northamerica-northeast1')
  })
})

describe('smsFetch', () => {
  it('sends production requests to the SMS function', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    await smsFetch({ method: 'POST' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://northamerica-northeast1-tarbiyah-sms.cloudfunctions.net/sendSmsHttp',
      { method: 'POST' },
    )
  })

  it('answers locally in demo mode and never touches the network', async () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const response = await smsFetch({ method: 'POST', body: '{"phoneNumber":"+16135550100"}' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(response.ok).toBe(true)
    expect(await response.json()).toMatchObject({ success: true, demo: true })
  })
})
