/**
 * Demo mode: a build of the app pointed at a dedicated demo Firebase project
 * (or the local emulators) that holds only synthetic data.
 *
 * It is switched on at build time with VITE_DEMO_MODE=true (see demo/README.md)
 * and is always off for the production build.
 */
export const isDemoMode = () => import.meta.env.VITE_DEMO_MODE === 'true'

/** Talk to the local Firebase emulators instead of a cloud project. */
export const emulatorsEnabled = () => isDemoMode() && import.meta.env.VITE_USE_EMULATORS === 'true'

/**
 * A demo build must never be able to read or write real school data. Vite also
 * loads the root `.env` in every mode, so a demo build that is missing its own
 * `.env.demo` would silently inherit the production project. Refuse to start.
 */
export function assertDemoProject(projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID) {
  if (!isDemoMode()) return
  if (!projectId || !/demo/i.test(projectId)) {
    throw new Error(
      `Demo mode refused to start: Firebase project "${projectId || '(none)'}" is not a demo project. ` +
        'Set VITE_FIREBASE_PROJECT_ID in .env.demo to a project whose ID contains "demo".',
    )
  }
}
