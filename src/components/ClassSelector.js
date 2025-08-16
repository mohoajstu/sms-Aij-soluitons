import React, { useState, useEffect } from 'react'
import { Autocomplete, TextField, CircularProgress } from '@mui/material'
import { collection, getDocs } from 'firebase/firestore'
import { firestore } from '../Firebase/firebase'

const ClassSelector = ({ value, onChange, ...props }) => {
  const [internalSelectedClass, setInternalSelectedClass] = useState(null)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  // Define homeroom class patterns
  const homeroomPatterns = [
    /^jk$/i,                    // JK
    /^sk.*rafia$/i,            // SK - Tr. Rafia
    /^sk.*huda$/i,             // SK - Tr. Huda
    /^homeroom\s+junior\s+kindergarten$/i,  // HomeRoom Junior Kindergarten
    /^homeroom\s+senior\s+kindergarten$/i,  // HomeRoom Senior Kindergarten
    /^homeroom\s+grade\s*[1-8]$/i,  // HomeRoom Grade 1-8
  ]

  // Function to check if a class is a homeroom class
  const isHomeroomClass = (classData) => {
    const title = classData.title || classData.name || ''
    const gradeLevel = classData.gradeLevel || ''
    
    // Check title patterns
    for (const pattern of homeroomPatterns) {
      if (pattern.test(title)) {
        return true
      }
    }
    
    // Check grade level patterns
    for (const pattern of homeroomPatterns) {
      if (pattern.test(gradeLevel)) {
        return true
      }
    }
    
    return false
  }

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true)
      try {
        const querySnapshot = await getDocs(collection(firestore, 'courses'))
        const allClassOptions = querySnapshot.docs.map((doc) => {
          const data = doc.data()
          const baseTitle = data.title || doc.id
          
          // Include teacher information in the label if available
          let label = baseTitle
          if (data.teachers && data.teachers.length > 0) {
            const teacherNames = Array.isArray(data.teachers) 
              ? data.teachers.map(t => typeof t === 'string' ? t : t.name || t).join(', ')
              : data.teachers
            label = `${baseTitle} (${teacherNames})`
          } else if (data.teacher && Array.isArray(data.teacher)) {
            const teacherNames = data.teacher.map(t => typeof t === 'string' ? t : t.name || t).join(', ')
            label = `${baseTitle} (${teacherNames})`
          }
          
          return {
            id: doc.id,
            label: label,
            ...data,
          }
        })
        
        // Filter to only homeroom classes
        const homeroomClasses = allClassOptions.filter(isHomeroomClass)
        
        console.log('ClassSelector: Found', allClassOptions.length, 'total classes')
        console.log('ClassSelector: Filtered to', homeroomClasses.length, 'homeroom classes')
        console.log('ClassSelector: Homeroom classes:', homeroomClasses.map(c => c.label))
        
        setClasses(homeroomClasses)
      } catch (error) {
        setClasses([])
        console.error('Error fetching classes:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchClasses()
  }, [])

  const handleChange = (event, newValue) => {
    if (onChange) {
      onChange(event, newValue)
    } else {
      setInternalSelectedClass(newValue)
    }
  }

  return (
    <div className="autocomplete-container">
      <Autocomplete
        options={classes}
        getOptionLabel={(option) => option.label}
        value={value !== undefined ? value : internalSelectedClass}
        onChange={handleChange}
        className="autocomplete-input"
        loading={loading}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            fullWidth
            label="Select a class"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        sx={{ width: 300, backgroundColor: '#FFFFFF' }}
        {...props}
      />
    </div>
  )
}

export default ClassSelector
