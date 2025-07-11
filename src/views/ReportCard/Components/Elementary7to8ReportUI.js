import React from 'react';
import DynamicReportCardForm from './DynamicReportCardForm';
import elementary7to8ReportFields from '../Fields/7-8-elementary-report.json';

const Elementary7to8ReportUI = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <DynamicReportCardForm fields={elementary7to8ReportFields} />
    </div>
  );
};

export default Elementary7to8ReportUI; 