/**
 * Utility to get Early Childhood Educator (ECE) information for a student
 * Gets ECE from the student's homeroom course
 */
import { collection, query, where, getDocs } from 'firebase/firestore'
import { firestore } from '../../../Firebase/firebase'

/**
 * Hardcoded fallback mapping for ECEs by grade
 */
const HARDCODED_ECE_MAP = {
  'jk': 'Saniya Suleman',
  'sk': 'Saniya Suleman',
  'sk1': 'Saniya Suleman',
  'sk2': 'Saniya Suleman',
}

/**
 * Normalize grade for matching
 */
const normalizeGrade = (grade) => {
  if (!grade) return ''
  const gradeStr = grade.toString().trim().toLowerCase()
  
  if (gradeStr.includes('jk') || gradeStr === 'junior kindergarten') {
    return 'jk'
  }
  
  if (gradeStr.includes('sk')) {
    const skMatch = gradeStr.match(/sk\d*/i)
    if (skMatch) {
      return skMatch[0].toLowerCase()
    }
    return 'sk'
  }
  
  return gradeStr
}

/**
 * Extract ECE name from course data (handles multiple formats)
 */
const extractECEName = (courseData) => {
  if (!courseData) return ''

  // Format 1: ece object with name
  if (courseData.ece && courseData.ece.name) {
    return courseData.ece.name
  }

  // Format 2: ece as string
  if (typeof courseData.ece === 'string' && courseData.ece.trim()) {
    return courseData.ece.trim()
  }

  // Format 3: eces array
  if (Array.isArray(courseData.eces) && courseData.eces.length > 0) {
    const ece = courseData.eces[0]
    if (typeof ece === 'string') {
      return ece
    }
    if (ece.name) {
      return ece.name
    }
  }

  return ''
}

/**
 * Pick the "best" course from a list of candidate courses for a student.
 * Prefer homeroom-labeled courses, then grade-matching courses, then first.
 */
const pickBestCourse = (courses, normalizedGrade) => {
  if (!Array.isArray(courses) || courses.length === 0) return null

  const grade = (normalizedGrade || '').toString().toLowerCase()

  const scoreCourse = (courseData) => {
    const name = (courseData?.name || courseData?.title || '').toString().toLowerCase()
    const courseGrade = (courseData?.grade || courseData?.gradeLevel || '').toString().toLowerCase()

    let score = 0
    if (name.includes('homeroom') || name.includes('home room')) score += 100
    if (courseGrade === grade) score += 50
    if (grade && name.includes(grade)) score += 20

    // Special: numeric grade matching like "grade 1"
    if (/^\d+$/.test(grade)) {
      const gradePattern = new RegExp(`grade\\s*${grade}|grade${grade}`, 'i')
      if (gradePattern.test(name)) score += 30
    }

    // Special handling for SK variants - need exact match
    if (grade.startsWith('sk')) {
      const courseSKMatch = name.match(/sk\d*/i) || courseGrade.match(/sk\d*/i)
      const studentSKMatch = grade.match(/sk\d*/i)
      
      if (courseSKMatch && studentSKMatch) {
        // Only match if SK variants match exactly (sk1 matches sk1, sk2 matches sk2)
        if (courseSKMatch[0].toLowerCase() === studentSKMatch[0].toLowerCase()) {
          score += 40 // Bonus for exact SK match
        } else {
          score -= 50 // Penalty for mismatched SK (e.g., sk1 vs sk2)
        }
      }
      
      // Also check teacher name in course for SK distinction
      const courseName = (courseData?.name || courseData?.title || '').toLowerCase()
      if (grade === 'sk1' && (courseName.includes('rafia') || courseName.includes('tr. rafia'))) {
        score += 30
      }
      if (grade === 'sk2' && (courseName.includes('huda') || courseName.includes('tr. huda'))) {
        score += 30
      }
    }

    // Prefer active/non-archived if present (sometimes archived is missing)
    if (courseData?.archived === false) score += 10

    return score
  }

  const sorted = [...courses].sort((a, b) => scoreCourse(b) - scoreCourse(a))
  return sorted[0]
}

/**
 * Get ECE name for a student from their homeroom course
 * @param {Object} student - Student object with grade/program information and id
 * @returns {Promise<string>} ECE name or empty string if not found
 */
