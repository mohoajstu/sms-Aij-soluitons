import React from 'react'
import { Link } from 'react-router-dom'
import './thankYouPage.css'

function ThankYouPage() {
  return (
    <div className="thank-you-container">
      <h1>Thank You!</h1>
      <p>Your child's registration has been received. We will contact you soon.</p>
      <Link to="/registration" className="home-link">
        Go Back to Registration
      </Link>
    </div>
  )
}

export default ThankYouPage
