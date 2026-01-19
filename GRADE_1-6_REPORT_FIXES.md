# Grade 1-6 Report Card Fixes

## Issues Fixed

### 1. Health Education and Physical Education Comments Not Showing in PDF

**Problem**: Teachers' comments in Health Education and Physical Education text boxes appeared in the right comment section but not in the live PDF view.

**Root Cause**: The UI was saving comments to separate fields (`healthEdStrengthAndNextStepsForImprovement` and `peStrengthAndNextStepsForImprovement`), but the PDF template expects a single combined field (`healthAndPEStrengthsAndNextStepsForImprovement`).

**Solution**: 
- Health Education and Physical Education now share the same comment field: `healthAndPEStrengthsAndNextStepsForImprovement`
- Both subjects display separately in the UI for entering accommodations and marks
- The comment field appears once after Physical Education with the label "Health and Physical Education - Strengths/Next Steps for Improvement"

### 2. Arts Comments (Dance, Drama, Music, Visual Arts) Not Showing in PDF

**Problem**: Teachers' comments in Arts subject text boxes (Dance, Drama, Music, Visual Arts) appeared in the right comment section but not in the live PDF view.

**Root Cause**: The UI was saving comments to separate fields for each art form (`danceStrengthAndNextStepsForImprovement`, `dramaStrengthAndNextStepsForImprovement`, `musicStrengthAndNextStepsForImprovement`, `visualArtsStrengthAndNextStepsForImprovement`), but the PDF template expects a single combined field (`artsStrengthAndNextStepsForImprovement`).

**Solution**:
- All Arts subjects (Dance, Drama, Music, Visual Arts) now share the same comment field: `artsStrengthAndNextStepsForImprovement`
- Each art form displays separately in the UI for entering accommodations and marks
- The comment field appears once after Visual Arts with the label "The Arts (Dance, Drama, Music, Visual Arts) - Strengths/Next Steps for Improvement"

### 3. Islamic Studies Label and Subject Name Field

**Problem**: 
- The subject was labeled as "Other" instead of "Islamic Studies"
- Islamic Studies showed up in the live PDF view but not in the comment section on the right
- There was no input field for teachers to specify or edit the subject name

**Root Cause**: 
- The UI label said "Other" which was confusing
- There was no auto-fill logic for the subject name field
- There was no input field to display/edit the subject name

**Solution**:
- Changed the section label from "Other" to "Islamic Studies"
- Added auto-fill logic to populate the `other` field with "Islamic Studies" by default
- Added a subject name input field so teachers can see and edit the subject name if needed
- The field correctly maps to `otherStrengthAndNextStepsForImprovement` for comments

## Technical Changes

### File Modified: `src/views/ReportCard/Components/Elementary1to6ReportUI.js`

1. **Added Auto-fill Logic** (lines ~668-689):
   - Added `useEffect` hook to auto-populate `nativeLanguage` with "Quran and Arabic Studies"
   - Added `useEffect` hook to auto-populate `other` with "Islamic Studies"

2. **Updated Health & PE Section** (lines ~764-778):
   - Kept as separate sections (Health Education and Physical Education)
   - Both use shared comment field: `healthAndPEStrengthsAndNextStepsForImprovement`
   - Health Education hides its comment field (`hideCommentField: true`)
   - Physical Education shows the combined comment field with custom label

3. **Updated Arts Sections** (lines ~780-810):
   - Kept as separate sections (Dance, Drama, Music, Visual Arts)
   - All use shared comment field: `artsStrengthAndNextStepsForImprovement`
   - Dance, Drama, and Music hide their comment fields (`hideCommentField: true`)
   - Visual Arts shows the combined comment field with custom label

4. **Updated Islamic Studies/Other Section** (lines ~812-819):
   - Changed name from "Other" to "Islamic Studies"
   - Added `showSubjectNameInput: true` flag
   - Uses correct comment field: `otherStrengthAndNextStepsForImprovement`

5. **Added Subject Name Input Field** (lines ~879-896):
   - Added conditional rendering for Islamic Studies subject name input
   - Input field displays and allows editing of the `other` field value
   - Defaults to "Islamic Studies"

6. **Updated Comment Field Rendering Logic** (lines ~1246-1269):
   - Added check for `hideCommentField` property to skip rendering
   - Added support for custom `showCommentFieldLabel` property
   - Falls back to default label format if no custom label provided

## Testing Checklist

- [ ] Health Education comments now appear in PDF
- [ ] Physical Education comments now appear in PDF (shared with Health Ed)
- [ ] Dance comments now appear in PDF (in Arts section)
- [ ] Drama comments now appear in PDF (in Arts section)
- [ ] Music comments now appear in PDF (in Arts section)
- [ ] Visual Arts comments now appear in PDF (in Arts section)
- [ ] Islamic Studies label displays correctly
- [ ] Islamic Studies subject name auto-fills with "Islamic Studies"
- [ ] Islamic Studies subject name can be edited by teachers
- [ ] Islamic Studies comments appear in both UI and PDF

## Notes

- All existing data should continue to work correctly
- The PDF field names remain unchanged - only the UI field mappings were corrected
- Teachers can now enter comments once for Health & PE combined
- Teachers can now enter comments once for all Arts subjects combined
- This aligns with the actual PDF template structure from the Ministry of Education

