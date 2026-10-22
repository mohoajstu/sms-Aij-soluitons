import { expect, it, vi } from 'vitest'
vi.mock('../../Firebase/firebase', () => ({ adminAuth: {}, auth: {}, actAsRequested: false }))
import { canActAs } from '../actAs'

it('shows Act as only for the verified nuralhuda.co@gmail.com account', () => {
  expect(canActAs({ email: 'nuralhuda.co@gmail.com', emailVerified: true })).toBe(true)
  for (const user of [
    null,
    { email: 'nuralhuda.co@gmail.com', emailVerified: false },
    { email: 'other@gmail.com', emailVerified: true, role: 'admin' },
    { email: 'mohoabja@gmail.com', emailVerified: true, admin: true },
    { email: 'nuralhuda.co+alias@gmail.com', emailVerified: true },
    { email: 'nuralhuda.co@example.com', emailVerified: true },
    { email: 'nuralhuda.co@gmail.com.example.com', emailVerified: true },
  ]) expect(canActAs(user)).toBe(false)
})
