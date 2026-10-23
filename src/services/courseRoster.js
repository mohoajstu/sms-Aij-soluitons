/**
 * One way to read a course roster, shared by the course page and the attendance
 * page so the two can never show different class lists.
 *
 * A course document stores its roster twice: a `students` array of
 * `{ id, name }` and a parallel `enrolledList` of ids. The attendance page loads
 * one student document per id and can only mark the ones that come back. The
 * course page used to print the stored names without checking anything, so when
 * eighteen of Homeroom Grade 3's ids pointed at deleted student documents the
 * course page showed twenty-three children and attendance showed five, with
 * nothing on screen to explain the gap.
 *
 * `loadRosterStudents` returns the loaded students and the roster entries that
 * failed to load. Show both. A child who cannot be marked has to be visible
 * somewhere, or the class list quietly lies to whoever reads it.
 */

import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '../Firebase/firebase'

const entryFrom = (value) => {
  if (typeof value === 'string' || typeof value === 'number') {
    return { id: String(value), name: '' }
  }
  if (value && value.id) {
    return { id: String(value.id), name: String(value.name || '') }
  }
  return null
}

const dedupe = (entries) => {
  const seen = new Set()
  return entries.filter((e) => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })
}

export const rosterEntriesFromCourse = (course) => {
  const source = Array.isArray(course?.students)
    ? course.students
    : Array.isArray(course?.enrolledList)
      ? course.enrolledList
      : []

  return dedupe(source.map(entryFrom).filter(Boolean))
}

export const missingRosterEntries = (entries, loadedStudents) => {
  const loaded = new Set((loadedStudents || []).map((s) => String(s?.id)))
  return entries.filter((e) => !loaded.has(e.id))
}

export const loadRosterStudents = async (course) => {
  const entries = rosterEntriesFromCourse(course)
  if (entries.length === 0) {
    return { entries, students: [], missing: [] }
  }

  const docs = await Promise.all(
    entries.map(async ({ id }) => {
      const snap = await getDoc(doc(firestore, 'students', id))
      if (snap.exists()) return { id: snap.id, ...snap.data() }
      console.warn(`Student with ID ${id} could not be found.`)
      return null
    }),
  )

  const students = docs.filter(Boolean)
  return { entries, students, missing: missingRosterEntries(entries, students) }
}
