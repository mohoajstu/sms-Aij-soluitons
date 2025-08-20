import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
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
import { auth, firestore } from 'src/firebase';
import bcrypt from 'bcryptjs';
import './OnboardingPage.css';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, addToast] = useState(0);
  const toaster = useRef();

  // Step 1: Parent Verification
  const [verificationData, setVerificationData] = useState({
    tarbiyahId: '',
  });
  const [parentExists, setParentExists] = useState(false);
  const [verifiedParentId, setVerifiedParentId] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');

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
          // Also load linked students
          try {
            setStudentsLoading(true)
            const linked = existingParentData?.students || []
            const ids = linked.map((s) => s.studentId).filter(Boolean)
            const uniqueIds = Array.from(new Set(ids))
            const docs = []
            for (const sid of uniqueIds) {
              const sSnap = await getDoc(doc(firestore, 'students', sid))
              if (sSnap.exists()) {
                const sdata = sSnap.data()
                docs.push({ id: sid, data: sdata })
              }
            }
            setStudentDocs(docs)
            // Initialize forms with filtered editable fields
            const forms = {}
            for (const { id, data } of docs) {
              forms[id] = {
                personalInfo: {
                  firstName: data.personalInfo?.firstName || '',
                  middleName: data.personalInfo?.middleName || '',
                  lastName: data.personalInfo?.lastName || '',
                  nickName: data.personalInfo?.nickName || '',
                  dob: data.personalInfo?.dob || '',
                  gender: data.personalInfo?.gender || '',
                  salutation: data.personalInfo?.salutation || '',
                },
                address: { ...data.address },
                citizenship: { ...data.citizenship },
                contact: { ...data.contact },
                language: { ...data.language },
                schooling: {
                  custodyDetails: data.schooling?.custodyDetails || '',
                  daySchoolEmployer: data.schooling?.daySchoolEmployer || '',
                  notes: data.schooling?.notes || '',
                  program: data.schooling?.program || '',
                  returningStudentYear: data.schooling?.returningStudentYear || '',
                },
              }
            }
            setStudentForms(forms)
          } finally {
            setStudentsLoading(false)
          }
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

  // Detect mustChangePassword and preload Tarbiyah ID; do not change the step order
  useEffect(() => {
    const checkMustChangePassword = async () => {
      const user = auth.currentUser
      if (!user) return
      try {
        const userSnap = await getDoc(doc(firestore, 'users', user.uid))
        if (userSnap.exists()) {
          const userData = userSnap.data() || {}
          const parentId = userData.tarbiyahId || userData.schoolId || user.uid
          setVerifiedParentId(parentId)
          setVerificationData((prev) => ({ ...prev, tarbiyahId: parentId }))
          if (userData?.mustChangePassword === true) {
            setForcePasswordChange(true)
          }
        }
      } catch (err) {
        // noop
      }
    }
    checkMustChangePassword()
  }, [])

  // Preload Tarbiyah ID for signed-in users even if not forced to change password
  useEffect(() => {
    const preloadTarbiyahId = async () => {
      const user = auth.currentUser
      if (!user) return
      try {
        const userSnap = await getDoc(doc(firestore, 'users', user.uid))
        if (userSnap.exists()) {
          const userData = userSnap.data() || {}
          const parentId = userData.tarbiyahId || userData.schoolId || user.uid
          setVerificationData((prev) => ({ ...prev, tarbiyahId: parentId }))
        }
      } catch (_) {
        // ignore
      }
    }
    preloadTarbiyahId()
  }, [])

  // Step 3: Student Registration
  // legacy create-student UI removed for parents; they only view/edit linked students

  // Linked students editing state
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentDocs, setStudentDocs] = useState([]); // [{ id, data }]
  const [studentForms, setStudentForms] = useState({}); // id -> editable clone

  const successToast = (message) => (
    <CToast key={`succ-${Date.now()}-${Math.random()}`} color="success" className="text-white align-items-center">
      <div className="d-flex">
        <CToastBody>
          <CIcon icon={cilCheckCircle} className="me-2" />
          {message}
        </CToastBody>
      </div>
    </CToast>
  );

  const errorToast = (message) => (
    <CToast key={`err-${Date.now()}-${Math.random()}`} color="danger" className="text-white align-items-center">
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
    if (!verificationData.tarbiyahId) {
      addToast(errorToast('Please enter your Tarbiyah ID'))
      return
    }

    setLoading(true)
    try {
      const parentDoc = await getDoc(doc(firestore, 'parents', verificationData.tarbiyahId))

      if (parentDoc.exists()) {
        const existingParentData = parentDoc.data()
        setVerifiedParentId(parentDoc.id)
        setParentExists(true)
        setParentData(existingParentData)
        setCurrentStep(2)
      } else {
        addToast(errorToast('No parent found with this Tarbiyah ID.'))
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
    if (password.length < 8) {
      addToast(errorToast('Password must be at least 8 characters long.'))
      return
    }

    setLoading(true)
    try {
      const user = auth.currentUser
      if (user && forcePasswordChange) {
        // Re-authenticate to satisfy requires-recent-login error
        const email = user.email
        if (!email) {
          addToast(errorToast('Missing email on account. Please sign out and sign in again.'))
          setLoading(false)
          return
        }
        const credential = EmailAuthProvider.credential(email, currentPassword)
        try {
          await reauthenticateWithCredential(user, credential)
        } catch (e) {
          addToast(errorToast('Current password is incorrect.'))
          setLoading(false)
          return
        }

        await updatePassword(user, password)
        await updateDoc(doc(firestore, 'users', user.uid), { mustChangePassword: false })
        addToast(successToast('Password updated successfully.'))
        setForcePasswordChange(false)
        setCurrentStep(5)
        return
      }

      // Fallback legacy flow: hash and store in Firestore if not authenticated
      const salt = await bcrypt.genSalt(10)
      const passwordHash = await bcrypt.hash(password, salt)
      const parentRef = doc(firestore, 'parents', verifiedParentId)
      const authRef = doc(firestore, 'auth', verifiedParentId)

      const batch = writeBatch(firestore)
      batch.update(parentRef, {
        onboarding: true,
        onboardingCode: deleteField(),
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
    const progress = currentStep >= 5 ? 100 : currentStep >= 4 ? 80 : currentStep >= 3 ? 60 : currentStep >= 2 ? 40 : 20;
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
          <span className={currentStep >= 4 ? 'text-success' : 'text-muted'}>
            4. Set Password
          </span>
          <span className={currentStep >= 5 ? 'text-success' : 'text-muted'}>
            5. Confirm & Finish
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
          Please confirm your Tarbiyah ID to continue.
        </CAlert>

        <CForm>
          <div className="mb-3">
            <CFormLabel>Tarbiyah ID *</CFormLabel>
            <CFormInput
              type="text"
              value={verificationData.tarbiyahId}
              readOnly
              placeholder="e.g., TP123456"
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

  const renderStep4 = () => (
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
            <CFormLabel>Current Password *</CFormLabel>
            <CFormInput
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
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
      <CCard className="mb-4">
        <CCardHeader>
          <h4>
            <CIcon icon={cilUserPlus} className="me-2" />
            Your Children
          </h4>
        </CCardHeader>
        <CCardBody>
          {studentsLoading ? (
            <CSpinner />
          ) : studentDocs.length === 0 ? (
            <CAlert color="info">No children linked to this account.</CAlert>
          ) : (
            <CAccordion alwaysOpen>
              {studentDocs.map(({ id, data }) => (
                <CAccordionItem key={id} itemKey={id}>
                  <CAccordionHeader>
                    {data.personalInfo?.firstName} {data.personalInfo?.lastName} — ID: {data.schoolId}
                  </CAccordionHeader>
                  <CAccordionBody>
                    <CForm>
                      <div className="row mb-3">
                        <div className="col-md-3">
                          <CFormLabel>Salutation</CFormLabel>
                          <CFormSelect
                            value={studentForms[id]?.personalInfo?.salutation || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: {
                                ...prev[id],
                                personalInfo: { ...prev[id].personalInfo, salutation: e.target.value },
                              },
                            }))}
                          >
                            <option value="">Select</option>
                            <option value="Master">Master</option>
                            <option value="Miss">Miss</option>
                          </CFormSelect>
                        </div>
                        <div className="col-md-3">
                          <CFormLabel>First Name *</CFormLabel>
                          <CFormInput
                            value={studentForms[id]?.personalInfo?.firstName || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: {
                                ...prev[id],
                                personalInfo: { ...prev[id].personalInfo, firstName: e.target.value },
                              },
                            }))}
                          />
                        </div>
                        <div className="col-md-3">
                          <CFormLabel>Middle Name</CFormLabel>
                          <CFormInput
                            value={studentForms[id]?.personalInfo?.middleName || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: {
                                ...prev[id],
                                personalInfo: { ...prev[id].personalInfo, middleName: e.target.value },
                              },
                            }))}
                          />
                        </div>
                        <div className="col-md-3">
                          <CFormLabel>Last Name *</CFormLabel>
                          <CFormInput
                            value={studentForms[id]?.personalInfo?.lastName || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: {
                                ...prev[id],
                                personalInfo: { ...prev[id].personalInfo, lastName: e.target.value },
                              },
                            }))}
                          />
                        </div>
                      </div>

                      <div className="row mb-3">
                        <div className="col-md-4">
                          <CFormLabel>Nickname</CFormLabel>
                          <CFormInput
                            value={studentForms[id]?.personalInfo?.nickName || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: {
                                ...prev[id],
                                personalInfo: { ...prev[id].personalInfo, nickName: e.target.value },
                              },
                            }))}
                          />
                        </div>
                        <div className="col-md-4">
                          <CFormLabel>Date of Birth *</CFormLabel>
                          <CFormInput
                            type="date"
                            value={studentForms[id]?.personalInfo?.dob || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: {
                                ...prev[id],
                                personalInfo: { ...prev[id].personalInfo, dob: e.target.value },
                              },
                            }))}
                          />
                        </div>
                        <div className="col-md-4">
                          <CFormLabel>Gender</CFormLabel>
                          <CFormSelect
                            value={studentForms[id]?.personalInfo?.gender || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: {
                                ...prev[id],
                                personalInfo: { ...prev[id].personalInfo, gender: e.target.value },
                              },
                            }))}
                          >
                            <option value="">Select Gender</option>
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                            <option value="Other">Other</option>
                          </CFormSelect>
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <CFormLabel>Email</CFormLabel>
                          <CFormInput
                            type="email"
                            value={studentForms[id]?.contact?.email || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], contact: { ...prev[id].contact, email: e.target.value } },
                            }))}
                          />
                        </div>
                        <div className="col-md-6">
                          <CFormLabel>Primary Phone</CFormLabel>
                          <CFormInput
                            value={studentForms[id]?.contact?.phone1 || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], contact: { ...prev[id].contact, phone1: e.target.value } },
                            }))}
                          />
                        </div>
                      </div>

                      <div className="row mb-3">
                        <div className="col-md-6">
                          <CFormLabel>Secondary Phone</CFormLabel>
                          <CFormInput
                            value={studentForms[id]?.contact?.phone2 || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], contact: { ...prev[id].contact, phone2: e.target.value } },
                            }))}
                          />
                        </div>
                        <div className="col-md-6">
                          <CFormLabel>Emergency Phone</CFormLabel>
                          <CFormInput
                            value={studentForms[id]?.contact?.emergencyPhone || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], contact: { ...prev[id].contact, emergencyPhone: e.target.value } },
                            }))}
                          />
                        </div>
                      </div>

                      {/* Address */}
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <CFormLabel>Street Address</CFormLabel>
                          <CFormInput
                            value={studentForms[id]?.address?.streetAddress || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], address: { ...prev[id].address, streetAddress: e.target.value } },
                            }))}
                          />
                        </div>
                        <div className="col-md-6">
                          <CFormLabel>Residential Area</CFormLabel>
                          <CFormInput
                            value={studentForms[id]?.address?.residentialArea || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], address: { ...prev[id].address, residentialArea: e.target.value } },
                            }))}
                          />
                        </div>
                      </div>
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <CFormLabel>PO Box</CFormLabel>
                          <CFormInput
                            value={studentForms[id]?.address?.poBox || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], address: { ...prev[id].address, poBox: e.target.value } },
                            }))}
                          />
                        </div>
                      </div>

                      {/* Citizenship */}
                      <div className="row mb-3">
                        <div className="col-md-4">
                          <CFormLabel>Nationality</CFormLabel>
                          <CFormInput
                            value={studentForms[id]?.citizenship?.nationality || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], citizenship: { ...prev[id].citizenship, nationality: e.target.value } },
                            }))}
                          />
                        </div>
                        <div className="col-md-4">
                          <CFormLabel>National ID</CFormLabel>
                          <CFormInput
                            value={studentForms[id]?.citizenship?.nationalId || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], citizenship: { ...prev[id].citizenship, nationalId: e.target.value } },
                            }))}
                          />
                        </div>
                        <div className="col-md-4">
                          <CFormLabel>National ID Expiry</CFormLabel>
                          <CFormInput
                            type="date"
                            value={studentForms[id]?.citizenship?.nationalIdExpiry || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], citizenship: { ...prev[id].citizenship, nationalIdExpiry: e.target.value } },
                            }))}
                          />
                        </div>
                      </div>

                      {/* Schooling */}
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <CFormLabel>Program</CFormLabel>
                          <CFormInput
                            value={studentForms[id]?.schooling?.program || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], schooling: { ...prev[id].schooling, program: e.target.value } },
                            }))}
                          />
                        </div>
                        <div className="col-md-6">
                          <CFormLabel>Returning Student Year</CFormLabel>
                          <CFormInput
                            value={studentForms[id]?.schooling?.returningStudentYear || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], schooling: { ...prev[id].schooling, returningStudentYear: e.target.value } },
                            }))}
                          />
                        </div>
                      </div>
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <CFormLabel>Day School Employer</CFormLabel>
                          <CFormInput
                            value={studentForms[id]?.schooling?.daySchoolEmployer || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], schooling: { ...prev[id].schooling, daySchoolEmployer: e.target.value } },
                            }))}
                          />
                        </div>
                        <div className="col-md-6">
                          <CFormLabel>Custody Details</CFormLabel>
                          <CFormInput
                            value={studentForms[id]?.schooling?.custodyDetails || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], schooling: { ...prev[id].schooling, custodyDetails: e.target.value } },
                            }))}
                          />
                        </div>
                      </div>
                      <div className="row mb-3">
                        <div className="col-md-12">
                          <CFormLabel>Additional Notes</CFormLabel>
                          <CFormTextarea
                            rows={3}
                            value={studentForms[id]?.schooling?.notes || ''}
                            onChange={(e) => setStudentForms((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], schooling: { ...prev[id].schooling, notes: e.target.value } },
                            }))}
                            placeholder="Any additional information or notes"
                          />
                        </div>
                      </div>

                      <div className="d-flex gap-2">
                        <CButton color="primary" onClick={async () => {
                          try {
                            const form = studentForms[id]
                            await updateDoc(doc(firestore, 'students', id), {
                              personalInfo: { ...data.personalInfo, ...form.personalInfo },
                              address: form.address,
                              citizenship: form.citizenship,
                              contact: form.contact,
                              language: form.language,
                              schooling: form.schooling,
                              uploadedAt: serverTimestamp(),
                            })
                            addToast(successToast('Student updated'))
                          } catch (e) {
                            addToast(errorToast('Failed to update student'))
                          }
                        }}>Save Changes</CButton>
                      </div>
                    </CForm>
                  </CAccordionBody>
                </CAccordionItem>
              ))}
            </CAccordion>
          )}
        </CCardBody>
      </CCard>

      <div className="mt-3">
        <CButton color="primary" onClick={() => setCurrentStep(forcePasswordChange ? 4 : 5)}>
          {forcePasswordChange ? 'Continue to Set Password' : 'Review & Finish'}
        </CButton>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <CCard>
      <CCardHeader>
        <h4>
          <CIcon icon={cilCheckCircle} className="me-2" />
          Confirm & Finish
        </h4>
      </CCardHeader>
      <CCardBody>
        <CAlert color="info">
          Please review your information below. When ready, complete onboarding.
        </CAlert>

        <div className="mb-4">
          <h5>Parent</h5>
          <div className="row">
            <div className="col-md-6">
              <strong>Tarbiyah ID:</strong> {verificationData.tarbiyahId || verifiedParentId}
            </div>
            <div className="col-md-6">
              <strong>Name:</strong> {parentData.personalInfo?.salutation} {parentData.personalInfo?.firstName} {parentData.personalInfo?.lastName}
            </div>
          </div>
          <div className="row mt-2">
            <div className="col-md-6">
              <strong>Email:</strong> {parentData.contact?.email}
            </div>
            <div className="col-md-6">
              <strong>Phone:</strong> {parentData.contact?.phone1}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h5>Students {(studentDocs?.length || 0) > 0 ? `(${studentDocs.length})` : ''}</h5>
          <ul className="mb-0">
            {(studentDocs || []).map((s) => (
              <li key={`r-${s.id}`}>{s.data?.personalInfo?.firstName} {s.data?.personalInfo?.lastName} - ID: {s.data?.schoolId || s.id}</li>
            ))}
          </ul>
        </div>

        <div className="mt-4 d-flex gap-2">
          <CButton color="secondary" onClick={() => setCurrentStep(3)}>Back to Students</CButton>
          <CButton
            color="primary"
            onClick={async () => {
              try {
                await updateDoc(doc(firestore, 'parents', verifiedParentId || verificationData.tarbiyahId), { onboarding: true, uploadedAt: serverTimestamp() })
                addToast(successToast('Onboarding completed successfully! Welcome to Tarbiyah Learning Academy.'))
                navigate('/dashboard')
              } catch (e) {
                addToast(errorToast('Failed to complete onboarding. Please try again.'))
              }
            }}
          >
            Complete Onboarding
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  )

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
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
              {currentStep === 5 && renderStep5()}
            </div>
          </CCol>
        </CRow>
      </CContainer>
    </>
  );
};

export default OnboardingPage; 