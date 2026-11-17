import { describe, it, expect, beforeAll, vi } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

vi.mock('firebase/firestore', () => ({
  doc: (_db, name, id) => ({ path: `${name}/${id}` }),
  getDoc: async (ref) => ({
    id: ref.path.split('/')[1],
    exists: () => ref.path === 'students/S1',
    data: () => ({ personalInfo: { firstName: 'Amna', lastName: 'Khan' }, grade: '7', schooling: { oen: '123456789' },
      attendanceStats: { currentTermAbsenceCount: 3, yearAbsenceCount: 3, currentTermLateCount: 1, yearLateCount: 1 } }),
  }),
}))
import { generateReportPdf } from '../utils/reportPdf'

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
})
