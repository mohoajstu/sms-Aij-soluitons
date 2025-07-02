// Google Calendar Service for handling API interactions

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
const SCOPES =
  'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file'
const TOKEN_STORAGE_KEY = 'google_calendar_api_token' // This is our internal token storage
const SHARED_GOOGLE_AUTH_TOKEN_KEY = 'firebase_google_auth_token' // Token shared with Firebase auth

let tokenClient
let gapiInited = false
let gisInited = false

/**
 * Store token in localStorage
 * @param {object} token - The token to store
 */
const storeToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token))
  }
}

/**
 * Retrieve token from localStorage
 * @returns {object|null} The stored token or null
 */
const getStoredToken = () => {
  // Try to get the token from our storage
  const tokenStr = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (tokenStr) {
    try {
      return JSON.parse(tokenStr)
    } catch (e) {
      console.error('Error parsing stored token:', e)
    }
  }

  // If no token found, check if we have one from Firebase authentication
  const firebaseTokenStr = localStorage.getItem(SHARED_GOOGLE_AUTH_TOKEN_KEY)
  if (firebaseTokenStr) {
    try {
      const firebaseToken = JSON.parse(firebaseTokenStr)
      // Check if token is still valid
      if (firebaseToken.expiresAt && firebaseToken.expiresAt > Date.now()) {
        // Convert Firebase token format to gapi format
        const gapiToken = {
          access_token: firebaseToken.accessToken,
          expires_in: Math.floor((firebaseToken.expiresAt - Date.now()) / 1000),
        }

        // Also save it in our format for future use
        storeToken(gapiToken)

        return gapiToken
      }
    } catch (e) {
      console.error('Error parsing Firebase token:', e)
    }
  }

  return null
}

/**
 * Check if the user is already authenticated with Google
 * @returns {boolean} True if authenticated, false otherwise
 */
export const isAuthenticated = () => {
  try {
    return gapi.client.getToken() !== null
  } catch (e) {
    return false
  }
}

/**
 * Initialize the Google API client
 */
export const initializeGoogleApi = () => {
  return new Promise((resolve, reject) => {
    try {
      // Load Google API client
      gapi.load('client', async () => {
        try {
          await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
          })

          // Try to restore previously saved token
          const storedToken = getStoredToken()
          if (storedToken) {
            try {
              gapi.client.setToken(storedToken)
              console.log('Restored previous Google session')
            } catch (e) {
              console.warn('Could not restore previous session:', e)
            }
          }

          gapiInited = true
          resolve(true)
        } catch (error) {
          console.error('Error initializing Google API client:', error)
          reject(error)
        }
      })
    } catch (error) {
      console.error('Error loading GAPI client:', error)
      reject(error)
    }
  })
}

/**
 * Initialize Google Identity Services
 */
export const initializeGIS = () => {
  return new Promise((resolve) => {
    try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
        prompt: isAuthenticated() ? '' : 'consent', // Only show consent if not authenticated
      })
      gisInited = true
      resolve(true)
    } catch (error) {
      console.error('Error initializing GIS:', error)
      resolve(false)
    }
  })
}

/**
 * Check if Google APIs are initialized
 */
export const isInitialized = () => {
  return gapiInited && gisInited
}

/**
 * Authenticate the user with Google
 */
export const authenticate = () => {
  return new Promise((resolve, reject) => {
    if (!isInitialized()) {
      reject(new Error('Google APIs not initialized'))
      return
    }

    // If already authenticated, return success
    if (isAuthenticated()) {
      console.log('Already authenticated with Google')
      resolve(true)
      return
    }

    tokenClient.callback = async (resp) => {
      if (resp.error !== undefined) {
        console.error('Authentication error:', resp)
        reject(resp)
        return
      }
      // Store the token for future use
      storeToken(gapi.client.getToken())
      console.log('Successfully authenticated with Google')
      resolve(true)
    }

    try {
      if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent
        tokenClient.requestAccessToken()
      } else {
        // Skip display of account chooser and consent dialog for an existing session
        tokenClient.requestAccessToken({ prompt: '' })
      }
    } catch (error) {
      console.error('Error requesting access token:', error)
      reject(error)
    }
  })
}

/**
 * Sign out the user
 */
export const signOut = () => {
  try {
    const token = gapi.client.getToken()
    if (token !== null) {
      google.accounts.oauth2.revoke(token.access_token)
      gapi.client.setToken('')
      // Clear both token storage locations
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      localStorage.removeItem(SHARED_GOOGLE_AUTH_TOKEN_KEY)
      return true
    }
    return false
  } catch (error) {
    console.error('Error signing out:', error)
    return false
  }
}

// Add this wrapper function
const callGoogleApi = async (apiCallFunction) => {
  try {
    // Ensure GAPI client is loaded and initialized before making a call
    if (!gapi.client) {
      console.error('GAPI client not loaded.')
      throw { message: 'GAPI client not loaded.', reAuthRequired: false }
    }
    // It's assumed that initializeGoogleApi and initializeGIS have been called
    // and isInitialized() would be true if we reach here through a component.
    // However, an explicit token check before calling might be useful if isAuthenticated isn't perfect.
    // For now, we'll rely on catching the 401.

    return await apiCallFunction()
  } catch (error) {
    // Check for GAPI client specific error structure for 401 or UNAUTHENTICATED
    const gapiError = error.result && error.result.error
    const isAuthError =
      gapiError && (gapiError.code === 401 || gapiError.status === 'UNAUTHENTICATED')

    if (isAuthError) {
      console.warn(
        'Google API call failed due to authentication error. Clearing token and signaling re-auth.',
        error,
      )
      signOut() // Clear token and session details from gapi and localStorage
      throw {
        message: 'Authentication required. Please connect to Google Calendar again.',
        reAuthRequired: true,
        originalError: error,
      }
    }
    console.error('Google API call error:', error)
    // If it's not a known auth error structure, but status is 401, also treat as auth error.
    if (error.status === 401 || (error.code === 401 && !gapiError)) {
      console.warn('General 401 error. Clearing token and signaling re-auth.', error)
      signOut()
      throw {
        message: 'Authentication required. Please connect to Google Calendar again.',
        reAuthRequired: true,
        originalError: error,
      }
    }
    throw error // Re-throw other errors or errors that are not clearly auth related from this layer
  }
}

