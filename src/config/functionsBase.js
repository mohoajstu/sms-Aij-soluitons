import { isDemoMode, emulatorsEnabled } from '../utils/demoMode'

const REGION = 'northamerica-northeast1'
const PRODUCTION_FUNCTIONS_BASE = `https://${REGION}-tarbiyah-sms.cloudfunctions.net`

/**
 * Base URL of the Cloud Functions the app calls directly. Production keeps its
 * fixed host; a demo build uses the demo project's functions (or the emulator)
 * so it can never reach production functions.
 */
export function functionsBase() {
  if (!isDemoMode()) return PRODUCTION_FUNCTIONS_BASE
  const project = import.meta.env.VITE_FIREBASE_PROJECT_ID
  if (emulatorsEnabled()) return `http://127.0.0.1:5001/${project}/${REGION}`
  return `https://${REGION}-${project}.cloudfunctions.net`
}

/**
 * POST to the SMS function. In demo mode nothing is sent: the request is
 * answered locally, so a demo can never text anyone even if a phone number is
 * typed in.
 */
export async function smsFetch(init) {
  if (isDemoMode()) {
    return new Response(JSON.stringify({ success: true, sid: 'demo-not-sent', demo: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return fetch(`${functionsBase()}/sendSmsHttp`, init)
}
