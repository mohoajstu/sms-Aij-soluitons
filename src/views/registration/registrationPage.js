import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './registrationPage.css';

const RegistrationPage = () => {

  const navigate = useNavigate();
  // --- 1. STATE VARIABLES ---

  // Step-based form state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  // Basic Application Info
  const [schoolYear, setSchoolYear] = useState('2025');
  const [gradeAppliedFor, setGradeAppliedFor] = useState('Grade 1');

  // Student Details
  const [studentFirstName, setStudentFirstName] = useState('');
  const [studentNickName, setStudentNickName] = useState('');
  const [studentMiddleName, setStudentMiddleName] = useState('');
  const [studentLastName, setStudentLastName] = useState('');
  const [gender, setGender] = useState('');
  const [oen, setOen] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [previousSchool, setPreviousSchool] = useState('');
  const [allergies, setAllergies] = useState('');
  const [photoPermission, setPhotoPermission] = useState(false);

  // Contact Details
  const [primaryContactPhone, setPrimaryContactPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [studentAddress, setStudentAddress] = useState('');

  // Mother/Primary Guardian
  const [motherFirstName, setMotherFirstName] = useState('');
  const [motherNickName, setMotherNickName] = useState('');
  const [motherMiddleName, setMotherMiddleName] = useState('');
  const [motherLastName, setMotherLastName] = useState('');
  const [motherSameContact, setMotherSameContact] = useState(false);
  const [motherPrimaryPhone, setMotherPrimaryPhone] = useState('');
  const [motherEmail, setMotherEmail] = useState('');
  const [motherSameAddress, setMotherSameAddress] = useState(false);
  const [motherAddress, setMotherAddress] = useState('');

  // Father/Guardian
  const [fatherFirstName, setFatherFirstName] = useState('');
  const [fatherNickName, setFatherNickName] = useState('');
  const [fatherMiddleName, setFatherMiddleName] = useState('');
  const [fatherLastName, setFatherLastName] = useState('');
  const [fatherSameContact, setFatherSameContact] = useState(false);
  const [fatherPrimaryPhone, setFatherPrimaryPhone] = useState('');
  const [fatherEmail, setFatherEmail] = useState('');
  const [fatherSameAddress, setFatherSameAddress] = useState(false);
  const [fatherAddress, setFatherAddress] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('');
  const [acknowledgeFees, setAcknowledgeFees] = useState(false);

  // Documents
  const [immunizationFile, setImmunizationFile] = useState(null);
  const [reportCardFile, setReportCardFile] = useState(null);
  const [osrPermissionFile, setOsrPermissionFile] = useState(null);
  const [govtIdFile, setGovtIdFile] = useState(null);

  // Admin Section
  const [applicationState, setApplicationState] = useState('Pending');
  const [noteToParents, setNoteToParents] = useState('');
  const [sendEmailUpdate, setSendEmailUpdate] = useState(false);
  const isAdmin = true;

  // --- 2. HANDLERS FOR NEXT/PREV/FORM SUBMIT ---
  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Gather all data
    const formData = {
      schoolYear,
      gradeAppliedFor,
      studentFirstName,
      studentNickName,
      studentMiddleName,
      studentLastName,
      gender,
      dateOfBirth,
      oen,
      previousSchool,
      allergies,
      photoPermission,
      primaryContactPhone,
      emergencyPhone,
      primaryEmail,
      studentAddress,
      motherFirstName,
      motherLastName,
      motherNickName,
      motherMiddleName,
      motherSameContact,
      motherPrimaryPhone,
      motherEmail,
      motherSameAddress,
      motherAddress,
      fatherFirstName,
      fatherLastName,
      fatherNickName,
      fatherMiddleName,
      fatherSameContact,
      fatherPrimaryPhone,
      fatherEmail,
      fatherSameAddress,
      fatherAddress,
      paymentMethod,
      acknowledgeFees,
      immunizationFile,
      reportCardFile,
      osrPermissionFile,
      govtIdFile,
      applicationState,
      noteToParents,
      sendEmailUpdate
    };
    console.log('Form submitted:', formData);
    
    // Directly navigate to thank you page without alert
    navigate('/registration/thankYouPage');
  };

  // --- 3. RENDER ---
  return (
    <div className="registration-page-container">
      <h1 className="page-title">School Registration Form</h1>

      {/* Progress Indicator */}
      <div className="progress-indicator">
        {[...Array(totalSteps)].map((_, index) => {
          const stepNumber = index + 1;
          return (
            <div
              key={stepNumber}
              className={`progress-step ${currentStep >= stepNumber ? 'active' : ''}`}
            >
              <div className="step-number">{stepNumber}</div>
              <div className="step-label">
                {index === 0
                  ? 'Basic Info'
                  : index === 1
                  ? 'Student Details'
                  : index === 2
                  ? 'Contact Info'
                  : index === 3
                  ? 'Parents/Guardians'
                  : index === 4
                  ? 'Documents'
                  : 'Payment'}
              </div>
            </div>
          );
        })}
      </div>

      <form className="registration-form" onSubmit={handleSubmit}>
        {/* STEP 1: Basic Application Info */}
        {currentStep === 1 && (
          <section className="form-section">
            <h2>Application for School Year Beginning</h2>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="schoolYear">School Year</label>
                <input
                  type="text"
                  id="schoolYear"
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="gradeAppliedFor">Grade Applied For</label>
                <select
                  id="gradeAppliedFor"
                  value={gradeAppliedFor}
                  onChange={(e) => setGradeAppliedFor(e.target.value)}
                >
                  <option>JK</option>
                  <option>SK</option>
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
          </section>
        )}

        {/* STEP 2: Student Details */}
        {currentStep === 2 && (
          <section className="form-section">
            <h2>Student Details</h2>
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  required
                  value={studentFirstName}
                  onChange={(e) => setStudentFirstName(e.target.value)}
                  placeholder="Legal first name"
                />
              </div>

              <div className="form-group">
                <label>Nick Name</label>
                <input
                  type="text"
                  value={studentNickName}
                  onChange={(e) => setStudentNickName(e.target.value)}
                  placeholder="Preferred name (if different)"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Middle Name</label>
                <input
                  type="text"
                  value={studentMiddleName}
                  onChange={(e) => setStudentMiddleName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  required
                  value={studentLastName}
                  onChange={(e) => setStudentLastName(e.target.value)}
                  placeholder="Legal last name"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div className="form-group">
                <label>Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Ontario Education Number (OEN)</label>
              <input
                type="text"
                value={oen}
                onChange={(e) => setOen(e.target.value)}
                placeholder="9-digit number (if available)"
              />
              <small>Optional for new students. Required for transfers within Ontario.</small>
            </div>

            <div className="form-group">
              <label>Previous School and Address</label>
              <textarea
                value={previousSchool}
                onChange={(e) => setPreviousSchool(e.target.value)}
                placeholder="Name and address of previous school (if applicable)"
              />
            </div>

            <div className="form-group">
              <label>Any Allergies or Medical Conditions?</label>
              <textarea
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="Please list any allergies, medical conditions, or special needs"
              />
            </div>

            <div className="form-group-inline">
              <label>Grant permission to photograph your child for school purposes?</label>
              <input
                type="checkbox"
                checked={photoPermission}
                onChange={(e) => setPhotoPermission(e.target.checked)}
              />
            </div>
          </section>
        )}

        {/* STEP 3: Contact Details */}
        {currentStep === 3 && (
          <section className="form-section">
            <h2>Student Contact Details</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Primary Contact Phone *</label>
                <input
                  type="tel"
                  required
                  value={primaryContactPhone}
                  onChange={(e) => setPrimaryContactPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                />
              </div>

              <div className="form-group">
                <label>Emergency Contact Phone *</label>
                <input
                  type="tel"
                  required
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                />
                <small>
                  This should be someone other than the parents/guardians, only if they cannot be
                  reached.
                </small>
              </div>
            </div>

            <div className="form-group">
              <label>Primary Contact Email *</label>
              <input
                type="email"
                required
                value={primaryEmail}
                onChange={(e) => setPrimaryEmail(e.target.value)}
                placeholder="email@example.com"
              />
              <small>
                This will be our primary means of communication for events and updates.
              </small>
            </div>

            <div className="form-group">
              <label>Student Home Address *</label>
              <input
                type="text"
                required
                value={studentAddress}
                onChange={(e) => setStudentAddress(e.target.value)}
                placeholder="Full address including unit #, street, city, province, postal code"
              />
            </div>
          </section>
        )}

        {/* STEP 4: Parents/Guardians */}
        {currentStep === 4 && (
          <section className="form-section">
            <h2>Parent/Guardian Details</h2>

            <h3>Mother or Primary Guardian</h3>
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  required
                  value={motherFirstName}
                  onChange={(e) => setMotherFirstName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  required
                  value={motherLastName}
                  onChange={(e) => setMotherLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Nick Name</label>
                <input
                  type="text"
                  value={motherNickName}
                  onChange={(e) => setMotherNickName(e.target.value)}
                  placeholder="Preferred name (if different)"
                />
              </div>

              <div className="form-group">
                <label>Middle Name</label>
                <input
                  type="text"
                  value={motherMiddleName}
                  onChange={(e) => setMotherMiddleName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group-inline">
              <label>Use same contact details as student?</label>
              <input
                type="checkbox"
                checked={motherSameContact}
                onChange={(e) => {
                  setMotherSameContact(e.target.checked);
                  if (e.target.checked) {
                    setMotherPrimaryPhone(primaryContactPhone);
                    setMotherEmail(primaryEmail);
                  } else {
                    setMotherPrimaryPhone('');
                    setMotherEmail('');
                  }
                }}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Primary Phone *</label>
                <input
                  type="tel"
                  required
                  value={motherPrimaryPhone}
                  onChange={(e) => setMotherPrimaryPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  required
                  value={motherEmail}
                  onChange={(e) => setMotherEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="form-group-inline">
              <label>Same address as student?</label>
              <input
                type="checkbox"
                checked={motherSameAddress}
                onChange={(e) => {
                  setMotherSameAddress(e.target.checked);
                  if (e.target.checked) {
                    setMotherAddress(studentAddress);
                  } else {
                    setMotherAddress('');
                  }
                }}
              />
            </div>

            <div className="form-group">
              <label>Residential Address *</label>
              <input
                type="text"
                required
                value={motherAddress}
                onChange={(e) => setMotherAddress(e.target.value)}
                placeholder="Full address including unit #, city, province, postal code"
              />
            </div>

            <h3>Father/Guardian</h3>
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  required
                  value={fatherFirstName}
                  onChange={(e) => setFatherFirstName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  required
                  value={fatherLastName}
                  onChange={(e) => setFatherLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Nick Name</label>
                <input
                  type="text"
                  value={fatherNickName}
                  onChange={(e) => setFatherNickName(e.target.value)}
                  placeholder="Preferred name (if different)"
                />
              </div>

              <div className="form-group">
                <label>Middle Name</label>
                <input
                  type="text"
                  value={fatherMiddleName}
                  onChange={(e) => setFatherMiddleName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group-inline">
              <label>Use same contact details as student?</label>
              <input
                type="checkbox"
                checked={fatherSameContact}
                onChange={(e) => {
                  setFatherSameContact(e.target.checked);
                  if (e.target.checked) {
                    setFatherPrimaryPhone(primaryContactPhone);
                    setFatherEmail(primaryEmail);
                  } else {
                    setFatherPrimaryPhone('');
                    setFatherEmail('');
                  }
                }}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Primary Phone *</label>
                <input
                  type="tel"
                  required
                  value={fatherPrimaryPhone}
                  onChange={(e) => setFatherPrimaryPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  required
                  value={fatherEmail}
                  onChange={(e) => setFatherEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="form-group-inline">
              <label>Same address as student?</label>
              <input
                type="checkbox"
                checked={fatherSameAddress}
                onChange={(e) => {
                  setFatherSameAddress(e.target.checked);
                  if (e.target.checked) {
                    setFatherAddress(studentAddress);
                  } else {
                    setFatherAddress('');
                  }
                }}
              />
            </div>

            <div className="form-group">
              <label>Residential Address *</label>
              <input
                type="text"
                required
                value={fatherAddress}
                onChange={(e) => setFatherAddress(e.target.value)}
                placeholder="Full address including unit #, city, province, postal code"
              />
            </div>
          </section>
        )}

        {/* STEP 5: Documents (moved up) */}
        {currentStep === 5 && (
          <section className="form-section">
            <h2>Required Documents</h2>
            <p className="documents-intro">
              The following documents are required to complete your child's registration. You can
              upload them now or submit them later.
            </p>

            <div className="form-group">
              <label>Immunization Records</label>
              <input
                type="file"
                onChange={(e) => setImmunizationFile(e.target.files[0])}
              />
              <small>Each student must have their immunization records on file.</small>
            </div>

            <div className="form-group">
              <label>Recent Report Card</label>
              <input
                type="file"
                onChange={(e) => setReportCardFile(e.target.files[0])}
              />
              <small>Required for students applying for SK or higher grades.</small>
            </div>

            <div className="form-group">
              <label>OSR Permission Form</label>
              <input
                type="file"
                onChange={(e) => setOsrPermissionFile(e.target.files[0])}
              />
              <small>Needed for new students transferring from an Ontario school.</small>
            </div>

            <div className="form-group">
              <label>Government Issued ID</label>
              <input
                type="file"
                onChange={(e) => setGovtIdFile(e.target.files[0])}
              />
              <small>Please provide ONE of the following: passport, birth certificate, or residency permit.</small>
            </div>
          </section>
        )}

        {/* STEP 6: Payment Info (moved to last) */}
        {currentStep === 6 && (
          <section className="form-section">
            <h2>Payment Information</h2>
            <div className="payment-notice">
              <p>
                I understand that I will have to pay a non-refundable application fee at the time of
                registration:
              </p>
              <ul>
                <li>
                  <strong>$65</strong> for returning students
                </li>
                <li>
                  <strong>$75</strong> for new students
                </li>
              </ul>
              <p>
                <strong>Note:</strong> Registration will not be complete until the application fee
                has been received.
              </p>
              <p>
                There is also a <strong>$325 resource fee</strong> per student which is to be paid by
                July 2024 and becomes non-refundable after this date.
              </p>
            </div>

            <div className="form-group">
              <label>Select a Payment Method *</label>
              <select
                required
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="">Select a Payment Method</option>
                <option>Cash</option>
                <option>Credit Card</option>
                <option>Debit Card</option>
                <option>e-Transfer</option>
                <option>Cheque</option>
              </select>
            </div>

            <div className="form-group-inline">
              <label>By checking, I acknowledge the fees and conditions stated above. *</label>
              <input
                type="checkbox"
                required
                checked={acknowledgeFees}
                onChange={(e) => setAcknowledgeFees(e.target.checked)}
              />
            </div>
          </section>
        )}

        {/* OPTIONAL ADMIN SECTION */}
        {isAdmin && (
          <section className="form-section admin-section">
            <h2>Application Processing (Admin Only)</h2>
            <div className="form-group">
              <label>Process the Current State of this Application *</label>
              <select
                required
                value={applicationState}
                onChange={(e) => setApplicationState(e.target.value)}
              >
                <option value="Pending">Pending</option>
                <option value="Accept">Accept</option>
                <option value="Reject">Reject</option>
              </select>
              <small>To Accept a Student, select "Accept."</small>
            </div>

            <div className="form-group">
              <label>Note to Parents (appears in parent email)</label>
              <textarea
                value={noteToParents}
                onChange={(e) => setNoteToParents(e.target.value)}
                placeholder="Enter a message for parents"
              />
            </div>

            <div className="form-group-inline">
              <label>Send an email to parents about the application update?</label>
              <input
                type="checkbox"
                checked={sendEmailUpdate}
                onChange={(e) => setSendEmailUpdate(e.target.checked)}
              />
            </div>
          </section>
        )}

        {/* NAVIGATION BUTTONS */}
        <div className="form-navigation" style={{ display: 'flex', justifyContent: currentStep === 1 ? 'flex-end' : 'space-between', marginTop: '1rem' }}>
          {currentStep > 1 && (
            <button
              type="button"
              className="navigation-button"
              onClick={handlePrevStep}
            >
              Previous
            </button>
          )}
          {currentStep < totalSteps ? (
            <button
              type="button"
              className="navigation-button"
              onClick={handleNextStep}
            >
              Next
            </button>
          ) : (
            <button type="submit" className="navigation-button">
              Submit Application
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default RegistrationPage;