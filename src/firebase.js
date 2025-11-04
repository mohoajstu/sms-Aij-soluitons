import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'
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

// Check IndexedDB availability
function isIndexedDBAvailable() {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch (e) {
    return false
  }
}

// Initialize Firebase app with error handling
let app
try {
  app = initializeApp(firebaseConfig)
} catch (error) {
  console.error('Firebase initialization error:', error)
  throw error
}

// Initialize Analytics only if supported (checks for IndexedDB availability)
let analytics = null
if (isIndexedDBAvailable()) {
  isSupported()
    .then((supported) => {
      if (supported) {
        try {
          analytics = getAnalytics(app)
        } catch (error) {
          console.warn('Firebase Analytics: Error initializing:', error)
        }
      } else {
        console.log('Firebase Analytics: IndexedDB not available, skipping initialization')
      }
    })
    .catch((error) => {
      console.warn('Firebase Analytics: Error checking support:', error)
    })
} else {
  console.log('Firebase Analytics: IndexedDB not available, skipping initialization')
}

// Initialize other Firebase services with error handling
let auth, firestore, storage
try {
  auth = getAuth(app)
  firestore = getFirestore(app)
  storage = getStorage(app)
} catch (error) {
  console.error('Firebase services initialization error:', error)
  throw error
}

// Note: Remote Config error handling is done in index.js to catch errors early

export { app, analytics, auth, firestore, storage }
