/**
 * Export utility for Quran Studies Report Card
 * This ensures all text fields are properly rendered in the downloaded PDF
 */

import { PDFDocument } from 'pdf-lib'
import {
  fillPDFFormWithData,
  updateAllFieldAppearances,
  embedTimesRomanFont,
  saveFlattenedPdf,
} from './pdfFillingUtils'

/**
 * Generate and download a filled PDF for Quran Studies Report
 * @param {string} pdfPath - Path to the PDF template
 * @param {Object} formData - The form data to fill
 * @param {string} studentName - Student name for filename
 * @returns {Promise<Uint8Array>} - The generated PDF bytes
 */
export const exportQuranReport = async (pdfPath, formData, studentName) => {
  console.log('📄 Starting Quran Studies Report export...')

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

    // Embed Times Roman font for text fields
    const timesRomanFont = await embedTimesRomanFont(pdfDoc)

    // Map formData keys to PDF field names
    // The PDF uses 'name' for student name, our form uses 'student'
    const mappedFormData = {
      ...formData,
      name: formData.student || formData.name,
    }

    // Fill all form fields using shared utility
    const { filledCount, matchedFields, unmatchedFields } = await fillPDFFormWithData(
      pdfDoc,
      mappedFormData,
      timesRomanFont,
      'Download Quran Report',
    )

    console.log(`📝 Successfully filled ${filledCount} form fields`)
    
    if (unmatchedFields.length > 0) {
      console.warn(`⚠️ Unmatched fields (won't appear in PDF):`, unmatchedFields.slice(0, 10))
    }

    // Update all field appearances before flattening
    console.log('🎨 Updating all field appearances before flattening...')
    await updateAllFieldAppearances(form, pdfDoc, 'Download Quran Report')

    // Flatten the form to make fields non-editable
    console.log('🔧 Flattening PDF form fields for download...')
    try {
      if (fields.length > 0) {
        console.log('🎯 FLATTENING: Standard + Fallback approach')

        // METHOD 1: Try standard pdf-lib flattening first
        console.log('🔧 Step 1: Standard pdf-lib form.flatten()...')
        try {
          form.flatten()
        } catch (flattenSpecificError) {
          // If flattening fails, try to flatten individual fields
          console.warn('⚠️ Standard flatten failed, trying individual field flattening...')
          try {
            for (const field of fields) {
              try {
                field.flatten()
              } catch (fieldFlattenError) {
                console.log(`Skipping field "${field.getName()}" during flatten`)
              }
            }
          } catch (individualFlattenError) {
            console.warn('⚠️ Individual field flattening also failed, continuing without flatten')
            throw flattenSpecificError
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
      const finalPdfBytes = await saveFlattenedPdf(pdfDoc, {
        useObjectStreams: false, // Better compatibility
      })

      console.log('✅ PDF flattened successfully!')
      return finalPdfBytes
    } catch (flattenError) {
      console.error('❌ Error during flattening:', flattenError)
      // If flattening fails, save without flattening
      console.log('⚠️ Saving PDF without flattening due to error')
      const finalPdfBytes = await saveFlattenedPdf(pdfDoc, {
        useObjectStreams: false,
      })
      return finalPdfBytes
    }
  } catch (error) {
    console.error('❌ Error generating Quran Studies Report PDF:', error)
    throw error
  }
}
