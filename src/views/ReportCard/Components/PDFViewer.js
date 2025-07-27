import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min?url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { CButton, CSpinner } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilChevronLeft, cilChevronRight, cilZoomIn, cilZoomOut, cilDescription } from '@coreui/icons';
import PropTypes from 'prop-types';
import { debounce } from 'lodash';

// Set up the worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PDFViewer = React.memo(({ pdfUrl, className = '', formData = {}, showPreview = false, onFilledPdfGenerated = null }) => {
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
  const fillPdfTimeoutRef = useRef(null);
  const latestFormData = useRef(formData);

  // Auto-retry configuration
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s exponential backoff

  // Keep the latest form data in a ref to avoid re-triggering effects too often
  useEffect(() => {
    latestFormData.current = formData;
  }, [formData]);

  // Auto-retry configuration
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

  // Debounced effect to update PDF with form data
  useEffect(() => {
    const hasFormData = Object.keys(latestFormData.current).some(key => 
      latestFormData.current[key] !== null && latestFormData.current[key] !== undefined && latestFormData.current[key] !== ''
    );
    
    if (showPreview && pdfUrl && hasFormData) {
      // Clear any pending fill operations before starting a new one
      if (fillPdfTimeoutRef.current) {
        clearTimeout(fillPdfTimeoutRef.current);
      }
      
      // Debounce the call to fillPDFWithFormData
      fillPdfTimeoutRef.current = setTimeout(() => {
        console.log('PDFViewer: Debounced form data change detected, updating PDF preview');
      fillPDFWithFormData();
      }, 300); // 300ms debounce delay

    } else if (!showPreview && filledPdfUrl) {
      // Reset to original PDF when preview is disabled
      console.log('PDFViewer: Preview disabled, resetting to original PDF');
      setFilledPdfUrl(null);
      loadPDF();
    }

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (fillPdfTimeoutRef.current) {
        clearTimeout(fillPdfTimeoutRef.current);
      }
    };
  }, [formData, showPreview, pdfUrl]);

  // Cleanup retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const isValidUrl = (url) => {
    return url && (url.startsWith('blob:') || url.startsWith('http') || url.startsWith('/'));
  };
  
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
      if (!isValidUrl(urlToLoad)) {
        console.warn('PDFViewer: Aborting load, invalid or missing URL:', urlToLoad);
        setLoading(false);
        setError('Invalid PDF URL. Please check the report card configuration.');
        return;
      }
      
      // Validate PDF path before attempting to load
      if (!urlOverride && !filledPdfUrl) {
        // This is the initial load of the original PDF - validate the path first
        try {
          const pathCheckResponse = await fetch(urlToLoad, { method: 'HEAD' });
          if (!pathCheckResponse.ok) {
            console.error('PDFViewer: PDF not found at path:', urlToLoad);
            setLoading(false);
            setError(`PDF template not found. Please check if the file exists at: ${urlToLoad}`);
            return;
          }
        } catch (pathError) {
          console.error('PDFViewer: Error checking PDF path:', pathError);
          setLoading(false);
          setError(`Unable to access PDF template. Please verify the file path: ${urlToLoad}`);
          return;
        }
      }
      
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
      
      // Provide more user-friendly error messages
      let userFriendlyError = 'Failed to load PDF';
      
      if (error.message.includes('ERR_FILE_NOT_FOUND') || error.message.includes('404')) {
        userFriendlyError = 'PDF template not found. Please check if the file exists.';
      } else if (error.message.includes('Unexpected server response (0)')) {
        userFriendlyError = 'Unable to access PDF template. Please verify the file path.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        userFriendlyError = 'Network error while loading PDF. Please check your connection.';
      } else if (error.message.includes('Invalid PDF')) {
        userFriendlyError = 'Invalid PDF file format. Please check the template file.';
      }
      
      // Make all errors retryable up to MAX_RETRIES
      const isRetryableError = true;
      if (retryCount < MAX_RETRIES && !isAutoRetry) {
        const attempt = isAutoRetry ? retryCount : retryCount + 1;
        console.log(`PDFViewer: Retryable error detected, scheduling retry ${attempt}/${MAX_RETRIES}`);
        setRetryCount(attempt);
        
        // Schedule automatic retry with exponential backoff
        const delay = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        retryTimeoutRef.current = setTimeout(() => {
          loadPDF(urlOverride, true);
        }, delay);
        
        // Show a less alarming message for automatic retries
        setError(`Loading PDF... (retry ${attempt}/${MAX_RETRIES})`);
      } else {
        // Only show full error after all retries exhausted or for non-retryable errors
        setError(userFriendlyError);
      }
    }
  };

  /**
   * Renders text to a canvas and returns it as a PNG data URL.
   */
  const convertTextToImage = async (text, font = '48px "Dancing Script"', color = '#000000') => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    context.font = font;
    const textMetrics = context.measureText(text);
    
    // Set canvas dimensions with some padding
    canvas.width = textMetrics.width + 40; 
    canvas.height = 80;

    // Redraw text on the sized canvas
    context.font = font;
    context.fillStyle = color;
    context.fillText(text, 20, 50);

    return canvas.toDataURL('image/png');
  };

  /**
   * Scales image dimensions to fit within a bounding box while maintaining aspect ratio.
   */
  const scaleToFit = (imgWidth, imgHeight, boxWidth, boxHeight) => {
    const widthRatio = boxWidth / imgWidth;
    const heightRatio = boxHeight / imgHeight;
    const scale = Math.min(widthRatio, heightRatio);
    return {
      width: imgWidth * scale,
      height: imgHeight * scale,
    };
  };

  const fillPDFWithFormData = useCallback(debounce(async () => {
    // Use the most up-to-date form data from the ref
    const currentFormData = latestFormData.current;

    try {
      // Reduce console spam - only log when there's meaningful form data
      const formDataKeys = Object.keys(currentFormData).filter(key => 
        currentFormData[key] !== null && currentFormData[key] !== undefined && currentFormData[key] !== ''
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
      
      // Only log field details in debug mode
      const isDebugMode = localStorage.getItem('pdfDebug') === 'true';
      
      if (isDebugMode) {
        console.log('--- PDF Form Field Debug Mode ---');
      const allPdfFieldNames = fields.map(field => ({
        name: field.getName(),
        type: field.constructor.name
      }));
        console.log('PDFViewer: All available fields in the PDF template:', allPdfFieldNames);
        console.log('---------------------------------');
      }
      
      // Embed the "Dancing Script" font for any potential text operations, though we prefer stamping images
      // This is a fallback and good practice.
      let dancingScriptFont;
      try {
        const fontBytes = await fetch('/fonts/DancingScript-Bold.ttf').then(res => res.arrayBuffer());
        dancingScriptFont = await pdfDoc.embedFont(fontBytes);
      } catch(e) {
        console.warn("Could not load custom cursive font, falling back to default. Place 'DancingScript-Bold.ttf' in the public/fonts folder.");
        dancingScriptFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      }
      
      // Track filling statistics
      let filledCount = 0;
      let matchedFields = [];
      let unmatchedFormData = [];
      let lastFilledFieldPage = null;
      
      // Fill fields based on form data
      for (const [formKey, value] of Object.entries(currentFormData)) {
        // Skip empty values but allow false for checkboxes
        if (value === null || value === undefined || value === '') continue;
        
        // --- SPECIAL SIGNATURE HANDLING ---
        if (formKey === 'teacherSignature' || formKey === 'principalSignature') {
          if (!value.type || !value.value) continue; // Skip if signature object is incomplete

          const signatureFieldMappings = {
            teacherSignature: ["teacherSignature", "Teacher's Signature", "Teacher Signature", "Signature1"],
            principalSignature: ["principalSignature", "Principal's Signature", "Principal Signature", "Signature2"]
          };

          try {
            let sigField = null;
            const possibleNames = signatureFieldMappings[formKey] || [formKey];
            
            for (const name of possibleNames) {
              sigField = form.getFieldMaybe(name);
              if (sigField) {
                console.log(`PDFViewer: Found signature field for "${formKey}" with name "${name}"`);
                break;
              }
            }

            if (!sigField) {
              console.warn(`PDFViewer: Could not find signature field for "${formKey}" using possible names:`, possibleNames);
              continue; // Skip if field not found
            }

            let signatureImageBytes;
            if (value.type === 'typed') {
              // Convert typed text to an image
              const dataUrl = await convertTextToImage(value.value);
              signatureImageBytes = await fetch(dataUrl).then(res => res.arrayBuffer());
            } else { // 'drawn' or 'image'
              signatureImageBytes = await fetch(value.value).then(res => res.arrayBuffer());
            }
            
            const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

            const widgets = sigField.acroField.getWidgets();
            if (widgets.length > 0) {
              const rect = widgets[0].getRectangle();
              const pageRef = widgets[0].P(); // Get page reference from the widget
              const page = pdfDoc.getPages().find(p => p.ref === pageRef);

              if (page) {
                const { width, height } = scaleToFit(signatureImage.width, signatureImage.height, rect.width, rect.height - 5); // Use scaleToFit
                
                // Center the image in the box
                const x = rect.x + (rect.width - width) / 2;
                const y = rect.y + (rect.height - height) / 2;
                
                page.drawImage(signatureImage, { x, y, width, height });
                
              } else {
                 console.warn(`PDFViewer: Could not find page for signature widget "${sigField.getName()}"`);
              }
            } else {
              console.warn(`PDFViewer: Signature field "${sigField.getName()}" has no widgets.`);
            }
            
            // The safest method is to flatten just this one field. This bakes the appearance
            // of the field into the page and removes the interactive element, preventing corruption.
            try {
              sigField.flatten();
              console.log(`PDFViewer: Successfully flattened signature field "${sigField.getName()}".`);
            } catch (flattenError) {
              console.warn(`PDFViewer: Could not flatten signature field "${sigField.getName()}". This might leave an interactive box.`, flattenError);
            }
            
          } catch (e) {
            console.error(`Failed to process signature for ${formKey}:`, e);
          }

          continue; // Move to next form item
        }
        
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
      }
      
      console.log(`PDFViewer: Successfully filled ${filledCount}/${formDataKeys.length} fields`);
      
      // Add TLA logo to the "Board Logo" area in the top right
      try {
        const logoResponse = await fetch('/assets/brand/TLA_logo_simple.svg');
        if (logoResponse.ok) {
          const svgText = await logoResponse.text();
          
          // Create SVG blob and convert to PNG
          const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
          const svgUrl = URL.createObjectURL(svgBlob);
          
          // Use Promise to handle the async image loading
          await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = async () => {
              try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas size for good quality
                canvas.width = 240;
                canvas.height = 120;
                
                // Draw SVG onto canvas
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Convert to PNG and embed in PDF
                canvas.toBlob(async (blob) => {
                  try {
                    const logoBytes = await blob.arrayBuffer();
                    const logoImage = await pdfDoc.embedPng(logoBytes);
                    
                    // Get the first page to place the logo
                    const firstPage = pdfDoc.getPages()[0];
                    const pageHeight = firstPage.getHeight();
                    
                    // Position the logo in the top-right "Board Logo" area
                    const logoWidth = 60;  // Reduced from 80
                    const logoHeight = 30; // Reduced from 40
                    const logoX = firstPage.getWidth() - logoWidth - 5; // Reduced margin from 10 to 5
                    const logoY = pageHeight - logoHeight - 5; // Reduced margin from 10 to 5
                    
                    firstPage.drawImage(logoImage, {
                      x: logoX,
                      y: logoY,
                      width: logoWidth,
                      height: logoHeight,
                    });
                    
                    console.log('✅ TLA logo successfully added to Board Logo area');
                    URL.revokeObjectURL(svgUrl);
                    resolve();
                  } catch (error) {
                    URL.revokeObjectURL(svgUrl);
                    reject(error);
                  }
                }, 'image/png');
              } catch (error) {
                URL.revokeObjectURL(svgUrl);
                reject(error);
              }
            };
            img.onerror = () => {
              URL.revokeObjectURL(svgUrl);
              reject(new Error('Failed to load SVG image'));
            };
            img.src = svgUrl;
          });
        } else {
          console.warn('TLA logo not found at /assets/brand/TLA_logo_simple.svg');
        }
      } catch (logoError) {
        console.warn('Could not add TLA logo:', logoError);
      }
      
      // Only log unmatched fields if in debug mode or if there are many unmatched
      if (isDebugMode || unmatchedFormData.length > 5) {
        console.warn(`PDFViewer: Unmatched form data keys:`, unmatchedFormData);
      }
      
      // Flatten all form fields to make them non-editable
      try {
        // Try to flatten all fields at once first
        form.flatten();
        console.log('PDFViewer: ✅ Successfully flattened all form fields');
      } catch (flattenError) {
        console.warn('PDFViewer: Could not flatten all fields at once, trying individual field flattening:', flattenError);
        
        // If bulk flattening fails, try to flatten fields individually
        try {
          const allFields = form.getFields();
          let successfullyFlattened = 0;
          let failedToFlatten = 0;
          
          for (const field of allFields) {
            try {
              field.flatten();
              successfullyFlattened++;
            } catch (fieldFlattenError) {
              console.warn(`PDFViewer: Could not flatten field "${field.getName()}" (${field.constructor.name}):`, fieldFlattenError);
              failedToFlatten++;
            }
          }
          
          console.log(`PDFViewer: ✅ Flattened ${successfullyFlattened} fields individually, ${failedToFlatten} fields could not be flattened`);
          
          if (failedToFlatten > 0) {
            console.warn(`PDFViewer: ${failedToFlatten} fields could not be flattened and may remain editable`);
          }
        } catch (individualFlattenError) {
          console.error('PDFViewer: Failed to flatten fields individually:', individualFlattenError);
          console.warn('PDFViewer: PDF will be saved without flattening - fields may remain editable');
        }
      }
      
      // Save the modified PDF to a new Uint8Array
      const filledPdfBytes = await pdfDoc.save();
      setFilledPdfBytes(filledPdfBytes); // Store for download
      
      // Create a blob URL for the filled PDF to render in the viewer
      const blob = new Blob([filledPdfBytes], { type: 'application/pdf' });
      
      // Revoke the previous blob URL to prevent memory leaks
      if (filledPdfUrl) {
        URL.revokeObjectURL(filledPdfUrl);
      }
      
      const newFilledPdfUrl = URL.createObjectURL(blob);
      setFilledPdfUrl(newFilledPdfUrl);
      
      // Trigger a re-load of the PDF viewer with the new blob URL
      await loadPDF(newFilledPdfUrl);

      if (onFilledPdfGenerated) {
        onFilledPdfGenerated(newFilledPdfUrl, filledPdfBytes);
      }
      
      // Navigate to the page of the last filled field if available
      if (lastFilledFieldPage && lastFilledFieldPage !== pageNumber) {
        setPageNumber(lastFilledFieldPage);
      }
      
    } catch (error) {
      console.error('PDFViewer: Failed to fill PDF:', error);
      setError('Could not update PDF preview. Please try again.');
    }
  }, 300), [pdfUrl]); // useCallback with debounce and dependencies

  // Generate possible field name variations for a form key
  const generateFieldNameVariations = (formKey) => {
    if (!formKey) return [];
    
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
        <div className="pdf-error" style={{ 
          padding: '40px 20px', 
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          margin: '20px'
        }}>
          {isRetryableError ? (
            <>
              <div style={{ marginBottom: '20px' }}>
                <CSpinner color="primary" size="lg" />
              </div>
              <h5 style={{ color: '#495057', marginBottom: '10px' }}>Loading PDF Template</h5>
              <p style={{ color: '#6c757d', marginBottom: '15px' }}>{error}</p>
              <div className="d-flex justify-content-center align-items-center">
                <CSpinner size="sm" className="me-2" />
                <span style={{ color: '#6c757d' }}>Retrying automatically...</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '20px' }}>
                <CIcon icon={cilDescription} size="2xl" style={{ color: '#6c757d' }} />
              </div>
              <h5 style={{ color: '#495057', marginBottom: '15px' }}>PDF Template Unavailable</h5>
              <p style={{ color: '#6c757d', marginBottom: '20px' }}>{error}</p>
              <div style={{ 
                backgroundColor: '#e9ecef', 
                padding: '15px', 
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '0.875rem'
              }}>
                <strong>Technical Details:</strong><br />
                <code style={{ color: '#495057' }}>{pdfUrl}</code>
              </div>
              <CButton 
                color="primary" 
                onClick={handleRetry}
                className="me-2"
              >
                Try Again
              </CButton>
              <CButton 
                color="secondary" 
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Refresh Page
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
});

PDFViewer.propTypes = {
  pdfUrl: PropTypes.string,
  className: PropTypes.string,
  formData: PropTypes.object,
  showPreview: PropTypes.bool,
  onFilledPdfGenerated: PropTypes.func
};

export default PDFViewer; 