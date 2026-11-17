import { PDFDocument } from 'pdf-lib'

/**
 * Version stamped on a report (pdfRenderVersion) whenever its final PDF is
 * generated. Version 2 is the first build where form.flatten() no longer
 * fails on fields without an appearance. Before that, Grade 7-8 progress
 * reports silently lost every page-2 subject comment. Other templates hit the
 * same error but lost no text (checked against every template), so only that
 * type needs regenerating.
 */
export const PDF_RENDER_VERSION = 2
const TYPES_NEEDING_RENDER_VERSION = { '7-8-progress': 2 }

export const needsRegeneration = (report) =>
  (report.pdfRenderVersion || 0) < (TYPES_NEEDING_RENDER_VERSION[report.reportCardType] || 0)

const gradeNumber = (grade) => {
  const text = `${grade || ''}`.toLowerCase()
  if (text.includes('jk') || text.includes('jr')) return -2
  if (text.includes('sk') || text.includes('sr')) return -1
  const match = text.match(/\d+/)
  return match ? Number(match[0]) : 99
}

/** Grade, then report type, then student name, so a class prints in one stack. */
export const sortForPrint = (reports) =>
  [...reports].sort(
    (a, b) =>
      gradeNumber(a.grade) - gradeNumber(b.grade) ||
      `${a.grade || ''}`.localeCompare(`${b.grade || ''}`) ||
      `${a.reportCardType || ''}`.localeCompare(`${b.reportCardType || ''}`) ||
      `${a.studentName || ''}`.localeCompare(`${b.studentName || ''}`, undefined, {
        sensitivity: 'base',
      }),
  )

/**
 * Splits reports into what can be printed now and what is held back, so
 * nobody silently drops out of the printed stack.
 */
export const planClassPrint = (reports) => {
  const plan = { ready: [], notApproved: [], missingPdf: [], needsReapproval: [] }
  for (const report of sortForPrint(reports)) {
    if (report.status !== 'approved') plan.notApproved.push(report)
    else if (!report.finalPdfUrl) plan.missingPdf.push(report)
    else if (needsRegeneration(report)) plan.needsReapproval.push(report)
    else plan.ready.push(report)
  }
  return plan
}

const defaultFetchBytes = async (url) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.arrayBuffer()
}

/**
 * Combines each report's final PDF into one document, in the given order.
 * Throws naming the first report that could not be fetched, rather than
 * producing a stack with a student missing.
 */
export const mergeReportPdfs = async (
  reports,
  { fetchBytes = defaultFetchBytes, onProgress } = {},
) => {
  const merged = await PDFDocument.create()
  for (const [index, report] of reports.entries()) {
    let source
    try {
      source = await PDFDocument.load(await fetchBytes(report.finalPdfUrl))
    } catch (error) {
      throw new Error(
        `Could not load the PDF for ${report.studentName || 'a student'} (${error.message}). Nothing was downloaded.`,
      )
    }
    const pages = await merged.copyPages(source, source.getPageIndices())
    pages.forEach((page) => merged.addPage(page))
    onProgress?.(index + 1, reports.length)
  }
  return merged.save()
}

export const printFileName = (reports) => {
  const part = (values) => {
    const unique = [...new Set(values.filter(Boolean))]
    return unique.length === 1 ? unique[0] : null
  }
  const pieces = [
    part(reports.map((r) => r.grade)) && `Grade-${part(reports.map((r) => r.grade))}`,
    part(reports.map((r) => r.reportCardType)),
    part(reports.map((r) => r.term)),
  ].filter(Boolean)
  const name = (pieces.length ? pieces.join('_') : 'report-cards').replace(/[^\w.-]+/g, '-')
  return `${name}_${reports.length}-students.pdf`
}
