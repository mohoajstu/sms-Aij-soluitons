import { describe, it, expect, beforeAll, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'server-ts'),
}))
vi.mock('../../Firebase/firebase', () => ({ firestore: {} }))

import { fillTimesheet } from '../timesheetWorkbook'
import { buildStaffTimesheet, zonedTime } from '../timesheetExport'

const TEMPLATE = path.resolve('public/assets/timekeeping/timesheet-template.xlsx')
const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d))

const settings = {
  expectedCheckInTime: '08:20',
  expectedCheckOutTime: '15:20',
  graceMinutes: 5,
  staffOverrides: {
    'rafia.husain@tarbiyahlearning.ca': {
      expectedCheckInTime: '08:00',
      expectedCheckOutTime: '15:30',
    },
  },
}

const at = (d, hhmm) => zonedTime(utc(2026, 9, d), hhmm)
const records = [
  { email: 'rafia.husain@tarbiyahlearning.ca', type: 'in', at: at(2, '08:11') },
  { email: 'rafia.husain@tarbiyahlearning.ca', type: 'in', at: at(3, '08:03') },
  { email: 'rafia.husain@tarbiyahlearning.ca', type: 'in', at: at(4, '08:05') },
  { email: 'rafia.husain@tarbiyahlearning.ca', type: 'out', at: at(4, '15:35') },
]

let ws
let sheet

beforeAll(async () => {
  const ExcelJS = (await import('exceljs')).default
  sheet = buildStaffTimesheet({
    email: 'rafia.husain@tarbiyahlearning.ca',
    periodIndex: 1,
    records,
    settings,
  })
  const filled = await fillTimesheet(fs.readFileSync(TEMPLATE), sheet, {
    firstName: 'Rafia',
    lastName: 'Husain',
  })
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(filled)
  ws = wb.getWorksheet('Sheet1')
})

describe('fillTimesheet against the school template', () => {
  it('writes the employee name where the template expects it', () => {
    expect(ws.getCell('D6').value).toBe('Husain, Rafia')
  })

  it('sets the period start and week numbers', () => {
    expect(ws.getCell('D9').value.toISOString().slice(0, 10)).toBe('2026-08-31')
    expect(ws.getCell('D8').value).toBe('3&4')
    expect(ws.getCell('C12').value).toBe('Week 3')
    expect(ws.getCell('H12').value).toBe('Week 4')
  })

  it('repairs the stale hardcoded date header', () => {
    // The template ships with C13 fixed at 17 Aug 2025, a year before D9.
    expect(ws.getCell('C13').value.formula).toBe('D9')
    expect(ws.getCell('C13').value.result.toISOString().slice(0, 10)).toBe('2026-08-31')
  })

  it('lays the ten day columns out on the Main Role row', () => {
    const cols = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
    const written = cols.map((c) => ws.getCell(`${c}14`).value)
    expect(written[2]).toBe(7.25)
    expect(written[3]).toBe(7.5)
    expect(written[4]).toBe(7.5)
    expect(written[0]).toBeNull()
  })

  it('keeps every total formula intact', () => {
    expect(ws.getCell('M14').value.formula).toContain('SUM(C14:L14)')
    expect(ws.getCell('C19').value.formula).toContain('SUMIFS')
    expect(ws.getCell('M19').value.formula).toBe('SUM(M14:M18)')
  })

  it('keeps the shift type dropdown', () => {
    expect(ws.getCell('B15').dataValidation.formulae).toEqual(['ShiftTypes'])
  })

  it('keeps the logo and the merged regions', () => {
    expect(ws.getImages()).toHaveLength(1)
    expect(ws.model.merges).toContain('C24:I28')
    expect(ws.model.merges).toContain('D6:F6')
  })

  it('spells out every inferred day in the comments box', () => {
    const note = ws.getCell('C24').value
    expect(note).toContain('2 day')
    expect(note).toContain('2026-09-02')
    expect(note).toContain('no check-out')
  })

  it('leaves the comments box alone when nothing was inferred', async () => {
    const ExcelJS = (await import('exceljs')).default
    const clean = buildStaffTimesheet({
      email: 'nobody@tarbiyahlearning.ca',
      periodIndex: 1,
      records: [],
      settings,
    })
    const filled = await fillTimesheet(fs.readFileSync(TEMPLATE), clean, {
      firstName: 'No',
      lastName: 'Body',
    })
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(filled)
    expect(wb.getWorksheet('Sheet1').getCell('C24').value).toBeNull()
  })
})

