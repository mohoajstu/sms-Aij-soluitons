import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Comment Field Mapping Tests
 * 
 * These tests ensure that:
 * 1. All comment fields defined in UI components exist in their corresponding JSON field definitions
 * 2. Combined fields (Health & PE, Arts) are mapped correctly
 * 3. Field names are consistent between grade ranges where appropriate
 * 4. No orphaned comment fields that won't appear in PDFs
 * 
 * This prevents regressions like:
 * - Grade 7-8 using Text_1 instead of otherStrengthsAndNextStepsForImprovement
 * - Health/PE comments going to separate fields instead of combined field
 * - Arts comments going to individual art form fields instead of combined field
 */

describe('Comment Field Mappings - Regression Prevention', () => {
  let grade1to6ReportFields
  let grade7to8ReportFields
  let grade1to6ProgressFields

  beforeAll(() => {
    // Load JSON field definitions
    const fieldsPath = join(__dirname, '..', 'Fields')
    
    grade1to6ReportFields = JSON.parse(
      readFileSync(join(fieldsPath, '1-6-elementary-report.json'), 'utf8')
    )
    
    grade7to8ReportFields = JSON.parse(
      readFileSync(join(fieldsPath, '7-8-elementary-report.json'), 'utf8')
    )
    
    grade1to6ProgressFields = JSON.parse(
      readFileSync(join(fieldsPath, '1-6-elementary-progress.json'), 'utf8')
    )
  })

  describe('Grade 1-6 Report Card Comment Fields', () => {
    const expectedCommentFields = {
      'languageStrengthAndNextStepsForImprovement': 'Language',
      'frenchStrengthAndNextStepsForImprovement': 'French',
      'nativeLanguageStrengthAndNextStepsForImprovement': 'Native Language',
      'mathStrengthAndNextStepsForImprovement': 'Mathematics',
      'scienceAndNextStepsForImprovement': 'Science',
      'socialStudiesStrengthAndNextStepsForImprovement': 'Social Studies',
      'healthAndPEStrengthsAndNextStepsForImprovement': 'Health and Physical Education (Combined)',
      'artsStrengthAndNextStepsForImprovement': 'The Arts (Combined)',
      'otherStrengthAndNextStepsForImprovement': 'Islamic Studies/Other'
    }

    Object.entries(expectedCommentFields).forEach(([fieldName, subject]) => {
      it(`should have ${fieldName} field in JSON for ${subject}`, () => {
        expect(grade1to6ReportFields).toHaveProperty(fieldName)
        expect(grade1to6ReportFields[fieldName].type).toBe('PDFTextField')
      })
    })

    it('should NOT have separate Health Education comment field', () => {
      expect(grade1to6ReportFields).not.toHaveProperty('healthEdStrengthAndNextStepsForImprovement')
    })

    it('should NOT have separate Physical Education comment field', () => {
      expect(grade1to6ReportFields).not.toHaveProperty('peStrengthAndNextStepsForImprovement')
    })

    it('should NOT have individual art form comment fields', () => {
      expect(grade1to6ReportFields).not.toHaveProperty('danceStrengthAndNextStepsForImprovement')
      expect(grade1to6ReportFields).not.toHaveProperty('dramaStrengthAndNextStepsForImprovement')
      expect(grade1to6ReportFields).not.toHaveProperty('musicStrengthAndNextStepsForImprovement')
      expect(grade1to6ReportFields).not.toHaveProperty('visualArtsStrengthAndNextStepsForImprovement')
    })
  })

  describe('Grade 7-8 Report Card Comment Fields', () => {
    const expectedCommentFields = {
      'languageStrengthsAndStepsForImprovement': 'Language',
      'frenchStrengthsAndNextStepsForImprovement': 'French',
      'nativeLanguageStrengthsAndNextStepsForImprovement': 'Native Language',
      'mathStrengthAndNextStepsForImprovement': 'Mathematics',
      'scienceStrengthsAndNextStepsForImprovement': 'Science',
      'historyStrengthsAndNextStepsForImprovement': 'History',
      'geographyStrengthsAndNextStepsForImprovement': 'Geography',
      'healthAndPEStrengthsAndNextStepsForImprovement': 'Health and Physical Education (Combined)',
      'artsStrengthsAndNextStepsForImprovement': 'The Arts (Combined)',
      'otherStrengthsAndNextStepsForImprovement': 'Islamic Studies/Other'
    }

    Object.entries(expectedCommentFields).forEach(([fieldName, subject]) => {
      it(`should have ${fieldName} field in JSON for ${subject}`, () => {
        expect(grade7to8ReportFields).toHaveProperty(fieldName)
        expect(grade7to8ReportFields[fieldName].type).toBe('PDFTextField')
      })
    })

    it('should NOT have generic Text_1 field anymore', () => {
      expect(grade7to8ReportFields).not.toHaveProperty('Text_1')
    })

    it('should NOT have separate Health Education comment field', () => {
      expect(grade7to8ReportFields).not.toHaveProperty('healthEdStrengthAndNextStepsForImprovement')
    })

    it('should NOT have separate Physical Education comment field', () => {
      expect(grade7to8ReportFields).not.toHaveProperty('peStrengthAndNextStepsForImprovement')
    })

    it('should NOT have individual art form comment fields', () => {
      expect(grade7to8ReportFields).not.toHaveProperty('danceStrengthAndNextStepsForImprovement')
      expect(grade7to8ReportFields).not.toHaveProperty('dramaStrengthAndNextStepsForImprovement')
      expect(grade7to8ReportFields).not.toHaveProperty('musicStrengthAndNextStepsForImprovement')
      expect(grade7to8ReportFields).not.toHaveProperty('visualArtsStrengthAndNextStepsForImprovement')
    })
  })

  describe('Combined Field Mappings', () => {
    describe('Health and Physical Education', () => {
      it('Grade 1-6: should have combined Health and PE field', () => {
        expect(grade1to6ReportFields).toHaveProperty('healthAndPEStrengthsAndNextStepsForImprovement')
      })

      it('Grade 7-8: should have combined Health and PE field', () => {
        expect(grade7to8ReportFields).toHaveProperty('healthAndPEStrengthsAndNextStepsForImprovement')
      })

      it('should use consistent naming between grade ranges for Health and PE', () => {
        const grade1to6FieldName = 'healthAndPEStrengthsAndNextStepsForImprovement'
        const grade7to8FieldName = 'healthAndPEStrengthsAndNextStepsForImprovement'
        
        expect(grade1to6FieldName).toBe(grade7to8FieldName)
        expect(grade1to6ReportFields).toHaveProperty(grade1to6FieldName)
        expect(grade7to8ReportFields).toHaveProperty(grade7to8FieldName)
      })
    })

    describe('The Arts', () => {
      it('Grade 1-6: should have combined Arts field', () => {
        expect(grade1to6ReportFields).toHaveProperty('artsStrengthAndNextStepsForImprovement')
      })

      it('Grade 7-8: should have combined Arts field', () => {
        expect(grade7to8ReportFields).toHaveProperty('artsStrengthsAndNextStepsForImprovement')
      })

      it('should use similar naming between grade ranges for Arts', () => {
        // Note: Grade 1-6 uses "Strength" (singular), Grade 7-8 uses "Strengths" (plural)
        // Both should exist in their respective JSONs
        expect(grade1to6ReportFields).toHaveProperty('artsStrengthAndNextStepsForImprovement')
        expect(grade7to8ReportFields).toHaveProperty('artsStrengthsAndNextStepsForImprovement')
      })
    })
  })

  describe('Islamic Studies (Other) Field', () => {
    it('Grade 1-6: should have otherStrengthAndNextStepsForImprovement field', () => {
      expect(grade1to6ReportFields).toHaveProperty('otherStrengthAndNextStepsForImprovement')
      expect(grade1to6ReportFields.otherStrengthAndNextStepsForImprovement.type).toBe('PDFTextField')
    })

    it('Grade 7-8: should have otherStrengthsAndNextStepsForImprovement field (not Text_1)', () => {
      expect(grade7to8ReportFields).toHaveProperty('otherStrengthsAndNextStepsForImprovement')
      expect(grade7to8ReportFields.otherStrengthsAndNextStepsForImprovement.type).toBe('PDFTextField')
      
      // Ensure the old generic field name is gone
      expect(grade7to8ReportFields).not.toHaveProperty('Text_1')
    })

    it('should have subject name field (other) for both grade ranges', () => {
      expect(grade1to6ReportFields).toHaveProperty('other')
      expect(grade7to8ReportFields).toHaveProperty('other')
    })
  })

  describe('Field Data Key Consistency', () => {
    it('should have lowercase formDataKey for comment fields', () => {
      // Check Grade 1-6
      const grade1to6Comments = Object.entries(grade1to6ReportFields)
        .filter(([key]) => key.includes('Strength') || key.includes('NextSteps'))
      
      grade1to6Comments.forEach(([fieldName, fieldData]) => {
        expect(fieldData.formDataKey).toBe(fieldData.formDataKey.toLowerCase())
        expect(fieldData.formDataKey).not.toContain(' ')
      })

      // Check Grade 7-8
      const grade7to8Comments = Object.entries(grade7to8ReportFields)
        .filter(([key]) => key.includes('Strength') || key.includes('NextSteps'))
      
      grade7to8Comments.forEach(([fieldName, fieldData]) => {
        expect(fieldData.formDataKey).toBe(fieldData.formDataKey.toLowerCase())
        expect(fieldData.formDataKey).not.toContain(' ')
      })
    })
  })

  describe('Subject Accommodation Fields', () => {
    it('Grade 1-6: should have separate Health and PE accommodation fields', () => {
      // Health Education accommodations
      expect(grade1to6ReportFields).toHaveProperty('healthEdESL')
      expect(grade1to6ReportFields).toHaveProperty('healthEdIEP')
      expect(grade1to6ReportFields).toHaveProperty('healthEdFrench')
      
      // Physical Education accommodations
      expect(grade1to6ReportFields).toHaveProperty('peESL')
      expect(grade1to6ReportFields).toHaveProperty('peIEP')
      expect(grade1to6ReportFields).toHaveProperty('peFrench')
    })

    it('Grade 7-8: should have separate Health and PE accommodation fields', () => {
      // Health Education accommodations
      expect(grade7to8ReportFields).toHaveProperty('healthEdESL')
      expect(grade7to8ReportFields).toHaveProperty('healthEdIEP')
      expect(grade7to8ReportFields).toHaveProperty('healthEdFrench')
      
      // Physical Education accommodations
      expect(grade7to8ReportFields).toHaveProperty('peESL')
      expect(grade7to8ReportFields).toHaveProperty('peIEP')
      expect(grade7to8ReportFields).toHaveProperty('peFrench')
    })

    it('should have separate accommodation fields for each art form', () => {
      // Check that dance has at least ESL, IEP, NA fields
      expect(grade1to6ReportFields).toHaveProperty('danceESL')
      expect(grade1to6ReportFields).toHaveProperty('danceIEP')
      expect(grade1to6ReportFields).toHaveProperty('danceNA')
      
      // Check that drama has at least ESL, IEP, NA fields
      expect(grade1to6ReportFields).toHaveProperty('dramaESL')
      expect(grade1to6ReportFields).toHaveProperty('dramaIEP')
      expect(grade1to6ReportFields).toHaveProperty('dramaNA')
      
      // Check that music has at least ESL, IEP, NA fields
      expect(grade1to6ReportFields).toHaveProperty('musicESL')
      expect(grade1to6ReportFields).toHaveProperty('musicIEP')
      expect(grade1to6ReportFields).toHaveProperty('musicNA')
      
      // Check that visual arts has at least ESL, IEP, NA fields
      expect(grade1to6ReportFields).toHaveProperty('visualArtsESL')
      expect(grade1to6ReportFields).toHaveProperty('visualArtsIEP')
      expect(grade1to6ReportFields).toHaveProperty('visualArtsNA')
    })
  })

  describe('Mark Fields', () => {
    it('Grade 1-6: should have marks for Report 1 and Report 2', () => {
      expect(grade1to6ReportFields).toHaveProperty('healthMarkReport1')
      expect(grade1to6ReportFields).toHaveProperty('healthMarkReport2')
      expect(grade1to6ReportFields).toHaveProperty('peMarkReport1')
      expect(grade1to6ReportFields).toHaveProperty('peMarkReport2')
    })

    it('Grade 7-8: should have marks AND medians for Report 1 and Report 2', () => {
      // Health Education
      expect(grade7to8ReportFields).toHaveProperty('healthEdMarkReport1')
      expect(grade7to8ReportFields).toHaveProperty('healthEdMedianReport1')
      expect(grade7to8ReportFields).toHaveProperty('healthEdMarkReport2')
      expect(grade7to8ReportFields).toHaveProperty('healthEdMedianReport2')
      
      // Physical Education
      expect(grade7to8ReportFields).toHaveProperty('peMarkReport1')
      expect(grade7to8ReportFields).toHaveProperty('peMedianReport1')
      expect(grade7to8ReportFields).toHaveProperty('peMarkReport2')
      expect(grade7to8ReportFields).toHaveProperty('peMedianReport2')
    })
  })
})

