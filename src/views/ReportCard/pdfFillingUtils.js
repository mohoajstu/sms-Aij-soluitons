/**
 * Shared PDF filling utilities
 * Ensures preview and download use IDENTICAL logic
 */

import { PDFDocument, StandardFonts, PDFNumber, PDFName, PDFDict, PDFStream, PDFRef } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { generateFieldNameVariations } from './fieldMappings'

const ARABIC_REGEX_GLOBAL = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g

export const stripArabicFromText = (text) => {
  if (!text) return text
  return text
    .replace(ARABIC_REGEX_GLOBAL, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export const ensureSignatureFont = async () => {
  try {
    if (document?.fonts?.ready) {
      await document.fonts.ready
    }

    const hasFont =
      typeof document !== 'undefined' &&
      document.fonts &&
      document.fonts.check('48px "Dancing Script"')

    if (!hasFont && typeof FontFace !== 'undefined') {
      const font = new FontFace(
        'Dancing Script',
        'url(https://fonts.gstatic.com/s/dancingscript/v25/If2cXTr6YS-zF4S-kcSWSVi_sxjLh2Gv2lthgSmF2lT2pS1t-g.ttf)',
      )
      await font.load()
      document.fonts.add(font)
      if (document.fonts.ready) {
        await document.fonts.ready
      }
    }
  } catch (e) {
    console.warn('⚠️ Could not load Dancing Script font for signatures, using fallback', e)
  }
}

export const convertTextToImage = async (
  text,
  font = '48px "Dancing Script"',
  color = '#000000',
) => {
  await ensureSignatureFont()

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  context.font = font
  const textMetrics = context.measureText(text)

  canvas.width = textMetrics.width + 40
  canvas.height = 80

  context.font = font
  context.fillStyle = color
  context.fillText(text, 20, 50)

  return canvas.toDataURL('image/png')
}

export const scaleToFit = (imgWidth, imgHeight, boxWidth, boxHeight) => {
  const widthRatio = boxWidth / imgWidth
  const heightRatio = boxHeight / imgHeight
  const scale = Math.min(widthRatio, heightRatio)
  return {
    width: imgWidth * scale,
    height: imgHeight * scale,
  }
}

export const normalizeSignatureFormData = (formData) => {
  const normalized = { ...(formData || {}) }
  const teacherNameForSig =
    normalized.teacherSignature?.value || normalized.teacher_name || normalized.teacher
  if (!normalized.teacherSignature && teacherNameForSig) {
    normalized.teacherSignature = { type: 'typed', value: teacherNameForSig }
  }
  const principalNameForSig =
    normalized.principalSignature?.value || 'Ghazala Choudhary'
  if (!normalized.principalSignature && principalNameForSig) {
    normalized.principalSignature = { type: 'typed', value: principalNameForSig }
  }
  return normalized
}

export const embedSignaturesIntoPdf = async (
  pdfDoc,
  form,
  formData,
  context = 'PDF',
) => {
  let signatureCount = 0
  for (const [formKey, value] of Object.entries(formData || {})) {
    if (
      (formKey === 'teacherSignature' ||
        formKey === 'principalSignature' ||
        formKey === 'teachersignature' ||
        formKey === 'principalsignature') &&
      value &&
      value.type &&
      value.value
    ) {
      const possibleNames = generateFieldNameVariations(formKey)
      let sigField = null

      for (const name of possibleNames) {
        sigField = form.getFieldMaybe(name)
        if (sigField) break
      }

      if (!sigField) {
        console.warn(
          `${context}: ⚠️ Could not find signature field for "${formKey}". Tried:`,
          possibleNames,
        )
        continue
      }

      // For typed signatures, also try filling as text (some signature fields support text)
      if (value.type === 'typed' && sigField.setText) {
        try {
          sigField.setText(value.value)
        } catch (textError) {
          console.warn(`${context}: Could not fill signature field as text:`, textError)
        }
      }

      try {
        let signatureImageBytes
        if (value.type === 'typed') {
          const dataUrl = await convertTextToImage(value.value)
          signatureImageBytes = await fetch(dataUrl).then((res) => res.arrayBuffer())
        } else {
          signatureImageBytes = await fetch(value.value).then((res) => res.arrayBuffer())
        }

        const signatureImage = await pdfDoc.embedPng(signatureImageBytes)
        const widgets = sigField.acroField.getWidgets()

        if (widgets.length > 0) {
          const rect = widgets[0].getRectangle()
          const pageRef = widgets[0].P()
          const page = pdfDoc.getPages().find((p) => p.ref === pageRef)

          if (page) {
            const { width, height } = scaleToFit(
              signatureImage.width,
              signatureImage.height,
              rect.width,
              rect.height - 5,
            )
            const x = rect.x + (rect.width - width) / 2
            const y = rect.y + (rect.height - height) / 2
            page.drawImage(signatureImage, { x, y, width, height })
            signatureCount++
          }
        }

        try {
          sigField.flatten()
        } catch (flattenError) {
          console.warn(
            `${context}: Could not flatten signature field "${sigField.getName()}".`,
            flattenError,
          )
        }
      } catch (e) {
        console.error(`${context}: Failed to process signature for ${formKey}:`, e)
      }
    }
  }

  return signatureCount
}

export const drawTextIntoField = async (
  pdfDoc,
  field,
  text,
  font,
  fontSize = 10,
) => {
  if (!field || !text) return false
  try {
    const widgets = field.acroField.getWidgets()
    if (!widgets || widgets.length === 0) return false

    for (const widget of widgets) {
      const rect = widget.getRectangle()
      const pageRef = widget.P()
      const page = pdfDoc.getPages().find((p) => p.ref === pageRef)
      if (!page) continue

      const safeText = stripArabicFromText(text.toString())
      const padding = 2
      const x = rect.x + padding
      const y = rect.y + Math.max(0, (rect.height - fontSize) / 2)
      page.drawText(safeText, {
        x,
        y,
        size: fontSize,
        font,
        maxWidth: Math.max(0, rect.width - padding * 2),
      })
    }
    return true
  } catch (e) {
    console.warn('Could not draw text into field:', e)
    return false
  }
}

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
    const timesRomanFont = await embedTimesRomanFont(pdfDoc)
    const ensureWidgetNormalAppearance = (field, widget, fieldName) => {
      try {
        const ap = widget.getAP?.()
        const normalAppearance = ap ? ap.get(PDFName.of('N')) : undefined
        const isValidAppearance =
          normalAppearance instanceof PDFDict ||
          normalAppearance instanceof PDFStream ||
          normalAppearance instanceof PDFRef
        if (!isValidAppearance) {
          if (typeof field.createAppearanceStream === 'function') {
            const emptyAppearance = field.createAppearanceStream(
              widget,
              [],
              timesRomanFont || undefined,
            )
            widget.setNormalAppearance(emptyAppearance)
            console.log(
              `${context}: 🧩 Added missing widget appearance for field "${fieldName}"`,
            )
          }
        }
      } catch (appearanceError) {
        console.warn(
          `${context}: ⚠️ Could not ensure widget appearance for "${fieldName}":`,
          appearanceError,
        )
      }
    }

    // First, update all field appearances using the form method
    if (form.updateFieldAppearances) {
      try {
        if (timesRomanFont) {
          form.updateFieldAppearances(timesRomanFont)
        } else {
          form.updateFieldAppearances()
        }
        console.log(`${context}: ✅ Updated field appearances using form method`)
      } catch (appearanceError) {
        console.warn(`${context}: ⚠️ Could not update field appearances using form method:`, appearanceError)
      }
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
                const safeValue = fieldValue ?? ''
                // Force update by setting the text again (even if empty)
                field.setText(safeValue)
                if (timesRomanFont) {
                  field.updateAppearances(timesRomanFont)
                } else if (field.updateAppearances) {
                  field.updateAppearances()
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

              // Ensure widget has a normal appearance to prevent flatten errors
              ensureWidgetNormalAppearance(field, widget, fieldName)
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
 * Determine if a field should be left-aligned
 * Fields like name, grade, teacher, principal, and comments should be left-aligned
 * 
 * @param {string} fieldName - The PDF field name
 * @returns {boolean} - True if field should be left-aligned
 */
const shouldBeLeftAligned = (fieldName) => {
  if (!fieldName) return false
  const lowerName = fieldName.toLowerCase()

  const leftAlignFields = [
    'name',
    'student',
    'studentname',
    'grade',
    'teacher',
    'teachernam',
    'teachername',
    'principal',
    'principle',
    'principalname',
    'sans',
    'strengths',
    'nextsteps',
    'improvement',
    'comments',
    'comment',
  ]

  return leftAlignFields.some((field) => lowerName.includes(field))
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
            // Set text alignment using quadding (Q) property
            // 0=left, 1=center, 2=right
            const alignment = shouldBeLeftAligned(fieldName) ? 0 : 1
            const fontName = font?.name || 'F1'
            acroField.setDefaultAppearance(`/${fontName} ${fontSize} Tf 0 g`)
            
            // Set the quadding (Q) property on the field's dictionary
            // This controls text alignment within the field
            try {
              acroField.dict.set(PDFName.of('Q'), PDFNumber.of(alignment))
            } catch (quaddingError) {
              console.warn(`Could not set quadding for "${fieldName}":`, quaddingError)
            }
            
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
              // Signature fields should be left-aligned
              const fontName = font?.name || 'F1'
              acroField.setDefaultAppearance(`/${fontName} ${fontSize} Tf 0 g`)
              
              // Set the quadding (Q) property for left alignment
              try {
                acroField.dict.set(PDFName.of('Q'), PDFNumber.of(0))
              } catch (quaddingError) {
                console.warn(`Could not set quadding for signature field "${fieldName}":`, quaddingError)
              }
              
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
    const allowMultipleMatches = ['student', 'student_name', 'name'].includes(formKey)
    for (const fieldName of possibleFieldNames) {
      try {
        const field = form.getFieldMaybe(fieldName)
        if (field) {
          const valueText = processedValue?.toString?.() ?? ''
          const safeText = stripArabicFromText(valueText)
          const success = fillPDFField(field, safeText, timesRomanFont, 10)
          if (success) {
            filledCount++
            matchedFields.push({ formKey, pdfField: fieldName, value: processedValue.toString() })
            fieldFilled = true
            
            // Special logging for teacher field
            if (formKey === 'teacher' || formKey === 'teacher_name') {
              console.log(`${context}: ✅ Successfully filled teacher field "${formKey}" → PDF field "${fieldName}" with value:`, processedValue)
            }
            if (!allowMultipleMatches) {
              break
            }
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
    return await pdfDoc.embedFont(StandardFonts.TimesRoman)
  } catch (e) {
    // Fallback to standard TimesRoman font
    return await pdfDoc.embedFont(StandardFonts.TimesRoman)
  }
}
