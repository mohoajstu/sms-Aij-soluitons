// hooks/useAuth.js - Backward compatibility wrapper for AuthContext
import { useAuthContext } from './AuthContext'

// This hook now uses the shared AuthContext to prevent duplicate queries
const useAuth = () => {
  return useAuthContext()
}

export default useAuth
