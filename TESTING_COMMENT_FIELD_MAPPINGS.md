# Comment Field Mapping Tests - Documentation

## Overview

The `commentFieldMappings.test.js` file contains comprehensive unit tests to prevent regressions in report card field mappings. These tests were created after fixing critical issues where teacher comments weren't appearing in PDF reports due to field mapping mismatches.

## What the Tests Prevent

### Critical Issues Previously Found:
1. **Grade 7-8 Islamic Studies** - Used generic field name `Text_1` instead of descriptive `otherStrengthsAndNextStepsForImprovement`
2. **Health & PE Comments** - UI saved to separate fields (`healthEdStrengthAndNextStepsForImprovement`, `peStrengthAndNextStepsForImprovement`) but PDF expected combined field (`healthAndPEStrengthsAndNextStepsForImprovement`)
3. **Arts Comments** - UI saved to individual art form fields but PDF expected combined field (`artsStrengthsAndNextStepsForImprovement`)

## Running the Tests

### Run All Tests
```bash
npm run test:unit -- src/views/ReportCard/__tests__/commentFieldMappings.test.js
```

### Run in Watch Mode (during development)
```bash
npm run test:watch -- src/views/ReportCard/__tests__/commentFieldMappings.test.js
```

### Run All Report Card Tests
```bash
npm run test:unit -- src/views/ReportCard/__tests__/
```

## Test Coverage

### 1. Grade 1-6 Report Card Comment Fields (12 tests)
- ✅ Verifies all subject comment fields exist in JSON
- ✅ Ensures Language, French, Math, Science, Social Studies have correct field names
- ✅ Confirms combined field for Health & PE
- ✅ Confirms combined field for Arts (Dance, Drama, Music, Visual Arts)
- ✅ Confirms Islamic Studies field (not "Other")
- ✅ Ensures NO separate Health/PE comment fields exist
- ✅ Ensures NO individual art form comment fields exist

### 2. Grade 7-8 Report Card Comment Fields (14 tests)
- ✅ Verifies all subject comment fields exist in JSON
- ✅ Includes History and Geography (instead of Social Studies)
- ✅ Confirms combined field for Health & PE
- ✅ Confirms combined field for Arts
- ✅ Confirms Islamic Studies field uses descriptive name
- ✅ **CRITICAL**: Ensures `Text_1` generic field name is gone
- ✅ Ensures NO separate Health/PE comment fields exist
- ✅ Ensures NO individual art form comment fields exist

### 3. Combined Field Mappings (6 tests)
- ✅ Health & PE uses same combined field for both grade ranges
- ✅ Arts uses combined field (with slight naming variation between grade ranges)
- ✅ Consistent naming conventions

### 4. Islamic Studies Field (3 tests)
- ✅ Grade 1-6 has `otherStrengthAndNextStepsForImprovement`
- ✅ Grade 7-8 has `otherStrengthsAndNextStepsForImprovement` (not `Text_1`)
- ✅ Both have subject name field (`other`)

### 5. Field Data Key Consistency (1 test)
- ✅ All formDataKeys are lowercase and have no spaces

### 6. Subject Accommodation Fields (3 tests)
- ✅ Health & PE have separate accommodation fields (ESL, IEP, French)
- ✅ Each art form has separate accommodation fields

### 7. Mark Fields (2 tests)
- ✅ Grade 1-6 has marks for Report 1 and Report 2
- ✅ Grade 7-8 has marks AND medians for Report 1 and Report 2

### 8. UI Component Structure (2 tests)
- ✅ Validates expected UI component field mappings match JSON
- ✅ Ensures all referenced fields actually exist in PDF templates

## Understanding Test Failures

### If a Test Fails:

#### "should NOT have generic Text_1 field anymore"
**Problem**: The Grade 7-8 JSON still has the old `Text_1` field
**Fix**: Rename `Text_1` to `otherStrengthsAndNextStepsForImprovement` in `7-8-elementary-report.json`

#### "should have [fieldName] field in JSON"
**Problem**: A required comment field is missing from the JSON
**Fix**: Add the missing field to the appropriate JSON file

#### "should NOT have separate [subject] comment field"
**Problem**: Old separate fields still exist (should use combined field)
**Fix**: Remove the individual field from JSON and ensure combined field exists

#### "should use consistent naming between grade ranges"
**Problem**: Field names don't match between Grade 1-6 and 7-8
**Fix**: Standardize naming (either both use "Strength" or both use "Strengths")

## Maintaining the Tests

### When Adding New Subjects:
1. Add the subject's comment field to the appropriate JSON
2. Add the subject to the expected fields list in the test
3. Update UI components to reference the new field
4. Run tests to verify everything works

### When Modifying Field Names:
1. Update the JSON field definition
2. Update the UI component's `commentField` property
3. Update the test's expected field name
4. Run tests to ensure consistency

### When Creating New Report Types:
1. Create new JSON field definition file
2. Create corresponding UI component
3. Add new test suite following existing patterns
4. Test thoroughly before deploying

## Integration with CI/CD

These tests should be run:
- ✅ Before every commit (pre-commit hook)
- ✅ On every pull request
- ✅ Before deployment to production
- ✅ After any changes to report card JSON files or UI components

### Recommended Pre-commit Hook:
```bash
#!/bin/sh
npm run test:unit -- src/views/ReportCard/__tests__/commentFieldMappings.test.js
```

## Current Status

**All 43 tests passing** ✅

### Test Breakdown:
- Grade 1-6 Report: 12 tests ✅
- Grade 7-8 Report: 14 tests ✅
- Combined Fields: 6 tests ✅
- Islamic Studies: 3 tests ✅
- Data Key Consistency: 1 test ✅
- Accommodations: 3 tests ✅
- Marks: 2 tests ✅
- UI Integration: 2 tests ✅

## Files Covered

### JSON Field Definitions:
- `src/views/ReportCard/Fields/1-6-elementary-report.json`
- `src/views/ReportCard/Fields/7-8-elementary-report.json`
- `src/views/ReportCard/Fields/1-6-elementary-progress.json`

### UI Components (validated):
- `src/views/ReportCard/Components/Elementary1to6ReportUI.js`
- `src/views/ReportCard/Components/Elementary7to8ReportUI.js`

## Future Enhancements

### Potential Additions:
1. **Data Flow Tests**: Test that sample data flows correctly from UI → JSON → PDF
2. **Progress Report Tests**: Add similar tests for progress reports
3. **Kindergarten Tests**: Add tests for kindergarten report fields
4. **Field Type Validation**: Ensure all comment fields are `PDFTextField` type
5. **Max Length Validation**: Verify character limits are reasonable
6. **Auto-fix Script**: Create script to automatically fix common field mapping issues

## Support

If tests fail after making changes:
1. Read the test failure message carefully
2. Check the JSON field definitions
3. Check the UI component's subject array
4. Ensure field names match exactly (case-sensitive)
5. Run tests locally before pushing
6. If stuck, refer to this documentation or previous fixes in git history

## Related Documentation

- `GRADE_1-6_REPORT_FIXES.md` - Details on Grade 1-6 field mapping fixes
- `GRADE_7-8_REPORT_FIXES.md` - Details on Grade 7-8 field mapping fixes
- `IMPLEMENTATION_COMPLETE.md` - Overall implementation documentation

---

**Last Updated**: January 2026  
**Test Coverage**: 43 tests across 8 test suites  
**Status**: ✅ All Passing

