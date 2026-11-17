// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import ClassPrintModal from '../Components/ClassPrintModal'

let root, host
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div'); document.body.append(host)
  URL.createObjectURL = vi.fn(() => 'blob:print'); URL.revokeObjectURL = vi.fn()
})
afterEach(async () => { if (root) await act(async () => root.unmount()); root = null; host.remove(); document.body.innerHTML = '' })

const reports = [
  { id: '1', studentName: 'Zaid', grade: '7', reportCardType: '7-8-progress', status: 'approved', finalPdfUrl: 'u/z', pdfRenderVersion: 2 },
  { id: '2', studentName: 'Amna', grade: '7', reportCardType: '7-8-progress', status: 'approved', finalPdfUrl: 'u/a', pdfRenderVersion: 2 },
  { id: '3', studentName: 'Omar', grade: '7', reportCardType: '7-8-progress', status: 'approved', finalPdfUrl: 'u/o' },
  { id: '4', studentName: 'Huda', grade: '7', reportCardType: '7-8-progress', status: 'pending' },
]

const render = async (props) => {
  root = createRoot(host)
  await act(async () => root.render(<ClassPrintModal visible onClose={vi.fn()} reports={reports} onSelectForReapproval={vi.fn()} {...props} />))
}
const button = (text) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(text))

it('zips only the ready reports, in name order, and lists who was left out and why', async () => {
  const onePage = await (async () => { const d = await PDFDocument.create(); d.addPage(); return d.save() })()
  const fetched = []
  const onClose = vi.fn()
  const clicks = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { clicks.download = this.download })
  await render({ onClose, fetchBytes: async (url) => { fetched.push(url); return onePage } })

  expect(document.querySelector('[data-testid="needs-reapproval"]').textContent).toContain('Omar')
  expect(document.querySelector('[data-testid="not-approved"]').textContent).toContain('Huda')
  expect(button('as one PDF')).toBeUndefined()
  expect(button('Print')).toBeUndefined()
  await act(async () => button('Download 2 as ZIP').click())
  for (let i = 0; i < 50 && !clicks.mock.calls.length; i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
  }

  expect(fetched).toEqual(['u/a', 'u/z'])
  expect(clicks).toHaveBeenCalledTimes(1)
  expect(clicks.download).toBe('Grade-7_7-8-progress_2-students.zip')
  expect(onClose).toHaveBeenCalled()
  clicks.mockRestore()
})

it('hands the pre-fix reports to the re-approval selection', async () => {
  const onSelectForReapproval = vi.fn()
  await render({ onSelectForReapproval })
  await act(async () => button('Select these for re-approval').click())
  expect(onSelectForReapproval).toHaveBeenCalledWith(['3'])
})

it('downloads a ZIP named after the class', async () => {
  const onePage = await (async () => { const d = await PDFDocument.create(); d.addPage(); return d.save() })()
  const clicks = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { clicks.download = this.download })
  await render({ fetchBytes: async () => onePage })
  await act(async () => button('Download 2 as ZIP').click())
  for (let i = 0; i < 50 && !clicks.mock.calls.length; i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
  }
  expect(clicks.download).toBe('Grade-7_7-8-progress_2-students.zip')
  clicks.mockRestore()
})

it('lists class members with no report and shows the re-approval hint when it cannot select them', async () => {
  await render({ onSelectForReapproval: undefined, reapprovalHint: 'Go to Admin Review', studentsWithoutReport: [{ id: 'x', studentName: 'Yusuf' }] })
  expect(document.querySelector('[data-testid="no-report"]').textContent).toContain('Yusuf')
  expect(document.querySelector('[data-testid="needs-reapproval"]').textContent).toContain('Go to Admin Review')
  expect(button('Select these for re-approval')).toBeUndefined()
})

