#!/usr/bin/env node
/**
 * Generic PDF field inventory generator.
 *
 * Usage:
 *   node scripts/identify-pdf-fields.js
 *   node scripts/identify-pdf-fields.js --input public/assets/ReportCards --output scripts/pdf-field-inventory
 *   node scripts/identify-pdf-fields.js --input ./template.pdf --output ./tmp/field-output
 */

const fs = require('fs')
const path = require('path')
const { PDFDocument } = require('pdf-lib')

const DEFAULT_INPUT = 'public/assets/ReportCards'
const DEFAULT_OUTPUT = 'scripts/pdf-field-inventory'

function printHelp() {
  console.log(`PDF Field Inventory Generator

Options:
  -i, --input <path>       PDF file or directory to scan (default: ${DEFAULT_INPUT})
  -o, --output <path>      Output directory (default: ${DEFAULT_OUTPUT})
      --no-recursive       Do not scan subdirectories
      --flat-only          Only write a flat extracted file (compat format)
  -h, --help               Show this help

Output files:
  - field-inventory.json           Full inventory for all PDFs
  - field-mapping-templates.json   Mapping templates keyed by PDF
  - flat-fields-extracted.json     Compatibility format (name/type/index)
  - <pdf-name>.inventory.json      Per-PDF detailed inventory
  - <pdf-name>.mapping.json        Per-PDF mapping template
`)
}

function parseArgs(argv) {
  const options = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    recursive: true,
    flatOnly: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === '-h' || arg === '--help') {
      options.help = true
      continue
    }

    if (arg === '--no-recursive') {
      options.recursive = false
      continue
    }

    if (arg === '--flat-only') {
      options.flatOnly = true
      continue
    }

    if (arg === '-i' || arg === '--input') {
      const value = argv[i + 1]
      if (!value || value.startsWith('-')) {
        throw new Error('Missing value for --input')
      }
      options.input = value
      i += 1
      continue
    }

    if (arg === '-o' || arg === '--output') {
      const value = argv[i + 1]
      if (!value || value.startsWith('-')) {
        throw new Error('Missing value for --output')
      }
      options.output = value
      i += 1
      continue
    }

    if (!arg.startsWith('-')) {
      options.input = arg
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

function isPdfFile(filePath) {
  return path.extname(filePath).toLowerCase() === '.pdf'
}

function walkDirectory(dirPath, recursive) {
  const results = []
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      if (recursive) {
        results.push(...walkDirectory(fullPath, recursive))
      }
      continue
    }

    if (entry.isFile() && isPdfFile(fullPath)) {
      results.push(fullPath)
    }
  }

  return results
}