describe('stale cached results', () => {
  it('saves every date for weeks 5 and 6, without relying on viewer recalculation', async () => {
    const ExcelJS = (await import('exceljs')).default
    const s = buildStaffTimesheet({ email: 'nobody@school.ca', periodIndex: 2, records: [], settings })
    const filled = await fillTimesheet(fs.readFileSync(TEMPLATE), s, { firstName: 'Amera', lastName: 'Syed' })
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(filled)
    const page = wb.getWorksheet('Sheet1')
    const expected = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18',
      '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25']
    expect(['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map((col) =>
      page.getCell(`${col}13`).value.result.toISOString().slice(0, 10))).toEqual(expected)
    expect(page.getCell('G9').value.result.toISOString().slice(0, 10)).toBe('2026-09-25')
    expect(page.getCell('C21').value).toBeNull()
    expect(page.getCell('C22').value).toBeNull()
  })
  // exceljs writes formulas without their results, so the totals in the file
  // would otherwise still read whatever was cached when the template was saved.
  // It writes the recalculation flag but does not read it back, so this checks
  // the XML that actually ships.
  it('asks Excel to recalculate everything on open', async () => {
    const JSZip = (await import('jszip')).default
    const s = buildStaffTimesheet({
      email: 'rafia.husain@tarbiyahlearning.ca',
      periodIndex: 1,
      records,
      settings,
    })
    const filled = await fillTimesheet(fs.readFileSync(TEMPLATE), s, {
      firstName: 'Rafia',
      lastName: 'Husain',
    })
    const zip = await JSZip.loadAsync(filled)
    const xml = await zip.file('xl/workbook.xml').async('string')
    expect(xml).toMatch(/<calcPr[^>]*fullCalcOnLoad="1"/)
  })

  it('caches totals and the date header for viewers that do not recalculate', async () => {
    const JSZip = (await import('jszip')).default
    const filled = await fillTimesheet(fs.readFileSync(TEMPLATE), sheet, {
      firstName: 'Rafia', lastName: 'Husain',
    })
    const zip = await JSZip.loadAsync(filled)
    const xml = await zip.file('xl/worksheets/sheet1.xml').async('string')
    const cell = (address) => xml.match(new RegExp(`<c r="${address}"[^>]*>[\\s\\S]*?<\\/c>`))?.[0]
    expect(cell('M14')).toContain('<v>22.25</v>')
    expect(cell('M19')).toContain('<v>22.25</v>')
    expect(cell('C19')).toContain('<v>0</v>')
    expect(cell('C13')).toMatch(/<v>\d+<\/v>/)
  })
})

