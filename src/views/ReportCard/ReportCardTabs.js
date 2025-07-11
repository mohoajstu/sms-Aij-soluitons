import React, { useState } from 'react'
import './reportCardTabs.css'
import ReportCard from './utils'
import PastReportCardsTable from './PastReportCardsTable'
import useAuth from '../../Firebase/useAuth'

/**
 * Tabbed navigation for the report-card section.
 *  - "Create Report Card": the existing generator UI
 *  - "Past Report Cards": table listing previously generated PDFs
 *
 * This mirrors the UX of the attendance tabs to keep the design consistent.
 */
const ReportCardTabs = () => {
  // 0 = generator, 1 = archive
  const [activeTab, setActiveTab] = useState(0)
  const { role } = useAuth()

  return (
    <div className="rc-container">
      {/* Navigation */}
      <div className="rc-tab-wrapper">
        <div className="rc-tab-navigation">
          {/* Teachers (and admins) can create; parents only see archive */}
          {role !== 'parent' && (
            <>
              <div
                className={`rc-tab-link ${activeTab === 0 ? 'rc-active' : ''}`}
                onClick={() => setActiveTab(0)}
              >
                Create Report Card
              </div>
              <div className="rc-tab-separator"></div>
            </>
          )}
          <div
            className={`rc-tab-link ${activeTab === 1 ? 'rc-active' : ''}`}
            onClick={() => setActiveTab(1)}
          >
            Past Report Cards
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="rc-tab-content">
        {role !== 'parent' && activeTab === 0 && <ReportCard />}
        {activeTab === 1 && <PastReportCardsTable />}
      </div>
    </div>
  )
}

export default ReportCardTabs 