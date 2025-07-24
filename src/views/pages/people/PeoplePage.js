import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CFormSelect,
  CFormLabel,
  CToaster,
  CToast,
  CToastBody,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPeople, cilPlus, cilPencil, cilTrash, cilCheckCircle } from '@coreui/icons';
import { firestore } from 'src/firebase';
import useAuth from 'src/Firebase/useAuth';
import './PeoplePage.css';

const PeoplePage = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('students');
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState({
    students: [],
    parents: [],
    faculty: [],
    admins: [],
  });
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create' or 'edit'
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [toast, addToast] = useState(0);
  const toaster = useRef();

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

  useEffect(() => {
    fetchAllCollections();
  }, []);

  const fetchAllCollections = async () => {
    setLoading(true);
    try {
      const [studentsSnap, parentsSnap, facultySnap, adminsSnap] = await Promise.all([
        getDocs(collection(firestore, 'students')),
        getDocs(collection(firestore, 'parents')),
        getDocs(collection(firestore, 'faculty')),
        getDocs(collection(firestore, 'admins')),
      ]);

      setCollections({
        students: studentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        parents: parentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        faculty: facultySnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        admins: adminsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      });
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = (collectionName) => {
    setModalType('create');
    setSelectedItem(null);
    setFormData(getDefaultFormData(collectionName));
    setShowModal(true);
  };

  const handleEdit = (item, collectionName) => {
    setModalType('edit');
    setSelectedItem(item);
    setFormData({ ...item, collectionName });
    setShowModal(true);
  };

  const handleDelete = async (item, collectionName) => {
    if (window.confirm(`Are you sure you want to delete this ${collectionName.slice(0, -1)}?`)) {
      try {
        await deleteDoc(doc(firestore, collectionName, item.id));
        await fetchAllCollections();
        addToast(successToast(`${collectionName.slice(0, -1)} deleted successfully`));
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const handleSave = async () => {
    try {
      const batch = writeBatch(firestore);
      const collectionName = formData.collectionName || activeTab;
      const docRef = doc(firestore, collectionName, formData.id || generateId(collectionName));

      // Prepare the data for saving
      const saveData = { ...formData };
      delete saveData.collectionName;

      if (modalType === 'create') {
        saveData.createdAt = serverTimestamp();
      }
      saveData.uploadedAt = serverTimestamp();

      batch.set(docRef, saveData, { merge: true });

      // Handle student-parent relationships
      if (collectionName === 'students' && formData.parents) {
        await updateParentStudentRelationships(batch, formData, modalType === 'create');
      }

      await batch.commit();
      await fetchAllCollections();
      setShowModal(false);
      addToast(successToast(`${collectionName.slice(0, -1)} ${modalType}d successfully`));
    } catch (error) {
      console.error('Error saving document:', error);
    }
  };

  const updateParentStudentRelationships = async (batch, studentData, isNewStudent) => {
    // Update parent documents to include this student
    const parentUpdates = [];

    if (studentData.parents?.father?.tarbiyahid) {
      parentUpdates.push(studentData.parents.father.tarbiyahid);
    }
    if (studentData.parents?.mother?.tarbiyahid) {
      parentUpdates.push(studentData.parents.mother.tarbiyahid);
    }

    for (const parentId of parentUpdates) {
      const parentRef = doc(firestore, 'parents', parentId);
      const parent = collections.parents.find((p) => p.id === parentId);
      
      if (parent) {
        const existingStudents = parent.students || [];
        const studentExists = existingStudents.some(s => s.studentID === studentData.id);
        
        if (!studentExists) {
          const updatedStudents = [
            ...existingStudents,
            {
              relationship: 'child',
              studentID: studentData.id,
              studentName: `${studentData.personalInfo?.firstName} ${studentData.personalInfo?.lastName}`,
            },
          ];
          batch.update(parentRef, { students: updatedStudents });
        }
      }
    }
  };

  const generateId = (collectionName) => {
    const prefix = {
      students: 'TEST_STUDENT_',
      parents: 'TEST_PARENT_',
      faculty: 'TEST_FACULTY_',
      admins: 'TEST_ADMIN_',
    };
    const randomNumber = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix[collectionName]}${randomNumber}`;
  };

  const getDefaultFormData = (collectionName) => {
    const baseData = {
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
      active: true,
      collectionName,
    };

    switch (collectionName) {
      case 'students':
        return {
          ...baseData,
          primaryRole: 'Student',
          parents: {
            father: { name: '', tarbiyahid: '' },
            mother: { name: '', tarbiyahid: '' },
          },
          schooling: {
            custodyDetails: '',
            daySchoolEmployer: '',
            notes: '',
            program: '',
            returningStudentYear: '',
          },
        };
      case 'parents':
        return {
          ...baseData,
          primaryRole: 'Parent',
          students: [],
          schooling: {
            custodyDetails: '',
            daySchoolEmployer: '',
            notes: '',
          },
        };
      case 'faculty':
        return {
          ...baseData,
          primaryRole: 'Faculty',
          teacherProfile: {
            classesManaged: [],
            department: '',
            subjects: [],
          },
        };
      case 'admins':
        return {
          ...baseData,
          primaryRole: 'Admin',
          adminProfile: {
            permissions: [],
            department: '',
          },
        };
      default:
        return baseData;
    }
  };

  const renderTable = (data, collectionName) => {
    if (loading) {
      return (
        <div className="text-center p-4">
          <CSpinner />
        </div>
      );
    }

    return (
      <CTable hover responsive>
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>ID</CTableHeaderCell>
            <CTableHeaderCell>Name</CTableHeaderCell>
            <CTableHeaderCell>Email</CTableHeaderCell>
            <CTableHeaderCell>Phone</CTableHeaderCell>
            {collectionName === 'students' && <CTableHeaderCell>Parents</CTableHeaderCell>}
            {collectionName === 'parents' && <CTableHeaderCell>Children</CTableHeaderCell>}
            <CTableHeaderCell>Actions</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {data.map((item) => (
            <CTableRow key={item.id}>
              <CTableDataCell>{item.schoolId || item.id}</CTableDataCell>
              <CTableDataCell>
                {`${item.personalInfo?.firstName || ''} ${item.personalInfo?.lastName || ''}`.trim()}
              </CTableDataCell>
              <CTableDataCell>{item.contact?.email || ''}</CTableDataCell>
              <CTableDataCell>{item.contact?.phone1 || ''}</CTableDataCell>
              {collectionName === 'students' && (
                <CTableDataCell>
                  {[
                    item.parents?.father?.name,
                    item.parents?.mother?.name,
                  ].filter(Boolean).join(', ')}
                </CTableDataCell>
              )}
              {collectionName === 'parents' && (
                <CTableDataCell>
                  {item.students?.map(s => s.studentName).join(', ') || ''}
                </CTableDataCell>
              )}
              <CTableDataCell>
                <CButton
                  color="primary"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(item, collectionName)}
                  className="me-2"
                >
                  <CIcon icon={cilPencil} />
                </CButton>
                <CButton
                  color="danger"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item, collectionName)}
                >
                  <CIcon icon={cilTrash} />
                </CButton>
              </CTableDataCell>
            </CTableRow>
          ))}
        </CTableBody>
      </CTable>
    );
  };

  const renderModal = () => {
    const collectionName = formData.collectionName || activeTab;
    
    return (
      <CModal visible={showModal} onClose={() => setShowModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>
            {modalType === 'create' ? 'Create' : 'Edit'} {collectionName.slice(0, -1)}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            {/* Personal Information */}
            <div className="mb-3">
              <h5>Personal Information</h5>
              <div className="row">
                <div className="col-md-4">
                  <CFormLabel>First Name</CFormLabel>
                  <CFormInput
                    value={formData.personalInfo?.firstName || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        personalInfo: {
                          ...formData.personalInfo,
                          firstName: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="col-md-4">
                  <CFormLabel>Middle Name</CFormLabel>
                  <CFormInput
                    value={formData.personalInfo?.middleName || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        personalInfo: {
                          ...formData.personalInfo,
                          middleName: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="col-md-4">
                  <CFormLabel>Last Name</CFormLabel>
                  <CFormInput
                    value={formData.personalInfo?.lastName || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        personalInfo: {
                          ...formData.personalInfo,
                          lastName: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="mb-3">
              <h5>Contact Information</h5>
              <div className="row">
                <div className="col-md-6">
                  <CFormLabel>Email</CFormLabel>
                  <CFormInput
                    type="email"
                    value={formData.contact?.email || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact: { ...formData.contact, email: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="col-md-6">
                  <CFormLabel>Phone</CFormLabel>
                  <CFormInput
                    value={formData.contact?.phone1 || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact: { ...formData.contact, phone1: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Student-specific fields */}
            {collectionName === 'students' && (
              <div className="mb-3">
                <h5>Parent Information</h5>
                <div className="row">
                  <div className="col-md-6">
                    <CFormLabel>Father Name</CFormLabel>
                    <CFormInput
                      value={formData.parents?.father?.name || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          parents: {
                            ...formData.parents,
                            father: {
                              ...formData.parents?.father,
                              name: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <CFormLabel>Father ID</CFormLabel>
                    <CFormSelect
                      value={formData.parents?.father?.tarbiyahid || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          parents: {
                            ...formData.parents,
                            father: {
                              ...formData.parents?.father,
                              tarbiyahid: e.target.value,
                            },
                          },
                        })
                      }
                    >
                      <option value="">Select Father</option>
                      {collections.parents.map((parent) => (
                        <option key={parent.id} value={parent.id}>
                          {parent.personalInfo?.firstName} {parent.personalInfo?.lastName} ({parent.id})
                        </option>
                      ))}
                    </CFormSelect>
                  </div>
                </div>
                <div className="row mt-2">
                  <div className="col-md-6">
                    <CFormLabel>Mother Name</CFormLabel>
                    <CFormInput
                      value={formData.parents?.mother?.name || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          parents: {
                            ...formData.parents,
                            mother: {
                              ...formData.parents?.mother,
                              name: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <CFormLabel>Mother ID</CFormLabel>
                    <CFormSelect
                      value={formData.parents?.mother?.tarbiyahid || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          parents: {
                            ...formData.parents,
                            mother: {
                              ...formData.parents?.mother,
                              tarbiyahid: e.target.value,
                            },
                          },
                        })
                      }
                    >
                      <option value="">Select Mother</option>
                      {collections.parents.map((parent) => (
                        <option key={parent.id} value={parent.id}>
                          {parent.personalInfo?.firstName} {parent.personalInfo?.lastName} ({parent.id})
                        </option>
                      ))}
                    </CFormSelect>
                  </div>
                </div>
              </div>
            )}
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleSave}>
            {modalType === 'create' ? 'Create' : 'Update'}
          </CButton>
        </CModalFooter>
      </CModal>
    );
  };

  return (
    <>
      <CToaster ref={toaster} push={toast} placement="top-end" />
      <div className="people-page">
        <h1 className="page-title">
          <CIcon icon={cilPeople} className="me-2" />
          People Management
        </h1>
        
        <CCard>
          <CCardHeader>
            <CNav variant="tabs">
              {['students', 'parents', 'faculty', 'admins'].map((tab) => (
                <CNavItem key={tab}>
                  <CNavLink
                    active={activeTab === tab}
                    onClick={() => setActiveTab(tab)}
                    style={{ cursor: 'pointer' }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </CNavLink>
                </CNavItem>
              ))}
            </CNav>
          </CCardHeader>
          <CCardBody>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h4>
              <CButton
                color="primary"
                onClick={() => handleCreate(activeTab)}
              >
                <CIcon icon={cilPlus} className="me-2" />
                Add {activeTab.slice(0, -1)}
              </CButton>
            </div>
            
            <CTabContent>
              <CTabPane visible={true}>
                {renderTable(collections[activeTab], activeTab)}
              </CTabPane>
            </CTabContent>
          </CCardBody>
        </CCard>

        {renderModal()}
      </div>
    </>
  );
};

export default PeoplePage; 