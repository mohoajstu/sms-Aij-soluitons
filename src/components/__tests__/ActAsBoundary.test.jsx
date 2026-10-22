// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
vi.mock('../../Firebase/firebase', () => ({ actAsRequested: true }))
vi.mock('../../services/actAs', () => ({ initializeActAs: vi.fn(), endActAs: vi.fn() }))
import { initializeActAs, endActAs } from '../../services/actAs'
import ActAsBoundary from '../ActAsBoundary'
let root, container
beforeEach(() => {
  vi.clearAllMocks()
  endActAs.mockResolvedValue(undefined); vi.useFakeTimers()
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container)
})
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers() })
const mount = () => act(async () => root.render(<ActAsBoundary><div>Private teacher records</div></ActAsBoundary>))
it('mounts no teacher records until authentication succeeds, and unmounts them at expiry', async () => {
  let resolve
  initializeActAs.mockReturnValue(new Promise((done) => { resolve = done }))
  await mount()
  expect(container.textContent).not.toContain('Private teacher records')
  await act(async () => resolve({ expiresAt: Date.now() + 1000 }))
  expect(container.textContent).toContain('Private teacher records')
  await act(async () => vi.advanceTimersByTimeAsync(1000))
  expect(container.textContent).not.toContain('Private teacher records')
  expect(container.textContent).toContain('Your Act as session has ended.')
})
it('a failed resume never exposes data and offers return to admin', async () => {
  initializeActAs.mockRejectedValue(new Error('This session does not belong to you.'))
  await mount()
  expect(container.textContent).not.toContain('Private teacher records')
  expect(container.textContent).toContain('This session does not belong to you.')
  await act(async () => container.querySelector('button').click())
  expect(endActAs).toHaveBeenCalledOnce()
})
