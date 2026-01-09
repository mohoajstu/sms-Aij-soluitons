# Term Field Analysis & Implementation Summary

## Overview
This document summarizes the term-specific field separation implementation and provides recommendations for field management across report card types.

## Term-Specific Field Separation

### Implementation
- **Created**: `src/views/ReportCard/utils/termFieldSeparation.js`
- **Purpose**: Separate term-specific fields (Report1/Report2) from shared fields
- **Key Functions**:
  - `getFieldTerm(fieldName)`: Identifies if a field belongs to Term 1, Term 2, or is shared
  - `separateTermFields(formData, term)`: Separates form data into term-specific and shared fields
  - `mergeTermFields(termData, sharedData, otherTermData)`: Merges term-specific and shared fields
  - `copyTerm1ToTerm2(term1FormData)`: Converts Term 1 fields to Term 2 equivalents

### Field Classification

#### Term 1 Fields (Report1)
Fields ending with "Report1" or containing "report1":
- `languageMarkReport1`
- `frenchListeningMarkReport1`
- `frenchSpeakingMarkReport1`
- `frenchReadingMarkReport1`
- `frenchWritingMarkReport1`
- `nativeLanguageMarkReport1`
- `mathMarkReport1`
- `scienceMarkReport1`
- `socialStudiesMarkReport1`
- `healthMarkReport1`
- `peMarkReport1`
- `danceMarkReport1`
- `dramaMarkReport1`
- `musicMarkReport1`
- `visualArtsMarkReport1`
- `otherMarkReport1`
- All other fields ending with "Report1"

#### Term 2 Fields (Report2)
Fields ending with "Report2" or containing "report2":
- `languageMarkReport2`
- `frenchListeningMarkReport2`
- `frenchSpeakingMarkReport2`
- `frenchReadingMarkReport2`
- `frenchWritingMarkReport2`
- `nativeLanguageMarkReport2`
- `mathMarkReport2`
- `scienceMarkReport2`
- `socialStudiesMarkReport2`
- `healthMarkReport2`
- `peMarkReport2`
- `danceMarkReport2`
- `dramaMarkReport2`
- `musicMarkReport2`
- `visualArtsMarkReport2`
- `otherMarkReport2`
- All other fields ending with "Report2"

#### Shared Fields (Available in Both Terms)
All fields that are NOT term-specific:
- **Student Information**: `student`, `student_name`, `studentId`, `OEN`, `oen`, `grade`
- **School Information**: `school`, `schoolAddress`, `board`, `boardAddress`, `principal`, `telephone`, `boardInfo`
- **Attendance**: `daysAbsent`, `totalDaysAbsent`, `timesLate`, `totalTimesLate`
- **Learning Skills**: `responsibility1`, `responsibility2`, `organization1`, `organization2`, etc. (Note: These numbered fields are for different reporting periods, not terms)
- **Comments**: All "StrengthAndNextSteps" fields, subject comment fields
- **Accommodations**: All ESL/IEP/NA/French checkboxes
- **Signatures**: `teacherSignature`, `principalSignature`
- **Other**: `date`, `teacher`, `teacher_name`, `frenchCore`, `danceNA`, `dramaNA`, `musicNA`, etc.

## Report Card Types & Term Support

### Formal Report Cards (Term-Specific Fields Apply)
1. **1-6 Elementary Report** (`1-6-elementary-report`)
   - Has Report1 and Report2 mark fields
   - Term separation applies

2. **7-8 Elementary Report** (`7-8-elementary-report`)
   - Has Report1 and Report2 mark fields
   - Term separation applies

### Progress Reports (No Term-Specific Fields)
1. **Kindergarten Initial Observations** (`kg-initial-observations`)
   - No Report1/Report2 fields
   - All fields are shared (single term)

2. **1-6 Progress Report** (`1-6-progress`)
   - Has numbered fields (1, 2) but these are for different reporting periods within the same term
   - No Report1/Report2 fields
   - All fields are shared

3. **7-8 Progress Report** (`7-8-progress`)
   - Has numbered fields (1, 2) but these are for different reporting periods within the same term
   - No Report1/Report2 fields
   - All fields are shared

