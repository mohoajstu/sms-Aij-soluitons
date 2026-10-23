// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
vi.mock('../../Firebase/useAuth', () => ({ default: vi.fn() }))
vi.mock('../../services/actAs', () => ({ actAsRequest: vi.fn(), canActAs: vi.fn(), getActAsSession: vi.fn(), startActAs: vi.fn(), endActAs: vi.fn() }))
import useAuth from '../../Firebase/useAuth'
import { actAsRequest, canActAs, getActAsSession, startActAs, endActAs } from '../../services/actAs'
import ActAsControl from '../ActAsControl'
let root, container
beforeEach(() => {
  vi.clearAllMocks()
  endActAs.mockResolvedValue(undefined)
  startActAs.mockResolvedValue(undefined)
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  useAuth.mockReturnValue({ user: { email: 'nuralhuda.co@gmail.com' } })
  canActAs.mockReturnValue(true)
  getActAsSession.mockReturnValue(null)
  actAsRequest.mockResolvedValue({ teachers: [{ id: 't1', name: 'Ada Teacher', email: 'ada@school.ca' }] })
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container)
})
afterEach(async () => { await act(async () => root.unmount()); container.remove() })
const mount = () => act(async () => root.render(<ActAsControl />))
const click = (button) => act(async () => button.click())
it('hides the selector from unauthorized accounts', async () => {
  canActAs.mockReturnValue(false)
  await mount()
  expect(container.textContent).toBe('')
  expect(actAsRequest).not.toHaveBeenCalled()
})
it('requires a selected teacher and starts the selected real profile', async () => {
  await mount(); await click(container.querySelector('button'))
  const button = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Start acting as teacher')
  expect(button.disabled).toBe(true)
  await act(async () => {
    const select = container.querySelector('select'); select.value = 't1'; select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await click(button)
  expect(startActAs).toHaveBeenCalledWith('t1')
})
it('shows a persistent identity banner and return control during the teacher session', async () => {
  canActAs.mockReturnValue(false)
  getActAsSession.mockReturnValue({ targetName: 'Ada Teacher', targetEmail: 'ada@school.ca' })
  await mount()
  expect(container.textContent).toContain('Acting as Ada Teacher')
  expect(container.textContent).toContain('Changes are saved as this teacher.')
  await click(container.querySelector('button'))
  expect(endActAs).toHaveBeenCalledOnce()
  expect(actAsRequest).not.toHaveBeenCalled()
})
it('reports a failed start and allows another selection', async () => {
  startActAs.mockRejectedValue(new Error('This teacher must sign in once.'))
  await mount(); await click(container.querySelector('button'))
  await act(async () => {
    const select = container.querySelector('select'); select.value = 't1'; select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await click([...container.querySelectorAll('button')].find((b) => b.textContent === 'Start acting as teacher'))
  expect(container.textContent).toContain('This teacher must sign in once.')
  expect(container.querySelector('select').disabled).toBe(false)
})
it('handles the empty directory', async () => {
  actAsRequest.mockResolvedValue({ teachers: [] })
  await mount(); await click(container.querySelector('button'))
  expect(container.textContent).toContain('No active teachers are available.')
})
