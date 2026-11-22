import React from 'react'
import { CFormLabel, CFormSelect } from '@coreui/react'

export const gradeLabel = (grade) =>
  grade ? (/grade|kindergarten|^jk$|^sk$/i.test(grade) ? grade : `Grade ${grade}`) : ''
export const childLabel = (child) => {
  const grade = gradeLabel(child.grade)
  return grade ? `${child.name} · ${grade}` : child.name
}

// Shows the selected child. With more than one linked child, lets the parent switch;
// the choice is shared by Attendance and Report Cards.
const ChildSelector = ({ options, selected, onSelect }) => {
  if (!selected) return null
  if (options.length < 2) return <p className="mb-4 fw-semibold">{childLabel(selected)}</p>
  return (
    <div className="parent-child-selector mb-4">
      <CFormLabel htmlFor="parent-child-select">Child</CFormLabel>
      <CFormSelect id="parent-child-select" value={selected.id} onChange={(event) => onSelect(event.target.value)}>
        {options.map((child) => <option key={child.id} value={child.id}>{childLabel(child)}</option>)}
      </CFormSelect>
    </div>
  )
}

export default ChildSelector
