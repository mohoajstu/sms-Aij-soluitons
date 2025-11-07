# 🔧 CRITICAL FIX: Report Card Draft Loading Issue

## 📋 Problem Summary

**Current Behavior:**
- ✅ Drafts ARE being saved correctly to Firebase `reportCardDrafts` collection
- ✅ Preview shows all fields correctly in AdminReportCardReview
- ❌ When user clicks "Edit" or selects an existing student+report type, form loads BLANK
- ❌ Auto-save then overwrites the draft with empty data → **DATA LOSS**

**Root Cause:**
The `utils.js` ReportCard component has **NO logic to check Firebase** for existing drafts when a student + report type combination is selected. It only:
1. Loads from localStorage (for "Edit" button flow)
2. Auto-populates basic student info
3. Has no Firebase draft lookup

---

## 🎯 Solution Overview

Add a new `useEffect` hook that:
1. Checks Firebase for existing drafts when `selectedStudent` + `selectedReportCard` change
2. Loads draft data if found
3. Prevents auto-save from triggering during load
4. Works for BOTH "Edit" button clicks AND fresh student selections

---

## 📝 Implementation Steps

### STEP 1: Add Draft Loading State Variables

**File:** `/src/views/ReportCard/utils.js`

**Location:** After line 152 (after existing state declarations)

**Add these lines:**

```javascript
// Draft loading state
const [isLoadingDraft, setIsLoadingDraft] = useState(false)
const isLoadingDraftRef = useRef(false) // Synchronous guard
const [currentDraftId, setCurrentDraftId] = useState(null) // Track which draft is loaded
```

**Why:**
- `isLoadingDraft`: Async state for UI feedback
- `isLoadingDraftRef`: Synchronous ref to prevent race conditions
- `currentDraftId`: Track which draft document we're working with

---

### STEP 2: Create Draft Loading Function

**File:** `/src/views/ReportCard/utils.js`

**Location:** After line 283 (before the useEffect hooks)

**Add this function:**

```javascript
/**
 * Load existing draft from Firebase for the given student + report type
 * @param {Object} student - Selected student object
 * @param {string} reportType - Report card type ID
 */
const loadExistingDraft = async (student, reportType) => {
  if (!student || !reportType || !user) {
    console.log('⏭️ Skipping draft load - missing required data')
    return null
  }

  try {
    // Set loading flags IMMEDIATELY (synchronously)
    isLoadingDraftRef.current = true
    setIsLoadingDraft(true)

    console.log('🔍 Checking for existing draft:', {
      studentId: student.id,
      reportType: reportType,
    })

    // Step 1: Try deterministic ID first (studentId_reportType)
    const draftId = `${user.uid}_${student.id}_${reportType}`
    const draftRef = doc(firestore, 'reportCardDrafts', draftId)
    const draftSnap = await getDoc(draftRef)

    if (draftSnap.exists()) {
      const draftData = draftSnap.data()
      console.log('✅ Found existing draft:', {
        draftId: draftId,
        lastModified: draftData.lastModified?.toDate?.(),
        fieldCount: Object.keys(draftData.formData || {}).length,
      })

      // Hydrate form with draft data
      setFormData(draftData.formData || {})
      setCurrentDraftId(draftId)

      return draftData
    }

    // Step 2: Query for ANY draft with this student + report type (cross-teacher support)
    console.log('🔍 Step 2: Searching for drafts from ANY teacher...')
    const draftsQuery = query(
      collection(firestore, 'reportCardDrafts'),
      where('studentId', '==', student.id),
      where('reportCardType', '==', reportType)
    )
    const querySnapshot = await getDocs(draftsQuery)

    if (!querySnapshot.empty) {
      const existingDraft = querySnapshot.docs[0]
      const draftData = existingDraft.data()
      
      console.log('✅ Found draft from another teacher:', {
        draftId: existingDraft.id,
        originalTeacher: draftData.teacherName,
        lastModified: draftData.lastModified?.toDate?.(),
        fieldCount: Object.keys(draftData.formData || {}).length,
      })

      // Hydrate form with draft data
      setFormData(draftData.formData || {})
      setCurrentDraftId(existingDraft.id)

      return draftData
    }

    // Step 3: No draft found - return null (form will use auto-populated student data)
    console.log('📝 No existing draft found')
    setCurrentDraftId(null)
    return null

  } catch (error) {
    console.error('❌ Error loading draft:', error)
    return null
  } finally {
    // Clear loading flags after a short delay
    setTimeout(() => {
      setIsLoadingDraft(false)
      isLoadingDraftRef.current = false
    }, 300)
  }
}
```

