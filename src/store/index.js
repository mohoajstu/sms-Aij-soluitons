import { configureStore } from '@reduxjs/toolkit'
import authReducer from './features/authSlice'
import reportCardReducer from './features/reportCardSlice'

// Import reducers here
// import authReducer from './features/authSlice'
// import userReducer from './features/userSlice'

const preloadedState = {
  reportCard: {
    selectedSemester: null,
    selectedSection: null,
    selectedStudent: null,
    isLoading: false,
    recentReports: [
      { id: 1, student: 'Ahmed Khan', semester: 'Fall 2023', date: 'Dec 15, 2023' },
      { id: 2, student: 'Sara Ahmed', semester: 'Fall 2023', date: 'Dec 14, 2023' },
      { id: 3, student: 'Mohammad Ali', semester: 'Fall 2023', date: 'Dec 13, 2023' },
    ],
  },
}

// Create the store with explicit initial state
const store = configureStore({
  reducer: {
    auth: authReducer,
    reportCard: reportCardReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})

// Log the initial state
console.log('Initial Redux State:', store.getState())

export default store
