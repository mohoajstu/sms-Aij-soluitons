import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore } from 'src/firebase';
import useAuth from 'src/Firebase/useAuth';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user: currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      const userRef = doc(firestore, 'users', currentUser.uid);
      getDoc(userRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching user data:', error);
          setLoading(false);
        });
    }
  }, [currentUser]);

  const handleInputChange = (category, field, value) => {
    setUserData((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    if (currentUser) {
      const userRef = doc(firestore, 'users', currentUser.uid);
      updateDoc(userRef, userData)
        .then(() => {
          alert('Profile updated successfully!');
        })
        .catch((error) => {
          console.error('Error updating profile:', error);
        });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!userData) {
    return <div>User data not found.</div>;
  }

  return (
    <div className="profile-page">
      <h1>Edit Profile</h1>
      <div className="profile-section">
        <h2>Personal Information</h2>
        <div className="form-grid">
          <label>
            First Name:
            <input
              type="text"
              value={userData.personalInfo?.firstName || ''}
              onChange={(e) => handleInputChange('personalInfo', 'firstName', e.target.value)}
            />
          </label>
          <label>
            Middle Name:
            <input
              type="text"
              value={userData.personalInfo?.middleName || ''}
              onChange={(e) => handleInputChange('personalInfo', 'middleName', e.target.value)}
            />
          </label>
          <label>
            Last Name:
            <input
              type="text"
              value={userData.personalInfo?.lastName || ''}
              onChange={(e) => handleInputChange('personalInfo', 'lastName', e.target.value)}
            />
          </label>
           <label>
            Date of Birth:
            <input
              type="text"
              value={userData.personalInfo?.dob || ''}
              onChange={(e) => handleInputChange('personalInfo', 'dob', e.target.value)}
            />
          </label>
          <label>
            Gender:
            <input
              type="text"
              value={userData.personalInfo?.gender || ''}
              onChange={(e) => handleInputChange('personalInfo', 'gender', e.target.value)}
            />
          </label>
          <label>
            Salutation:
            <input
              type="text"
              value={userData.personalInfo?.salutation || ''}
              onChange={(e) => handleInputChange('personalInfo', 'salutation', e.target.value)}
            />
          </label>
        </div>
      </div>
        <div className="profile-section">
        <h2>Address</h2>
        <div className="form-grid">
          <label>
            P.O. Box:
            <input
              type="text"
              value={userData.address?.poBox || ''}
              onChange={(e) => handleInputChange('address', 'poBox', e.target.value)}
            />
          </label>
          <label>
            Residential Area:
            <input
              type="text"
              value={userData.address?.residentialArea || ''}
              onChange={(e) => handleInputChange('address', 'residentialArea', e.target.value)}
            />
          </label>
          <label>
            Street Address:
            <input
              type="text"
              value={userData.address?.streetAddress || ''}
              onChange={(e) => handleInputChange('address', 'streetAddress', e.target.value)}
            />
          </label>
        </div>
      </div>
       <div className="profile-section">
        <h2>Citizenship</h2>
        <div className="form-grid">
          <label>
            National ID:
            <input
              type="text"
              value={userData.citizenship?.nationalId || ''}
              onChange={(e) => handleInputChange('citizenship', 'nationalId', e.target.value)}
            />
          </label>
          <label>
            National ID Expiry:
            <input
              type="text"
              value={userData.citizenship?.nationalIdExpiry || ''}
              onChange={(e) => handleInputChange('citizenship', 'nationalIdExpiry', e.target.value)}
            />
          </label>
          <label>
            Nationality:
            <input
              type="text"
              value={userData.citizenship?.nationality || ''}
              onChange={(e) => handleInputChange('citizenship', 'nationality', e.target.value)}
            />
          </label>
        </div>
      </div>
       <div className="profile-section">
        <h2>Contact</h2>
        <div className="form-grid">
          <label>
            Email:
            <input
              type="text"
              value={userData.contact?.email || ''}
              onChange={(e) => handleInputChange('contact', 'email', e.target.value)}
            />
          </label>
          <label>
            Emergency Phone:
            <input
              type="text"
              value={userData.contact?.emergencyPhone || ''}
              onChange={(e) => handleInputChange('contact', 'emergencyPhone', e.target.value)}
            />
          </label>
          <label>
            Phone 1:
            <input
              type="text"
              value={userData.contact?.phone1 || ''}
              onChange={(e) => handleInputChange('contact', 'phone1', e.target.value)}
            />
          </label>
          <label>
            Phone 2:
            <input
              type="text"
              value={userData.contact?.phone2 || ''}
              onChange={(e) => handleInputChange('contact', 'phone2', e.target.value)}
            />
          </label>
        </div>
      </div>
      <div className="profile-section">
        <h2>Language</h2>
        <div className="form-grid">
          <label>
            Primary:
            <input
              type="text"
              value={userData.language?.primary || ''}
              onChange={(e) => handleInputChange('language', 'primary', e.target.value)}
            />
          </label>
          <label>
            Secondary:
            <input
              type="text"
              value={userData.language?.secondary || ''}
              onChange={(e) => handleInputChange('language', 'secondary', e.target.value)}
            />
          </label>
        </div>
      </div>
      <div className="profile-section">
        <h2>Schooling</h2>
        <div className="form-grid">
          <label>
            Custody Details:
            <input
              type="text"
              value={userData.schooling?.custodyDetails || ''}
              onChange={(e) => handleInputChange('schooling', 'custodyDetails', e.target.value)}
            />
          </label>
          <label>
            Day School Employer:
            <input
              type="text"
              value={userData.schooling?.daySchoolEmployer || ''}
              onChange={(e) => handleInputChange('schooling', 'daySchoolEmployer', e.target.value)}
            />
          </label>
          <label>
            Notes:
            <input
              type="text"
              value={userData.schooling?.notes || ''}
              onChange={(e) => handleInputChange('schooling', 'notes', e.target.value)}
            />
          </label>
        </div>
      </div>
      <button onClick={handleSave} className="save-button">Save Changes</button>
    </div>
  );
};

export default ProfilePage; 