export const getECEName = async (student) => {
  if (!student) return ''

  try {
    // Get student's grade/program
    const grade = student.grade || student.program || ''
    if (!grade) {
      console.log('No grade found for student:', student.fullName)
      return ''
    }

    // Normalize grade
    const normalizedGrade = normalizeGrade(grade)
    if (!normalizedGrade) {
      console.log('Could not normalize grade for student:', student.fullName, grade)
      return ''
    }

    const studentId = student.id || student.studentId || student.studentID
    const coursesRef = collection(firestore, 'courses')

    // 1) BEST PATH: find the student's enrolled course first (most reliable in real data)
    // This ensures we get the correct SK1 vs SK2 course for the student
    if (studentId) {
      try {
        // Try enrolledList first
        const enrolledListQuery = query(coursesRef, where('enrolledList', 'array-contains', studentId))
        const enrolledListSnap = await getDocs(enrolledListQuery)

        let candidateCourses = enrolledListSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

        // If none, try legacy "students" array
        if (candidateCourses.length === 0) {
          const studentsArrayQuery = query(coursesRef, where('students', 'array-contains', studentId))
          const studentsArraySnap = await getDocs(studentsArrayQuery)
          candidateCourses = studentsArraySnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        }

        // Filter archived in-memory (some docs don't have archived)
        candidateCourses = candidateCourses.filter((c) => c.archived !== true)

        if (candidateCourses.length > 0) {
          console.log(`📚 Found ${candidateCourses.length} enrolled course(s) for ${student.fullName}`)
          const bestCourse = pickBestCourse(candidateCourses, normalizedGrade)
          
          if (bestCourse) {
            console.log(`🎯 Best course selected for ECE lookup:`, {
              id: bestCourse.id,
              name: bestCourse.name || bestCourse.title,
              grade: bestCourse.grade || bestCourse.gradeLevel,
            })
            
            const eceName = extractECEName(bestCourse)
            if (eceName) {
              console.log(`✅ Found ECE via enrolled course for ${student.fullName} (${grade}): ${eceName} (course: ${bestCourse.name || bestCourse.id})`)
              return eceName
            }
            console.warn(`⚠️ Enrolled course found for ${student.fullName} (${grade}) but no ECE in course. Best course:`, {
              id: bestCourse.id,
              name: bestCourse.name || bestCourse.title,
              ece: bestCourse.ece
            })
          }
        } else {
          console.log(`ℹ️ No enrolled courses found for ${student.fullName} (${grade}). Falling back to grade-based lookup.`)
        }
      } catch (error) {
        console.error('Error querying enrolled courses:', error)
      }
    }

    // 2) FALLBACK PATH: find homeroom course by grade matching
    // This is less reliable but works when student enrollment data is missing
    const coursesQuery = query(
      coursesRef,
      where('archived', '==', false)
    )
    
    const coursesSnapshot = await getDocs(coursesQuery)
    
    // Find matching homeroom courses
    const candidateCourses = []
    coursesSnapshot.forEach((doc) => {
      const courseData = doc.data()
      const courseName = (courseData.name || courseData.title || '').toLowerCase()
      const courseGrade = (courseData.grade || courseData.gradeLevel || '').toString().toLowerCase()
      
      // Check if it's a homeroom course
      const isHomeroom = courseName.includes('homeroom') || courseName.includes('home room')
      if (!isHomeroom) return
      
      // Match by grade field (exact match)
      if (courseGrade === normalizedGrade) {
        candidateCourses.push({ id: doc.id, ...courseData })
        return
      }
      
      // Match by course name (e.g., "Homeroom Grade 1", "Homeroom SK1", "Homeroom Grade 7")
      if (courseName.includes(normalizedGrade)) {
        // Special handling for SK variants - need exact match
        if (normalizedGrade.startsWith('sk')) {
          // Extract SK variant from course
          const courseSKMatch = courseName.match(/sk\d*/i) || courseGrade.match(/sk\d*/i)
          const studentSKMatch = normalizedGrade.match(/sk\d*/i)
          
          if (courseSKMatch && studentSKMatch) {
            // Only match if SK variants match exactly (sk1 matches sk1, sk2 matches sk2)
            if (courseSKMatch[0].toLowerCase() === studentSKMatch[0].toLowerCase()) {
              candidateCourses.push({ id: doc.id, ...courseData })
              return
            }
          }
          // Don't match if SK variants don't match
          return
        } else {
          // For non-SK grades, simple inclusion match is fine
          candidateCourses.push({ id: doc.id, ...courseData })
          return
        }
      }
      
      // Special handling for numeric grades (1-8)
      // Match "Homeroom Grade 7" with "7", "Homeroom Grade 8" with "8", etc.
      if (/^\d+$/.test(normalizedGrade)) {
        // Check if course name contains "grade X" or "gradeX" where X matches normalizedGrade
        const gradePattern = new RegExp(`grade\\s*${normalizedGrade}|grade${normalizedGrade}`, 'i')
        if (gradePattern.test(courseName)) {
          candidateCourses.push({ id: doc.id, ...courseData })
          return
        }
      }
    })

    // Pick the best course from candidates
    if (candidateCourses.length > 0) {
      const bestCourse = pickBestCourse(candidateCourses, normalizedGrade)
      if (bestCourse) {
        const eceName = extractECEName(bestCourse)
        if (eceName) {
          console.log(`✅ Found ECE via grade-based lookup for ${student.fullName} (${grade}): ${eceName} from course: ${bestCourse.id}`)
          return eceName
        }
        console.log(`No ECE found in homeroom course for grade: ${grade} (course: ${bestCourse.id})`)
      }
    } else {
      console.log(`No homeroom course found for grade: ${grade} (normalized: ${normalizedGrade})`)
    }

    // Fallback to hardcoded mapping
    const fallbackECE = HARDCODED_ECE_MAP[normalizedGrade.toLowerCase()]
    if (fallbackECE) {
      console.log(`Using hardcoded fallback ECE for ${student.fullName} (${grade}): ${fallbackECE}`)
      return fallbackECE
    }

    console.log(`No ECE mapping found for grade: ${grade} (normalized: ${normalizedGrade})`)
    return ''
  } catch (error) {
    console.error('Error fetching ECE:', error)
    
    // Fallback to hardcoded mapping on error
    const grade = student.grade || student.program || ''
    if (grade) {
      const normalizedGrade = normalizeGrade(grade)
      const fallbackECE = HARDCODED_ECE_MAP[normalizedGrade?.toLowerCase()]
      if (fallbackECE) {
        console.log(`Using hardcoded fallback ECE (error case) for ${student.fullName} (${grade}): ${fallbackECE}`)
        return fallbackECE
      }
    }
    
    return ''
  }
}

