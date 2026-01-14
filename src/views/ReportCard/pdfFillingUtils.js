/**
 * Shared PDF filling utilities
 * Ensures preview and download use IDENTICAL logic
 */

import { PDFDocument, StandardFonts } from 'pdf-lib'
import { generateFieldNameVariations } from './fieldMappings'

/**
 * Update all field appearances to ensure they're visible
 * This is CRITICAL for checkboxes to appear correctly
 * 
 * @param {PDFForm} form - The PDF form object
 * @param {PDFDocument} pdfDoc - The PDF document
 * @param {string} context - Context for logging (e.g., "Preview" or "Download")
 */
export const updateAllFieldAppearances = async (form, pdfDoc, context = 'PDF') => {
  try {
    // First, update all field appearances using the form method
    if (form.updateFieldAppearances) {
      form.updateFieldAppearances()
      console.log(`${context}: ✅ Updated field appearances using form method`)
    } else {
      console.warn(`${context}: updateFieldAppearances method not available`)
    }

    // Then, aggressively force appearances for all fields (text fields and checkboxes)
    const allFields = form.getFields()
    for (const field of allFields) {
      try {
        let fieldType = field.constructor.name
        const fieldName = field.getName()
        const widgets = field.acroField.getWidgets()

        // Handle ambiguous field types like 'e'
        if (fieldType === 'e') {
          // Check if it has checkbox methods
          if (typeof field.check === 'function' && typeof field.isChecked === 'function') {
            fieldType = 'PDFCheckBox'
            console.log(`${context}: Detected type 'e' as checkbox for field "${fieldName}"`)
          }
          // Check if it has text field methods
          else if (typeof field.setText === 'function' && typeof field.getText === 'function') {
            fieldType = 'PDFTextField'
            console.log(`${context}: Detected type 'e' as text field for field "${fieldName}"`)
          }
        }

        if (widgets.length > 0) {
          for (const widget of widgets) {
            // Force appearance update for all field types
            try {
              // Get the current appearance
              const ap = widget.getAP()
              if (ap) {
                // Force the appearance to update
                widget.setAP(ap)
              }

              // For text fields, ensure the text is visible
              if (fieldType === 'PDFTextField' || fieldType === 'PDFTextField2') {
                const fieldValue = field.getText()
                if (fieldValue) {
                  // Force update by setting the text again
                  field.setText(fieldValue)
                }
              }

              // For checkboxes, ensure the state is visible - EXACTLY like PDFViewer
              if (fieldType === 'PDFCheckBox' || fieldType === 'PDFCheckBox2') {
                try {
                  const currentValue = field.acroField.getValue()
                  const exportValues = field.acroField.getExportValues()
                  const checkedValue = exportValues && exportValues.length > 0 ? exportValues[0] : 'Yes'

                  if (currentValue && currentValue !== 'Off' && currentValue !== null) {
                    // Checkbox is checked - ensure it's set and appearance is updated
                    console.log(`${context}: 📌 Forcing checkbox "${fieldName}" to checked state`)
                    field.check()
                    field.acroField.setValue(checkedValue)
                    field.acroField.setExportValue(checkedValue)

                    // Force appearance update for checked state - with widget fallback
                    try {
                      if (field.updateAppearances) {
                        field.updateAppearances()
                      } else {
                        // Fallback: manually update widget appearances (like PDFViewer)
                        const fieldWidgets = field.acroField.getWidgets()
                        for (const fieldWidget of fieldWidgets) {
                          try {
                            const widgetAp = fieldWidget.getAP()
                            if (widgetAp) {
                              fieldWidget.setAP(widgetAp)
                            }
                          } catch (widgetError) {
                            // Continue if widget update fails
                          }
                        }
                      }
                    } catch (appearanceError) {
                      console.warn(`${context}: Could not update checkbox appearance for "${fieldName}":`, appearanceError)
                    }
                  } else {
                    // Checkbox is unchecked - ensure it's unset
                    field.uncheck()
                    field.acroField.setValue('Off')
                    field.acroField.setExportValue('Off')

                    // Force appearance update for unchecked state - with widget fallback
                    try {
                      if (field.updateAppearances) {
                        field.updateAppearances()
                      } else {
                        // Fallback: manually update widget appearances (like PDFViewer)
                        const fieldWidgets = field.acroField.getWidgets()
                        for (const fieldWidget of fieldWidgets) {
                          try {
                            const widgetAp = fieldWidget.getAP()
                            if (widgetAp) {
                              fieldWidget.setAP(widgetAp)
                            }
                          } catch (widgetError) {
                            // Continue if widget update fails
                          }
                        }
                      }
                    } catch (appearanceError) {
                      console.warn(`${context}: Could not update checkbox appearance for "${fieldName}":`, appearanceError)
                    }
                  }
                } catch (checkboxError) {
                  console.warn(`${context}: ⚠️ Error updating checkbox appearance for "${fieldName}":`, checkboxError)
                }
              }
            } catch (widgetError) {
              // Silently continue if widget update fails
            }
          }
        }
      } catch (fieldError) {
        console.warn(`${context}: ⚠️ Could not update appearance for "${field.getName()}":`, fieldError)
      }
    }
    console.log(`${context}: ✅ Aggressively forced all field appearances update`)
  } catch (appearanceError) {
    console.warn(`${context}: ⚠️ Could not update field appearances:`, appearanceError)
  }
}

