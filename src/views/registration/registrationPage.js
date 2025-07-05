
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, Phone, CreditCard, FileText } from 'lucide-react';
import FileUpload from 'src/components/FileUpload';
import './registrationPage.css';

const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    schoolYear: '2025',
    grade: '',
    firstName: '',
    nickName: '',
    middleName: '',
    lastName: '',
    gender: '',
    oen: '',
    dateOfBirth: '',
    previousSchool: '',
    allergies: '',
    photoPermission: '',
    primaryPhone: '',
    emergencyPhone: '',
    primaryEmail: '',
    studentAddress: '',
    motherFirstName: '',
    motherNickName: '',
    motherMiddleName: '',
    motherLastName: '',
    motherContactSame: false,
    motherPhone: '',
    motherEmail: '',
    motherAddressSame: false,
    motherAddress: '',
    fatherFirstName: '',
    fatherNickName: '',
    fatherMiddleName: '',
    fatherLastName: '',
    fatherContactSame: false,
    fatherPhone: '',
    fatherEmail: '',
    fatherAddressSame: false,
    fatherAddress: '',
    paymentMethod: 'cash',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: '',
    billingCity: '',
    billingProvince: '',
    billingPostalCode: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState({
    immunization: null,
    reportCard: null,
    osrPermission: null,
    governmentId: null,
  });

  const navigate = useNavigate();

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (type, file) => {
    setUploadedFiles((prev) => ({ ...prev, [type]: file }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    console.log('Uploaded files:', uploadedFiles);
    // Redirect to thank you page
    navigate('/registration/thankYouPage');
  };

  useEffect(() => {
    if (formData.motherContactSame) {
      setFormData((prev) => ({
        ...prev,
        motherPhone: prev.primaryPhone,
        motherEmail: prev.primaryEmail,
      }));
    }
  }, [formData.motherContactSame, formData.primaryPhone, formData.primaryEmail]);

  useEffect(() => {
    if (formData.motherAddressSame) {
      setFormData((prev) => ({
        ...prev,
        motherAddress: prev.studentAddress,
      }));
    }
  }, [formData.motherAddressSame, formData.studentAddress]);

  useEffect(() => {
    if (formData.fatherContactSame) {
      setFormData((prev) => ({
        ...prev,
        fatherPhone: prev.primaryPhone,
        fatherEmail: prev.primaryEmail,
      }));
    }
  }, [formData.fatherContactSame, formData.primaryPhone, formData.primaryEmail]);

  useEffect(() => {
    if (formData.fatherAddressSame) {
      setFormData((prev) => ({
        ...prev,
        fatherAddress: prev.studentAddress,
      }));
    }
  }, [formData.fatherAddressSame, formData.studentAddress]);

  return (
    <div className="registration-form-container">
      <div className="registration-form">
        <div className="form-header">
          <div className="form-header-logo-container">
            <div className="form-header-logo">
              <span className="form-header-logo-text">TLA</span>
              </div>
            <div className="form-header-title-container">
              <h1 className="form-header-title">TARBIYAH LEARNING ACADEMY</h1>
              <p className="form-header-subtitle">Elementary School Registration</p>
            </div>
          </div>
      </div>

        <form onSubmit={handleSubmit}>
          {/* Application Information */}
          <div className="form-card">
            <div className="form-card-header">
              <h2 className="form-card-title">
                <Calendar className="w-5 h-5" />
                Application Information
              </h2>
            </div>
            <div className="form-card-content">
              <div className="form-grid grid-cols-1 md-grid-cols-2">
                <div>
                  <label htmlFor="schoolYear" className="form-label">
                    Application for School Year Beginning*
                  </label>
                  <select
                  id="schoolYear"
                    className="form-select"
                    value={formData.schoolYear}
                    onChange={(e) => handleInputChange('schoolYear', e.target.value)}
                  >
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                  </select>
              </div>
                <div>
                  <label htmlFor="grade" className="form-label">
                    Grade Applied For*
                  </label>
                <select
                    id="grade"
                    className="form-select"
                    value={formData.grade}
                    onChange={(e) => handleInputChange('grade', e.target.value)}
                    required
                  >
                    <option value="">Select grade</option>
                  <option>Grade 1</option>
                  <option>Grade 2</option>
                  <option>Grade 3</option>
                  <option>Grade 4</option>
                  <option>Grade 5</option>
                  <option>Grade 6</option>
                  <option>Grade 7</option>
                  <option>Grade 8</option>
                </select>
              </div>
            </div>
            </div>
              </div>

          {/* Student Details */}
          <div className="form-card">
            <div className="form-card-header">
              <h2 className="form-card-title">
                <User className="w-5 h-5" />
                Student Details
              </h2>
            </div>
            <div className="form-card-content">
              <div className="form-grid grid-cols-1 lg-grid-cols-3">
                <div>
                  <label htmlFor="firstName" className="form-label">First Name*</label>
                  <input type="text" id="firstName" className="form-input" value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="nickName" className="form-label">Nick Name</label>
                  <input type="text" id="nickName" className="form-input" value={formData.nickName} onChange={(e) => handleInputChange('nickName', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="middleName" className="form-label">Middle Name</label>
                  <input type="text" id="middleName" className="form-input" value={formData.middleName} onChange={(e) => handleInputChange('middleName', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="lastName" className="form-label">Last Name*</label>
                  <input type="text" id="lastName" className="form-input" value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="gender" className="form-label">Gender*</label>
                  <select id="gender" className="form-select" value={formData.gender} onChange={(e) => handleInputChange('gender', e.target.value)} required>
                    <option value="">Select gender</option>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="oen" className="form-label">Ontario Education Number (OEN)</label>
                  <input type="text" id="oen" className="form-input" value={formData.oen} onChange={(e) => handleInputChange('oen', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="dateOfBirth" className="form-label">Student Date Of Birth*</label>
                  <input type="date" id="dateOfBirth" className="form-input" value={formData.dateOfBirth} onChange={(e) => handleInputChange('dateOfBirth', e.target.value)} required />
                </div>
              </div>
              <div className="form-grid grid-cols-1 md-grid-cols-2">
                <div>
                  <label htmlFor="previousSchool" className="form-label">Previous School and Address</label>
                  <textarea id="previousSchool" className="form-textarea" value={formData.previousSchool} onChange={(e) => handleInputChange('previousSchool', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="allergies" className="form-label">Any Allergies?</label>
                  <textarea id="allergies" className="form-textarea" value={formData.allergies} onChange={(e) => handleInputChange('allergies', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="form-label">Grant permission to photograph your child?</label>
                <div className="form-radio-group">
                  <div className="form-radio-item">
                    <input type="radio" id="photo-yes" name="photoPermission" value="yes" className="form-radio" onChange={(e) => handleInputChange('photoPermission', e.target.value)} checked={formData.photoPermission === 'yes'} />
                    <label htmlFor="photo-yes">Yes</label>
                  </div>
                  <div className="form-radio-item">
                    <input type="radio" id="photo-no" name="photoPermission" value="no" className="form-radio" onChange={(e) => handleInputChange('photoPermission', e.target.value)} checked={formData.photoPermission === 'no'} />
                    <label htmlFor="photo-no">No</label>
            </div>
              </div>
              </div>
            </div>
            </div>

          {/* Student Contact Details */}
          <div className="form-card">
            <div className="form-card-header">
                <h2 className="form-card-title">
                    <Phone className="w-5 h-5" />
                    Student Contact Details
                </h2>
            </div>
            <div className="form-card-content">
                <div className="form-grid grid-cols-1 md-grid-cols-2">
                    <div>
                        <label htmlFor="primaryPhone" className="form-label">Primary Contact Phone*</label>
                        <input type="tel" id="primaryPhone" className="form-input" value={formData.primaryPhone} onChange={e => handleInputChange('primaryPhone', e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="emergencyPhone" className="form-label">Emergency Phone*</label>
                        <input type="tel" id="emergencyPhone" className="form-input" value={formData.emergencyPhone} onChange={e => handleInputChange('emergencyPhone', e.target.value)} required />
                        <p className="form-info-text">This cannot be a Parent/Guardian number. Used only when the parent or guardian cannot be reached.</p>
            </div>
                    <div className="md-col-span-2">
                        <label htmlFor="primaryEmail" className="form-label">Primary Contact Email*</label>
                        <input type="email" id="primaryEmail" className="form-input" value={formData.primaryEmail} onChange={e => handleInputChange('primaryEmail', e.target.value)} required />
            </div>
              </div>
                <div>
                    <label htmlFor="studentAddress" className="form-label">Address*</label>
                    <textarea id="studentAddress" className="form-textarea" value={formData.studentAddress} onChange={e => handleInputChange('studentAddress', e.target.value)} required />
              </div>
            </div>
            </div>

          {/* Mother/Primary Guardian Details */}
          <div className="form-card">
              <div className="form-card-header">
                  <h2 className="form-card-title">
                      <User className="w-5 h-5" />
                      Mother/Primary Guardian Details
                  </h2>
                  <p className="form-card-subtitle">If the mother or father is NOT the primary guardian(s), please fill the Primary Guardian Details in the MOTHER section</p>
              </div>
              <div className="form-card-content">
                  <div className="form-grid grid-cols-1 md-grid-cols-2 lg-grid-cols-4">
                      <div>
                          <label htmlFor="motherFirstName" className="form-label">Mother First Name*</label>
                          <input type="text" id="motherFirstName" className="form-input" value={formData.motherFirstName} onChange={e => handleInputChange('motherFirstName', e.target.value)} required />
                      </div>
                      <div>
                          <label htmlFor="motherNickName" className="form-label">Mother Nick Name</label>
                          <input type="text" id="motherNickName" className="form-input" value={formData.motherNickName} onChange={e => handleInputChange('motherNickName', e.target.value)} />
                      </div>
                      <div>
                          <label htmlFor="motherMiddleName" className="form-label">Mother Middle Name</label>
                          <input type="text" id="motherMiddleName" className="form-input" value={formData.motherMiddleName} onChange={e => handleInputChange('motherMiddleName', e.target.value)} />
                      </div>
                      <div>
                          <label htmlFor="motherLastName" className="form-label">Mother Last Name*</label>
                          <input type="text" id="motherLastName" className="form-input" value={formData.motherLastName} onChange={e => handleInputChange('motherLastName', e.target.value)} required />
                      </div>
                  </div>
                  <div className="form-section-divider">
                      <h4 className="form-section-title">Mother Contact Details</h4>
                      <div className="form-checkbox-item">
                          <input type="checkbox" id="motherContactSame" className="form-checkbox" checked={formData.motherContactSame} onChange={e => handleInputChange('motherContactSame', e.target.checked)} />
                          <label htmlFor="motherContactSame">Mother Contact Details Same as Student?</label>
                      </div>
                      <div className="form-grid grid-cols-1 md-grid-cols-2" style={{marginTop: "1rem"}}>
                          <div>
                              <label htmlFor="motherPhone" className="form-label">Mother Primary Phone*</label>
                              <input type="tel" id="motherPhone" className="form-input" value={formData.motherPhone} onChange={e => handleInputChange('motherPhone', e.target.value)} required disabled={formData.motherContactSame} />
                          </div>
                          <div>
                              <label htmlFor="motherEmail" className="form-label">Mother Email*</label>
                              <input type="email" id="motherEmail" className="form-input" value={formData.motherEmail} onChange={e => handleInputChange('motherEmail', e.target.value)} required disabled={formData.motherContactSame} />
                          </div>
                      </div>
                  </div>
                  <div className="form-section-divider">
                      <h4 className="form-section-title">Mother Residential Details</h4>
                      <div className="form-checkbox-item">
                          <input type="checkbox" id="motherAddressSame" className="form-checkbox" checked={formData.motherAddressSame} onChange={e => handleInputChange('motherAddressSame', e.target.checked)} />
                          <label htmlFor="motherAddressSame">Mother Address Same as Student Address?</label>
                      </div>
                      <div style={{marginTop: "1rem"}}>
                          <label htmlFor="motherAddress" className="form-label">Mother Residential Address*</label>
                          <textarea id="motherAddress" className="form-textarea" value={formData.motherAddress} onChange={e => handleInputChange('motherAddress', e.target.value)} required disabled={formData.motherAddressSame} />
                      </div>
                  </div>
              </div>
            </div>

          {/* Father/Guardian Details */}
          <div className="form-card">
              <div className="form-card-header">
                  <h2 className="form-card-title">
                      <User className="w-5 h-5" />
                      Father/Guardian Details
                  </h2>
              </div>
              <div className="form-card-content">
                  <div className="form-grid grid-cols-1 md-grid-cols-2 lg-grid-cols-4">
                      <div>
                          <label htmlFor="fatherFirstName" className="form-label">Father First Name*</label>
                          <input type="text" id="fatherFirstName" className="form-input" value={formData.fatherFirstName} onChange={e => handleInputChange('fatherFirstName', e.target.value)} required />
                      </div>
                      <div>
                          <label htmlFor="fatherNickName" className="form-label">Father Nick Name</label>
                          <input type="text" id="fatherNickName" className="form-input" value={formData.fatherNickName} onChange={e => handleInputChange('fatherNickName', e.target.value)} />
                      </div>
                      <div>
                          <label htmlFor="fatherMiddleName" className="form-label">Father Middle Name</label>
                          <input type="text" id="fatherMiddleName" className="form-input" value={formData.fatherMiddleName} onChange={e => handleInputChange('fatherMiddleName', e.target.value)} />
                      </div>
                      <div>
                          <label htmlFor="fatherLastName" className="form-label">Father Last Name*</label>
                          <input type="text" id="fatherLastName" className="form-input" value={formData.fatherLastName} onChange={e => handleInputChange('fatherLastName', e.target.value)} required />
              </div>
            </div>
                  <div className="form-section-divider">
                      <h4 className="form-section-title">Father Contact Details</h4>
                      <div className="form-checkbox-item">
                          <input type="checkbox" id="fatherContactSame" className="form-checkbox" checked={formData.fatherContactSame} onChange={e => handleInputChange('fatherContactSame', e.target.checked)} />
                          <label htmlFor="fatherContactSame">Father Contact Details Same as Student?</label>
                      </div>
                      <div className="form-grid grid-cols-1 md-grid-cols-2" style={{marginTop: "1rem"}}>
                          <div>
                              <label htmlFor="fatherPhone" className="form-label">Father Primary Phone*</label>
                              <input type="tel" id="fatherPhone" className="form-input" value={formData.fatherPhone} onChange={e => handleInputChange('fatherPhone', e.target.value)} required disabled={formData.fatherContactSame} />
            </div>
                          <div>
                              <label htmlFor="fatherEmail" className="form-label">Father Email*</label>
                              <input type="email" id="fatherEmail" className="form-input" value={formData.fatherEmail} onChange={e => handleInputChange('fatherEmail', e.target.value)} required disabled={formData.fatherContactSame} />
              </div>
              </div>
            </div>
                  <div className="form-section-divider">
                      <h4 className="form-section-title">Father Residential Details</h4>
                      <div className="form-checkbox-item">
                          <input type="checkbox" id="fatherAddressSame" className="form-checkbox" checked={formData.fatherAddressSame} onChange={e => handleInputChange('fatherAddressSame', e.target.checked)} />
                          <label htmlFor="fatherAddressSame">Father Address Same as Student Address?</label>
            </div>
                      <div style={{marginTop: "1rem"}}>
                          <label htmlFor="fatherAddress" className="form-label">Father Residential Address*</label>
                          <textarea id="fatherAddress" className="form-textarea" value={formData.fatherAddress} onChange={e => handleInputChange('fatherAddress', e.target.value)} required disabled={formData.fatherAddressSame} />
            </div>
              </div>
              </div>
            </div>

          {/* Payment Information */}
          <div className="form-card">
              <div className="form-card-header">
                  <h2 className="form-card-title">
                      <CreditCard className="w-5 h-5" />
                      Payment Information
                  </h2>
              </div>
              <div className="form-card-content">
                  <div className="payment-requirements">
                      <h4 className="payment-requirements-title">Payment Requirements</h4>
                      <ul className="payment-requirements-list">
                          <li>Non-refundable $65 application fee for returning students</li>
                          <li>Non-refundable $75 application fee for new students</li>
                          <li>Registration will not be complete until the application fee has been received</li>
                          <li>$325 resource fee per student due by July 2024 (becomes non-refundable after this date)</li>
                      </ul>
                  </div>
                  <div>
                      <label className="form-label">Select a Payment Method*</label>
                      <div className="form-radio-group" style={{flexDirection: 'column', alignItems: 'flex-start'}}>
                          <div className="form-radio-item">
                              <input type="radio" id="credit-card" name="paymentMethod" value="credit-card" className="form-radio" onChange={e => handleInputChange('paymentMethod', e.target.value)} checked={formData.paymentMethod === 'credit-card'} />
                              <label htmlFor="credit-card">Credit Card</label>
                          </div>
                          <div className="form-radio-item">
                              <input type="radio" id="debit-card" name="paymentMethod" value="debit-card" className="form-radio" onChange={e => handleInputChange('paymentMethod', e.target.value)} checked={formData.paymentMethod === 'debit-card'} />
                              <label htmlFor="debit-card">Debit Card</label>
                          </div>
                          <div className="form-radio-item">
                              <input type="radio" id="bank-transfer" name="paymentMethod" value="bank-transfer" className="form-radio" onChange={e => handleInputChange('paymentMethod', e.target.value)} checked={formData.paymentMethod === 'bank-transfer'} />
                              <label htmlFor="bank-transfer">Bank Transfer</label>
                          </div>
                          <div className="form-radio-item">
                              <input type="radio" id="cash" name="paymentMethod" value="cash" className="form-radio" onChange={e => handleInputChange('paymentMethod', e.target.value)} checked={formData.paymentMethod === 'cash'} />
                              <label htmlFor="cash">Cash (In Person)</label>
                          </div>
              </div>
            </div>

                  {(formData.paymentMethod === 'credit-card' || formData.paymentMethod === 'debit-card') && (
                      <div className="form-section-divider">
                          <h4 className="form-section-title">Card Details</h4>
                          <div className="form-grid grid-cols-1 md-grid-cols-2">
                              <div className="md-col-span-2">
                                  <label htmlFor="cardholderName" className="form-label">Cardholder Name*</label>
                                  <input type="text" id="cardholderName" className="form-input" value={formData.cardholderName} onChange={e => handleInputChange('cardholderName', e.target.value)} required />
                              </div>
                              <div className="md-col-span-2">
                                  <label htmlFor="cardNumber" className="form-label">Card Number*</label>
                                  <input type="text" id="cardNumber" className="form-input" value={formData.cardNumber} onChange={e => handleInputChange('cardNumber', e.target.value)} placeholder="1234 5678 9012 3456" required />
            </div>
                              <div>
                                  <label htmlFor="expiryDate" className="form-label">Expiry Date*</label>
                                  <input type="text" id="expiryDate" className="form-input" value={formData.expiryDate} onChange={e => handleInputChange('expiryDate', e.target.value)} placeholder="MM/YY" required />
              </div>
                              <div>
                                  <label htmlFor="cvv" className="form-label">CVV*</label>
                                  <input type="text" id="cvv" className="form-input" value={formData.cvv} onChange={e => handleInputChange('cvv', e.target.value)} placeholder="123" required />
              </div>
            </div>
                          <div className="form-section-divider mt-6">
                              <h4 className="form-section-title">Billing Address</h4>
                              <div className="form-grid grid-cols-1 md-grid-cols-2">
                                  <div className="md-col-span-2">
                                      <label htmlFor="billingAddress" className="form-label">Street Address*</label>
                                      <input type="text" id="billingAddress" className="form-input" value={formData.billingAddress} onChange={e => handleInputChange('billingAddress', e.target.value)} required />
                                  </div>
                                  <div>
                                      <label htmlFor="billingCity" className="form-label">City*</label>
                                      <input type="text" id="billingCity" className="form-input" value={formData.billingCity} onChange={e => handleInputChange('billingCity', e.target.value)} required />
            </div>
                                  <div>
                                      <label htmlFor="billingProvince" className="form-label">Province*</label>
                                      <input type="text" id="billingProvince" className="form-input" value={formData.billingProvince} onChange={e => handleInputChange('billingProvince', e.target.value)} required />
            </div>
                                  <div>
                                      <label htmlFor="billingPostalCode" className="form-label">Postal Code*</label>
                                      <input type="text" id="billingPostalCode" className="form-input" value={formData.billingPostalCode} onChange={e => handleInputChange('billingPostalCode', e.target.value)} required />
            </div>
            </div>
            </div>
            </div>
                  )}

                  {formData.paymentMethod === 'bank-transfer' && (
                      <div className="payment-instructions">
                          <h4 className="payment-instructions-title">Bank Transfer Instructions</h4>
                          <p className="payment-instructions-text">Please transfer the application fee to the following account:</p>
                          <div className="payment-instructions-text" style={{marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
                              <p><strong>Bank:</strong> [Bank Name]</p>
                              <p><strong>Account Name:</strong> Tarbiyah Learning Academy</p>
                              <p><strong>Account Number:</strong> [Account Number]</p>
                              <p><strong>Transit Number:</strong> [Transit Number]</p>
                              <p><strong>Reference:</strong> Please include student's full name</p>
            </div>
            </div>
                  )}

                  {formData.paymentMethod === 'cash' && (
                      <div className="payment-instructions">
                          <h4 className="payment-instructions-title">Cash Payment Instructions</h4>
                          <p className="payment-instructions-text">Please visit our office during business hours to complete your payment in person. Office hours: Monday-Friday, 9:00 AM - 4:00 PM.</p>
                      </div>
                  )}
              </div>
            </div>

          {/* Required Files */}
          <div className="form-card">
              <div className="form-card-header">
                  <h2 className="form-card-title">
                      <FileText className="w-5 h-5" />
                      Required Files
                  </h2>
              </div>
              <div className="form-card-content">
                  <div className="file-upload-section">
                      <label className="file-upload-label">Immunization File</label>
                      <p className="file-upload-description">Each student is required to have their immunization records on file. This file may be uploaded now or submitted to the school at a later date.</p>
                      <FileUpload file={uploadedFiles.immunization} onFileUpload={(file) => handleFileUpload('immunization', file)} />
                  </div>
                  <div className="file-upload-section">
                      <label className="file-upload-label">Recent Report Card (if application for SK or later)</label>
                      <p className="file-upload-description">As part of the admissions process for students beyond Kindergarten, we require a copy of the students most recent report card. This file may be uploaded now or submitted to the school at a later date.</p>
                      <FileUpload file={uploadedFiles.reportCard} onFileUpload={(file) => handleFileUpload('reportCard', file)} />
                  </div>
                  <div className="file-upload-section">
                      <label className="file-upload-label">OSR Permission File</label>
                      <p className="file-upload-description">The Ontario Student Record (OSR) is an ongoing record of information considered conducive to the improvement of the instruction of the student. New students need a signed OSR Permission file in our records. This file can be downloaded here... OSR Permission Document.</p>
                      <FileUpload file={uploadedFiles.osrPermission} onFileUpload={(file) => handleFileUpload('osrPermission', file)} />
                  </div>
                  <div className="file-upload-section">
                      <label className="file-upload-label">Government Issued Identification</label>
                      <p className="file-upload-description">As part of the admissions process for students, we require a copy of ONE government issued identification. (Passport or birth certificate or residency permit)</p>
                      <FileUpload file={uploadedFiles.governmentId} onFileUpload={(file) => handleFileUpload('governmentId', file)} />
                  </div>
              </div>
            </div>

          <div className="submit-button-container">
              <button type="submit" className="submit-button">
                  Submit Registration Application
            </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default RegistrationForm;