describe('reviewed timekeeping claims', () => {
  it('shows every original note, its resolution, and named holidays in the workbook', async () => {
    const ExcelJS = (await import('exceljs')).default
    const decisions = [
      { email: 'rafia.husain@tarbiyahlearning.ca', date: '2026-09-02', note: 'Supplied for 3 hours', resolution: 'Applied secondary 3 h' },
      { email: 'rafia.husain@tarbiyahlearning.ca', date: '2026-09-03', note: 'Traffic delay', resolution: 'No time adjustment identified; no hours changed' },
    ]
    const s = buildStaffTimesheet({
      email: 'rafia.husain@tarbiyahlearning.ca', periodIndex: 1, records, settings,
      commentDecisions: decisions,
    })
    const filled = await fillTimesheet(fs.readFileSync(TEMPLATE), s,
      { firstName: 'Rafia', lastName: 'Husain' }, { '2026-09-07': 'Labour Day' })
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(filled)
    const page = wb.getWorksheet('Sheet1')
    expect(page.getCell('C12').value).toBe('Week 3')
    expect(page.getCell('H12').value).toBe('Week 4 — Labour Day')
    expect(page.getCell('C24').value).toContain('Supplied for 3 hours\nResolution: Applied secondary 3 h')
    expect(page.getCell('C24').value).toContain('Traffic delay\nResolution: No time adjustment identified; no hours changed')
    const audit = wb.getWorksheet('Comment Review')
    expect(audit.getCell('A1').value).toBe('Date')
    expect(audit.getCell('B2').value).toBe('Supplied for 3 hours')
    expect(audit.getCell('C2').value).toBe('Applied secondary 3 h')
    expect(audit.getCell('B3').value).toBe('Traffic delay')
  })
  it('adds supply hours to Secondary Role and fills prep at home to the schedule', async () => {
    const ExcelJS = (await import('exceljs')).default
    const claims = [
      { email: 'rafia.husain@tarbiyahlearning.ca', date: '2026-09-02', category: 'secondary', hours: 3 },
      { email: 'rafia.husain@tarbiyahlearning.ca', date: '2026-09-04', category: 'prepAtHome', hours: null, note: 'Doing my prep at home' },
    ]
    const earlyRecords = records.map((record) =>
      record.type === 'out' ? { ...record, at: at(4, '12:00') } : record,
    )
    const s = buildStaffTimesheet({
      email: 'rafia.husain@tarbiyahlearning.ca', periodIndex: 1, records: earlyRecords, settings, claims,
    })
    expect(s.hours[4]).toBe(7.5)
    expect(s.prepAtHome[0].addedHours).toBe(3.5)
    expect(s.categoryHours.secondary[2]).toBe(3)
    expect(s.total).toBe(7.25 + 7.5 + 7.5 + 3)
    const filled = await fillTimesheet(fs.readFileSync(TEMPLATE), s, {
      firstName: 'Rafia', lastName: 'Husain',
    })
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(filled)
    const page = wb.getWorksheet('Sheet1')
    expect(page.getCell('B15').value).toBe('Secondary Role')
    expect(page.getCell('E15').value).toBe(3)
    expect(page.getCell('C24').value).toContain('2026-09-04: prep at home')
    expect(page.getCell('C24').value).toContain('Doing my prep at home')
  })

  it('does not fill prep hours on a day marked off in the staff schedule', () => {
    const offSettings = {
      ...settings,
      staffOverrides: {
        ...settings.staffOverrides,
        'rafia.husain@tarbiyahlearning.ca': {
          ...settings.staffOverrides['rafia.husain@tarbiyahlearning.ca'],
          days: { fri: { off: true } },
        },
      },
    }
    const earlyRecords = records.map((record) =>
      record.type === 'out' ? { ...record, at: at(4, '12:00') } : record,
    )
    const s = buildStaffTimesheet({
      email: 'rafia.husain@tarbiyahlearning.ca', periodIndex: 1,
      records: earlyRecords, settings: offSettings,
      claims: [{ email: 'rafia.husain@tarbiyahlearning.ca', date: '2026-09-04', category: 'prepAtHome' }],
    })
    expect(s.hours[4]).toBeLessThan(7.5)
    expect(s.prepAtHome).toHaveLength(0)
  })

  it('fills prep only to that staff member daily limit, with an explicit resolution', () => {
    const email = 'parttime@school.ca'
    const shortSettings = { ...settings, staffOverrides: {
      [email]: { expectedCheckInTime: '08:00', expectedCheckOutTime: '12:00' },
    } }
    const s = buildStaffTimesheet({ email, periodIndex: 1, settings: shortSettings,
      records: [{ email, type: 'in', at: at(4, '08:00') }, { email, type: 'out', at: at(4, '10:00') }],
      claims: [{ email, date: '2026-09-04', category: 'prepAtHome' }],
      commentDecisions: [{ email, date: '2026-09-04', note: 'Prep at home', resolution: 'Applied prep at home to scheduled hours' }],
    })
    expect(s.hours[4]).toBe(4)
    expect(s.prepAtHome[0].addedHours).toBe(2)
    expect(s.commentDecisions[0].resolution).toBe('Applied prep at home: added 2 h to Main Role, total 4 h (regular daily limit)')
  })
})