**Why this works:**
- Checks for user's own draft first
- Falls back to ANY draft for that student+report (cross-teacher)
- Sets `currentDraftId` so saves update the correct document
- Uses both async state and sync ref for race condition protection

---

### STEP 3: Add Draft Loading useEffect

**File:** `/src/views/ReportCard/utils.js`

**Location:** Replace the existing useEffect at lines 285-359

**REPLACE:**
```javascript
// Ensure student data is preserved when switching report card types
useEffect(() => {
  if (selectedStudent && selectedReportCard) {
    // Re-apply student data to ensure it's available in all report card types
    const studentData = {
      student: selectedStudent.fullName,
      // ... rest of student data ...
    }

    // Merge with existing form data, preserving any user-entered data
    setFormData((prevData) => ({
      ...prevData,
      ...studentData,
      // ... rest of merging ...
    }))
  }
}, [selectedStudent, selectedReportCard])
```

**WITH:**
```javascript
// Load existing draft when student + report type changes
useEffect(() => {
  // Skip if either is not selected
  if (!selectedStudent || !selectedReportCard) {
    return
  }

  // Skip if we're currently loading from localStorage (Edit button flow)
  const isEditingDraft = localStorage.getItem('editingDraftId')
  if (isEditingDraft) {
    console.log('⏭️ Skipping Firebase draft load - loading from localStorage')
    return
  }

  // Skip if already loading a draft
  if (isLoadingDraftRef.current) {
    console.log('⏭️ Skipping draft load - already loading')
    return
  }

  // Load draft from Firebase
  const loadDraft = async () => {
    const existingDraft = await loadExistingDraft(selectedStudent, selectedReportCard)

    // If no draft found, populate with student basics
    if (!existingDraft) {
      console.log('📝 No draft found - populating with student data')
      const studentData = {
        // Basic student info
        student: selectedStudent.fullName,
        student_name: selectedStudent.fullName,
        studentId: selectedStudent.id,
        OEN: selectedStudent.schooling?.oen || selectedStudent.oen || selectedStudent.OEN || '',
        oen: selectedStudent.schooling?.oen || selectedStudent.oen || selectedStudent.OEN || '',
        grade: (() => {
          const gradeValue = selectedStudent.grade || selectedStudent.program || ''
          if (!gradeValue) return ''
          const match = gradeValue.toString().match(/\d+/)
          return match ? match[0] : gradeValue
        })(),

        // Attendance
        daysAbsent: selectedStudent.currentTermAbsenceCount || 0,
        totalDaysAbsent: selectedStudent.yearAbsenceCount || 0,
        timesLate: selectedStudent.currentTermLateCount || 0,
        totalTimesLate: selectedStudent.yearLateCount || 0,

        // Contact
        email: selectedStudent.email || '',
        phone1: selectedStudent.phone1 || '',
        phone2: selectedStudent.phone2 || '',
        emergencyPhone: selectedStudent.emergencyPhone || '',

        // Address
        address: selectedStudent.streetAddress || '',
        address_1: selectedStudent.streetAddress || '',
        address_2: selectedStudent.residentialArea || '',
        residentialArea: selectedStudent.residentialArea || '',
        poBox: selectedStudent.poBox || '',

        // Citizenship
        nationality: selectedStudent.nationality || '',
        nationalId: selectedStudent.nationalId || '',
        nationalIdExpiry: selectedStudent.nationalIdExpiry || '',

        // Language
        primaryLanguage: selectedStudent.primaryLanguage || '',
        secondaryLanguage: selectedStudent.secondaryLanguage || '',

        // Parents
        fatherName: selectedStudent.fatherName || '',
        motherName: selectedStudent.motherName || '',
        fatherId: selectedStudent.fatherId || '',
        motherId: selectedStudent.motherId || '',
        parent_name: selectedStudent.fatherName || selectedStudent.motherName || '',

        // Personal
        dob: selectedStudent.dob || '',
        gender: selectedStudent.gender || '',
        salutation: selectedStudent.salutation || '',
        nickName: selectedStudent.nickName || '',
        middleName: selectedStudent.middleName || '',

        // Schooling
        program: selectedStudent.program || '',
        daySchoolEmployer: selectedStudent.daySchoolEmployer || '',
        notes: selectedStudent.notes || '',
        returningStudentYear: selectedStudent.returningStudentYear || '',
        custodyDetails: selectedStudent.custodyDetails || '',
        primaryRole: selectedStudent.primaryRole || '',

        // School
        school: 'Tarbiyah Learning Academy',
        schoolAddress: '3990 Old Richmond Rd, Nepean, ON K2H 8W3',
        board: 'Tarbiyah Learning Academy',
        principal: 'Ghazala Choudhary',
        telephone: '613 421 1700',
        boardSpace: '',
        boardspace: '',

        // Preserve teacher if already set
        teacher: formData.teacher || '',
        teacher_name: formData.teacher_name || '',
      }

      setFormData(studentData)
    }
  }

  loadDraft()
}, [selectedStudent, selectedReportCard, user])
```

