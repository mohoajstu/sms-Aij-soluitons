                                                                                                                                                                                                                                                                                                                                      import React, { useState, useEffect, useRef, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min?url'
import { PDFDocument, rgb, StandardFonts, PDFNumber, PDFName } from 'pdf-lib'
import { CButton, CSpinner, CAlert } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilChevronLeft,
  cilChevronRight,
  cilZoomIn,
  cilZoomOut,
  cilDescription,
} from '@coreui/icons'
import PropTypes from 'prop-types'
import { debounce } from 'lodash'
import { generateFieldNameVariations } from '../fieldMappings'
import { updateAllFieldAppearances } from '../pdfFillingUtils'

// Set up the worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

const PDFViewer = React.memo(
  ({ pdfUrl, className = '', formData = {}, showPreview = false, onFilledPdfGenerated = null }) => {
    const [numPages, setNumPages] = useState(null)
    const [pageNumber, setPageNumber] = useState(1)
    const [scale, setScale] = useState(1.2)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [pdfDocument, setPdfDocument] = useState(null)
    const [filledPdfUrl, setFilledPdfUrl] = useState(null)
    const [filledPdfBytes, setFilledPdfBytes] = useState(null)
    const [retryCount, setRetryCount] = useState(0)
    const [isRetrying, setIsRetrying] = useState(false)
    const canvasRef = useRef(null)
    const retryTimeoutRef = useRef(null)
    const fillPdfTimeoutRef = useRef(null)
    const latestFormData = useRef(formData)
    const latestPageNumber = useRef(pageNumber) // Track current page number for fill operations
    const externalBlobUrlRef = useRef(null) // Track blob URLs created for external PDFs
    const originalPdfUrlRef = useRef(null) // Store original PDF URL (not blob URLs)

    // Auto-retry configuration
    const MAX_RETRIES = 3
    const RETRY_DELAYS = [1000, 2000, 4000] // 1s, 2s, 4s exponential backoff

    // Keep the latest form data in a ref to avoid re-triggering effects too often
    useEffect(() => {
      const prevTeacher = latestFormData.current?.teacher || latestFormData.current?.teacher_name
      const newTeacher = formData.teacher || formData.teacher_name
      
      latestFormData.current = formData
      
      // Log when teacher field is updated
      if (newTeacher && newTeacher !== prevTeacher) {
        console.log('PDFViewer: 📝 FormData ref updated with teacher:', {
          teacher: formData.teacher,
          teacher_name: formData.teacher_name,
          prevTeacher: prevTeacher,
          newTeacher: newTeacher,
          allKeys: Object.keys(formData),
          formDataChanged: true
        })
      } else if (formData.teacher || formData.teacher_name) {
        console.log('PDFViewer: 📝 FormData ref has teacher (no change):', {
          teacher: formData.teacher,
          teacher_name: formData.teacher_name,
        })
      }
    }, [formData])

    // Keep the latest page number in a ref for fill operations
    useEffect(() => {
      latestPageNumber.current = pageNumber
    }, [pageNumber])

    // Auto-retry configuration
    useEffect(() => {
      console.log('PDFViewer: PDF URL changed to:', pdfUrl)
      // Store original PDF URL (not blob URLs)
      if (pdfUrl && !pdfUrl.startsWith('blob:')) {
        originalPdfUrlRef.current = pdfUrl
      }
      // Clean up previous blob URL when URL changes
      if (externalBlobUrlRef.current) {
        URL.revokeObjectURL(externalBlobUrlRef.current)
        externalBlobUrlRef.current = null
      }
      if (pdfUrl) {
        setRetryCount(0) // Reset retry count on new PDF
        loadPDF()
      }
    }, [pdfUrl])

    // Re-render page when pageNumber, scale changes, or when we have a new filled PDF
    useEffect(() => {
      if (pdfDocument && canvasRef.current) {
        renderPage()
      }
    }, [pageNumber, scale, pdfDocument, filledPdfUrl])

    // Debounced effect to update PDF with form data
    useEffect(() => {
      const hasFormData = Object.keys(latestFormData.current).some(
        (key) =>
          latestFormData.current[key] !== null &&
          latestFormData.current[key] !== undefined &&
          latestFormData.current[key] !== '',
      )

      if (showPreview && pdfUrl && hasFormData) {
        // Clear any pending fill operations before starting a new one
        if (fillPdfTimeoutRef.current) {
          clearTimeout(fillPdfTimeoutRef.current)
        }

        // Debounce the call to fillPDFWithFormData
        fillPdfTimeoutRef.current = setTimeout(() => {
          console.log('PDFViewer: Debounced form data change detected, updating PDF preview')
          fillPDFWithFormData()
        }, 300) // 300ms debounce delay
      } else if (!showPreview && filledPdfUrl) {
        // Reset to original PDF when preview is disabled
        console.log('PDFViewer: Preview disabled, resetting to original PDF')
        setFilledPdfUrl(null)
        loadPDF()
      }

      // Cleanup timeout on unmount or when dependencies change
      return () => {
        if (fillPdfTimeoutRef.current) {
          clearTimeout(fillPdfTimeoutRef.current)
        }
      }
    }, [formData, showPreview, pdfUrl])

    // Cleanup retry timeout and blob URLs on unmount
    useEffect(() => {
      return () => {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current)
        }
        if (externalBlobUrlRef.current) {
          URL.revokeObjectURL(externalBlobUrlRef.current)
          externalBlobUrlRef.current = null
        }
      }
    }, [])

    const isValidUrl = (url) => {
      return url && (url.startsWith('blob:') || url.startsWith('http') || url.startsWith('/'))
    }

    const loadPDF = async (urlOverride = null, isAutoRetry = false, preservePageNumber = false, explicitPageNumber = null) => {
      try {
        setLoading(true)
        if (!isAutoRetry) {
          setError(null)
          setIsRetrying(false)
        } else {
          setIsRetrying(true)
        }

        // Preserve current page number if requested (for PDF updates after filling)
        // Use explicit page number if provided, otherwise use current state or default to 1
        const currentPage = explicitPageNumber !== null ? explicitPageNumber : (preservePageNumber ? latestPageNumber.current : 1)

        const urlToLoad = urlOverride || filledPdfUrl || pdfUrl
        if (!isValidUrl(urlToLoad)) {
          console.warn('PDFViewer: Aborting load, invalid or missing URL:', urlToLoad)
          setLoading(false)
          setError('Invalid PDF URL. Please check the report card configuration.')
          return
        }

        // Validate PDF path before attempting to load
        // Skip HEAD validation for external URLs (Firebase Storage, etc.) as they may not support HEAD requests
        // Only validate local paths (starting with '/')
        const isLocalPath = urlToLoad.startsWith('/')
        
        // Add cache-busting for local PDFs to ensure we get the latest version
        let finalUrlToLoad = urlToLoad
        if (isLocalPath && !urlToLoad.includes('blob:') && !urlToLoad.includes('?v=')) {
          const cacheBuster = `?v=${Date.now()}`
          finalUrlToLoad = `${urlToLoad}${cacheBuster}`
          console.log('PDFViewer: Added cache-busting to PDF URL:', finalUrlToLoad)
        }
        
        if (!urlOverride && !filledPdfUrl && isLocalPath) {
          // This is the initial load of a local PDF template - validate the path first
          try {
            const pathCheckResponse = await fetch(finalUrlToLoad, { 
              method: 'HEAD',
              cache: 'no-store' // Force fresh check
            })
            if (!pathCheckResponse.ok) {
              console.error('PDFViewer: PDF not found at path:', finalUrlToLoad)
              setLoading(false)
              setError(`PDF template not found. Please check if the file exists at: ${urlToLoad}`)
              return
            }
          } catch (pathError) {
            console.error('PDFViewer: Error checking PDF path:', pathError)
            setLoading(false)
            setError(`Unable to access PDF template. Please verify the file path: ${urlToLoad}`)
            return
          }
        } else if (!urlOverride && !filledPdfUrl && !isLocalPath) {
          // For external URLs (like Firebase Storage), skip HEAD validation and go straight to loading
          console.log('PDFViewer: Skipping HEAD validation for external URL:', finalUrlToLoad)
        }

        console.log('PDFViewer: Loading PDF from:', finalUrlToLoad)

        // For external URLs (Firebase Storage), fetch as blob first to avoid CORS issues
        // Clean up any previous blob URL
        if (externalBlobUrlRef.current) {
          URL.revokeObjectURL(externalBlobUrlRef.current)
          externalBlobUrlRef.current = null
        }

        let pdfUrlToLoad = finalUrlToLoad
        if (!isLocalPath && !finalUrlToLoad.startsWith('blob:')) {
          try {
            console.log('PDFViewer: Fetching external PDF as blob to avoid CORS issues...')
            const response = await fetch(finalUrlToLoad, {
              method: 'GET',
              mode: 'cors',
              credentials: 'omit',
              cache: 'no-store', // Force fresh fetch
            })
            
            if (!response.ok) {
              throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
            }
            
            const blob = await response.blob()
            pdfUrlToLoad = URL.createObjectURL(blob)
            externalBlobUrlRef.current = pdfUrlToLoad // Store for cleanup
            console.log('PDFViewer: Successfully fetched PDF as blob, created blob URL')
          } catch (fetchError) {
            console.error('PDFViewer: Error fetching PDF as blob:', fetchError)
            // Fall back to direct loading if blob fetch fails
            console.log('PDFViewer: Falling back to direct URL loading')
            pdfUrlToLoad = finalUrlToLoad
          }
        }

        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrlToLoad,
          httpHeaders: {},
          withCredentials: false,
          disableAutoFetch: false,
          disableStream: false,
        })
        const pdf = await loadingTask.promise

        console.log('PDFViewer: PDF loaded successfully with', pdf.numPages, 'pages')

        setPdfDocument(pdf)
        setNumPages(pdf.numPages)
        // Preserve page number if requested, otherwise reset to 1
        // Also ensure the page number doesn't exceed the number of pages
        const targetPage = preservePageNumber ? Math.min(currentPage, pdf.numPages) : 1
        setPageNumber(targetPage)
        setLoading(false)
        setError(null)
        setRetryCount(0) // Reset retry count on success
        setIsRetrying(false)
      } catch (error) {
        console.error('PDFViewer: Error loading PDF:', error)
        setLoading(false)
        setIsRetrying(false)

        // Provide more user-friendly error messages
        let userFriendlyError = 'Failed to load PDF'

        if (error.message.includes('ERR_FILE_NOT_FOUND') || error.message.includes('404')) {
          userFriendlyError = 'PDF template not found. Please check if the file exists.'
        } else if (error.message.includes('Unexpected server response (0)')) {
          userFriendlyError = 'Unable to access PDF template. Please verify the file path.'
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          userFriendlyError = 'Network error while loading PDF. Please check your connection.'
        } else if (error.message.includes('Invalid PDF')) {
          userFriendlyError = 'Invalid PDF file format. Please check the template file.'
        }

        // Make all errors retryable up to MAX_RETRIES
        const isRetryableError = true
        if (retryCount < MAX_RETRIES && !isAutoRetry) {
          const attempt = isAutoRetry ? retryCount : retryCount + 1
          console.log(
            `PDFViewer: Retryable error detected, scheduling retry ${attempt}/${MAX_RETRIES}`,
          )
          setRetryCount(attempt)

          // Schedule automatic retry with exponential backoff
          const delay = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
          retryTimeoutRef.current = setTimeout(() => {
            loadPDF(urlOverride, true)
          }, delay)

          // Show a less alarming message for automatic retries
          setError(`Loading PDF... (retry ${attempt}/${MAX_RETRIES})`)
        } else {
          // Only show full error after all retries exhausted or for non-retryable errors
          setError(userFriendlyError)
        }
      }
    }

    /**
     * Ensure the cursive signature font is loaded before rendering.
     */
    const ensureSignatureFont = async () => {
      try {
        // Wait for any existing fonts to be ready
        if (document?.fonts?.ready) {
          await document.fonts.ready
        }

        const hasFont =
          typeof document !== 'undefined' &&
          document.fonts &&
          document.fonts.check('48px "Dancing Script"')

        if (!hasFont && typeof FontFace !== 'undefined') {
          const font = new FontFace(
            'Dancing Script',
            'url(https://fonts.gstatic.com/s/dancingscript/v25/If2cXTr6YS-zF4S-kcSWSVi_sxjLh2Gv2lthgSmF2lT2pS1t-g.ttf)',
          )
          await font.load()
          document.fonts.add(font)
          if (document.fonts.ready) {
            await document.fonts.ready
          }
          console.log('PDFViewer: ✅ Loaded Dancing Script font for signatures')
        }
      } catch (e) {
        console.warn('PDFViewer: ⚠️ Could not load Dancing Script font, using fallback', e)
      }
    }

    /**
     * Renders text to a canvas and returns it as a PNG data URL.
     */
    const convertTextToImage = async (text, font = '48px "Dancing Script"', color = '#000000') => {
      // Ensure signature font is loaded so the canvas uses the cursive font
      await ensureSignatureFont()

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      context.font = font
      const textMetrics = context.measureText(text)

      // Set canvas dimensions with some padding
      canvas.width = textMetrics.width + 40
      canvas.height = 80

      // Redraw text on the sized canvas
      context.font = font
      context.fillStyle = color
      context.fillText(text, 20, 50)

      return canvas.toDataURL('image/png')
    }

    /**
     * Scales image dimensions to fit within a bounding box while maintaining aspect ratio.
     */
    const scaleToFit = (imgWidth, imgHeight, boxWidth, boxHeight) => {
      const widthRatio = boxWidth / imgWidth
      const heightRatio = boxHeight / imgHeight
      const scale = Math.min(widthRatio, heightRatio)
      return {
        width: imgWidth * scale,
        height: imgHeight * scale,
      }
    }

    const fillPDFWithFormData = useCallback(
      debounce(async () => {
        // Use the most up-to-date form data from the ref
        const currentFormData = latestFormData.current
        // Normalize signatures so they are always present when we have teacher/principal names
        const normalizedFormData = { ...currentFormData }
        const teacherNameForSig = normalizedFormData.teacherSignature?.value ||
          normalizedFormData.teacher_name ||
          normalizedFormData.teacher
        if (!normalizedFormData.teacherSignature && teacherNameForSig) {
          normalizedFormData.teacherSignature = { type: 'typed', value: teacherNameForSig }
          console.log('PDFViewer: ✍️ Auto-added teacherSignature for filling:', normalizedFormData.teacherSignature)
        }
        const principalNameForSig = normalizedFormData.principalSignature?.value || 'Ghazala Choudary'
        if (!normalizedFormData.principalSignature && principalNameForSig) {
          normalizedFormData.principalSignature = { type: 'typed', value: principalNameForSig }
          console.log('PDFViewer: ✍️ Auto-added principalSignature for filling:', normalizedFormData.principalSignature)
        }
        // Capture current page number at the start of fill operation to preserve user's position
        const currentPageWhenFilling = latestPageNumber.current

        console.log('PDFViewer: Starting to fill PDF with form data:', currentFormData)
        console.log('PDFViewer: Current page when filling:', currentPageWhenFilling)
        console.log('PDFViewer: Signature fields in form data:', {
          teachersignature: normalizedFormData.teachersignature,
          principalsignature: normalizedFormData.principalsignature,
          teacherSignature: normalizedFormData.teacherSignature,
          principalSignature: normalizedFormData.principalSignature,
        })
        console.log('PDFViewer: ALL formData keys:', Object.keys(normalizedFormData))
        console.log('PDFViewer: Full formData:', normalizedFormData)

        try {
          // Reduce console spam - only log when there's meaningful form data
          const formDataKeys = Object.keys(normalizedFormData).filter(
            (key) =>
              normalizedFormData[key] !== null &&
              normalizedFormData[key] !== undefined &&
              normalizedFormData[key] !== '',
          )

          if (formDataKeys.length === 0) {
            console.log('PDFViewer: No form data to fill')
            return
          }

          console.log(`PDFViewer: Filling PDF with ${formDataKeys.length} form fields`)

          // Fetch the original PDF with cache-busting to ensure we get the latest version
          const cacheBuster = `?v=${Date.now()}`
          const pdfUrlWithCacheBust = pdfUrl.includes('?') 
            ? `${pdfUrl}&${cacheBuster.replace('?', '&')}` 
            : `${pdfUrl}${cacheBuster}`
          console.log('PDFViewer: Fetching PDF with cache-busting:', pdfUrlWithCacheBust)
          const response = await fetch(pdfUrlWithCacheBust, {
            cache: 'no-store', // Force fresh fetch
          })
          if (!response.ok) {
            throw new Error('Failed to fetch PDF file')
          }

          const pdfBytes = await response.arrayBuffer()
          const pdfDoc = await PDFDocument.load(pdfBytes)

          // Get the form from the PDF
          const form = pdfDoc.getForm()
          const fields = form.getFields()

          // Debug: Log all PDF field names to help identify sans2 fields
          const allPdfFieldNames = fields.map(f => f.getName())
          const sansFields = allPdfFieldNames.filter(name => name.toLowerCase().includes('sans'))
          if (sansFields.length > 0) {
            console.log('PDFViewer: Found PDF fields with "sans" in name:', sansFields)
          } else {
            console.warn('PDFViewer: ⚠️ No PDF fields found with "sans" in name. All field names:', allPdfFieldNames)
            // Also check for fields that might be related to comments/learning skills
            const commentFields = allPdfFieldNames.filter(name => 
              name.toLowerCase().includes('responsibility') || 
              name.toLowerCase().includes('organization') ||
              name.toLowerCase().includes('collaboration') ||
              name.toLowerCase().includes('initiative') ||
              name.toLowerCase().includes('independent') ||
              name.toLowerCase().includes('regulation')
            )
            if (commentFields.length > 0) {
              console.log('PDFViewer: Found potential comment fields:', commentFields)
            }
          }

          // Embed the "Dancing Script" font for signatures (48px)
          let dancingScriptFont
          try {
            const fontBytes = await fetch('/fonts/DancingScript-Bold.ttf').then((res) =>
              res.arrayBuffer(),
            )
            dancingScriptFont = await pdfDoc.embedFont(fontBytes)
          } catch (e) {
            console.warn(
              "Could not load custom cursive font, falling back to default. Place 'DancingScript-Bold.ttf' in the public/fonts folder.",
            )
            dancingScriptFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
          }

          // Embed Times Roman font for regular text fields (10pt)
          let timesRomanFont
          try {
            // Try to load Times New Roman from fonts folder, fallback to standard TimesRoman
            const timesFontBytes = await fetch('/fonts/TimesNewRoman.ttf').then((res) =>
              res.arrayBuffer(),
            ).catch(() => null)
            if (timesFontBytes) {
              timesRomanFont = await pdfDoc.embedFont(timesFontBytes)
            } else {
              timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
            }
          } catch (e) {
            // Fallback to standard TimesRoman font
            timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
          }

          // Track filling statistics
          let filledCount = 0
          let matchedFields = []
          let unmatchedFormData = []
          let lastFilledFieldPage = null

          // Log all form data keys for debugging
          console.log('PDFViewer: 📋 All form data keys:', Object.keys(currentFormData))
          console.log('PDFViewer: 📋 Form data keys with values:', Object.entries(currentFormData)
            .filter(([k, v]) => v !== null && v !== undefined && v !== '')
            .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v).substring(0, 50) : String(v).substring(0, 50)}`)
          )

          // Fill fields based on form data
          for (const [formKey, value] of Object.entries(normalizedFormData)) {
            // Skip empty values but allow false for checkboxes
            // Also allow 0 for numeric fields
            if (value === null || value === undefined || value === '') {
              // Log what we're skipping for important fields
              if (formKey.includes('responsibiity') || formKey.includes('organization') || 
                  formKey.includes('independentWork') || formKey.includes('collaboration') ||
                  formKey.includes('initiative') || formKey.includes('selfRegulation') ||
                  formKey.startsWith('sans') || formKey.startsWith('sans2') ||
                  formKey.includes('ESL') || formKey.includes('IEP') || formKey.includes('VeryWell') ||
                  formKey.includes('Well') || formKey.includes('WithDifficulty')) {
                console.log(`PDFViewer: ⏭️ Skipping empty field "${formKey}" (value: ${value})`)
              }
              continue
            }
            
            // Log important fields being processed (including checkboxes)
            if (formKey.includes('responsibiity') || formKey.includes('organization') || 
                formKey.includes('independentWork') || formKey.includes('collaboration') ||
                formKey.includes('initiative') || formKey.includes('selfRegulation') ||
                formKey.startsWith('sans') || formKey.startsWith('sans2') ||
                formKey.includes('ESL') || formKey.includes('IEP') || formKey.includes('NA') ||
                formKey.includes('VeryWell') || formKey.includes('Well') || formKey.includes('WithDifficulty')) {
              console.log(`PDFViewer: 🔵 Processing important field "${formKey}" with value:`, value, `(type: ${typeof value})`)
            }

            // Debug logging for sans2 fields
            if (formKey.startsWith('sans2') || formKey.startsWith('sans')) {
              console.log(`PDFViewer: Processing ${formKey} field with value:`, value)
            }

            // Process grade field to extract just the number (e.g., "grade 8" -> "8")
            let processedValue = value
            if (formKey === 'grade' && value) {
              const gradeValue = value.toString()
              const match = gradeValue.match(/\d+/)
              processedValue = match ? match[0] : gradeValue
              console.log(`PDFViewer: Processing grade: "${gradeValue}" -> "${processedValue}"`)
            }

            // --- SPECIAL SIGNATURE HANDLING ---
            if (
              formKey === 'teacherSignature' ||
              formKey === 'principalSignature' ||
              formKey === 'teachersignature' ||
              formKey === 'principalsignature'
            ) {
              console.log(`PDFViewer: ⭐ Processing signature field "${formKey}" with value:`, value)
              console.log(
                `PDFViewer: Value type: ${typeof value}, has type: ${!!value?.type}, has value: ${!!value?.value}`,
              )
              console.log(`PDFViewer: value.type = "${value?.type}", value.value = "${value?.value}"`)

              if (!value || typeof value !== 'object' || !value.type || !value.value) {
                console.warn(
                  `PDFViewer: ❌ Skipping signature field "${formKey}" - incomplete signature object. Expected {type, value}, got:`,
                  value,
                )
                continue // Skip if signature object is incomplete
              }
              
              console.log(`PDFViewer: ✅ Signature field "${formKey}" has valid structure, proceeding...`)

              const signatureFieldMappings = {
                teacherSignature: [
                  'teacherSignature',
                  'teachersignature',
                  'TeacherSignature',
                  "Teacher's Signature",
                  'Teacher Signature',
                  'Text_1', // legacy
                  'Signature_1', // legacy (7-8 older template)
                ],
                principalSignature: [
                  'principalSignature',
                  'principalsignature',
                  'PrincipalSignature',
                  "Principal's Signature",
                  'Principal Signature',
                  'Signature_1', // legacy (some 7-8 templates use a single signature field)
                  'Number_1', // legacy (1-6 progress)
                  'principleSignature', // legacy typo
                ],
                teachersignature: [
                  'teacherSignature',
                  'teachersignature',
                  'TeacherSignature',
                  "Teacher's Signature",
                  'Teacher Signature',
                  'Text_1', // legacy
                  'Signature_1', // legacy (7-8 older template)
                ],
                principalsignature: [
                  'principalSignature',
                  'principalsignature',
                  'PrincipalSignature',
                  "Principal's Signature",
                  'Principal Signature',
                  'Number_1', // legacy (1-6 progress)
                  'principleSignature', // legacy typo
                ],
              }

              try {
                let sigField = null
                const possibleNames = signatureFieldMappings[formKey] || [formKey]
                console.log(
                  `PDFViewer: Looking for signature field with possible names:`,
                  possibleNames,
                )

                for (const name of possibleNames) {
                  sigField = form.getFieldMaybe(name)
                  if (sigField) {
                    console.log(
                      `PDFViewer: ✅ Found signature field for "${formKey}" with name "${name}"`,
                    )
                    break
                  } else {
                    console.log(`PDFViewer: ❌ Field "${name}" not found`)
                  }
                }

                if (!sigField) {
                  console.warn(
                    `PDFViewer: Could not find signature field for "${formKey}" using possible names:`,
                    possibleNames,
                  )
                  continue // Skip if field not found
                }

                // For typed signatures, also try filling as text (some signature fields support text)
                if (value.type === 'typed' && sigField.setText) {
                  try {
                    sigField.setText(value.value)
                    console.log(`PDFViewer: ✅ Filled signature field "${sigField.getName()}" as text: "${value.value}"`)
                  } catch (textError) {
                    console.warn(`PDFViewer: Could not fill signature field as text:`, textError)
                  }
                }

                let signatureImageBytes
                if (value.type === 'typed') {
                  // Convert typed text to an image
                  const dataUrl = await convertTextToImage(value.value)
                  signatureImageBytes = await fetch(dataUrl).then((res) => res.arrayBuffer())
                } else {
                  // 'drawn' or 'image'
                  signatureImageBytes = await fetch(value.value).then((res) => res.arrayBuffer())
                }

                const signatureImage = await pdfDoc.embedPng(signatureImageBytes)

                const widgets = sigField.acroField.getWidgets()
                if (widgets.length > 0) {
                  const rect = widgets[0].getRectangle()
                  const pageRef = widgets[0].P() // Get page reference from the widget
                  const page = pdfDoc.getPages().find((p) => p.ref === pageRef)

                  if (page) {
                    const { width, height } = scaleToFit(
                      signatureImage.width,
                      signatureImage.height,
                      rect.width,
                      rect.height - 5,
                    ) // Use scaleToFit

                    // Center the image in the box
                    const x = rect.x + (rect.width - width) / 2
                    const y = rect.y + (rect.height - height) / 2

                    page.drawImage(signatureImage, { x, y, width, height })
                  } else {
                    console.warn(
                      `PDFViewer: Could not find page for signature widget "${sigField.getName()}"`,
                    )
                  }
                } else {
                  console.warn(`PDFViewer: Signature field "${sigField.getName()}" has no widgets.`)
                }

                // The safest method is to flatten just this one field. This bakes the appearance
                // of the field into the page and removes the interactive element, preventing corruption.
                try {
                  sigField.flatten()
                  console.log(
                    `PDFViewer: Successfully flattened signature field "${sigField.getName()}".`,
                  )
                } catch (flattenError) {
                  console.warn(
                    `PDFViewer: Could not flatten signature field "${sigField.getName()}". This might leave an interactive box.`,
                    flattenError,
                  )
                }
              } catch (e) {
                console.error(`Failed to process signature for ${formKey}:`, e)
              }

              continue // Move to next form item
            }

            let fieldFilled = false

            // Try to find matching PDF field by various name patterns
            const possibleFieldNames = generateFieldNameVariations(formKey)

            // Enhanced debug logging for ALL fields
            console.log(`PDFViewer: 🔍 Processing formKey "${formKey}" with value:`, processedValue, `(type: ${typeof processedValue})`)
            console.log(`PDFViewer: Trying ${possibleFieldNames.length} variations:`, possibleFieldNames)
            
            // Special logging for teacher field
            if (formKey === 'teacher' || formKey === 'teacher_name') {
              console.log(`PDFViewer: 👨‍🏫 TEACHER FIELD - Processing "${formKey}" with value:`, processedValue)
              console.log(`PDFViewer: 👨‍🏫 TEACHER FIELD - Trying PDF field names:`, possibleFieldNames)
            }
            
            // Special logging for checkbox fields
            if (formKey.includes('ESL') || formKey.includes('IEP') || formKey.includes('NA') || 
                formKey.includes('VeryWell') || formKey.includes('Well') || formKey.includes('WithDifficulty')) {
              console.log(`PDFViewer: 🔘 Checkbox field "${formKey}" - will try variations:`, possibleFieldNames)
            }

            for (const fieldName of possibleFieldNames) {
              try {
                const field = form.getFieldMaybe(fieldName)
                if (field) {
                  console.log(`PDFViewer: ✅ Found PDF field "${fieldName}" for formKey "${formKey}"`)
                  
                  // Special logging for teacher field
                  if (formKey === 'teacher' || formKey === 'teacher_name') {
                    console.log(`PDFViewer: 👨‍🏫 TEACHER FIELD - Found PDF field "${fieldName}", attempting to fill with:`, processedValue)
                  }
                  
                  const success = fillPDFField(field, processedValue, timesRomanFont, 10)
                  if (success) {
                    filledCount++
                    
                    // Special logging for teacher field
                    if (formKey === 'teacher' || formKey === 'teacher_name') {
                      console.log(`PDFViewer: 👨‍🏫 TEACHER FIELD - ✅ Successfully filled "${formKey}" → PDF field "${fieldName}" with value:`, processedValue)
                    }

                    // Try to get the page where this field is located
                    try {
                      const fieldPages = field.acroField.getWidgets().map((widget) => {
                        const pageRef = widget.getP()
                        const pageIndex = pdfDoc.catalog
                          .getPages()
                          .findIndex((page) => page.ref === pageRef)
                        return pageIndex + 1 // Convert to 1-based page number
                      })

                      if (fieldPages.length > 0) {
                        lastFilledFieldPage = fieldPages[0]
                        console.log(`PDFViewer: Field "${formKey}" is on page ${lastFilledFieldPage}`)
                      }
                    } catch (pageError) {
                      // Silently handle page detection errors
                    }

                    matchedFields.push({
                      formKey,
                      pdfField: fieldName,
                      value: value.toString(),
                      type: field.constructor.name,
                      page: lastFilledFieldPage,
                    })
                    fieldFilled = true
                    console.log(`PDFViewer: ✅ Successfully filled "${formKey}" -> "${fieldName}"`)
                    break
                  } else {
                    console.warn(`PDFViewer: ⚠️ Field "${fieldName}" found but fillPDFField returned false for "${formKey}"`)
                  }
                }
              } catch (error) {
                console.warn(`PDFViewer: Error trying field ${fieldName} for ${formKey}:`, error.message)
              }
            }

            // If exact match failed, try fuzzy matching for sans fields
            if (!fieldFilled && (formKey.startsWith('sans2') || formKey.startsWith('sans'))) {
              const formKeyLower = formKey.toLowerCase().replace(/[^a-z0-9]/g, '')
              // Search through all fields for a partial match
              for (const pdfField of fields) {
                try {
                  const pdfFieldName = pdfField.getName()
                  const pdfFieldNameLower = pdfFieldName.toLowerCase().replace(/[^a-z0-9]/g, '')
                  
                  // Check if the field name contains the form key (without special chars)
                  if (pdfFieldNameLower.includes(formKeyLower) || formKeyLower.includes(pdfFieldNameLower)) {
                    console.log(`PDFViewer: 🔍 Found fuzzy match: "${formKey}" -> "${pdfFieldName}"`)
                    const success = fillPDFField(pdfField, processedValue, timesRomanFont, 10)
                    if (success) {
                      filledCount++
                      matchedFields.push({
                        formKey,
                        pdfField: pdfFieldName,
                        value: value.toString(),
                        type: pdfField.constructor.name,
                        page: lastFilledFieldPage,
                        matchType: 'fuzzy'
                      })
                      fieldFilled = true
                      break
                    }
                  }
                } catch (error) {
                  // Continue searching
                }
              }
            }

            if (!fieldFilled) {
              unmatchedFormData.push(formKey)
              console.warn(`PDFViewer: ❌ Could not find PDF field for formKey "${formKey}" (value: ${processedValue})`)
              
              // Special logging for teacher field
              if (formKey === 'teacher' || formKey === 'teacher_name') {
                console.error(`PDFViewer: 👨‍🏫 TEACHER FIELD - ❌ FAILED to fill "${formKey}" with value:`, processedValue)
                console.error(`PDFViewer: 👨‍🏫 TEACHER FIELD - Tried PDF field names:`, possibleFieldNames)
                console.error(`PDFViewer: 👨‍🏫 TEACHER FIELD - All available PDF fields:`, allPdfFieldNames)
                // Check if "teacher" field exists in PDF
                const teacherFieldExists = allPdfFieldNames.some(name => name.toLowerCase() === 'teacher')
                console.error(`PDFViewer: 👨‍🏫 TEACHER FIELD - Does "teacher" field exist in PDF?`, teacherFieldExists)
              }
              
              // Log what fields DO exist that might be similar
              const similarFields = allPdfFieldNames.filter(name => 
                name.toLowerCase().includes(formKey.toLowerCase().substring(0, 4)) ||
                formKey.toLowerCase().includes(name.toLowerCase().substring(0, 4))
              )
              if (similarFields.length > 0 && similarFields.length < 10) {
                console.warn(`PDFViewer: Similar fields found:`, similarFields)
              }
            }
          }

          console.log(`PDFViewer: Successfully filled ${filledCount}/${formDataKeys.length} fields`)
          
          // Log summary of matched and unmatched fields for debugging
          if (matchedFields.length > 0) {
            console.log(`PDFViewer: ✅ Matched ${matchedFields.length} fields:`, matchedFields.map(f => `${f.formKey} -> ${f.pdfField}`).slice(0, 20))
          }
          if (unmatchedFormData.length > 0) {
            console.error(`PDFViewer: ❌ Unmatched form data keys (${unmatchedFormData.length}/${formDataKeys.length}):`, unmatchedFormData.slice(0, 30))
            // Specifically log sans2 fields that weren't matched
            const unmatchedSans = unmatchedFormData.filter(key => key.startsWith('sans2') || key.startsWith('sans'))
            if (unmatchedSans.length > 0) {
              console.error('PDFViewer: ❌ Unmatched sans/sans2 fields:', unmatchedSans)
            }
            // Log all available PDF field names for comparison
            console.log('PDFViewer: 📋 All available PDF field names:', allPdfFieldNames)
          } else {
            console.log('PDFViewer: ✅ All fields matched successfully!')
          }
{/*}
          // Add TLA logo to the "Board Logo" area in the top right
          try {
            const logoResponse = await fetch('/assets/brand/TLA_logo_simple.svg')
            if (logoResponse.ok) {
              const svgText = await logoResponse.text()

              // Create SVG blob and convert to PNG
              const svgBlob = new Blob([svgText], { type: 'image/svg+xml' })
              const svgUrl = URL.createObjectURL(svgBlob)

              // Use Promise to handle the async image loading
              await new Promise((resolve, reject) => {
                const img = new Image()
                img.onload = async () => {
                  try {
                    const canvas = document.createElement('canvas')
                    const ctx = canvas.getContext('2d')

                    // Set canvas size for good quality
                    canvas.width = 240
                    canvas.height = 120

                    // Draw SVG onto canvas
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

                    // Convert to PNG and embed in PDF
                    canvas.toBlob(async (blob) => {
                      try {
                        const logoBytes = await blob.arrayBuffer()
                        const logoImage = await pdfDoc.embedPng(logoBytes)

                        // Get the first page to place the logo
                        const firstPage = pdfDoc.getPages()[0]
                        const pageHeight = firstPage.getHeight()

                        // Position the logo in the top-right "Board Logo" area
                        const logoWidth = 60 // Reduced from 80
                        const logoHeight = 30 // Reduced from 40
                        const logoX = firstPage.getWidth() - logoWidth - 5 // Reduced margin from 10 to 5
                        const logoY = pageHeight - logoHeight - 5 // Reduced margin from 10 to 5

                        firstPage.drawImage(logoImage, {
                          x: logoX,
                          y: logoY,
                          width: logoWidth,
                          height: logoHeight,
                        })

                        console.log('✅ TLA logo successfully added to Board Logo area')
                        URL.revokeObjectURL(svgUrl)
                        resolve()
                      } catch (error) {
                        URL.revokeObjectURL(svgUrl)
                        reject(error)
                      }
                    }, 'image/png')
                  } catch (error) {
                    URL.revokeObjectURL(svgUrl)
                    reject(error)
                  }
                }
                img.onerror = () => {
                  URL.revokeObjectURL(svgUrl)
                  reject(new Error('Failed to load SVG image'))
                }
                img.src = svgUrl
              })
            } else {
              console.warn('TLA logo not found at /assets/brand/TLA_logo_simple.svg')
            }
          } catch (logoError) {
            console.warn('Could not add TLA logo:', logoError)
          }
        */}
          // Only log unmatched fields if there are many unmatched
          if (unmatchedFormData.length > 5) {
            console.warn(`PDFViewer: Unmatched form data keys:`, unmatchedFormData)
          }

          // Update field appearances to ensure all fields are visible
          // Using shared utility to ensure identical logic to download
          await updateAllFieldAppearances(form, pdfDoc, 'PDFViewer')

          // Don't flatten the form to preserve checkbox functionality
          console.log(
            'PDFViewer: ✅ Preserving form fields (not flattening) to maintain checkbox visibility',
          )

          // Save the modified PDF to a new Uint8Array
          const filledPdfBytes = await pdfDoc.save()
          setFilledPdfBytes(filledPdfBytes) // Store for download

          // Create a blob URL for the filled PDF to render in the viewer
          const blob = new Blob([filledPdfBytes], { type: 'application/pdf' })

          // Revoke the previous blob URL to prevent memory leaks
          if (filledPdfUrl) {
            URL.revokeObjectURL(filledPdfUrl)
          }

          const newFilledPdfUrl = URL.createObjectURL(blob)
          setFilledPdfUrl(newFilledPdfUrl)

          // Determine which page to show after reload
          // Priority: last filled field page > current page when filling started > page 1
          const targetPage = lastFilledFieldPage || currentPageWhenFilling || 1
          
          console.log(`PDFViewer: Reloading PDF. Target page: ${targetPage} (lastFilledFieldPage: ${lastFilledFieldPage}, currentPageWhenFilling: ${currentPageWhenFilling})`)
          
          // Trigger a re-load of the PDF viewer with the new blob URL
          // Pass the target page number explicitly to ensure correct page is shown
          await loadPDF(newFilledPdfUrl, false, true, targetPage)
          
          // Force a re-render after a short delay to ensure the PDF document is fully loaded
          setTimeout(() => {
            setPageNumber(targetPage)
            console.log(`PDFViewer: Set page number to ${targetPage} after reload`)
            // Force re-render by triggering renderPage if pdfDocument is available
            if (pdfDocument && canvasRef.current) {
              renderPage()
            }
          }, 200)

          if (onFilledPdfGenerated) {
            onFilledPdfGenerated(newFilledPdfUrl, filledPdfBytes)
          }
        } catch (error) {
          console.error('PDFViewer: Failed to fill PDF:', error)
          setError('Could not update PDF preview. Please try again.')
        }
      }, 300),
      [pdfUrl],
    ) // useCallback with debounce and dependencies

    // NOTE: generateFieldNameVariations is now imported from ../fieldMappings.js

    // Fill a specific PDF field with a value - REMOVE OLD FUNCTION
    const REMOVE_generateFieldNameVariations = (formKey) => {
      if (!formKey) return []

      // For progress reports (1-6, 7-8) and initial observation, use exact field names with limited variations
      // Use original PDF URL instead of current pdfUrl (which might be a blob URL)
      const originalUrl = originalPdfUrlRef.current || pdfUrl
      const isProgressReport = originalUrl && (
        originalUrl.includes('1-6-edu-elementary-progress') ||
        originalUrl.includes('7-8-edu-elementary-progress') ||
        originalUrl.includes('kg-cl-initial-Observations')
      )

      const variations = [formKey]

      // Add exact mappings based on the exact PDF field names provided by the user
      const exactFieldMappings = {
        // The form uses the exact PDF field names, so map them to themselves first
        // Basic Information - Using actual PDF field names as keys
        student: ['student'],
        grade: ['grade'],
        teacher: ['teacher'],
        OEN: ['OEN'],
        board: ['board'],
        school: ['school'],
        schoolAddress: ['schoolAddress'],
        boardAddress: ['boardAddress'],
        principal: [
          'principal',
          'Principal',
          'PRINCIPAL',
          'Principal:',
          'principal:',
          'PrincipalName',
          'principalName',
          // Handle common misspelling found in some templates
          'Principle',
          'principle',
        ],
        telephone: ['telephone'],
        boardInfo: ['boardInfo'],
        boardSpace: ['boardSpace'],

        // Attendance - Using actual PDF field names (7-8 provincial report uses timeLate/totalTimeLate singular)
        daysAbsent: ['daysAbsent'],
        totalDaysAbsent: ['totalDaysAbsent'],
        timesLate: ['timesLate', 'timeLate'],
        totalTimesLate: ['totalTimesLate', 'totalTimeLate'],

        // Learning Skills - Using actual PDF field names
        responsibility1: ['responsibility1', 'responsibiity1'], // Handle typo in PDF
        responsibility2: ['responsibility2'],
        organization1: ['organization1'],
        organization2: ['organization2'],
        independentWork1: ['independentWork1'],
        independentWork2: ['independentWork2'],
        collaboration1: ['collaboration1'],
        collaboration2: ['collaboration2'],
        initiative1: ['initiative1'],
        initiative2: ['initiative2'],
        selfRegulation1: ['selfRegulation1'],
        selfRegulation2: ['selfRegulation2'],
        
        // Learning Skills Sans fields (comments)
        sansResponsibility: [
          'sansResponsibility', 
          'sansresponsibility',
          'Sans Responsibility',
          'sans responsibility',
          'Sans_Responsibility',
          'sans_responsibility',
        ],
        sansOrganization: [
          'sansOrganization', 
          'sansorganization',
          'Sans Organization',
          'sans organization',
          'Sans_Organization',
          'sans_organization',
        ],
        sansIndependentWork: [
          'sansIndependentWork', 
          'sansindependentwork',
          'Sans Independent Work',
          'sans independent work',
          'Sans_Independent_Work',
          'sans_independent_work',
        ],
        sansCollaboration: [
          'sansCollaboration', 
          'sanscollaboration',
          'Sans Collaboration',
          'sans collaboration',
          'Sans_Collaboration',
          'sans_collaboration',
        ],
        sansInitiative: [
          'sansInitiative', 
          'sansinitiative',
          'Sans Initiative',
          'sans initiative',
          'Sans_Initiative',
          'sans_initiative',
        ],
        sansSelfRegulation: [
          'sansSelfRegulation', 
          'sansselfregulation',
          'Sans Self Regulation',
          'sans self regulation',
          'Sans_Self_Regulation',
          'sans_self_regulation',
        ],
        
        // Subject Area Sans2 fields (comments)
        sans2Language: [
          'sans2Language', 
          'sans2language',
          'Sans2 Language',
          'sans2 language',
          'Sans2_Language',
          'sans2_language',
        ],
        sans2French: [
          'sans2French', 
          'sans2french',
          'Sans2 French',
          'sans2 french',
          'Sans2_French',
          'sans2_french',
        ],
        sans2NativeLanguage: [
          'sans2NativeLanguage', 
          'sans2nativelanguage',
          'Sans2 Native Language',
          'sans2 native language',
          'Sans2_Native_Language',
          'sans2_native_language',
        ],
        sans2Math: [
          'sans2Math', 
          'sans2math',
          'Sans2 Math',
          'sans2 math',
          'Sans2_Math',
          'sans2_math',
        ],
        sans2Science: [
          'sans2Science', 
          'sans2science',
          'Sans2 Science',
          'sans2 science',
          'Sans2_Science',
          'sans2_science',
        ],
        sans2History: [
          'sans2History', 
          'sans2history',
          'Sans2 History',
          'sans2 history',
          'Sans2_History',
          'sans2_history',
        ],
        sans2Geography: [
          'sans2Geography', 
          'sans2geography',
          'Sans2 Geography',
          'sans2 geography',
          'Sans2_Geography',
          'sans2_geography',
        ],
        sans2SocialStudies: [
          'sans2SocialStudies', 
          'sans2socialstudies',
          'Sans2 Social Studies',
          'sans2 social studies',
          'Sans2_Social_Studies',
          'sans2_social_studies',
        ],
        sans2HealthEd: [
          'sans2HealthEd', 
          'sans2healthed',
          'Sans2 Health Ed',
          'sans2 health ed',
          'Sans2_Health_Ed',
          'sans2_health_ed',
        ],
        sans2PE: [
          'sans2PE', 
          'sans2pe',
          'Sans2 PE',
          'sans2 pe',
          'Sans2_PE',
          'sans2_pe',
        ],
        sans2Dance: [
          'sans2Dance', 
          'sans2dance',
          'Sans2 Dance',
          'sans2 dance',
          'Sans2_Dance',
          'sans2_dance',
        ],
        sans2Drama: [
          'sans2Drama', 
          'sans2drama',
          'Sans2 Drama',
          'sans2 drama',
          'Sans2_Drama',
          'sans2_drama',
        ],
        sans2Music: [
          'sans2Music', 
          'sans2music',
          'Sans2 Music',
          'sans2 music',
          'Sans2_Music',
          'sans2_music',
        ],
        sans2VisualArts: [
          'sans2VisualArts', 
          'sans2visualarts',
          'Sans2 Visual Arts',
          'sans2 visual arts',
          'Sans2_Visual_Arts',
          'sans2_visual_arts',
        ],
        sans2Other: [
          'sans2Other', 
          'sans2other',
          'Sans2 Other',
          'sans2 other',
          'Sans2_Other',
          'sans2_other',
        ],
        
        // Handle typo variations
        responsibiity1: ['responsibiity1', 'responsibility1'],

        // Comments and Next Steps
        strengthsAndNextStepsForImprovement: ['strengthsAndNextStepsForImprovement'],
        strengthsAndNextStepsForImprovements2: [
          'strengthsAndNextStepsForImprovements2',
          'boardSpace',
          'boardspace',
          'BoardSpace',
          'BOARDSPACE',
        ],
        nextGrade: ['nextGrade'],

        // Language - Using actual PDF field names
        nativeLanguage: ['nativeLanguage'],
        languageStrengthAndNextStepsForImprovement: ['languageStrengthAndNextStepsForImprovement'],
        languageMarkReport1: ['languageMarkReport1'],
        languageMarkReport2: ['languageMarkReport2'],

        // French - Using actual PDF field names
        frenchStrengthAndNextStepsForImprovement: ['frenchStrengthAndNextStepsForImprovement'],
        frenchListeningMarkReport1: ['frenchListeningMarkReport1'],
        frenchListeningMarkReport2: ['frenchListeningMarkReport2'],
        frenchSpeakingMarkReport1: ['frenchSpeakingMarkReport1'],
        frenchSpeakingMarkReport2: ['frenchSpeakingMarkReport2'],
        frenchReadingMarkReport1: ['frenchReadingMarkReport1'],
        frenchReadingMarkReport2: ['frenchReadingMarkReport2'],
        frenchWritingMarkReport1: ['frenchWritingMarkReport1'],
        frenchWritingMarkReport2: ['frenchWritingMarkReport2'],

        // Native Language - Using actual PDF field names
        nativeLanguageStrengthAndNextStepsForImprovement: [
          'nativeLanguageStrengthAndNextStepsForImprovement',
        ],
        nativeLanguageMarkReport1: ['nativeLanguageMarkReport1'],
        nativeLanguageMarkReport2: ['nativeLanguageMarkReport2'],

        // Math - Using actual PDF field names
        mathStrengthAndNextStepsForImprovement: ['mathStrengthAndNextStepsForImprovement'],
        mathMarkReport1: ['mathMarkReport1'],
        mathMarkReport2: ['mathMarkReport2'],

        // Science - Using actual PDF field names
        scienceAndNextStepsForImprovement: ['scienceAndNextStepsForImprovement'],
        scienceMarkReport1: ['scienceMarkReport1'],
        scienceMarkReport2: ['scienceMarkReport2'],

        // Social Studies - Using actual PDF field names
        socialStudiesStrengthAndNextStepsForImprovement: [
          'socialStudiesStrengthAndNextStepsForImprovement',
        ],
        socialStudiesMarkReport1: ['socialStudiesMarkReport1'],
        socialStudiesMarkReport2: ['socialStudiesMarkReport2'],

        // Health and PE - Using actual PDF field names
        healthAndPEStrengthsAndNextStepsForImprovement: [
          'healthAndPEStrengthsAndNextStepsForImprovement',
        ],
        healthMarkReport1: ['healthMarkReport1'],
        healthMarkReport2: ['healthMarkReport2'],
        peMarkReport1: ['peMarkReport1'],
        peMarkReport2: ['peMarkReport2'],

        // Arts - Using actual PDF field names
        artsStrengthAndNextStepsForImprovement: ['artsStrengthAndNextStepsForImprovement'],
        danceMarkReport1: ['danceMarkReport1'],
        danceMarkReport2: ['danceMarkReport2'],
        dramaMarkReport1: ['dramaMarkReport1'],
        dramaMarkReport2: ['dramaMarkReport2'],
        musicMarkReport1: ['musicMarkReport1'],
        musicMarkReport2: ['musicMarkReport2'],
        visualArtsMarkReport1: ['visualArtsMarkReport1'],
        visualArtsMarkReport2: ['visualArtsMarkReport2'],

        // Other - Using actual PDF field names
        other: ['other'],
        otherSubjectName: ['other'], // Map otherSubjectName to the PDF field 'other'
        otherStrengthAndNextStepsForImprovement: ['otherStrengthAndNextStepsForImprovement'],
        otherMarkReport1: ['otherMarkReport1'],
        otherMarkReport2: ['otherMarkReport2'],

        // ERS Date - Using actual PDF field names
        ERSYear: ['ERSYear'],
        ERSMonth: ['ERSMonth'],
        ERSDay: ['ERSDay'],

        // Keep existing checkbox mappings - these are already correct
        // PDF field names are camelCase, so prioritize exact match first
        languageNA: ['languageNA', 'Language Na', 'Language NA', 'Language_NA'],
        languageESL: ['languageESL', 'Language Esl', 'Language ESL', 'Language_ESL'],
        languageIEP: ['languageIEP', 'Language Iep', 'Language IEP', 'Language_IEP'],

        // Add mappings for lowercase field names used in the form
        // PDF field names are camelCase, so prioritize exact match first
        languageesl: ['languageESL', 'Language Esl', 'Language ESL', 'Language_ESL'],
        languageiep: ['languageIEP', 'Language Iep', 'Language IEP', 'Language_IEP'],
        languagena: ['languageNA', 'Language Na', 'Language NA', 'Language_NA'],
        frenchesl: ['French Esl', 'frenchESL', 'French ESL', 'French_ESL'],
        frenchiep: ['French Iep', 'frenchIEP', 'French IEP', 'French_IEP'],
        frenchna: ['French Na', 'frenchNA', 'French NA', 'French_NA'],
        frenchcore: ['French Core', 'frenchCore', 'French Core', 'French_Core'],
        frenchimmersion: [
          'French Immersion',
          'frenchImmersion',
          'French Immersion',
          'French_Immersion',
        ],
        frenchextended: ['French Extended', 'frenchExtended', 'French Extended', 'French_Extended'],
        nativelanguageesl: [
          'Native Language Esl',
          'nativeLanguageESL',
          'Native Language ESL',
          'Native_Language_ESL',
        ],
        nativelanguageiep: [
          'Native Language Iep',
          'nativeLanguageIEP',
          'Native Language IEP',
          'Native_Language_IEP',
        ],
        nativelanguagena: [
          'Native Language Na',
          'nativeLanguageNA',
          'Native Language NA',
          'Native_Language_NA',
        ],
        mathesl: ['Math Esl', 'mathESL', 'Math ESL', 'Math_ESL'],
        mathiep: ['Math Iep', 'mathIEP', 'Math IEP', 'Math_IEP'],
        mathfrench: ['Math French', 'mathFrench', 'Math French', 'Math_French'],
        scienceesl: ['Science Esl', 'scienceESL', 'Science ESL', 'Science_ESL'],
        scienceiep: ['Science Iep', 'scienceIEP', 'Science IEP', 'Science_IEP'],
        sciencefrench: ['Science French', 'scienceFrench', 'Science French', 'Science_French'],
        socialstudiesesl: [
          'Social Studies Esl',
          'socialStudiesESL',
          'Social Studies ESL',
          'Social_Studies_ESL',
        ],
        socialstudiesiep: [
          'Social Studies Iep',
          'socialStudiesIEP',
          'Social Studies IEP',
          'Social_Studies_IEP',
        ],
        socialstudiesfrench: [
          'Social Studies French',
          'socialStudiesFrench',
          'Social Studies French',
          'Social_Studies_French',
        ],
        healthedesl: ['Health Ed Esl', 'healthEdESL', 'Health Ed ESL', 'Health_Ed_ESL'],
        healthediep: ['Health Ed Iep', 'healthEdIEP', 'Health Ed IEP', 'Health_Ed_IEP'],
        healthedfrench: [
          'Health Ed French',
          'healthEdFrench',
          'Health Ed French',
          'Health_Ed_French',
        ],
        peesl: ['PE Esl', 'peESL', 'PE ESL', 'PE_ESL'],
        peiep: ['PE Iep', 'peIEP', 'PE IEP', 'PE_IEP'],
        pefrench: ['PE French', 'peFrench', 'PE French', 'PE_French'],
        danceesl: ['Dance Esl', 'danceESL', 'Dance ESL', 'Dance_ESL'],
        danceiep: ['Dance Iep', 'danceIEP', 'Dance IEP', 'Dance_IEP'],
        dancefrench: ['Dance French', 'danceFrench', 'Dance French', 'Dance_French'],
        dancena: ['Dance Na', 'danceNA', 'Dance NA', 'Dance_NA'],
        dramaesl: ['Drama Esl', 'dramaESL', 'Drama ESL', 'Drama_ESL'],
        dramaiep: ['Drama Iep', 'dramaIEP', 'Drama IEP', 'Drama_IEP'],
        dramafrench: ['Drama French', 'dramaFrench', 'Drama French', 'Drama_French'],
        dramana: ['Drama Na', 'dramaNA', 'Drama NA', 'Drama_NA'],
        musicesl: ['Music Esl', 'musicESL', 'Music ESL', 'Music_ESL'],
        musiciep: ['Music Iep', 'musicIEP', 'Music IEP', 'Music_IEP'],
        musicfrench: ['Music French', 'musicFrench', 'Music French', 'Music_French'],
        musicna: ['Music Na', 'musicNA', 'Music NA', 'Music_NA'],
        visualartsesl: ['Visual Arts Esl', 'visualArtsESL', 'Visual Arts ESL', 'Visual_Arts_ESL'],
        visualartsiep: ['Visual Arts Iep', 'visualArtsIEP', 'Visual Arts IEP', 'Visual_Arts_IEP'],
        visualartsfrench: [
          'Visual Arts French',
          'visualArtsFrench',
          'Visual Arts French',
          'Visual_Arts_French',
        ],
        visualartsna: ['Visual Arts Na', 'visualArtsNA', 'Visual Arts NA', 'Visual_Arts_NA'],
        otheresl: ['Other Esl', 'otherESL', 'Other ESL', 'Other_ESL'],
        otheriep: ['Other Iep', 'otherIEP', 'Other IEP', 'Other_IEP'],
        otherfrench: ['Other French', 'otherFrench', 'Other French', 'Other_French'],
        otherna: ['Other Na', 'otherNA', 'Other NA', 'Other_NA'],

        // Performance level mappings
        languagewithdifficulty: [
          'Language With Difficulty',
          'languageWithDifficulty',
          'Language With Difficulty',
          'Language_With_Difficulty',
        ],
        languagewell: ['Language Well', 'languageWell', 'Language Well', 'Language_Well'],
        languageverywell: [
          'Language Very Well',
          'languageVeryWell',
          'Language Very Well',
          'Language_Very_Well',
        ],
        nativelanguagewithdifficulty: [
          'Native Language With Difficulty',
          'nativeLanguageWithDifficulty',
          'Native Language With Difficulty',
          'Native_Language_With_Difficulty',
        ],
        nativelanguagewell: [
          'Native Language Well',
          'nativeLanguageWell',
          'Native Language Well',
          'Native_Language_Well',
        ],
        nativelanguageverywell: [
          'Native Language Very Well',
          'nativeLanguageVeryWell',
          'Native Language Very Well',
          'Native_Language_Very_Well',
        ],
        mathwithdifficulty: [
          'Math With Difficulty',
          'mathWithDifficulty',
          'Math With Difficulty',
          'Math_With_Difficulty',
        ],
        mathwell: ['Math Well', 'mathWell', 'Math Well', 'Math_Well'],
        mathverywell: ['Math Very Well', 'mathVeryWell', 'Math Very Well', 'Math_Very_Well'],
        sciencewithdifficulty: [
          'Science With Difficulty',
          'scienceWithDifficulty',
          'Science With Difficulty',
          'Science_With_Difficulty',
        ],
        sciencewell: ['Science Well', 'scienceWell', 'Science Well', 'Science_Well'],
        scienceverywell: [
          'Science Very Well',
          'scienceVeryWell',
          'Science Very Well',
          'Science_Very_Well',
        ],
        socialwithdifficulty: [
          'Social With Difficulty',
          'socialWithDifficulty',
          'Social With Difficulty',
          'Social_With_Difficulty',
        ],
        socialstudieswell: [
          'Social Studies Well',
          'socialStudiesWell',
          'Social Studies Well',
          'Social_Studies_Well',
        ],
        socialstudiesverywell: [
          'Social Studies Very Well',
          'socialStudiesVeryWell',
          'Social Studies Very Well',
          'Social_Studies_Very_Well',
        ],
        healthedwithdifficulty: [
          'Health Ed With Difficulty',
          'healthEdWithDifficulty',
          'Health Ed With Difficulty',
          'Health_Ed_With_Difficulty',
        ],
        healthedwell: ['Health Ed Well', 'healthEdWell', 'Health Ed Well', 'Health_Ed_Well'],
        healthedverywell: [
          'Health Ed Very Well',
          'healthEdVeryWell',
          'Health Ed Very Well',
          'Health_Ed_Very_Well',
        ],
        pewithdifficulty: [
          'PE With Difficulty',
          'peWithDifficulty',
          'PE With Difficulty',
          'PE_With_Difficulty',
        ],
        pewell: ['PE Well', 'peWell', 'PE Well', 'PE_Well'],
        peverywell: ['PE Very Well', 'peVeryWell', 'PE Very Well', 'PE_Very_Well'],
        dancewithdifficulty: [
          'Dance With Difficulty',
          'danceWithDifficulty',
          'Dance With Difficulty',
          'Dance_With_Difficulty',
        ],
        dancewell: ['Dance Well', 'danceWell', 'Dance Well', 'Dance_Well'],
        danceverywell: ['Dance Very Well', 'danceVeryWell', 'Dance Very Well', 'Dance_Very_Well'],
        dramawithdifficulty: [
          'Drama With Difficulty',
          'dramaWithDifficulty',
          'Drama With Difficulty',
          'Drama_With_Difficulty',
        ],
        dramawell: ['Drama Well', 'dramaWell', 'Drama Well', 'Drama_Well'],
        dramaverywell: ['Drama Very Well', 'dramaVeryWell', 'Drama Very Well', 'Drama_Very_Well'],
        musicwithdifficulty: [
          'Music With Difficulty',
          'musicWithDifficulty',
          'Music With Difficulty',
          'Music_With_Difficulty',
        ],
        musicwell: ['Music Well', 'musicWell', 'Music Well', 'Music_Well'],
        musicverywell: ['Music Very Well', 'musicVeryWell', 'Music Very Well', 'Music_Very_Well'],
        visualartswithdifficulty: [
          'Visual Arts With Difficulty',
          'visualArtsWithDifficulty',
          'Visual Arts With Difficulty',
          'Visual_Arts_With_Difficulty',
        ],
        visualartswell: [
          'Visual Arts Well',
          'visualArtsWell',
          'Visual Arts Well',
          'Visual_Arts_Well',
        ],
        visualartsverywell: [
          'Visual Arts Very Well',
          'visualArtsVeryWell',
          'Visual Arts Very Well',
          'Visual_Arts_Very_Well',
        ],
        otherwithdifficulty: [
          'Other With Difficulty',
          'otherWithDifficulty',
          'Other With Difficulty',
          'Other_With_Difficulty',
        ],
        otherwell: ['Other Well', 'otherWell', 'Other Well', 'Other_Well'],
        otherverywell: ['Other Very Well', 'otherVeryWell', 'Other Very Well', 'Other_Very_Well'],

        // Signature field mappings
        teachersignature: [
          'teacherSignature',
          "Teacher's Signature",
          'Teacher Signature',
          'Signature1',
          'Text_1',
        ],
        principalsignature: [
          'principalSignature',
          "Principal's Signature",
          'Principal Signature',
          'Signature2',
          'Number_1',
        ],
        // Additional signature field mappings
        Text_1: ['Text_1', 'teacherSignature', "Teacher's Signature", 'Teacher Signature'],
        Number_1: [
          'Number_1',
          'principalSignature',
          "Principal's Signature",
          'Principal Signature',
        ],
        Number_2: ['Number_2'], // Additional field if needed

        languageWithDifficulty: [
          'languageWithDifficulty',
          'Language With Difficulty',
          'Language_With_Difficulty',
        ],
        languageWell: ['languageWell', 'Language Well', 'Language_Well'],
        languageVeryWell: ['languageVeryWell', 'Language Very Well', 'Language_Very_Well'],

        frenchESL: ['frenchESL', 'French ESL', 'French_ESL'],
        frenchIEP: ['frenchIEP', 'French IEP', 'French_IEP'],
        frenchNA: ['frenchNA', 'French NA', 'French_NA'],
        frenchCore: ['frenchCore', 'French Core', 'French_Core'],
        frenchImmersion: ['frenchImmersion', 'French Immersion', 'French_Immersion'],
        frenchExtended: ['frenchExtended', 'French Extended', 'French_Extended'],
        frenchWithDifficulty: [
          'frenchWithDifficulty',
          'French With Difficulty',
          'French_With_Difficulty',
        ],
        frenchWell: ['frenchWell', 'French Well', 'French_Well'],
        frenchVeryWell: ['frenchVeryWell', 'French Very Well', 'French_Very_Well'],

        nativeLanguageESL: ['nativeLanguageESL', 'Native Language ESL', 'Native_Language_ESL'],
        nativeLanguageIEP: ['nativeLanguageIEP', 'Native Language IEP', 'Native_Language_IEP'],
        nativeLanguageNA: ['nativeLanguageNA', 'Native Language NA', 'Native_Language_NA'],
        nativeLanguageWithDifficulty: [
          'nativeLanguageWithDifficulty',
          'Native Language With Difficulty',
          'Native_Language_With_Difficulty',
        ],
        nativeLanguageWell: ['nativeLanguageWell', 'Native Language Well', 'Native_Language_Well'],
        nativeLanguageVeryWell: [
          'nativeLanguageVeryWell',
          'Native Language Very Well',
          'Native_Language_Very_Well',
        ],

        mathESL: ['mathESL', 'Math ESL', 'Math_ESL'],
        mathIEP: ['mathIEP', 'Math IEP', 'Math_IEP'],
        mathFrench: ['mathFrench', 'Math French', 'Math_French'],
        mathWithDifficulty: ['mathWithDifficulty', 'Math With Difficulty', 'Math_With_Difficulty'],
        mathWell: ['mathWell', 'Math Well', 'Math_Well'],
        mathVeryWell: ['mathVeryWell', 'Math Very Well', 'Math_Very_Well'],

        scienceESL: ['scienceESL', 'Science ESL', 'Science_ESL'],
        scienceIEP: ['scienceIEP', 'Science IEP', 'Science_IEP'],
        scienceFrench: ['scienceFrench', 'Science French', 'Science_French'],
        scienceWithDifficulty: [
          'scienceWithDifficulty',
          'Science With Difficulty',
          'Science_With_Difficulty',
        ],
        scienceWell: ['scienceWell', 'Science Well', 'Science_Well'],
        scienceVeryWell: ['scienceVeryWell', 'Science Very Well', 'Science_Very_Well'],

        socialStudiesESL: ['socialStudiesESL', 'Social Studies ESL', 'Social_Studies_ESL'],
        socialStudiesIEP: ['socialStudiesIEP', 'Social Studies IEP', 'Social_Studies_IEP'],
        socialStudiesFrench: [
          'socialStudiesFrench',
          'Social Studies French',
          'Social_Studies_French',
        ],
        socialWithDifficulty: [
          'socialWithDifficulty',
          'Social With Difficulty',
          'Social_With_Difficulty',
        ],
        socialStudiesWell: ['socialStudiesWell', 'Social Studies Well', 'Social_Studies_Well'],
        socialStudiesVeryWell: [
          'socialStudiesVeryWell',
          'Social Studies Very Well',
          'Social_Studies_Very_Well',
        ],

        healthEdESL: ['healthEdESL', 'Health Ed ESL', 'Health_Ed_ESL'],
        healthEdIEP: ['healthEdIEP', 'Health Ed IEP', 'Health_Ed_IEP'],
        healthEdFrench: ['healthEdFrench', 'Health Ed French', 'Health_Ed_French'],
        healthEdWithDifficulty: [
          'healthEdWithDifficulty',
          'Health Ed With Difficulty',
          'Health_Ed_With_Difficulty',
        ],
        healthEdWell: ['healthEdWell', 'Health Ed Well', 'Health_Ed_Well'],
        healthEdVeryWell: ['healthEdVeryWell', 'Health Ed Very Well', 'Health_Ed_Very_Well'],

        peESL: ['peESL', 'PE ESL', 'PE_ESL'],
        peIEP: ['peIEP', 'PE IEP', 'PE_IEP'],
        peFrench: ['peFrench', 'PE French', 'PE_French'],
        peWithDifficulty: ['peWithDifficulty', 'PE With Difficulty', 'PE_With_Difficulty'],
        peWell: ['peWell', 'PE Well', 'PE_Well'],
        peVeryWell: ['peVeryWell', 'PE Very Well', 'PE_Very_Well'],

        danceESL: ['danceESL', 'Dance ESL', 'Dance_ESL'],
        danceIEP: ['danceIEP', 'Dance IEP', 'Dance_IEP'],
        danceFrench: ['danceFrench', 'Dance French', 'Dance_French'],
        danceNA: ['danceNA', 'Dance NA', 'Dance_NA'],
        danceWithDifficulty: [
          'danceWithDifficulty',
          'Dance With Difficulty',
          'Dance_With_Difficulty',
        ],
        danceWell: ['danceWell', 'Dance Well', 'Dance_Well'],
        danceVeryWell: ['danceVeryWell', 'Dance Very Well', 'Dance_Very_Well'],

        dramaESL: ['dramaESL', 'Drama ESL', 'Drama_ESL'],
        dramaIEP: ['dramaIEP', 'Drama IEP', 'Drama_IEP'],
        dramaFrench: ['dramaFrench', 'Drama French', 'Drama_French'],
        dramaNA: ['dramaNA', 'Drama NA', 'Drama_NA'],
        dramaWithDifficulty: [
          'dramaWithDifficulty',
          'Drama With Difficulty',
          'Drama_With_Difficulty',
        ],
        dramaWell: ['dramaWell', 'Drama Well', 'Drama_Well'],
        dramaVeryWell: ['dramaVeryWell', 'Drama Very Well', 'Drama_Very_Well'],

        musicESL: ['musicESL', 'Music ESL', 'Music_ESL'],
        musicIEP: ['musicIEP', 'Music IEP', 'Music_IEP'],
        musicFrench: ['musicFrench', 'Music French', 'Music_French'],
        musicNA: ['musicNA', 'Music NA', 'Music_NA'],
        musicWithDifficulty: [
          'musicWithDifficulty',
          'Music With Difficulty',
          'Music_With_Difficulty',
        ],
        musicWell: ['musicWell', 'Music Well', 'Music_Well'],
        musicVeryWell: ['musicVeryWell', 'Music Very Well', 'Music_Very_Well'],

        visualArtsESL: ['visualArtsESL', 'Visual Arts ESL', 'Visual_Arts_ESL'],
        visualArtsIEP: ['visualArtsIEP', 'Visual Arts IEP', 'Visual_Arts_IEP'],
        visualArtsFrench: ['visualArtsFrench', 'Visual Arts French', 'Visual_Arts_French'],
        visualArtsNA: ['visualArtsNA', 'Visual Arts NA', 'Visual_Arts_NA'],
        visualArtsWithDifficulty: [
          'visualArtsWithDifficulty',
          'Visual Arts With Difficulty',
          'Visual_Arts_With_Difficulty',
        ],
        visualArtsWell: ['visualArtsWell', 'Visual Arts Well', 'Visual_Arts_Well'],
        visualArtsVeryWell: [
          'visualArtsVeryWell',
          'Visual Arts Very Well',
          'Visual_Arts_Very_Well',
        ],

        otherESL: ['otherESL', 'Other ESL', 'Other_ESL'],
        otherIEP: ['otherIEP', 'Other IEP', 'Other_IEP'],
        otherFrench: ['otherFrench', 'Other French', 'Other_French'],
        otherNA: ['otherNA', 'Other NA', 'Other_NA'],
        otherWithDifficulty: [
          'otherWithDifficulty',
          'Other With Difficulty',
          'Other_With_Difficulty',
        ],
        otherWell: ['otherWell', 'Other Well', 'Other_Well'],
        otherVeryWell: ['otherVeryWell', 'Other Very Well', 'Other_Very_Well'],

        ERSBenchmarkNo: ['ERSBenchmarkNo', 'ERS Benchmark No', 'ERS_Benchmark_No'],

        // Add mappings for any legacy form field names that might still be used
        student_name: ['student'],
        teacher_name: ['teacher'],
        oen: ['OEN'],
        school_address: ['schoolAddress'],
        board_address: ['boardAddress'],
        days_absent: ['daysAbsent'],
        total_days_absent: ['totalDaysAbsent'],
        times_late: ['timesLate'],
        total_times_late: ['totalTimesLate'],
        // Additional comments mapping
        additional_comments: ['boardSpace'],
        comments: ['boardSpace'],
      }

      // Add exact mappings if they exist
      if (exactFieldMappings[formKey]) {
        variations.push(...exactFieldMappings[formKey])
      }

      // For progress reports, only return exact field name and exactFieldMappings (no other variations)
      if (isProgressReport) {
        return [...new Set(variations)] // Remove duplicates
      }

      // For other report types, add additional variations
      // Convert underscores to spaces and title case
      const titleCase = formKey
        .replace(/[_-]/g, ' ')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
      variations.push(titleCase)

      // All uppercase
      variations.push(formKey.toUpperCase())
      variations.push(titleCase.toUpperCase())

      // Remove underscores and hyphens
      variations.push(formKey.replace(/[_-]/g, ''))

      // CamelCase
      const camelCase = formKey
        .split(/[_-]/)
        .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
        .join('')
      variations.push(camelCase)

      // PascalCase
      const pascalCase = formKey
        .split(/[_-]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join('')
      variations.push(pascalCase)

      // Add common field name patterns
      if (formKey.includes('name')) {
        variations.push('Name', 'NAME', 'Student', 'STUDENT')
      }
      if (formKey.includes('grade')) {
        variations.push('Grade', 'GRADE')
      }
      if (formKey.includes('school')) {
        variations.push('School', 'SCHOOL')
      }

      return [...new Set(variations)] // Remove duplicates
    }

    // Determine if a field should be left-aligned
    // Fields like name, grade, teacher, principal, and comments should be left-aligned
    const shouldBeLeftAligned = (fieldName) => {
      if (!fieldName) return false
      const lowerName = fieldName.toLowerCase()
      
      // Fields that should be left-aligned
      const leftAlignFields = [
        'name', 'student', 'studentname',
        'grade',
        'teacher', 'teachernam', 'teachername',
        'principal', 'principle', 'principalname',
        'sans', // Comments field
        'strengths', 'nextsteps', 'improvement',
        'comments', 'comment',
      ]
      
      return leftAlignFields.some(field => lowerName.includes(field))
    }

    // Fill a specific PDF field with a value
    const fillPDFField = (field, value, font = null, fontSize = 10) => {
      try {
        const fieldType = field.constructor.name
        const fieldName = field.getName()

        console.log(
          `PDFViewer: Attempting to fill field "${fieldName}" (${fieldType}) with value:`,
          value,
          typeof value,
        )

        // For ambiguous field types like 'e', detect the actual field type by checking available methods
        let actualFieldType = fieldType
        if (fieldType === 'e') {
          // Check if it has checkbox methods
          if (typeof field.check === 'function' && typeof field.isChecked === 'function') {
            actualFieldType = 'PDFCheckBox'
            console.log(`PDFViewer: Detected type 'e' as checkbox for field "${fieldName}"`)
          }
          // Check if it has text field methods
          else if (typeof field.setText === 'function' && typeof field.getText === 'function') {
            actualFieldType = 'PDFTextField'
            console.log(`PDFViewer: Detected type 'e' as text field for field "${fieldName}"`)
          }
          else {
            console.warn(`PDFViewer: Could not determine actual type for field "${fieldName}" with type 'e'`)
          }
        }

        switch (actualFieldType) {
          case 'PDFTextField':
          case 'PDFTextField2': // Add explicit support for PDFTextField2
            const stringValue = value.toString()
            field.setText(stringValue)
            
            // Update field appearance with specified font and font size (10pt Times Roman)
            if (font) {
              try {
                // Set default appearance with font size before updating appearances
                const acroField = field.acroField
                // Set text alignment using quadding (Q) property
                // 0=left, 1=center, 2=right
                const alignment = shouldBeLeftAligned(fieldName) ? 0 : 1
                acroField.setDefaultAppearance(`/F1 ${fontSize} Tf 0 g`)
                
                // Set the quadding (Q) property on the field's dictionary
                // This controls text alignment within the field
                try {
                  acroField.dict.set(PDFName.of('Q'), PDFNumber.of(alignment))
                } catch (quaddingError) {
                  console.warn(`PDFViewer: Could not set quadding for "${fieldName}":`, quaddingError)
                }
                
                // Update appearances with the font (this will properly reference the font)
                field.updateAppearances(font)
                
                console.log(
                  `PDFViewer: ✅ Updated text field "${fieldName}" appearance with font size ${fontSize}pt, alignment: ${alignment === 0 ? 'left' : 'center'}`,
                )
              } catch (appearanceError) {
                console.warn(
                  `PDFViewer: Could not update appearance for "${fieldName}":`,
                  appearanceError,
                )
                // Try to update appearances without setting default appearance
                try {
                  field.updateAppearances(font)
                } catch (fallbackError) {
                  console.warn(`PDFViewer: Fallback appearance update also failed for "${fieldName}"`)
                }
              }
            }
            
            console.log(
              `PDFViewer: ✅ Successfully filled text field "${fieldName}" (${fieldType}) with: "${stringValue}"`,
            )
            return true

          case 'PDFCheckBox':
          case 'PDFCheckBox2': // Add support for PDFCheckBox2 type
            // Handle boolean values correctly
            let shouldCheck = false

            if (typeof value === 'boolean') {
              shouldCheck = value
            } else if (typeof value === 'string') {
              const lowerValue = value.toLowerCase().trim()
              shouldCheck = ['true', 'yes', '1', 'checked', 'x', 'on'].includes(lowerValue)
            } else if (typeof value === 'number') {
              shouldCheck = value === 1
            }

            if (shouldCheck) {
              // Try multiple approaches to set checkbox value
              try {
                // Get export values to find the correct "checked" value
                const exportValues = field.acroField.getExportValues()
                const checkedValue = exportValues && exportValues.length > 0 ? exportValues[0] : 'Yes'
                
                // Approach 1: Use the standard check method
                field.check()

                // Approach 2: Set the value directly using the export value
                field.acroField.setValue(checkedValue)
                field.acroField.setExportValue(checkedValue)

                // Approach 3: Force update the appearance after setting value
                // Use pdf-lib's updateAppearances method if available
                try {
                  if (field.updateAppearances) {
                    field.updateAppearances()
                  } else {
                    // Fallback: manually update widget appearances
                    const widgets = field.acroField.getWidgets()
                    for (const widget of widgets) {
                      try {
                        // Force the appearance to update by getting and setting it
                        const ap = widget.getAP()
                        if (ap) {
                          widget.setAP(ap)
                        }
                      } catch (widgetError) {
                        // Continue if widget update fails
                      }
                    }
                  }
                } catch (appearanceError) {
                  console.warn(`PDFViewer: Could not update checkbox appearance for "${fieldName}":`, appearanceError)
                }

                console.log(
                  `PDFViewer: ✅ Successfully checked checkbox "${fieldName}" (${fieldType}) with value "${checkedValue}"`,
                )
              } catch (error) {
                console.warn(`PDFViewer: Error setting checkbox "${fieldName}":`, error)
                // Fallback to basic method
                try {
                  field.check()
                  console.log(
                    `PDFViewer: ✅ Successfully checked checkbox "${fieldName}" (${fieldType}) - fallback method`,
                  )
                } catch (fallbackError) {
                  console.error(`PDFViewer: ❌ Failed to check checkbox "${fieldName}":`, fallbackError)
                  return false
                }
              }
            } else {
              // Try multiple approaches to unset checkbox value
              try {
                // Approach 1: Use the standard uncheck method
                field.uncheck()

                // Approach 2: Set the value directly
                field.acroField.setValue('Off')
                field.acroField.setExportValue('Off')

                // Approach 3: Force update the appearance after unsetting value
                try {
                  if (field.updateAppearances) {
                    field.updateAppearances()
                  } else {
                    // Fallback: manually update widget appearances
                    const widgets = field.acroField.getWidgets()
                    for (const widget of widgets) {
                      try {
                        // Force the appearance to update
                        const ap = widget.getAP()
                        if (ap) {
                          widget.setAP(ap)
                        }
                      } catch (widgetError) {
                        // Continue if widget update fails
                      }
                    }
                  }
                } catch (appearanceError) {
                  console.warn(`PDFViewer: Could not update checkbox appearance for "${fieldName}":`, appearanceError)
                }

                console.log(
                  `PDFViewer: ✅ Successfully unchecked checkbox "${fieldName}" (${fieldType})`,
                )
              } catch (error) {
                console.warn(`PDFViewer: Error unsetting checkbox "${fieldName}":`, error)
                // Fallback to basic method
                try {
                  field.uncheck()
                  console.log(
                    `PDFViewer: ✅ Successfully unchecked checkbox "${fieldName}" (${fieldType}) - fallback method`,
                  )
                } catch (fallbackError) {
                  console.error(`PDFViewer: ❌ Failed to uncheck checkbox "${fieldName}":`, fallbackError)
                  return false
                }
              }
            }
            return true

          case 'PDFDropdown':
            const stringVal = value.toString()
            const options = field.getOptions()
            if (options.includes(stringVal)) {
              field.select(stringVal)
              console.log(
                `PDFViewer: ✅ Successfully selected dropdown option "${stringVal}" for field "${fieldName}"`,
              )
              return true
            }
            // Try case-insensitive match
            const matchingOption = options.find(
              (opt) => opt.toLowerCase() === stringVal.toLowerCase(),
            )
            if (matchingOption) {
              field.select(matchingOption)
              console.log(
                `PDFViewer: ✅ Successfully selected dropdown option "${matchingOption}" (case-insensitive) for field "${fieldName}"`,
              )
              return true
            }
            console.warn(
              `PDFViewer: ❌ Could not match dropdown value "${stringVal}" for field "${fieldName}". Available options:`,
              options,
            )
            break

          case 'PDFRadioGroup':
            try {
              const radioVal = value.toString()
              field.select(radioVal)
              console.log(
                `PDFViewer: ✅ Successfully selected radio option "${radioVal}" for field "${fieldName}"`,
              )
              return true
            } catch (radioError) {
              // Try with available options
              const radioOptions = field.getOptions()
              const matchingRadioOption = radioOptions.find(
                (opt) => opt.toLowerCase() === value.toString().toLowerCase(),
              )
              if (matchingRadioOption) {
                field.select(matchingRadioOption)
                console.log(
                  `PDFViewer: ✅ Successfully selected radio option "${matchingRadioOption}" (case-insensitive) for field "${fieldName}"`,
                )
                return true
              }
              console.warn(
                `PDFViewer: ❌ Could not match radio value "${value}" for field "${fieldName}". Available options:`,
                radioOptions,
              )
            }
            break

          default:
            // Try to set as text for unknown field types
            if (field.setText) {
              field.setText(value.toString())
              console.log(
                `PDFViewer: ✅ Successfully filled unknown field type "${fieldName}" (${fieldType}) as text`,
              )
              return true
            }
            console.warn(`PDFViewer: ❌ Unknown field type "${fieldType}" for field "${fieldName}"`)
            break
        }
      } catch (error) {
        console.error(
          `PDFViewer: ❌ Error filling field "${field.getName()}" of type ${field.constructor.name}:`,
          error,
        )
      }

      return false
    }

    const renderPage = async () => {
      if (!pdfDocument || !canvasRef.current) return

      try {
        const page = await pdfDocument.getPage(pageNumber)
        const viewport = page.getViewport({ scale })

        const canvas = canvasRef.current
        const context = canvas.getContext('2d')

        canvas.width = viewport.width
        canvas.height = viewport.height

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }

        await page.render(renderContext).promise
        console.log('PDFViewer: Page', pageNumber, 'rendered successfully')
      } catch (error) {
        console.error('PDFViewer: Error rendering page:', error)
        setError(`Failed to render page ${pageNumber}: ${error.message}`)
      }
    }

    const goToPrevPage = () => {
      if (pageNumber > 1) {
        setPageNumber(pageNumber - 1)
      }
    }

    const goToNextPage = () => {
      if (pageNumber < numPages) {
        setPageNumber(pageNumber + 1)
      }
    }

    const zoomIn = () => {
      setScale((prev) => Math.min(prev + 0.2, 2.0))
    }

    const zoomOut = () => {
      setScale((prev) => Math.max(prev - 0.2, 0.4))
    }

    const handleRetry = () => {
      console.log('PDFViewer: Manual retry requested for:', pdfUrl)
      setRetryCount(0) // Reset retry count for manual retry
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      loadPDF()
    }

    // Clean up blob URLs on unmount
    useEffect(() => {
      return () => {
        if (filledPdfUrl) {
          URL.revokeObjectURL(filledPdfUrl)
        }
      }
    }, [filledPdfUrl])

    // Don't render anything if no PDF URL is provided
    if (!pdfUrl) {
      return (
        <div className={`pdf-viewer-container ${className}`}>
          <div className="pdf-error" style={{ padding: '20px', textAlign: 'center' }}>
            <h5>No PDF Selected</h5>
            <p>Please select a report card type to view the PDF template.</p>
          </div>
        </div>
      )
    }

    if (error && !isRetrying) {
      const isRetryableError =
        error.includes('Loading PDF...') ||
        error.includes('ERR_FILE_NOT_FOUND') ||
        error.includes('UnexpectedResponseException')

      return (
        <div className={`pdf-viewer-container ${className}`}>
          <div
            className="pdf-error"
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              margin: '20px',
            }}
          >
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
                <div
                  style={{
                    backgroundColor: '#e9ecef',
                    padding: '15px',
                    borderRadius: '6px',
                    marginBottom: '20px',
                    fontSize: '0.875rem',
                  }}
                >
                  <strong>Technical Details:</strong>
                  <br />
                  <code style={{ color: '#495057' }}>{pdfUrl}</code>
                </div>
                <CButton color="primary" onClick={handleRetry} className="me-2">
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
      )
    }

    return (
      <div className={`pdf-viewer-container ${className}`}>
        {/* PDF Controls */}
        <div
          className="pdf-controls"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px',
            borderBottom: '1px solid #dee2e6',
            backgroundColor: '#f8f9fa',
          }}
        >
          <div
            className="pdf-navigation"
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
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
                Live Preview{' '}
                {Object.keys(formData).filter(
                  (k) => formData[k] && formData[k].toString().trim() !== '',
                ).length > 0 &&
                  `(${Object.keys(formData).filter((k) => formData[k] && formData[k].toString().trim() !== '').length} fields filled)`}
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

            <span className="pdf-zoom-info">{Math.round(scale * 100)}%</span>

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
        <div
          className="pdf-document-container"
          style={{
            textAlign: 'center',
            padding: '20px',
            minHeight: '400px',
            overflow: 'auto',
            position: 'relative',
          }}
        >
          {loading && (
            <div className="pdf-loading" style={{ padding: '50px' }}>
              <CSpinner color="primary" />
              <p>
                {isRetrying ? (
                  <>
                    Loading PDF... (retry {retryCount}/{MAX_RETRIES})
                  </>
                ) : (
                  <>Loading PDF...</>
                )}
              </p>
              {showPreview && (
                <p>
                  <small>Filling form fields...</small>
                </p>
              )}
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
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              />
            </div>
          )}
        </div>
      </div>
    )
  },
)

PDFViewer.propTypes = {
  pdfUrl: PropTypes.string,
  className: PropTypes.string,
  formData: PropTypes.object,
  showPreview: PropTypes.bool,
  onFilledPdfGenerated: PropTypes.func,
}

export default PDFViewer
