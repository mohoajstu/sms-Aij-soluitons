// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
vi.mock('../../../Firebase/firebase', () => ({ firestore: {} }))
import ClassPrintModal from '../Components/ClassPrintModal'

let root, host
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div'); document.body.append(host)
  URL.createObjectURL = vi.fn(() => 'blob:zip'); URL.revokeObjectURL = vi.fn()
})
afterEach(async () => { if (root) await act(async () => root.unmount()); root = null; host.remove(); document.body.innerHTML = '' })

const reports = [
  { id: '1', studentName: 'Zaid', grade: '7', reportCardType: '7-8-progress', status: 'approved' },
  { id: '2', studentName: 'Amna', grade: '7', reportCardType: '7-8-progress', status: 'approved' },
  { id: '3', studentName: 'Huda', grade: '7', reportCardType: '7-8-progress', status: 'pending' },
]
const onePage = async () => { const d = await PDFDocument.create(); d.addPage(); return d.save() }
const render = async (props) => {
  root = createRoot(host)
  await act(async () => root.render(<ClassPrintModal visible onClose={vi.fn()} reports={reports} {...props} />))
}
const button = (text) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(text))
const waitFor = async (check) => {
  for (let i = 0; i < 100 && !check(); i++) await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
}

it('builds a PDF for each approved report, in name order, and downloads one ZIP', async () => {
  const pdf = await onePage()
  const built = []
  const onClose = vi.fn()
  const clicks = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { clicks.download = this.download })
  await render({ onClose, getPdfBytes: async (report) => { built.push(report.studentName); return pdf } })

  expect(document.querySelector('[data-testid="not-approved"]').textContent).toContain('Huda')
  expect(button('as one PDF')).toBeUndefined()
  expect(button('Print')).toBeUndefined()
  await act(async () => button('Download 2 as ZIP').click())
  await waitFor(() => clicks.mock.calls.length > 0)

  expect(built).toEqual(['Amna', 'Zaid'])
  expect(clicks.download).toBe('Grade-7_7-8-progress_2-students.zip')
  expect(onClose).toHaveBeenCalled()
  clicks.mockRestore()
})

it('shows which student could not be built and downloads nothing', async () => {
  const clicks = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  await render({ getPdfBytes: async () => { throw new Error('template missing') } })
  await act(async () => button('Download 2 as ZIP').click())
  await waitFor(() => document.body.textContent.includes('Could not build'))
  expect(document.body.textContent).toContain('Could not build the PDF for Amna (template missing). Nothing was downloaded.')
  expect(clicks).not.toHaveBeenCalled()
  clicks.mockRestore()
})

it('lists class members who have no report', async () => {
  await render({ studentsWithoutReport: [{ id: 'x', studentName: 'Yusuf' }] })
  expect(document.querySelector('[data-testid="no-report"]').textContent).toContain('Yusuf')
})
