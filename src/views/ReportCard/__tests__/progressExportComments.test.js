import { describe, it, expect, beforeAll, vi } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { PDFDocument } from 'pdf-lib'
import { exportProgressReport1to6 } from '../exportProgressReport1to6'
import { exportProgressReport7to8 } from '../exportProgressReport7to8'

/**
 * Regression: the 7-8 progress template's signature fields have no
 * appearance, so form.flatten() threw partway through and every subject
 * comment on page 2 was dropped from the downloaded/printed PDF (checkmarks
 * on page 1 still showed). Every comment must reach the exported PDF.
 */

const templatePath = (name) =>
  fileURLToPath(new URL(`../../../assets/ReportCards/${name}`, import.meta.url))

beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  globalThis.fetch = async (path) => {
    const bytes = readFileSync(templatePath(decodeURIComponent(path.split('/').pop())))
    return {
      ok: true,
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    }
  }
})

const extractText = async (bytes) => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise
  let text = ''
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    text += (await page.getTextContent()).items.map((item) => item.str).join(' ') + '\n'
  }
  return text
}

describe.each([
  ['1-6-edu-elementary-progress-report-card-public-schools.pdf', exportProgressReport1to6],
  ['7-8-edu-elementary-progress-report-card-public-schools.pdf', exportProgressReport7to8],
])('%s export', (template, exportFn) => {
  it('prints every learning-skill and subject comment and stays flattened', async () => {
    const tpl = await PDFDocument.load(readFileSync(templatePath(template)))
    const commentFields = tpl
      .getForm()
      .getFields()
      .map((field) => field.getName())
      .filter((name) => /^sans2?[A-Z]/.test(name))
    expect(commentFields.length).toBeGreaterThan(10)

    const formData = { student: 'Test Student' }
    for (const name of commentFields) formData[name] = `Comment ${name} ok.`

    const bytes = await exportFn(`/assets/ReportCards/${template}`, formData, 'Test')
    const text = await extractText(bytes)

    expect(commentFields.filter((name) => !text.includes(name))).toEqual([])
    expect(console.warn).not.toHaveBeenCalledWith(
      expect.stringContaining('Standard flatten failed'),
      expect.anything(),
    )
  }, 60000)
})
