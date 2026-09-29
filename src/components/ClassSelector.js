import React, { useState, useEffect } from 'react'
import { Autocomplete, TextField, CircularProgress } from '@mui/material'
import { collection, getDocs } from 'firebase/firestore'
import { firestore } from '../Firebase/firebase'
import { isHomeroomClass } from './classSelection'

const ClassSelector = ({ value, onChange, ...props }) => {
  const [internalSelectedClass, setInternalSelectedClass] = useState(null)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

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
        
        // Filter to only active (non-archived) homeroom classes
        const activeClasses = allClassOptions.filter(course => !course.archived)
        const homeroomClasses = activeClasses.filter(isHomeroomClass)
        
        console.log('ClassSelector: Found', allClassOptions.length, 'total classes')
        console.log('ClassSelector: Found', activeClasses.length, 'active classes')
        console.log('ClassSelector: Filtered to', homeroomClasses.length, 'active homeroom classes')
        console.log('ClassSelector: Active homeroom classes:', homeroomClasses.map(c => c.label))
        
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
