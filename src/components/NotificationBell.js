import React, { useState, useEffect } from 'react'
import { CDropdown, CDropdownToggle, CDropdownMenu, CBadge, CSpinner, CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBell, cilCheck, cilX } from '@coreui/icons'
import fcmService from '../services/fcmService'
import useAuth from '../Firebase/useAuth'
import { toast } from 'react-hot-toast'
import './NotificationBell.css'

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { user, role } = useAuth()

  // Initialize FCM when component mounts
  useEffect(() => {
    if (user && role) {
      initializeFCM()
    }
  }, [user, role])

  // Listen for FCM foreground messages
  useEffect(() => {
    fcmService.onMessage((payload) => {
      // Always add to bell UI
      const notification = {
        id: Date.now().toString(),
        title: payload.notification?.title || payload.data?.title || 'New Notification',
        body: payload.notification?.body || payload.data?.body || 'You have a new notification',
        timestamp: new Date(),
        isRead: false,
        data: payload.data || {}
      }
      setNotifications(prev => [notification, ...prev])
      setUnreadCount(prev => prev + 1)
    })
  }, [])

  // On mount, check if a background message was received and add it to the bell UI
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'fcm-background-message') {
          const payload = event.data.payload
          const notification = {
            id: Date.now().toString(),
            title: payload.notification?.title || payload.data?.title || 'New Notification',
            body: payload.notification?.body || payload.data?.body || 'You have a new notification',
            timestamp: new Date(),
            isRead: false,
            data: payload.data || {}
          }
          setNotifications(prev => [notification, ...prev])
          setUnreadCount(prev => prev + 1)
        }
      })
    }
  }, [])

  const initializeFCM = async () => {
    try {
      // Request permission and get token
      const token = await fcmService.requestPermissionAndGetToken()
      
      if (token) {
        // Save token to user profile
        await fcmService.saveTokenToUser(user.uid, token)
        
        console.log('FCM initialized successfully')
      } else {
        console.log('FCM token not available')
        
        // Log configuration status for debugging
        const configStatus = fcmService.getConfigStatus()
        console.log('FCM Configuration Status:', configStatus)
        
        // Show helpful error message if VAPID key is missing
        if (!configStatus.hasVapidKey) {
          console.warn('FCM not configured: Missing VAPID key. Please add VITE_FIREBASE_VAPID_KEY to your environment variables.')
        }
      }
    } catch (error) {
      console.error('Error initializing FCM:', error)
      
      // Log configuration status for debugging
      const configStatus = fcmService.getConfigStatus()
      console.log('FCM Configuration Status:', configStatus)
    }
  }

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, isRead: true }
          : notif
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const deleteNotification = (notificationId) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'attendance_reminder':
        return <CIcon icon={cilBell} className="text-warning" />
      default:
        return <CIcon icon={cilBell} className="text-primary" />
    }
  }

  if (!user || !role) {
    return null
  }

  return (
    <CDropdown
      visible={isOpen}
    >
      <CDropdownToggle className="position-relative" onClick={() => setIsOpen(!isOpen)}>
        <CIcon icon={cilBell} size="lg" />
        {unreadCount > 0 && (
          <CBadge 
            color="danger" 
            className="position-absolute top-0 start-100 translate-middle rounded-pill"
            style={{ fontSize: '0.75rem', minWidth: '18px', height: '18px' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </CBadge>
        )}
      </CDropdownToggle>
      
      <CDropdownMenu className="notification-dropdown">
        <div className="notification-header">
          <h6 className="mb-0">Notifications</h6>
          {unreadCount > 0 && (
            <CButton
              size="sm"
              color="link"
              onClick={() => {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
                setUnreadCount(0)
              }}
            >
              Mark all as read
            </CButton>
          )}
        </div>
        
        <div className="notification-list">
          {loading ? (
            <div className="text-center p-3">
              <CSpinner size="sm" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center text-muted p-3">
              <CIcon icon={cilBell} size="lg" className="mb-2" />
              <p className="mb-0">No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
              >
                <div className="notification-content">
                  <div className="d-flex align-items-start">
                    {getNotificationIcon(notification.data?.type)}
                    <div className="flex-grow-1 ms-2">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-body">{notification.body}</div>
                      <div className="notification-time">{formatTime(notification.timestamp)}</div>
                    </div>
                  </div>
                </div>
                
                <div className="notification-actions">
                  {!notification.isRead && (
                    <CButton
                      size="sm"
                      color="link"
                      onClick={() => markAsRead(notification.id)}
                      title="Mark as read"
                    >
                      <CIcon icon={cilCheck} size="sm" />
                    </CButton>
                  )}
                  <CButton
                    size="sm"
                    color="link"
                    onClick={() => deleteNotification(notification.id)}
                    title="Delete"
                  >
                    <CIcon icon={cilX} size="sm" />
                  </CButton>
                </div>
              </div>
            ))
          )}
        </div>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default NotificationBell 