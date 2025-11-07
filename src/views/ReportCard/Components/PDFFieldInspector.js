import React, { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { 
  CCard, 
  CCardBody, 
  CCardHeader, 
  CTable, 
  CTableHead, 
  CTableRow, 
  CTableHeaderCell, 
  CTableBody, 
  CTableDataCell,
  CSpinner,
  CAlert,
  CButton,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CBadge,
  CCollapse,
  CRow,
  CCol
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilMagnifyingGlass, cilCopy, cilCloudDownload } from '@coreui/icons';
import PropTypes from 'prop-types';

const PDFFieldInspector = ({ pdfUrl, onFieldsInspected }) => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fieldsByType, setFieldsByType] = useState({});
  const [expandedTypes, setExpandedTypes] = useState({});

  useEffect(() => {
    if (pdfUrl) {
      inspectPDFFields();
    }
  }, [pdfUrl]);

  const inspectPDFFields = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('PDFFieldInspector: Inspecting PDF:', pdfUrl);
      
      // Fetch the PDF file
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }
      
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Get the form from the PDF
      const form = pdfDoc.getForm();
      const pdfFields = form.getFields();
      
      console.log(`PDFFieldInspector: Found ${pdfFields.length} form fields`);
      
      // Extract detailed field information
      const fieldInfo = pdfFields.map((field, index) => {
        const fieldType = field.constructor.name;
        let additionalInfo = {};
        
        try {
          if (fieldType === 'PDFDropdown') {
            additionalInfo.options = field.getOptions();
          } else if (fieldType === 'PDFRadioGroup') {
            additionalInfo.options = field.getOptions();
          } else if (fieldType === 'PDFCheckBox' || fieldType === 'e') {
            // Type 'e' is another checkbox type in some PDFs
            additionalInfo.isChecked = field.isChecked();
            additionalInfo.note = fieldType === 'e' ? 'Checkbox type "e"' : '';
          } else if (fieldType === 'PDFTextField') {
            additionalInfo.maxLength = field.getMaxLength();
            additionalInfo.alignment = field.getAlignment();
            additionalInfo.isMultiline = field.isMultiline();
            additionalInfo.isPassword = field.isPassword();
            additionalInfo.isReadOnly = field.isReadOnly();
            additionalInfo.isRequired = field.isRequired();
          }
        } catch (e) {
          // Ignore errors when getting additional info
        }
        
        return {
          id: index,
          name: field.getName(),
          type: fieldType,
          ...additionalInfo
        };
      });
      
      // Group fields by type
      const groupedFields = fieldInfo.reduce((acc, field) => {
        if (!acc[field.type]) acc[field.type] = [];
        acc[field.type].push(field);
        return acc;
      }, {});
      
      setFields(fieldInfo);
      setFieldsByType(groupedFields);
      
      // Initialize all types as expanded
      const allTypesExpanded = Object.keys(groupedFields).reduce((acc, type) => {
        acc[type] = true;
        return acc;
      }, {});
      setExpandedTypes(allTypesExpanded);
      
      // Call the callback with field information
      if (onFieldsInspected) {
        onFieldsInspected(fieldInfo);
      }
      
    } catch (error) {
      console.error('PDFFieldInspector: Error inspecting PDF fields:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredFields = fields.filter(field => 
    field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleType = (type) => {
    setExpandedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const copyFieldNames = () => {
    const fieldNames = fields.map(field => field.name).join('\n');
    navigator.clipboard.writeText(fieldNames);
  };

  const downloadFieldMapping = () => {
    const mapping = fields.reduce((acc, field) => {
      acc[field.name] = {
        type: field.type,
        formDataKey: field.name.toLowerCase().replace(/\s+/g, '_'),
        ...field
      };
      return acc;
    }, {});
    
    const dataStr = JSON.stringify(mapping, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pdf-field-mapping.json';
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const getTypeColor = (type) => {
    const colors = {
      'PDFTextField': 'primary',
      'PDFCheckBox': 'success',
      'PDFDropdown': 'warning',
      'PDFRadioGroup': 'info',
      'PDFButton': 'danger',
      'PDFSignature': 'dark'
    };
    return colors[type] || 'secondary';
  };

  if (!pdfUrl) {
    return (
      <CAlert color="info">
        Select a report card type to inspect its form fields.
      </CAlert>
    );
  }

  return (
    <CCard>
      <CCardHeader>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">PDF Form Fields Inspector</h5>
          <div className="d-flex gap-2">
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              onClick={copyFieldNames}
              disabled={loading || fields.length === 0}
            >
              <CIcon icon={cilCopy} className="me-1" />
              Copy Names
            </CButton>
            <CButton
              size="sm"
              color="primary"
              variant="outline"
              onClick={downloadFieldMapping}
              disabled={loading || fields.length === 0}
            >
              <CIcon icon={cilCloudDownload} className="me-1" />
              Download Mapping
            </CButton>
          </div>
        </div>
      </CCardHeader>
      <CCardBody>
        {loading && (
          <div className="text-center py-4">
            <CSpinner color="primary" />
            <p className="mt-2">Inspecting PDF form fields...</p>
          </div>
        )}
        
        {error && (
          <CAlert color="danger">
            <strong>Error:</strong> {error}
          </CAlert>
        )}
        
        {!loading && !error && fields.length > 0 && (
          <>
            <div className="mb-3">
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilMagnifyingGlass} />
                </CInputGroupText>
                <CFormInput
                  placeholder="Search fields..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </CInputGroup>
            </div>

            <CAlert color="info" className="d-flex justify-content-between align-items-center">
              <span>
                <strong>Total Fields:</strong> {fields.length} | 
                <strong> Filtered:</strong> {filteredFields.length}
              </span>
            </CAlert>

            {/* Fields grouped by type */}
            {Object.entries(fieldsByType).map(([type, typeFields]) => {
              const filteredTypeFields = typeFields.filter(field => 
                searchTerm === '' || 
                field.name.toLowerCase().includes(searchTerm.toLowerCase())
              );
              
              if (filteredTypeFields.length === 0) return null;
              
              return (
                <div key={type} className="mb-3">
                  <div 
                    className="d-flex align-items-center mb-2 cursor-pointer"
                    onClick={() => toggleType(type)}
                    style={{ cursor: 'pointer' }}
                  >
                    <CBadge 
                      color={getTypeColor(type)} 
                      className="me-2"
                    >
                      {type}
                    </CBadge>
                    <span className="fw-bold">{filteredTypeFields.length} fields</span>
                    <span className="ms-auto">
                      {expandedTypes[type] ? '▼' : '▶'}
                    </span>
                  </div>
                  
                  <CCollapse visible={expandedTypes[type]}>
                    <CTable striped small>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell style={{ width: '40%' }}>Field Name</CTableHeaderCell>
                          <CTableHeaderCell style={{ width: '20%' }}>Type</CTableHeaderCell>
                          <CTableHeaderCell style={{ width: '40%' }}>Additional Info</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {filteredTypeFields.map((field) => (
                          <CTableRow key={field.id}>
                            <CTableDataCell>
                              <code className="text-primary">{field.name}</code>
                            </CTableDataCell>
                            <CTableDataCell>
                              <CBadge color={getTypeColor(field.type)}>
                                {field.type.replace('PDF', '')}
                              </CBadge>
                            </CTableDataCell>
                            <CTableDataCell>
                              <small className="text-muted">
                                {field.options && (
                                  <div>
                                    <strong>Options:</strong> {field.options.join(', ')}
                                  </div>
                                )}
                                {field.maxLength && (
                                  <div>
                                    <strong>Max Length:</strong> {field.maxLength}
                                  </div>
                                )}
                                {field.isMultiline && (
                                  <div><strong>Multiline:</strong> Yes</div>
                                )}
                                {field.isRequired && (
                                  <div><strong>Required:</strong> Yes</div>
                                )}
                                {field.isReadOnly && (
                                  <div><strong>Read Only:</strong> Yes</div>
                                )}
                                {field.isChecked !== undefined && (
                                  <div><strong>Checked:</strong> {field.isChecked ? 'Yes' : 'No'}</div>
                                )}
                              </small>
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  </CCollapse>
                </div>
              );
            })}
          </>
        )}
        
        {!loading && !error && fields.length === 0 && (
          <CAlert color="warning">
            No form fields found in this PDF document.
          </CAlert>
        )}
      </CCardBody>
    </CCard>
  );
};

PDFFieldInspector.propTypes = {
  pdfUrl: PropTypes.string,
  onFieldsInspected: PropTypes.func
};

export default PDFFieldInspector; 