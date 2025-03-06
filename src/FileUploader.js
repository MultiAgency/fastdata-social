import React, { useState, useEffect } from 'react';
import Files from 'react-files';
import { sendFilesToNear } from './NearConnection.js';
import './FileUploader.css';

const FileUploader = () => {
  const [files, setFiles] = useState([]);
  const [encodedFiles, setEncodedFiles] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState(null);

  // Load stored files on mount
  useEffect(() => {
    try {
      const storedFiles = localStorage.getItem('fastNearFiles');
      if (storedFiles) {
        console.log('✅ loaded stored files:', JSON.parse(storedFiles));
        setEncodedFiles(JSON.parse(storedFiles));
      }
    } catch (error) {
      console.error('❌ error loading files from localStorage:', error);
    }
  }, []);

  const handleChange = async (newFiles) => {
    if (!newFiles || newFiles.length === 0) {
      console.warn('⚠ No new files received.');
      return;
    }

    setFiles(prevFiles => [...prevFiles, ...newFiles]);
    setStatus(null);
    console.log('✅ updated files:', [...files, ...newFiles]);
  };

  const handleFileRemove = (fileId) => {
    console.log('🟡 handleFileRemove triggered for fileId:', fileId);

    if (!fileId) {
      console.error('❌ handleFileRemove called with an invalid fileId:', fileId);
      return;
    }

    setFiles(prevFiles => prevFiles.filter(prevFile => prevFile.id && prevFile.id !== fileId));

    console.log('✅ removing file from encodedFiles:', fileId);
    const updatedEncodedFiles = { ...encodedFiles || {} };
    delete updatedEncodedFiles[fileId];

    setEncodedFiles(updatedEncodedFiles);
    localStorage.setItem('fastNearFiles', JSON.stringify(updatedEncodedFiles));

    console.log('✅ updated encodedFiles after removal:', updatedEncodedFiles);
  };

  const handleClearFiles = () => {
    console.log('🟡 handleClearFiles triggered');
    setFiles([]);
    setEncodedFiles({});
    localStorage.removeItem('fastNearFiles');
    setStatus(null);
    console.log('✅ all files cleared');
  };

  const encodeFilesToBase64 = async () => {
    console.log('🟡 encoding files to Base64… (soon borsh)');
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
  };

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSendToNear = async () => {
    console.log('🟡 sending files to NEAR...');
    setIsProcessing(true);
    setStatus('NEARing'); // ;)

    try {
      // @todo: shouldn't define twice, grab this thru props or smth
      const contractId = 'fastnear.testnet';
      setStatus(`Sending files to ${contractId}...`);
      const result = await sendFilesToNear(encodedFiles, contractId);

      console.log('✅ transaction result:', result);
    } catch (error) {
      console.error('❌ error in NEAR transaction:', error);
      setStatus(`error: ${JSON.stringify(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="file-uploader">
      <h1>File Uploader</h1>

      <Files.default
        className="files-dropzone"
        dragActiveClassName="files-dropzone-active"
        style={{
          height: '100px',
          border: '2px dashed #ccc',
          borderRadius: '4px',
          padding: '20px',
          textAlign: 'center',
          cursor: 'pointer'
        }}
        onChange={handleChange}
        multiple
        maxFiles={42}
        maxFileSize={1_000_000} // 1 MB limit
        minFileSize={0}
        clickable
      >
        <div className="drop-message">Drop files here (or click to upload)</div>
      </Files.default>

      <div className="file-uploader-controls">
        <button onClick={handleClearFiles} disabled={files.length === 0 || isProcessing}>
          Clear All Files
        </button>
        <button onClick={encodeFilesToBase64} disabled={files.length === 0 || isProcessing}>
          {isProcessing ? 'Processing…' : 'Encode Files'}
        </button>
        <button
          onClick={handleSendToNear}
          disabled={Object.keys(encodedFiles).length === 0 || isProcessing}
          className="near-button"
        >
          Send to NEAR
        </button>
      </div>

      {status && <div className="upload-status">{status}</div>}
    </div>
  );
};

export default FileUploader;

