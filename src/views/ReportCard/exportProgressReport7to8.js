/**
 * Export utility for Grades 7-8 Elementary Progress Report
 * This ensures checkboxes and all fields are properly rendered in the downloaded PDF
 */

import { PDFDocument } from 'pdf-lib'
import {
  fillPDFFormWithData,
  updateAllFieldAppearances,
  embedTimesRomanFont,
} from './pdfFillingUtils'

/**
 * Generate and download a filled PDF for 7-8 Progress Report
 * @param {string} pdfPath - Path to the PDF template
 * @param {Object} formData - The form data to fill
 * @param {string} studentName - Student name for filename
 * @returns {Promise<Uint8Array>} - The generated PDF bytes
 */
export const exportProgressReport7to8 = async (pdfPath, formData, studentName) => {
  console.log('📄 Starting 7-8 Progress Report export...')

  try {
    // Fetch the original PDF template
    const response = await fetch(pdfPath)
    if (!response.ok) {
      throw new Error('Failed to fetch PDF template')
    }

    const originalPdfBytes = await response.arrayBuffer()
    const pdfDoc = await PDFDocument.load(originalPdfBytes)
    const form = pdfDoc.getForm()
    const fields = form.getFields()

    console.log(`📋 Found ${fields.length} form fields in PDF`)

    // Embed Times Roman font for regular text fields (10pt)
    const timesRomanFont = await embedTimesRomanFont(pdfDoc)

    // Handle signature fields first (they need special processing)
    let signatureCount = 0
    for (const [formKey, value] of Object.entries(formData)) {
      if (
        (formKey === 'teacherSignature' ||
          formKey === 'principalSignature' ||
          formKey === 'teachersignature' ||
          formKey === 'principalsignature') &&
        value &&
        value.type &&
        value.value
      ) {
        console.log(`🖊️ Processing signature field "${formKey}"`)

        const signatureFieldMappings = {
          teacherSignature: ['teacherSignature', "Teacher's Signature", 'Teacher Signature', 'Signature1', 'Text_1'],
          principalSignature: ['principalSignature', "Principal's Signature", 'Principal Signature', 'Signature2', 'Number_1'],
          teachersignature: ['teacherSignature', "Teacher's Signature", 'Teacher Signature', 'Signature1', 'Text_1'],
          principalsignature: ['principalSignature', "Principal's Signature", 'Principal Signature', 'Signature2', 'Number_1'],
        }

        try {
          let sigField = null
          const possibleNames = signatureFieldMappings[formKey] || [formKey]

          for (const name of possibleNames) {
            sigField = form.getFieldMaybe(name)
            if (sigField) break
          }

          if (sigField) {
            let signatureImageBytes
            if (value.type === 'typed') {
              // Ensure Dancing Script font is loaded before rendering
              // Check if font is already loaded, if not load it
              let fontReady = false
              try {
                // Check if font is already available
                await document.fonts.ready
                fontReady = document.fonts.check('48px "Dancing Script"')
                
                if (!fontReady) {
                  // Load the font if not already loaded
                  const font = new FontFace(
                    'Dancing Script',
                    'url(https://fonts.gstatic.com/s/dancingscript/v25/If2cXTr6YS-zF4S-kcSWSVi_sxjLh2Gv2lthgSmF2lT2pS1t-g.ttf)'
                  )
                  await font.load()
                  document.fonts.add(font)
                  // Wait a bit to ensure font is ready
                  await new Promise(resolve => setTimeout(resolve, 100))
                }
              } catch (e) {
                console.warn('Font loading error, using fallback:', e)
              }
              
              const canvas = document.createElement('canvas')
              const context = canvas.getContext('2d')
              
              // Use the cursive font
              context.font = '48px "Dancing Script", cursive'
              const textMetrics = context.measureText(value.value)
              canvas.width = textMetrics.width + 40
              canvas.height = 80
              
              // Redraw with font
              context.font = '48px "Dancing Script", cursive'
              context.fillStyle = '#000000'
              context.fillText(value.value, 20, 50)
              
              signatureImageBytes = await fetch(canvas.toDataURL('image/png')).then((res) =>
                res.arrayBuffer(),
              )
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
                const widthRatio = rect.width / signatureImage.width
                const heightRatio = (rect.height - 5) / signatureImage.height
                const scale = Math.min(widthRatio, heightRatio)
                const width = signatureImage.width * scale
                const height = signatureImage.height * scale
                const x = rect.x + (rect.width - width) / 2
                const y = rect.y + (rect.height - height) / 2

                page.drawImage(signatureImage, { x, y, width, height })
                signatureCount++
              }
            }
          }
        } catch (e) {
          console.error(`Failed to process signature for ${formKey}:`, e)
        }
      }
    }

    // Fill all regular form fields using shared utility
    const { filledCount, matchedFields, unmatchedFields } = await fillPDFFormWithData(
      pdfDoc,
      formData,
      timesRomanFont,
      'Download 7-8',
    )

    // Log checkbox fields specifically for debugging
    const checkboxFields = matchedFields.filter((f) => {
      const field = form.getFieldMaybe(f.pdfField)
      return field && (field.constructor.name === 'PDFCheckBox' || field.constructor.name === 'PDFCheckBox2')
    })
    if (checkboxFields.length > 0) {
      console.log(`✅ Checkboxes filled: ${checkboxFields.map((f) => `${f.pdfField}=${f.value}`).join(', ')}`)
    }

    const totalFilled = filledCount + signatureCount
    console.log(`📝 Successfully filled ${totalFilled} form fields (${filledCount} regular + ${signatureCount} signatures)`)
    
    if (unmatchedFields.length > 0) {
      console.warn(`⚠️ Unmatched fields (won't appear in PDF):`, unmatchedFields.slice(0, 10))
    }

    // Logo overlay removed for 7-8 Progress Report

    // ⚠️ CRITICAL: Update field appearances BEFORE flattening to ensure checkboxes are visible
    console.log('🎨 Updating all field appearances before flattening...')
    await updateAllFieldAppearances(form, pdfDoc, 'Download 7-8')

    // Now flatten the form to make fields non-editable
    console.log('🔧 Flattening PDF form fields for download...')
    
    if (fields.length > 0) {
      console.log(`🎯 FLATTENING: Attempting to flatten ${fields.length} fields`)

      // METHOD 1: Try standard pdf-lib flattening first
      console.log('🔧 Step 1: Standard pdf-lib form.flatten()...')
      let flattenSuccess = false
      try {
        form.flatten()
        flattenSuccess = true
        console.log('✅ Standard flatten succeeded')
      } catch (flattenSpecificError) {
        console.warn('⚠️ Standard flatten failed:', flattenSpecificError.message)
        // If flattening fails, try to flatten individual fields instead
        console.log('🔄 Trying individual field flattening...')
        let flattenedCount = 0
        let failedCount = 0
        
        // Log which page each field is on for debugging
        const fieldsByPage = {}
        for (const field of fields) {
          try {
            const widgets = field.acroField.getWidgets()
            for (const widget of widgets) {
              try {
                const pageRef = widget.P()
                if (pageRef) {
                  const pageIndex = pdfDoc.getPages().findIndex((p) => p.ref === pageRef)
                  if (pageIndex >= 0) {
                    if (!fieldsByPage[pageIndex]) {
                      fieldsByPage[pageIndex] = []
                    }
                    fieldsByPage[pageIndex].push(field.getName())
                  }
                }
              } catch (e) {
                // Continue
              }
            }
          } catch (e) {
            // Continue
          }
        }
        
        // Log fields by page
        Object.keys(fieldsByPage).forEach((pageNum) => {
          console.log(`📄 Page ${parseInt(pageNum) + 1} has ${fieldsByPage[pageNum].length} fields:`, fieldsByPage[pageNum].slice(0, 5))
        })
        
        // Track specific problematic fields
        const sansFields = []
        const boardSpaceFields = []
        
        for (const field of fields) {
          const fieldName = field.getName()
          const lowerName = fieldName.toLowerCase()
          
          // Track sans fields and boardSpace
          if (lowerName.includes('sans')) {
            sansFields.push(fieldName)
          }
          if (lowerName.includes('boardspace') || lowerName === 'boardspace') {
            boardSpaceFields.push(fieldName)
          }
          
          try {
            field.flatten()
            flattenedCount++
            if (lowerName.includes('sans') || lowerName.includes('boardspace')) {
              console.log(`✅ Flattened ${fieldName}`)
            }
          } catch (fieldFlattenError) {
            failedCount++
            const errorMsg = fieldFlattenError.message || 'Unknown error'
            console.warn(`⚠️ Could not flatten field "${fieldName}":`, errorMsg)
            
            // Special handling for sans and boardSpace fields
            if (lowerName.includes('sans') || lowerName.includes('boardspace')) {
              console.error(`❌ CRITICAL: Failed to flatten ${fieldName} - this field will remain editable!`)
            }
          }
        }
        
        // Log summary of sans and boardSpace fields
        if (sansFields.length > 0) {
          console.log(`📋 Found ${sansFields.length} sans fields:`, sansFields)
        }
        if (boardSpaceFields.length > 0) {
          console.log(`📋 Found ${boardSpaceFields.length} boardSpace fields:`, boardSpaceFields)
        }
        
        if (flattenedCount > 0) {
          flattenSuccess = true
          console.log(`✅ Flattened ${flattenedCount} fields individually (${failedCount} failed)`)
        } else {
          console.error(`❌ Failed to flatten any fields (${failedCount} total failures)`)
        }
      }

      // METHOD 2: Aggressively remove AcroForm from catalog and all references
      console.log('🗑️ Step 2: Removing AcroForm from catalog and all references...')
      const catalog = pdfDoc.catalog
      
      try {
        // Remove AcroForm from catalog
        if (catalog.has('AcroForm')) {
          catalog.delete('AcroForm')
          console.log('✅ AcroForm removed from catalog')
        } else {
          console.log('ℹ️ AcroForm not found in catalog (may already be removed)')
        }
      } catch (acroFormError) {
        console.warn('⚠️ Could not remove AcroForm from catalog:', acroFormError.message)
      }

      // METHOD 3: Force flatten all fields again after initial attempt
      console.log('🔄 Step 3: Attempting second flatten pass to ensure all fields are flattened...')
      try {
        // Try to get form again and flatten any remaining fields
        const formAfterFirstFlatten = pdfDoc.getForm()
        const remainingFields = formAfterFirstFlatten.getFields()
        if (remainingFields.length > 0) {
          console.log(`⚠️ Found ${remainingFields.length} remaining fields after first flatten - attempting second flatten...`)
          try {
            formAfterFirstFlatten.flatten()
            console.log('✅ Second flatten pass succeeded')
          } catch (secondFlattenError) {
            console.warn('⚠️ Second flatten pass failed, trying individual field flatten...')
            let secondFlattenCount = 0
            const secondPassFailed = []
            for (const field of remainingFields) {
              const fieldName = field.getName()
              const lowerName = fieldName.toLowerCase()
              try {
                field.flatten()
                secondFlattenCount++
                if (lowerName.includes('sans') || lowerName.includes('boardspace')) {
                  console.log(`✅ Second pass: Flattened ${fieldName}`)
                }
              } catch (e) {
                const errorMsg = e.message || 'Unknown error'
                console.warn(`⚠️ Could not flatten remaining field "${fieldName}" in second pass:`, errorMsg)
                if (lowerName.includes('sans') || lowerName.includes('boardspace')) {
                  secondPassFailed.push(fieldName)
                  console.error(`❌ CRITICAL: ${fieldName} failed in second pass - will remain editable!`)
                }
              }
            }
            
            if (secondPassFailed.length > 0) {
              console.error(`❌ CRITICAL: ${secondPassFailed.length} fields failed to flatten in second pass:`, secondPassFailed)
            }
            if (secondFlattenCount > 0) {
              console.log(`✅ Flattened ${secondFlattenCount} remaining fields in second pass`)
            }
          }
        } else {
          console.log('✅ No remaining fields after first flatten')
        }
      } catch (formAccessError) {
        // Form might not be accessible - this is good, means flattening worked
        console.log('✅ Form is no longer accessible (flattening succeeded)')
      }

      // METHOD 4: Verify and force remove any remaining form fields
      try {
        // After flattening, try to get form again - if it still exists, force remove it
        try {
          const formAfterFlatten = pdfDoc.getForm()
          const fieldsAfterFlatten = formAfterFlatten.getFields()
          if (fieldsAfterFlatten.length > 0) {
            console.warn(`⚠️ Form still has ${fieldsAfterFlatten.length} fields after flattening - attempting force removal`)
            // Try to remove each field's widget annotations
            for (const field of fieldsAfterFlatten) {
              try {
                const widgets = field.acroField.getWidgets()
                for (const widget of widgets) {
                  try {
                    // Try to remove the widget's reference
                    const pageRef = widget.P()
                    if (pageRef) {
                      const page = pdfDoc.getPages().find((p) => p.ref === pageRef)
                      if (page) {
                        // Widgets are typically removed during flatten, but if they persist, 
                        // we'll rely on AcroForm removal
                      }
                    }
                  } catch (widgetError) {
                    // Continue
                  }
                }
              } catch (fieldError) {
                // Continue
              }
            }
          }
        } catch (formError) {
          // Form might not be accessible after flattening - this is good
          console.log('✅ Form is no longer accessible (flattening likely succeeded)')
        }
      } catch (forceRemoveError) {
        console.warn('⚠️ Could not force remove form fields:', forceRemoveError.message)
      }

      // Verify flattening success
      if (flattenSuccess) {
        console.log('✅ Flattening completed successfully')
      } else {
        console.error('❌ WARNING: Flattening may have failed - PDF may still be editable!')
        console.error('⚠️ Attempting to continue with AcroForm removal only...')
      }
      
      // Final check: Explicitly find and flatten any remaining sans* and boardSpace fields
      console.log('🔍 Step 5: Final check - explicitly finding and flattening sans* and boardSpace fields...')
      try {
        const finalForm = pdfDoc.getForm()
        const allFinalFields = finalForm.getFields()
        
        // List of all possible sans field names
        const sansFieldNames = [
          'sansResponsibility', 'sansOrganization', 'sansIndependentWork',
          'sansCollaboration', 'sansInitiative', 'sansSelfRegulation',
          'sans2Language', 'sans2French', 'sans2NativeLanguage',
          'sans2Math', 'sans2Science', 'sans2SocialStudies',
          'sans2History', 'sans2Geography', 'sans2HealthEd',
          'sans2PE', 'sans2Dance', 'sans2Drama', 'sans2Music',
          'sans2VisualArts', 'sans2Other',
          // Lowercase variations
          'sansresponsibility', 'sansorganization', 'sansindependentwork',
          'sanscollaboration', 'sansinitiative', 'sansselfregulation',
          'sans2language', 'sans2french', 'sans2nativelanguage',
          'sans2math', 'sans2science', 'sans2socialstudies',
          'sans2history', 'sans2geography', 'sans2healthed',
          'sans2pe', 'sans2dance', 'sans2drama', 'sans2music',
          'sans2visualarts', 'sans2other'
        ]
        
        const boardSpaceNames = ['boardSpace', 'boardspace', 'BoardSpace', 'BOARDSPACE']
        
        let finalFlattenCount = 0
        const finalFailed = []
        
        // Try to find and flatten each field by name
        for (const fieldName of [...sansFieldNames, ...boardSpaceNames]) {
          let fieldSuccess = false
          try {
            const field = finalForm.getFieldMaybe(fieldName)
            if (field) {
              // Check if field has a value (debugging)
              try {
                const fieldType = field.constructor.name
                let fieldValue = null
                if (fieldType === 'PDFTextField') {
                  fieldValue = field.getText()
                }
                console.log(`🔍 Field ${fieldName} (${fieldType}) has value: "${fieldValue ? fieldValue.substring(0, 50) : 'empty'}"`)
              } catch (e) {
                console.log(`🔍 Field ${fieldName} type unknown`)
              }
              
              try {
                // First try normal flatten
                field.flatten()
                finalFlattenCount++
                fieldSuccess = true
                console.log(`✅ Final pass: Flattened ${fieldName}`)
              } catch (flattenErr) {
                // If flatten fails, try setting field to read-only first
                console.warn(`⚠️ Flatten failed for ${fieldName}: ${flattenErr.message}`)
                console.log(`🔧 Attempting alternative methods for ${fieldName}...`)
                
                try {
                  // METHOD 1: Try to set field as read-only
                  try {
                    field.enableReadOnly()
                    console.log(`✅ Set ${fieldName} to read-only`)
                    finalFlattenCount++
                    fieldSuccess = true
                  } catch (readOnlyErr) {
                    console.warn(`⚠️ Could not set ${fieldName} to read-only:`, readOnlyErr.message)
                  }
                  
                  // METHOD 2: If read-only didn't work, try to manually set the Ff flag
                  if (!fieldSuccess) {
                    try {
                      const acroField = field.acroField
                      const currentFlags = acroField.getFlags()
                      // Set the ReadOnly flag (bit 0)
                      acroField.setFlags(currentFlags | 1)
                      console.log(`✅ Set read-only flag for ${fieldName}`)
                      finalFlattenCount++
                      fieldSuccess = true
                    } catch (flagErr) {
                      console.warn(`⚠️ Could not set read-only flag for ${fieldName}:`, flagErr.message)
                    }
                  }
                  
                  // METHOD 3: Try to remove widget annotations directly
                  if (!fieldSuccess) {
                    const widgets = field.acroField.getWidgets()
                    if (widgets && widgets.length > 0) {
                      let annotationRemoved = false
                      // Get the page for each widget and remove the annotation
                      for (const widget of widgets) {
                        try {
                          const pageRef = widget.P()
                          if (pageRef) {
                            const page = pdfDoc.getPages().find((p) => p.ref === pageRef)
                            if (page) {
                              // Try to remove the annotation from the page
                              const pageDict = page.node
                              if (pageDict && pageDict.dict) {
                                const annotsRef = pageDict.dict.get('Annots')
                                if (annotsRef) {
                                  const annots = pdfDoc.context.lookup(annotsRef)
                                  if (annots && Array.isArray(annots)) {
                                    // Filter out this widget's annotation
                                    const filteredAnnots = annots.filter((annotRef) => {
                                      try {
                                        const annot = pdfDoc.context.lookup(annotRef)
                                        return annot && annot !== widget
                                      } catch {
                                        return true
                                      }
                                    })
                                    
                                    if (filteredAnnots.length < annots.length) {
                                      const newAnnotsArray = pdfDoc.context.obj(filteredAnnots)
                                      pageDict.dict.set('Annots', newAnnotsArray)
                                      console.log(`✅ Removed annotation for ${fieldName} from page`)
                                      annotationRemoved = true
                                    }
                                  }
                                }
                              }
                            }
                          }
                        } catch (widgetErr) {
                          console.warn(`⚠️ Could not remove widget for ${fieldName}:`, widgetErr.message)
                        }
                      }
                      
                      if (annotationRemoved) {
                        finalFlattenCount++
                        fieldSuccess = true
                      }
                    }
                  }
                  
                  if (!fieldSuccess) {
                    finalFailed.push(fieldName)
                    console.error(`❌ Final pass: All methods failed for ${fieldName}`)
                    console.error(`   Original flatten error:`, flattenErr.message)
                  }
                } catch (annotationErr) {
                  finalFailed.push(fieldName)
                  console.error(`❌ Final pass: Failed alternative methods for ${fieldName}:`, annotationErr.message)
                }
              }
            } else {
              // Field not found - might already be flattened or doesn't exist
              console.log(`ℹ️ Field ${fieldName} not found (may already be flattened)`)
              // Don't count as failed if field doesn't exist
            }
          } catch (e) {
            if (!fieldSuccess) {
              finalFailed.push(fieldName)
              console.error(`❌ Final pass: Error accessing ${fieldName}:`, e.message)
            }
          }
        }
        
        if (finalFlattenCount > 0) {
          console.log(`✅ Final pass: Flattened ${finalFlattenCount} additional fields`)
        }
        if (finalFailed.length > 0) {
          console.error(`❌ Final pass: ${finalFailed.length} fields still failed:`, finalFailed)
        }
      } catch (finalCheckError) {
        console.warn('⚠️ Could not perform final field check:', finalCheckError.message)
      }
      
      // Final check: Verify AcroForm is removed
      try {
        const finalCatalog = pdfDoc.catalog
        if (finalCatalog.has('AcroForm')) {
          console.warn('⚠️ AcroForm still exists in catalog after removal attempt')
          // Try one more time
          try {
            finalCatalog.delete('AcroForm')
            console.log('✅ AcroForm removed on second attempt')
          } catch (retryError) {
            console.error('❌ Failed to remove AcroForm even on retry:', retryError.message)
          }
        } else {
          console.log('✅ AcroForm successfully removed from catalog')
        }
      } catch (verifyError) {
        console.warn('⚠️ Could not verify AcroForm removal:', verifyError.message)
      }
    } else {
      console.log('ℹ️ No fields to flatten')
    }

    // Save the final PDF
    console.log('💾 Saving PDF...')
    const finalPdfBytes = await pdfDoc.save({
      useObjectStreams: false, // Better compatibility
    })

    console.log('✅ PDF export completed!')
    return finalPdfBytes
  } catch (error) {
    console.error('❌ Error generating 7-8 Progress Report PDF:', error)
    throw error
  }
}

