// Helper script to get your Firebase config values
// Run this in your React app's browser console to get the values

console.log('🔧 Copy these values to your fix-faculty-users.js script:')

// Get Firebase config from your app
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

console.log('Firebase Config:')
console.log(JSON.stringify(firebaseConfig, null, 2))

console.log('\n📝 Instructions:')
console.log('1. Copy the values above')
console.log('2. Replace the placeholder values in fix-faculty-users.js')
console.log('3. Run: node fix-faculty-users.js')
