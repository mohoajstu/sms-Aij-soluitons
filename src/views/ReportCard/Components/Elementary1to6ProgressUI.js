import React from 'react';
import DynamicReportCardForm from './DynamicReportCardForm';
import elementary1to6ProgressFields from '../Fields/1-6-elementary-progress.json';

const Elementary1to6ProgressUI = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <DynamicReportCardForm fields={elementary1to6ProgressFields} />
    </div>
  );
};

export default Elementary1to6ProgressUI; 