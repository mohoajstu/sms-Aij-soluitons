import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min?url'

// Set up the worker for PDF.js - use local worker to avoid CORS issues
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

export async function pdfToImage(pdfUrl) {
  const loadingTask = pdfjsLib.getDocument(pdfUrl)
  const pdf = await loadingTask.promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 3 }) // Scale up for better OCR

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  canvas.width = viewport.width
  canvas.height = viewport.height

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  }

  await page.render(renderContext).promise

  return canvas.toDataURL('image/png') // Return high-res image for OCR
}
