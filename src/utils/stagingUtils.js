/**
 * Utility functions for staging environment detection and test tagging
 */

/**
 * Check if the current environment is staging
 * @returns {boolean} True if staging environment
 */
export function isStaging() {
  // Check environment variable
  if (import.meta.env.VITE_ENV === 'staging') {
    return true
  }
  
  // Check project ID from Firebase config
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
  if (projectId && projectId.includes('staging')) {
    return true
  }
  
  return false
}

/**
 * Get test tags for staging data
 * Adds metadata to identify test/staging data for easy cleanup
 * @returns {Object} Test tags object
 */
export function getTestTags() {
  if (!isStaging()) {
    return {}
  }
  
  return {
    isTest: true,
    env: 'staging',
    // createdAt will be added by the caller using serverTimestamp()
  }
}

/**
 * Add test tags to data object if in staging
 * @param {Object} data - Data object to add tags to
 * @param {Function} serverTimestamp - Firebase serverTimestamp function
 * @returns {Object} Data object with test tags added
 */
export function addTestTags(data, serverTimestamp) {
  if (!isStaging()) {
    return data
  }
  
  return {
    ...data,
    ...getTestTags(),
    createdAt: serverTimestamp ? serverTimestamp() : new Date(),
  }
}


