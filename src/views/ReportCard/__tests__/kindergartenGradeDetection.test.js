import { describe, it, expect } from 'vitest'
import { normalizeGradeForClassMatch } from '../utils/courseSelection'
import { getKindergartenDefaultsForGrade } from '../utils/reportDefaults'
import { mergeFormDataWithStudent } from '../utils/mergeFormDataWithStudent'
import { getTeacherForGrade } from '../utils/gradeToTeacherMap'

// The registration form (registrationPage.js / RegistrationSettings.js) stores
// kindergarten grades as "Jr Kindergarten" / "Sr Kindergarten". Before this was
// handled, JK report cards showed no students at all.
describe('Kindergarten grade values from the registration form', () => {
  it('normalizes "Jr Kindergarten" / "Sr Kindergarten" for class matching', () => {
    expect(normalizeGradeForClassMatch('Jr Kindergarten')).toBe('jk')
    expect(normalizeGradeForClassMatch('jr kindergarten')).toBe('jk')
    expect(normalizeGradeForClassMatch('Sr Kindergarten')).toBe('sk')
  })

  it('still handles the older spellings', () => {
    expect(normalizeGradeForClassMatch('JK')).toBe('jk')
    expect(normalizeGradeForClassMatch('Junior Kindergarten')).toBe('jk')
    expect(normalizeGradeForClassMatch('Senior Kindergarten')).toBe('sk')
    expect(normalizeGradeForClassMatch('SK2')).toBe('sk2')
  })

  it('applies Year 1 / Year 2 kindergarten defaults', () => {
    expect(getKindergartenDefaultsForGrade('Jr Kindergarten')).toMatchObject({
      year1: true,
      year2: false,
    })
    expect(getKindergartenDefaultsForGrade('Sr Kindergarten')).toMatchObject({
      year1: false,
      year2: true,
    })
  })

  it('sets the report grade to JK/SK when merging the selected student', () => {
    expect(mergeFormDataWithStudent({}, { id: 'S1', program: 'Jr Kindergarten' }).grade).toBe('JK')
    expect(mergeFormDataWithStudent({}, { id: 'S2', grade: 'Sr Kindergarten' }).grade).toBe('SK')
  })

  it('does not misclassify numbered grades', () => {
    expect(normalizeGradeForClassMatch('Grade 3')).not.toMatch(/^(jk|sk)/)
    expect(mergeFormDataWithStudent({}, { id: 'S3', grade: 'Grade 8' }).grade).toBe('8')
    expect(getKindergartenDefaultsForGrade('Grade 1')).toEqual({})
  })
})

describe('Homeroom teacher fallback map', () => {
  it('assigns Grade 8 to Ghazala Choudhary in every grade format', () => {
    expect(getTeacherForGrade('8')).toBe('Ghazala Choudhary')
    expect(getTeacherForGrade('Grade 8')).toBe('Ghazala Choudhary')
  })

  it('keeps Grade 6 unchanged (Grade 8 had been a copy of it)', () => {
    expect(getTeacherForGrade('6')).toBe('Saba Alvi')
  })
})
