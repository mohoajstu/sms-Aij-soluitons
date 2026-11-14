// Who may use the signed-in portal at all.
//
// This is an ALLOWLIST on purpose. Nav items and routes only say who to hide
// them from (`hideFor`), so a role nobody listed -- including `guest`, which is
// what a signed-in person with no profile (or a failed profile lookup) resolves
// to -- used to see everything. Anything not named here gets no portal.
export const PORTAL_ROLES = ['admin', 'faculty', 'teacher', 'staff', 'parent', 'student']

export const canUsePortal = (role) => PORTAL_ROLES.includes(String(role || '').trim().toLowerCase())
