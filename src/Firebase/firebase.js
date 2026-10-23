import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth, initializeAuth, inMemoryPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
const adminApp = initializeApp(firebaseConfig)
const adminAuth = getAuth(adminApp)
// The default app retains the administrator's login. All school data clients
// switch together to the named app; teacher credentials stay in memory.
const actAsRequested = typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem('sms.actAsSession')
const app = actAsRequested ? initializeApp(firebaseConfig, 'act-as') : adminApp
const analytics = getAnalytics(adminApp)
const auth = actAsRequested ? initializeAuth(app, { persistence: inMemoryPersistence }) : adminAuth
const firestore = getFirestore(app)
const storage = getStorage(app)

export { app, analytics, auth, firestore, storage, adminAuth, actAsRequested }
