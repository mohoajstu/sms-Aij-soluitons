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
  // Kindergarten Observations (keep in sync with KG_KEY_LEARNING_LIMIT)
  KG_OBS: 3500,
}

/**
 * Progress report comment caps, sized to what each PDF comment box can hold
 * at the comment export font (8.5pt Times Roman, see getFieldFontSize in
 * pdfFillingUtils.js) without clipping. The learning-skill boxes differ in
 * height per skill, so each gets its own cap (max 250).
 * __tests__/pdfFieldCapacity.test.js lays text out against the real PDFs to
 * keep these honest — re-run it if a template, font size, or cap changes.
 */
export const LEARNING_SKILL_COMMENT_LIMITS = {
  '1-6': {
    sansResponsibility: 160,
    sansOrganization: 250,
    sansIndependentWork: 200,
    sansCollaboration: 250,
    sansInitiative: 250,
    sansSelfRegulation: 250,
  },
  '7-8': {
    sansResponsibility: 170,
    sansOrganization: 225,
    sansIndependentWork: 225,
    sansCollaboration: 250,
    sansInitiative: 250,
    sansSelfRegulation: 250,
  },
}
export const SUBJECT_COMMENT_LIMIT = 160
export const KG_KEY_LEARNING_LIMIT = 3500

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

/**
 * Shorten text to fit a limit without cutting mid-word: prefer the last full
 * sentence that fits, otherwise the last whole word. Used for AI-generated
 * comments, which are written straight into a field and bypass the
 * textarea's own maxLength.
 */
export const fitTextToLimit = (text, limit) => {
  if (!text || !limit || text.length <= limit) return text || ''

  const slice = text.slice(0, limit)
  const lastSentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
    /[.!?]$/.test(slice) ? slice.length - 1 : -1,
  )
  if (lastSentenceEnd >= limit / 2) {
    return slice.slice(0, lastSentenceEnd + 1).trim()
  }

  const lastSpace = slice.lastIndexOf(' ')
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim()
}
