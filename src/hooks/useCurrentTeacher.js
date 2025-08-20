import { useState, useEffect } from 'react'
import { auth, firestore } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

const useCurrentTeacher = () => {
  const [teacherName, setTeacherName] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(firestore, 'users', user.uid)
          const userDoc = await getDoc(userDocRef)

          if (userDoc.exists()) {
            const userData = userDoc.data()
            const firstName = userData.personalInfo?.firstName || userData.firstName || ''
            const lastName = userData.personalInfo?.lastName || userData.lastName || ''
            const fullName = `${firstName} ${lastName}`.trim()

            setTeacherName(fullName)
            setTeacherId(user.uid)
          }
        } catch (error) {
          console.error('Error fetching teacher data:', error)
          setTeacherName('')
          setTeacherId('')
        }
      } else {
        setTeacherName('')
        setTeacherId('')
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return { teacherName, teacherId, loading }
}

export default useCurrentTeacher
