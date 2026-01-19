
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, Phone, CreditCard, FileText } from 'lucide-react';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  runTransaction,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import FileUpload from 'src/components/FileUpload';
import { firestore, storage } from 'src/firebase';
import './registrationPage.css';

const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    schoolYear: '',
    grade: '',
    firstName: '',
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
    primaryGuardianFirstName: '',
    primaryGuardianMiddleName: '',
    primaryGuardianLastName: '',
    primaryGuardianPhone: '',
    primaryGuardianEmail: '',
    primaryGuardianAddress: '',
    secondaryGuardianFirstName: '',
    secondaryGuardianMiddleName: '',
    secondaryGuardianLastName: '',
    secondaryGuardianPhone: '',
    secondaryGuardianEmail: '',
    secondaryGuardianAddress: '',
  });

  const [registrationSettings, setRegistrationSettings] = useState(null);
  const [dobError, setDobError] = useState('');

  const [uploadedFiles, setUploadedFiles] = useState({
    immunization: [],
    reportCard: [],
    osrPermission: [],
    governmentId: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Load registration settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(firestore, 'systemSettings', 'registration'));
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          setRegistrationSettings(settings);
          // Set default school year from settings
          if (settings.schoolYear) {
            setFormData(prev => ({ ...prev, schoolYear: settings.schoolYear }));
          }
        }
      } catch (error) {
        console.error('Error loading registration settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (type, newFiles) => {
    setUploadedFiles((prev) => ({ ...prev, [type]: [...prev[type], ...newFiles] }));
  };

  const handleFileRemove = (type, fileToRemove) => {
    setUploadedFiles((prev) => ({
      ...prev,
      [type]: prev[type].filter(file => file.name !== fileToRemove.name)
    }));
  };

  // Validate date of birth against eligibility cutoff
  const validateDateOfBirth = (dob) => {
    if (!dob || !registrationSettings?.eligibilityCutoffDate) {
      return { valid: true, error: '' };
    }

    const dobDate = new Date(dob);
    const cutoffDate = new Date(registrationSettings.eligibilityCutoffDate);
    
    // Calculate age at cutoff date
    const ageAtCutoff = cutoffDate.getFullYear() - dobDate.getFullYear();
    const monthDiff = cutoffDate.getMonth() - dobDate.getMonth();
    const dayDiff = cutoffDate.getDate() - dobDate.getDate();
    
    let actualAge = ageAtCutoff;
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      actualAge--;
    }

    if (actualAge < 4) {
      const cutoffDateFormatted = cutoffDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      return {
        valid: false,
        error: `Student must be at least 4 years old by ${cutoffDateFormatted} to be eligible for registration.`
      };
    }

    return { valid: true, error: '' };
  }

  const handleDateOfBirthChange = (value) => {
    handleInputChange('dateOfBirth', value);
    const validation = validateDateOfBirth(value);
    setDobError(validation.error);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    console.log('🚀 Registration submission started');

    // Validate date of birth before submission
    if (formData.dateOfBirth) {
      const validation = validateDateOfBirth(formData.dateOfBirth);
      if (!validation.valid) {
        console.error('❌ Date of birth validation failed:', validation.error);
        setDobError(validation.error);
        return;
      }
    }
    console.log('✅ Date of birth validated');

    setIsSubmitting(true);

    try {
      // 1. Generate a unique registration ID
      // Try to use counter if available, otherwise generate a timestamp-based ID
      let newRegistrationId;
      console.log('📝 Attempting to generate registration ID...');
      try {
        const counterRef = doc(firestore, 'counters', 'registrations');
        console.log('🔢 Accessing counter document...');
        newRegistrationId = await runTransaction(firestore, async (transaction) => {
          const counterDoc = await transaction.get(counterRef);
          
          let newCount = 0;
          if (counterDoc.exists()) {
            newCount = counterDoc.data().currentCount + 1;
            console.log('✅ Counter exists, incrementing to:', newCount);
          } else {
            console.log('⚠️ Counter does not exist, creating new counter');
          }
          
          transaction.set(counterRef, { currentCount: newCount });
          
          // Format the ID to TLRXXXXX
          return `TLR${String(newCount).padStart(5, '0')}`;
        });
        console.log('✅ Registration ID generated:', newRegistrationId);
      } catch (error) {
        // If transaction fails (e.g., unauthenticated), generate a timestamp-based ID
        console.error('❌ Counter transaction failed:', error);
        console.log('🔄 Falling back to timestamp-based ID generation');
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        newRegistrationId = `TLR${timestamp}${String(random).padStart(3, '0')}`;
        console.log('✅ Timestamp-based ID generated:', newRegistrationId);
      }

      // 2. Create a list of file upload tasks to run in parallel
      console.log('📁 Starting file uploads...');
      const uploadPromises = [];
      const uploadedFileUrls = {
        immunization: [],
        reportCard: [],
        osrPermission: [],
        governmentId: [],
      };

      let totalFiles = 0;
      for (const category in uploadedFiles) {
        const files = uploadedFiles[category];
        totalFiles += files.length;
        for (const file of files) {
          const filePath = `registrations/${newRegistrationId}/${category}/${file.name}`;
          const storageRef = ref(storage, filePath);
          console.log(`📤 Uploading ${category}/${file.name}`);
          
          uploadPromises.push(
            uploadBytes(storageRef, file).then(async (snapshot) => {
              const downloadURL = await getDownloadURL(snapshot.ref);
              uploadedFileUrls[category].push({
                name: file.name,
                url: downloadURL,
              });
              console.log(`✅ Uploaded ${category}/${file.name}`);
            }).catch((error) => {
              console.error(`❌ Failed to upload ${category}/${file.name}:`, error);
              throw error;
            })
          );
        }
      }

      console.log(`📊 Uploading ${totalFiles} total files...`);
      await Promise.all(uploadPromises);
      console.log('✅ All files uploaded successfully');


      // 4. Structure the data
      console.log('🔧 Structuring registration data...');
      const structuredData = {
        registrationId: newRegistrationId,
        schoolYear: formData.schoolYear,
        grade: formData.grade,
        status: 'pending',
        archived: false,
        student: {
          firstName: formData.firstName,
          middleName: formData.middleName || '',
          lastName: formData.lastName,
          gender: formData.gender,
          oen: formData.oen || '',
          dateOfBirth: formData.dateOfBirth,
          previousSchool: formData.previousSchool || '',
          allergies: formData.allergies || '',
          photoPermission: formData.photoPermission,
        },
        contact: {
          primaryPhone: formData.primaryPhone,
          emergencyPhone: formData.emergencyPhone,
          primaryEmail: formData.primaryEmail,
          studentAddress: formData.studentAddress,
        },
        primaryGuardian: {
          firstName: formData.primaryGuardianFirstName,
          middleName: formData.primaryGuardianMiddleName || '',
          lastName: formData.primaryGuardianLastName,
          phone: formData.primaryGuardianPhone,
          email: formData.primaryGuardianEmail,
          address: formData.primaryGuardianAddress,
        },
        secondaryGuardian: {
          firstName: formData.secondaryGuardianFirstName || '',
          middleName: formData.secondaryGuardianMiddleName || '',
          lastName: formData.secondaryGuardianLastName || '',
          phone: formData.secondaryGuardianPhone || '',
          email: formData.secondaryGuardianEmail || '',
          address: formData.secondaryGuardianAddress || '',
        },
        payment: {
          method: 'cash',
          status: 'pending',
          amount: 0,
        },
        uploadedFiles: uploadedFileUrls,
        timestamp: serverTimestamp(),
      };
      console.log('✅ Data structured successfully');

      // 5. Save to Firestore using the custom ID
      console.log('💾 Saving registration to Firestore...');
      const registrationRef = doc(firestore, 'registrations', newRegistrationId);
      await setDoc(registrationRef, structuredData);
      console.log('✅ Registration saved to Firestore successfully');

      // 6. Clean up and navigate
      console.log('🧹 Cleaning up and navigating to thank you page...');
      localStorage.removeItem('registrationFormData');
      console.log('🎉 Registration complete! Navigating to thank you page...');
      navigate('/registration/thankYouPage');

    } catch (error) {
      console.error("❌ ERROR SUBMITTING REGISTRATION:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error code:", error.code);
      console.error("Full error object:", error);
      alert(`There was an error submitting your application: ${error.message || 'Unknown error'}. Please check the console for details and try again.`);
    } finally {
      setIsSubmitting(false);
      console.log('🏁 Submission process completed');
    }
  };

  const isOenRequired = (() => {
    const g = (formData.grade || '').toLowerCase();
    if (!g) return false;
    // Not required only for Jr Kindergarten
    if (g === 'jr kindergarten' || g === 'jk') return false;
    // Required for Sr Kindergarten and all higher grades
    return true;
  })();

  const isOsrRequired = (() => {
    const g = (formData.grade || '').toLowerCase();
    if (!g) return true; // Show by default if no grade selected
    // Not required for Jr Kindergarten
    if (g === 'jr kindergarten' || g === 'jk') return false;
    // Required for Sr Kindergarten and all higher grades
    return true;
  })();

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
              <div className="form-grid md-grid-cols-2">
                <div>
                  <label htmlFor="schoolYear" className="form-label">School Year*</label>
                  <input 
                    type="text" 
                    id="schoolYear" 
                    className="form-input" 
                    value={formData.schoolYear} 
                    onChange={e => handleInputChange('schoolYear', e.target.value)} 
                    required 
                    readOnly={!!registrationSettings?.schoolYear}
                  />
                  {registrationSettings?.schoolYear && (
                    <p className="form-info-text">Applying for {registrationSettings.schoolYear}</p>
                  )}
              </div>
                <div>
                  <label htmlFor="grade" className="form-label">Grade Applied For*</label>
                  <select 
                    id="grade" 
                    className="form-select" 
                    value={formData.grade} 
                    onChange={e => handleInputChange('grade', e.target.value)} 
                    required
                  >
                    <option value="">Select Grade</option>
                    {(registrationSettings?.availableGrades || [
                      'Jr Kindergarten',
                      'Sr Kindergarten',
                      'Grade 1',
                      'Grade 2',
                      'Grade 3',
                      'Grade 4',
                      'Grade 5',
                      'Grade 6',
                      'Grade 7',
                      'Grade 8',
                    ]).map((grade) => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                </select>
              </div>
            </div>
            </div>
              </div>

          {/* Student Information */}
          <div className="form-card">
            <div className="form-card-header">
              <h2 className="form-card-title">
                <User className="w-5 h-5" />
                Student Information
              </h2>
            </div>
            <div className="form-card-content">
              <div className="form-grid lg-grid-cols-3">
                <div>
                  <label htmlFor="firstName" className="form-label">Legal First Name*</label>
                  <input type="text" id="firstName" className="form-input" value={formData.firstName} onChange={e => handleInputChange('firstName', e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="middleName" className="form-label">Middle Name</label>
                  <input type="text" id="middleName" className="form-input" value={formData.middleName} onChange={e => handleInputChange('middleName', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="lastName" className="form-label">Legal Last Name*</label>
                  <input type="text" id="lastName" className="form-input" value={formData.lastName} onChange={e => handleInputChange('lastName', e.target.value)} required />
                </div>
              </div>

              <div className="form-grid md-grid-cols-2">
                <div>
                  <label htmlFor="gender" className="form-label">Gender*</label>
                  <select id="gender" className="form-select" value={formData.gender} onChange={e => handleInputChange('gender', e.target.value)} required>
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="dateOfBirth" className="form-label">Date of Birth*</label>
                  <input 
                    type="date" 
                    id="dateOfBirth" 
                    className={`form-input ${dobError ? 'is-invalid' : ''}`} 
                    value={formData.dateOfBirth} 
                    onChange={e => handleDateOfBirthChange(e.target.value)} 
                    required 
                  />
                  {dobError && (
                    <div className="form-error-text" style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      {dobError}
                    </div>
                  )}
                  {registrationSettings?.eligibilityCutoffDate && !dobError && (
                    <p className="form-info-text">
                      Student must be at least 4 years old by {new Date(registrationSettings.eligibilityCutoffDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} to be eligible.
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="oen" className="form-label">OEN (Ontario Education Number){isOenRequired && '*'}</label>
                  <input type="text" id="oen" className="form-input" value={formData.oen} onChange={e => handleInputChange('oen', e.target.value)} required={isOenRequired} />
                  <p className="form-info-text">For students previously enrolled in an Ontario school.</p>
                </div>
                <div>
                  <label htmlFor="previousSchool" className="form-label">Previous School Attended</label>
                  <textarea id="previousSchool" className="form-textarea" value={formData.previousSchool} onChange={(e) => handleInputChange('previousSchool', e.target.value)} />
                </div>
                </div>
                <div>
                  <label htmlFor="allergies" className="form-label">Any Allergies?</label>
                  <textarea id="allergies" className="form-textarea" value={formData.allergies} onChange={(e) => handleInputChange('allergies', e.target.value)} />
              </div>
              <div className="form-section-divider">
                <label className="form-label">Grant permission to photograph your child?*</label>
                <p className="form-info-text">Photos may be used for school promotional materials (website, social media, etc.).</p>
                <div className="form-radio-group">
                  <div className="form-radio-item">
                    <input type="radio" id="photo-yes" name="photoPermission" value="yes" className="form-radio" onChange={e => handleInputChange('photoPermission', e.target.value)} checked={formData.photoPermission === 'yes'} required />
                    <label htmlFor="photo-yes">Yes</label>
                  </div>
                  <div className="form-radio-item">
                    <input type="radio" id="photo-no" name="photoPermission" value="no" className="form-radio" onChange={e => handleInputChange('photoPermission', e.target.value)} checked={formData.photoPermission === 'no'} required />
                    <label htmlFor="photo-no">No</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="form-card">
            <div className="form-card-header">
                <h2 className="form-card-title">
                    <Phone className="w-5 h-5" />
                Student's Contact Information
                </h2>
            </div>
            <div className="form-card-content">
              <div className="form-grid md-grid-cols-2">
                    <div>
                  <label htmlFor="primaryPhone" className="form-label">Primary Phone Number*</label>
                        <input type="tel" id="primaryPhone" className="form-input" value={formData.primaryPhone} onChange={e => handleInputChange('primaryPhone', e.target.value)} required />
                    </div>
                    <div>
                  <label htmlFor="emergencyPhone" className="form-label">Emergency Phone Number*</label>
                        <input type="tel" id="emergencyPhone" className="form-input" value={formData.emergencyPhone} onChange={e => handleInputChange('emergencyPhone', e.target.value)} required />
            </div>
                    <div className="md-col-span-2">
                  <label htmlFor="primaryEmail" className="form-label">Primary Email Address*</label>
                        <input type="email" id="primaryEmail" className="form-input" value={formData.primaryEmail} onChange={e => handleInputChange('primaryEmail', e.target.value)} required />
            </div>
                <div className="md-col-span-2">
                  <label htmlFor="studentAddress" className="form-label">Student's Street Address*</label>
                  <input type="text" id="studentAddress" className="form-input" value={formData.studentAddress} onChange={e => handleInputChange('studentAddress', e.target.value)} required />
              </div>
              </div>
            </div>
            </div>

          {/* Guardian Information */}
          <div className="form-card">
              <div className="form-card-header">
                  <h2 className="form-card-title">
                      <User className="w-5 h-5" />
                Guardian Information
                  </h2>
              </div>
              <div className="form-card-content">
              {/* Primary Guardian */}
              <div className="form-section">
                <h3 className="form-section-title">Primary Guardian Information*</h3>
                <div className="form-grid lg-grid-cols-3">
                      <div>
                        <label htmlFor="primaryGuardianFirstName" className="form-label">
                          Legal First Name*
                        </label>
                        <input
                          type="text"
                          id="primaryGuardianFirstName"
                          className="form-input"
                          value={formData.primaryGuardianFirstName}
                          onChange={(e) => handleInputChange('primaryGuardianFirstName', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="primaryGuardianMiddleName" className="form-label">
                          Middle Name
                        </label>
                        <input
                          type="text"
                          id="primaryGuardianMiddleName"
                          className="form-input"
                          value={formData.primaryGuardianMiddleName}
                          onChange={(e) => handleInputChange('primaryGuardianMiddleName', e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="primaryGuardianLastName" className="form-label">
                          Legal Last Name*
                        </label>
                        <input
                          type="text"
                          id="primaryGuardianLastName"
                          className="form-input"
                          value={formData.primaryGuardianLastName}
                          onChange={(e) => handleInputChange('primaryGuardianLastName', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-grid md-grid-cols-2 mt-4">
                      <div>
                        <label htmlFor="primaryGuardianPhone" className="form-label">
                          Phone Number*
                        </label>
                        <input
                          type="tel"
                          id="primaryGuardianPhone"
                          className="form-input"
                          value={formData.primaryGuardianPhone}
                          onChange={(e) => handleInputChange('primaryGuardianPhone', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="primaryGuardianEmail" className="form-label">
                          Email Address*
                        </label>
                        <input
                          type="email"
                          id="primaryGuardianEmail"
                          className="form-input"
                          value={formData.primaryGuardianEmail}
                          onChange={(e) => handleInputChange('primaryGuardianEmail', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label htmlFor="primaryGuardianAddress" className="form-label">
                        Street Address*
                      </label>
                      <input
                        type="text"
                        id="primaryGuardianAddress"
                        className="form-input"
                        value={formData.primaryGuardianAddress}
                        onChange={(e) => handleInputChange('primaryGuardianAddress', e.target.value)}
                        required
                      />
                    </div>
              </div>

              {/* Secondary Guardian */}
              <div className="form-section-divider">
                <h3 className="form-section-title">Secondary Guardian Information (Optional)</h3>
                <div className="form-grid lg-grid-cols-3">
                      <div>
                        <label htmlFor="secondaryGuardianFirstName" className="form-label">
                          Legal First Name
                        </label>
                        <input
                          type="text"
                          id="secondaryGuardianFirstName"
                          className="form-input"
                          value={formData.secondaryGuardianFirstName}
                          onChange={(e) =>
                            handleInputChange('secondaryGuardianFirstName', e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label htmlFor="secondaryGuardianMiddleName" className="form-label">
                          Middle Name
                        </label>
                        <input
                          type="text"
                          id="secondaryGuardianMiddleName"
                          className="form-input"
                          value={formData.secondaryGuardianMiddleName}
                          onChange={(e) =>
                            handleInputChange('secondaryGuardianMiddleName', e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label htmlFor="secondaryGuardianLastName" className="form-label">
                          Legal Last Name
                        </label>
                        <input
                          type="text"
                          id="secondaryGuardianLastName"
                          className="form-input"
                          value={formData.secondaryGuardianLastName}
                          onChange={(e) =>
                            handleInputChange('secondaryGuardianLastName', e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="form-grid md-grid-cols-2 mt-4">
                      <div>
                        <label htmlFor="secondaryGuardianPhone" className="form-label">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          id="secondaryGuardianPhone"
                          className="form-input"
                          value={formData.secondaryGuardianPhone}
                          onChange={(e) =>
                            handleInputChange('secondaryGuardianPhone', e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label htmlFor="secondaryGuardianEmail" className="form-label">
                          Email Address
                        </label>
                        <input
                          type="email"
                          id="secondaryGuardianEmail"
                          className="form-input"
                          value={formData.secondaryGuardianEmail}
                          onChange={(e) =>
                            handleInputChange('secondaryGuardianEmail', e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label htmlFor="secondaryGuardianAddress" className="form-label">
                        Street Address
                      </label>
                      <input
                        type="text"
                        id="secondaryGuardianAddress"
                        className="form-input"
                        value={formData.secondaryGuardianAddress}
                        onChange={(e) =>
                          handleInputChange('secondaryGuardianAddress', e.target.value)
                        }
                      />
                    </div>
              </div>
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
            <h3 className="file-upload-label">Immunization Records</h3>
            <p className="file-upload-description">Please upload all pages of the immunization record.</p>
            <FileUpload 
              onFileUpload={(newFiles) => handleFileUpload('immunization', newFiles)}
              onFileRemove={(file) => handleFileRemove('immunization', file)}
              files={uploadedFiles.immunization}
            />
                  </div>
                  <div className="file-upload-section">
            <h3 className="file-upload-label">Most Recent Report Card</h3>
            <p className="file-upload-description">Required for students entering Grade 1 or higher. Not needed for JK/SK.</p>
            <FileUpload 
              onFileUpload={(newFiles) => handleFileUpload('reportCard', newFiles)}
              onFileRemove={(file) => handleFileRemove('reportCard', file)}
              files={uploadedFiles.reportCard}
            />
                  </div>
                  {isOsrRequired && (
                    <div className="file-upload-section">
                      <h3 className="file-upload-label">OSR (Ontario Student Record) Permission</h3>
                      <p className="file-upload-description">Please upload the signed permission form for OSR transfer if applicable. Required for SK to Gr. 8.</p>
                      <FileUpload 
                        onFileUpload={(newFiles) => handleFileUpload('osrPermission', newFiles)}
                        onFileRemove={(file) => handleFileRemove('osrPermission', file)}
                        files={uploadedFiles.osrPermission}
                      />
                    </div>
                  )}
                  <div className="file-upload-section">
            <h3 className="file-upload-label">Proof of Age & Legal Status</h3>
            <p className="file-upload-description">Upload a Birth Certificate, Passport, or Permanent Resident Card.</p>
            <FileUpload 
              onFileUpload={(newFiles) => handleFileUpload('governmentId', newFiles)}
              onFileRemove={(file) => handleFileRemove('governmentId', file)}
              files={uploadedFiles.governmentId}
            />
                  </div>
              </div>
            </div>
          
      {/* Submission */}

          <div className="submit-button-container">
              <button type="submit" className="submit-button" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Registration Application'}
            </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default RegistrationForm;