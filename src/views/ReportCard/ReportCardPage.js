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
      <ReportCardEditor pdfSource={pdfSource} />
    </div>
  )
}

export default ReportCardPage
