// Firebase messaging service worker
// This file must be in the root of your domain (public folder)

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js')

// Firebase configuration - these should match your main app config
const firebaseConfig = {
  apiKey: "AIzaSyDs0-gR5PrwDPRpyE6ZE0ua9sALYICwvcI",
  authDomain: "tarbiyah-sms.firebaseapp.com",
  projectId: "tarbiyah-sms",
  storageBucket: "tarbiyah-sms.appspot.com",
  messagingSenderId: "329966751488",
  appId: "1:329966751488:web:e4d4fd53397e7c21ccede5"
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig)

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('📱 Background message received:', payload)
  console.log('📋 Payload structure:', {
    hasNotification: !!payload.notification,
    hasData: !!payload.data,
    notificationKeys: payload.notification ? Object.keys(payload.notification) : [],
    dataKeys: payload.data ? Object.keys(payload.data) : []
  })
  
  // Try to use notification payload, fallback to data
  const notification = payload.notification || {}
  const data = payload.data || {}

  const notificationTitle = notification.title || data.title || 'New Notification'
  const notificationOptions = {
    body: notification.body || data.body || 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'fcm-notification',
    data: data,
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  }

  console.log('📢 Creating browser notification:', {
    title: notificationTitle,
    options: notificationOptions
  })

  // Post message to all clients so React app can update bell UI
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
    console.log('📤 Posting message to', clients.length, 'clients')
    clients.forEach(function(client) {
      console.log('📤 Posting to client:', client.id)
      client.postMessage({ type: 'fcm-background-message', payload })
    })
  })
  
  console.log('📢 Showing browser notification...')
  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'view') {
    // Navigate to specific page based on data
    const data = event.notification.data
    if (data?.type === 'attendance_reminder') {
      event.waitUntil(
        clients.openWindow('/attendance')
      )
    } else {
      event.waitUntil(
        clients.openWindow('/')
      )
    }
  }
}) 