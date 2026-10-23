/**
 * Which courses count as a homeroom, and so appear in the attendance picker.
 *
 * Titles are typed by hand and drift. The same Grade 1 cohort is entered as
 * "Homeroom Grade 1 A" and "Homeroom Gr.1 B". An exact-match pattern list kept
 * both of those, and their 45 students, out of attendance entirely. Anything a
 * person named a homeroom is treated as one; the kindergarten shorthands that
 * predate the naming convention are matched separately.
 */

const KINDERGARTEN_SHORTHAND = [
  /^jk$/i,
  /^sk$/i,
  /^sk1$/i,
  /^sk2$/i,
  /^sk\b.*rafia$/i,
  /^sk\b.*huda$/i,
  /^homeroom\s+junior\s+kindergarten$/i,
  /^homeroom\s+senior\s+kindergarten$/i,
]

export const isHomeroomClass = (classData) => {
  const title = String(classData?.title || classData?.name || '').trim()
  const gradeLevel = String(classData?.gradeLevel || '').trim()

  if (/^homeroom\b/i.test(title)) return true

  return KINDERGARTEN_SHORTHAND.some((p) => p.test(title) || p.test(gradeLevel))
}

export default isHomeroomClass
