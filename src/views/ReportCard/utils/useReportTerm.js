import { useCallback, useRef, useState } from 'react'

export const normalizeDefaultTerm = (value) => value === 'term2' ? 'term2' : 'term1'

// A late settings response must never switch a user's selection or an opened draft.
export const useReportTerm = () => {
  const [selectedTerm, updateTerm] = useState('term1')
  const selectedExplicitly = useRef(false)
  const setSelectedTerm = useCallback((term) => {
    selectedExplicitly.current = true
    updateTerm(term)
  }, [])
  const applyDefaultTerm = useCallback((term) => {
    if (!selectedExplicitly.current) updateTerm(normalizeDefaultTerm(term))
  }, [])
  return { selectedTerm, setSelectedTerm, applyDefaultTerm }
}
