// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
vi.mock('../../../firebase', () => ({ firestore: {} }))
vi.mock('../../../Firebase/firebase', () => ({ firestore: {} }))
vi.mock('firebase/firestore', () => ({ collection: (_db, name) => name, getDocs: vi.fn(),
  doc: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn(), serverTimestamp: vi.fn() }))
vi.mock('../../../services/timekeepingSettings', async (original) => ({ ...(await original()),
  getTimekeepingSettings: vi.fn(), saveStaffOverrides: vi.fn(), updateTimekeepingSettings: vi.fn() }))
import { getDocs } from 'firebase/firestore'
import { getTimekeepingSettings, saveStaffOverrides } from '../../../services/timekeepingSettings'
import TimekeepingSettings from '../TimekeepingSettings'
let root, container
const email = 'teacher@example.com'
const overrides = { [email]: { expectedCheckInTime: '08:10', expectedCheckOutTime: '15:40', days: { fri: { expectedCheckOutTime: '12:00' } } } }
beforeEach(() => {
  vi.clearAllMocks(); globalThis.IS_REACT_ACT_ENVIRONMENT = true
  getTimekeepingSettings.mockResolvedValue({ expectedCheckInTime: '08:20', expectedCheckOutTime: '15:20', graceMinutes: 5, staffOverrides: overrides })
  getDocs.mockImplementation(async (name) => ({ docs: name === 'faculty' ? [
    { id: 't1', data: () => ({ personalInfo: { firstName: 'Teacher' }, contact: { email } }) },
    { id: 't2', data: () => ({ personalInfo: { firstName: 'Default' }, contact: { email: 'default@example.com' } }) },
  ] : [] }))
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container)
})
afterEach(async () => { await act(async () => root.unmount()); container.remove() })
it('shows editable saved hours for contact.email records and school hours for staff without overrides', async () => {
  await act(async () => root.render(<TimekeepingSettings />))
  const rows = [...container.querySelectorAll('tr')]
  const teacher = rows.find((row) => row.textContent.includes('Teacher'))
  const defaults = rows.find((row) => row.textContent.includes('Default'))
  expect([...teacher.querySelectorAll('input[type=time]')].map((el) => el.value)).toEqual(['08:10', '15:40'])
  expect(teacher.querySelector('input').disabled).toBe(false)
  expect([...defaults.querySelectorAll('input[type=time]')].map((el) => el.value)).toEqual(['08:20', '15:20'])
  await act(async () => [...container.querySelectorAll('button')].find((el) => el.textContent === 'Save Staff Schedules').click())
  expect(saveStaffOverrides).toHaveBeenCalledWith(overrides)
})
