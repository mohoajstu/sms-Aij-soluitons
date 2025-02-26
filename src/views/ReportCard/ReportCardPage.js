import { useState } from 'react'
import ReportCardEditor from './ReportCardEditor'

function ReportCardPage() {
  const [selectedReport, setSelectedReport] = useState(null)
  const [pdfSource, setPdfSource] = useState(null)

  // Handle file upload from teacher
  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file && file.type === 'application/pdf') {
      setPdfSource(file)
      setSelectedReport('uploaded')
    } else {
      alert('Please upload a valid PDF file.')
    }
  }

  // For predefined report card options
  const handlePredefinedSelection = (reportType) => {
    // Example: your PDF files might be stored in /public/assets/ReportCards
    setPdfSource(`/assets/ReportCards/${reportType}.pdf`)
    setSelectedReport(reportType)
  }

  return (
    <div style={{ textAlign: 'center', marginTop: 20 }}>
      <h2>Select or Upload a Report Card</h2>

      {/* Predefined buttons */}
      <div>
        <button onClick={() => handlePredefinedSelection('kindergarten')}>Kindergarten</button>
        <button onClick={() => handlePredefinedSelection('grade1to6')}>Grade 1-6</button>
        <button onClick={() => handlePredefinedSelection('grade7to8')}>Grade 7-8</button>
        <button onClick={() => handlePredefinedSelection('quran')}>Quran Report Card</button>
      </div>

      {/* File upload */}
      <div style={{ marginTop: 20 }}>
        <h3>Or Upload Your Own Report Card (PDF)</h3>
        <input type="file" accept="application/pdf" onChange={handleFileUpload} />
      </div>

      {/* If a selection was made, show the editor */}
      {selectedReport && <ReportCardEditor pdfSource={pdfSource} />}
    </div>
  )
}

export default ReportCardPage
