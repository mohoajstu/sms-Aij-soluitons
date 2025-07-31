// Script to help get Firebase configuration values
// Run this script to get the correct values for your firebase-messaging-sw.js

const fs = require('fs')
const path = require('path')

// Read the main firebase.js file to get the config
const firebasePath = path.join(__dirname, '../src/firebase.js')
const firebaseContent = fs.readFileSync(firebasePath, 'utf8')

// Extract the config object
const configMatch = firebaseContent.match(/const firebaseConfig = ({[\s\S]*?})/)
if (configMatch) {
  console.log('Firebase Configuration found:')
  console.log(configMatch[1])
  console.log('\n')
  
  // Parse the config to get actual values
  const configStr = configMatch[1].replace(/import\.meta\.env\./g, 'process.env.')
  const config = eval(`(${configStr})`)
  
  console.log('For your firebase-messaging-sw.js, use these values:')
  console.log('const firebaseConfig = {')
  console.log(`  apiKey: "${config.apiKey}",`)
  console.log(`  authDomain: "${config.authDomain}",`)
  console.log(`  projectId: "${config.projectId}",`)
  console.log(`  storageBucket: "${config.storageBucket}",`)
  console.log(`  messagingSenderId: "${config.messagingSenderId}",`)
  console.log(`  appId: "${config.appId}"`)
  console.log('}')
  
  console.log('\n')
  console.log('To get your VAPID key:')
  console.log('1. Go to Firebase Console → Project Settings → Cloud Messaging')
  console.log('2. Scroll down to "Web configuration" section')
  console.log('3. Click "Generate Key Pair" if you don\'t have one')
  console.log('4. Copy the generated key')
  console.log('5. Add it to your .env file as: VITE_FIREBASE_VAPID_KEY=your_key_here')
} else {
  console.log('Could not find Firebase configuration in firebase.js')
} 