import { PDFDocument } from "pdf-lib";

function ReportCardSave({ pdfUrl }) {
  const savePdf = async () => {
    const existingPdfBytes = await fetch(pdfUrl).then((res) =>
      res.arrayBuffer()
    );
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    // Set user inputs (Example: Replace with real form values)
    form.getTextField("studentName").setText("John Doe");
    form.getTextField("grade").setText("A+");
    form.getTextField("teacherComments").setText("Excellent progress!");

    // Generate updated PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });

    // Trigger download
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "final-report-card.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return <button onClick={savePdf}>Download Report Card</button>;
}

export default ReportCardSave;
