
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File as FileIcon, X } from 'lucide-react';
import './FileUpload.css';

const FileUpload = ({ onFileUpload, file }) => {
  const onDrop = useCallback((acceptedFiles) => {
    onFileUpload(acceptedFiles[0]);
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'application/pdf': [],
    },
    multiple: false,
  });

  const removeFile = (e) => {
    e.stopPropagation();
    onFileUpload(null);
  }

  return (
    <div
      {...getRootProps()}
      className={`file-upload-dropzone ${isDragActive ? 'active' : ''}`}
    >
      <input {...getInputProps()} />
      {file ? (
        <div className="file-display">
          <div className="file-display-info">
            <FileIcon className="file-display-icon" />
            <span className="file-display-name">{file.name}</span>
            <button onClick={removeFile} className="file-remove-button">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="file-upload-content">
          <Upload className="file-upload-icon" />
          {isDragActive ? (
            <p className="file-upload-text">Drop the file here ...</p>
          ) : (
            <>
              <p className="file-upload-text">Drag 'n' drop a file here, or click to select a file</p>
              <p className="file-upload-hint">PDF, JPG, PNG</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload; 