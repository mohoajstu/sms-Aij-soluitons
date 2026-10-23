// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('../../../services/registrationEnrollment', () => ({ registrationEnrollment: vi.fn() }))
import { registrationEnrollment } from '../../../services/registrationEnrollment'
import EnrollmentModal from '../EnrollmentModal'
let root, container, onEnrolled
const application = { id: 'TLR-test', status: 'pending' }
const preview = { name: 'Test Student', grade: 'Grade 1', homerooms: [{ id: '1a', title: 'Homeroom Grade 1 A' }, { id: '1b', title: 'Homeroom Grade 1 B' }], candidates: [] }
beforeEach(() => {
  vi.clearAllMocks(); globalThis.IS_REACT_ACT_ENVIRONMENT = true
  registrationEnrollment.mockResolvedValue(preview)
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); onEnrolled = vi.fn()
})
afterEach(async () => { await act(async () => root.unmount()); container.remove() })
async function mount(app = application) { await act(async () => root.render(<EnrollmentModal application={app} onClose={vi.fn()} onEnrolled={onEnrolled} />)) }
const button = () => [...document.querySelectorAll('button')].find((b) => /^(Approve and enroll|Complete enrollment)$/.test(b.textContent))
async function select(id, value) { await act(async () => { const el = document.getElementById(id); el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })) }) }
it('requires a homeroom and reports confirmed enrollment only after server success', async () => {
  await mount()
  expect(button().disabled).toBe(true)
  await select('enrollment-course', '1b')
  const saved = { status: 'approved', enrollment: { studentId: 'TLS100001', courseId: '1b', courseTitle: 'Homeroom Grade 1 B' } }
  registrationEnrollment.mockResolvedValueOnce(saved)
  await act(async () => button().click())
  expect(registrationEnrollment).toHaveBeenLastCalledWith('enroll', { applicationId: 'TLR-test', courseId: '1b', selectedStudentId: undefined })
  expect(onEnrolled).toHaveBeenCalledWith('TLR-test', saved)
  expect(document.body.textContent).toContain('TLS100001')
})
it('approved applications can repair enrollment and failed requests remain retryable', async () => {
  await mount({ ...application, status: 'approved' })
  await select('enrollment-course', '1a')
  registrationEnrollment.mockRejectedValueOnce(new Error('Save failed. Retry.'))
  await act(async () => button().click())
  expect(document.body.textContent).toContain('Save failed. Retry.')
  expect(onEnrolled).not.toHaveBeenCalled()
  expect(button().disabled).toBe(false)
  expect(document.getElementById('enrollment-course').value).toBe('1a')
})
it('requires explicit selection for existing student matches', async () => {
  registrationEnrollment.mockResolvedValue({ ...preview, homerooms: [preview.homerooms[0]], candidates: [{ id: 'existing', name: 'Test Student', dob: '2014-01-02', active: true }] })
  await mount()
  expect(button().disabled).toBe(true)
  await select('enrollment-student', 'existing')
  expect(button().disabled).toBe(false)
})
