import React from 'react';
import DynamicReportCardForm from './DynamicReportCardForm';
import elementary7to8ProgressFields from '../Fields/7-8-elementary-progress.json';

const Elementary7to8ProgressUI = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <DynamicReportCardForm fields={elementary7to8ProgressFields} />
    </div>
  );
};

export default Elementary7to8ProgressUI; 