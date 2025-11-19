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
              const canvas = document.createElement('canvas')
              const context = canvas.getContext('2d')
              context.font = '48px "Dancing Script"'
              const textMetrics = context.measureText(value.value)
              canvas.width = textMetrics.width + 40
              canvas.height = 80
              context.font = '48px "Dancing Script"'
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

    const totalFilled = filledCount + signatureCount
    console.log(`📝 Successfully filled ${totalFilled} form fields (${filledCount} regular + ${signatureCount} signatures)`)

    // Add TLA logo to the "Board Logo" area
    try {
      const logoResponse = await fetch('/assets/brand/TLA_logo_simple.svg')
      if (logoResponse.ok) {
        const svgText = await logoResponse.text()
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml' })
        const svgUrl = URL.createObjectURL(svgBlob)

        await new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = async () => {
            try {
              const canvas = document.createElement('canvas')
              const ctx = canvas.getContext('2d')
              canvas.width = 240
              canvas.height = 120
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

              canvas.toBlob(async (blob) => {
                try {
                  const logoBytes = await blob.arrayBuffer()
                  const logoImage = await pdfDoc.embedPng(logoBytes)
                  const firstPage = pdfDoc.getPages()[0]
                  const pageHeight = firstPage.getHeight()
                  const logoWidth = 60
                  const logoHeight = 30
                  const logoX = firstPage.getWidth() - logoWidth - 5
                  const logoY = pageHeight - logoHeight - 5

                  firstPage.drawImage(logoImage, {
                    x: logoX,
                    y: logoY,
                    width: logoWidth,
                    height: logoHeight,
                  })
                  console.log('✅ TLA logo added to PDF')
                  URL.revokeObjectURL(svgUrl)
                  resolve()
                } catch (error) {
                  URL.revokeObjectURL(svgUrl)
                  reject(error)
                }
              }, 'image/png')
            } catch (error) {
              URL.revokeObjectURL(svgUrl)
              reject(error)
            }
          }
          img.onerror = () => {
            URL.revokeObjectURL(svgUrl)
            reject(new Error('Failed to load SVG image'))
          }
          img.src = svgUrl
        })
      }
    } catch (logoError) {
      console.warn('Could not add TLA logo:', logoError)
    }

    // ⚠️ CRITICAL: Update field appearances BEFORE flattening to ensure checkboxes are visible
    console.log('🎨 Updating all field appearances before flattening...')
    await updateAllFieldAppearances(form, pdfDoc, 'Download 7-8')

    // Now flatten the form to make fields non-editable
    console.log('🔧 Flattening PDF form fields for download...')
    try {
      if (fields.length > 0) {
        console.log('🎯 FLATTENING: Standard + Fallback approach')

        // METHOD 1: Try standard pdf-lib flattening first
        console.log('🔧 Step 1: Standard pdf-lib form.flatten()...')
        try {
          form.flatten()
        } catch (flattenSpecificError) {
          // If flattening fails, it might be due to invalid field data
          // Try to flatten individual fields instead
          console.warn('⚠️ Standard flatten failed, trying individual field flattening...')
          try {
            // Try flattening each field individually
            for (const field of fields) {
              try {
                field.flatten()
              } catch (fieldFlattenError) {
                // Skip fields that can't be flattened
                console.log(`Skipping field "${field.getName()}" during flatten`)
              }
            }
          } catch (individualFlattenError) {
            // If individual flattening also fails, just continue without flattening
            console.warn('⚠️ Individual field flattening also failed, continuing without flatten')
            throw flattenSpecificError // Re-throw to trigger the outer catch
          }
        }

        // METHOD 2: Remove AcroForm from catalog
        console.log('🗑️ Step 2: Removing AcroForm from catalog...')
        const catalog = pdfDoc.catalog
        try {
          catalog.delete('AcroForm')
          console.log('✅ AcroForm removed from catalog')
        } catch (acroFormError) {
          console.warn('⚠️ Could not remove AcroForm from catalog:', acroFormError)
        }
      }

      // Save the final PDF
      const finalPdfBytes = await pdfDoc.save({
        useObjectStreams: false, // Better compatibility
      })

      console.log('✅ PDF flattened successfully!')
      return finalPdfBytes
    } catch (flattenError) {
      console.error('❌ Error during flattening:', flattenError)
      // If flattening fails, save without flattening
      console.log('⚠️ Saving PDF without flattening due to error')
      const finalPdfBytes = await pdfDoc.save({
        useObjectStreams: false,
      })
      return finalPdfBytes
    }
  } catch (error) {
    console.error('❌ Error generating 7-8 Progress Report PDF:', error)
    throw error
  }
}

