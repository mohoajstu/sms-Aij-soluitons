/**
 * Prints a PDF directly, without the user downloading it first.
 *
 * Printing the web page (Ctrl+P) does not work for report cards: the final PDF
 * is shown in an iframe pointing at Firebase Storage, which Chrome prints as a
 * blank box, and draft previews are drawn on a canvas inside the page layout.
 * Instead, load the PDF into a hidden same-origin iframe (a blob: URL) and
 * call print() on that frame, so the browser prints the PDF itself.
 */

let activeFrame = null
let activeUrl = null

const cleanup = () => {
  activeFrame?.remove()
  if (activeUrl) URL.revokeObjectURL(activeUrl)
  activeFrame = null
  activeUrl = null
}

const LOAD_TIMEOUT_MS = 8000

export const printPdfBytes = (bytes, { doc = document, win = window } = {}) =>
  new Promise((resolve, reject) => {
    // Keep the previous frame until the next print: removing it while the
    // print dialog is open cancels the print in some browsers.
    cleanup()
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
    activeUrl = url
    let settled = false
    let timer = null
    const finish = (mode) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(mode)
    }
    // Fallback for browsers without a built-in PDF viewer, or that cannot
    // print a PDF frame: open the PDF in a tab so it can be printed there.
    const openInTab = () => {
      win.open(url, '_blank')
      finish('opened-tab')
    }

    if (win.navigator?.pdfViewerEnabled === false) {
      openInTab()
      return
    }

    const frame = doc.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.title = 'Report card print'
    // Not display:none, which stops the frame loading the PDF viewer.
    Object.assign(frame.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: '1px',
      height: '1px',
      border: '0',
      opacity: '0',
    })
    // If the PDF never loads in the frame, don't leave the button spinning.
    timer = setTimeout(openInTab, LOAD_TIMEOUT_MS)
    frame.onload = () => {
      clearTimeout(timer)
      // Give the browser's PDF viewer a moment to lay out the pages.
      setTimeout(() => {
        try {
          frame.contentWindow.focus()
          frame.contentWindow.print()
          finish('printed')
        } catch (error) {
          openInTab()
        }
      }, 500)
    }
    frame.onerror = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(new Error('The browser could not open the PDF for printing.'))
    }
    activeFrame = frame
    frame.src = url
    doc.body.appendChild(frame)
  })

export const fetchPdfBytes = async (url) => {
  let response
  try {
    response = await fetch(url)
  } catch (error) {
    // A bare "Failed to fetch" here means the browser blocked reading the file
    // from Firebase Storage: the bucket needs a CORS rule for this site.
    throw new Error(
      'the browser was blocked from reading the PDF from Firebase Storage. The storage bucket needs a CORS rule that lets this site read files.',
    )
  }
  if (!response.ok) throw new Error(`Could not load the PDF (HTTP ${response.status}).`)
  return new Uint8Array(await response.arrayBuffer())
}

export const printPdfUrl = async (url) => printPdfBytes(await fetchPdfBytes(url))
