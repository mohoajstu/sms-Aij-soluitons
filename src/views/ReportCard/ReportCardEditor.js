import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { autoPlaceFields } from "./autoPlaceFields";

// 🚀 Force the correct PDF.js Worker version
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

function ReportCardEditor() {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [modifiedPdfUrl, setModifiedPdfUrl] = useState(null);

  // Handle file upload and process with OCR
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
      const fileUrl = URL.createObjectURL(file);
      setPdfUrl(fileUrl);

      // Run OCR and add fields
      const updatedPdfUrl = await autoPlaceFields(file);
      setModifiedPdfUrl(updatedPdfUrl);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: 20 }}>
      <h2>Upload & Edit Report Card</h2>
      <input type="file" accept="application/pdf" onChange={handleFileUpload} />

      {pdfUrl && (
        <div>
          <h3>Uploaded PDF Preview:</h3>
          <Document file={pdfUrl}>
            <Page pageNumber={1} renderTextLayer />
          </Document>
        </div>
      )}

      {modifiedPdfUrl && (
        <div>
          <h3>Edited PDF:</h3>
          <Document file={modifiedPdfUrl}>
            <Page pageNumber={1} renderTextLayer />
          </Document>
          <a href={modifiedPdfUrl} download="edited-report-card.pdf">
            <button>Download Edited Report Card</button>
          </a>
        </div>
      )}
    </div>
  );
}

export default ReportCardEditor;
