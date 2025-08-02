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
  CCollapse,
  CFormCheck,
  CFormTextarea,
  CAccordion,
  CAccordionItem,
  CAccordionHeader,
  CAccordionBody,
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
    const defaultData = getDefaultFormData(collectionName);
    // Auto-generate ID for new items
    if (collectionName === 'students' || collectionName === 'parents' || collectionName === 'faculty' || collectionName === 'admins') {
      defaultData.schoolId = generateId(collectionName);
    }
    setFormData(defaultData);
    setShowModal(true);
  };

  const handleEdit = (item, collectionName) => {
    setModalType('edit');
    setSelectedItem(item);
    setFormData({ ...item, collectionName });
    setShowModal(true);
  };

  const getSingularName = (collectionName) => {
    const singularMap = {
      students: 'student',
      parents: 'parent',
      faculty: 'faculty member',
      admins: 'admin',
    };
    return singularMap[collectionName] || collectionName;
  };

  const handleDelete = async (item, collectionName) => {
    if (window.confirm(`Are you sure you want to delete this ${getSingularName(collectionName)}?`)) {
      try {
        const batch = writeBatch(firestore);
        
        // Delete the main document
        batch.delete(doc(firestore, collectionName, item.id));
        
        // If deleting a student, remove from parents' students arrays
        if (collectionName === 'students') {
          const allParents = collections.parents;
          for (const parent of allParents) {
            const existingStudents = parent.students || [];
            const hasStudent = existingStudents.some(s => 
              s.studentId === item.id || s.studentID === item.id || s.studentId === item.schoolId
            );
            
            if (hasStudent) {
              const updatedStudents = existingStudents.filter(s => 
                s.studentId !== item.id && s.studentID !== item.id && s.studentId !== item.schoolId
              );
              const parentRef = doc(firestore, 'parents', parent.id);
              batch.update(parentRef, { students: updatedStudents });
            }
          }
        }
        
        await batch.commit();
        await fetchAllCollections();
        addToast(successToast(`${getSingularName(collectionName)} deleted successfully`));
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const handleSave = async () => {
    try {
      const batch = writeBatch(firestore);
      const collectionName = formData.collectionName || activeTab;
      
      // For students, parents, faculty, and admins, use schoolId as document ID, for others use existing logic
      let documentId;
      if (collectionName === 'students' || collectionName === 'parents' || collectionName === 'faculty' || collectionName === 'admins') {
        documentId = formData.schoolId || formData.id || generateId(collectionName);
      } else {
        documentId = formData.id || generateId(collectionName);
      }
      
      const docRef = doc(firestore, collectionName, documentId);

      // Prepare the data for saving
      const saveData = { ...formData };
      delete saveData.collectionName;
      
      // Ensure the document ID is stored in the data for consistency
      saveData.id = documentId;
      if (collectionName === 'students' || collectionName === 'parents' || collectionName === 'faculty' || collectionName === 'admins') {
        saveData.schoolId = documentId;
      }

      if (modalType === 'create') {
        if (collectionName === 'admins') {
          saveData.timestamps = {
            ...saveData.timestamps,
            createdAt: serverTimestamp(),
          };
        } else {
        saveData.createdAt = serverTimestamp();
      }
      }
      
      if (collectionName === 'admins') {
        saveData.timestamps = {
          ...saveData.timestamps,
          uploadedAt: serverTimestamp(),
        };
      } else {
      saveData.uploadedAt = serverTimestamp();
      }

      batch.set(docRef, saveData, { merge: true });

      // Handle student-parent relationships
      if (collectionName === 'students' && formData.parents) {
        const studentDataWithId = { ...saveData, id: documentId };
        await updateParentStudentRelationships(batch, studentDataWithId, modalType === 'create');
      }

      await batch.commit();
      await fetchAllCollections();
      setShowModal(false);
      addToast(successToast(`${getSingularName(collectionName)} ${modalType}d successfully`));
    } catch (error) {
      console.error('Error saving document:', error);
    }
  };

  const updateParentStudentRelationships = async (batch, studentData, isNewStudent) => {
    // Get all parents to potentially update
    const allParents = collections.parents;
    
    // Current parent IDs from the student data
    const currentParentIds = [
      studentData.parents?.father?.tarbiyahId,
      studentData.parents?.mother?.tarbiyahId
    ].filter(Boolean);

    // Update each parent's students array
    for (const parent of allParents) {
      const parentRef = doc(firestore, 'parents', parent.id);
        const existingStudents = parent.students || [];
      
      // Check if this student should be in this parent's students array
      const shouldBeInArray = currentParentIds.includes(parent.id);
      const isCurrentlyInArray = existingStudents.some(s => 
        s.studentId === studentData.id || s.studentID === studentData.id
      );

      if (shouldBeInArray && !isCurrentlyInArray) {
        // Add student to parent's array
        const studentEntry = {
              relationship: 'child',
          studentId: studentData.id,
          studentName: `${studentData.personalInfo?.firstName || ''} ${studentData.personalInfo?.lastName || ''}`.trim(),
        };
        const updatedStudents = [...existingStudents, studentEntry];
          batch.update(parentRef, { students: updatedStudents });
        
      } else if (!shouldBeInArray && isCurrentlyInArray) {
        // Remove student from parent's array
        const updatedStudents = existingStudents.filter(s => 
          s.studentId !== studentData.id && s.studentID !== studentData.id
        );
        batch.update(parentRef, { students: updatedStudents });
        
      } else if (shouldBeInArray && isCurrentlyInArray) {
        // Update existing entry to ensure correct data
        const updatedStudents = existingStudents.map(s => {
          if (s.studentId === studentData.id || s.studentID === studentData.id) {
            return {
              relationship: 'child',
              studentId: studentData.id,
              studentName: `${studentData.personalInfo?.firstName || ''} ${studentData.personalInfo?.lastName || ''}`.trim(),
            };
          }
          return s;
        });
        batch.update(parentRef, { students: updatedStudents });
      }
    }
  };

  const generateId = (collectionName) => {
    const prefix = {
      students: 'TLS',
      parents: 'TP',
      faculty: 'TLA',
      admins: 'TA',
    };
    
    // Find the highest existing number for this collection type
    const existingIds = collections[collectionName].map(item => {
      const id = (collectionName === 'students' || collectionName === 'parents' || collectionName === 'faculty' || collectionName === 'admins') 
        ? (item.schoolId || item.id) 
        : item.id;
      if (id && id.startsWith(prefix[collectionName])) {
        const numberPart = id.replace(prefix[collectionName], '');
        return parseInt(numberPart) || 0;
      }
      return 0;
    });
    
    // Start from a base number (e.g., 138747 for students, 105624 for parents, 5 for faculty, 746706 for admins as shown in examples)
    const baseNumber = {
      students: 138747,
      parents: 105624,
      faculty: 5,
      admins: 746706,
    };
    
    const maxNumber = existingIds.length > 0 ? Math.max(...existingIds) : baseNumber[collectionName] - 1;
    
    // Different padding for different types
    const padding = {
      students: 6,
      parents: 6, 
      faculty: 5,
      admins: 6,
    };
    
    const nextNumber = (maxNumber + 1).toString().padStart(padding[collectionName], '0');
    return `${prefix[collectionName]}${nextNumber}`;
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
      active: true,
      collectionName,
    };

    switch (collectionName) {
      case 'students':
        return {
          ...baseData,
          primaryRole: 'Student',
          schoolId: '',
          parents: {
            father: { name: '', tarbiyahId: '' },
            mother: { name: '', tarbiyahId: '' },
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
          schoolId: '',
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
          schoolId: '',
          courses: [],
          employment: {
            daySchoolEmployer: '',
            notes: '',
            program: '',
          },
        };
      case 'admins':
        return {
          ...baseData,
          primaryRole: 'SchoolAdmin',
          schoolId: '',
          employment: {
            daySchoolEmployer: '',
            notes: '',
            program: '',
          },
          timestamps: {
            createdAt: null,
            uploadedAt: null,
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
      <CModal visible={showModal} onClose={() => setShowModal(false)} size="xl">
        <CModalHeader>
          <CModalTitle>
            {modalType === 'create' ? 'Create' : 'Edit'} {getSingularName(collectionName)}
          </CModalTitle>
        </CModalHeader>
        <CModalBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <CForm>
            <CAccordion flush>
              {/* Basic Information */}
              {(collectionName === 'students' || collectionName === 'parents' || collectionName === 'faculty' || collectionName === 'admins') && (
                <CAccordionItem itemKey="basic">
                  <CAccordionHeader>Basic Information</CAccordionHeader>
                  <CAccordionBody>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <CFormLabel>
                          {collectionName === 'students' ? 'School ID' : 
                           collectionName === 'parents' ? 'Parent ID' : 
                           collectionName === 'faculty' ? 'Faculty ID' : 'Admin ID'} *
                        </CFormLabel>
                        <CFormInput
                          value={formData.schoolId || ''}
                          placeholder={modalType === 'create' ? "Auto-generated" : "Non-editable"}
                          readOnly
                          disabled
                        />
                        <small className="text-muted">
                          {modalType === 'create' 
                            ? `${collectionName === 'students' ? 'School' : 
                                collectionName === 'parents' ? 'Parent' : 
                                collectionName === 'faculty' ? 'Faculty' : 'Admin'} ID will be automatically generated` 
                            : `${collectionName === 'students' ? 'School' : 
                                collectionName === 'parents' ? 'Parent' : 
                                collectionName === 'faculty' ? 'Faculty' : 'Admin'} ID cannot be modified after creation`
                          }
                        </small>
                      </div>
                      <div className="col-md-6">
                        <CFormLabel>Status</CFormLabel>
                        <CFormSelect
                          value={formData.active ? 'true' : 'false'}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              active: e.target.value === 'true',
                            })
                          }
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </CFormSelect>
                      </div>
                    </div>
                  </CAccordionBody>
                </CAccordionItem>
              )}

            {/* Personal Information */}
              <CAccordionItem itemKey="personal">
                <CAccordionHeader>Personal Information</CAccordionHeader>
                <CAccordionBody>
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <CFormLabel>Salutation</CFormLabel>
                      <CFormSelect
                        value={formData.personalInfo?.salutation || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            personalInfo: {
                              ...formData.personalInfo,
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
                        required
                  />
                </div>
                    <div className="col-md-3">
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
                    <div className="col-md-3">
                      <CFormLabel>Last Name *</CFormLabel>
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
                        required
                  />
                </div>
              </div>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <CFormLabel>Nickname</CFormLabel>
                      <CFormInput
                        value={formData.personalInfo?.nickName || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            personalInfo: {
                              ...formData.personalInfo,
                              nickName: e.target.value,
                            },
                          })
                        }
                      />
            </div>
                    <div className="col-md-4">
                      <CFormLabel>Date of Birth</CFormLabel>
                      <CFormInput
                        type="date"
                        value={formData.personalInfo?.dob || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            personalInfo: {
                              ...formData.personalInfo,
                              dob: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <CFormLabel>Gender</CFormLabel>
                      <CFormSelect
                        value={formData.personalInfo?.gender || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            personalInfo: {
                              ...formData.personalInfo,
                              gender: e.target.value,
                            },
                          })
                        }
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
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
                      <CFormLabel>Primary Phone</CFormLabel>
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
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <CFormLabel>Secondary Phone</CFormLabel>
                      <CFormInput
                        value={formData.contact?.phone2 || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contact: { ...formData.contact, phone2: e.target.value },
                          })
                        }
                      />
            </div>
                    <div className="col-md-6">
                      <CFormLabel>Emergency Phone</CFormLabel>
                      <CFormInput
                        value={formData.contact?.emergencyPhone || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contact: { ...formData.contact, emergencyPhone: e.target.value },
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
                        value={formData.address?.streetAddress || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, streetAddress: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <CFormLabel>Residential Area</CFormLabel>
                      <CFormInput
                        value={formData.address?.residentialArea || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, residentialArea: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <CFormLabel>PO Box</CFormLabel>
                      <CFormInput
                        value={formData.address?.poBox || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, poBox: e.target.value },
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
                        value={formData.citizenship?.nationality || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            citizenship: { ...formData.citizenship, nationality: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <CFormLabel>National ID</CFormLabel>
                      <CFormInput
                        value={formData.citizenship?.nationalId || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            citizenship: { ...formData.citizenship, nationalId: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <CFormLabel>National ID Expiry</CFormLabel>
                      <CFormInput
                        type="date"
                        value={formData.citizenship?.nationalIdExpiry || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            citizenship: { ...formData.citizenship, nationalIdExpiry: e.target.value },
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
                        value={formData.language?.primary || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            language: { ...formData.language, primary: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <CFormLabel>Secondary Language</CFormLabel>
                      <CFormInput
                        value={formData.language?.secondary || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            language: { ...formData.language, secondary: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>
                </CAccordionBody>
              </CAccordionItem>

            {/* Student-specific fields */}
            {collectionName === 'students' && (
                <>
                  {/* Parent Information */}
                  <CAccordionItem itemKey="parents">
                    <CAccordionHeader>Guardian Information</CAccordionHeader>
                    <CAccordionBody>
                      <div className="mb-4">
                        <h6>Primary Guardian</h6>
                <div className="row">
                  <div className="col-md-6">
                            <CFormLabel>Primary Guardian Name</CFormLabel>
                    <CFormInput
                              value={
                                formData.parents?.mother?.tarbiyahId 
                                  ? collections.parents.find(p => p.id === formData.parents.mother.tarbiyahId)?.personalInfo
                                    ? `${collections.parents.find(p => p.id === formData.parents.mother.tarbiyahId).personalInfo.firstName || ''} ${collections.parents.find(p => p.id === formData.parents.mother.tarbiyahId).personalInfo.lastName || ''}`.trim()
                                    : 'Unknown Parent'
                                  : ''
                              }
                              readOnly
                              disabled
                              placeholder="Select parent to auto-populate name"
                            />
                          </div>
                          <div className="col-md-6">
                            <CFormLabel>Primary Guardian Tarbiyah ID</CFormLabel>
                            <CFormSelect
                              value={formData.parents?.mother?.tarbiyahId || ''}
                              onChange={(e) => {
                                const selectedParent = collections.parents.find(p => p.id === e.target.value);
                        setFormData({
                          ...formData,
                          parents: {
                            ...formData.parents,
                                    mother: {
                                      tarbiyahId: e.target.value,
                                      name: selectedParent 
                                        ? `${selectedParent.personalInfo?.firstName || ''} ${selectedParent.personalInfo?.lastName || ''}`.trim()
                                        : '',
                                    },
                                  },
                                });
                              }}
                            >
                              <option value="">Select Primary Guardian</option>
                              {collections.parents.map((parent) => (
                                <option key={parent.id} value={parent.id}>
                                  {parent.personalInfo?.firstName} {parent.personalInfo?.lastName} ({parent.id})
                                </option>
                              ))}
                            </CFormSelect>
                          </div>
                        </div>
                      </div>
                      <div className="mb-3">
                        <h6>Secondary Guardian</h6>
                        <div className="row">
                          <div className="col-md-6">
                            <CFormLabel>Secondary Guardian Name</CFormLabel>
                            <CFormInput
                              value={
                                formData.parents?.father?.tarbiyahId 
                                  ? collections.parents.find(p => p.id === formData.parents.father.tarbiyahId)?.personalInfo
                                    ? `${collections.parents.find(p => p.id === formData.parents.father.tarbiyahId).personalInfo.firstName || ''} ${collections.parents.find(p => p.id === formData.parents.father.tarbiyahId).personalInfo.lastName || ''}`.trim()
                                    : 'Unknown Parent'
                                  : ''
                              }
                              readOnly
                              disabled
                              placeholder="Select parent to auto-populate name"
                    />
                  </div>
                  <div className="col-md-6">
                            <CFormLabel>Secondary Guardian Tarbiyah ID</CFormLabel>
                    <CFormSelect
                              value={formData.parents?.father?.tarbiyahId || ''}
                              onChange={(e) => {
                                const selectedParent = collections.parents.find(p => p.id === e.target.value);
                        setFormData({
                          ...formData,
                          parents: {
                            ...formData.parents,
                            father: {
                                      tarbiyahId: e.target.value,
                                      name: selectedParent 
                                        ? `${selectedParent.personalInfo?.firstName || ''} ${selectedParent.personalInfo?.lastName || ''}`.trim()
                                        : '',
                                    },
                                  },
                                });
                              }}
                            >
                              <option value="">Select Secondary Guardian</option>
                      {collections.parents.map((parent) => (
                        <option key={parent.id} value={parent.id}>
                          {parent.personalInfo?.firstName} {parent.personalInfo?.lastName} ({parent.id})
                        </option>
                      ))}
                    </CFormSelect>
                  </div>
                </div>
                      </div>
                    </CAccordionBody>
                  </CAccordionItem>

                  {/* Schooling Information */}
                  <CAccordionItem itemKey="schooling">
                    <CAccordionHeader>Schooling Information</CAccordionHeader>
                    <CAccordionBody>
                      <div className="row mb-3">
                  <div className="col-md-6">
                          <CFormLabel>Program</CFormLabel>
                    <CFormInput
                            value={formData.schooling?.program || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                                schooling: { ...formData.schooling, program: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="col-md-6">
                          <CFormLabel>Returning Student Year</CFormLabel>
                          <CFormInput
                            value={formData.schooling?.returningStudentYear || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                                schooling: { ...formData.schooling, returningStudentYear: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <CFormLabel>Day School Employer</CFormLabel>
                          <CFormInput
                            value={formData.schooling?.daySchoolEmployer || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                schooling: { ...formData.schooling, daySchoolEmployer: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div className="col-md-6">
                          <CFormLabel>Custody Details</CFormLabel>
                          <CFormInput
                            value={formData.schooling?.custodyDetails || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                schooling: { ...formData.schooling, custodyDetails: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="row mb-3">
                        <div className="col-md-12">
                          <CFormLabel>Notes</CFormLabel>
                          <CFormTextarea
                            rows={3}
                            value={formData.schooling?.notes || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                schooling: { ...formData.schooling, notes: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>
                    </CAccordionBody>
                  </CAccordionItem>
                </>
              )}

              {/* Parent-specific fields */}
              {collectionName === 'parents' && (
                <>
                  {/* Children Information */}
                  <CAccordionItem itemKey="children">
                    <CAccordionHeader>Children Information</CAccordionHeader>
                    <CAccordionBody>
                      <div className="mb-3">
                        <CFormLabel>Associated Students</CFormLabel>
                        {formData.students && formData.students.length > 0 ? (
                          <div>
                            {formData.students.map((student, index) => (
                              <div key={index} className="border p-2 mb-2 rounded">
                                <div className="row">
                                  <div className="col-md-4">
                                    <strong>Student ID:</strong> {student.studentId}
                                  </div>
                                  <div className="col-md-4">
                                    <strong>Name:</strong> {student.studentName}
                                  </div>
                                  <div className="col-md-4">
                                    <strong>Relationship:</strong> {student.relationship}
                                  </div>
                                </div>
                              </div>
                            ))}
                  </div>
                        ) : (
                          <div className="text-muted">
                            No students currently associated with this parent. Students can be assigned when creating/editing student records.
                </div>
                        )}
              </div>
                    </CAccordionBody>
                  </CAccordionItem>

                  {/* Parent Schooling Information */}
                  <CAccordionItem itemKey="parent-schooling">
                    <CAccordionHeader>Employment & Schooling</CAccordionHeader>
                    <CAccordionBody>
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <CFormLabel>Day School Employer</CFormLabel>
                          <CFormInput
                            value={formData.schooling?.daySchoolEmployer || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                schooling: { ...formData.schooling, daySchoolEmployer: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div className="col-md-6">
                          <CFormLabel>Custody Details</CFormLabel>
                          <CFormInput
                            value={formData.schooling?.custodyDetails || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                schooling: { ...formData.schooling, custodyDetails: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="row mb-3">
                        <div className="col-md-12">
                          <CFormLabel>Notes</CFormLabel>
                          <CFormTextarea
                            rows={3}
                            value={formData.schooling?.notes || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                schooling: { ...formData.schooling, notes: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>
                    </CAccordionBody>
                  </CAccordionItem>
                                  </>
                )}

              {/* Faculty-specific fields */}
              {collectionName === 'faculty' && (
                <>
                  {/* Courses Information */}
                  <CAccordionItem itemKey="courses">
                    <CAccordionHeader>Courses & Teaching</CAccordionHeader>
                    <CAccordionBody>
                      <div className="mb-3">
                        <CFormLabel>Courses Taught</CFormLabel>
                        <CFormTextarea
                          rows={3}
                          value={formData.courses ? formData.courses.join(', ') : ''}
                          onChange={(e) => {
                            const coursesArray = e.target.value.split(',').map(course => course.trim()).filter(course => course);
                            setFormData({
                              ...formData,
                              courses: coursesArray,
                            });
                          }}
                          placeholder="Enter course codes or names separated by commas (e.g., Grade 6, TC000000, TC000001)"
                        />
                        <small className="text-muted">
                          Enter course codes or names separated by commas
                        </small>
                      </div>
                      {formData.courses && formData.courses.length > 0 && (
                        <div className="mb-3">
                          <CFormLabel>Current Courses:</CFormLabel>
                          <div className="d-flex flex-wrap gap-2 mt-2">
                            {formData.courses.map((course, index) => (
                              <span key={index} className="badge bg-primary">
                                {course}
                                <button
                                  type="button"
                                  className="btn-close btn-close-white ms-2"
                                  style={{ fontSize: '0.75em' }}
                                  onClick={() => {
                                    const updatedCourses = formData.courses.filter((_, i) => i !== index);
                                    setFormData({
                                      ...formData,
                                      courses: updatedCourses,
                                    });
                                  }}
                                ></button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </CAccordionBody>
                  </CAccordionItem>

                  {/* Employment Information */}
                  <CAccordionItem itemKey="employment">
                    <CAccordionHeader>Employment Information</CAccordionHeader>
                    <CAccordionBody>
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <CFormLabel>Day School Employer</CFormLabel>
                          <CFormInput
                            value={formData.employment?.daySchoolEmployer || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                employment: { ...formData.employment, daySchoolEmployer: e.target.value },
                              })
                            }
                            placeholder="e.g., Tarbiyah Learning Academy"
                          />
                        </div>
                        <div className="col-md-6">
                          <CFormLabel>Program</CFormLabel>
                          <CFormInput
                            value={formData.employment?.program || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                employment: { ...formData.employment, program: e.target.value },
                              })
                            }
                            placeholder="e.g., Grade 6"
                          />
                        </div>
                      </div>
                      <div className="row mb-3">
                        <div className="col-md-12">
                          <CFormLabel>Employment Notes</CFormLabel>
                          <CFormTextarea
                            rows={3}
                            value={formData.employment?.notes || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                employment: { ...formData.employment, notes: e.target.value },
                              })
                            }
                            placeholder="Additional employment information or notes"
                          />
                        </div>
                      </div>
                    </CAccordionBody>
                  </CAccordionItem>
                                  </>
                )}

              {/* Admin-specific fields */}
              {collectionName === 'admins' && (
                <>
                  {/* Employment Information */}
                  <CAccordionItem itemKey="admin-employment">
                    <CAccordionHeader>Employment Information</CAccordionHeader>
                    <CAccordionBody>
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <CFormLabel>Day School Employer</CFormLabel>
                          <CFormInput
                            value={formData.employment?.daySchoolEmployer || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                employment: { ...formData.employment, daySchoolEmployer: e.target.value },
                              })
                            }
                            placeholder="e.g., Tarbiyah Learning Academy"
                          />
                        </div>
                        <div className="col-md-6">
                          <CFormLabel>Program</CFormLabel>
                          <CFormInput
                            value={formData.employment?.program || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                employment: { ...formData.employment, program: e.target.value },
                              })
                            }
                            placeholder="e.g., All Programmes"
                          />
                        </div>
                      </div>
                      <div className="row mb-3">
                        <div className="col-md-12">
                          <CFormLabel>Employment Notes</CFormLabel>
                          <CFormTextarea
                            rows={3}
                            value={formData.employment?.notes || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                employment: { ...formData.employment, notes: e.target.value },
                              })
                            }
                            placeholder="Additional employment information or notes"
                          />
                        </div>
                      </div>
                    </CAccordionBody>
                  </CAccordionItem>

                  {/* Timestamps Information */}
                  <CAccordionItem itemKey="admin-timestamps">
                    <CAccordionHeader>Record Information</CAccordionHeader>
                    <CAccordionBody>
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <CFormLabel>Created At</CFormLabel>
                          <CFormInput
                            value={formData.timestamps?.createdAt ? 
                              (formData.timestamps.createdAt.toDate ? 
                                formData.timestamps.createdAt.toDate().toLocaleString() : 
                                'Not set') : 'Will be set on creation'}
                            readOnly
                            disabled
                          />
                        </div>
                        <div className="col-md-6">
                          <CFormLabel>Last Updated</CFormLabel>
                          <CFormInput
                            value={formData.timestamps?.uploadedAt ? 
                              (formData.timestamps.uploadedAt.toDate ? 
                                formData.timestamps.uploadedAt.toDate().toLocaleString() : 
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
                </>
              )}
            </CAccordion>
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
                Add {getSingularName(activeTab)}
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