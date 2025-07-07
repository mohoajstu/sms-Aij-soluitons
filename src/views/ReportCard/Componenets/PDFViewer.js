import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min?url';
import { PDFDocument } from 'pdf-lib';
import { CButton, CSpinner } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilChevronLeft, cilChevronRight, cilZoomIn, cilZoomOut } from '@coreui/icons';
import PropTypes from 'prop-types';

// Set up the worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PDFViewer = ({ pdfUrl, className = '', formData = {}, showPreview = false, onFilledPdfGenerated = null }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [filledPdfUrl, setFilledPdfUrl] = useState(null);
  const [filledPdfBytes, setFilledPdfBytes] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const canvasRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // Auto-retry configuration
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s exponential backoff

  // Debug effect to log PDF URL changes
  useEffect(() => {
    console.log('PDFViewer: PDF URL changed to:', pdfUrl);
    if (pdfUrl) {
      setRetryCount(0); // Reset retry count on new PDF
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
    // Only update if there's meaningful form data and preview is enabled
    const hasFormData = Object.keys(formData).some(key => 
      formData[key] !== null && formData[key] !== undefined && formData[key] !== ''
    );
    
    if (showPreview && pdfUrl && hasFormData) {
      console.log('PDFViewer: Form data changed, updating PDF preview');
      fillPDFWithFormData();
    } else if (!showPreview && filledPdfUrl) {
      // Reset to original PDF when preview is disabled
      console.log('PDFViewer: Preview disabled, resetting to original PDF');
      setFilledPdfUrl(null);
      loadPDF();
    }
  }, [formData, showPreview, pdfUrl]);

  // Cleanup retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const loadPDF = async (urlOverride = null, isAutoRetry = false) => {
    try {
      setLoading(true);
      if (!isAutoRetry) {
        setError(null);
        setIsRetrying(false);
      } else {
        setIsRetrying(true);
      }
      
      const urlToLoad = urlOverride || filledPdfUrl || pdfUrl;
      console.log('PDFViewer: Loading PDF from:', urlToLoad);
      
      const loadingTask = pdfjsLib.getDocument(urlToLoad);
      const pdf = await loadingTask.promise;
      
      console.log('PDFViewer: PDF loaded successfully with', pdf.numPages, 'pages');
      
      setPdfDocument(pdf);
      setNumPages(pdf.numPages);
      setPageNumber(1);
      setLoading(false);
      setError(null);
      setRetryCount(0); // Reset retry count on success
      setIsRetrying(false);
      
    } catch (error) {
      console.error('PDFViewer: Error loading PDF:', error);
      setLoading(false);
      setIsRetrying(false);
      
      // Check if this is a temporary network error that we should retry
      const isRetryableError = error.message.includes('ERR_FILE_NOT_FOUND') || 
                              error.message.includes('UnexpectedResponseException') ||
                              error.message.includes('network') ||
                              error.status === 0;
      
      if (isRetryableError && retryCount < MAX_RETRIES && !isAutoRetry) {
        console.log(`PDFViewer: Retryable error detected, scheduling retry ${retryCount + 1}/${MAX_RETRIES}`);
        setRetryCount(prev => prev + 1);
        
        // Schedule automatic retry with exponential backoff
        const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        retryTimeoutRef.current = setTimeout(() => {
          loadPDF(urlOverride, true);
        }, delay);
        
        // Show a less alarming message for automatic retries
        setError(`Loading PDF... (retry ${retryCount + 1}/${MAX_RETRIES})`);
      } else {
        // Only show full error after all retries exhausted or for non-retryable errors
        setError(error.message || 'Failed to load PDF');
      }
    }
  };

  const fillPDFWithFormData = async () => {
    try {
      // Reduce console spam - only log when there's meaningful form data
      const formDataKeys = Object.keys(formData).filter(key => 
        formData[key] !== null && formData[key] !== undefined && formData[key] !== ''
      );
      
      if (formDataKeys.length === 0) {
        console.log('PDFViewer: No form data to fill');
        return;
      }
      
      console.log(`PDFViewer: Filling PDF with ${formDataKeys.length} form fields`);
      
      // Fetch the original PDF
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch PDF file');
      }
      
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Get the form from the PDF
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      // Only log field details in debug mode or when there are issues
      const isDebugMode = localStorage.getItem('pdfDebug') === 'true';
      
      if (isDebugMode) {
        console.log(`PDFViewer: Found ${fields.length} form fields in PDF`);
        const allPdfFieldNames = fields.map(field => ({
          name: field.getName(),
          type: field.constructor.name
        }));
        console.log('PDFViewer: All PDF fields:', allPdfFieldNames);
      }
      
      // Track filling statistics
      let filledCount = 0;
      let matchedFields = [];
      let unmatchedFormData = [];
      let lastFilledFieldPage = null;
      
      // Fill fields based on form data
      Object.entries(formData).forEach(([formKey, value]) => {
        // Skip empty values but allow false for checkboxes
        if (value === null || value === undefined || value === '') return;
        
        let fieldFilled = false;
        
        // Try to find matching PDF field by various name patterns
        const possibleFieldNames = generateFieldNameVariations(formKey);
        
        for (const fieldName of possibleFieldNames) {
          try {
            const field = form.getFieldMaybe(fieldName);
            if (field) {
              const success = fillPDFField(field, value);
              if (success) {
                filledCount++;
                
                // Try to get the page where this field is located
                try {
                  const fieldPages = field.acroField.getWidgets().map(widget => {
                    const pageRef = widget.getP();
                    const pageIndex = pdfDoc.catalog.getPages().findIndex(page => page.ref === pageRef);
                    return pageIndex + 1; // Convert to 1-based page number
                  });
                  
                  if (fieldPages.length > 0) {
                    lastFilledFieldPage = fieldPages[0];
                  }
                } catch (pageError) {
                  // Silently handle page detection errors
                }
                
                matchedFields.push({ 
                  formKey, 
                  pdfField: fieldName, 
                  value: value.toString(),
                  type: field.constructor.name,
                  page: lastFilledFieldPage
                });
                fieldFilled = true;
                break;
              }
            }
          } catch (error) {
            if (isDebugMode) {
              console.warn(`PDFViewer: Error trying field ${fieldName}:`, error.message);
            }
          }
        }
        
        if (!fieldFilled) {
          unmatchedFormData.push(formKey);
        }
      });
      
      console.log(`PDFViewer: Successfully filled ${filledCount}/${formDataKeys.length} fields`);
      
      // Only log unmatched fields if in debug mode or if there are many unmatched
      if (isDebugMode || unmatchedFormData.length > 5) {
        console.log('PDFViewer: Unmatched form data keys:', unmatchedFormData);
        console.log('PDFViewer: Consider adding these field names to the specific mappings in generateFieldNameVariations()');
      }
      
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
      setFilledPdfBytes(filledPdfBytes);
      
      // Notify parent component about the filled PDF bytes
      if (onFilledPdfGenerated) {
        onFilledPdfGenerated(filledPdfBytes);
      }
      
      // Load the filled PDF
      await loadPDF(newFilledPdfUrl);
      
      // Navigate to the page of the last filled field if available
      if (lastFilledFieldPage && lastFilledFieldPage !== pageNumber) {
        setPageNumber(lastFilledFieldPage);
      }
      
    } catch (error) {
      console.error('PDFViewer: Error filling PDF with form data:', error);
      // Fall back to original PDF if filling fails
      loadPDF();
    }
  };

  // Generate possible field name variations for a form key
  const generateFieldNameVariations = (formKey) => {
    const variations = [formKey];
    
    // Add exact mappings based on the exact PDF field names provided by the user
    const exactFieldMappings = {
      // The form uses the exact PDF field names, so map them to themselves first
      // Basic Information - Using actual PDF field names as keys
      'student': ['student'],
      'grade': ['grade'],
      'teacher': ['teacher'],
      'OEN': ['OEN'],
      'board': ['board'],
      'school': ['school'],
      'schoolAddress': ['schoolAddress'],
      'boardAddress': ['boardAddress'],
      'principal': ['principal'],
      'telephone': ['telephone'],
      
      // Attendance - Using actual PDF field names
      'daysAbsent': ['daysAbsent'],
      'totalDaysAbsent': ['totalDaysAbsent'],
      'timesLate': ['timesLate'],
      'totalTimesLate': ['totalTimesLate'],
      
      // Learning Skills - Using actual PDF field names
      'responsibility1': ['responsibility1'],
      'responsibility2': ['responsibility2'],
      'organization1': ['organization1'],
      'organization2': ['organization2'],
      'independentWork1': ['independentWork1'],
      'independentWork2': ['independentWork2'],
      'collaboration1': ['collaboration1'],
      'collaboration2': ['collaboration2'],
      'initiative1': ['initiative1'],
      'initiative2': ['initiative2'],
      'selfRegulation1': ['selfRegulation1'],
      'selfRegulation2': ['selfRegulation2'],
      
      // Comments and Next Steps
      'strengthsAndNextStepsForImprovement': ['strengthsAndNextStepsForImprovement'],
      'nextGrade': ['nextGrade'],
      
      // Language - Using actual PDF field names
      'nativeLanguage': ['nativeLanguage'],
      'languageStrengthAndNextStepsForImprovement': ['languageStrengthAndNextStepsForImprovement'],
      'languageMarkReport1': ['languageMarkReport1'],
      'languageMarkReport2': ['languageMarkReport2'],
      
      // French - Using actual PDF field names
      'frenchStrengthAndNextStepsForImprovement': ['frenchStrengthAndNextStepsForImprovement'],
      'frenchListeningMarkReport1': ['frenchListeningMarkReport1'],
      'frenchListeningMarkReport2': ['frenchListeningMarkReport2'],
      'frenchSpeakingMarkReport1': ['frenchSpeakingMarkReport1'],
      'frenchSpeakingMarkReport2': ['frenchSpeakingMarkReport2'],
      'frenchReadingMarkReport1': ['frenchReadingMarkReport1'],
      'frenchReadingMarkReport2': ['frenchReadingMarkReport2'],
      'frenchWritingMarkReport1': ['frenchWritingMarkReport1'],
      'frenchWritingMarkReport2': ['frenchWritingMarkReport2'],
      
      // Native Language - Using actual PDF field names
      'nativeLanguageStrengthAndNextStepsForImprovement': ['nativeLanguageStrengthAndNextStepsForImprovement'],
      'nativeLanguageMarkReport1': ['nativeLanguageMarkReport1'],
      'nativeLanguageMarkReport2': ['nativeLanguageMarkReport2'],
      
      // Math - Using actual PDF field names
      'mathStrengthAndNextStepsForImprovement': ['mathStrengthAndNextStepsForImprovement'],
      'mathMarkReport1': ['mathMarkReport1'],
      'mathMarkReport2': ['mathMarkReport2'],
      
      // Science - Using actual PDF field names
      'scienceAndNextStepsForImprovement': ['scienceAndNextStepsForImprovement'],
      'scienceMarkReport1': ['scienceMarkReport1'],
      'scienceMarkReport2': ['scienceMarkReport2'],
      
      // Social Studies - Using actual PDF field names
      'socialStudiesStrengthAndNextStepsForImprovement': ['socialStudiesStrengthAndNextStepsForImprovement'],
      'socialStudiesMarkReport1': ['socialStudiesMarkReport1'],
      'socialStudiesMarkReport2': ['socialStudiesMarkReport2'],
      
      // Health and PE - Using actual PDF field names
      'healthAndPEStrengthsAndNextStepsForImprovement': ['healthAndPEStrengthsAndNextStepsForImprovement'],
      'healthMarkReport1': ['healthMarkReport1'],
      'healthMarkReport2': ['healthMarkReport2'],
      'peMarkReport1': ['peMarkReport1'],
      'peMarkReport2': ['peMarkReport2'],
      
      // Arts - Using actual PDF field names
      'artsStrengthAndNextStepsForImprovement': ['artsStrengthAndNextStepsForImprovement'],
      'danceMarkReport1': ['danceMarkReport1'],
      'danceMarkReport2': ['danceMarkReport2'],
      'dramaMarkReport1': ['dramaMarkReport1'],
      'dramaMarkReport2': ['dramaMarkReport2'],
      'musicMarkReport1': ['musicMarkReport1'],
      'musicMarkReport2': ['musicMarkReport2'],
      'visualArtsMarkReport1': ['visualArtsMarkReport1'],
      'visualArtsMarkReport2': ['visualArtsMarkReport2'],
      
      // Other - Using actual PDF field names
      'other': ['other'],
      'otherStrengthAndNextStepsForImprovement': ['otherStrengthAndNextStepsForImprovement'],
      'otherMarkReport1': ['otherMarkReport1'],
      'otherMarkReport2': ['otherMarkReport2'],
      
      // ERS Date - Using actual PDF field names
      'ERSYear': ['ERSYear'],
      'ERSMonth': ['ERSMonth'],
      'ERSDay': ['ERSDay'],
      
      // Keep existing checkbox mappings - these are already correct
      'languageNA': ['Language Na', 'languageNA', 'Language NA', 'Language_NA'],
      'languageESL': ['Language Esl', 'languageESL', 'Language ESL', 'Language_ESL'],
      'languageIEP': ['Language Iep', 'languageIEP', 'Language IEP', 'Language_IEP'],
      'ERSBenchmarkNo': ['ERSBenchmarkNo', 'ERS Benchmark No', 'ERS_Benchmark_No'],
      
      // Add mappings for any legacy form field names that might still be used
      'student_name': ['student'],
      'teacher_name': ['teacher'],
      'oen': ['OEN'],
      'school_address': ['schoolAddress'],
      'board_address': ['boardAddress'],
      'days_absent': ['daysAbsent'],
      'total_days_absent': ['totalDaysAbsent'],
      'times_late': ['timesLate'],
      'total_times_late': ['totalTimesLate']
    };
    
    // Add exact mappings if they exist
    if (exactFieldMappings[formKey]) {
      variations.push(...exactFieldMappings[formKey]);
    }
    
    // Convert underscores to spaces and title case
    const titleCase = formKey
      .replace(/[_-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    variations.push(titleCase);
    
    // All uppercase
    variations.push(formKey.toUpperCase());
    variations.push(titleCase.toUpperCase());
    
    // Remove underscores and hyphens
    variations.push(formKey.replace(/[_-]/g, ''));
    
    // CamelCase
    const camelCase = formKey
      .split(/[_-]/)
      .map((word, index) => 
        index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join('');
    variations.push(camelCase);
    
    // PascalCase
    const pascalCase = formKey
      .split(/[_-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    variations.push(pascalCase);
    
    // Add common field name patterns
    if (formKey.includes('name')) {
      variations.push('Name', 'NAME', 'Student', 'STUDENT');
    }
    if (formKey.includes('grade')) {
      variations.push('Grade', 'GRADE');
    }
    if (formKey.includes('school')) {
      variations.push('School', 'SCHOOL');
    }
    
    return [...new Set(variations)]; // Remove duplicates
  };

  // Fill a specific PDF field with a value
  const fillPDFField = (field, value) => {
    try {
      const fieldType = field.constructor.name;
      const fieldName = field.getName();
      
      console.log(`PDFViewer: Attempting to fill field "${fieldName}" (${fieldType}) with value:`, value, typeof value);
      
      switch (fieldType) {
        case 'PDFTextField':
          const stringValue = value.toString();
          field.setText(stringValue);
          console.log(`PDFViewer: ✅ Successfully filled text field "${fieldName}" with: "${stringValue}"`);
          return true;
          
        case 'PDFCheckBox':
        case 'PDFCheckBox2':  // Add support for PDFCheckBox2 type
          // Handle boolean values correctly
          let shouldCheck = false;
          
          if (typeof value === 'boolean') {
            shouldCheck = value;
          } else if (typeof value === 'string') {
            const lowerValue = value.toLowerCase().trim();
            shouldCheck = ['true', 'yes', '1', 'checked', 'x', 'on'].includes(lowerValue);
          } else if (typeof value === 'number') {
            shouldCheck = value === 1;
          }
          
          if (shouldCheck) {
            field.check();
            console.log(`PDFViewer: ✅ Successfully checked checkbox "${fieldName}" (${fieldType})`);
          } else {
            field.uncheck();
            console.log(`PDFViewer: ✅ Successfully unchecked checkbox "${fieldName}" (${fieldType})`);
          }
          return true;
          
        case 'PDFDropdown':
          const stringVal = value.toString();
          const options = field.getOptions();
          if (options.includes(stringVal)) {
            field.select(stringVal);
            console.log(`PDFViewer: ✅ Successfully selected dropdown option "${stringVal}" for field "${fieldName}"`);
            return true;
          }
          // Try case-insensitive match
          const matchingOption = options.find(opt => 
            opt.toLowerCase() === stringVal.toLowerCase()
          );
          if (matchingOption) {
            field.select(matchingOption);
            console.log(`PDFViewer: ✅ Successfully selected dropdown option "${matchingOption}" (case-insensitive) for field "${fieldName}"`);
            return true;
          }
          console.warn(`PDFViewer: ❌ Could not match dropdown value "${stringVal}" for field "${fieldName}". Available options:`, options);
          break;
          
        case 'PDFRadioGroup':
          try {
            const radioVal = value.toString();
            field.select(radioVal);
            console.log(`PDFViewer: ✅ Successfully selected radio option "${radioVal}" for field "${fieldName}"`);
            return true;
          } catch (radioError) {
            // Try with available options
            const radioOptions = field.getOptions();
            const matchingRadioOption = radioOptions.find(opt => 
              opt.toLowerCase() === value.toString().toLowerCase()
            );
            if (matchingRadioOption) {
              field.select(matchingRadioOption);
              console.log(`PDFViewer: ✅ Successfully selected radio option "${matchingRadioOption}" (case-insensitive) for field "${fieldName}"`);
              return true;
            }
            console.warn(`PDFViewer: ❌ Could not match radio value "${value}" for field "${fieldName}". Available options:`, radioOptions);
          }
          break;
          
        default:
          // Try to set as text for unknown field types
          if (field.setText) {
            field.setText(value.toString());
            console.log(`PDFViewer: ✅ Successfully filled unknown field type "${fieldName}" (${fieldType}) as text`);
            return true;
          }
          console.warn(`PDFViewer: ❌ Unknown field type "${fieldType}" for field "${fieldName}"`);
          break;
      }
    } catch (error) {
      console.error(`PDFViewer: ❌ Error filling field "${field.getName()}" of type ${field.constructor.name}:`, error);
    }
    
    return false;
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
    console.log('PDFViewer: Manual retry requested for:', pdfUrl);
    setRetryCount(0); // Reset retry count for manual retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
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

  if (error && !isRetrying) {
    const isRetryableError = error.includes('Loading PDF...') || 
                            error.includes('ERR_FILE_NOT_FOUND') || 
                            error.includes('UnexpectedResponseException');
    
    return (
      <div className={`pdf-viewer-container ${className}`}>
        <div className="pdf-error" style={{ padding: '20px', textAlign: 'center' }}>
          {isRetryableError ? (
            <>
              <h5>PDF Loading</h5>
              <p>{error}</p>
              <div className="d-flex justify-content-center align-items-center mt-3">
                <CSpinner size="sm" className="me-2" />
                <span>Retrying automatically...</span>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
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
            <span className="badge bg-success me-2">
              Live Preview {Object.keys(formData).filter(k => formData[k] && formData[k].toString().trim() !== '').length > 0 && 
                `(${Object.keys(formData).filter(k => formData[k] && formData[k].toString().trim() !== '').length} fields filled)`}
            </span>
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
            <p>
              {isRetrying ? (
                <>Loading PDF... (retry {retryCount}/{MAX_RETRIES})</>
              ) : (
                <>Loading PDF...</>
              )}
            </p>
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
  showPreview: PropTypes.bool,
  onFilledPdfGenerated: PropTypes.func
};

export default PDFViewer; 