**Why this is critical:**
- Checks Firebase for existing drafts EVERY time student+report changes
- Skips if loading from localStorage (Edit button flow)
- Prevents duplicate loads with `isLoadingDraftRef`
- Falls back to student basics only if NO draft exists

---

### STEP 4: Protect handleFormDataChange

**File:** `/src/views/ReportCard/utils.js`

**Location:** Find the `handleFormDataChange` function (around line 362)

**REPLACE:**
```javascript
const handleFormDataChange = (newFormData) => {
  setFormData(newFormData)
}
```

**WITH:**
```javascript
const handleFormDataChange = (newFormData) => {
  // Don't trigger changes while loading draft
  if (isLoadingDraftRef.current) {
    console.log('⏸️ Ignoring form change - still loading draft')
    setFormData(newFormData) // Update state but don't trigger auto-save
    return
  }

  setFormData(newFormData)
  
  // Auto-save logic can go here if needed
  // (For now, manual save via saveDraft button)
}
```

**Why:**
- Prevents auto-save from triggering during draft load
- Still updates form state (for rendering)
- Protects against accidental data overwrites

---

### STEP 5: Update saveDraft Function

**File:** `/src/views/ReportCard/utils.js`

**Location:** Find the `saveDraft` function (around line 367)

**UPDATE the draftId line (around line 440):**

**CHANGE:**
```javascript
const draftId = `${user.uid}_${selectedStudent.id}_${selectedReportCard}`
```

**TO:**
```javascript
// Use existing draft ID if we loaded one, otherwise create new
const draftId = currentDraftId || `${user.uid}_${selectedStudent.id}_${selectedReportCard}`
```

**Also UPDATE the draft save logic (around line 448):**

**ADD after getting existingDoc:**
```javascript
if (existingDoc.exists()) {
  console.log('📝 Updating existing draft...')
  const existingData = existingDoc.data()
  
  // Preserve original creator info
  await updateDoc(draftRef, {
    ...draftData,
    createdAt: existingData.createdAt, // Preserve original creation date
    originalTeacherId: existingData.originalTeacherId || existingData.uid,
    originalTeacherName: existingData.originalTeacherName || existingData.teacherName,
    lastModified: serverTimestamp(),
  })
  setSaveMessage('Draft updated successfully!')
  console.log('✅ Draft updated successfully')
} else {
  console.log('📄 Creating new draft...')
  // Create new draft with original creator info
  await setDoc(draftRef, {
    ...draftData,
    originalTeacherId: user.uid,
    originalTeacherName: user.displayName || user.email,
  })
  setSaveMessage('Draft saved successfully!')
  console.log('✅ New draft created successfully')
}

// Update currentDraftId after save
setCurrentDraftId(draftId)
```