/**
 * Fill a PDF field with a value
 * Handles text fields, checkboxes, dropdowns, radio groups
 * 
 * @param {PDFField} field - The PDF field to fill
 * @param {any} value - The value to set
 * @param {PDFFont} font - Optional font for text fields
 * @param {number} fontSize - Font size for text fields
 * @returns {boolean} - True if field was filled successfully
 */
export const fillPDFField = (field, value, font = null, fontSize = 10) => {
  try {
    let fieldType = field.constructor.name
    const fieldName = field.getName()

    // Handle ambiguous field types like 'e'
    if (fieldType === 'e') {
      // Check if it has checkbox methods
      if (typeof field.check === 'function' && typeof field.isChecked === 'function') {
        fieldType = 'PDFCheckBox'
      }
      // Check if it has text field methods
      else if (typeof field.setText === 'function' && typeof field.getText === 'function') {
        fieldType = 'PDFTextField'
      }
    }

    switch (fieldType) {
      case 'PDFTextField':
      case 'PDFTextField2':
        const stringValue = value.toString()
        field.setText(stringValue)

        // Update field appearance with specified font and font size
        if (font) {
          try {
            const acroField = field.acroField
            acroField.setDefaultAppearance(`/F1 ${fontSize} Tf`)
            field.updateAppearances(font)
          } catch (appearanceError) {
            console.warn(`Could not update appearance for "${fieldName}":`, appearanceError)
            try {
              field.updateAppearances(font)
            } catch (fallbackError) {
              console.warn(`Fallback appearance update also failed for "${fieldName}"`)
            }
          }
        }

        return true

      case 'PDFCheckBox':
      case 'PDFCheckBox2':
        // Handle boolean values correctly - EXACTLY matching PDFViewer logic
        let shouldCheck = false

        if (typeof value === 'boolean') {
          shouldCheck = value
        } else if (typeof value === 'string') {
          const lowerValue = value.toLowerCase().trim()
          shouldCheck = ['true', 'yes', '1', 'checked', 'x', 'on'].includes(lowerValue)
        } else if (typeof value === 'number') {
          shouldCheck = value === 1
        }

        if (shouldCheck) {
          // Try multiple approaches to set checkbox value - with better error handling
          try {
            // Approach 1: Use the standard check method (this is the safest)
            field.check()

            // Approach 2: Try to set the value directly using the export value (if available)
            // Only do this if we can safely get export values
            try {
              const exportValues = field.acroField.getExportValues()
              if (exportValues && exportValues.length > 0) {
                const checkedValue = exportValues[0]
                // Only set if the value is valid (not null/undefined)
                if (checkedValue && checkedValue !== 'Off') {
                  field.acroField.setValue(checkedValue)
                  field.acroField.setExportValue(checkedValue)
                }
              }
            } catch (exportValueError) {
              // Silently ignore - the check() method above should be sufficient
              console.log(`Could not set export value for "${fieldName}", using check() only`)
            }

            // Approach 3: Force update the appearance after setting value
            // Use pdf-lib's updateAppearances method if available
            try {
              if (field.updateAppearances) {
                field.updateAppearances()
              } else {
                // Fallback: manually update widget appearances
                const widgets = field.acroField.getWidgets()
                for (const widget of widgets) {
                  try {
                    // Force the appearance to update by getting and setting it
                    const ap = widget.getAP()
                    if (ap) {
                      widget.setAP(ap)
                    }
                  } catch (widgetError) {
                    // Continue if widget update fails
                  }
                }
              }
            } catch (appearanceError) {
              console.warn(`Could not update checkbox appearance for "${fieldName}":`, appearanceError)
            }
          } catch (error) {
            console.warn(`Error setting checkbox "${fieldName}":`, error)
            // Fallback to basic method
            try {
              field.check()
            } catch (fallbackError) {
              console.error(`❌ Failed to check checkbox "${fieldName}":`, fallbackError)
              return false
            }
          }
        } else {
          // Try multiple approaches to unset checkbox value - with better error handling
          try {
            // Approach 1: Use the standard uncheck method (this is the safest)
            field.uncheck()

            // Approach 2: Try to set the value directly (only if safe)
            try {
              field.acroField.setValue('Off')
              field.acroField.setExportValue('Off')
            } catch (setValueError) {
              // Silently ignore - the uncheck() method above should be sufficient
              console.log(`Could not set "Off" value for "${fieldName}", using uncheck() only`)
            }

            // Approach 3: Force update the appearance after unsetting value
            try {
              if (field.updateAppearances) {
                field.updateAppearances()
              } else {
                // Fallback: manually update widget appearances
                const widgets = field.acroField.getWidgets()
                for (const widget of widgets) {
                  try {
                    // Force the appearance to update
                    const ap = widget.getAP()
                    if (ap) {
                      widget.setAP(ap)
                    }
                  } catch (widgetError) {
                    // Continue if widget update fails
                  }
                }
              }
            } catch (appearanceError) {
              console.warn(`Could not update checkbox appearance for "${fieldName}":`, appearanceError)
            }
          } catch (error) {
            console.warn(`Error unsetting checkbox "${fieldName}":`, error)
            // Fallback to basic method
            try {
              field.uncheck()
            } catch (fallbackError) {
              console.error(`❌ Failed to uncheck checkbox "${fieldName}":`, fallbackError)
              return false
            }
          }
        }
        return true

      case 'PDFDropdown':
        const stringVal = value.toString()
        const options = field.getOptions()
        if (options.includes(stringVal)) {
          field.select(stringVal)
          return true
        }
        // Try case-insensitive match
        const matchingOption = options.find(
          (opt) => opt.toLowerCase() === stringVal.toLowerCase(),
        )
        if (matchingOption) {
          field.select(matchingOption)
          return true
        }
        console.warn(`Could not match dropdown value "${stringVal}" for field "${fieldName}"`)
        break

      case 'PDFRadioGroup':
        try {
          const radioVal = value.toString()
          field.select(radioVal)
          return true
        } catch (radioError) {
          const radioOptions = field.getOptions()
          const matchingRadioOption = radioOptions.find(
            (opt) => opt.toLowerCase() === value.toString().toLowerCase(),
          )
          if (matchingRadioOption) {
            field.select(matchingRadioOption)
            return true
          }
          console.warn(`Could not match radio value "${value}" for field "${fieldName}"`)
        }
        break

      case 'PDFSignature':
        // Signature fields can sometimes be filled as text
        // Try to set as text if the field supports it
        if (field.setText) {
          const stringValue = value.toString()
          field.setText(stringValue)
          
          // Update field appearance if font is provided
          if (font) {
            try {
              const acroField = field.acroField
              acroField.setDefaultAppearance(`/F1 ${fontSize} Tf`)
              field.updateAppearances(font)
            } catch (appearanceError) {
              console.warn(`Could not update signature field appearance for "${fieldName}":`, appearanceError)
            }
          }
          
          return true
        }
        // If setText is not available, try to access as text field
        try {
          if (field.acroField && typeof field.acroField.setValue === 'function') {
            field.acroField.setValue(value.toString())
            return true
          }
        } catch (e) {
          console.warn(`Could not fill signature field "${fieldName}" as text:`, e)
        }
        break

      default:
        // Try to set as text for unknown field types
        if (field.setText) {
          field.setText(value.toString())
          return true
        }
        console.warn(`Unknown field type "${fieldType}" for field "${fieldName}"`)
        break
    }
  } catch (error) {
    console.error(`Error filling field "${field.getName()}" of type ${field.constructor.name}:`, error)
  }

  return false
}

