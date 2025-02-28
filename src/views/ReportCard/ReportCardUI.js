import React, { useState } from 'react';
import { CNav, CNavItem, CNavLink, CTabContent, CTabPane } from '@coreui/react';
import ReportCardPage from './ReportCardPage';
import classData from '../../Data/Classes.json';

const ReportCardUI = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [selectedSemester, setSelectedSemester] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    return (
        <div className="content-wrapper">

            {/* Tab Navigation */}
            <CNav variant="tabs" className="nav-tabs-container">
                <CNavItem>
                    <CNavLink 
                        active={activeTab === 0} 
                        onClick={() => setActiveTab(0)}
                        className={activeTab === 0 ? "active-tab" : ""}
                    >
                        Generate Report Card
                    </CNavLink>
                </CNavItem>
                 {/* Separator */}
        <span
          style={{
            fontSize: '18px',
            color: '#000',
            padding: '0 15px',
            alignSelf: 'center',
          }}
        ></span>
                <CNavItem>
                    <CNavLink 
                        active={activeTab === 1} 
                        onClick={() => setActiveTab(1)}
                        className={activeTab === 1 ? "active-tab" : ""}
                    >
                        Report Card History
                    </CNavLink>
                </CNavItem>
            </CNav>

            {/* Tab Content */}
            <CTabContent className="tab-content-container">
                <CTabPane visible={activeTab === 0} className="tab-pane">
                    {!selectedStudent ? (
                        <div className="selection-form">
                            <div className="form-group">
                                <label className="form-label">Select Semester:</label>
                                <div className="select-container">
                                    <select 
                                        value={selectedSemester}
                                        onChange={(e) => {
                                            setSelectedSemester(e.target.value);
                                            setSelectedSection('');
                                            setSelectedStudent('');
                                        }}
                                        className="form-select"
                                    >
                                        <option value="" disabled>Select Semester</option>
                                        {Object.keys(classData).map((className) => (
                                            <option key={className} value={className}>{className}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Select Section:</label>
                                <div className="select-container">
                                    <select
                                        value={selectedSection}
                                        onChange={(e) => {
                                            setSelectedSection(e.target.value);
                                            setSelectedStudent('');
                                        }}
                                        className="form-select"
                                        disabled={!selectedSemester}
                                    >
                                        <option value="" disabled>Select Section</option>
                                        {selectedSemester && Object.keys(classData[selectedSemester]).map((sectionName) => (
                                            <option key={sectionName} value={sectionName}>{sectionName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Select Student:</label>
                                <div className="select-container">
                                    <select
                                        value={selectedStudent}
                                        onChange={(e) => setSelectedStudent(e.target.value)}
                                        className="form-select"
                                        disabled={!selectedSection}
                                    >
                                        <option value="" disabled>Select Student</option>
                                        {selectedSection && classData[selectedSemester][selectedSection].students.map((student) => (
                                            <option key={student} value={student}>{student}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <ReportCardPage pdfSource={null} />
                    )}
                </CTabPane>
                <CTabPane visible={activeTab === 1} className="tab-pane">
                    <div className="history-container">
                        <h3>Report Card History</h3>
                        <p>No previous report cards found.</p>
                    </div>
                </CTabPane>
            </CTabContent>
        </div>
    );
};

export default ReportCardUI;