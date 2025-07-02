// Google Sheets Service for handling Google Sheets API interactions
import { initializeGoogleApi, initializeGIS, authenticate, isAuthenticated } from './calendarService'

// Google Sheets API configuration
const SHEETS_DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4'
const DRIVE_DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'

/**
 * Initialize Google Sheets API
 */
export const initializeSheetsApi = async () => {
  try {
    // First initialize the base Google API (reusing from calendar service)
    await initializeGoogleApi()
    await initializeGIS()
    
    // Load the additional discovery documents for Sheets and Drive
    await gapi.client.load(SHEETS_DISCOVERY_DOC)
    await gapi.client.load(DRIVE_DISCOVERY_DOC)
    
    console.log('Google Sheets API initialized successfully')
    return true
  } catch (error) {
    console.error('Error initializing Google Sheets API:', error)
    throw error
  }
}

/**
 * Check if user is authenticated for Google Sheets operations
 */
export const isSheetsAuthenticated = () => {
  return isAuthenticated()
}

/**
 * Authenticate user for Google Sheets operations
 */
export const authenticateSheets = async () => {
  try {
    return await authenticate()
  } catch (error) {
    console.error('Error authenticating for Google Sheets:', error)
    throw error
  }
}

/**
 * Create a blank spreadsheet in user's Google Drive
 * @param {string} title - The title for the new spreadsheet
 * @param {Array} headers - Optional array of headers for the first row
 * @returns {Object} - Object containing spreadsheet ID and URL
 */
export const createBlankSpreadsheet = async (title = 'Attendance Export', headers = []) => {
  try {
    if (!isSheetsAuthenticated()) {
      throw new Error('User not authenticated for Google Sheets')
    }

    // Create a new spreadsheet using the simpler API structure
    const response = await gapi.client.sheets.spreadsheets.create({
      properties: {
        title: title,
      },
    })

    const spreadsheetId = response.result.spreadsheetId
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`

    console.log(`Blank spreadsheet created: ${spreadsheetUrl}`)
    console.log('Spreadsheet ID: ' + spreadsheetId)

    // If headers are provided, add them to the first row
    if (headers && headers.length > 0) {
      await addHeadersToSpreadsheet(spreadsheetId, headers)
    }
    
    return {
      spreadsheetId,
      spreadsheetUrl,
      title,
    }
  } catch (error) {
    console.error('Error creating blank spreadsheet:', error)
    throw error
  }
}

/**
 * Add headers to the first row of a spreadsheet
 * @param {string} spreadsheetId - The ID of the spreadsheet
 * @param {Array} headers - Array of header strings
 */
const addHeadersToSpreadsheet = async (spreadsheetId, headers) => {
  try {
    const range = 'A1:' + String.fromCharCode(64 + headers.length) + '1' // A1:E1 for 5 headers, etc.
    
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: range,
      valueInputOption: 'RAW',
      resource: {
        values: [headers],
      },
    })

    // Format the header row (bold, background color)
    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: headers.length,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true,
                  },
                  backgroundColor: {
                    red: 0.9,
                    green: 0.9,
                    blue: 0.9,
                  },
                },
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor)',
            },
          },
        ],
      },
    })

    console.log('Headers added to spreadsheet')
  } catch (error) {
    console.error('Error adding headers to spreadsheet:', error)
    throw error
  }
}

/**
 * Export attendance data to Google Sheets
 * @param {Array} attendanceData - Array of attendance records
 * @param {Object} reportParams - Report parameters for naming and filtering
 * @returns {Object} - Object containing spreadsheet ID and URL
 */
export const exportAttendanceToSheets = async (attendanceData, reportParams = {}) => {
  try {
    if (!isSheetsAuthenticated()) {
      await authenticateSheets()
    }

    // Generate a descriptive title
    const timestamp = new Date().toLocaleDateString()
    const semester = reportParams.semester ? ` - ${reportParams.semester}` : ''
    const section = reportParams.section ? ` - ${reportParams.section}` : ''
    const title = `Attendance Report${semester}${section} - ${timestamp}`

    // Define headers
    const headers = ['Date', 'Semester', 'Section', 'Class', 'Student', 'Status', 'Note']

    // Create the spreadsheet with headers
    const result = await createBlankSpreadsheet(title, headers)

    // If there's data, add it to the spreadsheet
    if (attendanceData && attendanceData.length > 0) {
      await addDataToSpreadsheet(result.spreadsheetId, attendanceData)
    }

    return result
  } catch (error) {
    console.error('Error exporting attendance to Google Sheets:', error)
    throw error
  }
}

/**
 * Add attendance data to an existing spreadsheet
 * @param {string} spreadsheetId - The ID of the spreadsheet
 * @param {Array} attendanceData - Array of attendance records
 */
const addDataToSpreadsheet = async (spreadsheetId, attendanceData) => {
  try {
    // Convert attendance data to rows
    const rows = attendanceData.map(record => [
      record.date || '',
      record.semester || '',
      record.section || '',
      record.class || '',
      record.student || '',
      record.status || '',
      record.note || '',
    ])

    // Add data starting from row 2 (after headers)
    const range = `A2:G${rows.length + 1}`
    
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: range,
      valueInputOption: 'RAW',
      resource: {
        values: rows,
      },
    })

    // Auto-resize columns for better readability
    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      resource: {
        requests: [
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 7,
              },
            },
          },
        ],
      },
    })

    console.log(`Added ${rows.length} rows of data to spreadsheet`)
  } catch (error) {
    console.error('Error adding data to spreadsheet:', error)
    throw error
  }
}

/**
 * Create a blank spreadsheet with custom structure for attendance tracking
 * @param {string} className - The name of the class
 * @param {Array} students - Array of student names
 * @param {Array} dates - Array of dates for attendance tracking
 * @returns {Object} - Object containing spreadsheet ID and URL
 */
export const createAttendanceTemplate = async (className, students = [], dates = []) => {
  try {
    if (!isSheetsAuthenticated()) {
      await authenticateSheets()
    }

    const title = `${className} - Attendance Template - ${new Date().toLocaleDateString()}`
    
    // Create headers: Student Name, then dates
    const headers = ['Student Name', ...dates.map(date => new Date(date).toLocaleDateString())]
    
    const result = await createBlankSpreadsheet(title, headers)
    
    // Add student names in the first column
    if (students.length > 0) {
      const studentRows = students.map(student => [student])
      const range = `A2:A${students.length + 1}`
      
      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: result.spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        resource: {
          values: studentRows,
        },
      })
    }

    return result
  } catch (error) {
    console.error('Error creating attendance template:', error)
    throw error
  }
}

export default {
  initializeSheetsApi,
  isSheetsAuthenticated,
  authenticateSheets,
  createBlankSpreadsheet,
  exportAttendanceToSheets,
  createAttendanceTemplate,
} 