/**
 * Fill PDF form with form data
 * This is the CORE function that both preview and download use
 * 
 * @param {PDFDocument} pdfDoc - The PDF document
 * @param {Object} formData - The form data to fill
 * @param {PDFFont} timesRomanFont - Font for text fields
 * @param {string} context - Context for logging
 * @returns {Promise<{filledCount: number, matchedFields: Array, unmatchedFields: Array}>}
 */
export const fillPDFFormWithData = async (pdfDoc, formData, timesRomanFont, context = 'PDF') => {
  const form = pdfDoc.getForm()
  const fields = form.getFields()
  let filledCount = 0
  const matchedFields = []
  const unmatchedFields = []

  // Fill fields based on form data
  for (const [formKey, value] of Object.entries(formData)) {
    // Skip empty values but allow false for checkboxes
    if (value === null || value === undefined || value === '') {
      continue
    }

    // Special logging for teacher field
    if (formKey === 'teacher' || formKey === 'teacher_name') {
      console.log(`${context}: 🔍 Processing teacher field "${formKey}" with value:`, value)
    }

    // Process grade field to extract just the number (e.g., "grade 8" -> "8")
    let processedValue = value
    if (formKey === 'grade' && value) {
      const gradeValue = value.toString()
      const match = gradeValue.match(/\d+/)
      processedValue = match ? match[0] : gradeValue
    }

    // Handle signature fields specially (they're handled separately in both preview and download)
    if (
      formKey === 'teacherSignature' ||
      formKey === 'principalSignature' ||
      formKey === 'teachersignature' ||
      formKey === 'principalsignature'
    ) {
      // Signatures are handled separately, skip here
      continue
    }

    // Handle regular form fields
    const possibleFieldNames = generateFieldNameVariations(formKey)

    // Special logging for teacher field
    if (formKey === 'teacher' || formKey === 'teacher_name') {
      console.log(`${context}: 🔍 Trying to fill teacher field "${formKey}" with possible PDF field names:`, possibleFieldNames)
    }

    let fieldFilled = false
    for (const fieldName of possibleFieldNames) {
      try {
        const field = form.getFieldMaybe(fieldName)
        if (field) {
          const success = fillPDFField(field, processedValue, timesRomanFont, 10)
          if (success) {
            filledCount++
            matchedFields.push({ formKey, pdfField: fieldName, value: processedValue.toString() })
            fieldFilled = true
            
            // Special logging for teacher field
            if (formKey === 'teacher' || formKey === 'teacher_name') {
              console.log(`${context}: ✅ Successfully filled teacher field "${formKey}" → PDF field "${fieldName}" with value:`, processedValue)
            }
            break
          }
        }
      } catch (error) {
        console.warn(`${context}: Error trying field ${fieldName}:`, error.message)
      }
    }

    if (!fieldFilled) {
      unmatchedFields.push(formKey)
      
      // Special logging for teacher field
      if (formKey === 'teacher' || formKey === 'teacher_name') {
        console.warn(`${context}: ⚠️ Could not fill teacher field "${formKey}" - no matching PDF field found. Tried:`, possibleFieldNames)
      }
    }
  }

  console.log(`${context}: ✅ Successfully filled ${filledCount} form fields`)
  if (unmatchedFields.length > 0) {
    console.warn(`${context}: ⚠️ Unmatched fields:`, unmatchedFields.slice(0, 10))
  }

  return { filledCount, matchedFields, unmatchedFields }
}

/**
 * Embed Times Roman font for text fields
 * 
 * @param {PDFDocument} pdfDoc - The PDF document
 * @returns {Promise<PDFFont>} - The embedded font
 */
export const embedTimesRomanFont = async (pdfDoc) => {
  try {
    // Try to load Times New Roman from fonts folder, fallback to standard TimesRoman
    const timesFontBytes = await fetch('/fonts/TimesNewRoman.ttf')
      .then((res) => res.arrayBuffer())
      .catch(() => null)
    
    if (timesFontBytes) {
      return await pdfDoc.embedFont(timesFontBytes)
    } else {
      return await pdfDoc.embedFont(StandardFonts.TimesRoman)
    }
  } catch (e) {
    // Fallback to standard TimesRoman font
    return await pdfDoc.embedFont(StandardFonts.TimesRoman)
  }
}

