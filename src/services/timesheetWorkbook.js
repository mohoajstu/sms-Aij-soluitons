import {
  periodStartFor,
  periodLabel,
  periodWorkingDays,
  buildStaffTimesheet,
  timesheetFileName,
  personDisplayName,
  dedupePeopleByEmail,
} from './timesheetExport'

/**
 * Fills the school's own bi-weekly timesheet template.
 *
 * The template is loaded and written back rather than rebuilt, so the logo,
 * the merged cells, the shift-type dropdown and every total formula survive
 * untouched. Period headings, hours, and the comment decision trail are filled.
 */

export const TEMPLATE_URL = '/assets/timekeeping/timesheet-template.xlsx'

// Ten weekday columns, C through L.
const DAY_COLUMNS = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
const MAIN_ROLE_ROW = 14
const CATEGORY_LABELS = {
  secondary: 'Secondary Role',
  vacation: 'Vacation',
  sick: 'Sick',
  stat: 'Stat Holiday',
  absent: 'Absent',
  other: 'Other',
}
const DAY_MS = 24 * 60 * 60 * 1000

const cacheFormulaResult = (ws, address, result) => {
  const cell = ws.getCell(address)
  cell.value = { ...cell.value, result }
}

export const fetchTemplate = async (url = TEMPLATE_URL) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not load the timesheet template (${res.status}).`)
  return res.arrayBuffer()
}

const commentText = (sheet) => {
  if (!sheet.inferred.length && !sheet.prepAtHome?.length && !sheet.commentDecisions?.length) return ''
  const inferredLines = sheet.inferred.map(
    (i) => `${i.date}: ${i.reason}, counted to the scheduled time (${i.hours} h)`,
  )
  const prepLines = (sheet.prepAtHome || []).map(
    (i) => `${i.date}: prep at home, added ${i.addedHours} h to reach regular daily limit (${i.hours} h)${i.note ? `; note: ${i.note}` : ''}`,
  )
  const decisionLines = (sheet.commentDecisions || []).map((item) =>
    `${item.date}: comment: ${item.note}\nResolution: ${item.resolution}`,
  )
  return [
    'Hours below are from staff check-in records.',
    ...(inferredLines.length ? [
      `${inferredLines.length} day${inferredLines.length > 1 ? 's' : ''} had a missing tap and were completed from the schedule:`,
      ...inferredLines,
    ] : []),
    ...prepLines,
    ...(decisionLines.length ? ['Comment review:', ...decisionLines] : []),
  ].join('\n')
}

const weekHeading = (periodIndex, week, holidays) => {
  const number = periodIndex * 2 + week + 1
  const dates = periodWorkingDays(periodIndex).slice(week * 5, week * 5 + 5)
  const named = dates.flatMap((date) => {
    const label = holidays?.[date.toISOString().slice(0, 10)]
    return label ? [String(label).trim()] : []
  })
  return `Week ${number}${named.length ? ` — ${[...new Set(named)].join(', ')}` : ''}`
}

/**
 * @param {ArrayBuffer} templateBuffer
 * @param {Object} sheet - the result of buildStaffTimesheet
 * @param {Object} person - { firstName, lastName }
 * @returns {Promise<ArrayBuffer>}
 */
export const fillTimesheet = async (templateBuffer, sheet, person, holidays = {}) => {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(templateBuffer)
  const ws = wb.getWorksheet('Sheet1')

  // exceljs writes formulas but not their results, so every total would still
  // carry the value cached when the template was last saved. Force Excel to
  // recalculate the moment the file opens.
  wb.calcProperties = { ...(wb.calcProperties || {}), fullCalcOnLoad: true }

  ws.getCell('D6').value = personDisplayName(person)

  ws.getCell('D9').value = periodStartFor(sheet.periodIndex)
  ws.getCell('D8').value = periodLabel(sheet.periodIndex)
  ws.getCell('C12').value = weekHeading(sheet.periodIndex, 0, holidays)
  ws.getCell('H12').value = weekHeading(sheet.periodIndex, 1, holidays)

  // The template ships with C13 hardcoded to a date a year earlier than D9,
  // which threw the whole header row out. Drive it off the period instead.
  const dates = periodWorkingDays(sheet.periodIndex)
  const serial = (date) => (date.getTime() - Date.UTC(1899, 11, 30)) / DAY_MS
  ws.getCell('G9').value = { formula: 'D9+11', result: serial(dates[9]) }
  DAY_COLUMNS.forEach((col, index) => {
    ws.getCell(`${col}13`).value = {
      formula: index === 0 ? 'D9' : `${DAY_COLUMNS[index - 1]}13+${index === 5 ? 3 : 1}`,
      result: serial(dates[index]),
    }
  })
  ws.getCell('C21').value = null
  ws.getCell('C22').value = null

  DAY_COLUMNS.forEach((col, i) => {
    const value = sheet.hours[i]
    ws.getCell(`${col}${MAIN_ROLE_ROW}`).value = value == null ? null : value
  })

  const categories = Object.entries(sheet.categoryHours || {})
  if (categories.length > 4) throw new Error(`Too many timesheet categories for ${sheet.email}.`)
  categories.forEach(([category, values], index) => {
    const row = 15 + index
    ws.getCell(`B${row}`).value = CATEGORY_LABELS[category]
    DAY_COLUMNS.forEach((col, dayIndex) => {
      ws.getCell(`${col}${row}`).value = values[dayIndex] ?? null
    })
  })
  for (let row = 15 + categories.length; row <= 18; row += 1) {
    DAY_COLUMNS.forEach((col) => { ws.getCell(`${col}${row}`).value = null })
  }

  const rows = [sheet.hours, ...Array.from({ length: 4 }, (_, index) => categories[index]?.[1] || [])]
  rows.forEach((values, index) => {
    cacheFormulaResult(ws, `M${MAIN_ROLE_ROW + index}`,
      values.reduce((sum, value) => sum + (value || 0), 0))
  })
  DAY_COLUMNS.forEach((col, dayIndex) => {
    cacheFormulaResult(ws, `${col}19`, rows.reduce((sum, values) => sum + (values[dayIndex] || 0), 0))
  })
  cacheFormulaResult(ws, 'M19', sheet.total)

  const note = commentText(sheet)
  if (note) {
    const cell = ws.getCell('C24')
    cell.value = note.length <= 30000 ? note
      : `${note.slice(0, 29800)}\nSee the Comment Review tab for the complete note history.`
    cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true }
  }

  if (sheet.commentDecisions?.length) {
    const review = wb.addWorksheet('Comment Review')
    review.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Original staff comment', key: 'note', width: 58 },
      { header: 'Timesheet resolution', key: 'resolution', width: 58 },
    ]
    review.getRow(1).font = { bold: true }
    review.views = [{ state: 'frozen', ySplit: 1 }]
    sheet.commentDecisions.forEach((decision) => {
      const row = review.addRow({ date: decision.date, note: decision.note, resolution: decision.resolution })
      row.alignment = { vertical: 'top', wrapText: true }
      row.height = Math.min(400, Math.max(30,
        15 * Math.ceil(Math.max(decision.note.length / 50, decision.resolution.length / 50))))
    })
  }

  return wb.xlsx.writeBuffer()
}

/**
 * One filled workbook per person, bundled into a single zip.
 *
 * @param {Object} args
 * @param {Array} args.people - { email, firstName, lastName }
 * @param {Array} args.records - { email, type, at }
 * @param {Object} args.settings - timekeeping settings document
 * @param {number} args.periodIndex
 * @param {Function} [args.onProgress] - (done, total) => void
 */
export const generateTimesheetZip = async ({
  people,
  records,
  settings,
  periodIndex,
  claims = [],
  commentDecisions = [],
  holidays = {},
  corrections = [],
  onProgress,
}) => {
  const [{ default: JSZip }, templateBuffer] = await Promise.all([import('jszip'), fetchTemplate()])

  const zip = new JSZip()
  const summary = []
  const roster = dedupePeopleByEmail(people)
  let done = 0

  for (const person of roster) {
    const sheet = buildStaffTimesheet({
      email: person.email,
      periodIndex,
      records,
      settings,
      claims,
      commentDecisions,
      corrections,
    })
    const buffer = await fillTimesheet(templateBuffer, sheet, person, holidays)
    zip.file(timesheetFileName(person, periodIndex), buffer)
    summary.push({
      name: personDisplayName(person),
      email: person.email,
      total: sheet.total,
      inferred: sheet.inferred.length,
    })
    done += 1
    if (onProgress) onProgress(done, roster.length)
  }

  const days = periodWorkingDays(periodIndex)
  const blob = await zip.generateAsync({ type: 'blob' })
  return {
    blob,
    fileName: `TLA_Timesheets_Weeks${periodLabel(periodIndex)}.zip`,
    summary,
    periodStart: days[0],
    periodEnd: days[9],
  }
}
