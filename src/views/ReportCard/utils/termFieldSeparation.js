/**
 * Utility functions for separating term-specific fields from shared fields
 * Term 1 fields: Fields ending in "Report1" (e.g., languageMarkReport1)
 * Term 2 fields: Fields ending in "Report2" (e.g., languageMarkReport2)
 * Shared fields: All other fields (student info, comments, text fields, etc.)
 */

/**
 * Check if a field is term-specific (Report1 or Report2)
 * @param {string} fieldName - The field name to check
 * @returns {string|null} - 'term1', 'term2', or null if shared
 */
export const getFieldTerm = (fieldName) => {
  if (!fieldName || typeof fieldName !== 'string') return null
  
  const lowerField = fieldName.toLowerCase()
  
  // Term 1 fields end with "report1" or contain "report1" (case insensitive)
  if (lowerField.includes('report1') || lowerField.endsWith('report1')) {
    return 'term1'
  }

  // Quran report fields use "Term1" / "Term2"
  if (lowerField.includes('term1') || lowerField.endsWith('term1')) {
    return 'term1'
  }
  
  // Term 2 fields end with "report2" or contain "report2" (case insensitive)
  if (lowerField.includes('report2') || lowerField.endsWith('report2')) {
    return 'term2'
  }
  
  // Quran report fields use "Term1" / "Term2"
  if (lowerField.includes('term2') || lowerField.endsWith('term2')) {
    return 'term2'
  }
  
  // All other fields are shared
  return null
}

/**
 * Separate form data into term-specific and shared fields
 * @param {Object} formData - The complete form data object
 * @param {string} term - 'term1' or 'term2'
 * @returns {Object} - Object with termData (current term), sharedData (shared), otherTermData (other term)
 */
export const separateTermFields = (formData, term) => {
  if (!formData || typeof formData !== 'object') {
    return { termData: {}, sharedData: {}, otherTermData: {} }
  }

  const termData = {}
  const sharedData = {}
  const otherTermData = {}

  Object.keys(formData).forEach((key) => {
    const fieldTerm = getFieldTerm(key)

    if (fieldTerm === term) {
      // This field belongs to the current term
      termData[key] = formData[key]
    } else if (fieldTerm === null) {
      // This is a shared field (not term-specific)
      sharedData[key] = formData[key]
    } else {
      // Belongs to the other term — preserve so the PDF still shows both columns
      otherTermData[key] = formData[key]
    }
  })

  return { termData, sharedData, otherTermData }
}

/**
 * Merge term-specific data with shared data
 * @param {Object} termData - Term-specific fields for the current term
 * @param {Object} sharedData - Shared fields (student info, comments, etc.)
 * @param {Object} otherTermData - Optional: Other term's data to preserve
 * @returns {Object} - Merged form data
 */
export const mergeTermFields = (termData, sharedData, otherTermData = {}) => {
  return {
    ...sharedData, // Shared fields (available in both terms)
    ...otherTermData, // Other term's fields (preserved but not editable)
    ...termData, // Current term's fields (editable)
  }
}

/**
 * Copy relevant fields from Term 1 to Term 2
 * Only copies shared fields and converts Term 1 specific fields to Term 2 equivalents
 * @param {Object} term1FormData - Term 1 form data
 * @returns {Object} - Form data suitable for Term 2 initialization
 */
const replaceWithMatchingCase = (match, replacement) => {
  if (match.toUpperCase() === match) {
    return replacement.toUpperCase()
  }
  if (match.toLowerCase() === match) {
    return replacement.toLowerCase()
  }
  // Preserve leading capital for camel/pascal case
  return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase()
}

// Learning skill field bases that use a numeric 1/2 suffix (not report1/report2)
const LEARNING_SKILL_BASES = [
  'responsibility',
  'organization',
  'independentWork',
  'collaboration',
  'initiative',
  'selfRegulation',
]

export const copyTerm1ToTerm2 = (term1FormData) => {
  if (!term1FormData || typeof term1FormData !== 'object') {
    return {}
  }

  const term2Data = {}

  Object.keys(term1FormData).forEach((key) => {
    const fieldTerm = getFieldTerm(key)

    if (fieldTerm === 'term1') {
      // Keep the Term 1 field so the Term 1 column stays filled in the PDF.
      term2Data[key] = term1FormData[key]

      // Add the Term 2 equivalent as empty — teacher fills it fresh.
      // (comment fields are also cleared by initializeTerm2FromTerm1 after this)
      let term2Key = key
      term2Key = term2Key.replace(/report1/gi, (match) => replaceWithMatchingCase(match, 'report2'))
      term2Key = term2Key.replace(/term1/gi, (match) => replaceWithMatchingCase(match, 'term2'))
      // The Grade 7-8 provincial PDF names the Islamic Studies Term 2 mark field
      // "otherMedianReport2", even though it is the editable Term 2 mark slot.
      if (term2Key === 'otherMarkReport2') {
        term2Key = 'otherMedianReport2'
      }
      if (term2Key !== key) {
        term2Data[term2Key] = ''
      }
    } else if (fieldTerm === null) {
      // Check if this is a learning-skill field using a bare numeric suffix (e.g. responsibility1)
      const lsBase = LEARNING_SKILL_BASES.find((base) => key === base + '1')
      if (lsBase) {
        // Keep Term 1 value so the Term 1 column stays filled in the PDF.
        term2Data[key] = term1FormData[key]
        // Term 2 rating starts empty — teacher fills it fresh.
        term2Data[lsBase + '2'] = ''
      } else {
        // Shared field — copy as-is
        term2Data[key] = term1FormData[key]
      }
    }
    // Don't copy Term 2 fields from Term 1 (shouldn't exist, but just in case)
  })

  return term2Data
}

/**
 * Get list of all term-specific field names for a given term
 * @param {Object} formData - Form data to analyze
 * @param {string} term - 'term1' or 'term2'
 * @returns {Array<string>} - Array of field names
 */
export const getTermSpecificFields = (formData, term) => {
  if (!formData || typeof formData !== 'object') {
    return []
  }
  
  return Object.keys(formData).filter((key) => {
    const fieldTerm = getFieldTerm(key)
    return fieldTerm === term
  })
}

/**
 * Get list of all shared field names
 * @param {Object} formData - Form data to analyze
 * @returns {Array<string>} - Array of field names
 */
export const getSharedFields = (formData) => {
  if (!formData || typeof formData !== 'object') {
    return []
  }
  
  return Object.keys(formData).filter((key) => {
    const fieldTerm = getFieldTerm(key)
    return fieldTerm === null
  })
}
