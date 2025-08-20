import React from 'react'

const EnvDebug = () => {
  const envVars = {
    VITE_GOOGLE_API_KEY: import.meta.env.VITE_GOOGLE_API_KEY,
    VITE_GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD
  }

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f5f5f5', 
      margin: '10px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '12px'
    }}>
      <h4>Environment Variables Debug</h4>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {JSON.stringify(envVars, null, 2)}
      </pre>
    </div>
  )
}

export default EnvDebug 