import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { CToaster, CToast, CToastHeader, CToastBody } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCheckCircle, cilUser, cilChild } from '@coreui/icons';
import { firestore } from 'src/firebase';
import useAuth from 'src/Firebase/useAuth';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user: currentUser } = useAuth();
  const [parentData, setParentData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState('my-profile');
  const [loading, setLoading] = useState(true);
  const [toast, addToast] = useState(0);
  const toaster = useRef();

  const successToast = (
    <CToast color="success" className="text-white align-items-center">
      <div className="d-flex">
        <CToastBody>
          <CIcon icon={cilCheckCircle} className="me-2" />
          Profile has been updated successfully.
        </CToastBody>
      </div>
    </CToast>
  );

  useEffect(() => {
    const fetchParentData = async () => {
      if (currentUser) {
        try {
          const userRef = doc(firestore, 'users', currentUser.uid);
          const parentRef = doc(firestore, 'parents', currentUser.uid);
          const [userDoc, parentDoc] = await Promise.all([getDoc(userRef), getDoc(parentRef)]);
          const combinedData = {
            ...(userDoc.exists() ? userDoc.data() : {}),
            ...(parentDoc.exists() ? parentDoc.data() : {}),
          };
          setParentData(combinedData);
          setProfileData(combinedData); // Initially, show parent's profile
        } catch (error) {
          console.error('Error fetching parent data:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchParentData();
  }, [currentUser]);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      if (selectedProfileId === 'my-profile') {
        setProfileData(parentData);
        setLoading(false);
      } else {
        try {
          const userRef = doc(firestore, 'users', selectedProfileId);
          const studentRef = doc(firestore, 'students', selectedProfileId);
          const [userDoc, studentDoc] = await Promise.all([getDoc(userRef), getDoc(studentRef)]);
          const combinedData = {
            ...(userDoc.exists() ? userDoc.data() : {}),
            ...(studentDoc.exists() ? studentDoc.data() : {}),
          };
          setProfileData(combinedData);
        } catch (error) {
          console.error('Error fetching student data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    if (parentData) {
      fetchProfileData();
    }
  }, [selectedProfileId, parentData]);

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
    if (!currentUser || !profileData) return;

    const isMyProfile = selectedProfileId === 'my-profile';
    const idToUpdate = isMyProfile ? currentUser.uid : selectedProfileId;

    const userRef = doc(firestore, 'users', idToUpdate);
    const specificRef = doc(firestore, isMyProfile ? 'parents' : 'students', idToUpdate);

    try {
      const batch = writeBatch(firestore);
      const userDocUpdate = {
        'personalInfo.firstName': profileData.personalInfo.firstName,
        'personalInfo.lastName': profileData.personalInfo.lastName,
      };
      batch.update(userRef, userDocUpdate);

      const specificDocUpdate = {
        address: profileData.address,
        citizenship: profileData.citizenship,
        contact: profileData.contact,
        language: profileData.language,
        schooling: profileData.schooling,
        personalInfo: profileData.personalInfo,
      };
      
      if(!isMyProfile) {
        specificDocUpdate.parents = profileData.parents;
      }

      batch.update(specificRef, specificDocUpdate);

      await batch.commit();
      addToast(successToast);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile.');
    }
  };

  if (loading || !profileData) {
    return <div>Loading...</div>;
  }

  const isMyProfile = selectedProfileId === 'my-profile'

  return (
    <>
      <CToaster ref={toaster} push={toast} placement="top-end" />
      <div className="profile-page">
        <div className="profile-switcher-wrapper">
          <CIcon icon={isMyProfile ? cilUser : cilChild} className="me-2" />
          <select
            className="profile-switcher"
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
          >
            <option value="my-profile">My Profile</option>
            {parentData?.students?.map((student) => (
              <option key={student.studentID} value={student.studentID}>
                {student.studentName}
              </option>
            ))}
          </select>
        </div>
        <h1 className="page-title">
          Edit Profile: {isMyProfile ? 'Me' : profileData.personalInfo?.firstName}
        </h1>
        {/* Render form based on profile type */}
        <div className="profile-section">
          <div className="profile-section-header">
            <h2 className="profile-section-title">Personal Information</h2>
          </div>
          <div className="profile-section-content">
            <div className="form-grid">
              <label>
                First Name:
                <input
                  type="text"
                  value={profileData.personalInfo?.firstName || ''}
                  onChange={(e) => handleInputChange('personalInfo', 'firstName', e.target.value)}
                />
              </label>
              <label>
                Middle Name:
                <input
                  type="text"
                  value={profileData.personalInfo?.middleName || ''}
                  onChange={(e) => handleInputChange('personalInfo', 'middleName', e.target.value)}
                />
              </label>
              <label>
                Last Name:
                <input
                  type="text"
                  value={profileData.personalInfo?.lastName || ''}
                  onChange={(e) => handleInputChange('personalInfo', 'lastName', e.target.value)}
                />
              </label>
              <label>
                Date of Birth:
                <input
                  type="text"
                  placeholder="MM/DD/YYYY"
                  value={profileData.personalInfo?.dob || ''}
                  onChange={(e) => handleInputChange('personalInfo', 'dob', e.target.value)}
                />
              </label>
              <label>
                Gender:
                <select
                  value={profileData.personalInfo?.gender || ''}
                  onChange={(e) => handleInputChange('personalInfo', 'gender', e.target.value)}
                >
                  <option value="">Select Gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </label>
              <label>
                Salutation:
                <input
                  type="text"
                  value={profileData.personalInfo?.salutation || ''}
                  onChange={(e) => handleInputChange('personalInfo', 'salutation', e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>
        <div className="profile-section">
          <div className="profile-section-header">
            <h2 className="profile-section-title">Address</h2>
          </div>
          <div className="profile-section-content">
            <div className="form-grid">
              <label>
                P.O. Box:
                <input
                  type="text"
                  value={profileData.address?.poBox || ''}
                  onChange={(e) => handleInputChange('address', 'poBox', e.target.value)}
                />
              </label>
              <label>
                Residential Area:
                <input
                  type="text"
                  value={profileData.address?.residentialArea || ''}
                  onChange={(e) => handleInputChange('address', 'residentialArea', e.target.value)}
                />
              </label>
              <label>
                Street Address:
                <input
                  type="text"
                  value={profileData.address?.streetAddress || ''}
                  onChange={(e) => handleInputChange('address', 'streetAddress', e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>
        <div className="profile-section">
          <div className="profile-section-header">
            <h2 className="profile-section-title">Citizenship</h2>
          </div>
          <div className="profile-section-content">
            <div className="form-grid">
              <label>
                National ID:
                <input
                  type="text"
                  value={profileData.citizenship?.nationalId || ''}
                  onChange={(e) => handleInputChange('citizenship', 'nationalId', e.target.value)}
                />
              </label>
              <label>
                National ID Expiry:
                <input
                  type="text"
                  placeholder="MM/DD/YYYY"
                  value={profileData.citizenship?.nationalIdExpiry || ''}
                  onChange={(e) =>
                    handleInputChange('citizenship', 'nationalIdExpiry', e.target.value)
                  }
                />
              </label>
              <label>
                Nationality:
                <input
                  type="text"
                  value={profileData.citizenship?.nationality || ''}
                  onChange={(e) => handleInputChange('citizenship', 'nationality', e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>
        <div className="profile-section">
          <div className="profile-section-header">
            <h2 className="profile-section-title">Contact</h2>
          </div>
          <div className="profile-section-content">
            <div className="form-grid">
              <label>
                Email:
                <input
                  type="text"
                  value={profileData.contact?.email || ''}
                  onChange={(e) => handleInputChange('contact', 'email', e.target.value)}
                />
              </label>
              <label>
                Emergency Phone:
                <input
                  type="text"
                  value={profileData.contact?.emergencyPhone || ''}
                  onChange={(e) => handleInputChange('contact', 'emergencyPhone', e.target.value)}
                />
              </label>
              <label>
                Phone 1:
                <input
                  type="text"
                  value={profileData.contact?.phone1 || ''}
                  onChange={(e) => handleInputChange('contact', 'phone1', e.target.value)}
                />
              </label>
              <label>
                Phone 2:
                <input
                  type="text"
                  value={profileData.contact?.phone2 || ''}
                  onChange={(e) => handleInputChange('contact', 'phone2', e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>
        <div className="profile-section">
          <div className="profile-section-header">
            <h2 className="profile-section-title">Language</h2>
          </div>
          <div className="profile-section-content">
            <div className="form-grid">
              <label>
                Primary:
                <input
                  type="text"
                  value={profileData.language?.primary || ''}
                  onChange={(e) => handleInputChange('language', 'primary', e.target.value)}
                />
              </label>
              <label>
                Secondary:
                <input
                  type="text"
                  value={profileData.language?.secondary || ''}
                  onChange={(e) => handleInputChange('language', 'secondary', e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>
        <div className="profile-section">
          <div className="profile-section-header">
            <h2 className="profile-section-title">Other</h2>
          </div>
          <div className="profile-section-content">
            <div className="form-grid">
              <label>
                Custody Details:
                <input
                  type="text"
                  value={profileData.schooling?.custodyDetails || ''}
                  onChange={(e) => handleInputChange('schooling', 'custodyDetails', e.target.value)}
                />
              </label>
              <label>
                Day School Employer:
                <input
                  type="text"
                  value={profileData.schooling?.daySchoolEmployer || ''}
                  onChange={(e) =>
                    handleInputChange('schooling', 'daySchoolEmployer', e.target.value)
                  }
                />
              </label>
              <label>
                Notes:
                <input
                  type="text"
                  value={profileData.schooling?.notes || ''}
                  onChange={(e) => handleInputChange('schooling', 'notes', e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>
        <button onClick={handleSave} className="save-button">
          Save Changes
        </button>
      </div>
    </>
  );
};

export default ProfilePage; 