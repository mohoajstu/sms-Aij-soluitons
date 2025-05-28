import { PDFDocument } from 'pdf-lib'
import { pdfToImage } from './pdfToImage'
import { detectTextPositions } from './ocrDetectText'

export async function autoPlaceFields(pdfFile) {
  try {
    console.log('📂 Converting PDF to image...')
    const imageUrl = await pdfToImage(URL.createObjectURL(pdfFile))

    console.log('🔍 Running OCR...')
    const textPositions = await detectTextPositions(imageUrl)

    console.log('📌 OCR Detected Text & Positions:', textPositions)

    if (textPositions.length === 0) {
      alert('OCR completed, but no text was detected. Check the console for details.')
      return null
    }

    // Load the original PDF
    const existingPdfBytes = await pdfFile.arrayBuffer()
    const pdfDoc = await PDFDocument.load(existingPdfBytes)
    const form = pdfDoc.getForm()
    const page = pdfDoc.getPages()[0]
    const pageHeight = page.getHeight()

    // Define the fields we want to add
    const fieldsToInsert = {
      Student: { width: 250, height: 25 },
      Date: { width: 100, height: 25 },
      'Days Absent': { width: 50, height: 25 },
      'Total Days Absent': { width: 50, height: 25 },
      'Times Late': { width: 50, height: 25 },
      'French: Immersion': { width: 200, height: 25 },
      'Key Learning / Growth in Learning': { width: 400, height: 100 },
    }

    let fieldAdded = false

    // Loop through detected text and add text fields
    textPositions.forEach(({ text, x, y, width, height }) => {
      for (let key in fieldsToInsert) {
        if (text.toLowerCase().includes(key.toLowerCase())) {
          const { width: fieldWidth, height: fieldHeight } = fieldsToInsert[key]

          const field = form.createTextField(key.replace(/\s/g, ''))
          field.setText('')
          field.addToPage(page, {
            x: x + 100, // Shift right for better positioning
            y: pageHeight - y, // Flip Y-coordinates
            width: fieldWidth,
            height: fieldHeight,
          })

          console.log(`✅ Added text field for: ${key} at (${x}, ${y})`)
          fieldAdded = true
          break
        }
      }
    })

    if (!fieldAdded) {
      alert('No matching fields detected. Try adjusting OCR settings.')
    }

    const pdfBytes = await pdfDoc.save()
    return URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }))
  } catch (error) {
    console.error('❌ Error during OCR processing:', error)
    alert('OCR process failed. Check the console for details.')
  }
}
