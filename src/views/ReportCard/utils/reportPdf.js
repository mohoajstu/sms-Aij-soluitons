/**
 * Builds a report card's final PDF from its saved data. Shared by Admin
 * Review (approve / re-approve) and the course page ZIP download, so a
 * report downloaded in a ZIP is built exactly the way approving it builds it.
 * Building in the browser also means the ZIP never has to read stored PDFs
 * back from Firebase Storage, which the bucket's CORS settings block.
 */
import { doc, getDoc } from 'firebase/firestore'
import { PDFDocument } from 'pdf-lib'
import { exportProgressReport1to6 } from '../exportProgressReport1to6'
import { exportProgressReport7to8 } from '../exportProgressReport7to8'
import { exportKGInitialObservations } from '../exportKGInitialObservations'
import { mergeFormDataWithStudent } from './mergeFormDataWithStudent'
import { getReportYear, UNKNOWN_YEAR } from './reportScope'
import { computeDefaultSchoolYear } from './schoolYear'
import {
  fillPDFFormWithData,
  updateAllFieldAppearances,
  embedTimesRomanFont,
  saveFlattenedPdf,
  normalizeSignatureFormData,
  embedSignaturesIntoPdf,
  drawTextIntoField,
} from '../pdfFillingUtils'

/** True when a report belongs to a school year before the current one. */
export const isPastYearReport = (reportCard, current = computeDefaultSchoolYear()) => {
  const year = getReportYear(reportCard, current)
  return year !== UNKNOWN_YEAR && year < current.label
}

const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '')

/**
 * A past-year report keeps the grade and attendance it was written with. The
 * student record now holds this year's grade and attendance, so refilling from
 * it would print last year's Grade 2 report as Grade 3. Name and OEN still
 * come from the student record, which only corrects them.
 */
const keepSavedYearDetails = (student, reportCard) => {
  const formData = reportCard.formData || {}
  const snapshot = reportCard.selectedStudent || {}
  return {
    ...student,
    grade: firstDefined(formData.grade, reportCard.grade, snapshot.grade, snapshot.program) || '',
    program: undefined,
    currentTermAbsenceCount: firstDefined(formData.daysAbsent, snapshot.currentTermAbsenceCount),
    yearAbsenceCount: firstDefined(formData.totalDaysAbsent, snapshot.yearAbsenceCount),
    currentTermLateCount: firstDefined(formData.timesLate, snapshot.currentTermLateCount),
    yearLateCount: firstDefined(formData.totalTimesLate, snapshot.yearLateCount),
  }
}

/**
 * Report data with the student's latest name and OEN filled in. A current-year
 * report also takes the student's latest grade and attendance; a past-year
 * report keeps its own (see keepSavedYearDetails).
 */
export const getMergedFormDataForReport = async (db, reportCard, { current } = {}) => {
  let latestStudent = reportCard.selectedStudent || null
  const studentId = reportCard.studentId || reportCard.selectedStudent?.id || ''
  if (studentId) {
    try {
      const studentSnap = await getDoc(doc(db, 'students', studentId))
      if (studentSnap.exists()) {
        const studentData = studentSnap.data()
        latestStudent = {
          id: studentSnap.id,
          fullName:
            studentData.fullName ||
            `${studentData.personalInfo?.firstName || ''} ${studentData.personalInfo?.lastName || ''}`.trim(),
          firstName: studentData.personalInfo?.firstName || '',
          lastName: studentData.personalInfo?.lastName || '',
          grade: studentData.grade || studentData.program || '',
          oen: studentData.schooling?.oen || studentData.oen || studentData.OEN || '',
          schoolId: studentData.schoolId || studentData.id || studentSnap.id,
          currentTermAbsenceCount: studentData.attendanceStats?.currentTermAbsenceCount ?? 0,
          yearAbsenceCount: studentData.attendanceStats?.yearAbsenceCount ?? 0,
          currentTermLateCount: studentData.attendanceStats?.currentTermLateCount ?? 0,
          yearLateCount: studentData.attendanceStats?.yearLateCount ?? 0,
        }
      }
    } catch (studentFetchError) {
      console.warn('Could not fetch latest student info for approval:', studentFetchError)
    }
  }

  if (latestStudent && isPastYearReport(reportCard, current || computeDefaultSchoolYear())) {
    latestStudent = keepSavedYearDetails(latestStudent, reportCard)
  }

  return latestStudent
    ? mergeFormDataWithStudent(reportCard.formData || {}, latestStudent)
    : reportCard.formData || {}
}

