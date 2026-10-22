import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { PDFDocument } from 'pdf-lib'
import { layoutMultilineText } from 'pdf-lib/cjs/api/text/layout.js'
import { embedTimesRomanFont, fillPDFField, getFieldFontSize } from '../pdfFillingUtils'
import {
  LEARNING_SKILL_COMMENT_LIMITS,
  SUBJECT_COMMENT_LIMIT,
  KG_KEY_LEARNING_LIMIT,
} from '../utils/characterLimits'

/**
 * Guards the progress-report comment caps against the real PDF templates:
 * a comment typed up to the cap must render entirely inside its box on the
 * downloaded PDF. Anything past the box's height is clipped, which is the
 * "it cuts off" bug teachers would see.
 *
 * Mirrors the download path: fillPDFField() sets the field's font size
 * (getFieldFontSize: 8.5pt for progress comments, 10pt for KG) in Times
 * Roman, then pdf-lib lays text out inside the widget rect inset by
 * (border width + 1pt padding) on each side, and draws each line at its
 * baseline. A line is clipped unless its descenders stay inside that inset.
 */

const SAMPLE_COMMENTS = [
  'Noora works well with her peers and consistently demonstrates strong effort in class discussions. She is making excellent progress this term and should continue to build on her strong foundation. ',
  'Muhammad independently organizes his materials, participates thoughtfully during collaborative activities, and demonstrates responsibility by completing assignments punctually and accurately. ',
]

const textOfLength = (sample, length) =>
  sample.repeat(Math.ceil(length / sample.length) + 1).slice(0, length)

const pdfPath = (name) =>
  fileURLToPath(new URL(`../../../assets/ReportCards/${name}`, import.meta.url))

const loadTemplate = async (name) => {
  const pdfDoc = await PDFDocument.load(readFileSync(pdfPath(name)))
  const font = await embedTimesRomanFont(pdfDoc)
  return { form: pdfDoc.getForm(), font }
}

// Returns how much vertical space the text needs vs. what the box offers.
const measure = (form, font, fieldName, text) => {
  const field = form.getTextField(fieldName)
  fillPDFField(field, text, font, getFieldFontSize(fieldName))

  const widget = field.acroField.getWidgets()[0]
  const fontSize = Number(
    /(\d+(?:\.\d+)?)\s+Tf/.exec(
      widget.getDefaultAppearance() || field.acroField.getDefaultAppearance(),
    )[1],
  )
  const { width, height } = widget.getRectangle()
  const inset = (widget.getBorderStyle()?.getWidth() ?? 0) + 1
  const bounds = { x: inset, y: inset, width: width - inset * 2, height: height - inset * 2 }

  const { lines, lineHeight } = layoutMultilineText(text, { alignment: 0, fontSize, font, bounds })
  const descent = font.heightAtSize(fontSize) - font.heightAtSize(fontSize, { descender: false })
  return { fontSize, needed: lines.length * lineHeight + descent, available: bounds.height }
}

const expectFits = (form, font, fieldName, limit) => {
  SAMPLE_COMMENTS.forEach((sample) => {
    const { fontSize, needed, available } = measure(
      form,
      font,
      fieldName,
      textOfLength(sample, limit),
    )
    expect(fontSize, `${fieldName} should render at its export font size`).toBe(
      getFieldFontSize(fieldName),
    )
    expect(
      needed,
      `${fieldName}: a ${limit}-char comment needs ${needed.toFixed(1)}pt but the box has ${available.toFixed(1)}pt`,
    ).toBeLessThanOrEqual(available)
  })
}

const SUBJECT_FIELDS = {
  '1-6': [
    'sans2Language',
    'sans2French',
    'sans2NativeLanguage',
    'sans2SocialStudies',
    'sans2HealthEd',
    'sans2Science',
    'sans2Math',
    'sans2PE',
    'sans2Dance',
    'sans2Drama',
    'sans2Music',
    'sans2VisualArts',
    'sans2Other',
  ],
  '7-8': [
    'sans2Language',
    'sans2French',
    'sans2NativeLanguage',
    'sans2Math',
    'sans2Science',
    'sans2History',
    'sans2Geography',
    'sans2PE',
    'sans2Dance',
    'sans2Drama',
    'sans2Music',
    'sans2VisualArts',
    'sans2Other',
    'sans2HealthEd',
  ],
}

const TEMPLATES = {
  '1-6': '1-6-edu-elementary-progress-report-card-public-schools.pdf',
  '7-8': '7-8-edu-elementary-progress-report-card-public-schools.pdf',
}

describe.each(Object.keys(TEMPLATES))(
  'Grade %s progress report comment caps fit the PDF',
  (band) => {
    let form
    let font
    beforeAll(async () => {
      ;({ form, font } = await loadTemplate(TEMPLATES[band]))
    })

    it.each(Object.entries(LEARNING_SKILL_COMMENT_LIMITS[band]))(
      'learning skill %s (cap %i)',
      (fieldName, limit) => {
        expect(limit).toBeLessThanOrEqual(250)
        expectFits(form, font, fieldName, limit)
      },
    )

    it.each(SUBJECT_FIELDS[band])('subject %s', (fieldName) => {
      expectFits(form, font, fieldName, SUBJECT_COMMENT_LIMIT)
    })
  },
)

describe('Kindergarten initial observations cap fits the PDF', () => {
  it(`keyLearning holds ${KG_KEY_LEARNING_LIMIT} characters`, async () => {
    const { form, font } = await loadTemplate('kg-cl-initial-Observations.pdf')
    expectFits(form, font, 'keyLearning', KG_KEY_LEARNING_LIMIT)
  }, 30000)
})