**Why:**
- Uses existing draft ID if we loaded a draft
- Preserves original creator information
- Updates currentDraftId for future saves

---

### STEP 6: Update localStorage Loading useEffect

**File:** `/src/views/ReportCard/utils.js`

**Location:** Find the localStorage loading useEffect (around line 500)

**UPDATE to set currentDraftId:**

**ADD after line 514 (after setSelectedStudent):**
```javascript
setFormData(parsedFormData)
setCurrentDraftId(editingDraftId) // ← ADD THIS LINE

// Clear the draft editing flags
localStorage.removeItem('editingDraftId')
```

**Why:**
- Ensures currentDraftId is set when loading from Edit button
- Prevents creating duplicate drafts on save

---

### STEP 7: Add Required Imports

**File:** `/src/views/ReportCard/utils.js`

**Location:** Top of file, in the Firestore imports section (around line 36)

**ENSURE these imports exist:**
```javascript
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  query,        // ← ADD if missing
  where,        // ← ADD if missing
  getDocs,      // ← ADD if missing
} from 'firebase/firestore'
```

---

### STEP 8: Add Firestore Index

**Location:** Firebase Console → Firestore Database → Indexes

**Create this composite index:**

```
Collection: reportCardDrafts

Fields:
- studentId (Ascending)
- reportCardType (Ascending)
```

**Why:**
- Required for the query in Step 2 (loading drafts by student + report type)
- Firebase will auto-suggest this index when the query first runs

**Alternative:** Just run the app, select a student, and Firebase will show you a link to auto-create the index.

---

## 🧪 Testing Checklist

### Test 1: Load Existing Draft (Edit Button)
```
1. Admin goes to "Review Report Cards"
2. Clicks "View" on a draft with data
3. Sees preview with all fields ✅
4. Clicks "Edit Report Card"
5. EXPECTED: Form loads with ALL fields populated ✅
6. Wait 5 seconds
7. EXPECTED: No auto-save (no changes made yet) ✅
8. Edit one field
9. Click "Save Draft"
10. EXPECTED: Draft updates successfully ✅
11. Refresh page and check Firebase
12. EXPECTED: Data is intact ✅
```

### Test 2: Select Student with Existing Draft
```
1. Go to "Create Report Card"
2. Select report type: "Grades 1-6 Progress"
3. Select student: "Noora Khan" (who has a draft)
4. EXPECTED: Form loads with ALL saved field data ✅
5. Check console logs for "✅ Found existing draft"
6. currentDraftId should be set
7. Edit a field and save
8. EXPECTED: Updates same draft (no duplicate) ✅
```

### Test 3: Select Student with NO Draft
```
1. Go to "Create Report Card"
2. Select report type
3. Select student with NO existing draft
4. EXPECTED: Form populates with basic student info only ✅
5. Check console logs for "📝 No draft found"
6. currentDraftId should be null
7. Fill some fields and save
8. EXPECTED: Creates new draft ✅
```

### Test 4: Cross-Teacher Draft Loading
```
1. Teacher A creates draft for Student X
2. Logout, login as Teacher B
3. Select Student X + same report type
4. EXPECTED: Loads Teacher A's draft ✅
5. Check console for "Found draft from another teacher"
6. Edit and save
7. Check Firebase: originalTeacherName = Teacher A, teacherName = Teacher B ✅
```

### Test 5: Race Condition Protection
```
1. Select student + report type
2. While draft is loading, quickly change student
3. EXPECTED: No errors, no data corruption ✅
4. isLoadingDraftRef should prevent duplicate loads
```

---

## 🚨 Common Issues & Debugging

### Issue: Form still loads blank

**Check:**
1. Console logs - do you see "🔍 Checking for existing draft"?
2. Is `isLoadingDraftRef.current` getting set to `true`?
3. Check Network tab - is Firestore query happening?
4. Check Firebase Console - does the draft document exist?
5. Are field names in Firebase matching expected keys?