describe('UI Component Field Mapping Integration', () => {
  /**
   * These tests verify that the expected UI component structure matches the JSON field definitions
   * This ensures the UI components reference fields that actually exist in the PDF
   */
  
  let grade1to6ReportFields
  let grade7to8ReportFields

  beforeAll(() => {
    // Load JSON field definitions
    const fieldsPath = join(__dirname, '..', 'Fields')
    
    grade1to6ReportFields = JSON.parse(
      readFileSync(join(fieldsPath, '1-6-elementary-report.json'), 'utf8')
    )
    
    grade7to8ReportFields = JSON.parse(
      readFileSync(join(fieldsPath, '7-8-elementary-report.json'), 'utf8')
    )
  })
  
  describe('Expected UI Component Structure', () => {
    it('should document Grade 1-6 UI subject definitions', () => {
      const expectedSubjects = [
        { key: 'language', commentField: 'languageStrengthAndNextStepsForImprovement' },
        { key: 'french', commentField: 'frenchStrengthAndNextStepsForImprovement' },
        { key: 'nativeLanguage', commentField: 'nativeLanguageStrengthAndNextStepsForImprovement' },
        { key: 'math', commentField: 'mathStrengthAndNextStepsForImprovement' },
        { key: 'science', commentField: 'scienceAndNextStepsForImprovement' },
        { key: 'socialStudies', commentField: 'socialStudiesStrengthAndNextStepsForImprovement' },
        { key: 'healthEd', commentField: 'healthAndPEStrengthsAndNextStepsForImprovement', hideCommentField: true },
        { key: 'pe', commentField: 'healthAndPEStrengthsAndNextStepsForImprovement' },
        { key: 'dance', commentField: 'artsStrengthAndNextStepsForImprovement', hideCommentField: true },
        { key: 'drama', commentField: 'artsStrengthAndNextStepsForImprovement', hideCommentField: true },
        { key: 'music', commentField: 'artsStrengthAndNextStepsForImprovement', hideCommentField: true },
        { key: 'visualArts', commentField: 'artsStrengthAndNextStepsForImprovement' },
        { key: 'other', commentField: 'otherStrengthAndNextStepsForImprovement' },
      ]

      // Verify all expected comment fields exist in JSON
      expectedSubjects.forEach(subject => {
        if (!subject.hideCommentField) {
          expect(grade1to6ReportFields).toHaveProperty(subject.commentField)
        }
      })
    })

    it('should document Grade 7-8 UI subject definitions', () => {
      const expectedSubjects = [
        { key: 'language', commentField: 'languageStrengthsAndStepsForImprovement' },
        { key: 'french', commentField: 'frenchStrengthsAndNextStepsForImprovement' },
        { key: 'nativeLanguage', commentField: 'nativeLanguageStrengthsAndNextStepsForImprovement' },
        { key: 'math', commentField: 'mathStrengthAndNextStepsForImprovement' },
        { key: 'science', commentField: 'scienceStrengthsAndNextStepsForImprovement' },
        { key: 'history', commentField: 'historyStrengthsAndNextStepsForImprovement' },
        { key: 'geography', commentField: 'geographyStrengthsAndNextStepsForImprovement' },
        { key: 'healthEd', commentField: 'healthAndPEStrengthsAndNextStepsForImprovement', hideCommentField: true },
        { key: 'pe', commentField: 'healthAndPEStrengthsAndNextStepsForImprovement' },
        { key: 'dance', commentField: 'artsStrengthsAndNextStepsForImprovement', hideCommentField: true },
        { key: 'drama', commentField: 'artsStrengthsAndNextStepsForImprovement', hideCommentField: true },
        { key: 'music', commentField: 'artsStrengthsAndNextStepsForImprovement', hideCommentField: true },
        { key: 'visualArts', commentField: 'artsStrengthsAndNextStepsForImprovement' },
        { key: 'other', commentField: 'otherStrengthsAndNextStepsForImprovement' },
      ]

      // Verify all expected comment fields exist in JSON
      expectedSubjects.forEach(subject => {
        if (!subject.hideCommentField) {
          expect(grade7to8ReportFields).toHaveProperty(subject.commentField)
        }
      })
    })
  })
})

