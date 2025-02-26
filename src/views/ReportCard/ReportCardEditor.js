import React, { useState, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { PDFDocument } from 'pdf-lib'

// Ensure the correct PDF.js worker version
pdfjs.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js'

/**
 * A React component that:
 *   1. Loads a PDF (AcroForm or not)
 *   2. Logs all field names (if AcroForm) to the console
 *   3. Fills some fields by name
 *   4. Previews the original & filled PDFs
 */
function ReportCardEditorAcroForm({ pdfSource }) {
  const [originalPdfUrl, setOriginalPdfUrl] = useState(null)
  const [modifiedPdfUrl, setModifiedPdfUrl] = useState(null)

  // Example data we want to fill into the PDF
  const [formData, setFormData] = useState({
    studentName: '',
    oen: '',
    date: '',
    grade: '',
    teacherName: '',
  })

  // Convert the pdfSource to a previewable URL
  useEffect(() => {
    if (pdfSource instanceof File) {
      const url = URL.createObjectURL(pdfSource)
      setOriginalPdfUrl(url)
    } else if (typeof pdfSource === 'string') {
      setOriginalPdfUrl(pdfSource)
    }
  }, [pdfSource])

  /**
   * Helper: Loads the PDF into an ArrayBuffer
   */
  const loadPdfBuffer = async (source) => {
    if (source instanceof File) {
      return source.arrayBuffer()
    } else if (typeof source === 'string') {
      const res = await fetch(source)
      return res.arrayBuffer()
    }
  }

  /**
   * Handle user input changes in the form
   */
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  /**
   * On form submit, load the PDF, log the fields, and fill them
   */
  const handleEditSubmit = async (e) => {
    e.preventDefault()

    try {
      // 1. Load PDF as an ArrayBuffer
      const pdfBuffer = await loadPdfBuffer(pdfSource)

      // 2. Parse the PDF with pdf-lib
      const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })

      // 3. Get the form
      const form = pdfDoc.getForm()

      // 4. Log all fields found in the PDF
      const fields = form.getFields()
      console.log('--- Available Fields in PDF ---')
      fields.forEach((field) => {
        console.log('Field name:', field.getName())
      })
      console.log('--------------------------------')

      // 5. Attempt to fill known fields by name
      // NOTE: You must use the exact names you see logged above.
      try {
        form.getTextField('student').setText(formData.studentName)
      } catch (err) {
        console.warn("No 'Student' field or can't fill it:", err)
      }

      try {
        form.getTextField('OEN').setText(formData.oen)
      } catch (err) {
        console.warn("No 'OEN' field or can't fill it:", err)
      }

      try {
        form.getTextField('Date').setText(formData.date)
      } catch (err) {
        console.warn("No 'Date' field or can't fill it:", err)
      }

      try {
        form.getTextField('Grade').setText(formData.grade)
      } catch (err) {
        console.warn("No 'Grade' field or can't fill it:", err)
      }

      try {
        form.getTextField('Teacher').setText(formData.teacherName)
      } catch (err) {
        console.warn("No 'Teacher' field or can't fill it:", err)
      }

      // 6. Save the modified PDF
      const pdfBytes = await pdfDoc.save()

      // 7. Create a Blob URL for the modified PDF so we can preview & download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const newUrl = URL.createObjectURL(blob)
      setModifiedPdfUrl(newUrl)
    } catch (error) {
      console.error('Error loading or editing PDF:', error)
    }
  }

  return (
    <div style={{ textAlign: 'center', marginTop: 20 }}>
      <h2>Ontario Report Card (AcroForm) Editor</h2>

      {/* Original PDF preview */}
      {originalPdfUrl && (
        <div>
          <h3>Original PDF Preview:</h3>
          <Document file={originalPdfUrl}>
            <Page pageNumber={1} renderTextLayer />
          </Document>
        </div>
      )}

      {/* Simple user input form */}
      <form onSubmit={handleEditSubmit} style={{ marginTop: 20 }}>
        <div>
          <label>
            Student Name:{' '}
            <input
              type="text"
              name="studentName"
              value={formData.studentName}
              onChange={handleInputChange}
            />
          </label>
        </div>
        <div>
          <label>
            OEN: <input type="text" name="oen" value={formData.oen} onChange={handleInputChange} />
          </label>
        </div>
        <div>
          <label>
            Date:{' '}
            <input type="text" name="date" value={formData.date} onChange={handleInputChange} />
          </label>
        </div>
        <div>
          <label>
            Grade:{' '}
            <input type="text" name="grade" value={formData.grade} onChange={handleInputChange} />
          </label>
        </div>
        <div>
          <label>
            Teacher Name:{' '}
            <input
              type="text"
              name="teacherName"
              value={formData.teacherName}
              onChange={handleInputChange}
            />
          </label>
        </div>
        <button type="submit" style={{ marginTop: 10 }}>
          Fill &amp; Preview
        </button>
      </form>

      {/* Modified PDF preview and download link */}
      {modifiedPdfUrl && (
        <div style={{ marginTop: 20 }}>
          <h3>Modified PDF Preview:</h3>
          <Document file={modifiedPdfUrl}>
            <Page pageNumber={1} renderTextLayer />
          </Document>
          <a href={modifiedPdfUrl} download="edited-report-card.pdf">
            <button>Download Edited Report Card</button>
          </a>
        </div>
      )}
    </div>
  )
}

export default ReportCardEditorAcroForm
