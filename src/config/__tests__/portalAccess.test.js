import { describe, it, expect } from 'vitest'
import { canUsePortal } from '../portalAccess'

describe('canUsePortal', () => {
  it.each(['admin', 'Faculty', 'teacher', 'staff', 'parent', 'student'])('allows %s', (r) =>
    expect(canUsePortal(r)).toBe(true))
  // `guest` is what a signed-in person with no profile (or a failed lookup) resolves to.
  it.each(['guest', '', null, undefined, 'anything', 'visitor'])('denies %s', (r) =>
    expect(canUsePortal(r)).toBe(false))
})
