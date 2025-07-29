import React, { useState } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CAlert,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CContainer,
  CRow,
  CCol,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilUser, cilUserPlus, cilCopy } from '@coreui/icons';

const OnboardingAdmin = () => {
  const [numStudents, setNumStudents] = useState(1);
  const [parentEmail, setParentEmail] = useState('');
  const [studentNames, setStudentNames] = useState(['']);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);

  const generateRandomId = (prefix, length) => {
    const randomNumber = Math.floor(Math.random() * Math.pow(10, length));
    return `${prefix}${randomNumber.toString().padStart(length, '0')}`;
  };

  const generateCredentials = () => {
    if (!parentEmail || studentNames.some(name => !name.trim())) {
      alert('Please fill in all fields');
      return;
    }

    const parentId = generateRandomId('TP', 6);
    const studentCodes = studentNames.map(() => generateRandomId('SC', 6));
    const password = 'TarbiyahWelcome2024';

    const credentials = {
      parentId,
      password,
      parentEmail,
      students: studentNames.map((name, index) => ({
        name: name.trim(),
        code: studentCodes[index],
      })),
    };

    setGeneratedCredentials(credentials);
  };

  const generateEmailTemplate = () => {
    if (!generatedCredentials) return '';

    const studentList = generatedCredentials.students
      .map((student, index) => `${index + 1}. ${student.name} - Code: ${student.code}`)
      .join('\n');

    return `Subject: Welcome to Tarbiyah Learning Academy - Student Acceptance & Onboarding

Dear Parent,

Congratulations! We are pleased to inform you that your child(ren) have been accepted to Tarbiyah Learning Academy.

To complete the enrollment process, please visit our onboarding portal:
🔗 [School Website]/onboarding

Your Parent Credentials:
👤 Tarbiyah ID: ${generatedCredentials.parentId}
🔑 Password: ${generatedCredentials.password}

Student Information:
${studentList}

Instructions:
1. Visit the onboarding page using the link above
2. Enter your Tarbiyah ID and password
3. Complete your parent profile (if first time)
4. For each student, enter their unique code and complete their information
5. Review and submit your registration

Important Notes:
- Keep your credentials secure
- Each student has a unique code that must be used during registration
- If you have multiple children, you can register them all using the same parent account
- Contact us immediately if you experience any issues

We look forward to welcoming your family to Tarbiyah Learning Academy!

Best regards,
Tarbiyah Learning Academy Administration Team`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    });
  };

  const handleStudentNameChange = (index, value) => {
    const newNames = [...studentNames];
    newNames[index] = value;
    setStudentNames(newNames);
  };

  const updateNumStudents = (num) => {
    setNumStudents(num);
    const newNames = [...studentNames];
    
    if (num > studentNames.length) {
      // Add empty strings for new students
      for (let i = studentNames.length; i < num; i++) {
        newNames.push('');
      }
    } else {
      // Remove excess students
      newNames.splice(num);
    }
    
    setStudentNames(newNames);
  };

  return (
    <CContainer>
      <CRow className="justify-content-center">
        <CCol md={10}>
          <div className="my-4">
            <h1 className="text-center mb-4">Onboarding Credentials Generator</h1>
            <p className="text-center text-muted mb-4">
              Generate parent credentials and student codes for the onboarding system
            </p>

            <CCard className="mb-4">
              <CCardHeader>
                <h4>
                  <CIcon icon={cilUser} className="me-2" />
                  Generate New Family Credentials
                </h4>
              </CCardHeader>
              <CCardBody>
                <CForm>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <CFormLabel>Parent Email Address *</CFormLabel>
                      <CFormInput
                        type="email"
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        placeholder="parent@example.com"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <CFormLabel>Number of Students *</CFormLabel>
                      <CFormInput
                        type="number"
                        min="1"
                        max="10"
                        value={numStudents}
                        onChange={(e) => updateNumStudents(parseInt(e.target.value) || 1)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <CFormLabel>Student Names *</CFormLabel>
                    {studentNames.map((name, index) => (
                      <div key={index} className="mb-2">
                        <CFormInput
                          value={name}
                          onChange={(e) => handleStudentNameChange(index, e.target.value)}
                          placeholder={`Student ${index + 1} full name`}
                          required
                        />
                      </div>
                    ))}
                  </div>

                  <CButton
                    color="primary"
                    onClick={generateCredentials}
                    className="me-2"
                  >
                    <CIcon icon={cilUserPlus} className="me-2" />
                    Generate Credentials
                  </CButton>
                </CForm>
              </CCardBody>
            </CCard>

            {generatedCredentials && (
              <>
                <CCard className="mb-4">
                  <CCardHeader>
                    <h4>Generated Credentials</h4>
                  </CCardHeader>
                  <CCardBody>
                    <CAlert color="success">
                      <strong>Credentials generated successfully!</strong>
                    </CAlert>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <strong>Parent Email:</strong> {generatedCredentials.parentEmail}
                      </div>
                      <div className="col-md-6">
                        <strong>Parent Tarbiyah ID:</strong> {generatedCredentials.parentId}
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <strong>Password:</strong> {generatedCredentials.password}
                      </div>
                    </div>

                    <h5>Student Codes:</h5>
                    <CTable striped hover>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Student Name</CTableHeaderCell>
                          <CTableHeaderCell>Student Code</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {generatedCredentials.students.map((student, index) => (
                          <CTableRow key={index}>
                            <CTableDataCell>{student.name}</CTableDataCell>
                            <CTableDataCell>
                              <code>{student.code}</code>
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  </CCardBody>
                </CCard>

                <CCard>
                  <CCardHeader>
                    <h4>Email Template</h4>
                    <CButton
                      color="outline-primary"
                      size="sm"
                      onClick={() => copyToClipboard(generateEmailTemplate())}
                      className="float-end"
                    >
                      <CIcon icon={cilCopy} className="me-1" />
                      Copy Email
                    </CButton>
                  </CCardHeader>
                  <CCardBody>
                    <CFormTextarea
                      rows={25}
                      value={generateEmailTemplate()}
                      readOnly
                      style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                    />
                    <div className="mt-3">
                      <CAlert color="info">
                        <strong>Instructions:</strong>
                        <ul className="mb-0 mt-2">
                          <li>Copy the email template above</li>
                          <li>Replace [School Website] with your actual domain</li>
                          <li>Send to the parent's email address</li>
                          <li>Keep a record of the generated credentials for support purposes</li>
                        </ul>
                      </CAlert>
                    </div>
                  </CCardBody>
                </CCard>
              </>
            )}
          </div>
        </CCol>
      </CRow>
    </CContainer>
  );
};

export default OnboardingAdmin; 