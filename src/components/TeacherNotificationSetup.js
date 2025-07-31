import React, { useState, useEffect } from 'react'
import { CCard, CCardHeader, CCardBody, CButton, CAlert, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBell, cilCheck, cilX } from '@coreui/icons'
import fcmService from '../services/fcmService'
import useAuth from '../Firebase/useAuth'
import { toast } from 'react-hot-toast'
import { collection, getDocs, updateDoc } from 'firebase/firestore'
import { firestore } from '../firebase'

const TeacherNotificationSetup = () => {
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [configStatus, setConfigStatus] = useState({})
  const [teacherTokens, setTeacherTokens] = useState([])
  const { user } = useAuth()

  useEffect(() => {
    checkNotificationStatus()
    loadTeacherTokens()
  }, [user])

  const loadTeacherTokens = async () => {
    if (!user) return
    
    try {
      const { collection, getDocs } = await import('firebase/firestore')
      const { firestore } = await import('../firebase')
      
      const facultyRef = collection(firestore, 'faculty')
      const facultySnapshot = await getDocs(facultyRef)
      
      for (const doc of facultySnapshot.docs) {
        const facultyData = doc.data()
        const facultyName = `${facultyData.personalInfo?.firstName || ''} ${facultyData.personalInfo?.lastName || ''}`.trim()
        const userDisplayName = user.displayName || `${user.email?.split('@')[0] || 'Unknown'}`
        
        if (facultyName.toLowerCase() === userDisplayName.toLowerCase() || 
            facultyData.email === user.email) {
          setTeacherTokens(facultyData.fcmTokens || [])
          break
        }
      }
    } catch (error) {
      console.error('Error loading teacher tokens:', error)
    }
  }

  const removeToken = async (tokenToRemove) => {
    try {
      const { collection, getDocs, updateDoc } = await import('firebase/firestore')
      const { firestore } = await import('../firebase')
      
      const facultyRef = collection(firestore, 'faculty')
      const facultySnapshot = await getDocs(facultyRef)
      
      for (const doc of facultySnapshot.docs) {
        const facultyData = doc.data()
        const facultyName = `${facultyData.personalInfo?.firstName || ''} ${facultyData.personalInfo?.lastName || ''}`.trim()
        const userDisplayName = user.displayName || `${user.email?.split('@')[0] || 'Unknown'}`
        
        if (facultyName.toLowerCase() === userDisplayName.toLowerCase() || 
            facultyData.email === user.email) {
          const updatedTokens = (facultyData.fcmTokens || []).filter(token => token !== tokenToRemove)
          await updateDoc(doc.ref, {
            fcmTokens: updatedTokens,
            lastTokenUpdate: new Date()
          })
          setTeacherTokens(updatedTokens)
          toast.success('Device removed successfully')
          break
        }
      }
    } catch (error) {
      console.error('Error removing token:', error)
      toast.error('Error removing device')
    }
  }

  const checkNotificationStatus = () => {
    const status = fcmService.getConfigStatus()
    setConfigStatus(status)
    setIsConfigured(status.isInitialized && status.hasToken)
  }

  const setupNotifications = async () => {
    if (!user) {
      toast.error('Please log in to set up notifications')
      return
    }

    setIsSettingUp(true)
    try {
      const token = await fcmService.requestPermissionAndGetToken()
      
      if (token) {
        // Save token to user's profile in faculty collection
        
        // First, find the teacher's faculty document
        const facultyRef = collection(firestore, 'faculty')
        const facultySnapshot = await getDocs(facultyRef)
        
        let teacherDoc = null
        for (const doc of facultySnapshot.docs) {
          const facultyData = doc.data()
          const facultyName = `${facultyData.personalInfo?.firstName || ''} ${facultyData.personalInfo?.lastName || ''}`.trim()
          const userDisplayName = user.displayName || `${user.email?.split('@')[0] || 'Unknown'}`
          
          if (facultyName.toLowerCase() === userDisplayName.toLowerCase() || 
              facultyData.email === user.email) {
            teacherDoc = doc
            break
          }
        }
        
        if (teacherDoc) {
          const teacherData = teacherDoc.data()
          const existingTokens = teacherData.fcmTokens || []
          
          // Add new token if it doesn't already exist
          if (!existingTokens.includes(token)) {
            await updateDoc(teacherDoc.ref, {
              fcmTokens: [...existingTokens, token],
              lastTokenUpdate: new Date()
            })
            toast.success('Notifications set up successfully!')
          } else {
            toast.success('This device is already registered for notifications.')
          }
        } else {
          // If teacher not found in faculty, save to users collection as fallback
          await fcmService.saveTokenToUser(user.uid, token)
          toast.success('Notifications set up successfully!')
        }
        
        checkNotificationStatus()
      } else {
        toast.error('Failed to set up notifications. Please check your browser settings.')
      }
    } catch (error) {
      console.error('Error setting up notifications:', error)
      toast.error('Error setting up notifications')
    } finally {
      setIsSettingUp(false)
    }
  }

  const testNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification to verify your setup',
        icon: '/favicon.ico'
      })
      toast.success('Test notification sent!')
    } else {
      toast.error('Notification permission not granted')
    }
  }

  if (!user) {
    return (
      <CCard>
        <CCardHeader>
          <h5>Teacher Notification Setup</h5>
        </CCardHeader>
        <CCardBody>
          <CAlert color="info">
            Please log in to set up notifications for attendance reminders.
          </CAlert>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <CCard>
      <CCardHeader>
        <h5>
          <CIcon icon={cilBell} className="me-2" />
          Teacher Notification Setup
        </h5>
      </CCardHeader>
      <CCardBody>
        <div className="mb-3">
          <strong>Status:</strong> {isConfigured ? 'Configured' : 'Not Configured'}
        </div>

        <div className="mb-3">
          <strong>Configuration Details:</strong>
          <pre style={{ fontSize: '12px', background: '#f8f9fa', padding: '10px' }}>
            {JSON.stringify(configStatus, null, 2)}
          </pre>
        </div>

        {!isConfigured ? (
          <div className="mb-3">
            <CButton
              color="primary"
              onClick={setupNotifications}
              disabled={isSettingUp}
            >
              {isSettingUp ? <CSpinner size="sm" /> : <CIcon icon={cilBell} />}
              {isSettingUp ? ' Setting up...' : ' Set Up Notifications'}
            </CButton>
            <small className="d-block text-muted mt-2">
              This will request permission to send you notifications and set up your device to receive attendance reminders.
            </small>
          </div>
        ) : (
          <div className="mb-3">
            <CButton
              color="success"
              onClick={testNotification}
            >
              <CIcon icon={cilCheck} />
              Test Notification
            </CButton>
            <small className="d-block text-muted mt-2">
              Your device is configured to receive notifications. Click to test.
            </small>
          </div>
        )}

        {/* Display registered devices */}
        {teacherTokens.length > 0 && (
          <div className="mb-3">
            <h6>Registered Devices ({teacherTokens.length})</h6>
            <div className="list-group">
              {teacherTokens.map((token, index) => (
                <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Device {index + 1}</strong>
                    <br />
                    <small className="text-muted">{token.substring(0, 50)}...</small>
                  </div>
                  <CButton
                    size="sm"
                    color="danger"
                    onClick={() => removeToken(token)}
                  >
                    <CIcon icon={cilX} />
                    Remove
                  </CButton>
                </div>
              ))}
            </div>
            <small className="text-muted">
              Each device you use to access the app will be registered separately for notifications.
            </small>
          </div>
        )}

        {!configStatus.notificationSupported && (
          <CAlert color="danger">
            <strong>Error:</strong> This browser does not support notifications.
          </CAlert>
        )}

        {!configStatus.serviceWorkerSupported && (
          <CAlert color="danger">
            <strong>Error:</strong> This browser does not support service workers.
          </CAlert>
        )}

        {!configStatus.hasVapidKey && (
          <CAlert color="warning">
            <strong>Warning:</strong> VAPID key is not configured. Contact your administrator.
          </CAlert>
        )}
      </CCardBody>
    </CCard>
  )
}

export default TeacherNotificationSetup 