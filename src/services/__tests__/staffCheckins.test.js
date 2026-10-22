import { describe, it, expect, vi } from 'vitest'

vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  where: vi.fn(),
}))
vi.mock('../../Firebase/firebase', () => ({ firestore: {} }))

import { canUseStaffCheckIn } from '../staffCheckins'

describe('canUseStaffCheckIn', () => {
  it('allows every staff role, including the "staff" role StaffLogin assigns', () => {
    ;['admin', 'faculty', 'teacher', 'staff'].forEach((role) => {
      expect(canUseStaffCheckIn(role)).toBe(true)
    })
  })

  it('ignores case and stray whitespace in stored roles', () => {
    expect(canUseStaffCheckIn('Staff')).toBe(true)
    expect(canUseStaffCheckIn('Faculty ')).toBe(true)
    expect(canUseStaffCheckIn('ADMIN')).toBe(true)
  })

  it('keeps parents, students, guests and unknown roles out', () => {
    ;['parent', 'student', 'guest', '', null, undefined].forEach((role) => {
      expect(canUseStaffCheckIn(role)).toBe(false)
    })
  })
})
