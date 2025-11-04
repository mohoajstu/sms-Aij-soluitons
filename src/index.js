// Handle unhandled promise rejections from Firebase Remote Config EARLY
// This must run before Firebase is imported/initialized
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason
    const errorMessage = error?.message || error?.toString() || ''
    const errorCode = error?.code || ''
    
    // Check if this is a Remote Config IndexedDB error
    if (
      (errorCode && errorCode.includes('remoteconfig/storage-open')) ||
      (errorMessage && 
       errorMessage.includes('Remote Config') && 
       (errorMessage.includes('IndexedDB') || errorMessage.includes('indexedDB')) &&
       errorMessage.includes('storage-open'))
    ) {
      // Suppress Remote Config IndexedDB errors
      console.debug('Firebase Remote Config: IndexedDB not available, skipping initialization')
      event.preventDefault() // Prevent the error from appearing in console
      event.stopPropagation() // Stop further propagation
    }
  }, true) // Use capture phase to catch earlier
}

import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import 'core-js'

import App from './App'
import store from './store'
import { AuthProvider } from './Firebase/AuthContext'

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </Provider>,
)
