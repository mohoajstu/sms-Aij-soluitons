import React, { useState } from 'react';
import { CButton, CCard, CCardBody, CCardHeader, CListGroup, CListGroupItem } from '@coreui/react';
import { PDFDocument } from 'pdf-lib';
import PropTypes from 'prop-types';

const PDFFieldInspector = ({ pdfUrl, onFieldsInspected }) => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const inspectPDFFields = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!pdfUrl) {
        throw new Error('No PDF URL provided');
      }

      // Fetch the PDF file
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch PDF file');
      }
      
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Get the form from the PDF
      const form = pdfDoc.getForm();
      
      // Get all fields with their details
      const formFields = form.getFields().map(field => {
        const fieldInfo = {
          name: field.getName(),
          type: field.constructor.name,
          isReadOnly: field.isReadOnly ? field.isReadOnly() : false,
        };

        // Try to get additional info based on field type
        try {
          if (field.constructor.name === 'PDFTextField') {
            fieldInfo.maxLength = field.getMaxLength ? field.getMaxLength() : 'N/A';
            fieldInfo.defaultValue = field.getText ? field.getText() : '';
          } else if (field.constructor.name === 'PDFCheckBox') {
            fieldInfo.isChecked = field.isChecked ? field.isChecked() : false;
          } else if (field.constructor.name === 'PDFRadioGroup') {
            fieldInfo.options = field.getOptions ? field.getOptions() : [];
            fieldInfo.selected = field.getSelected ? field.getSelected() : '';
          } else if (field.constructor.name === 'PDFDropdown') {
            fieldInfo.options = field.getOptions ? field.getOptions() : [];
            fieldInfo.selected = field.getSelected ? field.getSelected() : '';
          }
        } catch (err) {
          console.warn(`Could not get additional info for field ${field.getName()}:`, err);
        }

        return fieldInfo;
      });
      
      setFields(formFields);
      
      if (onFieldsInspected) {
        onFieldsInspected(formFields);
      }
      
      console.log('PDF Form Fields:', formFields);
      
    } catch (error) {
      console.error('Error inspecting PDF fields:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getFieldTypeColor = (type) => {
    switch (type) {
      case 'PDFTextField':
        return 'primary';
      case 'PDFCheckBox':
        return 'success';
      case 'PDFRadioGroup':
        return 'warning';
      case 'PDFDropdown':
        return 'info';
      default:
        return 'secondary';
    }
  };

  return (
    <CCard>
      <CCardHeader>
        <h5>PDF Field Inspector</h5>
        <p className="mb-0 text-muted">Inspect form fields in the selected PDF</p>
      </CCardHeader>
      <CCardBody>
        <CButton 
          color="primary" 
          onClick={inspectPDFFields}
          disabled={loading || !pdfUrl}
          className="mb-3"
        >
          {loading ? 'Inspecting...' : 'Inspect PDF Fields'}
        </CButton>
        
        {error && (
          <div className="alert alert-danger">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {fields.length > 0 && (
          <div>
            <h6>Found {fields.length} form fields:</h6>
            <CListGroup>
              {fields.map((field, index) => (
                <CListGroupItem key={index} className="d-flex justify-content-between align-items-start">
                  <div className="ms-2 me-auto">
                    <div className="fw-bold">{field.name}</div>
                    <small className="text-muted">
                      Type: {field.type}
                      {field.maxLength && field.maxLength !== 'N/A' && ` | Max Length: ${field.maxLength}`}
                      {field.isReadOnly && ' | Read Only'}
                      {field.defaultValue && ` | Default: "${field.defaultValue}"`}
                      {field.options && field.options.length > 0 && ` | Options: ${field.options.join(', ')}`}
                    </small>
                  </div>
                  <span className={`badge bg-${getFieldTypeColor(field.type)}`}>
                    {field.type.replace('PDF', '')}
                  </span>
                </CListGroupItem>
              ))}
            </CListGroup>
          </div>
        )}
        
        {fields.length === 0 && !loading && !error && (
          <p className="text-muted">Click "Inspect PDF Fields" to analyze the form fields in the selected PDF.</p>
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