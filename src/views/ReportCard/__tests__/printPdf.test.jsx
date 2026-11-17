// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { printPdfBytes } from '../utils/printPdf'
import PrintPdfButton from '../Components/PrintPdfButton'

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  URL.createObjectURL = vi.fn(() => 'blob:report'); URL.revokeObjectURL = vi.fn()
  vi.useFakeTimers()
})
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = '' })

it('prints the PDF itself from a hidden same-origin frame, not the web page', async () => {
  const windowPrint = vi.spyOn(window, 'print').mockImplementation(() => {})
  const done = printPdfBytes(new Uint8Array([37, 80, 68, 70]))
  const frame = document.querySelector('iframe[title="Report card print"]')
  expect(frame.src).toBe('blob:report')
  expect(frame.style.display).not.toBe('none')
  const framePrint = vi.fn()
  Object.defineProperty(frame, 'contentWindow', { value: { focus: vi.fn(), print: framePrint } })
  frame.onload()
  await vi.advanceTimersByTimeAsync(600)
  await done
  expect(framePrint).toHaveBeenCalledTimes(1)
  expect(windowPrint).not.toHaveBeenCalled()
  expect(URL.createObjectURL.mock.calls[0][0].type).toBe('application/pdf')
})

it('replaces the previous print frame instead of piling them up', async () => {
  printPdfBytes(new Uint8Array([1]))
  printPdfBytes(new Uint8Array([2]))
  expect(document.querySelectorAll('iframe[title="Report card print"]').length).toBe(1)
})

it('Print button prints the stored report and reports failures', async () => {
  vi.useRealTimers()
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host)
  const print = vi.fn(async () => { throw new Error('HTTP 403') })
  const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
  await act(async () => root.render(<PrintPdfButton url="https://storage/report.pdf" print={print} />))
  await act(async () => host.querySelector('button').click())
  expect(print).toHaveBeenCalledWith('https://storage/report.pdf')
  expect(alertSpy).toHaveBeenCalledWith('Could not print this report card: HTTP 403')
  await act(async () => root.render(<PrintPdfButton url={null} />))
  expect(host.querySelector('button').disabled).toBe(true)
  await act(async () => root.unmount())
})

it('opens the PDF in a tab when the browser has no PDF viewer', async () => {
  const open = vi.fn()
  const mode = await printPdfBytes(new Uint8Array([1]), { win: { navigator: { pdfViewerEnabled: false }, open } })
  expect(mode).toBe('opened-tab')
  expect(open).toHaveBeenCalledWith('blob:report', '_blank')
  expect(document.querySelector('iframe[title="Report card print"]')).toBeNull()
})

it('falls back to a tab instead of hanging when the PDF never loads in the frame', async () => {
  const open = vi.fn()
  const done = printPdfBytes(new Uint8Array([1]), { win: { navigator: {}, open } })
  await vi.advanceTimersByTimeAsync(8000)
  expect(await done).toBe('opened-tab')
  expect(open).toHaveBeenCalledTimes(1)
})
