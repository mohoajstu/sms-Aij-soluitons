import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';

const FileUpload = ({ onFileUpload, onFileRemove, files }) => {
  const onDrop = useCallback((acceptedFiles) => {
    onFileUpload(acceptedFiles);
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const removeFile = (fileToRemove) => {
    onFileRemove(fileToRemove);
  };

  return (
    <div>
      <div
        {...getRootProps()}
        className={`file-upload-dropzone ${isDragActive ? 'active' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="file-upload-content">
          <UploadCloud className="w-8 h-8 text-gray-400" />
          {isDragActive ? (
            <p>Drop the files here ...</p>
          ) : (
            <p>Drag 'n' drop some files here, or click to select files</p>
          )}
        </div>
      </div>
      {files && files.length > 0 && (
        <div className="file-upload-preview">
          <h4>Selected files:</h4>
          <ul>
            {files.map((file, index) => (
              <li key={index} className="file-preview-item">
                <FileIcon className="w-5 h-5" />
                <span>{file.name}</span>
                <button onClick={() => removeFile(file)} className="file-remove-button">
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUpload; 