function resolveInputFiles(inputPath, recursive) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input path does not exist: ${inputPath}`)
  }

  const stat = fs.statSync(inputPath)

  if (stat.isFile()) {
    if (!isPdfFile(inputPath)) {
      throw new Error(`Input file is not a PDF: ${inputPath}`)
    }
    return [inputPath]
  }

  if (stat.isDirectory()) {
    const files = walkDirectory(inputPath, recursive)
    if (files.length === 0) {
      throw new Error(`No PDF files found in: ${inputPath}`)
    }
    return files.sort((a, b) => a.localeCompare(b))
  }

  throw new Error(`Unsupported input path type: ${inputPath}`)
}

function normalizeFieldType(field) {
  const rawType = field.constructor && field.constructor.name ? field.constructor.name : 'Unknown'

  if (rawType !== 'e') {
    return { type: rawType, rawType }
  }

  if (typeof field.check === 'function' && typeof field.isChecked === 'function') {
    return { type: 'PDFCheckBox', rawType }
  }

  if (typeof field.setText === 'function' && typeof field.getText === 'function') {
    return { type: 'PDFTextField', rawType }
  }

  if (typeof field.getOptions === 'function' && typeof field.select === 'function') {
    return { type: 'PDFDropdownOrRadio', rawType }
  }

  return { type: 'Unknown', rawType }
}

function toFormDataKey(fieldName) {
  return String(fieldName)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
}

function getFieldOptions(field) {
  try {
    if (typeof field.getOptions === 'function') {
      const options = field.getOptions()
      if (Array.isArray(options)) {
        return options
      }
    }
  } catch (error) {
    // Ignore optional extraction failures.
  }
  return undefined
}

function getTextFieldMetadata(field) {
  const meta = {}

  try {
    if (typeof field.getMaxLength === 'function') {
      const maxLength = field.getMaxLength()
      if (Number.isInteger(maxLength)) {
        meta.maxLength = maxLength
      }
    }
  } catch (error) {
    // Ignore optional extraction failures.
  }

  try {
    if (typeof field.isMultiline === 'function') {
      meta.multiline = Boolean(field.isMultiline())
    }
  } catch (error) {
    // Ignore optional extraction failures.
  }

  try {
    if (typeof field.isReadOnly === 'function') {
      meta.readOnly = Boolean(field.isReadOnly())
    }
  } catch (error) {
    // Ignore optional extraction failures.
  }

  try {
    if (typeof field.isRequired === 'function') {
      meta.required = Boolean(field.isRequired())
    }
  } catch (error) {
    // Ignore optional extraction failures.
  }

  try {
    if (typeof field.getAlignment === 'function') {
      const alignment = field.getAlignment()
      if (alignment !== undefined && alignment !== null) {
        meta.alignment = alignment
      }
    }
  } catch (error) {
    // Ignore optional extraction failures.
  }

  return meta
}

function uniqueSortedNumbers(values) {
  return [...new Set(values)].sort((a, b) => a - b)
}

function sanitizeFileName(fileName) {
  return fileName
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function buildCountsByType(fields) {
  const counts = {}
  for (const field of fields) {
    counts[field.type] = (counts[field.type] || 0) + 1
  }
  return counts
}

function buildMappingTemplate(fields) {
  const mapping = {}
  for (const field of fields) {
    mapping[field.name] = {
      type: field.type,
      formDataKey: field.formDataKey,
      id: field.index - 1,
      name: field.name,
    }

    if (field.options && field.options.length > 0) {
      mapping[field.name].options = field.options
    }

    if (field.pages && field.pages.length > 0) {
      mapping[field.name].pages = field.pages
    }
  }
  return mapping
}

async function inspectPdf(pdfPath) {
  const pdfBytes = fs.readFileSync(pdfPath)
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const form = pdfDoc.getForm()
  const fields = form.getFields()
  const pages = pdfDoc.getPages()

  const pageRefToNumber = new Map()
  pages.forEach((page, index) => {
    const pageRef = page.ref && typeof page.ref.toString === 'function' ? page.ref.toString() : null
    if (pageRef) {
      pageRefToNumber.set(pageRef, index + 1)
    }
  })

  const extractedFields = fields.map((field, idx) => {
    const { type, rawType } = normalizeFieldType(field)
    const name = field.getName()
    const item = {
      index: idx + 1,
      name,
      type,
      formDataKey: toFormDataKey(name),
    }

    if (type !== rawType) {
      item.rawType = rawType
    }

    const widgets = field.acroField && typeof field.acroField.getWidgets === 'function'
      ? field.acroField.getWidgets()
      : []

    if (widgets.length > 0) {
      const pageNumbers = widgets
        .map((widget) => {
          const pageRef = widget.P && typeof widget.P === 'function' ? widget.P() : null
          return pageRef ? pageRefToNumber.get(pageRef.toString()) : undefined
        })
        .filter((value) => Number.isInteger(value))

      item.widgetCount = widgets.length
      if (pageNumbers.length > 0) {
        item.pages = uniqueSortedNumbers(pageNumbers)
      }
    }

    if (type === 'PDFTextField') {
      Object.assign(item, getTextFieldMetadata(field))
    }

    if (type === 'PDFCheckBox') {
      try {
        if (typeof field.isChecked === 'function') {
          item.checked = Boolean(field.isChecked())
        }
      } catch (error) {
        // Ignore optional extraction failures.
      }
    }

    if (type === 'PDFDropdown' || type === 'PDFRadioGroup' || type === 'PDFDropdownOrRadio') {
      const options = getFieldOptions(field)
      if (options && options.length > 0) {
        item.options = options
      }
    }

    return item
  })

  const fileName = path.basename(pdfPath)

  return {
    fileName,
    relativePath: pdfPath,
    totalPages: pages.length,
    totalFields: extractedFields.length,
    countsByType: buildCountsByType(extractedFields),
    fields: extractedFields,
    mappingTemplate: buildMappingTemplate(extractedFields),
    generatedAt: new Date().toISOString(),
  }
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    return
  }

  const inputPath = path.resolve(process.cwd(), options.input)
  const outputDir = path.resolve(process.cwd(), options.output)

  const pdfFiles = resolveInputFiles(inputPath, options.recursive)
  ensureDirectory(outputDir)

  console.log(`Scanning ${pdfFiles.length} PDF file(s) from: ${inputPath}`)

  const inventoryByPdf = {}
  const mappingByPdf = {}
  const flatExtracted = {}

  for (const pdfFile of pdfFiles) {
    const inspection = await inspectPdf(pdfFile)
    const safeName = sanitizeFileName(inspection.fileName)

    inventoryByPdf[inspection.fileName] = {
      fileName: inspection.fileName,
      relativePath: path.relative(process.cwd(), pdfFile),
      totalPages: inspection.totalPages,
      totalFields: inspection.totalFields,
      countsByType: inspection.countsByType,
      fields: inspection.fields,
      generatedAt: inspection.generatedAt,
    }

    mappingByPdf[inspection.fileName] = inspection.mappingTemplate
    flatExtracted[inspection.fileName] = inspection.fields.map((field) => ({
      index: field.index,
      name: field.name,
      type: field.type,
    }))

    if (!options.flatOnly) {
      writeJson(path.join(outputDir, `${safeName}.inventory.json`), inventoryByPdf[inspection.fileName])
      writeJson(path.join(outputDir, `${safeName}.mapping.json`), inspection.mappingTemplate)
    }

    console.log(`- ${inspection.fileName}: ${inspection.totalFields} fields`)
  }

  writeJson(path.join(outputDir, 'flat-fields-extracted.json'), flatExtracted)

  if (!options.flatOnly) {
    writeJson(path.join(outputDir, 'field-inventory.json'), {
      generatedAt: new Date().toISOString(),
      inputPath: path.relative(process.cwd(), inputPath),
      totalPdfs: pdfFiles.length,
      pdfs: inventoryByPdf,
    })

    writeJson(path.join(outputDir, 'field-mapping-templates.json'), {
      generatedAt: new Date().toISOString(),
      inputPath: path.relative(process.cwd(), inputPath),
      totalPdfs: pdfFiles.length,
      pdfs: mappingByPdf,
    })
  }

  console.log(`\nDone. Output written to: ${outputDir}`)
}

main().catch((error) => {
  console.error(`Failed to generate field inventory: ${error.message}`)
  process.exit(1)
})
