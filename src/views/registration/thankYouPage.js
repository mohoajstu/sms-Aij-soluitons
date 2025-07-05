
import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import './thankYouPage.css';

const ThankYouPage = () => {
  return (
    <div className="thank-you-page-container">
      <div className="thank-you-card">
        <div className="thank-you-card-header">
          <h1 className="thank-you-card-header-title">Registration Submitted</h1>
        </div>
        <div className="thank-you-card-body">
          <CheckCircle className="thank-you-icon" />
          <h2 className="thank-you-title">Thank You!</h2>
          <p className="thank-you-text">
            Your registration application has been successfully submitted. We will review your
            application and get back to you soon.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage; 