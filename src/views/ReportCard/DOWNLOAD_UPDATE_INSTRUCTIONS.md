# Download Function Update Instructions

The `downloadFilledPDF` function in `utils.js` (starting at line 1134) needs to be updated to use the new separate export functions.

## Current Issue
- The download and preview use independent PDF filling logic
- Checkboxes are not appearing in downloaded PDFs despite showing in preview
- Download logic is too complex and should be delegated to separate export modules

## Solution
Replace lines 1144-1404 (the PDF generation logic) with a simple router that calls the appropriate export function:

```javascript
try {
  console.log(`🔧 Generating PDF for report type: ${reportCardType.id}`)

  const studentName = (formData.student_name || formData.student || 'student').replace(
    /\s+/g,
    '-',
  )

  // Route to the appropriate export function based on report type
  let finalPdfBytes
  switch (reportCardType.id) {
    case '1-6-progress':
      finalPdfBytes = await exportProgressReport1to6(reportCardType.pdfPath, formData, studentName)
      break
    case '7-8-progress':
      finalPdfBytes = await exportProgressReport7to8(reportCardType.pdfPath, formData, studentName)
      break
    case 'kg-initial-observations':
      finalPdfBytes = await exportKGInitialObservations(reportCardType.pdfPath, formData, studentName)
      break
    default:
      // For other report types, use the generic approach (can be extended later)
      console.warn(`⚠️ No specific export function for report type: ${reportCardType.id}`)
      console.log('Using generic PDF filling approach...')
      
      // Fetch the original PDF template
      const response = await fetch(reportCardType.pdfPath)
      if (!response.ok) {
        throw new Error('Failed to fetch PDF template')
      }

      const originalPdfBytes = await response.arrayBuffer()
      const pdfDoc = await PDFDocument.load(originalPdfBytes)
      const form = pdfDoc.getForm()
      const fields = form.getFields()

      console.log(`📋 Found ${fields.length} form fields in original PDF`)

      // Embed Times Roman font for regular text fields (10pt)
      const timesRomanFont = await embedTimesRomanFont(pdfDoc)

      // Fill all form fields using shared utility
      await fillPDFFormWithData(pdfDoc, formData, timesRomanFont, 'Download')

      // Update field appearances BEFORE flattening
      await updateAllFieldAppearances(form, pdfDoc, 'Download')

      // Flatten the form
      if (fields.length > 0) {
        form.flatten()
        const catalog = pdfDoc.catalog
        try {
          catalog.delete('AcroForm')
        } catch (e) {
          console.warn('Could not remove AcroForm:', e)
        }
      }

      finalPdfBytes = await pdfDoc.save({ useObjectStreams: false })
      break
  }

  const blob = new Blob([finalPdfBytes], { type: 'application/pdf' })
  const fileName = `${reportCardType?.name || 'report-card'}-${studentName}-filled.pdf`

  // ... rest of Firebase upload logic remains the same ...
}
```

## What This Changes
1. Removes ~260 lines of complex PDF filling logic from `utils.js`
2. Routes to specific export functions for each progress report type
3. Ensures consistent use of shared utilities (`pdfFillingUtils.js`)
4. Fixes checkbox rendering issue by using proper appearance updates before flattening

## Benefits
1. **Cleaner Code**: Each report type has its own file
2. **Easier Maintenance**: Changes to one report type don't affect others
3. **Consistent Logic**: All exports use the same shared utilities
4. **Fixed Checkboxes**: Proper appearance updates ensure checkboxes show in downloads

