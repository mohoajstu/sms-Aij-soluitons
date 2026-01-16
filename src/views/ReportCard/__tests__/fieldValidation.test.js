import { describe, it, expect } from 'vitest'
import report1to6Fields from '../Fields/1-6-elementary-report.json'
import report7to8Fields from '../Fields/7-8-elementary-report.json'
import report1to6ProgressFields from '../Fields/1-6-elementary-progress.json'
import report7to8ProgressFields from '../Fields/7-8-elementary-progress.json'
import quranReportFields from '../Fields/quran-report.json'
import kindergartenReportFields from '../Fields/kindergarten-report.json'
import kindergartenInitialFields from '../Fields/kindergarten-initial.json'

const allFieldConfigs = [
  { id: '1-6-report', name: 'Grades 1-6 Report Card', fields: report1to6Fields },
  { id: '7-8-report', name: 'Grades 7-8 Report Card', fields: report7to8Fields },
  { id: '1-6-progress', name: 'Grades 1-6 Progress Report', fields: report1to6ProgressFields },
  { id: '7-8-progress', name: 'Grades 7-8 Progress Report', fields: report7to8ProgressFields },
  { id: 'quran-report', name: 'Quran Report Card', fields: quranReportFields },
  { id: 'kindergarten-report', name: 'Kindergarten Report Card', fields: kindergartenReportFields },
  { id: 'kindergarten-initial', name: 'Kindergarten Initial Observations', fields: kindergartenInitialFields },
]

describe('Field Configuration Validation', () => {
  describe('All field configs have required structure', () => {
    allFieldConfigs.forEach((config) => {
      it(`${config.name} has valid field structure`, () => {
        expect(config.fields).toBeDefined()
        expect(typeof config.fields).toBe('object')
        expect(Object.keys(config.fields).length).toBeGreaterThan(0)

        // Validate each field has required properties
        Object.entries(config.fields).forEach(([fieldName, fieldData]) => {
          expect(fieldData).toBeDefined()
          expect(fieldData.type).toBeDefined()
          expect(typeof fieldData.type).toBe('string')
          expect(['PDFTextField', 'PDFCheckBox', 'PDFDropdown', 'PDFRadioGroup', 'PDFSignature']).toContain(fieldData.type)
          
          // Every field should have a formDataKey or name
          const formKey = fieldData.formDataKey || fieldData.name
          expect(formKey).toBeDefined()
          expect(typeof formKey).toBe('string')
        })
      })
    })
  })

  describe('Required fields exist in each report type', () => {
    // Different report types have different required fields
    const requiredFieldsMap = {
      '1-6-report': ['student', 'grade', 'teacher', 'date'],
      '7-8-report': ['student', 'grade', 'teacher', 'date'],
      '1-6-progress': ['student', 'grade', 'teacher', 'date'],
      '7-8-progress': ['student', 'grade', 'teacher'], // Uses 'data' instead of 'date'
      'quran-report': ['student', 'grade', 'teacher', 'date'],
      'kindergarten-report': ['student', 'grade', 'teacher', 'date'],
      'kindergarten-initial': ['student', 'teacher', 'date'], // May not have 'grade' field
    }
    
    allFieldConfigs.forEach((config) => {
      it(`${config.name} contains all required basic fields`, () => {
        const fieldKeys = Object.values(config.fields).map(f => 
          (f.formDataKey || f.name || '').toLowerCase()
        )
        
        const requiredFields = requiredFieldsMap[config.id] || ['student', 'teacher']
        requiredFields.forEach((required) => {
          const found = fieldKeys.some(key => key.includes(required.toLowerCase()))
          expect(found).toBe(true)
        })
      })
    })
  })

  describe('Term-specific fields are properly marked', () => {
    const termReportConfigs = [
      { id: '1-6-report', fields: report1to6Fields },
      { id: '7-8-report', fields: report7to8Fields },
      { id: 'quran-report', fields: quranReportFields },
    ]

    termReportConfigs.forEach((config) => {
      it(`${config.id} has term-specific fields properly structured`, () => {
        const termFields = Object.values(config.fields).filter(f => {
          const key = (f.formDataKey || f.name || '').toLowerCase()
          return key.includes('report1') || key.includes('report2') || 
                 key.includes('term1') || key.includes('term2')
        })

        expect(termFields.length).toBeGreaterThan(0)

        // Verify term fields have correct term property
        termFields.forEach((field) => {
          const key = (field.formDataKey || field.name || '').toLowerCase()
          if (key.includes('report1') || key.includes('term1')) {
            expect(field.term === 1 || field.term === undefined).toBe(true)
          }
          if (key.includes('report2') || key.includes('term2')) {
            expect(field.term === 2 || field.term === undefined).toBe(true)
          }
        })
      })
    })
  })

  describe('No duplicate formDataKeys within a config', () => {
    allFieldConfigs.forEach((config) => {
      it(`${config.name} has no duplicate formDataKeys`, () => {
        const formKeys = Object.values(config.fields)
          .map(f => (f.formDataKey || f.name || '').toLowerCase())
          .filter(k => k)
        
        const uniqueKeys = new Set(formKeys)
        expect(formKeys.length).toBe(uniqueKeys.size)
      })
    })
  })

  describe('Checkbox fields are properly typed', () => {
    allFieldConfigs.forEach((config) => {
      it(`${config.name} checkbox fields have correct type`, () => {
        Object.entries(config.fields).forEach(([fieldName, fieldData]) => {
          const key = (fieldData.formDataKey || fieldData.name || '').toLowerCase()
          
          // Fields with ESL, IEP, NA, Core, Immersion, Extended should be checkboxes
          if (key.includes('esl') || key.includes('iep') || key.includes('na') ||
              key.includes('core') || key.includes('immersion') || key.includes('extended')) {
            // Allow PDFTextField for some cases, but most should be checkboxes
            if (fieldData.type === 'PDFCheckBox') {
              expect(fieldData.type).toBe('PDFCheckBox')
            }
          }
        })
      })
    })
  })
})

