# Portable Report Card System Blueprint

## Goal
Use this document as a plug-in blueprint for a new system that needs:
- report card style/forms similar to this project,
- PDF field filling from structured form data,
- an AI comment generator layer,
- a field generator script that identifies all PDF fields.

## What To Reuse From This Repo
Copy these modules as your baseline implementation:
- Template/type registry: `src/views/ReportCard/utils.js` (`REPORT_CARD_TYPES`)
- Field mapping layer: `src/views/ReportCard/fieldMappings.js`
- PDF fill engine: `src/views/ReportCard/pdfFillingUtils.js`
- Export pipelines per template type:
  - `src/views/ReportCard/exportProgressReport1to6.js`
  - `src/views/ReportCard/exportProgressReport7to8.js`
  - `src/views/ReportCard/exportKGInitialObservations.js`
  - `src/views/ReportCard/exportQuranReport.js`
- AI generation service: `src/services/reportCardAI.js`
- AI form control component: `src/components/AIReportCommentInput.jsx`

## Reference Architecture
1. UI layer captures teacher/admin input (`formData`).
2. Template registry selects target PDF template.
3. Field mapping resolves internal keys -> actual PDF field names.
4. PDF fill engine writes text/checkbox/radio/signature data.
5. Appearance update + flatten makes final PDF reliable for download/share.
6. AI layer generates draft comments and maps JSON back into form fields.
7. Storage layer saves draft and final PDF metadata.

## Data Contracts

### 1) Template Manifest
Use one entry per report type.

```json
{
  "id": "1-6-progress",
  "name": "Grades 1-6 - Elementary Progress Report",
  "pdfPath": "/assets/ReportCards/1-6-edu-elementary-progress-report-card-public-schools.pdf",
  "description": "Elementary progress report for grades 1-6",
  "route": "/reportcards/1-6-progress"
}
```

### 2) Field Mapping JSON
Generated for each template. Keep this as the source of truth.

```json
{
  "student": {
    "type": "PDFTextField",
    "formDataKey": "student",
    "id": 4,
    "name": "student"
  },
  "languageESL": {
    "type": "PDFCheckBox",
    "formDataKey": "language_esl",
    "id": 30,
    "name": "languageESL"
  }
}
```

### 3) AI Request/Response Contract
AI input payload:

```json
{
  "studentName": "Student Name",
  "gradeLevel": "6",
  "reportType": "Progress Report",
  "subject": "Language",
  "gradePercentage": "B",
  "strengths": "...",
  "improvements": "...",
  "teacherPrompt": "Optional instruction"
}
```

AI output payload:

```json
{
  "comments": {
    "subjectComments": [
      {
        "subject": "Language",
        "comment": "..."
      }
    ],
    "progressIndicators": {
      "nextSteps": "..."
    }
  }
}
```

## Field Generator Script (All Fields)
A generic script is included:
- `scripts/identify-pdf-fields.js`

Run on all templates:

```bash
npm run pdf:fields
```

Run on a specific path:

```bash
node scripts/identify-pdf-fields.js --input public/assets/ReportCards --output scripts/pdf-field-inventory
```

Outputs:
- `scripts/pdf-field-inventory/field-inventory.json` (full details)
- `scripts/pdf-field-inventory/field-mapping-templates.json` (mapping-ready JSON)
- `scripts/pdf-field-inventory/flat-fields-extracted.json` (simple index/name/type)
- per-PDF inventory and mapping files

## New System Setup Plan
1. Copy PDF templates into a public asset folder.
2. Run the field generator script and commit generated mapping JSON.
3. Build a template registry (`id`, `name`, `pdfPath`, `route`).
4. Build/port a field variation resolver for renamed or typo-prone fields.
5. Port PDF fill engine and keep one shared fill path for preview and export.
6. Add AI service through a server-side proxy (never expose provider keys in frontend).
7. Wire AI JSON back into editable form fields.
8. Add draft + finalization states in storage.
9. Add tests for field mappings and fill regressions.

## XML PDF (AcroForm/XFA) Notes
- This implementation works for AcroForm PDFs (standard interactive fields).
- If a template is XFA-only, field extraction can return empty. Convert XFA to AcroForm first.
- Always validate checkbox export values and typoed field names before production use.

## Minimum QA Checklist
- Every template field appears in preview and in downloaded PDF.
- Checkboxes/radio options render correctly after flattening.
- Signatures (typed/drawn) are visible in final PDF.
- AI output is valid JSON and maps to intended fields.
- No unmatched required fields in final export logs.

## Recommended Folder Layout For A New Project
```text
reportcards/
  assets/templates/
  config/reportCardTypes.json
  fields/
    <template>.mapping.json
  services/
    pdfFillingService.ts
    aiCommentService.ts
  scripts/
    identify-pdf-fields.js
  ui/
    ReportCardForm.tsx
    ReportCardPreview.tsx
```
