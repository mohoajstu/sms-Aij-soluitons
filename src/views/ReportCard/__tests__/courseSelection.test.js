import { describe, it, expect } from 'vitest'
import {
  normalizeGradeForClassMatch,
  courseMatchesGrade,
  pickHomeroomCourseByGrade,
} from '../utils/courseSelection'

describe('Course selection helpers', () => {
  describe('normalizeGradeForClassMatch', () => {
    it('normalizes JK and SK grades', () => {
      expect(normalizeGradeForClassMatch('Junior Kindergarten')).toBe('jk')
      expect(normalizeGradeForClassMatch('JK')).toBe('jk')
      expect(normalizeGradeForClassMatch('SK1')).toBe('sk1')
      expect(normalizeGradeForClassMatch('Senior Kindergarten')).toBe('sk')
    })

    it('extracts numeric grades from strings', () => {
      expect(normalizeGradeForClassMatch('Grade 2')).toBe('2')
      expect(normalizeGradeForClassMatch('2')).toBe('2')
      expect(normalizeGradeForClassMatch('Grade8')).toBe('8')
    })
  })

  describe('courseMatchesGrade', () => {
    it('matches homeroom course by grade field', () => {
      const course = { name: 'Homeroom Grade 2', grade: '2' }
      expect(courseMatchesGrade(course, '2')).toBe(true)
    })

    it('matches homeroom course by name', () => {
      const course = { name: 'Homeroom Grade 4', grade: '' }
      expect(courseMatchesGrade(course, '4')).toBe(true)
    })

    it('does not match non-homeroom courses', () => {
      const course = { name: 'Science Grade 2', grade: '2' }
      expect(courseMatchesGrade(course, '2')).toBe(false)
    })

    it('matches SK variants correctly', () => {
      const sk1Course = { name: 'Homeroom SK1 - Tr. Rafia', grade: 'sk1' }
      const sk2Course = { name: 'Homeroom SK2 - Tr. Huda', grade: 'sk2' }
      expect(courseMatchesGrade(sk1Course, 'sk1')).toBe(true)
      expect(courseMatchesGrade(sk2Course, 'sk2')).toBe(true)
      expect(courseMatchesGrade(sk1Course, 'sk2')).toBe(false)
    })
  })

  describe('pickHomeroomCourseByGrade', () => {
    it('returns the first matching homeroom course', () => {
      const docs = [
        { data: () => ({ name: 'Science Grade 2', grade: '2' }) },
        { data: () => ({ name: 'Homeroom Grade 2', grade: '2' }) },
      ]
      const picked = pickHomeroomCourseByGrade(docs, '2')
      expect(picked).toBe(docs[1])
    })

    it('returns null when no matching course exists', () => {
      const docs = [{ data: () => ({ name: 'Science Grade 2', grade: '2' }) }]
      expect(pickHomeroomCourseByGrade(docs, '2')).toBeNull()
    })
  })
})
