import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { messaging } from '../firebase'

// VAPID key - you'll need to get this from Firebase Console
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'YOUR_VAPID_KEY_HERE'

class FCMService {
  constructor() {
    this.messaging = messaging
    this.currentToken = null
    this.onMessageCallback = null
    this.isInitialized = false
  }

  /**
   * Request notification permission and get FCM token
   * @returns {Promise<string|null>} FCM token or null if permission denied
   */
  async requestPermissionAndGetToken() {
    try {
      console.log('Requesting notification permission...')
      
      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.log('This browser does not support notifications')
        return null
      }
      
      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        console.log('This browser does not support service workers')
        return null
      }
      
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        console.log('Notification permission granted.')
        
        // Check if VAPID key is valid
        if (!VAPID_KEY || VAPID_KEY === 'YOUR_VAPID_KEY_HERE') {
          console.error('VAPID key is not configured. Please add VITE_FIREBASE_VAPID_KEY to your environment variables.')
          return null
        }
        
        try {
          // Get the token
          const token = await getToken(this.messaging, { vapidKey: VAPID_KEY })
          
          if (token) {
            console.log('FCM Token:', token)
            this.currentToken = token
            this.isInitialized = true
            return token
          } else {
            console.log('No registration token available.')
            return null
          }
        } catch (tokenError) {
          console.error('Error getting FCM token:', tokenError)
          
          // Check if it's a VAPID key error
          if (tokenError.message.includes('applicationServerKey') || tokenError.message.includes('vapidKey')) {
            console.error('Invalid VAPID key. Please check your VITE_FIREBASE_VAPID_KEY configuration.')
          }
          
          return null
        }
      } else {
        console.log('Notification permission denied.')
        return null
      }
    } catch (error) {
      console.error('Error getting FCM token:', error)
      return null
    }
  }

  /**
   * Get current FCM token
   * @returns {Promise<string|null>} Current FCM token
   */
  async getCurrentToken() {
    if (this.currentToken && this.isInitialized) {
      return this.currentToken
    }
    
    return this.requestPermissionAndGetToken()
  }

  /**
   * Set up message listener for foreground messages
   * @param {Function} callback Function to handle incoming messages
   */
  onMessage(callback) {
    if (!this.isInitialized) {
      console.warn('FCM not initialized. Cannot set up message listener.')
      return
    }
    
    this.onMessageCallback = callback
    
    onMessage(this.messaging, (payload) => {
      console.log('Message received in foreground:', payload)
      
      // Always show a browser notification, even for data-only messages
      this.showNotification(payload)
      
      // Add to bell UI (call your callback)
      if (this.onMessageCallback) {
        this.onMessageCallback(payload)
      }
    })
  }

  /**
   * Show browser notification
   * @param {Object} payload FCM message payload
   */
  showNotification(payload) {
    const { notification, data } = payload
    
    if (Notification.permission === 'granted') {
      const notificationTitle = notification?.title || 'New Notification'
      const notificationOptions = {
        body: notification?.body || 'You have a new notification',
        icon: '/favicon.ico', // You can customize this
        badge: '/favicon.ico',
        tag: 'fcm-notification',
        data: data || {},
        actions: [
          {
            action: 'view',
            title: 'View'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      }

      const browserNotification = new Notification(notificationTitle, notificationOptions)
      
      // Handle notification click
      browserNotification.onclick = (event) => {
        event.preventDefault()
        browserNotification.close()
        
        // Handle different actions
        if (event.action === 'view') {
          // Navigate to specific page based on data
          if (data?.type === 'attendance_reminder') {
            window.location.href = '/attendance'
          }
        }
      }
    }
  }

  /**
   * Save FCM token to user's profile in Firestore
   * @param {string} userId User ID
   * @param {string} token FCM token
   */
  async saveTokenToUser(userId, token) {
    try {
      const { doc, updateDoc, getDoc } = await import('firebase/firestore')
      const { firestore } = await import('../firebase')
      
      const userRef = doc(firestore, 'users', userId)
      const userDoc = await getDoc(userRef)
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const existingTokens = userData.fcmTokens || []
        
        // Add new token if it doesn't already exist
        if (!existingTokens.includes(token)) {
          await updateDoc(userRef, {
            fcmTokens: [...existingTokens, token],
            lastTokenUpdate: new Date()
          })
          console.log('FCM token added to user profile')
        } else {
          console.log('FCM token already exists in user profile')
        }
      } else {
        // Create new user document with token
        await updateDoc(userRef, {
          fcmTokens: [token],
          lastTokenUpdate: new Date()
        })
        console.log('FCM token saved to new user profile')
      }
    } catch (error) {
      console.error('Error saving FCM token:', error)
    }
  }

  /**
   * Remove FCM token from user's profile
   * @param {string} userId User ID
   */
  async removeTokenFromUser(userId) {
    try {
      const { doc, updateDoc } = await import('firebase/firestore')
      const { firestore } = await import('../firebase')
      
      const userRef = doc(firestore, 'users', userId)
      await updateDoc(userRef, {
        fcmToken: null,
        lastTokenUpdate: new Date()
      })
      
      console.log('FCM token removed from user profile')
    } catch (error) {
      console.error('Error removing FCM token:', error)
    }
  }

  /**
   * Check if FCM is properly configured
   * @returns {boolean} True if FCM is configured and ready
   */
  isConfigured() {
    return this.isInitialized && this.currentToken !== null
  }

  /**
   * Get configuration status for debugging
   * @returns {Object} Configuration status
   */
  getConfigStatus() {
    return {
      isInitialized: this.isInitialized,
      hasToken: this.currentToken !== null,
      hasVapidKey: VAPID_KEY && VAPID_KEY !== 'YOUR_VAPID_KEY_HERE',
      vapidKeyConfigured: !!import.meta.env.VITE_FIREBASE_VAPID_KEY,
      notificationSupported: 'Notification' in window,
      serviceWorkerSupported: 'serviceWorker' in navigator
    }
  }

  /**
   * Send FCM notification to teacher
   * @param {Object} data Notification data
   * @param {string} data.teacherId Teacher ID
   * @param {string} data.teacherName Teacher name
   * @param {string} data.courseName Course name
   * @param {string} data.reminderTime Reminder time
   * @returns {Promise<Object>} Result of sending notification
   */
  async sendTeacherAttendanceReminder({ teacherId, teacherName, courseName, reminderTime }) {
    try {
      // Get teacher's FCM token from Firestore
      const { doc, getDoc } = await import('firebase/firestore')
      const { firestore } = await import('../firebase')
      
      // First try to get teacher from faculty collection
      let teacherRef = doc(firestore, 'faculty', teacherId)
      let teacherDoc = await getDoc(teacherRef)
      
      // If not found in faculty, try users collection
      if (!teacherDoc.exists()) {
        teacherRef = doc(firestore, 'users', teacherId)
        teacherDoc = await getDoc(teacherRef)
      }
      
      if (!teacherDoc.exists()) {
        console.log('Teacher not found in faculty or users collection:', teacherId)
        return { success: false, message: 'Teacher not found' }
      }
      
      const teacherData = teacherDoc.data()
      const fcmToken = teacherData.fcmToken
      
      if (!fcmToken) {
        console.log('Teacher has no FCM token:', teacherName)
        return { success: false, message: 'Teacher has no FCM token' }
      }
      
      // Send FCM notification via Firebase Functions
      const response = await fetch('https://northamerica-northeast1-tarbiyah-sms.cloudfunctions.net/sendFcmNotification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: fcmToken,
          notification: {
            title: 'Attendance Reminder',
            body: `Please complete ${courseName} attendance by ${reminderTime}`,
          },
          data: {
            type: 'attendance_reminder',
            courseName,
            teacherName,
            reminderTime,
            timestamp: new Date().toISOString(),
          },
        }),
      })
      
      const result = await response.json()
      
      if (response.ok) {
        console.log('FCM notification sent successfully')
        return { success: true, message: 'Notification sent successfully' }
      } else {
        throw new Error(result.message || 'Failed to send FCM notification')
      }
    } catch (error) {
      console.error('Error sending FCM notification:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * Send FCM notification to admin
   * @param {Object} data Notification data
   * @param {string} data.adminId Admin ID
   * @param {string} data.adminName Admin name
   * @param {string} data.courseName Course name
   * @param {string} data.teacherName Teacher name
   * @param {string} data.reminderTime Reminder time
   * @returns {Promise<Object>} Result of sending notification
   */
  async sendAdminAttendanceReminder({ adminId, adminName, courseName, teacherName, reminderTime }) {
    try {
      // Get admin's FCM token from Firestore
      const { doc, getDoc } = await import('firebase/firestore')
      const { firestore } = await import('../firebase')
      
      // First try to get admin from admins collection
      let adminRef = doc(firestore, 'admins', adminId)
      let adminDoc = await getDoc(adminRef)
      
      // If not found in admins, try users collection
      if (!adminDoc.exists()) {
        adminRef = doc(firestore, 'users', adminId)
        adminDoc = await getDoc(adminRef)
      }
      
      if (!adminDoc.exists()) {
        console.log('Admin not found in admins or users collection:', adminId)
        return { success: false, message: 'Admin not found' }
      }
      
      const adminData = adminDoc.data()
      const fcmToken = adminData.fcmToken
      
      if (!fcmToken) {
        console.log('Admin has no FCM token:', adminName)
        return { success: false, message: 'Admin has no FCM token' }
      }
      
      // Send FCM notification via Firebase Functions
      const response = await fetch('https://northamerica-northeast1-tarbiyah-sms.cloudfunctions.net/sendFcmNotification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: fcmToken,
          notification: {
            title: 'Attendance Alert',
            body: `${courseName} attendance not completed by ${reminderTime}. Teacher: ${teacherName}`,
          },
          data: {
            type: 'attendance_alert',
            courseName,
            teacherName,
            reminderTime,
            timestamp: new Date().toISOString(),
          },
        }),
      })
      
      const result = await response.json()
      
      if (response.ok) {
        console.log('FCM notification sent successfully')
        return { success: true, message: 'Notification sent successfully' }
      } else {
        throw new Error(result.message || 'Failed to send FCM notification')
      }
    } catch (error) {
      console.error('Error sending FCM notification:', error)
      return { success: false, message: error.message }
    }
  }
}

// Create singleton instance
const fcmService = new FCMService()

export default fcmService 