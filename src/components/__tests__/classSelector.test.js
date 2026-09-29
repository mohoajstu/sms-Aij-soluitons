import { describe, it, expect } from 'vitest'
import { isHomeroomClass } from '../classSelection'

// The nine titles that reach the attendance picker today, plus the two active
// Grade 1 sections that do not.
const ACTIVE_COURSES = [
  { title: 'JK', gradeLevel: 'Kindergarten' },
  { title: 'Homeroom SK', gradeLevel: 'Kindergarten' },
  { title: 'Homeroom Grade 1 A', gradeLevel: '1st Grade' },
  { title: 'Homeroom Gr.1 B', gradeLevel: '1st Grade' },
  { title: 'Homeroom Grade 2', gradeLevel: '2nd Grade' },
  { title: 'Homeroom Grade 3', gradeLevel: '3rd Grade' },
  { title: 'Homeroom Grade 4', gradeLevel: '4th Grade' },
  { title: 'Homeroom Grade 5', gradeLevel: '5th Grade' },
  { title: 'Homeroom Grade 6', gradeLevel: '6th Grade' },
  { title: 'Homeroom Grade 7', gradeLevel: '7th Grade' },
  { title: 'Homeroom Grade 8', gradeLevel: '8th Grade' },
]

describe('isHomeroomClass', () => {
  it('accepts every active homeroom, including both Grade 1 sections', () => {
    const accepted = ACTIVE_COURSES.filter(isHomeroomClass).map((c) => c.title)
    expect(accepted).toEqual(ACTIVE_COURSES.map((c) => c.title))
  })

  it('accepts a section suffix written any of the ways staff type it', () => {
    expect(isHomeroomClass({ title: 'Homeroom Grade 1 A' })).toBe(true)
    expect(isHomeroomClass({ title: 'Homeroom Gr.1 B' })).toBe(true)
    expect(isHomeroomClass({ title: 'Homeroom Grade 1A' })).toBe(true)
    expect(isHomeroomClass({ title: 'homeroom grade 1-b' })).toBe(true)
  })

  it('keeps accepting the kindergarten shorthands', () => {
    expect(isHomeroomClass({ title: 'JK' })).toBe(true)
    expect(isHomeroomClass({ title: 'SK1' })).toBe(true)
    expect(isHomeroomClass({ title: 'SK - Tr. Rafia' })).toBe(true)
  })

  it('rejects subject courses', () => {
    expect(isHomeroomClass({ title: 'Grade 5 Science', gradeLevel: '5th Grade' })).toBe(false)
    expect(isHomeroomClass({ title: 'Quran Grade 3', gradeLevel: '3rd Grade' })).toBe(false)
    expect(isHomeroomClass({ title: 'Islamic Studies', gradeLevel: '2nd Grade' })).toBe(false)
  })

  it('handles a missing title', () => {
    expect(isHomeroomClass({})).toBe(false)
    expect(isHomeroomClass({ title: '   ' })).toBe(false)
  })
})
