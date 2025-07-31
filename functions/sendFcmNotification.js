const functions = require('firebase-functions')
const admin = require('firebase-admin')

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp()
}

exports.sendFcmNotification = functions.https.onRequest(async (req, res) => {
  console.log('🚀 FCM Function triggered')
  console.log('📨 Request method:', req.method)
  console.log('📋 Request headers:', req.headers)
  
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST')
  res.set('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled')
    res.status(204).send('')
    return
  }

  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method)
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    console.log('📥 Request body:', JSON.stringify(req.body, null, 2))
    
    const { token, notification, data } = req.body

    if (!token) {
      console.log('❌ No FCM token provided')
      res.status(400).json({ error: 'FCM token is required' })
      return
    }

    console.log('🔑 FCM Token (first 50 chars):', token.substring(0, 50) + '...')
    console.log('📢 Notification payload:', notification)
    console.log('📊 Data payload:', data)

    // Create the message
    const message = {
      token: token,
      notification: notification || {
        title: 'New Notification',
        body: 'You have a new notification'
      },
      data: data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'attendance-reminders'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      },
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          requireInteraction: true,
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
      }
    }

    console.log('📨 FCM Message created:', JSON.stringify(message, null, 2))

    // Send the message
    console.log('📤 Sending FCM message...')
    const response = await admin.messaging().send(message)
    
    console.log('✅ FCM message sent successfully')
    console.log('📋 FCM Response:', response)
    
    res.status(200).json({ 
      success: true, 
      message: 'FCM notification sent successfully',
      messageId: response,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('💥 Error sending FCM notification:', error)
    console.error('💥 Error stack:', error.stack)
    
    // Log specific error details
    if (error.code) {
      console.error('🔍 FCM Error code:', error.code)
    }
    if (error.message) {
      console.error('🔍 FCM Error message:', error.message)
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to send FCM notification',
      timestamp: new Date().toISOString()
    })
  }
}) 