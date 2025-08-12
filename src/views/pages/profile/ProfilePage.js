import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc, writeBatch, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
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
  const [children, setChildren] = useState([]); // For parents: array of { id, data }
  const [activeChildIdx, setActiveChildIdx] = useState(0);
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
          console.log('currentUser id:', currentUser.uid);
          console.log('userRef', userRef);
        const userDoc = await getDoc(userRef);
        console.log('userDoc', userDoc);

        if (!userDoc.exists()) {
          console.error('User document not found');
          setLoading(false);
          return;
        }
        

        const userData = userDoc.data();
        const tarbiyahId = userData.tarbiyahId || userData.schoolId || currentUser.uid; // Fallback to UID if tarbiyahId is not present
        console.log('tarbiyahId', tarbiyahId);
        setUserData(userData);

        let linkedCollection;
        // The role from the user data determines the collection
        const userRoleRaw = userData.role || '';
        const userRole = userRoleRaw.toString().toLowerCase();
        console.log('userRole', userRole);
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

        // If the user is a parent, fetch their children (students) they are linked to
        if ((userRole || userRoleRaw).toString().toLowerCase() === 'parent') {
          try {
            const qFather = query(collection(firestore, 'students'), where('parents.father.tarbiyahId', '==', tarbiyahId));
            const qMother = query(collection(firestore, 'students'), where('parents.mother.tarbiyahId', '==', tarbiyahId));
            const [snapF, snapM] = await Promise.all([getDocs(qFather), getDocs(qMother)]);
            const merged = new Map();
            snapF.forEach((d) => merged.set(d.id, { id: d.id, data: d.data() }));
            snapM.forEach((d) => merged.set(d.id, { id: d.id, data: d.data() }));
            setChildren(Array.from(merged.values()));
            setActiveChildIdx(0);
          } catch (e) {
            console.error('Failed to fetch children for parent:', e);
          }
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

      // If parent, also save currently selected child's changes if any edits were made in UI
      if ((userData?.role || '').toLowerCase() === 'parent' && children.length > 0) {
        const activeChild = children[activeChildIdx];
        if (activeChild && activeChild.data) {
          const childRef = doc(firestore, 'students', activeChild.id);
          // Do not allow editing of IDs; merge everything else
          const { id, schoolId, createdAt, uploadedAt, ...safeData } = activeChild.data;
          // Maintain schoolId and timestamps from server
          safeData.uploadedAt = serverTimestamp();
          batch.set(childRef, safeData, { merge: true });
        }
      }

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

  // --- Parent: Children editor (full Student schema, except IDs) ---
  const renderChildrenSection = () => {
    if ((userData?.role || '').toLowerCase() !== 'parent') return null;
    if (!children || children.length === 0) return null;

    const child = children[activeChildIdx];
    const childData = child?.data || {};

    const setChildField = (path, value) => {
      setChildren((prev) => {
        const updated = [...prev];
        const item = { ...updated[activeChildIdx] };
        const data = { ...item.data };
        const keys = path.split('.');
        let cur = data;
        for (let i = 0; i < keys.length - 1; i++) {
          const k = keys[i];
          cur[k] = { ...(cur[k] || {}) };
          cur = cur[k];
        }
        cur[keys[keys.length - 1]] = value;
        item.data = data;
        updated[activeChildIdx] = item;
        return updated;
      });
    };

    return (
      <CAccordionItem itemKey="children">
        <CAccordionHeader>Children</CAccordionHeader>
        <CAccordionBody>
          <div className="mb-3 d-flex flex-wrap gap-2">
            {children.map((c, idx) => (
              <CBadge
                key={c.id}
                color={idx === activeChildIdx ? 'primary' : 'secondary'}
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveChildIdx(idx)}
              >
                {c.data?.personalInfo?.firstName || ''} {c.data?.personalInfo?.lastName || ''} ({c.id})
              </CBadge>
            ))}
          </div>

          {/* Personal Info */}
          <div className="row mb-3">
            <div className="col-md-3">
              <CFormLabel>Salutation</CFormLabel>
              <CFormSelect
                value={childData.personalInfo?.salutation || ''}
                onChange={(e) => setChildField('personalInfo.salutation', e.target.value)}
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
              <CFormLabel>First Name</CFormLabel>
              <CFormInput
                value={childData.personalInfo?.firstName || ''}
                onChange={(e) => setChildField('personalInfo.firstName', e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <CFormLabel>Middle Name</CFormLabel>
              <CFormInput
                value={childData.personalInfo?.middleName || ''}
                onChange={(e) => setChildField('personalInfo.middleName', e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <CFormLabel>Last Name</CFormLabel>
              <CFormInput
                value={childData.personalInfo?.lastName || ''}
                onChange={(e) => setChildField('personalInfo.lastName', e.target.value)}
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col-md-3">
              <CFormLabel>Date of Birth</CFormLabel>
              <CFormInput
                type="date"
                value={childData.personalInfo?.dob || ''}
                onChange={(e) => setChildField('personalInfo.dob', e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <CFormLabel>Gender</CFormLabel>
              <CFormSelect
                value={childData.personalInfo?.gender || ''}
                onChange={(e) => setChildField('personalInfo.gender', e.target.value)}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </CFormSelect>
            </div>
            <div className="col-md-3">
              <CFormLabel>Nickname</CFormLabel>
              <CFormInput
                value={childData.personalInfo?.nickName || ''}
                onChange={(e) => setChildField('personalInfo.nickName', e.target.value)}
              />
            </div>
          </div>

          {/* Contact */}
          <div className="row mb-3">
            <div className="col-md-6">
              <CFormLabel>Email</CFormLabel>
              <CFormInput
                type="email"
                value={childData.contact?.email || ''}
                onChange={(e) => setChildField('contact.email', e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <CFormLabel>Primary Phone</CFormLabel>
              <CFormInput
                value={childData.contact?.phone1 || ''}
                onChange={(e) => setChildField('contact.phone1', e.target.value)}
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col-md-6">
              <CFormLabel>Secondary Phone</CFormLabel>
              <CFormInput
                value={childData.contact?.phone2 || ''}
                onChange={(e) => setChildField('contact.phone2', e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <CFormLabel>Emergency Phone</CFormLabel>
              <CFormInput
                value={childData.contact?.emergencyPhone || ''}
                onChange={(e) => setChildField('contact.emergencyPhone', e.target.value)}
              />
            </div>
          </div>

          {/* Address */}
          <div className="row mb-3">
            <div className="col-md-6">
              <CFormLabel>Street Address</CFormLabel>
              <CFormInput
                value={childData.address?.streetAddress || ''}
                onChange={(e) => setChildField('address.streetAddress', e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <CFormLabel>Residential Area</CFormLabel>
              <CFormInput
                value={childData.address?.residentialArea || ''}
                onChange={(e) => setChildField('address.residentialArea', e.target.value)}
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col-md-6">
              <CFormLabel>PO Box</CFormLabel>
              <CFormInput
                value={childData.address?.poBox || ''}
                onChange={(e) => setChildField('address.poBox', e.target.value)}
              />
            </div>
          </div>

          {/* Citizenship */}
          <div className="row mb-3">
            <div className="col-md-4">
              <CFormLabel>Nationality</CFormLabel>
              <CFormInput
                value={childData.citizenship?.nationality || ''}
                onChange={(e) => setChildField('citizenship.nationality', e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <CFormLabel>National ID</CFormLabel>
              <CFormInput
                value={childData.citizenship?.nationalId || ''}
                onChange={(e) => setChildField('citizenship.nationalId', e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <CFormLabel>National ID Expiry</CFormLabel>
              <CFormInput
                type="date"
                value={childData.citizenship?.nationalIdExpiry || ''}
                onChange={(e) => setChildField('citizenship.nationalIdExpiry', e.target.value)}
              />
            </div>
          </div>

          {/* Language */}
          <div className="row mb-3">
            <div className="col-md-6">
              <CFormLabel>Primary Language</CFormLabel>
              <CFormInput
                value={childData.language?.primary || ''}
                onChange={(e) => setChildField('language.primary', e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <CFormLabel>Secondary Language</CFormLabel>
              <CFormInput
                value={childData.language?.secondary || ''}
                onChange={(e) => setChildField('language.secondary', e.target.value)}
              />
            </div>
          </div>

          {/* Schooling */}
          <div className="row mb-3">
            <div className="col-md-6">
              <CFormLabel>Program</CFormLabel>
              <CFormInput
                value={childData.schooling?.program || ''}
                onChange={(e) => setChildField('schooling.program', e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <CFormLabel>Returning Student Year</CFormLabel>
              <CFormInput
                value={childData.schooling?.returningStudentYear || ''}
                onChange={(e) => setChildField('schooling.returningStudentYear', e.target.value)}
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col-md-6">
              <CFormLabel>Day School Employer</CFormLabel>
              <CFormInput
                value={childData.schooling?.daySchoolEmployer || ''}
                onChange={(e) => setChildField('schooling.daySchoolEmployer', e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <CFormLabel>Notes</CFormLabel>
              <CFormTextarea
                rows={3}
                value={childData.schooling?.notes || ''}
                onChange={(e) => setChildField('schooling.notes', e.target.value)}
              />
            </div>
          </div>

          {/* Active flag (no ID edits) */}
          <div className="row mb-3">
            <div className="col-md-3">
              <CFormLabel>Status</CFormLabel>
              <CFormSelect
                value={childData.active ? 'true' : 'false'}
                onChange={(e) => setChildField('active', e.target.value === 'true')}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </CFormSelect>
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
                {renderChildrenSection()}
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