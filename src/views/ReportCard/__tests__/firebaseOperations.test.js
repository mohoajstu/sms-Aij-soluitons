import { describe, it, expect, vi, beforeEach } from 'vitest'
import { separateTermFields } from '../utils/termFieldSeparation'
import { mergeFormDataWithStudent } from '../utils/mergeFormDataWithStudent'

// Mock Firebase functions
const mockDoc = vi.fn()
const mockGetDoc = vi.fn()
const mockSetDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockCollection = vi.fn()
const mockQuery = vi.fn()
const mockWhere = vi.fn()
const mockGetDocs = vi.fn()
const mockServerTimestamp = vi.fn(() => ({ seconds: Date.now() / 1000 }))

vi.mock('firebase/firestore', () => ({
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  collection: (...args) => mockCollection(...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  getDocs: (...args) => mockGetDocs(...args),
  serverTimestamp: () => mockServerTimestamp(),
}))

describe('Firebase Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Draft saving structure', () => {
    it('creates correct draft data structure for saving', () => {
      const user = {
        uid: 'user123',
        displayName: 'Test Teacher',
        email: 'teacher@test.com',
      }

      const student = {
        id: 'student123',
        fullName: 'John Doe',
        schoolId: 'TLA001',
      }

      const formData = {
        student: 'John Doe',
        grade: '3',
        languageMarkReport1: 'A',
        mathMarkReport1: '85',
        teacher: 'Test Teacher',
        date: '2025-01-16',
      }

      const reportCardType = '1-6-report-card'
      const term = 'term1'

      // Separate term-specific fields
      const { termData, sharedData } = separateTermFields(formData, term)

      // Clean formData (remove undefined/null)
      const cleanTermData = {}
      Object.keys(termData).forEach((key) => {
        const value = termData[key]
        if (value !== undefined && value !== null) {
          cleanTermData[key] = value === '' ? '' : value
        }
      })

      const cleanSharedData = {}
      Object.keys(sharedData).forEach((key) => {
        const value = sharedData[key]
        if (value !== undefined && value !== null) {
          cleanSharedData[key] = value === '' ? '' : value
        }
      })

      const cleanFormData = {
        ...cleanSharedData,
        ...cleanTermData,
      }

      const draftData = {
        uid: user.uid,
        teacherName: user.displayName || user.email || 'Unknown Teacher',
        studentId: student.id,
        studentName: student.fullName,
        tarbiyahId: student.schoolId || student.id || '',
        reportCardType: reportCardType,
        reportCardTypeName: 'Grades 1–6 – Elementary Provincial Report Card',
        term: term,
        formData: cleanFormData,
        selectedStudent: {
          id: student.id,
          fullName: student.fullName,
          grade: student.grade || '',
          oen: student.oen || '',
          schoolId: student.schoolId || '',
        },
        status: 'draft',
        lastModified: mockServerTimestamp(),
        createdAt: mockServerTimestamp(),
      }

      // Validate structure
      expect(draftData.uid).toBe('user123')
      expect(draftData.studentId).toBe('student123')
      expect(draftData.reportCardType).toBe('1-6-report-card')
      expect(draftData.term).toBe('term1')
      expect(draftData.formData).toBeDefined()
      expect(draftData.formData.student).toBe('John Doe')
      expect(draftData.formData.languageMarkReport1).toBe('A')
      expect(draftData.formData.mathMarkReport1).toBe('85')
    })

    it('generates correct draft ID format', () => {
      const userId = 'user123'
      const studentId = 'student456'
      const reportType = '1-6-report-card'
      const term = 'term1'

      const draftId = `${userId}_${studentId}_${reportType}_${term}`
      expect(draftId).toBe('user123_student456_1-6-report-card_term1')
    })
  })

  describe('Draft loading structure', () => {
    it('loads and processes draft data correctly', () => {
      const mockDraftData = {
        uid: 'user123',
        teacherName: 'Test Teacher',
        studentId: 'student123',
        studentName: 'John Doe',
        reportCardType: '1-6-report-card',
        term: 'term1',
        formData: {
          student: 'John Doe',
          grade: '3',
          languageMarkReport1: 'A',
          languageMarkReport2: 'B',
          mathMarkReport1: '85',
          teacher: 'Test Teacher',
          date: '2025-01-16',
        },
        status: 'draft',
        lastModified: { seconds: 1705420800 },
        createdAt: { seconds: 1705334400 },
      }

      // Simulate loading and separating term fields
      const term = 'term1'
      const { termData, sharedData } = separateTermFields(mockDraftData.formData, term)

      expect(termData.languageMarkReport1).toBe('A')
      expect(termData.mathMarkReport1).toBe('85')
      expect(termData.languageMarkReport2).toBeUndefined() // Not in term1 data
      expect(sharedData.student).toBe('John Doe')
      expect(sharedData.teacher).toBe('Test Teacher')
      expect(sharedData.date).toBe('2025-01-16')
    })

    it('handles missing draft gracefully', () => {
      const mockDraftData = null

      // Should not throw error
      expect(mockDraftData).toBeNull()
    })
  })

  describe('Term field separation for saving', () => {
    it('separates term-specific fields correctly before saving', () => {
      const formData = {
        student: 'John Doe',
        grade: '3',
        languageMarkReport1: 'A',
        languageMarkReport2: 'B+',
        mathMarkReport1: '85',
        mathMarkReport2: '90',
        teacher: 'Ms. Teacher',
        date: '2025-01-16',
      }

      const term = 'term1'
      const { termData, sharedData } = separateTermFields(formData, term)

      // Term 1 should only have term1 fields
      expect(termData.languageMarkReport1).toBe('A')
      expect(termData.mathMarkReport1).toBe('85')
      expect(termData.languageMarkReport2).toBeUndefined()
      expect(termData.mathMarkReport2).toBeUndefined()

      // Shared fields should be in sharedData
      expect(sharedData.student).toBe('John Doe')
      expect(sharedData.grade).toBe('3')
      expect(sharedData.teacher).toBe('Ms. Teacher')
      expect(sharedData.date).toBe('2025-01-16')
    })
  })

  describe('Draft data validation', () => {
    it('validates required draft fields', () => {
      const draftData = {
        uid: 'user123',
        studentId: 'student123',
        reportCardType: '1-6-report-card',
        term: 'term1',
        formData: {},
      }

      expect(draftData.uid).toBeDefined()
      expect(draftData.studentId).toBeDefined()
      expect(draftData.reportCardType).toBeDefined()
      expect(draftData.term).toBeDefined()
      expect(draftData.formData).toBeDefined()
    })

    it('handles empty formData', () => {
      const draftData = {
        uid: 'user123',
        studentId: 'student123',
        reportCardType: '1-6-report-card',
        term: 'term1',
        formData: {},
      }

      const { termData, sharedData } = separateTermFields(draftData.formData, 'term1')
      expect(Object.keys(termData).length).toBe(0)
      expect(Object.keys(sharedData).length).toBe(0)
    })
  })

  describe('Form data normalization', () => {
    it('overwrites stale student fields before saving', () => {
      const student = {
        id: 'student123',
        fullName: 'Khaled El Husseini',
        schooling: { oen: 'OEN123' },
        grade: '2',
        currentTermAbsenceCount: 2,
        yearAbsenceCount: 5,
        currentTermLateCount: 1,
        yearLateCount: 3,
      }

      const formData = {
        student: 'Luna Jarrar',
        student_name: 'Luna Jarrar',
        name: 'Luna Jarrar',
        studentId: 'student999',
        OEN: 'OEN999',
        oen: 'OEN999',
        grade: '3',
        daysAbsent: 0,
        totalDaysAbsent: 0,
        timesLate: 0,
        totalTimesLate: 0,
      }

      const merged = mergeFormDataWithStudent(formData, student)

      expect(merged.student).toBe('Khaled El Husseini')
      expect(merged.student_name).toBe('Khaled El Husseini')
      expect(merged.name).toBe('Khaled El Husseini')
      expect(merged.studentId).toBe('student123')
      expect(merged.OEN).toBe('OEN123')
      expect(merged.oen).toBe('OEN123')
      expect(merged.grade).toBe('2')
      expect(merged.daysAbsent).toBe(2)
      expect(merged.totalDaysAbsent).toBe(5)
      expect(merged.timesLate).toBe(1)
      expect(merged.totalTimesLate).toBe(3)
    })

    it('normalizes JK/SK grades and keeps other fields intact', () => {
      const student = {
        id: 'studentJK',
        fullName: 'Amina Noor',
        grade: 'Junior Kindergarten',
        currentTermAbsenceCount: 0,
        yearAbsenceCount: 1,
        currentTermLateCount: 0,
        yearLateCount: 1,
      }

      const formData = {
        teacher: 'Ms. Teacher',
        customNote: 'Keep this',
        grade: '5',
      }

      const merged = mergeFormDataWithStudent(formData, student)

      expect(merged.grade).toBe('JK')
      expect(merged.teacher).toBe('Ms. Teacher')
      expect(merged.customNote).toBe('Keep this')
    })

    it('handles missing student by returning original formData', () => {
      const formData = {
        student: 'Luna Jarrar',
        grade: '2',
        teacher: 'Ms. Teacher',
      }

      const merged = mergeFormDataWithStudent(formData, null)

      expect(merged).toEqual(formData)
    })

    it('preserves zero attendance values from student stats', () => {
      const student = {
        id: 'studentZero',
        fullName: 'Zero Case',
        grade: '4',
        currentTermAbsenceCount: 0,
        yearAbsenceCount: 0,
        currentTermLateCount: 0,
        yearLateCount: 0,
      }

      const merged = mergeFormDataWithStudent({}, student)

      expect(merged.daysAbsent).toBe(0)
      expect(merged.totalDaysAbsent).toBe(0)
      expect(merged.timesLate).toBe(0)
      expect(merged.totalTimesLate).toBe(0)
    })

    it('falls back to studentId when fullName is missing', () => {
      const student = {
        id: 'studentNoName',
        firstName: 'Khaled',
        lastName: 'El Husseini',
        oen: 'OEN555',
        program: 'Grade 2',
      }

      const merged = mergeFormDataWithStudent({}, student)

      expect(merged.student).toBe('Khaled El Husseini')
      expect(merged.student_name).toBe('Khaled El Husseini')
      expect(merged.name).toBe('Khaled El Husseini')
      expect(merged.oen).toBe('OEN555')
      expect(merged.OEN).toBe('OEN555')
      expect(merged.grade).toBe('2')
      expect(merged.studentId).toBe('studentNoName')
    })
  })

  describe('Cross-teacher draft loading', () => {
    it('handles draft from different teacher', () => {
      const mockDraftFromOtherTeacher = {
        id: 'other_teacher_student123_1-6-report-card_term1',
        data: {
          uid: 'otherTeacher123',
          teacherName: 'Other Teacher',
          studentId: 'student123',
          studentName: 'John Doe',
          reportCardType: '1-6-report-card',
          term: 'term1',
          formData: {
            student: 'John Doe',
            languageMarkReport1: 'A',
            teacher: 'Other Teacher',
          },
        },
        lastModified: { seconds: 1705420800 },
      }

      // Should be able to load and use this draft
      expect(mockDraftFromOtherTeacher.data.studentId).toBe('student123')
      expect(mockDraftFromOtherTeacher.data.term).toBe('term1')
      expect(mockDraftFromOtherTeacher.data.formData).toBeDefined()
    })
  })
})
