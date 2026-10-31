import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth, initializeAuth, inMemoryPersistence, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { assertDemoProject, emulatorsEnabled } from '../utils/demoMode'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
// Demo builds must only ever run against a demo project (no-op in production).
assertDemoProject(firebaseConfig.projectId)
const adminApp = initializeApp(firebaseConfig)
const adminAuth = getAuth(adminApp)
// The default app retains the administrator's login. All school data clients
// switch together to the named app; teacher credentials stay in memory.
const actAsRequested = typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem('sms.actAsSession')
const app = actAsRequested ? initializeApp(firebaseConfig, 'act-as') : adminApp
// Demo/emulator sessions do not report analytics.
const analytics = emulatorsEnabled() ? null : getAnalytics(adminApp)
const auth = actAsRequested ? initializeAuth(app, { persistence: inMemoryPersistence }) : adminAuth
const firestore = getFirestore(app)
const storage = getStorage(app)

if (emulatorsEnabled()) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}

export { app, analytics, auth, firestore, storage, adminAuth, actAsRequested }
