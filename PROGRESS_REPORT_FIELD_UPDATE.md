# Progress Report PDF Field Mapping Update

## Summary
This document explains the changes made to ensure the **flattened PDF export** matches the **preview PDF** for all progress report types.

## Problem
- You made changes to all three progress report PDFs (KG Initial Observation, 1-6 Progress, 7-8 Progress)
- The **preview** (PDFViewer component) and **export** (downloadFilledPDF function) were using **separate field mapping functions**
- This caused fields to appear in preview but not in exported PDF (or vice versa)

## Solution
Created a **shared field mapping module** that both components now use:

### Files Changed:

1. **`src/views/ReportCard/fieldMappings.js`** ✅ NEW
   - Single source of truth for all PDF field mappings
   - Covers all three progress report types
   - Includes 200+ field mappings extracted from actual PDFs

2. **`src/views/ReportCard/Components/PDFViewer.js`** ✅ UPDATED
   - Now imports `generateFieldNameVariations` from `fieldMappings.js`
   - Old local function commented out for reference

3. **`src/views/ReportCard/utils.js`** ✅ UPDATED
   - Now imports `generateFieldNameVariations` from `fieldMappings.js`
   - Old local function commented out for reference

### New Fields Added:

#### KG Initial Observation:
- `earlyChildEducator`
- `year1`, `year2`
- `keyLearning`, `keyLearning2`
- `keyLearningESL`, `keyLearningIEP`
- `date`

#### 7-8 Progress Report:
- `responsibility`, `organization`, `independentWork` (without numbers)
- `historyWithDifficulty`, `historyWell`, `historyVeryWell`, etc.
- `geographyWithDifficulty`, `geographyWell`, `geographyVeryWell`, etc.
- `sans2History`, `sans2Geography`
- Handles PDF typos: `data` (for "date"), `principle` (for "principal"), `peIEL` (for "peIEP")

#### All Progress Reports:
- All `sans2*` fields for subject comments
- Complete checkbox mappings for ESL/IEP/NA/French
- Performance level mappings (WithDifficulty/Well/VeryWell)

## Testing Checklist

Test each progress report type:

### KG Initial Observation
- [ ] All basic fields fill correctly in preview
- [ ] All basic fields appear in exported PDF
- [ ] `earlyChildEducator` field works
- [ ] `keyLearning` and `keyLearning2` fields work
- [ ] `keyLearningESL` and `keyLearningIEP` checkboxes work
- [ ] Signatures appear correctly

### 1-6 Progress Report
- [ ] Learning Skills fields (responsibility1, organization1, etc.) work
- [ ] All subject checkboxes (ESL/IEP/NA) work
- [ ] Performance levels (WithDifficulty/Well/VeryWell) work
- [ ] `sans2*` comment fields for all subjects work
- [ ] Signatures appear correctly

### 7-8 Progress Report
- [ ] Learning Skills fields (responsibility, organization, etc.) work
- [ ] History and Geography fields work
- [ ] `sans2History` and `sans2Geography` work
- [ ] All subject checkboxes work
- [ ] Performance levels work
- [ ] Signatures appear correctly

## How to Verify

1. **Preview Test:**
   - Fill out a progress report form
   - Enable "Show Preview"
   - Verify all fields appear in the preview

2. **Export Test:**
   - Click "Download Filled PDF"
   - Open the downloaded PDF
   - Verify all fields from preview are present in the exported PDF

3. **Field Mismatch Test:**
   - If a field appears in preview but NOT in export, add it to `fieldMappings.js`
   - If a field doesn't appear in preview OR export, check the form component

## Maintenance

### Adding New Fields:
1. Add new PDF fields to `src/views/ReportCard/fieldMappings.js`
2. NO need to update PDFViewer.js or utils.js - they auto-use the shared mapping

### Checking Field Names:
Run the extraction script to see all PDF field names:
```bash
node scripts/extract-pdf-fields.js
```

This will output:
- All field names from each PDF
- Field types (checkbox, text, etc.)
- A suggested mapping template

## File Cleanup (Optional)

After confirming everything works, you can:
1. Remove old `OLD_generateFieldNameVariations_REMOVE_ME` functions from both files
2. Remove `REMOVE_generateFieldNameVariations` function from PDFViewer.js
3. Delete `scripts/extract-pdf-fields.js` if no longer needed

## Support

If you encounter fields that aren't filling:

1. Check the browser console for warnings like:
   ```
   "Could not find PDF field for formKey X"
   ```

2. Add the field to `fieldMappings.js`:
   ```javascript
   fieldKey: ['pdfFieldName', 'alternativeNames'],
   ```

3. The mapping is case-sensitive, so check exact field names in the PDF

---

**Date:** November 18, 2025
**Status:** ✅ Ready for Testing

