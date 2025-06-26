import React, { useState, useEffect } from 'react'
import { Autocomplete, TextField, CircularProgress } from '@mui/material'
import { collection, getDocs } from 'firebase/firestore'
import { firestore } from '../Firebase/firebase'

const ClassSelector = ({ value, onChange, ...props }) => {
  const [internalSelectedClass, setInternalSelectedClass] = useState(null)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true)
      try {
        const querySnapshot = await getDocs(collection(firestore, 'courses'))
        const classOptions = querySnapshot.docs.map(doc => ({
          id: doc.id,
          label: doc.data().title || doc.id,
          ...doc.data(),
        }))
        setClasses(classOptions)
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