**Console Commands to Debug:**
```javascript
// In browser console when form is loaded:
console.log('Current Draft ID:', currentDraftId)
console.log('Form Data Keys:', Object.keys(formData))
console.log('Is Loading:', isLoadingDraftRef.current)
```

### Issue: "Missing index" error

**Solution:**
Click the link in the error message to create the index automatically, OR create it manually in Firebase Console.

### Issue: Duplicate drafts being created

**Check:**
1. Is `currentDraftId` being set after loading?
2. Is `saveDraft` using `currentDraftId` or regenerating the ID?
3. Check line: `const draftId = currentDraftId || ...`

### Issue: Auto-save overwrites loaded data

**Check:**
1. Is `isLoadingDraftRef.current` being checked in `handleFormDataChange`?
2. Is the ref being reset to `false` after load completes?
3. Check timeout duration (should be at least 100-300ms)

---

## 📊 Expected Console Output

**When loading existing draft:**
```
🔍 Checking for existing draft: { studentId: "TS216230", reportType: "1-6-progress" }
✅ Found existing draft: { draftId: "Wxjic0..._TS216230_1-6-progress", lastModified: ..., fieldCount: 85 }
```

**When no draft exists:**
```
🔍 Checking for existing draft: { studentId: "TS999999", reportType: "7-8-progress" }
🔍 Step 2: Searching for drafts from ANY teacher...
📝 No draft found - populating with student data
```

**When clicking Edit:**
```
⏭️ Skipping Firebase draft load - loading from localStorage
✅ Loaded draft for editing: { reportType: "1-6-progress", student: "Noora Khan", formDataKeys: 85 }
```

---

## 📚 Code Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                     USER ACTIONS                             │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴────────────────┐
            │                                │
    ┌───────▼────────┐           ┌─────────▼──────────┐
    │ Click "Edit"   │           │ Select Student +   │
    │ Button         │           │ Report Type        │
    └───────┬────────┘           └─────────┬──────────┘
            │                                │
    ┌───────▼────────────┐         ┌────────▼───────────────┐
    │ Store in           │         │ Trigger useEffect      │
    │ localStorage       │         │ with selectedStudent   │
    └───────┬────────────┘         └────────┬───────────────┘
            │                                │
    ┌───────▼────────────────────────────────▼──────────────┐
    │         Load Draft from Firebase or localStorage      │
    │                                                        │
    │  1. Check if editing from localStorage                │
    │  2. If not, query Firebase for existing draft         │
    │  3. Set isLoadingDraftRef.current = true              │
    │  4. Hydrate formData with draft data                  │
    │  5. Set currentDraftId                                │
    │  6. Set isLoadingDraftRef.current = false             │
    └───────┬────────────────────────────────────────────────┘
            │
    ┌───────▼────────────────────────────────────────────────┐
    │              Form Rendered with Data                   │
    │                                                        │
    │  - All fields populated                                │
    │  - Auto-save protected by isLoadingDraftRef            │
    │  - Saves update currentDraftId document                │
    └────────────────────────────────────────────────────────┘
```

---

## 🎯 Success Criteria

✅ **Teachers can edit existing drafts without data loss**
✅ **Form loads with ALL saved data from Firebase**
✅ **Preview and Edit show same data**
✅ **Auto-save doesn't overwrite during load**
✅ **Cross-teacher draft access works**
✅ **No duplicate drafts are created**
✅ **Console logs show clear loading flow**

---

## 📞 Support

If you encounter issues:

1. **Check console logs** - All steps are logged with emojis for easy identification
2. **Check Firebase Console** - Verify draft document exists and has data
3. **Check Network tab** - Ensure Firestore queries are happening
4. **Share console output** - Include all logs from student selection through save

---

**Last Updated:** November 7, 2025
**Status:** Ready for Implementation ✅
**Estimated Time:** 2-3 hours (including testing)
**Priority:** CRITICAL 🔴

