// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, describe, it, expect } from 'vitest'
import { useReportTerm } from '../utils/useReportTerm'
let root, container, term
function Harness() { term = useReportTerm(); return <span>{term.selectedTerm}</span> }
beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  root = createRoot(container)
  await act(async () => root.render(<Harness />))
})
afterEach(async () => { await act(async () => root.unmount()); container.remove() })
describe('report term defaults', () => {
  it('starts in Term 1 and tolerates missing or invalid settings', async () => {
    expect(container.textContent).toBe('term1')
    await act(async () => term.applyDefaultTerm('invalid'))
    expect(container.textContent).toBe('term1')
  })
  it('uses the configured Term 2 default', async () => {
    await act(async () => term.applyDefaultTerm('term2'))
    expect(container.textContent).toBe('term2')
  })
  it('does not overwrite an explicit Term 1 selection with a late default', async () => {
    await act(async () => { term.setSelectedTerm('term1'); term.applyDefaultTerm('term2') })
    expect(container.textContent).toBe('term1')
  })
  it('keeps an opened Term 2 draft even when the school default is Term 1', async () => {
    await act(async () => { term.setSelectedTerm('term2'); term.applyDefaultTerm('term1') })
    expect(container.textContent).toBe('term2')
  })
})
