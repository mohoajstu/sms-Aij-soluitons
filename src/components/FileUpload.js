
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File as FileIcon, X } from 'lucide-react';
import './FileUpload.css';

const FileUpload = ({ onFileUpload, files = [] }) => {
  const onDrop = useCallback((acceptedFiles) => {
    onFileUpload([...files, ...acceptedFiles]);
  }, [onFileUpload, files]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc', '.docx'],
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
    },
    multiple: true,
  });

  const removeFile = (e, fileToRemove) => {
    e.stopPropagation();
    onFileUpload(files.filter(file => file !== fileToRemove));
  }

  return (
    <div
      {...getRootProps()}
      className={`file-upload-dropzone ${isDragActive ? 'active' : ''} ${files.length > 0 ? 'has-files' : ''}`}
    >
      <input {...getInputProps()} />
      {files.length > 0 ? (
        <div className="file-display-grid">
          {files.map((file, index) => (
            <div key={index} className="file-display">
              <div className="file-display-info">
                <FileIcon className="file-display-icon" />
                <span className="file-display-name" title={file.name}>{file.name}</span>
                <button onClick={(e) => removeFile(e, file)} className="file-remove-button">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="file-upload-content">
          <Upload className="file-upload-icon" />
          {isDragActive ? (
            <p className="file-upload-text">Drop the files here ...</p>
          ) : (
            <>
              <p className="file-upload-text">Drag & drop files here, or click to select</p>
              <p className="file-upload-hint">PDF, DOC, JPG, PNG supported</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload; 