import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min?url'; // Vite static asset import
import { PDFDocument } from 'pdf-lib';
import { CButton, CSpinner } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilChevronLeft, cilChevronRight, cilZoomIn, cilZoomOut } from '@coreui/icons';
import PropTypes from 'prop-types';

// Set up the worker for PDF.js - use local worker to avoid CORS issues
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PDFViewer = ({ pdfUrl, className = '', formData = {}, showPreview = false }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(0.8);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [filledPdfUrl, setFilledPdfUrl] = useState(null);
  const canvasRef = useRef(null);

  // Debug effect to log PDF URL changes
  useEffect(() => {
    console.log('PDFViewer: PDF URL changed to:', pdfUrl);
    console.log('PDFViewer: Using local worker:', pdfWorker);
    if (pdfUrl) {
      loadPDF();
    }
  }, [pdfUrl]);

  // Re-render page when pageNumber, scale changes, or when we have a new filled PDF
  useEffect(() => {
    if (pdfDocument && canvasRef.current) {
      renderPage();
    }
  }, [pageNumber, scale, pdfDocument]);

  // Update PDF with form data when formData changes and preview is enabled
  useEffect(() => {
    if (showPreview && pdfUrl && Object.keys(formData).some(key => formData[key])) {
      fillPDFWithFormData();
    } else if (!showPreview && filledPdfUrl) {
      // Reset to original PDF when preview is disabled
      setFilledPdfUrl(null);
      loadPDF();
    }
  }, [formData, showPreview, pdfUrl]);

  const loadPDF = async (urlOverride = null) => {
    try {
      setLoading(true);
      setError(null);
      
      const urlToLoad = urlOverride || filledPdfUrl || pdfUrl;
      console.log('PDFViewer: Loading PDF from:', urlToLoad);
      
      const loadingTask = pdfjsLib.getDocument(urlToLoad);
      const pdf = await loadingTask.promise;
      
      console.log('PDFViewer: PDF loaded successfully with', pdf.numPages, 'pages');
      
      setPdfDocument(pdf);
      setNumPages(pdf.numPages);
      setPageNumber(1);
      setLoading(false);
      
    } catch (error) {
      console.error('PDFViewer: Error loading PDF:', error);
      setError(error.message || 'Failed to load PDF');
      setLoading(false);
    }
  };

  const fillPDFWithFormData = async () => {
    try {
      console.log('PDFViewer: Filling PDF with form data:', formData);
      
      // Fetch the original PDF
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch PDF file');
      }
      
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Get the form from the PDF
      const form = pdfDoc.getForm();
      
      // First, let's inspect all the fields in the PDF to understand the structure
      const fields = form.getFields();
      console.log(`PDFViewer: Found ${fields.length} form fields in PDF:`);
      
      const fieldInfo = fields.map(field => {
        const fieldType = field.constructor.name;
        let additionalInfo = {};
        
        try {
          if (fieldType === 'PDFDropdown') {
            additionalInfo.options = field.getOptions();
          } else if (fieldType === 'PDFRadioGroup') {
            additionalInfo.options = field.getOptions();
          } else if (fieldType === 'PDFCheckBox') {
            additionalInfo.isChecked = field.isChecked();
          }
        } catch (e) {
          // Ignore errors when getting additional info
        }
        
        return {
          name: field.getName(),
          type: fieldType,
          ...additionalInfo
        };
      });
      
      // Log all fields for debugging
      console.table(fieldInfo);
      
      // Group fields by type for easier analysis
      const fieldsByType = fieldInfo.reduce((acc, field) => {
        if (!acc[field.type]) acc[field.type] = [];
        acc[field.type].push(field.name);
        return acc;
      }, {});
      
      console.log('PDFViewer: Fields grouped by type:', fieldsByType);

      // Map form data to PDF fields with multiple field name variations
      const fieldMappings = {
        // Student Information - try multiple field name variations
        'Student': formData.student_name,
        'student_name': formData.student_name,
        'Student Name': formData.student_name,
        'STUDENT NAME': formData.student_name,
        'Name': formData.student_name,
        'name': formData.student_name,
        
        'OEN': formData.oen,
        'oen': formData.oen,
        'Ontario Education Number': formData.oen,
        
        'Grade': formData.grade,
        'grade': formData.grade,
        'GRADE': formData.grade,
        
        'Term': formData.term,
        'term': formData.term,
        'TERM': formData.term,
        'Reporting Period': formData.term,
        
        'Teacher': formData.teacher_name,
        'teacher': formData.teacher_name,
        'teacher_name': formData.teacher_name,
        'Teacher Name': formData.teacher_name,
        'TEACHER': formData.teacher_name,
        
        'School Year': formData.school_year,
        'school_year': formData.school_year,
        'SCHOOL YEAR': formData.school_year,
        'Year': formData.school_year,
        
        'Date': formData.date,
        'date': formData.date,
        'DATE': formData.date,
        'Report Date': formData.date,
        
        'Parent': formData.parent_name,
        'parent': formData.parent_name,
        'parent_name': formData.parent_name,
        'Parent Name': formData.parent_name,
        'Parent/Guardian': formData.parent_name,
        
        // School Information
        'Board': formData.board,
        'board': formData.board,
        'BOARD': formData.board,
        'School Board': formData.board,
        
        'School': formData.school,
        'school': formData.school,
        'SCHOOL': formData.school,
        'School Name': formData.school,
        
        'Address': formData.address_1,
        'address': formData.address_1,
        'address_1': formData.address_1,
        'Address 1': formData.address_1,
        'School Address': formData.address_1,
        
        'Address2': formData.address_2,
        'address_2': formData.address_2,
        'Address 2': formData.address_2,
        'City Province Postal': formData.address_2,
        
        'Principal': formData.principal,
        'principal': formData.principal,
        'PRINCIPAL': formData.principal,
        'Principal Name': formData.principal,
        
        'Telephone': formData.telephone,
        'telephone': formData.telephone,
        'TELEPHONE': formData.telephone,
        'Phone': formData.telephone,
        
        // Attendance
        'Days Absent': formData.days_absent,
        'days_absent': formData.days_absent,
        'DAYS ABSENT': formData.days_absent,
        'Absent': formData.days_absent,
        
        'Total Days Absent': formData.total_days_absent,
        'total_days_absent': formData.total_days_absent,
        'TOTAL DAYS ABSENT': formData.total_days_absent,
        'Total Absent': formData.total_days_absent,
        
        'Times Late': formData.times_late,
        'times_late': formData.times_late,
        'TIMES LATE': formData.times_late,
        'Late': formData.times_late,
        
        'Total Times Late': formData.total_times_late,
        'total_times_late': formData.total_times_late,
        'TOTAL TIMES LATE': formData.total_times_late,
        'Total Late': formData.total_times_late,
        
        // Learning Skills and Work Habits
        'Responsibility': formData.responsibility,
        'responsibility': formData.responsibility,
        'RESPONSIBILITY': formData.responsibility,
        
        'Organization': formData.organization,
        'organization': formData.organization,
        'ORGANIZATION': formData.organization,
        
        'Independent Work': formData.independent_work,
        'independent_work': formData.independent_work,
        'INDEPENDENT WORK': formData.independent_work,
        'Independent': formData.independent_work,
        
        'Collaboration': formData.collaboration,
        'collaboration': formData.collaboration,
        'COLLABORATION': formData.collaboration,
        
        'Initiative': formData.initiative,
        'initiative': formData.initiative,
        'INITIATIVE': formData.initiative,
        
        'Self-Regulation': formData.self_regulation,
        'self_regulation': formData.self_regulation,
        'SELF-REGULATION': formData.self_regulation,
        'Self Regulation': formData.self_regulation,
        
        // Comments and Signatures
        'Strengths and Next Steps': formData.strengths_next_steps,
        'strengths_next_steps': formData.strengths_next_steps,
        'STRENGTHS AND NEXT STEPS': formData.strengths_next_steps,
        'Strengths': formData.strengths_next_steps,
        'Next Steps': formData.strengths_next_steps,
        'Comments': formData.strengths_next_steps,
        
        'Teacher Comments': formData.teacher_comments,
        'teacher_comments': formData.teacher_comments,
        'TEACHER COMMENTS': formData.teacher_comments,
        'Additional Comments': formData.teacher_comments,
        
        'Teacher Signature': formData.teacher_signature,
        'teacher_signature': formData.teacher_signature,
        'TEACHER SIGNATURE': formData.teacher_signature,
        'Teacher Sig': formData.teacher_signature,
        
        'Parent Signature': formData.parent_signature,
        'parent_signature': formData.parent_signature,
        'PARENT SIGNATURE': formData.parent_signature,
        'Parent Sig': formData.parent_signature,
        
        'Principal Signature': formData.principal_signature,
        'principal_signature': formData.principal_signature,
        'PRINCIPAL SIGNATURE': formData.principal_signature,
        'Principal Sig': formData.principal_signature
      };
      
      // Fill the form fields
      let filledFieldsCount = 0;
      let matchedFields = [];
      let unmatchedFields = [];
      
      Object.entries(fieldMappings).forEach(([fieldName, value]) => {
        try {
          const field = form.getFieldMaybe(fieldName);
          if (field && value && value.toString().trim() !== '') {
            // Handle different field types
            const fieldType = field.constructor.name;
            
            switch (fieldType) {
              case 'PDFTextField':
                field.setText(value.toString());
                filledFieldsCount++;
                matchedFields.push({ name: fieldName, type: fieldType, value: value.toString() });
                break;
                
              case 'PDFCheckBox':
                // For checkboxes, check if the value indicates it should be checked
                const checkValue = value.toString().toLowerCase();
                if (['true', 'yes', '1', 'checked', 'x', 'e', 'g', 's', 'n'].includes(checkValue)) {
                  field.check();
                  filledFieldsCount++;
                  matchedFields.push({ name: fieldName, type: fieldType, value: 'checked' });
                }
                break;
                
              case 'PDFDropdown':
                // For dropdowns, try to set the value if it's in the options
                const options = field.getOptions();
                if (options.includes(value.toString())) {
                  field.select(value.toString());
                  filledFieldsCount++;
                  matchedFields.push({ name: fieldName, type: fieldType, value: value.toString() });
                }
                break;
                
              case 'PDFRadioGroup':
                // For radio groups, try to select the option
                try {
                  field.select(value.toString());
                  filledFieldsCount++;
                  matchedFields.push({ name: fieldName, type: fieldType, value: value.toString() });
                } catch (radioError) {
                  // Ignore radio selection errors for now
                }
                break;
                
              default:
                // Try to set as text for unknown field types
                if (field.setText) {
                  field.setText(value.toString());
                  filledFieldsCount++;
                  matchedFields.push({ name: fieldName, type: fieldType, value: value.toString() });
                }
                break;
            }
          } else if (!field) {
            unmatchedFields.push(fieldName);
          }
        } catch (error) {
          // Ignore individual field errors to prevent breaking the whole process
          console.warn(`PDFViewer: Error filling field ${fieldName}:`, error);
        }
      });
      
      console.log(`PDFViewer: Filled ${filledFieldsCount} form fields out of ${fields.length} total fields`);
      console.log('PDFViewer: Successfully matched fields:', matchedFields);
      console.log('PDFViewer: Unmatched field names we tried:', unmatchedFields);
      
      // Generate the filled PDF bytes
      const filledPdfBytes = await pdfDoc.save();
      
      // Create a blob URL for the filled PDF
      const blob = new Blob([filledPdfBytes], { type: 'application/pdf' });
      const newFilledPdfUrl = URL.createObjectURL(blob);
      
      // Clean up previous blob URL
      if (filledPdfUrl) {
        URL.revokeObjectURL(filledPdfUrl);
      }
      
      setFilledPdfUrl(newFilledPdfUrl);
      
      // Load the filled PDF
      await loadPDF(newFilledPdfUrl);
      
    } catch (error) {
      console.error('PDFViewer: Error filling PDF with form data:', error);
      // Fall back to original PDF if filling fails
      loadPDF();
    }
  };

  const renderPage = async () => {
    if (!pdfDocument || !canvasRef.current) return;
    
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      
      await page.render(renderContext).promise;
      console.log('PDFViewer: Page', pageNumber, 'rendered successfully');
      
    } catch (error) {
      console.error('PDFViewer: Error rendering page:', error);
      setError(`Failed to render page ${pageNumber}: ${error.message}`);
    }
  };

  const goToPrevPage = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
  };

  const goToNextPage = () => {
    if (pageNumber < numPages) {
      setPageNumber(pageNumber + 1);
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 2.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.4));
  };

  const handleRetry = () => {
    console.log('PDFViewer: Retrying PDF load for:', pdfUrl);
    loadPDF();
  };

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (filledPdfUrl) {
        URL.revokeObjectURL(filledPdfUrl);
      }
    };
  }, [filledPdfUrl]);

  // Don't render anything if no PDF URL is provided
  if (!pdfUrl) {
    return (
      <div className={`pdf-viewer-container ${className}`}>
        <div className="pdf-error" style={{ padding: '20px', textAlign: 'center' }}>
          <h5>No PDF Selected</h5>
          <p>Please select a report card type to view the PDF template.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`pdf-viewer-container ${className}`}>
        <div className="pdf-error" style={{ padding: '20px', textAlign: 'center' }}>
          <h5>PDF Loading Error</h5>
          <p>{error}</p>
          <p><small>PDF URL: {pdfUrl}</small></p>
            <CButton 
              color="primary" 
              onClick={handleRetry}
              className="me-2"
            >
            Retry
            </CButton>
        </div>
      </div>
    );
  }

  return (
    <div className={`pdf-viewer-container ${className}`}>
      {/* PDF Controls */}
      <div className="pdf-controls" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '10px',
        borderBottom: '1px solid #dee2e6',
        backgroundColor: '#f8f9fa'
      }}>
        <div className="pdf-navigation" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CButton
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1 || loading}
          >
            <CIcon icon={cilChevronLeft} />
          </CButton>
          
          <span className="pdf-page-info">
            Page {pageNumber} of {numPages || '?'}
          </span>
          
          <CButton
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages || loading}
          >
            <CIcon icon={cilChevronRight} />
          </CButton>
        </div>
        
        <div className="pdf-zoom" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {showPreview && (
            <span className="badge bg-success me-2">Live Form Filling</span>
          )}
          <CButton
            variant="outline"
            size="sm"
            onClick={zoomOut}
            disabled={scale <= 0.4 || loading}
          >
            <CIcon icon={cilZoomOut} />
          </CButton>
          
          <span className="pdf-zoom-info">
            {Math.round(scale * 100)}%
          </span>
          
          <CButton
            variant="outline"
            size="sm"
            onClick={zoomIn}
            disabled={scale >= 2.0 || loading}
          >
            <CIcon icon={cilZoomIn} />
          </CButton>
        </div>
      </div>

      {/* PDF Document */}
      <div className="pdf-document-container" style={{ 
        textAlign: 'center', 
        padding: '20px',
        minHeight: '400px',
        overflow: 'auto',
        position: 'relative'
      }}>
        {loading && (
          <div className="pdf-loading" style={{ padding: '50px' }}>
            <CSpinner color="primary" />
            <p>Loading PDF...</p>
            {showPreview && <p><small>Filling form fields...</small></p>}
          </div>
        )}
        
        {!loading && (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <canvas
              ref={canvasRef}
              style={{
                maxWidth: '100%',
                height: 'auto',
                border: '1px solid #dee2e6',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

PDFViewer.propTypes = {
  pdfUrl: PropTypes.string,
  className: PropTypes.string,
  formData: PropTypes.object,
  showPreview: PropTypes.bool
};

export default PDFViewer; 