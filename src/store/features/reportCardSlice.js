import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  selectedSemester: null,
  selectedSection: null,
  selectedStudent: null,
  isLoading: false,
  recentReports: [
    { id: 1, student: 'Ahmed Khan', semester: 'Fall 2023', date: 'Dec 15, 2023' },
    { id: 2, student: 'Sara Ahmed', semester: 'Fall 2023', date: 'Dec 14, 2023' },
    { id: 3, student: 'Mohammad Ali', semester: 'Fall 2023', date: 'Dec 13, 2023' },
  ],
}

const reportCardSlice = createSlice({
  name: 'reportCard',
  initialState,
  reducers: {
    setSelectedSemester: (state, action) => {
      state.selectedSemester = action.payload
      state.selectedSection = null
      state.selectedStudent = null
    },
    setSelectedSection: (state, action) => {
      state.selectedSection = action.payload
      state.selectedStudent = null
    },
    setSelectedStudent: (state, action) => {
      state.selectedStudent = action.payload
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload
    },
    resetSelection: (state) => {
      state.selectedSemester = null
      state.selectedSection = null
      state.selectedStudent = null
    },
    addRecentReport: (state, action) => {
      state.recentReports.unshift(action.payload)
    },
  },
})

// Export actions
export const {
  setSelectedSemester,
  setSelectedSection,
  setSelectedStudent,
  setLoading,
  resetSelection,
  addRecentReport,
} = reportCardSlice.actions

// Export selectors with null checks
export const selectReportCardState = (state) => state?.reportCard || initialState
export const selectSelectedSemester = (state) => state?.reportCard?.selectedSemester ?? null
export const selectSelectedSection = (state) => state?.reportCard?.selectedSection ?? null
export const selectSelectedStudent = (state) => state?.reportCard?.selectedStudent ?? null
export const selectIsLoading = (state) => state?.reportCard?.isLoading ?? false
export const selectRecentReports = (state) => state?.reportCard?.recentReports ?? []

export default reportCardSlice.reducer
