import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min?url'
import { PDFDocument } from 'pdf-lib'

const PRINT_SCALE = 2

// Render in display mode to retain visible form fields that native PDF printing
// can omit from previously approved reports. Keep the original paper dimensions.
export const renderReportForPrint = async (bytes) => {
  GlobalWorkerOptions.workerSrc = pdfWorker
  const task = getDocument({
    data: bytes,
    isEvalSupported: false,
    cMapUrl: '/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/standard_fonts/',
  })

  try {
    const source = await task.promise
    const output = await PDFDocument.create()
    for (let index = 1; index <= source.numPages; index++) {
      const page = await source.getPage(index)
      const paper = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: PRINT_SCALE })
      const canvas = document.createElement('canvas')
      try {
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        const canvasContext = canvas.getContext('2d')
        if (!canvasContext) throw new Error('The browser could not prepare a report page for printing.')
        await page.render({ canvasContext, viewport, intent: 'display' }).promise

        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
        if (!blob) throw new Error('The browser could not finish a report page for printing.')
        const image = await output.embedPng(await blob.arrayBuffer())
        output.addPage([paper.width, paper.height]).drawImage(image, {
          x: 0,
          y: 0,
          width: paper.width,
          height: paper.height,
        })
      } finally {
        canvas.width = 0
        canvas.height = 0
        page.cleanup()
      }
    }
    return await output.save()
  } finally {
    await task.destroy()
  }
}
