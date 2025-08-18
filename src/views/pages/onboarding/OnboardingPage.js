import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  getDoc,
  deleteField,
  writeBatch,
} from 'firebase/firestore';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CForm,
  CFormInput,
  CFormSelect,
  CFormLabel,
  CFormTextarea,
  CToaster,
  CToast,
  CToastBody,
  CSpinner,
  CProgress,
  CAlert,
  CAccordion,
  CAccordionItem,
  CAccordionHeader,
  CAccordionBody,
  CContainer,
  CRow,
  CCol,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCheckCircle, cilWarning, cilUser, cilUserPlus, cilLockLocked } from '@coreui/icons';
import { firestore } from 'src/firebase';
import bcrypt from 'bcryptjs';
import './OnboardingPage.css';

const OnboardingPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, addToast] = useState(0);
  const toaster = useRef();

  // Step 1: Parent Verification
  const [verificationData, setVerificationData] = useState({
    tarbiyahId: '',
    onboardingCode: '',
  });
  const [parentExists, setParentExists] = useState(false);
  const [verifiedParentId, setVerifiedParentId] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Parent Information
  const [parentData, setParentData] = useState({
    personalInfo: {
      firstName: '',
      middleName: '',
      lastName: '',
      dob: '',
      gender: '',
      salutation: '',
    },
    address: {
      poBox: '',
      residentialArea: '',
      streetAddress: '',
    },
    citizenship: {
      nationalId: '',
      nationalIdExpiry: '',
      nationality: '',
    },
    contact: {
      email: '',
      emergencyPhone: '',
      phone1: '',
      phone2: '',
    },
    language: {
      primary: '',
      secondary: '',
    },
    schooling: {
      custodyDetails: '',
      daySchoolEmployer: '',
      notes: '',
    },
    active: true,
    primaryRole: 'Parent',
    students: [],
  });

  useEffect(() => {
    const fetchParentData = async () => {
      if (!verificationData.tarbiyahId) return

      setLoading(true)
      try {
        const parentDocRef = doc(firestore, 'parents', verificationData.tarbiyahId)
        const parentDoc = await getDoc(parentDocRef)

        if (parentDoc.exists()) {
          const existingParentData = parentDoc.data()
          setVerifiedParentId(parentDoc.id)
          setParentExists(true)
          setParentData({
            ...existingParentData,
            id: parentDoc.id,
          })
        } else {
          // This case might happen if the link is manually changed to a non-existent ID
          addToast(errorToast('No parent found with this ID.'))
        }
      } catch (error) {
        console.error('Error fetching parent data:', error)
        addToast(errorToast('An error occurred while fetching your data.'))
      } finally {
        setLoading(false)
      }
    }

    fetchParentData()
  }, [verificationData.tarbiyahId])

  // Step 3: Student Registration
  const [studentCode, setStudentCode] = useState('');
  const [studentData, setStudentData] = useState({
    personalInfo: {
      firstName: '',
      middleName: '',
      lastName: '',
      dob: '',
      gender: '',
      salutation: '',
      nickName: '',
    },
    address: {
      poBox: '',
      residentialArea: '',
      streetAddress: '',
    },
    citizenship: {
      nationalId: '',
      nationalIdExpiry: '',
      nationality: '',
    },
    contact: {
      email: '',
      emergencyPhone: '',
      phone1: '',
      phone2: '',
    },
    language: {
      primary: '',
      secondary: '',
    },
    schooling: {
      custodyDetails: '',
      daySchoolEmployer: '',
      notes: '',
      program: '',
      returningStudentYear: '',
    },
    active: true,
    primaryRole: 'Student',
    parents: {
      father: { name: '', tarbiyahId: '' },
      mother: { name: '', tarbiyahId: '' },
    },
  });

  const [registeredStudents, setRegisteredStudents] = useState([]);
  const [availableStudentCodes, setAvailableStudentCodes] = useState([]);

  const successToast = (message) => (
    <CToast color="success" className="text-white align-items-center">
      <div className="d-flex">
        <CToastBody>
          <CIcon icon={cilCheckCircle} className="me-2" />
          {message}
        </CToastBody>
      </div>
    </CToast>
  );

  const errorToast = (message) => (
    <CToast color="danger" className="text-white align-items-center">
      <div className="d-flex">
        <CToastBody>
          <CIcon icon={cilWarning} className="me-2" />
          {message}
        </CToastBody>
      </div>
    </CToast>
  );

  // Check if parent already exists
  const verifyParentCredentials = async () => {
    if (!verificationData.tarbiyahId || !verificationData.onboardingCode) {
      addToast(errorToast('Please enter both Tarbiyah ID and Onboarding Code'))
      return
    }

    setLoading(true)
    try {
      const parentDoc = await getDoc(doc(firestore, 'parents', verificationData.tarbiyahId))

      if (
        parentDoc.exists() &&
        parentDoc.data().onboardingCode === verificationData.onboardingCode
      ) {
        const existingParentData = parentDoc.data()
        setVerifiedParentId(parentDoc.id)
        setParentExists(true)
        setParentData(existingParentData)

        if (existingParentData.onboarding === false) {
          setCurrentStep(1.5) // New password step
        } else {
          setCurrentStep(2) // Skip to parent info
        }
      } else {
        addToast(errorToast('Invalid credentials. Please check your Tarbiyah ID and Onboarding Code.'))
      }
    } catch (error) {
      console.error('Error verifying credentials:', error)
      addToast(errorToast('Error verifying credentials. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const handleSetPassword = async () => {
    if (password !== confirmPassword) {
      addToast(errorToast('Passwords do not match.'))
      return
    }
    if (password.length < 6) {
      addToast(errorToast('Password must be at least 6 characters long.'))
      return
    }

    setLoading(true)
    try {
      const salt = await bcrypt.genSalt(10)
      const passwordHash = await bcrypt.hash(password, salt)
      const parentRef = doc(firestore, 'parents', verifiedParentId)
      const authRef = doc(firestore, 'auth', verifiedParentId)

      const batch = writeBatch(firestore)
      batch.update(parentRef, {
        onboarding: true,
        onboardingCode: deleteField(), // Remove the temporary code
      })
      batch.set(authRef, {
        passwordHash: passwordHash,
      })

      await batch.commit()

      addToast(successToast('Password set successfully!'))
      setCurrentStep(2)
    } catch (error) {
      console.error('Error setting password:', error)
      addToast(errorToast('Failed to set password. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  // Save parent information
  const saveParentInformation = async () => {
    setLoading(true);
    try {
      const parentDocRef = doc(firestore, 'parents', verifiedParentId);
      const saveData = {
        ...parentData,
        schoolId: verifiedParentId,
        id: verifiedParentId,
        uploadedAt: serverTimestamp(),
      };

      // Only set createdAt for new parents
      if (!parentExists) {
        saveData.createdAt = serverTimestamp();
      }

      await setDoc(parentDocRef, saveData, { merge: true });
      addToast(successToast(parentExists ? 'Parent information updated successfully!' : 'Parent information saved successfully!'));
      setCurrentStep(3);
    } catch (error) {
      console.error('Error saving parent information:', error);
      addToast(errorToast('Error saving parent information. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Verify student code and register student
  const registerStudent = async () => {
    if (!studentCode) {
      addToast(errorToast('Please enter the student code'));
      return;
    }

    setLoading(true);
    try {
      // Check if student code exists in a pre-approved list or generate new student ID
      // For this implementation, we'll assume student codes are in format SC + 6 digits
      // and we'll generate a new student ID
      
      if (!studentCode.match(/^SC\d{6}$/)) {
        addToast(errorToast('Invalid student code format. Please check your code.'));
        setLoading(false);
        return;
      }

      // Generate new student ID
      const studentsCollection = collection(firestore, 'students');
      const studentsSnapshot = await getDocs(studentsCollection);
      
      const existingIds = studentsSnapshot.docs.map(doc => {
        const data = doc.data();
        const id = data.schoolId || doc.id;
        if (id && id.startsWith('TLS')) {
          const numberPart = id.replace('TLS', '');
          return parseInt(numberPart) || 0;
        }
        return 0;
      });

      const maxNumber = existingIds.length > 0 ? Math.max(...existingIds) : 138747;
      const newStudentId = `TLS${(maxNumber + 1).toString().padStart(6, '0')}`;

      // Prepare student data
      const saveStudentData = {
        ...studentData,
        schoolId: newStudentId,
        id: newStudentId,
        studentCode: studentCode,
        parents: {
          mother: {
            name: `${parentData.personalInfo?.firstName || ''} ${parentData.personalInfo?.lastName || ''}`.trim(),
            tarbiyahId: verifiedParentId,
          },
          father: studentData.parents.father,
        },
        createdAt: serverTimestamp(),
        uploadedAt: serverTimestamp(),
      };

      // Save student
      const studentDocRef = doc(firestore, 'students', newStudentId);
      await setDoc(studentDocRef, saveStudentData);

      // Update parent's students array
      const parentDocRef = doc(firestore, 'parents', verifiedParentId);
      const updatedStudents = [
        ...parentData.students,
        {
          relationship: 'child',
          studentId: newStudentId,
          studentName: `${studentData.personalInfo?.firstName || ''} ${studentData.personalInfo?.lastName || ''}`.trim(),
        },
      ];

      await updateDoc(parentDocRef, { students: updatedStudents });

      // Update local state
      setRegisteredStudents([...registeredStudents, { ...saveStudentData, id: newStudentId }]);
      setParentData({ ...parentData, students: updatedStudents });
      
      // Reset student form
      setStudentCode('');
      setStudentData({
        personalInfo: {
          firstName: '',
          middleName: '',
          lastName: '',
          dob: '',
          gender: '',
          salutation: '',
          nickName: '',
        },
        address: {
          poBox: '',
          residentialArea: '',
          streetAddress: '',
        },
        citizenship: {
          nationalId: '',
          nationalIdExpiry: '',
          nationality: '',
        },
        contact: {
          email: '',
          emergencyPhone: '',
          phone1: '',
          phone2: '',
        },
        language: {
          primary: '',
          secondary: '',
        },
        schooling: {
          custodyDetails: '',
          daySchoolEmployer: '',
          notes: '',
          program: '',
          returningStudentYear: '',
        },
        active: true,
        primaryRole: 'Student',
        parents: {
          father: { name: '', tarbiyahId: '' },
          mother: { name: '', tarbiyahId: '' },
        },
      });

      addToast(successToast(`Student ${saveStudentData.personalInfo.firstName} registered successfully!`));
    } catch (error) {
      console.error('Error registering student:', error);
      addToast(errorToast('Error registering student. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => {
    const progress = currentStep === 1 ? 33 : currentStep === 2 ? 66 : 100;
    return (
      <div className="mb-4">
        <CProgress value={progress} className="mb-2">
          <span className="text-white fw-bold">{progress}%</span>
        </CProgress>
        <div className="d-flex justify-content-between text-sm">
          <span className={currentStep >= 1 ? 'text-success' : 'text-muted'}>
            1. Verify Identity
          </span>
          <span className={currentStep >= 2 ? 'text-success' : 'text-muted'}>
            2. Parent Info
          </span>
          <span className={currentStep >= 3 ? 'text-success' : 'text-muted'}>
            3. Register Students
          </span>
        </div>
      </div>
    );
  };

  const renderStep1 = () => (
    <CCard>
      <CCardHeader>
        <h4>
          <CIcon icon={cilUser} className="me-2" />
          Parent Verification
        </h4>
      </CCardHeader>
      <CCardBody>
        <CAlert color="info">
          <strong>Welcome to Tarbiyah Learning Academy!</strong>
          <br />
          Please enter the Tarbiyah ID and Onboarding Code provided in your acceptance email.
        </CAlert>

        <CForm>
          <div className="mb-3">
            <CFormLabel>Tarbiyah ID *</CFormLabel>
            <CFormInput
              type="text"
              value={verificationData.tarbiyahId}
              onChange={(e) =>
                setVerificationData({
                  ...verificationData,
                  tarbiyahId: e.target.value.toUpperCase(),
                })
              }
              placeholder="e.g., TP123456"
              required
            />
          </div>
          <div className="mb-4">
            <CFormLabel>Onboarding Code *</CFormLabel>
            <CFormInput
              type="text"
              value={verificationData.onboardingCode}
              onChange={(e) =>
                setVerificationData({
                  ...verificationData,
                  onboardingCode: e.target.value.toUpperCase(),
                })
              }
              placeholder="Enter the code from your email"
              required
            />
          </div>
          <CButton
            color="primary"
            onClick={verifyParentCredentials}
            disabled={loading}
            className="w-100"
          >
            {loading ? <CSpinner size="sm" className="me-2" /> : null}
            Verify & Continue
          </CButton>
        </CForm>
      </CCardBody>
    </CCard>
  );

  const renderStep1_5 = () => (
    <CCard>
      <CCardHeader>
        <h4>
          <CIcon icon={cilLockLocked} className="me-2" />
          Set Your Password
        </h4>
      </CCardHeader>
      <CCardBody>
        <CAlert color="info">Please set a secure password for your account.</CAlert>
        <CForm>
          <div className="mb-3">
            <CFormLabel>New Password *</CFormLabel>
            <CFormInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <CFormLabel>Confirm New Password *</CFormLabel>
            <CFormInput
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <CButton
            color="primary"
            onClick={handleSetPassword}
            disabled={loading}
            className="w-100"
          >
            {loading ? <CSpinner size="sm" className="me-2" /> : null}
            Set Password & Continue
          </CButton>
        </CForm>
      </CCardBody>
    </CCard>
  );

  const renderStep2 = () => (
    <CCard>
      <CCardHeader>
        <h4>
          <CIcon icon={cilUser} className="me-2" />
          {parentExists ? 'Update Your Parent Profile' : 'Complete Your Parent Profile'}
        </h4>
      </CCardHeader>
      <CCardBody>
        <CAlert color={parentExists ? "info" : "success"}>
          {parentExists ? 'Review and update your parent information below.' : 'Great! Now please complete your parent information.'}
        </CAlert>

        <CForm>
          <CAccordion flush>
            {/* Personal Information */}
            <CAccordionItem itemKey="personal">
              <CAccordionHeader>Personal Information</CAccordionHeader>
              <CAccordionBody>
                <div className="row mb-3">
                  <div className="col-md-3">
                    <CFormLabel>Salutation</CFormLabel>
                    <CFormSelect
                      value={parentData.personalInfo?.salutation || ''}
                      onChange={(e) =>
                        setParentData({
                          ...parentData,
                          personalInfo: {
                            ...parentData.personalInfo,
                            salutation: e.target.value,
                          },
                        })
                      }
                    >
                      <option value="">Select</option>
                      <option value="Mr.">Mr.</option>
                      <option value="Ms.">Ms.</option>
                      <option value="Mrs.">Mrs.</option>
                      <option value="Dr.">Dr.</option>
                      <option value="Prof.">Prof.</option>
                    </CFormSelect>
                  </div>
                  <div className="col-md-3">
                    <CFormLabel>First Name *</CFormLabel>
                    <CFormInput
                      value={parentData.personalInfo?.firstName || ''}
                      onChange={(e) =>
                        setParentData({
                          ...parentData,
                          personalInfo: {
                            ...parentData.personalInfo,
                            firstName: e.target.value,
                          },
                        })
                      }
                      required
                    />
                  </div>
                  <div className="col-md-3">
                    <CFormLabel>Middle Name</CFormLabel>
                    <CFormInput
                      value={parentData.personalInfo?.middleName || ''}
                      onChange={(e) =>
                        setParentData({
                          ...parentData,
                          personalInfo: {
                            ...parentData.personalInfo,
                            middleName: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="col-md-3">
                    <CFormLabel>Last Name *</CFormLabel>
                    <CFormInput
                      value={parentData.personalInfo?.lastName || ''}
                      onChange={(e) =>
                        setParentData({
                          ...parentData,
                          personalInfo: {
                            ...parentData.personalInfo,
                            lastName: e.target.value,
                          },
                        })
                      }
                      required
                    />
                  </div>
                </div>
                                    <div className="row mb-3">
                      <div className="col-md-6">
                        <CFormLabel>Date of Birth</CFormLabel>
                        <CFormInput
                          type="date"
                          value={parentData.personalInfo?.dob || ''}
                          onChange={(e) =>
                            setParentData({
                              ...parentData,
                              personalInfo: {
                                ...parentData.personalInfo,
                                dob: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <CFormLabel>Gender</CFormLabel>
                        <CFormSelect
                          value={parentData.personalInfo?.gender || ''}
                          onChange={(e) =>
                            setParentData({
                              ...parentData,
                              personalInfo: {
                                ...parentData.personalInfo,
                                gender: e.target.value,
                              },
                            })
                          }
                        >
                          <option value="">Select Gender</option>
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                          <option value="Other">Other</option>
                        </CFormSelect>
                      </div>
                    </div>
              </CAccordionBody>
            </CAccordionItem>

            {/* Contact Information */}
            <CAccordionItem itemKey="contact">
              <CAccordionHeader>Contact Information</CAccordionHeader>
              <CAccordionBody>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <CFormLabel>Email *</CFormLabel>
                    <CFormInput
                      type="email"
                      value={parentData.contact?.email || ''}
                      onChange={(e) =>
                        setParentData({
                          ...parentData,
                          contact: { ...parentData.contact, email: e.target.value },
                        })
                      }
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <CFormLabel>Primary Phone *</CFormLabel>
                    <CFormInput
                      value={parentData.contact?.phone1 || ''}
                      onChange={(e) =>
                        setParentData({
                          ...parentData,
                          contact: { ...parentData.contact, phone1: e.target.value },
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <CFormLabel>Secondary Phone</CFormLabel>
                    <CFormInput
                      value={parentData.contact?.phone2 || ''}
                      onChange={(e) =>
                        setParentData({
                          ...parentData,
                          contact: { ...parentData.contact, phone2: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <CFormLabel>Emergency Phone</CFormLabel>
                    <CFormInput
                      value={parentData.contact?.emergencyPhone || ''}
                      onChange={(e) =>
                        setParentData({
                          ...parentData,
                          contact: { ...parentData.contact, emergencyPhone: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </CAccordionBody>
            </CAccordionItem>

            {/* Address Information */}
            <CAccordionItem itemKey="address">
              <CAccordionHeader>Address Information</CAccordionHeader>
              <CAccordionBody>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <CFormLabel>Street Address</CFormLabel>
                    <CFormInput
                      value={parentData.address?.streetAddress || ''}
                      onChange={(e) =>
                        setParentData({
                          ...parentData,
                          address: { ...parentData.address, streetAddress: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <CFormLabel>Residential Area</CFormLabel>
                    <CFormInput
                      value={parentData.address?.residentialArea || ''}
                      onChange={(e) =>
                        setParentData({
                          ...parentData,
                          address: { ...parentData.address, residentialArea: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <CFormLabel>PO Box</CFormLabel>
                    <CFormInput
                      value={parentData.address?.poBox || ''}
                      onChange={(e) =>
                        setParentData({
                          ...parentData,
                          address: { ...parentData.address, poBox: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </CAccordionBody>
            </CAccordionItem>

            {/* Citizenship Information */}
            <CAccordionItem itemKey="citizenship">
              <CAccordionHeader>Citizenship Information</CAccordionHeader>
              <CAccordionBody>
                <div className="row mb-3">
                  <div className="col-md-4">
                    <CFormLabel>Nationality</CFormLabel>
                    <CFormInput
                      value={parentData.citizenship?.nationality || ''}
                      onChange={(e) =>
                        setParentData({
                          ...parentData,
                          citizenship: { ...parentData.citizenship, nationality: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="col-md-4">
                    <CFormLabel>National ID</CFormLabel>
                    <CFormInput
                      value={parentData.citizenship?.nationalId || ''}
                      onChange={(e) =>
                        setParentData({
                          ...parentData,
                          citizenship: { ...parentData.citizenship, nationalId: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="col-md-4">
                    <CFormLabel>National ID Expiry</CFormLabel>
                    <CFormInput
                      type="date"
                      value={parentData.citizenship?.nationalIdExpiry || ''}
                      onChange={(e) =>
                        setParentData({
                          ...parentData,
                          citizenship: { ...parentData.citizenship, nationalIdExpiry: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </CAccordionBody>
            </CAccordionItem>

            {/* Language Information */}
            <CAccordionItem itemKey="language">
              <CAccordionHeader>Language Information</CAccordionHeader>
              <CAccordionBody>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <CFormLabel>Primary Language</CFormLabel>
                    <CFormInput
                      value={parentData.language?.primary || ''}
                      onChange={(e) =>
                        setParentData({
                          ...parentData,
                          language: { ...parentData.language, primary: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <CFormLabel>Secondary Language</CFormLabel>
                    <CFormInput
                      value={parentData.language?.secondary || ''}
                      onChange={(e) =>
                        setParentData({
                          ...parentData,
                          language: { ...parentData.language, secondary: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </CAccordionBody>
            </CAccordionItem>

            {/* Employment & Schooling Information */}
            <CAccordionItem itemKey="schooling">
              <CAccordionHeader>Employment & Additional Information</CAccordionHeader>
              <CAccordionBody>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <CFormLabel>Day School Employer</CFormLabel>
                    <CFormInput
                      value={parentData.schooling?.daySchoolEmployer || ''}
                      onChange={(e) =>
                        setParentData({
                          ...parentData,
                          schooling: { ...parentData.schooling, daySchoolEmployer: e.target.value },
                        })
                      }
                      placeholder="e.g., Tarbiyah Learning"
                    />
                  </div>
                  <div className="col-md-6">
                    <CFormLabel>Custody Details</CFormLabel>
                    <CFormInput
                      value={parentData.schooling?.custodyDetails || ''}
                      onChange={(e) =>
                        setParentData({
                          ...parentData,
                          schooling: { ...parentData.schooling, custodyDetails: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-12">
                    <CFormLabel>Additional Notes</CFormLabel>
                    <CFormTextarea
                      rows={3}
                      value={parentData.schooling?.notes || ''}
                      onChange={(e) =>
                        setParentData({
                          ...parentData,
                          schooling: { ...parentData.schooling, notes: e.target.value },
                        })
                      }
                      placeholder="Any additional information or notes"
                    />
                  </div>
                </div>
              </CAccordionBody>
            </CAccordionItem>
          </CAccordion>

          <div className="mt-4">
            <CButton
              color="primary"
              onClick={saveParentInformation}
              disabled={loading || !parentData.personalInfo?.firstName || !parentData.personalInfo?.lastName || !parentData.contact?.email}
              className="me-2"
            >
              {loading ? <CSpinner size="sm" className="me-2" /> : null}
              {parentExists ? 'Update & Continue' : 'Save & Continue'}
            </CButton>
            <CButton
              color="secondary"
              onClick={() => setCurrentStep(parentExists ? 3 : 1)}
            >
              {parentExists ? 'Back to Students' : 'Back'}
            </CButton>
          </div>
        </CForm>
      </CCardBody>
    </CCard>
  );

  const renderStep3 = () => (
    <div>
      {/* Parent Information Summary for existing parents */}
      {parentExists && (
        <CCard className="mb-4">
          <CCardHeader>
            <div className="d-flex justify-content-between align-items-center">
              <h5>
                <CIcon icon={cilUser} className="me-2" />
                Your Parent Profile
              </h5>
              <CButton
                color="outline-primary"
                size="sm"
                onClick={() => setCurrentStep(2)}
              >
                Edit Profile
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            <div className="row">
              <div className="col-md-6">
                <strong>Name:</strong> {parentData.personalInfo?.salutation} {parentData.personalInfo?.firstName} {parentData.personalInfo?.lastName}
              </div>
              <div className="col-md-6">
                <strong>Email:</strong> {parentData.contact?.email}
              </div>
            </div>
            <div className="row mt-2">
              <div className="col-md-6">
                <strong>Phone:</strong> {parentData.contact?.phone1}
              </div>
              <div className="col-md-6">
                <strong>Existing Students:</strong> {parentData.students?.length || 0}
              </div>
            </div>
          </CCardBody>
        </CCard>
      )}

      <CCard className="mb-4">
        <CCardHeader>
          <h4>
            <CIcon icon={cilUserPlus} className="me-2" />
            Register Students
          </h4>
        </CCardHeader>
        <CCardBody>
          {registeredStudents.length > 0 && (
            <CAlert color="success" className="mb-4">
              <strong>Registered Students:</strong>
              <ul className="mb-0 mt-2">
                {registeredStudents.map((student, index) => (
                  <li key={index}>
                    {student.personalInfo.firstName} {student.personalInfo.lastName} - ID: {student.schoolId}
                  </li>
                ))}
              </ul>
            </CAlert>
          )}

          <CAlert color="info">
            Enter the unique student code provided in your acceptance email for each student.
          </CAlert>

          <div className="mb-4">
            <CFormLabel>Student Code *</CFormLabel>
            <CFormInput
              type="text"
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
              placeholder="e.g., SC123456"
              required
            />
          </div>

          {studentCode && (
            <CForm>
              <CAccordion flush>
                {/* Personal Information */}
                <CAccordionItem itemKey="student-personal">
                  <CAccordionHeader>Student Personal Information</CAccordionHeader>
                  <CAccordionBody>
                    <div className="row mb-3">
                      <div className="col-md-3">
                        <CFormLabel>Salutation</CFormLabel>
                        <CFormSelect
                          value={studentData.personalInfo?.salutation || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              personalInfo: {
                                ...studentData.personalInfo,
                                salutation: e.target.value,
                              },
                            })
                          }
                        >
                          <option value="">Select</option>
                          <option value="Master">Master</option>
                          <option value="Miss">Miss</option>
                        </CFormSelect>
                      </div>
                      <div className="col-md-3">
                        <CFormLabel>First Name *</CFormLabel>
                        <CFormInput
                          value={studentData.personalInfo?.firstName || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              personalInfo: {
                                ...studentData.personalInfo,
                                firstName: e.target.value,
                              },
                            })
                          }
                          required
                        />
                      </div>
                      <div className="col-md-3">
                        <CFormLabel>Middle Name</CFormLabel>
                        <CFormInput
                          value={studentData.personalInfo?.middleName || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              personalInfo: {
                                ...studentData.personalInfo,
                                middleName: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="col-md-3">
                        <CFormLabel>Last Name *</CFormLabel>
                        <CFormInput
                          value={studentData.personalInfo?.lastName || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              personalInfo: {
                                ...studentData.personalInfo,
                                lastName: e.target.value,
                              },
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-4">
                        <CFormLabel>Nickname</CFormLabel>
                        <CFormInput
                          value={studentData.personalInfo?.nickName || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              personalInfo: {
                                ...studentData.personalInfo,
                                nickName: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <CFormLabel>Date of Birth *</CFormLabel>
                        <CFormInput
                          type="date"
                          value={studentData.personalInfo?.dob || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              personalInfo: {
                                ...studentData.personalInfo,
                                dob: e.target.value,
                              },
                            })
                          }
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <CFormLabel>Gender</CFormLabel>
                        <CFormSelect
                          value={studentData.personalInfo?.gender || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              personalInfo: {
                                ...studentData.personalInfo,
                                gender: e.target.value,
                              },
                            })
                          }
                        >
                          <option value="">Select Gender</option>
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                          <option value="Other">Other</option>
                        </CFormSelect>
                      </div>
                    </div>
                  </CAccordionBody>
                </CAccordionItem>

                {/* Contact Information */}
                <CAccordionItem itemKey="student-contact">
                  <CAccordionHeader>Contact Information</CAccordionHeader>
                  <CAccordionBody>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <CFormLabel>Email</CFormLabel>
                        <CFormInput
                          type="email"
                          value={studentData.contact?.email || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              contact: { ...studentData.contact, email: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <CFormLabel>Primary Phone</CFormLabel>
                        <CFormInput
                          value={studentData.contact?.phone1 || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              contact: { ...studentData.contact, phone1: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <CFormLabel>Secondary Phone</CFormLabel>
                        <CFormInput
                          value={studentData.contact?.phone2 || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              contact: { ...studentData.contact, phone2: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <CFormLabel>Emergency Phone</CFormLabel>
                        <CFormInput
                          value={studentData.contact?.emergencyPhone || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              contact: { ...studentData.contact, emergencyPhone: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                  </CAccordionBody>
                </CAccordionItem>

                {/* Address Information */}
                <CAccordionItem itemKey="student-address">
                  <CAccordionHeader>Address Information</CAccordionHeader>
                  <CAccordionBody>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <CFormLabel>Street Address</CFormLabel>
                        <CFormInput
                          value={studentData.address?.streetAddress || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              address: { ...studentData.address, streetAddress: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <CFormLabel>Residential Area</CFormLabel>
                        <CFormInput
                          value={studentData.address?.residentialArea || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              address: { ...studentData.address, residentialArea: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <CFormLabel>PO Box</CFormLabel>
                        <CFormInput
                          value={studentData.address?.poBox || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              address: { ...studentData.address, poBox: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                  </CAccordionBody>
                </CAccordionItem>

                {/* Citizenship Information */}
                <CAccordionItem itemKey="student-citizenship">
                  <CAccordionHeader>Citizenship Information</CAccordionHeader>
                  <CAccordionBody>
                    <div className="row mb-3">
                      <div className="col-md-4">
                        <CFormLabel>Nationality</CFormLabel>
                        <CFormInput
                          value={studentData.citizenship?.nationality || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              citizenship: { ...studentData.citizenship, nationality: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <CFormLabel>National ID</CFormLabel>
                        <CFormInput
                          value={studentData.citizenship?.nationalId || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              citizenship: { ...studentData.citizenship, nationalId: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <CFormLabel>National ID Expiry</CFormLabel>
                        <CFormInput
                          type="date"
                          value={studentData.citizenship?.nationalIdExpiry || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              citizenship: { ...studentData.citizenship, nationalIdExpiry: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                  </CAccordionBody>
                </CAccordionItem>

                {/* Language Information */}
                <CAccordionItem itemKey="student-language">
                  <CAccordionHeader>Language Information</CAccordionHeader>
                  <CAccordionBody>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <CFormLabel>Primary Language</CFormLabel>
                        <CFormInput
                          value={studentData.language?.primary || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              language: { ...studentData.language, primary: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <CFormLabel>Secondary Language</CFormLabel>
                        <CFormInput
                          value={studentData.language?.secondary || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              language: { ...studentData.language, secondary: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                  </CAccordionBody>
                </CAccordionItem>

                {/* Schooling Information */}
                <CAccordionItem itemKey="student-schooling">
                  <CAccordionHeader>Schooling Information</CAccordionHeader>
                  <CAccordionBody>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <CFormLabel>Program</CFormLabel>
                        <CFormInput
                          value={studentData.schooling?.program || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              schooling: { ...studentData.schooling, program: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <CFormLabel>Returning Student Year</CFormLabel>
                        <CFormInput
                          value={studentData.schooling?.returningStudentYear || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              schooling: { ...studentData.schooling, returningStudentYear: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <CFormLabel>Day School Employer</CFormLabel>
                        <CFormInput
                          value={studentData.schooling?.daySchoolEmployer || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              schooling: { ...studentData.schooling, daySchoolEmployer: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <CFormLabel>Custody Details</CFormLabel>
                        <CFormInput
                          value={studentData.schooling?.custodyDetails || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              schooling: { ...studentData.schooling, custodyDetails: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-12">
                        <CFormLabel>Additional Notes</CFormLabel>
                        <CFormTextarea
                          rows={3}
                          value={studentData.schooling?.notes || ''}
                          onChange={(e) =>
                            setStudentData({
                              ...studentData,
                              schooling: { ...studentData.schooling, notes: e.target.value },
                            })
                          }
                          placeholder="Any additional information or notes"
                        />
                      </div>
                    </div>
                  </CAccordionBody>
                </CAccordionItem>
              </CAccordion>
            </CForm>
          )}

          <div className="mt-4">
            <CButton
              color="success"
              onClick={registerStudent}
              disabled={loading || !studentCode || !studentData.personalInfo?.firstName || !studentData.personalInfo?.lastName || !studentData.personalInfo?.dob}
              className="me-2"
            >
              {loading ? <CSpinner size="sm" className="me-2" /> : null}
              Register Student
            </CButton>
            <CButton
              color="info"
              onClick={() => {
                setStudentCode('');
                setStudentData({
                  personalInfo: {
                    firstName: '',
                    middleName: '',
                    lastName: '',
                    dob: '',
                    gender: '',
                    salutation: '',
                    nickName: '',
                  },
                  address: {
                    poBox: '',
                    residentialArea: '',
                    streetAddress: '',
                  },
                  citizenship: {
                    nationalId: '',
                    nationalIdExpiry: '',
                    nationality: '',
                  },
                  contact: {
                    email: '',
                    emergencyPhone: '',
                    phone1: '',
                    phone2: '',
                  },
                  language: {
                    primary: '',
                    secondary: '',
                  },
                  schooling: {
                    custodyDetails: '',
                    daySchoolEmployer: '',
                    notes: '',
                    program: '',
                    returningStudentYear: '',
                  },
                  active: true,
                  primaryRole: 'Student',
                  parents: {
                    father: { name: '', tarbiyahId: '' },
                    mother: { name: '', tarbiyahId: '' },
                  },
                });
              }}
              className="me-2"
            >
              Add Another Student
            </CButton>
            <CButton
              color="primary"
              onClick={() => {
                addToast(successToast('Onboarding completed successfully! Welcome to Tarbiyah Learning Academy.'));
                // Redirect to dashboard or login page
              }}
            >
              Complete Onboarding
            </CButton>
          </div>
        </CCardBody>
      </CCard>
    </div>
  );

  return (
    <>
      <CToaster ref={toaster} push={toast} placement="top-end" />
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={10} lg={8}>
            <div className="my-4">
              <h1 className="text-center mb-4">Tarbiyah Learning Academy</h1>
              <h2 className="text-center text-muted mb-4">Student Onboarding</h2>
              
              {renderProgressBar()}
              
              {currentStep === 1 && renderStep1()}
              {currentStep === 1.5 && renderStep1_5()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
            </div>
          </CCol>
        </CRow>
      </CContainer>
    </>
  );
};

export default OnboardingPage; 