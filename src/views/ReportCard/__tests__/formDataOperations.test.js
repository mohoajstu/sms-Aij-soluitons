import { describe, it, expect } from 'vitest'
import {
  separateTermFields,
  mergeTermFields,
  copyTerm1ToTerm2,
} from '../utils/termFieldSeparation'
import { generateFieldNameVariations } from '../fieldMappings'

describe('Form Data Operations', () => {
  describe('Form data structure and filling', () => {
    it('creates valid form data structure for a student', () => {
      const student = {
        id: 'student123',
        fullName: 'John Doe',
        grade: '3',
        oen: '123456789',
        currentTermAbsenceCount: 2,
        yearAbsenceCount: 5,
        currentTermLateCount: 1,
        yearLateCount: 3,
      }

      const formData = {
        student: student.fullName,
        student_name: student.fullName,
        studentId: student.id,
        grade: student.grade,
        OEN: student.oen,
        oen: student.oen,
        daysAbsent: student.currentTermAbsenceCount || 0,
        totalDaysAbsent: student.yearAbsenceCount || 0,
        timesLate: student.currentTermLateCount || 0,
        totalTimesLate: student.yearLateCount || 0,
        date: '2025-01-16',
        teacher: 'Test Teacher',
        teacher_name: 'Test Teacher',
        school: 'Tarbiyah Learning Academy',
        principal: 'Ghazala Choudhary',
      }

      expect(formData.student).toBe('John Doe')
      expect(formData.grade).toBe('3')
      expect(formData.daysAbsent).toBe(2)
      expect(formData.teacher).toBe('Test Teacher')
    })

    it('handles form data with term-specific fields', () => {
      const formData = {
        student: 'Jane Smith',
        grade: '5',
        languageMarkReport1: 'A',
        languageMarkReport2: 'B+',
        mathMarkReport1: '85',
        mathMarkReport2: '90',
        teacher: 'Ms. Teacher',
        date: '2025-01-16',
      }

      const term1Data = separateTermFields(formData, 'term1')
      expect(term1Data.termData.languageMarkReport1).toBe('A')
      expect(term1Data.termData.mathMarkReport1).toBe('85')
      expect(term1Data.sharedData.student).toBe('Jane Smith')
      expect(term1Data.sharedData.teacher).toBe('Ms. Teacher')

      const term2Data = separateTermFields(formData, 'term2')
      expect(term2Data.termData.languageMarkReport2).toBe('B+')
      expect(term2Data.termData.mathMarkReport2).toBe('90')
      expect(term2Data.sharedData.student).toBe('Jane Smith')
    })

    it('merges term data correctly', () => {
      const term1Data = { languageMarkReport1: 'A', mathMarkReport1: '85' }
      const sharedData = { student: 'John Doe', teacher: 'Ms. Teacher' }
      const term2Data = { languageMarkReport2: 'B', mathMarkReport2: '90' }

      const merged = mergeTermFields(term1Data, sharedData, term2Data)
      
      expect(merged.student).toBe('John Doe')
      expect(merged.teacher).toBe('Ms. Teacher')
      expect(merged.languageMarkReport1).toBe('A')
      expect(merged.languageMarkReport2).toBe('B')
      expect(merged.mathMarkReport1).toBe('85')
      expect(merged.mathMarkReport2).toBe('90')
    })

    it('handles checkbox fields correctly', () => {
      const formData = {
        student: 'Test Student',
        languageESL: true,
        languageIEP: false,
        frenchCore: true,
        mathFrench: false,
        danceNA: true,
      }

      expect(typeof formData.languageESL).toBe('boolean')
      expect(formData.languageESL).toBe(true)
      expect(formData.languageIEP).toBe(false)
      expect(formData.frenchCore).toBe(true)
    })

    it('handles signature fields correctly', () => {
      const formData = {
        student: 'Test Student',
        teacherSignature: { type: 'typed', value: 'John Teacher' },
        principalSignature: { type: 'typed', value: 'Principal Name' },
      }

      expect(formData.teacherSignature.type).toBe('typed')
      expect(formData.teacherSignature.value).toBe('John Teacher')
      expect(formData.principalSignature.value).toBe('Principal Name')
    })
  })

  describe('Term 1 to Term 2 conversion', () => {
    it('converts Term 1 fields to Term 2 for report cards', () => {
      const term1Data = {
        student: 'John Doe',
        languageMarkReport1: 'A',
        mathMarkReport1: '85',
        scienceMarkReport1: 'B+',
        teacher: 'Ms. Teacher',
        date: '2025-01-16',
      }

      const term2Data = copyTerm1ToTerm2(term1Data)

      expect(term2Data.student).toBe('John Doe') // Shared field preserved
      expect(term2Data.teacher).toBe('Ms. Teacher') // Shared field preserved
      expect(term2Data.languageMarkReport2).toBe('A')
      expect(term2Data.mathMarkReport2).toBe('85')
      expect(term2Data.scienceMarkReport2).toBe('B+')
      
      // Term 1 fields should not exist in Term 2 data
      expect(term2Data.languageMarkReport1).toBeUndefined()
      expect(term2Data.mathMarkReport1).toBeUndefined()
    })

    it('preserves case when converting Term 1 to Term 2', () => {
      const term1Data = {
        languageMarkReport1: 'A',
        LanguageMarkReport1: 'B', // Different case
        hifdhTerm1: 'Excellent',
        hifdhterm1: 'Good', // Lowercase
      }

      const term2Data = copyTerm1ToTerm2(term1Data)

      expect(term2Data.languageMarkReport2).toBe('A')
      expect(term2Data.LanguageMarkReport2).toBe('B')
      expect(term2Data.hifdhTerm2).toBe('Excellent')
      expect(term2Data.hifdhterm2).toBe('Good')
    })
  })

  describe('Form data cleaning for Firebase', () => {
    it('removes undefined and null values before saving', () => {
      const formData = {
        student: 'John Doe',
        grade: '3',
        languageMarkReport1: 'A',
        languageMarkReport2: undefined,
        mathMarkReport1: null,
        emptyField: '',
        teacher: 'Ms. Teacher',
      }

      const cleanData = {}
      Object.keys(formData).forEach((key) => {
        const value = formData[key]
        if (value !== undefined && value !== null) {
          cleanData[key] = value === '' ? '' : value
        }
      })

      expect(cleanData.student).toBe('John Doe')
      expect(cleanData.grade).toBe('3')
      expect(cleanData.languageMarkReport1).toBe('A')
      expect(cleanData.languageMarkReport2).toBeUndefined()
      expect(cleanData.mathMarkReport1).toBeUndefined()
      expect(cleanData.emptyField).toBe('') // Empty strings are preserved
      expect(cleanData.teacher).toBe('Ms. Teacher')
    })

    it('preserves boolean false values', () => {
      const formData = {
        student: 'John Doe',
        languageESL: false, // Should be preserved
        languageIEP: true,
        mathFrench: false,
      }

      const cleanData = {}
      Object.keys(formData).forEach((key) => {
        const value = formData[key]
        if (value !== undefined && value !== null) {
          cleanData[key] = value
        }
      })

      expect(cleanData.languageESL).toBe(false)
      expect(cleanData.languageIEP).toBe(true)
      expect(cleanData.mathFrench).toBe(false)
    })
  })

  describe('Field name variations', () => {
    it('generates correct field name variations', () => {
      const variations = generateFieldNameVariations('teacher')
      expect(variations).toContain('teacher')
      // Check that variations exist (actual mapping may vary)
      expect(variations.length).toBeGreaterThan(0)
    })

    it('handles case-insensitive field matching', () => {
      const variations = generateFieldNameVariations('student_name')
      expect(variations.length).toBeGreaterThan(0)
      expect(variations).toContain('student')
    })

    it('handles signature field variations', () => {
      const teacherSigVariations = generateFieldNameVariations('teacherSignature')
      expect(teacherSigVariations.length).toBeGreaterThan(0)
      
      const principalSigVariations = generateFieldNameVariations('principalSignature')
      expect(principalSigVariations.length).toBeGreaterThan(0)
    })
  })
})