4. **Kindergarten Report** (`kg-report`)
   - No Report1/Report2 fields
   - All fields are shared

## Implementation Details

### Save Logic
- When saving Term 1: Saves Term 1 fields + shared fields
- When saving Term 2: Saves Term 2 fields + shared fields
- Each term saves to a separate document: `{uid}_{studentId}_{reportType}_{term}`

### Load Logic
- When loading Term 1: Loads Term 1 fields + shared fields
- When loading Term 2: Loads Term 2 fields + shared fields
- If Term 2 doesn't exist, copies shared fields from Term 1 and converts Term 1 fields to Term 2 equivalents

### Term Switching
- Switching from Term 1 to Term 2:
  - If Term 2 draft exists: Loads Term 2 draft
  - If Term 2 draft doesn't exist: Copies Term 1 data, converts Report1 fields to Report2 fields
  - Preserves shared fields

## Recommendations & Potential Issues

### 1. Progress Reports with Numbered Fields
**Issue**: Progress reports have numbered fields (e.g., `responsibility1`, `responsibility2`) which are NOT term-specific but represent different reporting periods.

**Recommendation**: 
- These fields should remain shared (not term-specific)
- Current implementation correctly treats them as shared fields
- No changes needed

### 2. Learning Skills Fields
**Issue**: Learning skills fields in progress reports use numbers (1, 2) which might be confused with Report1/Report2.

**Recommendation**:
- Current implementation correctly identifies these as shared fields
- The `getFieldTerm` function specifically looks for "report1" or "report2" (case-insensitive)
- Fields like `responsibility1` are correctly identified as shared (not term-specific)

### 3. Mark Fields
**Status**: ✅ All mark fields are now text boxes (not dropdowns)
- Verified in `Elementary1to6ReportUI.js` and `Elementary7to8ReportUI.js`
- Uses `CFormInput` with `type="text"`

### 4. Character Limits
**Status**: ✅ Character limits are implemented
- General: 2000 characters
- Subject Area: 1000 characters
- Other: 500 characters
- KG Obs: 1500 characters
- Implemented in `characterLimits.js` utility

### 5. Placement Autofill (Term 2 Only)
**Status**: ✅ Implemented
- Only autofills when Term 2 is active
- SK → Grade 1
- JK → KG Year 2
- Does not overwrite user edits

### 6. Term 2 Document Separation
**Status**: ✅ Verified
- Term 2 saves to separate document: `{uid}_{studentId}_{reportType}_term2`
- Term 1 saves to: `{uid}_{studentId}_{reportType}_term1`
- Documents are completely independent

## Testing Checklist

- [ ] Save Term 1 data, switch to Term 2, verify Term 1 data is preserved
- [ ] Save Term 2 data, switch to Term 1, verify Term 2 data is preserved
- [ ] Edit shared fields in Term 1, switch to Term 2, verify shared fields are updated
- [ ] Edit Term 1 specific fields, switch to Term 2, verify Term 1 fields are not affected
- [ ] Create Term 2 from Term 1, verify Report1 fields are converted to Report2
- [ ] Verify mark fields are text boxes (not dropdowns)
- [ ] Verify character limits are enforced
- [ ] Test with progress reports (should work normally, no term separation)

## Files Modified

1. `src/views/ReportCard/utils.js`
   - Updated `saveDraft()` to separate term-specific fields
   - Updated `loadExistingDraft()` to merge term-specific fields
   - Updated Term 2 copy logic to use `copyTerm1ToTerm2()`

2. `src/views/ReportCard/utils/termFieldSeparation.js` (NEW)
   - Utility functions for term field separation

3. `src/views/ReportCard/Components/Elementary1to6ReportUI.js`
   - Mark fields are text boxes ✅

4. `src/views/ReportCard/Components/Elementary7to8ReportUI.js`
   - Mark fields are text boxes ✅

## Next Steps

1. **Testing**: Comprehensive testing of term switching, saving, and loading
2. **User Training**: Ensure teachers understand:
   - Term 1 and Term 2 are separate
   - Shared fields (comments, student info) are editable in both terms
   - Term-specific fields (marks) are separate per term
3. **Documentation**: Update user documentation to explain term functionality

