/**
 * Shared field name mappings for all progress report PDFs
 * This ensures consistency between preview (PDFViewer) and export (downloadFilledPDF)
 * 
 * Generated from actual PDF field names extracted on 2025-11-18
 * Covers: KG Initial Observation, 1-6 Progress, 7-8 Progress
 */

export const generateFieldNameVariations = (formKey) => {
  if (!formKey) return []

  const variations = [formKey]

  // Comprehensive field mappings for ALL progress reports
  const exactFieldMappings = {
    // ============ BASIC INFORMATION ============
    // Common across all report types
    date: ['date', 'Date', 'DATE', 'data'], // Note: some PDFs have typo "data"
    student: ['student'],
    student_name: ['student', 'Student', 'studentName'], // Form uses student_name, PDF uses student
    grade: ['grade'],
    teacher: ['teacher'],
    teacher_name: ['teacher', 'Teacher', 'teacherName'], // Form uses teacher_name, PDF uses teacher
    OEN: ['OEN'],
    oen: ['OEN'], // Lowercase variation
    board: ['board'],
    school: ['school'],
    schoolAddress: ['schoolAddress'],
    school_address: ['schoolAddress'], // Form uses school_address, PDF uses schoolAddress
    boardAddress: ['boardAddress'],
    board_address: ['boardAddress'], // Form uses board_address, PDF uses boardAddress
    principal: [
      'principal',
      'Principal',
      'PRINCIPAL',
      'Principal:',
      'principal:',
      'PrincipalName',
      'principalName',
      'principle', // Typo in 7-8 progress PDF (this is the ONLY field for principal name)
      'Principle',
    ],
    // Handle the typo in 7-8 progress PDF where principal field is named "principle"
    principle: [
      'principle',
      'principal',
      'Principal',
      'Principle',
    ],
    telephone: ['telephone'],
    boardInfo: ['boardInfo'],
    boardSpace: ['boardSpace'],

    // ============ KG INITIAL OBSERVATION SPECIFIC ============
    earlyChildEducator: ['earlyChildEducator'],
    year1: ['year1'],
    year2: ['year2'],
    keyLearning: ['keyLearning'],
    keyLearning2: ['keyLearning2'],
    keyLearningESL: ['keyLearningESL'],
    keyLearningIEP: ['keyLearningIEP'],

    // ============ ATTENDANCE ============
    daysAbsent: ['daysAbsent'],
    days_absent: ['daysAbsent'], // Form uses days_absent, PDF uses daysAbsent
    totalDaysAbsent: ['totalDaysAbsent'],
    total_days_absent: ['totalDaysAbsent'], // Form uses total_days_absent, PDF uses totalDaysAbsent
    timesLate: ['timesLate'],
    times_late: ['timesLate'], // Form uses times_late, PDF uses timesLate
    totalTimesLate: ['totalTimesLate'],
    total_times_late: ['totalTimesLate'], // Form uses total_times_late, PDF uses totalTimesLate

    // ============ LEARNING SKILLS ============
    // 1-6 Progress uses numbered fields (responsibility1, responsibility2)
    // 7-8 Progress uses non-numbered fields (responsibility, organization)
    responsibility: ['responsibility'],
    responsibility1: ['responsibility1', 'responsibiity1'], // Handle typo
    responsibility2: ['responsibility2'],
    responsibiity1: ['responsibiity1', 'responsibility1'], // Handle typo
    organization: ['organization'],
    organization1: ['organization1'],
    organization2: ['organization2'],
    independentWork: ['independentWork'],
    independentWork1: ['independentWork1'],
    independentWork2: ['independentWork2'],
    collaboration: ['collaboration'],
    collaboration1: ['collaboration1'],
    collaboration2: ['collaboration2'],
    initiative: ['initiative'],
    initiative1: ['initiative1'],
    initiative2: ['initiative2'],
    selfRegulation: ['selfRegulation'],
    selfRegulation1: ['selfRegulation1'],
    selfRegulation2: ['selfRegulation2'],

    // Learning Skills Comments (sans fields)
    sansResponsibility: ['sansResponsibility', 'sansresponsibility'],
    sansOrganization: ['sansOrganization', 'sansorganization'],
    sansIndependentWork: ['sansIndependentWork', 'sansindependentwork'],
    sansCollaboration: ['sansCollaboration', 'sanscollaboration'],
    sansInitiative: ['sansInitiative', 'sansinitiative'],
    sansSelfRegulation: ['sansSelfRegulation', 'sansselfregulation'],

    // ============ LANGUAGE ============
    // Performance levels
    languageWithDifficulty: ['languageWithDifficulty'],
    languageWell: ['languageWell'],
    languageVeryWell: ['languageVeryWell'],
    // Support programs
    languageESL: ['languageESL', 'Language Esl', 'Language ESL'],
    languageIEP: ['languageIEP', 'Language Iep', 'Language IEP'],
    languageNA: ['languageNA', 'Language Na', 'Language NA'],
    // Comments
    sans2Language: ['sans2Language', 'sans2language'],

    // ============ FRENCH ============
    // Performance levels
    frenchWithDifficulty: ['frenchWithDifficulty'],
    frenchWell: ['frenchWell'],
    frenchVeryWell: ['frenchVeryWell'],
    // Support programs
    frenchESL: ['frenchESL', 'French Esl'],
    frenchIEP: ['frenchIEP', 'French Iep'],
    frenchNA: ['frenchNA', 'French Na'],
    frenchCore: ['frenchCore', 'French Core'],
    frenchImmersion: ['frenchImmersion', 'French Immersion'],
    frenchExtended: ['frenchExtended', 'French Extended'],
    // Comments
    sans2French: ['sans2French', 'sans2french'],

    // ============ NATIVE LANGUAGE ============
    nativeLanguage: ['nativeLanguage'],
    nativeLanguageWithDifficulty: ['nativeLanguageWithDifficulty'],
    nativeLanguageWell: ['nativeLanguageWell'],
    nativeLanguageVeryWell: ['nativeLanguageVeryWell'],
    nativeLanguageESL: ['nativeLanguageESL', 'Native Language Esl'],
    nativeLanguageIEP: ['nativeLanguageIEP', 'Native Language Iep'],
    nativeLanguageNA: ['nativeLanguageNA', 'Native Language Na'],
    sans2NativeLanguage: ['sans2NativeLanguage', 'sans2nativelanguage'],

    // ============ MATH ============
    mathWithDifficulty: ['mathWithDifficulty'],
    mathWell: ['mathWell'],
    mathVeryWell: ['mathVeryWell'],
    mathESL: ['mathESL', 'Math Esl'],
    mathIEP: ['mathIEP', 'Math Iep'],
    mathFrench: ['mathFrench', 'Math French'],
    sans2Math: ['sans2Math', 'sans2math'],

    // ============ SCIENCE ============
    scienceWithDifficulty: ['scienceWithDifficulty'],
    scienceWell: ['scienceWell'],
    scienceVeryWell: ['scienceVeryWell'],
    scienceESL: ['scienceESL', 'Science Esl'],
    scienceIEP: ['scienceIEP', 'Science Iep'],
    scienceFrench: ['scienceFrench', 'Science French'],
    sans2Science: ['sans2Science', 'sans2science'],

    // ============ SOCIAL STUDIES ============
    socialWithDifficulty: ['socialWithDifficulty'],
    socialStudiesWell: ['socialStudiesWell'],
    socialStudiesVeryWell: ['socialStudiesVeryWell'],
    socialStudiesESL: ['socialStudiesESL', 'Social Studies Esl'],
    socialStudiesIEP: ['socialStudiesIEP', 'Social Studies Iep'],
    socialStudiesFrench: ['socialStudiesFrench', 'Social Studies French'],
    sans2SocialStudies: ['sans2SocialStudies', 'sans2socialstudies'],

    // ============ HISTORY (7-8 ONLY) ============
    historyWithDifficulty: ['historyWithDifficulty'],
    historyWell: ['historyWell'],
    historyVeryWell: ['historyVeryWell'],
    historyESL: ['historyESL', 'History Esl'],
    historyIEP: ['historyIEP', 'History Iep'],
    historyNA: ['historyNA', 'History Na'],
    historyFrench: ['historyFrench', 'History French'],
    sans2History: ['sans2History', 'sans2history'],

    // ============ GEOGRAPHY (7-8 ONLY) ============
    geographyWithDifficulty: ['geographyWithDifficulty'],
    geographyWell: ['geographyWell'],
    geographyVeryWell: ['geographyVeryWell'],
    geographyESL: ['geographyESL', 'Geography Esl'],
    geographyIEP: ['geographyIEP', 'Geography Iep'],
    geographyNA: ['geographyNA', 'Geography Na'],
    geographyFrench: ['geographyFrench', 'Geography French'],
    sans2Geography: ['sans2Geography', 'sans2geography'],

    // ============ HEALTH EDUCATION ============
    healthEdWithDifficulty: ['healthEdWithDifficulty'],
    healthEdWell: ['healthEdWell'],
    healthEdVeryWell: ['healthEdVeryWell'],
    healthEdESL: ['healthEdESL', 'Health Ed Esl'],
    healthEdIEP: ['healthEdIEP', 'Health Ed Iep'],
    healthEdFrench: ['healthEdFrench', 'Health Ed French'],
    sans2HealthEd: ['sans2HealthEd', 'sans2healthed'],

    // ============ PHYSICAL EDUCATION ============
    peWithDifficulty: ['peWithDifficulty'],
    peWell: ['peWell'],
    peVeryWell: ['peVeryWell'],
    peESL: ['peESL', 'PE Esl'],
    peIEP: ['peIEP', 'PE Iep'],
    peIEL: ['peIEL', 'peIEP'], // Typo in 7-8 PDF
    peFrench: ['peFrench', 'PE French'],
    sans2PE: ['sans2PE', 'sans2pe'],

    // ============ DANCE ============
    danceWithDifficulty: ['danceWithDifficulty'],
    danceWell: ['danceWell'],
    danceVeryWell: ['danceVeryWell'],
    danceESL: ['danceESL', 'Dance Esl'],
    danceIEP: ['danceIEP', 'Dance Iep'],
    danceFrench: ['danceFrench', 'Dance French'],
    danceNA: ['danceNA', 'Dance Na'],
    sans2Dance: ['sans2Dance', 'sans2dance'],

    // ============ DRAMA ============
    dramaWithDifficulty: ['dramaWithDifficulty'],
    dramaWell: ['dramaWell'],
    dramaVeryWell: ['dramaVeryWell'],
    dramaESL: ['dramaESL', 'Drama Esl'],
    dramaIEP: ['dramaIEP', 'Drama Iep'],
    dramaFrench: ['dramaFrench', 'Drama French'],
    dramaNA: ['dramaNA', 'Drama Na'],
    sans2Drama: ['sans2Drama', 'sans2drama'],

    // ============ MUSIC ============
    musicWithDifficulty: ['musicWithDifficulty'],
    musicWell: ['musicWell'],
    musicVeryWell: ['musicVeryWell'],
    musicESL: ['musicESL', 'Music Esl'],
    musicIEP: ['musicIEP', 'Music Iep'],
    musicFrench: ['musicFrench', 'Music French'],
    musicNA: ['musicNA', 'Music Na'],
    sans2Music: ['sans2Music', 'sans2music'],

    // ============ VISUAL ARTS ============
    visualArtsWithDifficulty: ['visualArtsWithDifficulty'],
    visualArtsWell: ['visualArtsWell'],
    visualArtsVeryWell: ['visualArtsVeryWell'],
    visualArtsESL: ['visualArtsESL', 'Visual Arts Esl'],
    visualArtsIEP: ['visualArtsIEP', 'Visual Arts Iep'],
    visualArtsFrench: ['visualArtsFrench', 'Visual Arts French'],
    visualArtsNA: ['visualArtsNA', 'Visual Arts Na'],
    sans2VisualArts: ['sans2VisualArts', 'sans2visualarts'],

    // ============ OTHER SUBJECT ============
    other: ['other'],
    otherSubjectName: ['other'], // UI uses otherSubjectName, PDF uses 'other'
    otherWithDifficulty: ['otherWithDifficulty'],
    otherWell: ['otherWell'],
    otherVeryWell: ['otherVeryWell'],
    otherESL: ['otherESL', 'Other Esl'],
    otherIEP: ['otherIEP', 'Other Iep'],
    otherFrench: ['otherFrench', 'Other French'],
    otherNA: ['otherNA', 'Other Na'],
    sans2Other: ['sans2Other', 'sans2other'],

    // ============ SIGNATURES ============
    teacherSignature: [
      'teacherSignature',
      "Teacher's Signature",
      'Teacher Signature',
      'Text_1', // For 1-6 progress report and 7-8 report card
      'Signature_1', // For 7-8 report card (alternate)
    ],
    principalSignature: [
      'principalSignature',
      "Principal's Signature",
      'Principal Signature',
      'Number_1', // For 1-6 progress report
      'principleSignature', // Typo in 7-8 report card
    ],

    // Handle lowercase variations
    teachersignature: [
      'teacherSignature',
      "Teacher's Signature",
      'Teacher Signature',
      'Text_1', // For 1-6 progress report and 7-8 report card
      'Signature_1', // For 7-8 report card (alternate)
    ],
    principalsignature: [
      'principalSignature',
      "Principal's Signature",
      'Principal Signature',
      'Number_1', // For 1-6 progress report
      'principleSignature', // Typo in 7-8 report card
    ],

    // ============ ADDITIONAL MAPPINGS FOR FORM DATA KEYS ============
    // These handle common variations in form data key names
    languageesl: ['languageESL', 'Language Esl'],
    languageiep: ['languageIEP', 'Language Iep'],
    languagena: ['languageNA', 'Language Na'],
    frenchesl: ['frenchESL', 'French Esl'],
    frenchiep: ['frenchIEP', 'French Iep'],
    frenchna: ['frenchNA', 'French Na'],
    nativelanguageesl: ['nativeLanguageESL', 'Native Language Esl'],
    nativelanguageiep: ['nativeLanguageIEP', 'Native Language Iep'],
    nativelanguagena: ['nativeLanguageNA', 'Native Language Na'],
    mathesl: ['mathESL', 'Math Esl'],
    mathiep: ['mathIEP', 'Math Iep'],
    mathfrench: ['mathFrench', 'Math French'],
    scienceesl: ['scienceESL', 'Science Esl'],
    scienceiep: ['scienceIEP', 'Science Iep'],
    sciencefrench: ['scienceFrench', 'Science French'],
    socialstudiesesl: ['socialStudiesESL', 'Social Studies Esl'],
    socialstudiesiep: ['socialStudiesIEP', 'Social Studies Iep'],
    socialstudiesfrench: ['socialStudiesFrench', 'Social Studies French'],
    healthedesl: ['healthEdESL', 'Health Ed Esl'],
    healthediep: ['healthEdIEP', 'Health Ed Iep'],
    healthedfrench: ['healthEdFrench', 'Health Ed French'],
    peesl: ['peESL', 'PE Esl'],
    peiep: ['peIEP', 'PE Iep', 'peIEL'], // Include typo
    pefrench: ['peFrench', 'PE French'],
    danceesl: ['danceESL', 'Dance Esl'],
    danceiep: ['danceIEP', 'Dance Iep'],
    dancefrench: ['danceFrench', 'Dance French'],
    dancena: ['danceNA', 'Dance Na'],
    dramaesl: ['dramaESL', 'Drama Esl'],
    dramaiep: ['dramaIEP', 'Drama Iep'],
    dramafrench: ['dramaFrench', 'Drama French'],
    dramana: ['dramaNA', 'Drama Na'],
    musicesl: ['musicESL', 'Music Esl'],
    musiciep: ['musicIEP', 'Music Iep'],
    musicfrench: ['musicFrench', 'Music French'],
    musicna: ['musicNA', 'Music Na'],
    visualartsesl: ['visualArtsESL', 'Visual Arts Esl'],
    visualartsiep: ['visualArtsIEP', 'Visual Arts Iep'],
    visualartsfrench: ['visualArtsFrench', 'Visual Arts French'],
    visualartsna: ['visualArtsNA', 'Visual Arts Na'],
    otheresl: ['otherESL', 'Other Esl'],
    otheriep: ['otherIEP', 'Other Iep'],
    otherfrench: ['otherFrench', 'Other French'],
    otherna: ['otherNA', 'Other Na'],

    // Performance level variations (lowercase)
    languagewithdifficulty: ['languageWithDifficulty', 'Language With Difficulty'],
    languagewell: ['languageWell', 'Language Well'],
    languageverywell: ['languageVeryWell', 'Language Very Well'],
    frenchwithdifficulty: ['frenchWithDifficulty', 'French With Difficulty'],
    frenchwell: ['frenchWell', 'French Well'],
    frenchverywell: ['frenchVeryWell', 'French Very Well'],
    nativelanguagewithdifficulty: ['nativeLanguageWithDifficulty', 'Native Language With Difficulty'],
    nativelanguagewell: ['nativeLanguageWell', 'Native Language Well'],
    nativelanguageverywell: ['nativeLanguageVeryWell', 'Native Language Very Well'],
    mathwithdifficulty: ['mathWithDifficulty', 'Math With Difficulty'],
    mathwell: ['mathWell', 'Math Well'],
    mathverywell: ['mathVeryWell', 'Math Very Well'],
    sciencewithdifficulty: ['scienceWithDifficulty', 'Science With Difficulty'],
    sciencewell: ['scienceWell', 'Science Well'],
    scienceverywell: ['scienceVeryWell', 'Science Very Well'],
    socialwithdifficulty: ['socialWithDifficulty', 'Social With Difficulty'],
    socialstudieswell: ['socialStudiesWell', 'Social Studies Well'],
    socialstudiesverywell: ['socialStudiesVeryWell', 'Social Studies Very Well'],
    historywithdifficulty: ['historyWithDifficulty', 'History With Difficulty'],
    historywell: ['historyWell', 'History Well'],
    historyverywell: ['historyVeryWell', 'History Very Well'],
    geographywithdifficulty: ['geographyWithDifficulty', 'Geography With Difficulty'],
    geographywell: ['geographyWell', 'Geography Well'],
    geographyverywell: ['geographyVeryWell', 'Geography Very Well'],
    healthedwithdifficulty: ['healthEdWithDifficulty', 'Health Ed With Difficulty'],
    healthedwell: ['healthEdWell', 'Health Ed Well'],
    healthedverywell: ['healthEdVeryWell', 'Health Ed Very Well'],
    pewithdifficulty: ['peWithDifficulty', 'PE With Difficulty'],
    pewell: ['peWell', 'PE Well'],
    peverywell: ['peVeryWell', 'PE Very Well'],
    dancewithdifficulty: ['danceWithDifficulty', 'Dance With Difficulty'],
    dancewell: ['danceWell', 'Dance Well'],
    danceverywell: ['danceVeryWell', 'Dance Very Well'],
    dramawithdifficulty: ['dramaWithDifficulty', 'Drama With Difficulty'],
    dramawell: ['dramaWell', 'Drama Well'],
    dramaverywell: ['dramaVeryWell', 'Drama Very Well'],
    musicwithdifficulty: ['musicWithDifficulty', 'Music With Difficulty'],
    musicwell: ['musicWell', 'Music Well'],
    musicverywell: ['musicVeryWell', 'Music Very Well'],
    visualartswithdifficulty: ['visualArtsWithDifficulty', 'Visual Arts With Difficulty'],
    visualartswell: ['visualArtsWell', 'Visual Arts Well'],
    visualartsverywell: ['visualArtsVeryWell', 'Visual Arts Very Well'],
    otherwithdifficulty: ['otherWithDifficulty', 'Other With Difficulty'],
    otherwell: ['otherWell', 'Other Well'],
    otherverywell: ['otherVeryWell', 'Other Very Well'],
  }

  // Add exact mappings if they exist
  if (exactFieldMappings[formKey]) {
    variations.push(...exactFieldMappings[formKey])
  }

  // Remove duplicates and return
  return [...new Set(variations)]
}

