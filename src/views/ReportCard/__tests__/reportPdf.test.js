import { describe, it, expect, beforeAll, vi } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const STUDENTS = {
  // Older record shape: grade at the top level.
  S1: { personalInfo: { firstName: 'Amna', lastName: 'Khan' }, grade: '7', schooling: { oen: '123456789' },
    attendanceStats: { currentTermAbsenceCount: 3, yearAbsenceCount: 3, currentTermLateCount: 1, yearLateCount: 1 } },
  // People management keeps the grade in schooling.program.
  S2: { personalInfo: { firstName: 'Bilal', lastName: 'Ahmed' }, schooling: { program: 'grade 3', oen: '222' } },
  S3: { personalInfo: { firstName: 'Sara', lastName: 'Ali' }, active: false, schooling: { program: 'Graduated', graduationYear: 2026 } },
  S4: { personalInfo: { firstName: 'Omar', lastName: 'Noor' }, schooling: { program: 'SK' } },
  S5: { personalInfo: { firstName: 'No', lastName: 'Grade' }, schooling: {} },
}
vi.mock('firebase/firestore', () => ({
  doc: (_db, name, id) => ({ path: `${name}/${id}` }),
  getDoc: async (ref) => {
    const id = ref.path.split('/')[1]
    return { id, exists: () => Boolean(STUDENTS[id]), data: () => STUDENTS[id] }
  },
}))
import { PDFDocument, PDFArray, PDFName, PDFRef } from 'pdf-lib'
import {
  generateReportPdf, getMergedFormDataForReport, getReportPrintData, gradeInEarlierYear, isPastYearReport, normalizeGrade,
} from '../utils/reportPdf'

const templatePath = (name) => fileURLToPath(new URL(`../../../assets/ReportCards/${name}`, import.meta.url))
const TYPES = [
  { id: '7-8-progress', pdfPath: '/assets/ReportCards/7-8-edu-elementary-progress-report-card-public-schools.pdf' },
  { id: '1-6-report-card', pdfPath: '/assets/ReportCards/1-6-edu-elementary-provincial-report-card-public-schools.pdf' },
]

beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  globalThis.fetch = async (path) => {
    const bytes = readFileSync(templatePath(decodeURIComponent(path.split('/').pop())))
    return { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }
  }
})

const pdfText = async (bytes) => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise
  let text = ''
  for (let i = 1; i <= doc.numPages; i++) text += (await (await doc.getPage(i)).getTextContent()).items.map((x) => x.str).join(' ') + '\n'
  return text
}

describe('generateReportPdf', () => {
  it('builds an approved 7-8 progress report from saved data, page-2 subject comments included', async () => {
    const report = {
      id: 'd1', studentId: 'S1', studentName: 'Amna Khan', reportCardType: '7-8-progress', status: 'approved',
      formData: { student: 'Amna Khan', sansInitiative: 'InitiativeMarker shows initiative.', sans2Math: 'MathMarker solves problems well.', sans2Science: 'ScienceMarker asks good questions.' },
    }
    const text = await pdfText(await generateReportPdf({}, report, { reportCardTypes: TYPES }))
    expect(text).toContain('InitiativeMarker')
    expect(text).toContain('MathMarker')
    expect(text).toContain('ScienceMarker')
    expect(text).toContain('123456789') // OEN filled in from the student's record, as approval does
  }, 60000)

  it('uses the generic exporter for full report cards', async () => {
    const report = { id: 'd2', studentId: 'S1', studentName: 'Amna Khan', reportCardType: '1-6-report-card', formData: { student: 'Amna Khan' } }
    const text = await pdfText(await generateReportPdf({}, report, { reportCardTypes: TYPES }))
    expect(text).toContain('Amna')
  }, 60000)

  it('refuses an unknown report type', async () => {
    await expect(generateReportPdf({}, { reportCardType: 'nope' }, { reportCardTypes: TYPES })).rejects.toThrow('Unknown report type')
  })

  it('leaves no page annotations pointing at fields removed by flattening', async () => {
    // student, OEN and grade have a widget on every page; pdf-lib's flatten
    // deleted them but left them listed in each page's /Annots.
    const report = { id: 'd3', studentId: 'S1', studentName: 'Amna Khan', reportCardType: '1-6-report-card', formData: { student: 'Amna Khan', grade: '2' } }
    const doc = await PDFDocument.load(await generateReportPdf({}, report, { reportCardTypes: TYPES }))
    expect(doc.getPageCount()).toBe(4)
    for (const page of doc.getPages()) {
      const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray)
      for (const entry of annots?.asArray() || []) {
        if (entry instanceof PDFRef) expect(doc.context.lookup(entry)).toBeDefined()
      }
    }
  }, 60000)
})