/**
 * Get events from a specific calendar
 * @param {string} calendarId - The ID of the calendar to fetch events from
 * @param {object} options - Additional options for fetching events
 */
export const getEvents = async (calendarId = 'primary', options = {}) => {
  if (!isInitialized()) {
    // This error should ideally be caught by the calling component's initial checks
    throw new Error('Google APIs not initialized for getEvents')
  }

  const defaultOptions = {
    timeMin: new Date().toISOString(),
    showDeleted: false,
    singleEvents: true,
    maxResults: 10, // Default, can be overridden by options
    orderBy: 'startTime',
  }

  const request = {
    calendarId,
    ...defaultOptions,
    ...options,
  }

  return callGoogleApi(async () => {
    const response = await gapi.client.calendar.events.list(request)
    return response.result.items
  })
}

/**
 * Create a new event on a calendar
 * @param {string} calendarId - The ID of the calendar to create an event on
 * @param {object} event - The event details
 */
export const createEvent = async (calendarId = 'primary', event) => {
  if (!isInitialized()) {
    throw new Error('Google APIs not initialized for createEvent')
  }

  return callGoogleApi(async () => {
    const response = await gapi.client.calendar.events.insert({
      calendarId,
      resource: event,
    })
    return response.result
  })
}

/**
 * Delete an event from a calendar
 * @param {string} calendarId - The ID of the calendar containing the event
 * @param {string} eventId - The ID of the event to delete
 */
export const deleteEvent = async (calendarId = 'primary', eventId) => {
  if (!isInitialized()) {
    throw new Error('Google APIs not initialized for deleteEvent')
  }

  return callGoogleApi(async () => {
    await gapi.client.calendar.events.delete({
      calendarId,
      eventId,
    })
    return true // Indicate success
  })
}

/**
 * Get the list of the user's calendars
 */
export const getCalendarList = async () => {
  if (!isInitialized()) {
    throw new Error('Google APIs not initialized for getCalendarList')
  }
  return callGoogleApi(async () => {
    const response = await gapi.client.calendar.calendarList.list()
    return response.result.items.map((calendar) => ({
      id: calendar.id,
      summary: calendar.summary,
      primary: calendar.primary || false,
      backgroundColor: calendar.backgroundColor,
    }))
  })
}

/**
 * Convert a course assignment to a Google Calendar event
 * @param {object} assignment - The assignment details
 * @param {object} course - The course details
 */
export const assignmentToEvent = (assignment, course) => {
  const deadlineDate = new Date(assignment.deadline)

  return {
    summary: `${course.title} - ${assignment.title} Due`,
    description: assignment.description,
    start: {
      dateTime: deadlineDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: new Date(deadlineDate.getTime() + 30 * 60000).toISOString(), // 30 minutes duration
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 60 }, // 1 hour before
      ],
    },
  }
}

/**
 * Convert Hijri date to Gregorian date
 * @param {number} year - Hijri year
 * @param {number} month - Hijri month (1-12)
 * @param {number} day - Hijri day
 * @returns {Date} - JavaScript Date object (Gregorian)
 */
export const hijriToGregorian = (year, month, day) => {
  // This is a simple approximation - for production use, consider using a proper Hijri calendar library
  const jd =
    Math.floor((11 * year + 3) / 30) +
    354 * year +
    30 * month -
    Math.floor((month - 1) / 2) +
    day +
    1948440 -
    385

  const l = jd + 68569
  const n = Math.floor((4 * l) / 146097)
  const l2 = l - Math.floor((146097 * n + 3) / 4)
  const i = Math.floor((4000 * (l2 + 1)) / 1461001)
  const l3 = l2 - Math.floor((1461 * i) / 4) + 31
  const j = Math.floor((80 * l3) / 2447)
  const day2 = l3 - Math.floor((2447 * j) / 80)
  const month2 = j + 2 - Math.floor((12 * (j + 1)) / 12)
  const year2 = 100 * (n - 49) + i + Math.floor(j / 11)

  return new Date(year2, month2 - 1, day2)
}

/**
 * Convert Gregorian date to Hijri date
 * @param {Date} date - JavaScript Date object (Gregorian)
 * @returns {object} - Hijri date { year, month, day }
 */
export const gregorianToHijri = (date) => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  // This is a simple approximation - for production use, consider using a proper Hijri calendar library
  const jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day - 1524.5

  const l = jd - 1948440 + 10632
  const n = Math.floor((l - 1) / 10631)
  const l2 = l - 10631 * n + 354
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238)
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29
  const month2 = Math.floor((24 * l3) / 709)
  const day2 = l3 - Math.floor((709 * month2) / 24)
  const year2 = 30 * n + j - 30

  return { year: year2, month: month2, day: day2 }
}

export default {
  initializeGoogleApi,
  initializeGIS,
  isInitialized,
  isAuthenticated,
  authenticate,
  signOut,
  getEvents,
  createEvent,
  deleteEvent,
  getCalendarList,
  assignmentToEvent,
  hijriToGregorian,
  gregorianToHijri,
}
