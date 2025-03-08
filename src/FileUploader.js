import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Files from 'react-files';
import { sendFilesToNear } from './NearConnection.js';
import './styles/components/FileUploader.css';

// Add keyframes for animation
const keyframes = `
@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
}
`;

// FileUploader for NEAR testnet
const FileUploader = ({
  // Using testnet contract ID by default
  contractId = 'fastnear.testnet',
  accountId,
  isSignedIn
}) => {
  const [files, setFiles] = useState([]);
  const [encodedFiles, setEncodedFiles] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isBrowseHovering, setIsBrowseHovering] = useState(false);

  // Add the keyframes to the document - using useEffect with empty deps array for one-time setup
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = keyframes;
    document.head.appendChild(styleSheet);

    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  // Load stored files on mount
  useEffect(() => {
    try {
      const storedFiles = localStorage.getItem('fastNearFiles');
      if (storedFiles) {
        console.log('✅ loaded stored files:', JSON.parse(storedFiles));
        setEncodedFiles(JSON.parse(storedFiles));
      }
    } catch (error) {
      console.error('Error loading stored files:', error);
    }
  }, []);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleChange = useCallback(async (newFiles) => {
    if (!newFiles || newFiles.length === 0) {
      console.warn('⚠ No new files received.');
      return;
    }

    setFiles(prevFiles => [...prevFiles, ...newFiles]);
    setStatus(null);
    console.log('✅ updated files:', newFiles);
  }, []);

  const handleFileRemove = useCallback((fileId) => {
    console.log('🟡 handleFileRemove triggered for fileId:', fileId);

    if (!fileId) {
      console.error('❌ handleFileRemove called with an invalid fileId:', fileId);
      return;
    }

    setFiles(prevFiles => prevFiles.filter(prevFile => prevFile.id && prevFile.id !== fileId));

    console.log('✅ removing file from encodedFiles:', fileId);
    setEncodedFiles(prevEncodedFiles => {
      const updatedEncodedFiles = { ...prevEncodedFiles };
      delete updatedEncodedFiles[fileId];

      // Update localStorage
      localStorage.setItem('fastNearFiles', JSON.stringify(updatedEncodedFiles));
      return updatedEncodedFiles;
    });
  }, []);

  const handleClearFiles = useCallback(() => {
    console.log('🟡 handleClearFiles triggered');
    setFiles([]);
    setEncodedFiles({});
    localStorage.removeItem('fastNearFiles');
    setStatus(null);
    console.log('✅ all files cleared');
  }, []);

  // Helper function for reading files as base64
  const readFileAsBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;

      // Check if the file has a nested file property (from drag and drop)
      const fileToRead = file.file ? file.file : file;
      reader.readAsDataURL(fileToRead);
    });
  }, []);

  const encodeFilesToBase64 = useCallback(async () => {
    console.log('🟡 encoding files to Base64…');
    setIsProcessing(true);
    setStatus('encoding files…');

    try {
      const newEncodedFiles = { ...encodedFiles };

      for (const file of files) {
        if (!newEncodedFiles[file.id]) {
          console.log(`🟡 encoding file: ${file.name} (${file.size} bytes)`);
          const base64 = await readFileAsBase64(file);
          newEncodedFiles[file.id] = {
            id: file.id || file.name,
            name: file.name,
            type: file.type,
            size: file.size,
            sizeReadable: file.sizeReadable,
            base64
          };
        }
      }

      setEncodedFiles(newEncodedFiles);
      localStorage.setItem('fastNearFiles', JSON.stringify(newEncodedFiles));
      setStatus(`✅ files encoded and stored in localStorage`);
    } catch (error) {
      console.error('❌ error encoding files:', error);
      setStatus(`error encoding files: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [files, encodedFiles, readFileAsBase64]);

  const handleSendToNear = useCallback(async () => {
    console.log('🟡 sending files to NEAR...');
    setIsProcessing(true);
    setStatus('NEARing'); // ;)

    try {
      setStatus(`Sending files to ${contractId}...`);
      const result = await sendFilesToNear(encodedFiles, contractId);

      console.log('✅ transaction result:', result);
    } catch (error) {
      console.error('❌ error in NEAR transaction:', error);
      setStatus(`error: ${JSON.stringify(error)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [encodedFiles, contractId]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Create an array of File objects
      const fileArray = Array.from(e.dataTransfer.files);

      // Convert File objects to format expected by handleChange
      const filesForChange = fileArray.map(file => ({
        id: `file-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file
      }));

      handleChange(filesForChange);
    }
  }, [handleChange]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // File preview logic
  const renderFilePreview = useCallback((file) => {
    if (file.type.startsWith('image/')) {
      return (
        <div className="file-preview">
          <img
            src={file.file ? URL.createObjectURL(file.file) : URL.createObjectURL(file)}
            alt={file.name}
            className="file-preview-image"
          />
        </div>
      );
    } else {
      // Get file extension
      const extension = file.name.split('.').pop().toUpperCase();
      return (
        <div className="file-preview">
          <div className="file-preview-extension">{extension}</div>
        </div>
      );
    }
  }, []);

  // Memoize styles to prevent unnecessary recalculations
  const fileUploadIconStyle = useMemo(() => ({
    animation: isDragging ? "pulse 1.5s infinite ease-in-out" : "none",
  }), [isDragging]);

  return (
    <div className="file-uploader">
      <div className="file-uploader-header">
        <h1>Upload to NEAR</h1>
      </div>

      <Files.default
        className="file-upload-zone"
        onChange={handleChange}
        multiple
        maxFiles={42}
        maxFileSize={10_000_000}
        minFileSize={0}
        clickable
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        <div className={`${isDragging ? 'drag-active' : ''} ${files.length > 0 ? 'has-files' : ''}`}>
          <div className="upload-content-wrapper">
            <p className="file-upload-text">Drop files here</p>
            <p className="file-upload-subtext">or click to browse</p>
          </div>
        </div>
      </Files.default>

      {/* File list */}
      {files.length > 0 && (
        <div className="files-list">
          <h3>Selected Files</h3>
          <ul>
            {files.map((file) => (
              <li key={file.id} className="file-item">
                {renderFilePreview(file)}
                <div className="file-info">
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">{file.sizeReadable}</div>
                </div>
                <div className="file-status">
                  {encodedFiles[file.id] ? (
                    <span className="encoded">Encoded ✓</span>
                  ) : (
                    <span className="not-encoded">Not encoded</span>
                  )}
                </div>
                <button
                  className="file-remove"
                  onClick={() => handleFileRemove(file.id)}
                  aria-label="Remove file"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Simplified button workflow */}
      <div className="button-workflow">
        <div className="workflow-step">
          <button
            className="clear-button"
            onClick={handleClearFiles}
            disabled={files.length === 0 || isProcessing}
          >
            Clear Files
          </button>
        </div>

        <div className="workflow-step">
          <button
            className="encode-button"
            onClick={encodeFilesToBase64}
            disabled={files.length === 0 || isProcessing || Object.keys(encodedFiles).length === files.length}
          >
            Encode Files
          </button>
        </div>

        <div className="workflow-arrow">→</div>

        <div className="workflow-step">
          <button
            className="near-button"
            onClick={handleSendToNear}
            disabled={!isSignedIn || Object.keys(encodedFiles).length === 0 || isProcessing}
          >
            Send to NEAR
          </button>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div className={`upload-status ${status.startsWith('error') ? 'error' : status.startsWith('✅') ? 'success' : ''}`}>
          {status}
        </div>
      )}
    </div>
  );
};

export default FileUploader;


