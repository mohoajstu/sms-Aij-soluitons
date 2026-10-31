import { afterEach, describe, expect, it, vi } from 'vitest'
import { assertDemoProject, isDemoMode, emulatorsEnabled } from '../demoMode'

afterEach(() => vi.unstubAllEnvs())

describe('demo mode', () => {
  it('is off unless explicitly enabled, so production builds are unaffected', () => {
    expect(isDemoMode()).toBe(false)
    expect(emulatorsEnabled()).toBe(false)
    vi.stubEnv('VITE_USE_EMULATORS', 'true')
    expect(emulatorsEnabled()).toBe(false) // emulators only apply inside demo mode
  })

  it('does not restrict the project outside demo mode', () => {
    expect(() => assertDemoProject('tarbiyah-sms')).not.toThrow()
  })

  it('refuses to start a demo build against a non-demo project', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    expect(() => assertDemoProject('tarbiyah-sms')).toThrow(/not a demo project/)
    expect(() => assertDemoProject('')).toThrow(/not a demo project/)
    expect(() => assertDemoProject(undefined)).toThrow(/not a demo project/)
    expect(() => assertDemoProject('tarbiyah-sms-demo')).not.toThrow()
  })
})
