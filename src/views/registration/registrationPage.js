
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
import { addTestTags } from 'src/utils/stagingUtils';
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [fileErrors, setFileErrors] = useState({});

  const [uploadedFiles, setUploadedFiles] = useState({
    immunization: [],
    reportCard: [],
    osrPermission: [],
    governmentId: [],
  });

  const [feesAcknowledgement, setFeesAcknowledgement] = useState(false);
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
    // Clear error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    // If grade changes, clear file errors that may no longer be relevant
    if (field === 'grade') {
      setFileErrors((prev) => {
        const newErrors = { ...prev };
        // Clear reportCard and osrPermission errors when grade changes
        // They will be re-validated on submit
        delete newErrors.reportCard;
        delete newErrors.osrPermission;
        return newErrors;
      });
    }
  };

  const handleFileUpload = (type, newFiles) => {
    setUploadedFiles((prev) => ({ ...prev, [type]: [...prev[type], ...newFiles] }));
    // Clear error when files are uploaded
    if (fileErrors[type]) {
      setFileErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[type];
        return newErrors;
      });
    }
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
    // Clear date of birth error from fieldErrors if validation passes
    if (validation.valid && fieldErrors.dateOfBirth) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.dateOfBirth;
        return newErrors;
      });
    }
  }

  // Helper function to get fees information based on grade
  const getFeesInformation = (grade) => {
    const gradeLower = (grade || '').toLowerCase();
    
    // Only show Junior Kindergarten fees for now
    if (gradeLower === 'jr kindergarten' || gradeLower === 'jk') {
      return {
        monthlyTuition: '$720',
        monthlyTuitionLabel: 'Junior Kindergarten: $720',
        showFees: true,
      };
    }
    
    // Scaffolded fees for other grades (not shown yet)
    // This structure makes it easy to enable other grades later
    const feesByGrade = {
      'sr kindergarten': {
        monthlyTuition: '$720',
        monthlyTuitionLabel: 'JK/SK: $720',
        showFees: false, // Not showing yet
      },
      'grade 1': {
        monthlyTuition: '$700',
        monthlyTuitionLabel: 'Grades 1-6: $700',
        showFees: false, // Not showing yet
      },
      'grade 2': {
        monthlyTuition: '$700',
        monthlyTuitionLabel: 'Grades 1-6: $700',
        showFees: false,
      },
      'grade 3': {
        monthlyTuition: '$700',
        monthlyTuitionLabel: 'Grades 1-6: $700',
        showFees: false,
      },
      'grade 4': {
        monthlyTuition: '$700',
        monthlyTuitionLabel: 'Grades 1-6: $700',
        showFees: false,
      },
      'grade 5': {
        monthlyTuition: '$700',
        monthlyTuitionLabel: 'Grades 1-6: $700',
        showFees: false,
      },
      'grade 6': {
        monthlyTuition: '$700',
        monthlyTuitionLabel: 'Grades 1-6: $700',
        showFees: false,
      },
      'grade 7': {
        monthlyTuition: '$720',
        monthlyTuitionLabel: 'Grades 7-8: $720',
        showFees: false,
      },
      'grade 8': {
        monthlyTuition: '$720',
        monthlyTuitionLabel: 'Grades 7-8: $720',
        showFees: false,
      },
    };

    // Check if grade matches any scaffolded grade
    for (const [key, value] of Object.entries(feesByGrade)) {
      if (gradeLower.includes(key)) {
        return value;
      }
    }

    // Default: don't show fees if grade doesn't match
    return {
      monthlyTuition: '',
      monthlyTuitionLabel: '',
      showFees: false,
    };
  };

  // Validate all mandatory fields
  const validateForm = () => {
    const errors = {};
    const fileUploadErrors = {};

    // Always required fields
    if (!formData.schoolYear?.trim()) errors.schoolYear = true;
    if (!formData.grade?.trim()) errors.grade = true;
    if (!formData.firstName?.trim()) errors.firstName = true;
    if (!formData.lastName?.trim()) errors.lastName = true;
    if (!formData.gender?.trim()) errors.gender = true;
    if (!formData.dateOfBirth?.trim()) errors.dateOfBirth = true;
    if (!formData.photoPermission?.trim()) errors.photoPermission = true;
    if (!formData.primaryPhone?.trim()) errors.primaryPhone = true;
    if (!formData.emergencyPhone?.trim()) errors.emergencyPhone = true;
    if (!formData.primaryEmail?.trim()) errors.primaryEmail = true;
    if (!formData.studentAddress?.trim()) errors.studentAddress = true;
    if (!formData.primaryGuardianFirstName?.trim()) errors.primaryGuardianFirstName = true;
    if (!formData.primaryGuardianLastName?.trim()) errors.primaryGuardianLastName = true;
    if (!formData.primaryGuardianPhone?.trim()) errors.primaryGuardianPhone = true;
    if (!formData.primaryGuardianEmail?.trim()) errors.primaryGuardianEmail = true;
    if (!formData.primaryGuardianAddress?.trim()) errors.primaryGuardianAddress = true;

    // Conditionally required: OEN
    if (isOenRequired && !formData.oen?.trim()) {
      errors.oen = true;
    }

    // Validate date of birth eligibility
    if (formData.dateOfBirth) {
      const dobValidation = validateDateOfBirth(formData.dateOfBirth);
      if (!dobValidation.valid) {
        errors.dateOfBirth = true;
      }
    }

    // Validate email format (only if email is provided)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.primaryEmail?.trim() && !emailRegex.test(formData.primaryEmail.trim())) {
      errors.primaryEmail = true;
    }
    if (formData.primaryGuardianEmail?.trim() && !emailRegex.test(formData.primaryGuardianEmail.trim())) {
      errors.primaryGuardianEmail = true;
    }

    // File upload validations
    // Immunization is always required
    if (!uploadedFiles.immunization || uploadedFiles.immunization.length === 0) {
      fileUploadErrors.immunization = true;
    }

    // Government ID is always required
    if (!uploadedFiles.governmentId || uploadedFiles.governmentId.length === 0) {
      fileUploadErrors.governmentId = true;
    }

    // Report Card is required for Grade 1+
    const gradeLower = (formData.grade || '').toLowerCase();
    const isReportCardRequired = gradeLower && 
      (gradeLower.includes('grade 1') || 
       gradeLower.includes('grade 2') || 
       gradeLower.includes('grade 3') || 
       gradeLower.includes('grade 4') || 
       gradeLower.includes('grade 5') || 
       gradeLower.includes('grade 6') || 
       gradeLower.includes('grade 7') || 
       gradeLower.includes('grade 8'));
    
    if (isReportCardRequired && (!uploadedFiles.reportCard || uploadedFiles.reportCard.length === 0)) {
      fileUploadErrors.reportCard = true;
    }

    // OSR Permission is required for SK to Gr. 8
    if (isOsrRequired && (!uploadedFiles.osrPermission || uploadedFiles.osrPermission.length === 0)) {
      fileUploadErrors.osrPermission = true;
    }

    // Fees acknowledgement is required if fees are shown
    const currentFeesInfo = getFeesInformation(formData.grade);
    if (currentFeesInfo.showFees && !feesAcknowledgement) {
      errors.feesAcknowledgement = true;
    }

    setFieldErrors(errors);
    setFileErrors(fileUploadErrors);

    return Object.keys(errors).length === 0 && Object.keys(fileUploadErrors).length === 0;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    console.log('🚀 Registration submission started');

    // Validate all mandatory fields before submission
    if (!validateForm()) {
      console.error('❌ Form validation failed');
      console.log('Field errors:', fieldErrors);
      console.log('File errors:', fileErrors);
      // Scroll to first error
      const firstErrorField = document.querySelector('.form-input-error, .form-select-error, .file-upload-error, .form-label-error');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    console.log('✅ Form validation passed');

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
      const baseData = {
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
        feesAcknowledgement: feesAcknowledgement || false,
        uploadedFiles: uploadedFileUrls,
        timestamp: serverTimestamp(),
      };
      
      // Add test tags if in staging
      const structuredData = addTestTags(baseData, serverTimestamp);
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

  // Get fees information for current grade (used in render)
  const feesInfo = getFeesInformation(formData.grade);

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
                  <label htmlFor="schoolYear" className={`form-label ${fieldErrors.schoolYear ? 'form-label-error' : ''}`}>School Year*</label>
                  <input 
                    type="text" 
                    id="schoolYear" 
                    className={`form-input ${fieldErrors.schoolYear ? 'form-input-error' : ''}`}
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
                  <label htmlFor="grade" className={`form-label ${fieldErrors.grade ? 'form-label-error' : ''}`}>Grade Applied For*</label>
                  <select 
                    id="grade" 
                    className={`form-select ${fieldErrors.grade ? 'form-select-error' : ''}`}
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
                  <label htmlFor="firstName" className={`form-label ${fieldErrors.firstName ? 'form-label-error' : ''}`}>Legal First Name*</label>
                  <input type="text" id="firstName" className={`form-input ${fieldErrors.firstName ? 'form-input-error' : ''}`} value={formData.firstName} onChange={e => handleInputChange('firstName', e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="middleName" className="form-label">Middle Name</label>
                  <input type="text" id="middleName" className="form-input" value={formData.middleName} onChange={e => handleInputChange('middleName', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="lastName" className={`form-label ${fieldErrors.lastName ? 'form-label-error' : ''}`}>Legal Last Name*</label>
                  <input type="text" id="lastName" className={`form-input ${fieldErrors.lastName ? 'form-input-error' : ''}`} value={formData.lastName} onChange={e => handleInputChange('lastName', e.target.value)} required />
                </div>
              </div>

              <div className="form-grid md-grid-cols-2">
                <div>
                  <label htmlFor="gender" className={`form-label ${fieldErrors.gender ? 'form-label-error' : ''}`}>Gender*</label>
                  <select id="gender" className={`form-select ${fieldErrors.gender ? 'form-select-error' : ''}`} value={formData.gender} onChange={e => handleInputChange('gender', e.target.value)} required>
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="dateOfBirth" className={`form-label ${dobError || fieldErrors.dateOfBirth ? 'form-label-error' : ''}`}>Date of Birth*</label>
                  <input 
                    type="date" 
                    id="dateOfBirth" 
                    className={`form-input ${dobError || fieldErrors.dateOfBirth ? 'form-input-error' : ''}`} 
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
                  <label htmlFor="oen" className={`form-label ${fieldErrors.oen ? 'form-label-error' : ''}`}>OEN (Ontario Education Number){isOenRequired && '*'}</label>
                  <input type="text" id="oen" className={`form-input ${fieldErrors.oen ? 'form-input-error' : ''}`} value={formData.oen} onChange={e => handleInputChange('oen', e.target.value)} required={isOenRequired} />
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
                <label className={`form-label ${fieldErrors.photoPermission ? 'form-label-error' : ''}`}>Grant permission to photograph your child?*</label>
                <p className="form-info-text">Photos may be used for school promotional materials (website, social media, etc.).</p>
                <div className={`form-radio-group ${fieldErrors.photoPermission ? 'form-radio-group-error' : ''}`}>
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
                  <label htmlFor="primaryPhone" className={`form-label ${fieldErrors.primaryPhone ? 'form-label-error' : ''}`}>Primary Phone Number*</label>
                        <input type="tel" id="primaryPhone" className={`form-input ${fieldErrors.primaryPhone ? 'form-input-error' : ''}`} value={formData.primaryPhone} onChange={e => handleInputChange('primaryPhone', e.target.value)} required />
                    </div>
                    <div>
                  <label htmlFor="emergencyPhone" className={`form-label ${fieldErrors.emergencyPhone ? 'form-label-error' : ''}`}>Emergency Phone Number*</label>
                        <input type="tel" id="emergencyPhone" className={`form-input ${fieldErrors.emergencyPhone ? 'form-input-error' : ''}`} value={formData.emergencyPhone} onChange={e => handleInputChange('emergencyPhone', e.target.value)} required />
            </div>
                    <div className="md-col-span-2">
                  <label htmlFor="primaryEmail" className={`form-label ${fieldErrors.primaryEmail ? 'form-label-error' : ''}`}>Primary Email Address*</label>
                        <input type="email" id="primaryEmail" className={`form-input ${fieldErrors.primaryEmail ? 'form-input-error' : ''}`} value={formData.primaryEmail} onChange={e => handleInputChange('primaryEmail', e.target.value)} required />
            </div>
                <div className="md-col-span-2">
                  <label htmlFor="studentAddress" className={`form-label ${fieldErrors.studentAddress ? 'form-label-error' : ''}`}>Student's Street Address*</label>
                  <input type="text" id="studentAddress" className={`form-input ${fieldErrors.studentAddress ? 'form-input-error' : ''}`} value={formData.studentAddress} onChange={e => handleInputChange('studentAddress', e.target.value)} required />
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
                        <label htmlFor="primaryGuardianFirstName" className={`form-label ${fieldErrors.primaryGuardianFirstName ? 'form-label-error' : ''}`}>
                          Legal First Name*
                        </label>
                        <input
                          type="text"
                          id="primaryGuardianFirstName"
                          className={`form-input ${fieldErrors.primaryGuardianFirstName ? 'form-input-error' : ''}`}
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
                        <label htmlFor="primaryGuardianLastName" className={`form-label ${fieldErrors.primaryGuardianLastName ? 'form-label-error' : ''}`}>
                          Legal Last Name*
                        </label>
                        <input
                          type="text"
                          id="primaryGuardianLastName"
                          className={`form-input ${fieldErrors.primaryGuardianLastName ? 'form-input-error' : ''}`}
                          value={formData.primaryGuardianLastName}
                          onChange={(e) => handleInputChange('primaryGuardianLastName', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-grid md-grid-cols-2 mt-4">
                      <div>
                        <label htmlFor="primaryGuardianPhone" className={`form-label ${fieldErrors.primaryGuardianPhone ? 'form-label-error' : ''}`}>
                          Phone Number*
                        </label>
                        <input
                          type="tel"
                          id="primaryGuardianPhone"
                          className={`form-input ${fieldErrors.primaryGuardianPhone ? 'form-input-error' : ''}`}
                          value={formData.primaryGuardianPhone}
                          onChange={(e) => handleInputChange('primaryGuardianPhone', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="primaryGuardianEmail" className={`form-label ${fieldErrors.primaryGuardianEmail ? 'form-label-error' : ''}`}>
                          Email Address*
                        </label>
                        <input
                          type="email"
                          id="primaryGuardianEmail"
                          className={`form-input ${fieldErrors.primaryGuardianEmail ? 'form-input-error' : ''}`}
                          value={formData.primaryGuardianEmail}
                          onChange={(e) => handleInputChange('primaryGuardianEmail', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label htmlFor="primaryGuardianAddress" className={`form-label ${fieldErrors.primaryGuardianAddress ? 'form-label-error' : ''}`}>
                        Street Address*
                      </label>
                      <input
                        type="text"
                        id="primaryGuardianAddress"
                        className={`form-input ${fieldErrors.primaryGuardianAddress ? 'form-input-error' : ''}`}
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
                  <div className={`file-upload-section ${fileErrors.immunization ? 'file-upload-section-error' : ''}`}>
            <h3 className={`file-upload-label ${fileErrors.immunization ? 'file-upload-label-error' : ''}`}>Immunization Records*</h3>
            <p className="file-upload-description">Please upload all pages of the immunization record.</p>
            <FileUpload 
              onFileUpload={(newFiles) => handleFileUpload('immunization', newFiles)}
              onFileRemove={(file) => handleFileRemove('immunization', file)}
              files={uploadedFiles.immunization}
              hasError={fileErrors.immunization}
            />
            {fileErrors.immunization && (
              <p className="file-upload-error-message">This file is required and must be uploaded.</p>
            )}
                  </div>
                  <div className={`file-upload-section ${fileErrors.reportCard ? 'file-upload-section-error' : ''}`}>
            {(() => {
              const gradeLower = (formData.grade || '').toLowerCase();
              const isRequired = gradeLower && 
                (gradeLower.includes('grade 1') || 
                 gradeLower.includes('grade 2') || 
                 gradeLower.includes('grade 3') || 
                 gradeLower.includes('grade 4') || 
                 gradeLower.includes('grade 5') || 
                 gradeLower.includes('grade 6') || 
                 gradeLower.includes('grade 7') || 
                 gradeLower.includes('grade 8'));
              return (
                <h3 className={`file-upload-label ${fileErrors.reportCard ? 'file-upload-label-error' : ''}`}>
                  Most Recent Report Card{isRequired ? '*' : ''}
                </h3>
              );
            })()}
            <p className="file-upload-description">Required for students entering Grade 1 or higher. Not needed for JK/SK.</p>
            <FileUpload 
              onFileUpload={(newFiles) => handleFileUpload('reportCard', newFiles)}
              onFileRemove={(file) => handleFileRemove('reportCard', file)}
              files={uploadedFiles.reportCard}
              hasError={fileErrors.reportCard}
            />
            {fileErrors.reportCard && (
              <p className="file-upload-error-message">This file is required for Grade 1 and above.</p>
            )}
                  </div>
                  {isOsrRequired && (
                    <div className={`file-upload-section ${fileErrors.osrPermission ? 'file-upload-section-error' : ''}`}>
                      <h3 className={`file-upload-label ${fileErrors.osrPermission ? 'file-upload-label-error' : ''}`}>OSR (Ontario Student Record) Permission*</h3>
                      <p className="file-upload-description">Please upload the signed permission form for OSR transfer if applicable. Required for SK to Gr. 8.</p>
                      <FileUpload 
                        onFileUpload={(newFiles) => handleFileUpload('osrPermission', newFiles)}
                        onFileRemove={(file) => handleFileRemove('osrPermission', file)}
                        files={uploadedFiles.osrPermission}
                        hasError={fileErrors.osrPermission}
                      />
                      {fileErrors.osrPermission && (
                        <p className="file-upload-error-message">This file is required for SK to Grade 8.</p>
                      )}
                    </div>
                  )}
                  <div className={`file-upload-section ${fileErrors.governmentId ? 'file-upload-section-error' : ''}`}>
            <h3 className={`file-upload-label ${fileErrors.governmentId ? 'file-upload-label-error' : ''}`}>Proof of Age & Legal Status*</h3>
            <p className="file-upload-description">Upload a Birth Certificate, Passport, or Permanent Resident Card.</p>
            <FileUpload 
              onFileUpload={(newFiles) => handleFileUpload('governmentId', newFiles)}
              onFileRemove={(file) => handleFileRemove('governmentId', file)}
              files={uploadedFiles.governmentId}
              hasError={fileErrors.governmentId}
            />
            {fileErrors.governmentId && (
              <p className="file-upload-error-message">This file is required and must be uploaded.</p>
            )}
                  </div>
              </div>
            </div>

          {/* Fees Acknowledgement */}
          {feesInfo.showFees && (
            <div className="form-card">
              <div className="form-card-header">
                <h2 className="form-card-title">
                  <CreditCard className="w-5 h-5" />
                  Fees Acknowledgement
                </h2>
              </div>
              <div className="form-card-content">
                <div className={`fees-acknowledgement-section ${fieldErrors.feesAcknowledgement ? 'fees-acknowledgement-section-error' : ''}`}>
                  <p className="fees-acknowledgement-text">
                    I understand that I will have to pay the following fees:
                  </p>
                  
                  <div className="fees-details">
                    <div className="fees-section">
                      <h4 className="fees-section-title">Monthly Tuition Fees:</h4>
                      <p className="fees-section-content">{feesInfo.monthlyTuitionLabel}</p>
                    </div>
                    
                    <div className="fees-section">
                      <h4 className="fees-section-title">One-Time Fees:</h4>
                      <ul className="fees-list">
                        <li>Registration Fee: $95 for new students, $85 for returning students (to be paid at time of registration) - non-refundable</li>
                        <li>Resource Fee: $350 (to be paid by June 30th) - non-refundable</li>
                      </ul>
                    </div>
                  </div>

                  <div className={`form-checkbox-group ${fieldErrors.feesAcknowledgement ? 'form-checkbox-group-error' : ''}`}>
                    <div className="form-checkbox-item">
                      <input
                        type="checkbox"
                        id="feesAcknowledgement"
                        className="form-checkbox"
                        checked={feesAcknowledgement}
                        onChange={(e) => {
                          setFeesAcknowledgement(e.target.checked);
                          // Clear error when checkbox is checked
                          if (e.target.checked && fieldErrors.feesAcknowledgement) {
                            setFieldErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.feesAcknowledgement;
                              return newErrors;
                            });
                          }
                        }}
                        required
                      />
                      <label htmlFor="feesAcknowledgement" className={`form-label ${fieldErrors.feesAcknowledgement ? 'form-label-error' : ''}`}>
                        I acknowledge and agree to the fees listed above.*
                      </label>
                    </div>
                  </div>
                  {fieldErrors.feesAcknowledgement && (
                    <p className="file-upload-error-message">You must acknowledge and agree to the fees to proceed.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
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