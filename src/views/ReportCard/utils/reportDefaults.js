export const FORMAL_REPORT_DATE = '2026-06-25'

const FORMAL_REPORT_DATE_TYPES = new Set([
  'quran-report',
  '1-6-report-card',
  '7-8-report-card',
])

export const usesFixedFormalReportDate = (reportTypeId) =>
  FORMAL_REPORT_DATE_TYPES.has(reportTypeId)

export const getDefaultReportDate = (reportTypeId, reportCardDateSetting = '', today = '') => {
  if (usesFixedFormalReportDate(reportTypeId)) {
    return FORMAL_REPORT_DATE
  }

  return reportCardDateSetting || today
}

export const applyDefaultReportDate = (
  formData,
  reportTypeId,
  reportCardDateSetting = '',
  today = '',
) => {
  const defaultDate = getDefaultReportDate(reportTypeId, reportCardDateSetting, today)
  if (!defaultDate) return formData

  if (usesFixedFormalReportDate(reportTypeId)) {
    return formData.date === defaultDate ? formData : { ...formData, date: defaultDate }
  }

  if (!formData.date || `${formData.date}`.trim() === '') {
    return { ...formData, date: defaultDate }
  }

  return formData
}

export const getKindergartenDefaultsForGrade = (gradeValue) => {
  const grade = `${gradeValue || ''}`.toLowerCase()

  if (grade.includes('jk') || grade.includes('junior kindergarten') || grade.includes('year 1')) {
    return {
      year1: true,
      year2: false,
      placementInSeptemberKG2: true,
      placementInSeptemberGrade1: false,
    }
  }

  if (grade.includes('sk') || grade.includes('senior kindergarten') || grade.includes('year 2')) {
    return {
      year1: false,
      year2: true,
      placementInSeptemberKG2: false,
      placementInSeptemberGrade1: true,
    }
  }

  return {}
}

export const applyKindergartenDefaultsForGrade = (
  formData,
  { includePlacement = true, overwrite = true } = {},
) => {
  const defaults = getKindergartenDefaultsForGrade(formData.grade)
  if (Object.keys(defaults).length === 0) return formData

  const allowedDefaults = includePlacement
    ? defaults
    : {
        year1: defaults.year1,
        year2: defaults.year2,
      }

  const nextFormData = { ...formData }
  Object.entries(allowedDefaults).forEach(([key, value]) => {
    if (overwrite || nextFormData[key] === undefined || nextFormData[key] === '') {
      nextFormData[key] = value
    }
  })

  return nextFormData
}
