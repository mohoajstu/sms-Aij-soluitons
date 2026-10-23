import React, { useId } from 'react'
import PropTypes from 'prop-types'

const ReportScopeFilter = ({ scope }) => {
  const id = useId()
  return <div className="d-flex flex-wrap align-items-end gap-3 mb-3">
    <div>
      <label className="form-label" htmlFor={`${id}-year`}>School year</label>
      <select className="form-select" id={`${id}-year`} disabled={!scope.ready}
        value={scope.year} onChange={(e) => scope.setYear(e.target.value)}>
        {scope.years.map((year) => <option key={year} value={year}>
          {year === 'unknown' ? 'Year not recorded' : year}{year === scope.current.label ? ' (current)' : ''}
        </option>)}
      </select>
    </div>
    <div>
      <label className="form-label" htmlFor={`${id}-term`}>Term</label>
      <select className="form-select" id={`${id}-term`} disabled={!scope.ready}
        value={scope.term} onChange={(e) => scope.setTerm(e.target.value)}>
        <option value="term1">Term 1</option><option value="term2">Term 2</option>
        <option value="all">All terms in this year</option><option value="unknown">Term not recorded</option>
      </select>
    </div>
    <p className="text-body-secondary mb-1" role="status">
      {scope.ready ? `${scope.records.length} report(s) in this school year and term. Earlier reports remain in their own school year.` : 'Loading reporting period…'}
    </p>
  </div>
}
ReportScopeFilter.propTypes = { scope: PropTypes.object.isRequired }
export default ReportScopeFilter
