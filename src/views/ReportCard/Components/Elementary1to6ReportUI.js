import React from 'react';
import DynamicReportCardForm from './DynamicReportCardForm';
import elementary1to6ReportFields from '../Fields/1-6-elementary-report.json';

const Elementary1to6ReportUI = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <DynamicReportCardForm fields={elementary1to6ReportFields} />
    </div>
  );
};

export default Elementary1to6ReportUI; 