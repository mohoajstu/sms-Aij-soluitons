import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'

/**
 * Version stamped on a report (pdfRenderVersion) whenever its final PDF is
 * generated. Version 2 is the first build where form.flatten() no longer
 * fails on fields without an appearance; before that, Grade 7-8 progress
 * reports silently lost every page-2 subject comment.
 */
export const PDF_RENDER_VERSION = 2

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
 * Splits reports into what goes in the ZIP (approved) and what is held back,
 * so nobody silently drops out. PDFs are built fresh from each report's saved
 * data, so a stored PDF is not needed and old PDFs from before the 7-8
 * comment fix do not matter.
 */
export const planClassPrint = (reports) => {
  const plan = { ready: [], notApproved: [] }
  for (const report of sortForPrint(reports)) {
    if (report.status === 'approved') plan.ready.push(report)
    else plan.notApproved.push(report)
  }
  return plan
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

export const zipFileName = (reports) => printFileName(reports).replace(/\.pdf$/, '.zip')

const safePart = (text) =>
  `${text || ''}`
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * One file per student, numbered in print order (01_, 02_...) so they sort
 * the same way in a folder. Names stay unique even for two students with the
 * same name.
 */
export const zipEntryNames = (reports) => {
  const width = String(reports.length).length < 2 ? 2 : String(reports.length).length
  const used = new Set()
  return reports.map((report, index) => {
    const base = [
      String(index + 1).padStart(width, '0'),
      safePart(report.studentName) || 'student',
      safePart(report.reportCardType),
    ]
      .filter(Boolean)
      .join('_')
    let name = `${base}.pdf`
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base}_${n}.pdf`
    used.add(name.toLowerCase())
    return name
  })
}

/**
 * Builds each report's PDF (getPdfBytes) and packs them into one ZIP. If any
 * report cannot be built, the whole ZIP is abandoned with the student's name
 * rather than producing an archive with someone missing.
 */
export const zipReportPdfs = async (reports, { getPdfBytes, onProgress }) => {
  const zip = new JSZip()
  const names = zipEntryNames(reports)
  for (const [index, report] of reports.entries()) {
    let bytes
    try {
      bytes = await getPdfBytes(report)
      await PDFDocument.load(bytes)
    } catch (error) {
      throw new Error(
        `Could not build the PDF for ${report.studentName || 'a student'} (${error.message}). Nothing was downloaded.`,
      )
    }
    zip.file(names[index], bytes)
    onProgress?.(index + 1, reports.length)
  }
  return zip.generateAsync({ type: 'uint8array' })
}
