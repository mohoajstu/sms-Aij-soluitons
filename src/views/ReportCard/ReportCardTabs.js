import React, { useState, useEffect } from 'react'
import './reportCardTabs.css'
import ReportCard from './utils'
import PastReportCardsTable from './PastReportCardsTable'
import AdminReportCardReview from './Components/AdminReportCardReview'
import TeacherReportProgress from './Components/TeacherReportProgress'
import useAuth from '../../Firebase/useAuth'

/**
 * Tabbed navigation for the report-card section.
 *  - "Create Report Card": the existing generator UI
 *  - "Past Report Cards": table listing previously generated PDFs
 *
 * This mirrors the UX of the attendance tabs to keep the design consistent.
 */
const ReportCardTabs = () => {
  // 0 = generator, 1 = archive, 2 = progress, 3 = admin review
  const [activeTab, setActiveTab] = useState(0)
  const { role, user } = useAuth()

  // Listen for navigation events from other components
  useEffect(() => {
    const handleNavigate = (event) => {
      if (event.detail && typeof event.detail.tab === 'number') {
        setActiveTab(event.detail.tab)
      }
    }

    window.addEventListener('navigateToReportCard', handleNavigate)
    return () => window.removeEventListener('navigateToReportCard', handleNavigate)
  }, [])

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
          {role !== 'parent' && (
            <>
              <div className="rc-tab-separator"></div>
              <div
                className={`rc-tab-link ${activeTab === 2 ? 'rc-active' : ''}`}
                onClick={() => setActiveTab(2)}
              >
                My Progress
              </div>
            </>
          )}
          {role === 'admin' && (
            <>
              <div className="rc-tab-separator"></div>
              <div
                className={`rc-tab-link ${activeTab === 3 ? 'rc-active' : ''}`}
                onClick={() => setActiveTab(3)}
              >
                Admin Review
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="rc-tab-content">
        {role !== 'parent' && activeTab === 0 && <ReportCard />}
        {activeTab === 1 && <PastReportCardsTable onEditDraft={() => setActiveTab(0)} />}
        {role !== 'parent' && activeTab === 2 && <TeacherReportProgress />}
        {role === 'admin' && activeTab === 3 && <AdminReportCardReview />}
      </div>
    </div>
  )
}

export default ReportCardTabs
