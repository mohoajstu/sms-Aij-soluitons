import { describe, it, expect } from 'vitest'
import { generateFieldNameVariations } from '../fieldMappings'

describe('Field Name Mappings', () => {
  describe('Basic field name variations', () => {
    it('returns original key as first variation', () => {
      const variations = generateFieldNameVariations('student')
      expect(variations[0]).toBe('student')
    })

    it('handles common student fields', () => {
      const studentVariations = generateFieldNameVariations('student')
      expect(studentVariations).toContain('student')
      
      const studentNameVariations = generateFieldNameVariations('student_name')
      expect(studentNameVariations.length).toBeGreaterThan(0)
    })

    it('handles teacher field variations', () => {
      const teacherVariations = generateFieldNameVariations('teacher')
      expect(teacherVariations).toContain('teacher')
      
      const teacherNameVariations = generateFieldNameVariations('teacher_name')
      expect(teacherNameVariations.length).toBeGreaterThan(0)
    })

    it('handles date field with typo variations', () => {
      const dateVariations = generateFieldNameVariations('date')
      expect(dateVariations).toContain('date')
      expect(dateVariations).toContain('Date')
      expect(dateVariations).toContain('data') // Handles typo in some PDFs
    })
  })

  describe('Subject field variations', () => {
    it('handles language field variations', () => {
      const languageVariations = generateFieldNameVariations('languageESL')
      expect(languageVariations.length).toBeGreaterThan(0)
      expect(languageVariations).toContain('languageESL')
    })

    it('handles French field variations', () => {
      const frenchVariations = generateFieldNameVariations('frenchCore')
      expect(frenchVariations.length).toBeGreaterThan(0)
    })

    it('handles math field variations', () => {
      const mathVariations = generateFieldNameVariations('mathESL')
      expect(mathVariations.length).toBeGreaterThan(0)
    })
  })

  describe('Signature field variations', () => {
    it('handles teacher signature variations', () => {
      const variations = generateFieldNameVariations('teacherSignature')
      expect(variations.length).toBeGreaterThan(0)
      expect(variations).toContain('teacherSignature')
    })

    it('handles principal signature variations', () => {
      const variations = generateFieldNameVariations('principalSignature')
      expect(variations.length).toBeGreaterThan(0)
      expect(variations).toContain('principalSignature')
    })

    it('handles lowercase signature variations', () => {
      const teacherSig = generateFieldNameVariations('teachersignature')
      expect(teacherSig.length).toBeGreaterThan(0)
      
      const principalSig = generateFieldNameVariations('principalsignature')
      expect(principalSig.length).toBeGreaterThan(0)
    })
  })

  describe('Term-specific field variations', () => {
    it('handles Quran term fields', () => {
      const hifdhTerm1 = generateFieldNameVariations('hifdhTerm1')
      expect(hifdhTerm1.length).toBeGreaterThan(0)
      
      const hifdhTerm2 = generateFieldNameVariations('hifdhTerm2')
      expect(hifdhTerm2.length).toBeGreaterThan(0)
    })

    it('handles report mark fields', () => {
      const langMark1 = generateFieldNameVariations('languageMarkReport1')
      expect(langMark1.length).toBeGreaterThan(0)
      
      const langMark2 = generateFieldNameVariations('languageMarkReport2')
      expect(langMark2.length).toBeGreaterThan(0)
    })
  })

  describe('Sans (comment) field variations', () => {
    it('handles learning skills sans fields', () => {
      const sansResp = generateFieldNameVariations('sansResponsibility')
      expect(sansResp.length).toBeGreaterThan(0)
      
      const sansOrg = generateFieldNameVariations('sansOrganization')
      expect(sansOrg.length).toBeGreaterThan(0)
    })

    it('handles subject sans2 fields', () => {
      const sans2Lang = generateFieldNameVariations('sans2Language')
      expect(sans2Lang.length).toBeGreaterThan(0)
      
      const sans2Math = generateFieldNameVariations('sans2Math')
      expect(sans2Math.length).toBeGreaterThan(0)
    })
  })

  describe('Edge cases', () => {
    it('handles null/undefined input gracefully', () => {
      expect(() => generateFieldNameVariations(null)).not.toThrow()
      expect(() => generateFieldNameVariations(undefined)).not.toThrow()
      expect(generateFieldNameVariations(null)).toEqual([])
      expect(generateFieldNameVariations(undefined)).toEqual([])
    })

    it('handles empty string input', () => {
      const variations = generateFieldNameVariations('')
      // Empty string returns empty array based on actual implementation
      expect(Array.isArray(variations)).toBe(true)
    })

    it('handles unknown field names', () => {
      const variations = generateFieldNameVariations('unknownField123')
      expect(variations).toContain('unknownField123')
      expect(variations.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Student field variations', () => {
    it('includes common second-page student name fields', () => {
      const variations = generateFieldNameVariations('student_name')
      expect(variations).toContain('student2')
      expect(variations).toContain('student_2')
      expect(variations).toContain('Student_2')
      expect(variations).toContain('Student 2')
    })
  })
})
