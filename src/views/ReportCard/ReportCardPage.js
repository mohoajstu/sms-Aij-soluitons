import { useState } from "react";
import ReportCardEditor from "./ReportCardEditor";

function ReportCardPage() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [uploadedPdf, setUploadedPdf] = useState(null);

  // 📌 Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
      const fileUrl = URL.createObjectURL(file);
      setUploadedPdf(fileUrl);
      setSelectedReport("uploaded"); // Set as a new type
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: 20 }}>
      <h2>Select or Upload a Report Card</h2>

      {/* Predefined Report Card Options */}
      <div>
        <button onClick={() => setSelectedReport("kindergarten")}>
          Kindergarten
        </button>
        <button onClick={() => setSelectedReport("grade1to6")}>
          Grade 1-6
        </button>
        <button onClick={() => setSelectedReport("grade7to8")}>
          Grade 7-8
        </button>
        <button onClick={() => setSelectedReport("quran")}>
          Quran Report Card
        </button>
      </div>

      {/* File Upload Option */}
      <div style={{ marginTop: "20px" }}>
        <h3>Or Upload Your Own Report Card</h3>
        <input type="file" accept="application/pdf" onChange={handleFileUpload} />
      </div>

      {/* Load the selected report card */}
      {selectedReport && (
        <ReportCardEditor pdfPath={uploadedPdf || `/assets/ReportCards/${selectedReport}.pdf`} />
      )}
    </div>
  );
}

export default ReportCardPage;