describe('past-year reports', () => {
  const current = { label: '2026-2027', startDate: '2026-09-02' }
  const lastYear = {
    id: 'S1_1-6-report-card_2025-2026_term1', studentId: 'S1', schoolYear: '2025-2026', term: 'term1',
    reportCardType: '1-6-report-card', grade: '2',
    formData: { student: 'Amna Khan', grade: '2', daysAbsent: 4, totalDaysAbsent: 4, timesLate: 2, totalTimesLate: 2 },
  }

  it('knows which reports are from an earlier school year', () => {
    expect(isPastYearReport(lastYear, current)).toBe(true)
    expect(isPastYearReport({ ...lastYear, schoolYear: '2026-2027' }, current)).toBe(false)
    expect(isPastYearReport({ id: 'x' }, current)).toBe(false)
  })

  it('keeps the saved grade and attendance, not the student record', async () => {
    // The mocked student record is now Grade 7 with 3 absences and 1 late.
    const merged = await getMergedFormDataForReport({}, lastYear, { current })
    expect(merged.grade).toBe('2')
    expect([merged.daysAbsent, merged.totalDaysAbsent, merged.timesLate, merged.totalTimesLate]).toEqual([4, 4, 2, 2])
    expect(merged.OEN).toBe('123456789')
  })

  it('falls back to the student snapshot saved with the report', async () => {
    const report = { ...lastYear, grade: '', formData: { student: 'Amna Khan' }, selectedStudent: { id: 'S1', grade: 'Grade 2', currentTermAbsenceCount: 5 } }
    const merged = await getMergedFormDataForReport({}, report, { current })
    expect(merged.grade).toBe('2')
    expect(merged.daysAbsent).toBe(5)
  })

  it('still refreshes grade and attendance for current-year reports', async () => {
    const merged = await getMergedFormDataForReport({}, { ...lastYear, schoolYear: '2026-2027' }, { current })
    expect(merged.grade).toBe('7')
    expect(merged.daysAbsent).toBe(3)
  })

  it('works the grade back from the student record when none was saved', async () => {
    const report = { ...lastYear, studentId: 'S2', grade: '', formData: { student: 'Bilal Ahmed' } }
    const { formData, gradeSource } = await getReportPrintData({}, report, { current })
    expect(formData.grade).toBe('2')
    expect(gradeSource).toBe('worked-back')
  })

  it('prints the worked-back grade on the PDF', async () => {
    const report = { ...lastYear, studentId: 'S2', grade: '', formData: { student: 'Bilal Ahmed' } }
    const text = await pdfText(await generateReportPdf({}, report, { reportCardTypes: TYPES, current }))
    expect(text.split('\n')[0]).toContain('Bilal Ahmed 2 ') // filled header values: OEN, attendance, name, grade
  }, 60000)

  it('refuses to build a report with no grade anywhere', async () => {
    const report = { ...lastYear, studentId: 'S5', grade: '', formData: { student: 'No Grade' } }
    expect((await getReportPrintData({}, report, { current })).gradeSource).toBe('none')
    await expect(generateReportPdf({}, report, { reportCardTypes: TYPES, current })).rejects.toThrow('no grade')
  })
})

describe('grades', () => {
  const current = { label: '2026-2027', startDate: '2026-09-02' }

  it('reads the current grade from schooling.program, like the report editor', async () => {
    const report = { id: 'r', studentId: 'S2', schoolYear: '2026-2027', term: 'term1', reportCardType: '1-6-report-card', formData: {} }
    const { formData, gradeSource } = await getReportPrintData({}, report, { current })
    expect(formData.grade).toBe('3')
    expect(gradeSource).toBe('student-record')
  })

  it('normalizes grade labels and never prints "Graduated"', () => {
    expect(['grade 2', 'Grade 10', '02', 'JK', 'Junior Kindergarten', 'sk', 'Graduated', '', null].map(normalizeGrade))
      .toEqual(['2', '10', '2', 'JK', 'JK', 'SK', '', '', ''])
  })

  it('works back through kindergarten and graduation', () => {
    expect(gradeInEarlierYear(STUDENTS.S2, '2025-2026', current)).toBe('2')
    expect(gradeInEarlierYear(STUDENTS.S2, '2024-2025', current)).toBe('1')
    expect(gradeInEarlierYear(STUDENTS.S4, '2025-2026', current)).toBe('JK')
    expect(gradeInEarlierYear(STUDENTS.S4, '2024-2025', current)).toBe('')
    expect(gradeInEarlierYear(STUDENTS.S3, '2025-2026', current)).toBe('8')
    expect(gradeInEarlierYear(STUDENTS.S3, '2024-2025', current)).toBe('7')
    expect(gradeInEarlierYear(STUDENTS.S2, '2026-2027', current)).toBe('')
  })
})
