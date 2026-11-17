import { describe, it, expect } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import {
  PDF_RENDER_VERSION,
  mergeReportPdfs,
  needsRegeneration,
  planClassPrint,
  printFileName,
  sortForPrint,
  zipEntryNames,
  zipFileName,
  zipReportPdfs,
} from '../utils/classPrint'
import JSZip from 'jszip'

const report = (over) => ({
  id: over.studentName, status: 'approved', finalPdfUrl: `pdf://${over.studentName}`,
  reportCardType: '1-6-progress', grade: '5', term: 'term1', pdfRenderVersion: PDF_RENDER_VERSION, ...over,
})

const pdfWithPages = async (label, pages) => {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (let i = 0; i < pages; i++) doc.addPage([200, 200]).drawText(`${label}-${i + 1}`, { x: 10, y: 100, font })
  return doc.save()
}

const pageTexts = async (bytes) => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise
  const out = []
  for (let i = 1; i <= doc.numPages; i++) {
    out.push((await (await doc.getPage(i)).getTextContent()).items.map((item) => item.str).join(''))
  }
  return out
}

describe('planClassPrint', () => {
  it('holds back unapproved, PDF-less and pre-fix 7-8 progress reports, and keeps the rest', () => {
    const plan = planClassPrint([
      report({ studentName: 'Ready' }),
      report({ studentName: 'Pending', status: 'pending' }),
      report({ studentName: 'NoPdf', finalPdfUrl: null }),
      report({ studentName: 'Old78', reportCardType: '7-8-progress', pdfRenderVersion: undefined }),
      report({ studentName: 'New78', reportCardType: '7-8-progress' }),
      report({ studentName: 'Old16', pdfRenderVersion: undefined }),
    ])
    const names = (list) => list.map((r) => r.studentName)
    expect(names(plan.ready)).toEqual(['Old16', 'Ready', 'New78'])
    expect(names(plan.notApproved)).toEqual(['Pending'])
    expect(names(plan.missingPdf)).toEqual(['NoPdf'])
    expect(names(plan.needsReapproval)).toEqual(['Old78'])
  })

  it('only flags 7-8 progress reports, the one template that lost text before the fix', () => {
    expect(needsRegeneration({ reportCardType: '7-8-progress' })).toBe(true)
    expect(needsRegeneration({ reportCardType: '7-8-progress', pdfRenderVersion: 2 })).toBe(false)
    for (const type of ['1-6-progress', '1-6-report-card', '7-8-report-card', 'kg-report', 'kg-initial-observations', 'quran-report']) {
      expect(needsRegeneration({ reportCardType: type })).toBe(false)
    }
  })
})

describe('sortForPrint', () => {
  it('orders by grade (JK, SK, then numbers), then report type, then student name', () => {
    const sorted = sortForPrint([
      report({ studentName: 'zara', grade: '10' }),
      report({ studentName: 'Bilal', grade: '2' }),
      report({ studentName: 'adam', grade: '2' }),
      report({ studentName: 'Sami', grade: 'SK' }),
      report({ studentName: 'Jana', grade: 'JK' }),
      report({ studentName: 'Amir', grade: '2', reportCardType: '1-6-report-card' }),
    ])
    expect(sorted.map((r) => r.studentName)).toEqual(['Jana', 'Sami', 'adam', 'Bilal', 'Amir', 'zara'])
  })
})

describe('mergeReportPdfs', () => {
  it('combines every page of every report in order and reports progress', async () => {
    const files = { 'pdf://A': await pdfWithPages('A', 2), 'pdf://B': await pdfWithPages('B', 1) }
    const progress = []
    const bytes = await mergeReportPdfs(
      [report({ studentName: 'A' }), report({ studentName: 'B' })],
      { fetchBytes: async (url) => files[url], onProgress: (done, total) => progress.push(`${done}/${total}`) },
    )
    expect(await pageTexts(bytes)).toEqual(['A-1', 'A-2', 'B-1'])
    expect(progress).toEqual(['1/2', '2/2'])
  })

  it('fails naming the student instead of producing a stack with someone missing', async () => {
    const good = await pdfWithPages('A', 1)
    await expect(
      mergeReportPdfs([report({ studentName: 'A' }), report({ studentName: 'Bad Student' })], {
        fetchBytes: async (url) => {
          if (url === 'pdf://A') return good
          throw new Error('HTTP 403')
        },
      }),
    ).rejects.toThrow('Bad Student (HTTP 403). Nothing was downloaded.')
  })
})

describe('printFileName', () => {
  it('names a single class after its grade, type and term', () => {
    expect(printFileName([report({ studentName: 'A', grade: '7', reportCardType: '7-8-progress' }), report({ studentName: 'B', grade: '7', reportCardType: '7-8-progress' })]))
      .toBe('Grade-7_7-8-progress_term1_2-students.pdf')
  })
  it('falls back to a generic name for a mixed selection', () => {
    expect(printFileName([report({ studentName: 'A', grade: '5', term: 'term1', reportCardType: 'x' }), report({ studentName: 'B', grade: '6', term: 'term2', reportCardType: 'y' })]))
      .toBe('report-cards_2-students.pdf')
  })
})

describe('zipReportPdfs', () => {
  it('packs one unchanged PDF per student, numbered in print order', async () => {
    const files = { 'pdf://Amna Khan': await pdfWithPages('A', 2), 'pdf://Zaid': await pdfWithPages('Z', 1) }
    const reports = [report({ studentName: 'Amna Khan' }), report({ studentName: 'Zaid' })]
    const zip = await JSZip.loadAsync(await zipReportPdfs(reports, { fetchBytes: async (url) => files[url] }))
    const names = Object.keys(zip.files).sort()
    expect(names).toEqual(['01_Amna-Khan_1-6-progress.pdf', '02_Zaid_1-6-progress.pdf'])
    expect(await pageTexts(await zip.file(names[0]).async('uint8array'))).toEqual(['A-1', 'A-2'])
    expect(await pageTexts(await zip.file(names[1]).async('uint8array'))).toEqual(['Z-1'])
  })

  it('refuses to build a ZIP with a student missing or a broken PDF', async () => {
    const reports = [report({ studentName: 'A' }), report({ studentName: 'Broken' })]
    const good = await pdfWithPages('A', 1)
    await expect(
      zipReportPdfs(reports, { fetchBytes: async (url) => (url === 'pdf://A' ? good : new Uint8Array([1, 2, 3])) }),
    ).rejects.toThrow('Could not load the PDF for Broken')
  })

  it('keeps entry names unique and safe, and names the ZIP after the class', () => {
    const reports = [
      report({ studentName: 'Sara Ali', grade: '3' }),
      report({ studentName: 'Sara Ali', grade: '3' }),
      report({ studentName: 'Noor/../x', grade: '3' }),
    ]
    expect(zipEntryNames(reports)).toEqual(['01_Sara-Ali_1-6-progress.pdf', '02_Sara-Ali_1-6-progress.pdf', '03_Noor-..-x_1-6-progress.pdf'])
    expect(zipFileName(reports)).toBe('Grade-3_1-6-progress_term1_3-students.zip')
  })
})
