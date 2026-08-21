import { describe, it, expect } from 'vitest'
import {
  mapCourseDocToFormData,
  buildCourseUpdatePayload,
  staffListChanged,
} from '../courseFormMapping'

const sampleDoc = () => ({
  title: 'Grade 1 Homeroom',
  name: 'Grade 1 Homeroom',
  subject: 'Islamic Studies',
  grade: '1st Grade',
  gradeLevel: '1st Grade',
  description: 'Homeroom for grade 1',
  capacity: 25,
  isActive: true,
  materials: ['Workbook'],
  teacher: [
    { name: 'Sr. Ayesha', authUID: 'auth123', tarbiyahId: 'TF001', schoolId: 'TF001' },
  ],
  students: [{ id: 'TS001', name: 'Student One', extra: 'keep-me' }],
  enrolledList: ['TS001'],
  schedule: {
    days: ['Monday'],
    startTime: '08:30',
    endTime: '15:30',
    room: 'Room 4',
  },
})

describe('mapCourseDocToFormData', () => {
  it('falls back to the name field when title is missing', () => {
    const doc = { ...sampleDoc(), title: undefined }
    const form = mapCourseDocToFormData('C1', doc)
    expect(form.title).toBe('Grade 1 Homeroom')
  })

  it('falls back to gradeLevel when grade is missing', () => {
    const doc = { ...sampleDoc(), grade: undefined }
    const form = mapCourseDocToFormData('C1', doc)
    expect(form.grade).toBe('1st Grade')
  })

  it('builds sessions from a legacy day list', () => {
    const form = mapCourseDocToFormData('C1', sampleDoc())
    expect(form.schedule.sessions.Monday.enabled).toBe(true)
    expect(form.schedule.sessions.Monday.startTime).toBe('08:30')
    expect(form.schedule.sessions.Monday.endTime).toBe('15:30')
    expect(form.schedule.sessions.Monday.room).toBe('Room 4')
    expect(form.schedule.sessions.Tuesday.enabled).toBe(false)
  })

  it('prefers detailed sessions when the doc has them', () => {
    const doc = sampleDoc()
    doc.schedule.sessions = {
      Wednesday: { enabled: true, startTime: '09:00', endTime: '12:00', room: 'Gym' },
    }
    const form = mapCourseDocToFormData('C1', doc)
    expect(form.schedule.sessions.Wednesday.enabled).toBe(true)
    expect(form.schedule.sessions.Wednesday.room).toBe('Gym')
    expect(form.schedule.sessions.Monday.enabled).toBe(false)
  })

  it('maps staff preferring the tarbiyah id', () => {
    const form = mapCourseDocToFormData('C1', sampleDoc())
    expect(form.staff).toEqual([{ id: 'TF001', name: 'Sr. Ayesha' }])
  })

  it('passes student objects through untouched', () => {
    const form = mapCourseDocToFormData('C1', sampleDoc())
    expect(form.students[0].extra).toBe('keep-me')
  })

  it('applies safe defaults for a sparse imported doc', () => {
    const form = mapCourseDocToFormData('C1', { name: 'Quran' })
    expect(form.title).toBe('Quran')
    expect(form.capacity).toBe(25)
    expect(form.isActive).toBe(true)
    expect(form.staff).toEqual([])
    expect(form.students).toEqual([])
    expect(form.schedule.sessions.Friday.enabled).toBe(false)
  })
})

describe('staffListChanged', () => {
  it('reports unchanged when ids match in any order', () => {
    const doc = {
      teacher: [
        { name: 'A', tarbiyahId: 'TF001' },
        { name: 'B', tarbiyahId: 'TF002' },
      ],
    }
    const staff = [
      { id: 'TF002', name: 'B' },
      { id: 'TF001', name: 'A' },
    ]
    expect(staffListChanged(doc, staff)).toBe(false)
  })

  it('reports changed when a teacher is added', () => {
    const doc = { teacher: [{ name: 'A', tarbiyahId: 'TF001' }] }
    const staff = [
      { id: 'TF001', name: 'A' },
      { id: 'TF003', name: 'C' },
    ]
    expect(staffListChanged(doc, staff)).toBe(true)
  })
})

describe('buildCourseUpdatePayload', () => {
  it('returns only the renamed title fields for a pure rename', () => {
    const original = sampleDoc()
    const formData = mapCourseDocToFormData('C1', original)
    formData.title = 'Grade 1A'
    const payload = buildCourseUpdatePayload({ original, formData, enabledDays: ['Monday'] })
    expect(payload.title).toBe('Grade 1A')
    expect(payload.name).toBe('Grade 1A')
    expect(payload).not.toHaveProperty('teacher')
    expect(payload).not.toHaveProperty('teacherIds')
    expect(payload).not.toHaveProperty('students')
    expect(payload).not.toHaveProperty('enrolledList')
    expect(payload).not.toHaveProperty('schedule')
    expect(payload).not.toHaveProperty('courseID')
    expect(payload).not.toHaveProperty('budget')
    expect(payload).not.toHaveProperty('academicYear')
  })

  it('returns an empty object when nothing changed', () => {
    const original = sampleDoc()
    const formData = mapCourseDocToFormData('C1', original)
    const payload = buildCourseUpdatePayload({ original, formData, enabledDays: ['Monday'] })
    expect(payload).toEqual({})
  })

  it('includes grade and gradeLevel together when grade changes', () => {
    const original = sampleDoc()
    const formData = mapCourseDocToFormData('C1', original)
    formData.grade = '2nd Grade'
    const payload = buildCourseUpdatePayload({ original, formData, enabledDays: ['Monday'] })
    expect(payload.grade).toBe('2nd Grade')
    expect(payload.gradeLevel).toBe('2nd Grade')
  })

  it('includes the schedule when a session time changes', () => {
    const original = sampleDoc()
    const formData = mapCourseDocToFormData('C1', original)
    formData.schedule.sessions.Monday.startTime = '09:00'
    const payload = buildCourseUpdatePayload({ original, formData, enabledDays: ['Monday'] })
    expect(payload.schedule.startTime).toBe('09:00')
    expect(payload.schedule.days).toEqual(['Monday'])
    expect(payload.schedule.sessions.Monday.startTime).toBe('09:00')
  })

  it('omits the schedule when no day is enabled', () => {
    const original = { name: 'Quran' }
    const formData = mapCourseDocToFormData('C1', original)
    formData.title = 'Quran 1A'
    const payload = buildCourseUpdatePayload({ original, formData, enabledDays: [] })
    expect(payload).not.toHaveProperty('schedule')
  })

  it('includes teacher fields only when enhanced staff data is provided', () => {
    const original = sampleDoc()
    const formData = mapCourseDocToFormData('C1', original)
    const enhancedStaffData = [
      { name: 'Br. Yusuf', authUID: 'TF009', tarbiyahId: 'TF009', schoolId: 'TF009' },
    ]
    const payload = buildCourseUpdatePayload({
      original,
      formData,
      enabledDays: ['Monday'],
      enhancedStaffData,
    })
    expect(payload.teacher).toEqual(enhancedStaffData)
    expect(payload.teacherIds).toEqual(['TF009'])
    expect(payload.teachers).toEqual(['Br. Yusuf'])
  })
})
