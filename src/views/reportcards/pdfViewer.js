import '@syncfusion/ej2-base/styles/material.css';
import '@syncfusion/ej2-buttons/styles/material.css';
import '@syncfusion/ej2-inputs/styles/material.css';
import '@syncfusion/ej2-popups/styles/material.css';
import '@syncfusion/ej2-react-pdfviewer/styles/material.css';

import React, { useRef } from "react";
import {
  PdfViewerComponent,
  Toolbar,
  Magnification,
  Navigation,
  Annotation,
  LinkAnnotation,
  TextSearch,
  TextSelection,
  Print,
  ThumbnailView,
  BookmarkView,
  FormFields,
  FormDesigner,
  Inject
} from "@syncfusion/ej2-react-pdfviewer";

const PdfViewer = () => {
    const viewerRef = useRef(null);

    // Function to add form fields dynamically
    const addFormFields = () => {
        if (viewerRef.current) {
            const viewer = viewerRef.current;

            viewer.formDesignerModule.addFormField("Textbox", {
                name: "studentName",
                bounds: { x: 100, y: 200, width: 150, height: 25 },
                pageNumber: 1,
                value: "Enter student name",
            });

            viewer.formDesignerModule.addFormField("Textbox", {
                name: "grade",
                bounds: { x: 300, y: 200, width: 100, height: 25 },
                pageNumber: 1,
                value: "Enter grade",
            });

            viewer.formDesignerModule.addFormField("Textbox", {
                name: "comments",
                bounds: { x: 100, y: 250, width: 300, height: 50 },
                pageNumber: 1,
                value: "Enter comments",
            });
        }
    };

    // // Function to save filled PDF
    // const savePdf = async () => {
    //     const viewer = viewerRef.current;
    //     const pdfData = await viewer.exportAsBlob(); // Get the edited PDF as a Blob

    //     const formData = new FormData();
    //     formData.append("file", pdfData, "filled-report-card.pdf");

    //     await fetch("http://localhost:5000/upload", {
    //         method: "POST",
    //         body: formData
    //     });
    // };

    return (
        <div style={{ height: "100vh", width: "100%" }}>
            <button onClick={addFormFields}>Add Extra Fields</button>
            {/* <button onClick={savePdf}>Save Report Card</button> */}
            <PdfViewerComponent
                ref={viewerRef}
                id="pdfViewer"
                documentPath="/kg-report.pdf" // Predefined fillable template
                serviceUrl="https://ej2services.syncfusion.com/production/web-services/api/pdfviewer"
                enableFormFields={true} // Enable editing of predefined text boxes
                // showDownloadButton={true} // Allow teachers to download
                style={{ height: "90%", width: "100%" }}
            >
                <Inject services={[Toolbar, Magnification, Navigation, Annotation, LinkAnnotation, TextSearch, TextSelection, Print, ThumbnailView, BookmarkView, FormFields, FormDesigner]} />
            </PdfViewerComponent>
        </div>
    );
};

export default PdfViewer;

