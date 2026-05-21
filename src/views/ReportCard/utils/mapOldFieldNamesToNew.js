/**
 * Map old field names to new field names for backward compatibility.
 */
export const mapOldFieldNamesToNew = (formData, reportType) => {
  if (!formData || typeof formData !== 'object') {
    return formData
  }

  const mappedData = { ...formData }
  let hasMappings = false

  // Map old attendance field names to new camelCase names
  if (mappedData.days_absent !== undefined && mappedData.daysAbsent === undefined) {
    mappedData.daysAbsent = mappedData.days_absent
    delete mappedData.days_absent
    hasMappings = true
    console.log('🔄 Mapped old field: days_absent → daysAbsent')
  }
  if (mappedData.total_days_absent !== undefined && mappedData.totalDaysAbsent === undefined) {
    mappedData.totalDaysAbsent = mappedData.total_days_absent
    delete mappedData.total_days_absent
    hasMappings = true
    console.log('🔄 Mapped old field: total_days_absent → totalDaysAbsent')
  }
  if (mappedData.times_late !== undefined && mappedData.timesLate === undefined) {
    mappedData.timesLate = mappedData.times_late
    delete mappedData.times_late
    hasMappings = true
    console.log('🔄 Mapped old field: times_late → timesLate')
  }
  if (mappedData.total_times_late !== undefined && mappedData.totalTimesLate === undefined) {
    mappedData.totalTimesLate = mappedData.total_times_late
    delete mappedData.total_times_late
    hasMappings = true
    console.log('🔄 Mapped old field: total_times_late → totalTimesLate')
  }

  // Map old PE field to new combined Health & PE field
  if (mappedData.peStrengthAndNextStepsForImprovement) {
    // Only map if the new field doesn't already have a value
    if (!mappedData.healthAndPEStrengthsAndNextStepsForImprovement) {
      mappedData.healthAndPEStrengthsAndNextStepsForImprovement = mappedData.peStrengthAndNextStepsForImprovement
      hasMappings = true
      console.log('🔄 Mapped old field: peStrengthAndNextStepsForImprovement → healthAndPEStrengthsAndNextStepsForImprovement')
    }
    // Remove the old field after mapping
    delete mappedData.peStrengthAndNextStepsForImprovement
  }

  // Language comment field variations (Steps vs NextSteps)
  if (mappedData.languageStrengthsAndStepsForImprovement && !mappedData.languageStrengthsAndNextStepsForImprovement) {
    mappedData.languageStrengthsAndNextStepsForImprovement = mappedData.languageStrengthsAndStepsForImprovement
    hasMappings = true
    console.log('🔄 Mapped field: languageStrengthsAndStepsForImprovement → languageStrengthsAndNextStepsForImprovement')
  }
  if (mappedData.languageStrengthsAndNextStepsForImprovement && !mappedData.languageStrengthsAndStepsForImprovement) {
    mappedData.languageStrengthsAndStepsForImprovement = mappedData.languageStrengthsAndNextStepsForImprovement
    hasMappings = true
    console.log('🔄 Mapped field: languageStrengthsAndNextStepsForImprovement → languageStrengthsAndStepsForImprovement')
  }

  // Native Language comment field variations (Steps vs NextSteps)
  if (mappedData.nativeLanguageStrengthsAndStepsForImprovement && !mappedData.nativeLanguageStrengthsAndNextStepsForImprovement) {
    mappedData.nativeLanguageStrengthsAndNextStepsForImprovement = mappedData.nativeLanguageStrengthsAndStepsForImprovement
    hasMappings = true
    console.log('🔄 Mapped field: nativeLanguageStrengthsAndStepsForImprovement → nativeLanguageStrengthsAndNextStepsForImprovement')
  }
  if (mappedData.nativeLanguageStrengthsAndNextStepsForImprovement && !mappedData.nativeLanguageStrengthsAndStepsForImprovement) {
    mappedData.nativeLanguageStrengthsAndStepsForImprovement = mappedData.nativeLanguageStrengthsAndNextStepsForImprovement
    hasMappings = true
    console.log('🔄 Mapped field: nativeLanguageStrengthsAndNextStepsForImprovement → nativeLanguageStrengthsAndStepsForImprovement')
  }

  // French comment field variations (Strength vs Strengths) across 1-6 vs 7-8 report cards
  if (reportType === '1-6-report-card') {
    if (mappedData.frenchStrengthsAndNextStepsForImprovement && !mappedData.frenchStrengthAndNextStepsForImprovement) {
      mappedData.frenchStrengthAndNextStepsForImprovement = mappedData.frenchStrengthsAndNextStepsForImprovement
      delete mappedData.frenchStrengthsAndNextStepsForImprovement
      hasMappings = true
      console.log('🔄 Mapped field: frenchStrengthsAndNextStepsForImprovement → frenchStrengthAndNextStepsForImprovement')
    }
  } else if (reportType === '7-8-report-card') {
    if (mappedData.frenchStrengthAndNextStepsForImprovement && !mappedData.frenchStrengthsAndNextStepsForImprovement) {
      mappedData.frenchStrengthsAndNextStepsForImprovement = mappedData.frenchStrengthAndNextStepsForImprovement
      delete mappedData.frenchStrengthAndNextStepsForImprovement
      hasMappings = true
      console.log('🔄 Mapped field: frenchStrengthAndNextStepsForImprovement → frenchStrengthsAndNextStepsForImprovement')
    }

    // The Grade 7-8 PDF's Islamic Studies Term 2 mark slot is named
    // otherMedianReport2 in the PDF, while older UI code saved otherMarkReport2.
    if (mappedData.otherMarkReport2 !== undefined) {
      if (mappedData.otherMedianReport2 === undefined || mappedData.otherMedianReport2 === '') {
        mappedData.otherMedianReport2 = mappedData.otherMarkReport2
      }
      delete mappedData.otherMarkReport2
      hasMappings = true
      console.log('🔄 Mapped field: otherMarkReport2 → otherMedianReport2')
    }
  }

  // Map old Visual Arts field to new combined Arts field
  if (mappedData.visualArtsStrengthAndNextStepsForImprovement) {
    // Determine the correct new field name based on report type
    const newArtsFieldName = reportType === '7-8-report-card' 
      ? 'artsStrengthsAndNextStepsForImprovement' 
      : 'artsStrengthAndNextStepsForImprovement'
    
    // Only map if the new field doesn't already have a value
    if (!mappedData[newArtsFieldName]) {
      mappedData[newArtsFieldName] = mappedData.visualArtsStrengthAndNextStepsForImprovement
      hasMappings = true
      console.log(`🔄 Mapped old field: visualArtsStrengthAndNextStepsForImprovement → ${newArtsFieldName}`)
    }
    // Remove the old field after mapping
    delete mappedData.visualArtsStrengthAndNextStepsForImprovement
  }

  if (hasMappings) {
    console.log('✅ Applied field name mappings for backward compatibility')
  }

  return mappedData
}
