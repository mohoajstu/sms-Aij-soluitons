/**
 * Character limits for report card fields
 * B8: Character limits implementation
 */
export const CHARACTER_LIMITS = {
  // General cap for most fields
  GENERAL: 2000,
  // Subject Area fields
  SUBJECT_AREA: 1000,
  // Other field
  OTHER: 500,
  // Kindergarten Observations
  KG_OBS: 1500,
}

/**
 * Get character limit for a specific field
 * @param {string} fieldName - Name of the field
 * @returns {number} Character limit for the field
 */
export const getCharacterLimit = (fieldName) => {
  if (!fieldName) return CHARACTER_LIMITS.GENERAL

  const fieldLower = fieldName.toLowerCase()

  // Subject Area fields
  if (
    fieldLower.includes('subjectarea') ||
    fieldLower.includes('subject_area') ||
    fieldLower.includes('subjectarea') ||
    fieldLower.includes('subject area')
  ) {
    return CHARACTER_LIMITS.SUBJECT_AREA
  }

  // Other field
  if (fieldLower === 'other' || fieldLower.includes('other')) {
    return CHARACTER_LIMITS.OTHER
  }

  // Kindergarten Observations
  if (
    fieldLower.includes('kgobs') ||
    fieldLower.includes('kg_obs') ||
    fieldLower.includes('kg obs') ||
    fieldLower.includes('kindergarten') ||
    fieldLower.includes('initial observations') ||
    fieldLower.includes('observations')
  ) {
    return CHARACTER_LIMITS.KG_OBS
  }

  // Default to general limit
  return CHARACTER_LIMITS.GENERAL
}

/**
 * Validate and truncate text to character limit
 * @param {string} text - Text to validate
 * @param {string} fieldName - Name of the field
 * @returns {string} Validated text (truncated if needed)
 */
export const validateCharacterLimit = (text, fieldName) => {
  if (!text) return ''
  const limit = getCharacterLimit(fieldName)
  return text.length > limit ? text.substring(0, limit) : text
}