export const exportGenericReport = async (pdfPath, formData, context = 'Admin Approval') => {
  const response = await fetch(pdfPath)
  if (!response.ok) {
    throw new Error('Failed to fetch PDF template')
  }

  const originalPdfBytes = await response.arrayBuffer()
  const pdfDoc = await PDFDocument.load(originalPdfBytes)
  const form = pdfDoc.getForm()
  const fields = form.getFields()

  const timesRomanFont = await embedTimesRomanFont(pdfDoc)
  const normalizedFormData = normalizeSignatureFormData(formData)
  await embedSignaturesIntoPdf(pdfDoc, form, normalizedFormData, context)

  await fillPDFFormWithData(pdfDoc, normalizedFormData, timesRomanFont, context)
  await updateAllFieldAppearances(form, pdfDoc, context)

  const forceFlattenNames = new Set(['Full_Name_1', 'Full_name_1', 'full_name_1'])
  for (const field of fields) {
    try {
      if (forceFlattenNames.has(field.getName())) {
        await drawTextIntoField(
          pdfDoc,
          field,
          normalizedFormData.student || normalizedFormData.student_name || '',
          timesRomanFont,
          10,
        )
        field.flatten()
      }
    } catch (forceFlattenError) {
      console.warn(`Could not force-flatten field "${field.getName()}":`, forceFlattenError)
    }
  }

  if (fields.length > 0) {
    try {
      form.flatten()
    } catch (flattenError) {
      console.warn('Flatten failed, retrying after appearance refresh:', flattenError)
      await updateAllFieldAppearances(form, pdfDoc, `${context}-Retry`)
      try {
        form.flatten()
      } catch (flattenRetryError) {
        console.warn('Retry flatten failed, trying individual field flattening...')
        for (const field of fields) {
          try {
            field.flatten()
          } catch (fieldFlattenError) {
            console.log(`Skipping field "${field.getName()}" during flatten`)
          }
        }
      }
    }
    const catalog = pdfDoc.catalog
    try {
      catalog.delete('AcroForm')
    } catch (e) {
      console.warn('Could not remove AcroForm:', e)
    }
  }

  return await saveFlattenedPdf(pdfDoc, { useObjectStreams: false })
}

/** The PDF for one report type, from already-merged form data. */
export const buildReportPdf = async (
  reportCardType,
  formData,
  studentName,
  context = 'Admin Approval',
) => {
  switch (reportCardType.id) {
    case '1-6-progress':
      return exportProgressReport1to6(reportCardType.pdfPath, formData, studentName)
    case '7-8-progress':
      return exportProgressReport7to8(reportCardType.pdfPath, formData, studentName)
    case 'kg-initial-observations':
      return exportKGInitialObservations(reportCardType.pdfPath, formData, studentName)
    default:
      // kg-report, 1-6-report-card, 7-8-report-card and anything else
      return exportGenericReport(reportCardType.pdfPath, formData, context)
  }
}

/**
 * The final PDF for an approved report, built from its saved data the same
 * way approving it does. Editing a report after approval sets it back to
 * pending, so an approved report's saved data is what was approved (any
 * medians filled in at approval were saved with it).
 */
export const generateReportPdf = async (db, report, { reportCardTypes, current } = {}) => {
  const types = reportCardTypes || (await import('../utils')).REPORT_CARD_TYPES
  const reportCardType = types.find((type) => type.id === report.reportCardType)
  if (!reportCardType?.pdfPath) throw new Error(`Unknown report type "${report.reportCardType}"`)
  const formData = await getMergedFormDataForReport(db, report, { current })
  const studentName = (formData.student || report.studentName || 'student').replace(/\s+/g, '-')
  return buildReportPdf(reportCardType, formData, studentName, 'Class ZIP')
}
