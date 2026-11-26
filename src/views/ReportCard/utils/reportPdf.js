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

const GRADE_LADDER = ['JK', 'SK', '1', '2', '3', '4', '5', '6', '7', '8']

/** "grade 2", "Grade 2", "2" -> "2"; JK/SK kept; "Graduated" and blanks -> "". */
export const normalizeGrade = (value) => {
  const text = `${value ?? ''}`.trim().toLowerCase()
  if (!text || text.includes('graduat')) return ''
  if (text.includes('jk') || text.includes('junior') || text.includes('jr')) return 'JK'
  if (text.includes('sk') || text.includes('senior') || text.includes('sr')) return 'SK'
  const match = text.match(/\d+/)
  return match ? String(Number(match[0])) : ''
}

/** The grade on a student record. People management keeps it in schooling.program. */
const studentRecordGrade = (studentData = {}) =>
  studentData.schooling?.program || studentData.personalInfo?.grade || studentData.grade || studentData.program || ''

/**
 * The grade a student was in during an earlier school year, worked back from
 * the grade on their record now (students move up one grade each September;
 * graduates were in Grade 8 in the year ending in their graduation year).
 * Wrong for a student who repeated a grade, so it is only a last resort.
 */
export const gradeInEarlierYear = (studentData, reportYear, current) => {
  const reportStart = Number(`${reportYear}`.slice(0, 4))
  const currentStart = Number(`${current.label}`.slice(0, 4))
  const yearsBack = currentStart - reportStart
  if (!reportStart || !currentStart || yearsBack <= 0) return ''
  const program = `${studentRecordGrade(studentData)}`.toLowerCase()
  let index
  if (program.includes('graduat')) {
    const graduationYear = Number(studentData.schooling?.graduationYear)
    if (!graduationYear) return ''
    index = GRADE_LADDER.indexOf('8') - (graduationYear - 1 - reportStart)
  } else {
    const now = GRADE_LADDER.indexOf(normalizeGrade(program))
    if (now < 0) return ''
    index = now - yearsBack
  }
  return index >= 0 && index < GRADE_LADDER.length ? GRADE_LADDER[index] : ''
}

/**
 * Builds the student details a report prints with, and says where the grade
 * came from: "saved" (with the report), "student-record" (current-year
 * reports), "worked-back" (past-year report with no saved grade) or "none".
 *
 * A past-year report keeps the grade and attendance it was written with: the
 * student record now holds this year's, so refilling from it would print
 * last year's Grade 2 report as Grade 3. Name and OEN still come from the
 * student record, which only corrects them.
 */
const studentDetailsForReport = (studentData, studentId, reportCard, current) => {
  const formData = reportCard.formData || {}
  const snapshot = reportCard.selectedStudent || {}
  const base = {
    id: studentId,
    fullName:
      studentData.fullName ||
      `${studentData.personalInfo?.firstName || ''} ${studentData.personalInfo?.lastName || ''}`.trim(),
    firstName: studentData.personalInfo?.firstName || '',
    lastName: studentData.personalInfo?.lastName || '',
    oen: studentData.schooling?.oen || studentData.oen || studentData.OEN || '',
    schoolId: studentData.schoolId || studentData.id || studentId,
  }
  if (!isPastYearReport(reportCard, current)) {
    const recordGrade = normalizeGrade(studentRecordGrade(studentData))
    const savedGrade = normalizeGrade(formData.grade)
    return {
      student: {
        ...base,
        grade: recordGrade || savedGrade,
        currentTermAbsenceCount: studentData.attendanceStats?.currentTermAbsenceCount ?? studentData.currentTermAbsenceCount ?? 0,
        yearAbsenceCount: studentData.attendanceStats?.yearAbsenceCount ?? studentData.yearAbsenceCount ?? 0,
        currentTermLateCount: studentData.attendanceStats?.currentTermLateCount ?? studentData.currentTermLateCount ?? 0,
        yearLateCount: studentData.attendanceStats?.yearLateCount ?? studentData.yearLateCount ?? 0,
      },
      gradeSource: recordGrade ? 'student-record' : savedGrade ? 'saved' : 'none',
    }
  }
  const savedGrade = [formData.grade, reportCard.grade, snapshot.grade, snapshot.program, snapshot.schooling?.program]
    .map(normalizeGrade)
    .find(Boolean)
  const workedBack = savedGrade ? '' : gradeInEarlierYear(studentData, getReportYear(reportCard, current), current)
  return {
    student: {
      ...base,
      grade: savedGrade || workedBack,
      currentTermAbsenceCount: firstDefined(formData.daysAbsent, snapshot.currentTermAbsenceCount),
      yearAbsenceCount: firstDefined(formData.totalDaysAbsent, snapshot.yearAbsenceCount),
      currentTermLateCount: firstDefined(formData.timesLate, snapshot.currentTermLateCount),
      yearLateCount: firstDefined(formData.totalTimesLate, snapshot.yearLateCount),
    },
    gradeSource: savedGrade ? 'saved' : workedBack ? 'worked-back' : 'none',
  }
}

/**
 * The data a report prints with, plus where its grade came from (see
 * studentDetailsForReport). Current-year reports take the student's latest
 * grade and attendance; past-year reports keep their own.
 */
export const getReportPrintData = async (db, reportCard, { current } = {}) => {
  const scope = current || computeDefaultSchoolYear()
  const studentId = reportCard.studentId || reportCard.selectedStudent?.id || ''
  let studentData = null
  if (studentId) {
    try {
      const studentSnap = await getDoc(doc(db, 'students', studentId))
      if (studentSnap.exists()) studentData = studentSnap.data()
    } catch (studentFetchError) {
      console.warn('Could not fetch latest student info for approval:', studentFetchError)
    }
  }
  // Without the student record, fall back to the snapshot saved with the draft.
  const { student, gradeSource } = studentDetailsForReport(
    studentData || { ...(reportCard.selectedStudent || {}), attendanceStats: undefined },
    studentId,
    reportCard,
    scope,
  )
  if (!studentData && !reportCard.selectedStudent) {
    const savedGrade = normalizeGrade(reportCard.formData?.grade)
    return { formData: { ...(reportCard.formData || {}) }, gradeSource: savedGrade ? 'saved' : 'none' }
  }
  return { formData: mergeFormDataWithStudent(reportCard.formData || {}, student), gradeSource }
}

/** Report data as it prints (see getReportPrintData). */
export const getMergedFormDataForReport = async (db, reportCard, options = {}) =>
  (await getReportPrintData(db, reportCard, options)).formData

/** Report types whose PDF has a grade box. */
export const reportShowsGrade = (reportCardType) => reportCardType !== 'quran-report'

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
  if (reportShowsGrade(report.reportCardType) && !`${formData.grade || ''}`.trim()) {
    throw new Error("no grade was found. Add the grade to the student's record in People")
  }
  const studentName = (formData.student || report.studentName || 'student').replace(/\s+/g, '-')
  return buildReportPdf(reportCardType, formData, studentName, 'Class ZIP')
}
