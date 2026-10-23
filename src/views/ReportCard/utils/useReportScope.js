import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '../../../Firebase/firebase'
import { computeDefaultSchoolYear, fetchSchoolYearSettings } from './schoolYear'
import { normalizeDefaultTerm } from './useReportTerm'
import { getReportYear, matchesReportScope } from './reportScope'

export const useReportScope = (records) => {
  const [current, setCurrent] = useState(computeDefaultSchoolYear)
  const [year, setYear] = useState(() => computeDefaultSchoolYear().label)
  const [term, setTerm] = useState('term1')
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let active = true
    Promise.all([fetchSchoolYearSettings(firestore), getDoc(doc(firestore, 'systemSettings', 'reportCardSms'))])
      .then(([info, settings]) => {
        if (!active) return
        setCurrent(info); setYear(info.label)
        setTerm(normalizeDefaultTerm(settings.exists() ? settings.data().defaultTerm : null))
      }).catch(() => {}).finally(() => { if (active) setReady(true) })
    return () => { active = false }
  }, [])
  const years = [...new Set([current.label, ...records.map((r) => getReportYear(r, current))])].sort().reverse()
  return { current, year, term, setYear, setTerm, years, ready,
    records: ready ? records.filter((r) => matchesReportScope(r, year, term, current)) : [] }
}
