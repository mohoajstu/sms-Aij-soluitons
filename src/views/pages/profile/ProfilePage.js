import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CForm,
  CFormInput,
  CFormSelect,
  CFormLabel,
  CButton,
  CToaster,
  CToast,
  CToastBody,
  CSpinner,
  CAccordion,
  CAccordionItem,
  CAccordionHeader,
  CAccordionBody,
  CFormTextarea,
  CBadge,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCheckCircle, cilUser, cilPencil, cilSave } from '@coreui/icons';
import { firestore } from 'src/firebase';
import useAuth from 'src/Firebase/useAuth';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user: currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, addToast] = useState(0);
  const toaster = useRef();

  const successToast = (
    <CToast color="success" className="text-white align-items-center">
      <div className="d-flex">
        <CToastBody>
          <CIcon icon={cilCheckCircle} className="me-2" />
          Profile updated successfully!
        </CToastBody>
      </div>
    </CToast>
  );

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser) return;

      setLoading(true);
      try {
        // First, get the user document to determine their role and linked collection
          const userRef = doc(firestore, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          console.error('User document not found');
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        const tarbiyahId = userData.tarbiyahId || userData.schoolId || currentUser.uid; // Fallback to UID if tarbiyahId is not present
        setUserData(userData);

        let linkedCollection;
        // The role from the user data determines the collection
        const userRoleRaw = userData.role || '';
        const userRole = userRoleRaw.toString().toLowerCase();
        switch(userRole) {
          case 'faculty':
            linkedCollection = 'faculty';
            break;
          case 'student':
            linkedCollection = 'students';
            break;
          case 'parent':
            linkedCollection = 'parents';
            break;
          case 'admin':
          case 'schooladmin':
          case 'school_admin':
            linkedCollection = 'admins';
            break;
          default:
            console.error(`Unknown role: ${userRoleRaw}. Falling back to 'parents'.`);
            linkedCollection = 'parents';
        }
        
        const profileRef = doc(firestore, linkedCollection, tarbiyahId);
        const profileDoc = await getDoc(profileRef);

        if (profileDoc.exists()) {
          setProfileData(profileDoc.data());
      } else {
          console.error(`Profile document not found in '${linkedCollection}' with ID '${tarbiyahId}'`);
        }
        } catch (error) {
        console.error('Error fetching profile data:', error);
        } finally {
          setLoading(false);
      }
    };

    fetchUserProfile();
  }, [currentUser]);

  const handleInputChange = (category, field, value) => {
    setProfileData((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!currentUser || !profileData || !userData) return;

    setSaving(true);
    try {
      const batch = writeBatch(firestore);
      const tarbiyahId = userData.tarbiyahId || userData.schoolId || currentUser.uid;
      
      // Update the profile document
      let linkedCollection = userData.dashboard?.linkedCollection;
      if (!linkedCollection) {
        const roleLower = (userData.role || '').toLowerCase();
        switch(roleLower) {
          case 'faculty': linkedCollection = 'faculty'; break;
          case 'student': linkedCollection = 'students'; break;
          case 'parent': linkedCollection = 'parents'; break;
          case 'admin':
          case 'schooladmin':
          case 'school_admin': linkedCollection = 'admins'; break;
          default: linkedCollection = 'parents';
        }
      }
      const profileRef = doc(firestore, linkedCollection, tarbiyahId);
      
      let updateData = {
        ...profileData,
      };

      // Handle different timestamp structures based on role
      if (userData.role === 'SchoolAdmin') {
        // SchoolAdmin uses nested timestamps object
        updateData.timestamps = {
          ...profileData.timestamps,
          uploadedAt: serverTimestamp(),
        };
      } else {
        // Other roles use direct uploadedAt field
        updateData.uploadedAt = serverTimestamp();
      }

      batch.set(profileRef, updateData, { merge: true });

      // Update the user document with name changes
      const userRef = doc(firestore, 'users', currentUser.uid);
      const userUpdate = {
        'personalInfo.firstName': profileData.personalInfo?.firstName || '',
        'personalInfo.lastName': profileData.personalInfo?.lastName || '',
        updatedAt: serverTimestamp(),
      };

      batch.update(userRef, userUpdate);

      await batch.commit();
      addToast(successToast);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getRoleDisplayName = (role) => {
    const roleLower = (role || '').toLowerCase();
    switch (roleLower) {
      case 'faculty': return 'Faculty Member';
      case 'student': return 'Student';
      case 'parent': return 'Parent';
      case 'admin': return 'Administrator';
      case 'schooladmin':
      case 'school_admin': return 'School Administrator';
      default: return role;
    }
  };

  const renderPersonalInfoSection = () => (
    <CAccordionItem itemKey="personal">
      <CAccordionHeader>Personal Information</CAccordionHeader>
      <CAccordionBody>
        <div className="row mb-3">
          <div className="col-md-3">
            <CFormLabel>Salutation</CFormLabel>
            <CFormSelect
              value={profileData.personalInfo?.salutation || ''}
              onChange={(e) => handleInputChange('personalInfo', 'salutation', e.target.value)}
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
                  value={profileData.personalInfo?.firstName || ''}
                  onChange={(e) => handleInputChange('personalInfo', 'firstName', e.target.value)}
              placeholder="Enter first name"
            />
          </div>
          <div className="col-md-3">
            <CFormLabel>Middle Name</CFormLabel>
            <CFormInput
                  value={profileData.personalInfo?.middleName || ''}
                  onChange={(e) => handleInputChange('personalInfo', 'middleName', e.target.value)}
              placeholder="Enter middle name"
            />
          </div>
          <div className="col-md-3">
            <CFormLabel>Last Name *</CFormLabel>
            <CFormInput
                  value={profileData.personalInfo?.lastName || ''}
                  onChange={(e) => handleInputChange('personalInfo', 'lastName', e.target.value)}
              placeholder="Enter last name"
            />
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-md-3">
            <CFormLabel>Date of Birth</CFormLabel>
            <CFormInput
              type="date"
                  value={profileData.personalInfo?.dob || ''}
                  onChange={(e) => handleInputChange('personalInfo', 'dob', e.target.value)}
                />
          </div>
          <div className="col-md-3">
            <CFormLabel>Gender</CFormLabel>
            <CFormSelect
                  value={profileData.personalInfo?.gender || ''}
                  onChange={(e) => handleInputChange('personalInfo', 'gender', e.target.value)}
                >
              <option value="">Select</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
            </CFormSelect>
          </div>
          <div className="col-md-3">
            <CFormLabel>Nickname</CFormLabel>
            <CFormInput
              value={profileData.personalInfo?.nickName || ''}
              onChange={(e) => handleInputChange('personalInfo', 'nickName', e.target.value)}
              placeholder="Enter nickname"
            />
          </div>
        </div>
      </CAccordionBody>
    </CAccordionItem>
  );

  const renderContactSection = () => (
    <CAccordionItem itemKey="contact">
      <CAccordionHeader>Contact Information</CAccordionHeader>
      <CAccordionBody>
        <div className="row mb-3">
          <div className="col-md-6">
            <CFormLabel>Email *</CFormLabel>
            <CFormInput
              type="email"
              value={profileData.contact?.email || ''}
              onChange={(e) => handleInputChange('contact', 'email', e.target.value)}
              placeholder="Enter email address"
            />
            </div>
          <div className="col-md-6">
            <CFormLabel>Primary Phone</CFormLabel>
            <CFormInput
              value={profileData.contact?.phone1 || ''}
              onChange={(e) => handleInputChange('contact', 'phone1', e.target.value)}
              placeholder="Enter primary phone number"
            />
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-md-6">
            <CFormLabel>Secondary Phone</CFormLabel>
            <CFormInput
              value={profileData.contact?.phone2 || ''}
              onChange={(e) => handleInputChange('contact', 'phone2', e.target.value)}
              placeholder="Enter secondary phone number"
            />
          </div>
          <div className="col-md-6">
            <CFormLabel>Emergency Phone</CFormLabel>
            <CFormInput
              value={profileData.contact?.emergencyPhone || ''}
              onChange={(e) => handleInputChange('contact', 'emergencyPhone', e.target.value)}
              placeholder="Enter emergency contact number"
            />
          </div>
        </div>
      </CAccordionBody>
    </CAccordionItem>
  );

  const renderAddressSection = () => (
    <CAccordionItem itemKey="address">
      <CAccordionHeader>Address Information</CAccordionHeader>
      <CAccordionBody>
        <div className="row mb-3">
          <div className="col-md-6">
            <CFormLabel>Street Address</CFormLabel>
            <CFormInput
              value={profileData.address?.streetAddress || ''}
              onChange={(e) => handleInputChange('address', 'streetAddress', e.target.value)}
              placeholder="Enter street address"
            />
          </div>
          <div className="col-md-6">
            <CFormLabel>Residential Area</CFormLabel>
            <CFormInput
                  value={profileData.address?.residentialArea || ''}
                  onChange={(e) => handleInputChange('address', 'residentialArea', e.target.value)}
              placeholder="Enter residential area"
            />
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-md-6">
            <CFormLabel>PO Box</CFormLabel>
            <CFormInput
              value={profileData.address?.poBox || ''}
              onChange={(e) => handleInputChange('address', 'poBox', e.target.value)}
              placeholder="Enter PO Box"
            />
          </div>
        </div>
      </CAccordionBody>
    </CAccordionItem>
  );

  const renderCitizenshipSection = () => (
    <CAccordionItem itemKey="citizenship">
      <CAccordionHeader>Citizenship Information</CAccordionHeader>
      <CAccordionBody>
        <div className="row mb-3">
          <div className="col-md-4">
            <CFormLabel>Nationality</CFormLabel>
            <CFormInput
              value={profileData.citizenship?.nationality || ''}
              onChange={(e) => handleInputChange('citizenship', 'nationality', e.target.value)}
              placeholder="Enter nationality"
            />
          </div>
          <div className="col-md-4">
            <CFormLabel>National ID</CFormLabel>
            <CFormInput
                  value={profileData.citizenship?.nationalId || ''}
                  onChange={(e) => handleInputChange('citizenship', 'nationalId', e.target.value)}
              placeholder="Enter national ID"
            />
          </div>
          <div className="col-md-4">
            <CFormLabel>National ID Expiry</CFormLabel>
            <CFormInput
              type="date"
                  value={profileData.citizenship?.nationalIdExpiry || ''}
              onChange={(e) => handleInputChange('citizenship', 'nationalIdExpiry', e.target.value)}
            />
          </div>
        </div>
      </CAccordionBody>
    </CAccordionItem>
  );

  const renderLanguageSection = () => (
    <CAccordionItem itemKey="language">
      <CAccordionHeader>Language Information</CAccordionHeader>
      <CAccordionBody>
        <div className="row mb-3">
          <div className="col-md-6">
            <CFormLabel>Primary Language</CFormLabel>
            <CFormInput
              value={profileData.language?.primary || ''}
              onChange={(e) => handleInputChange('language', 'primary', e.target.value)}
              placeholder="Enter primary language"
            />
          </div>
          <div className="col-md-6">
            <CFormLabel>Secondary Language</CFormLabel>
            <CFormInput
              value={profileData.language?.secondary || ''}
              onChange={(e) => handleInputChange('language', 'secondary', e.target.value)}
              placeholder="Enter secondary language"
            />
          </div>
        </div>
      </CAccordionBody>
    </CAccordionItem>
  );

  const renderFacultySection = () => {
    if ((userData?.role || '').toLowerCase() !== 'faculty') return null;

    return (
      <CAccordionItem itemKey="faculty">
        <CAccordionHeader>Faculty Information</CAccordionHeader>
        <CAccordionBody>
          <div className="row mb-3">
            <div className="col-md-6">
              <CFormLabel>Program</CFormLabel>
              <CFormInput
                value={profileData.employment?.program || ''}
                onChange={(e) => handleInputChange('employment', 'program', e.target.value)}
                placeholder="Enter program"
              />
            </div>
            <div className="col-md-6">
              <CFormLabel>Day School Employer</CFormLabel>
              <CFormInput
                value={profileData.employment?.daySchoolEmployer || ''}
                onChange={(e) => handleInputChange('employment', 'daySchoolEmployer', e.target.value)}
                placeholder="Enter employer"
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col-12">
              <CFormLabel>Courses</CFormLabel>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {profileData.courses?.map((course, index) => (
                  <CBadge key={index} color="primary" className="me-1">
                    {course}
                  </CBadge>
                ))}
              </div>
              <CFormTextarea
                rows={3}
                value={profileData.employment?.notes || ''}
                onChange={(e) => handleInputChange('employment', 'notes', e.target.value)}
                placeholder="Additional employment information or notes"
              />
        </div>
          </div>
        </CAccordionBody>
      </CAccordionItem>
    );
  };

  const renderStudentSection = () => {
    if ((userData?.role || '').toLowerCase() !== 'student') return null;

    return (
      <CAccordionItem itemKey="student">
        <CAccordionHeader>Student Information</CAccordionHeader>
        <CAccordionBody>
          <div className="row mb-3">
            <div className="col-md-6">
              <CFormLabel>Program</CFormLabel>
              <CFormInput
                value={profileData.program || ''}
                onChange={(e) => setProfileData({ ...profileData, program: e.target.value })}
                placeholder="Enter program"
              />
            </div>
            <div className="col-md-6">
              <CFormLabel>Returning Student Year</CFormLabel>
              <CFormInput
                value={profileData.returningStudentYear || ''}
                onChange={(e) => setProfileData({ ...profileData, returningStudentYear: e.target.value })}
                placeholder="Enter returning student year"
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col-12">
              <CFormLabel>Custody Details</CFormLabel>
              <CFormTextarea
                rows={3}
                value={profileData.custodyDetails || ''}
                onChange={(e) => setProfileData({ ...profileData, custodyDetails: e.target.value })}
                placeholder="Enter custody details"
              />
            </div>
          </div>
        </CAccordionBody>
      </CAccordionItem>
    );
  };

  const renderParentSection = () => {
    if ((userData?.role || '').toLowerCase() !== 'parent') return null;

    return (
      <CAccordionItem itemKey="parent">
        <CAccordionHeader>Parent Information</CAccordionHeader>
        <CAccordionBody>
          <div className="row mb-3">
            <div className="col-md-6">
              <CFormLabel>Day School Employer</CFormLabel>
              <CFormInput
                value={profileData.daySchoolEmployer || ''}
                onChange={(e) => setProfileData({ ...profileData, daySchoolEmployer: e.target.value })}
                placeholder="Enter employer"
              />
            </div>
            <div className="col-md-6">
              <CFormLabel>Custody Details</CFormLabel>
              <CFormInput
                value={profileData.custodyDetails || ''}
                onChange={(e) => setProfileData({ ...profileData, custodyDetails: e.target.value })}
                placeholder="Enter custody details"
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col-12">
              <CFormLabel>Notes</CFormLabel>
              <CFormTextarea
                rows={3}
                value={profileData.notes || ''}
                onChange={(e) => setProfileData({ ...profileData, notes: e.target.value })}
                placeholder="Additional notes"
              />
        </div>
          </div>
        </CAccordionBody>
      </CAccordionItem>
    );
  };

  const renderAdminSection = () => {
    const roleLower = (userData?.role || '').toLowerCase();
    if (roleLower !== 'admin' && roleLower !== 'schooladmin' && roleLower !== 'school_admin') return null;

    return (
      <CAccordionItem itemKey="admin">
        <CAccordionHeader>Administrator Information</CAccordionHeader>
        <CAccordionBody>
          <div className="row mb-3">
            <div className="col-md-6">
              <CFormLabel>Day School Employer</CFormLabel>
              <CFormInput
                value={profileData.employment?.daySchoolEmployer || ''}
                onChange={(e) => handleInputChange('employment', 'daySchoolEmployer', e.target.value)}
                placeholder="Enter employer"
              />
            </div>
            <div className="col-md-6">
              <CFormLabel>Program</CFormLabel>
              <CFormInput
                value={profileData.employment?.program || ''}
                onChange={(e) => handleInputChange('employment', 'program', e.target.value)}
                placeholder="Enter program"
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col-12">
              <CFormLabel>Notes</CFormLabel>
              <CFormTextarea
                rows={3}
                value={profileData.employment?.notes || ''}
                onChange={(e) => handleInputChange('employment', 'notes', e.target.value)}
                placeholder="Additional notes"
              />
        </div>
          </div>
        </CAccordionBody>
      </CAccordionItem>
    );
  };

  const renderTimestampsSection = () => {
    if ((userData?.role || '').toLowerCase() !== 'schooladmin' && (userData?.role || '').toLowerCase() !== 'school_admin') return null;

    return (
      <CAccordionItem itemKey="timestamps">
        <CAccordionHeader>Record Information</CAccordionHeader>
        <CAccordionBody>
          <div className="row mb-3">
            <div className="col-md-6">
              <CFormLabel>Created At</CFormLabel>
              <CFormInput
                value={profileData.timestamps?.createdAt ? 
                  (profileData.timestamps.createdAt.toDate ? 
                    profileData.timestamps.createdAt.toDate().toLocaleString() : 
                    'Not set') : 'Will be set on creation'}
                readOnly
                disabled
              />
            </div>
            <div className="col-md-6">
              <CFormLabel>Last Updated</CFormLabel>
              <CFormInput
                value={profileData.timestamps?.uploadedAt ? 
                  (profileData.timestamps.uploadedAt.toDate ? 
                    profileData.timestamps.uploadedAt.toDate().toLocaleString() : 
                    'Not set') : 'Will be set on save'}
                readOnly
                disabled
              />
            </div>
          </div>
          <small className="text-muted">
            Timestamps are automatically managed and cannot be edited manually.
          </small>
        </CAccordionBody>
      </CAccordionItem>
    );
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="text-center p-5">
          <CSpinner />
          <p className="mt-3">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profileData || !userData) {
    return (
      <div className="profile-page">
        <div className="text-center p-5">
          <h3>Profile Not Found</h3>
          <p>Unable to load your profile information. Please contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <CToaster ref={toaster} push={toast} placement="top-end" />
      <div className="profile-page">
        <div className="profile-header">
          <div className="profile-header-content">
            <div className="profile-avatar">
              <CIcon icon={cilUser} size="2xl" />
            </div>
            <div className="profile-info">
              <h1 className="profile-name">
                {profileData.personalInfo?.firstName} {profileData.personalInfo?.lastName}
              </h1>
              <div className="profile-role">
                <CBadge color="primary">{getRoleDisplayName(userData.role)}</CBadge>
                <span className="profile-id">ID: {profileData.schoolId || userData.tarbiyahId}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-card">
          <div className="profile-card-header">
            <div className="profile-card-title">
              <CIcon icon={cilPencil} className="me-2" />
              Edit Profile
            </div>
            <div className="profile-card-subtitle">
              Update your personal information and preferences
            </div>
          </div>
          <div className="profile-card-body">
            <CForm>
              <CAccordion flush>
                {renderPersonalInfoSection()}
                {renderContactSection()}
                {renderAddressSection()}
                {renderCitizenshipSection()}
                {renderLanguageSection()}
                {renderFacultySection()}
                {renderStudentSection()}
                {renderParentSection()}
                {renderAdminSection()}
                {renderTimestampsSection()}
              </CAccordion>
              
              <div className="profile-actions">
                <CButton
                  color="primary"
                  onClick={handleSave}
                  disabled={saving}
                  className="save-button"
                >
                  <CIcon icon={saving ? undefined : cilSave} className="me-2" />
                  {saving ? <CSpinner size="sm" /> : 'Save Changes'}
                </CButton>
              </div>
            </CForm>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfilePage; 