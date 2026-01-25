import Files from "react-files";
import { useCallback, useState } from "react";
import "./Upload.css";
import { encodeFfs } from "../hooks/fastfs.js";
import { Constants } from "../hooks/constants.js";
import { useWalletSelector } from "@near-wallet-selector/react-hook";

const Status = {
  Pending: "pending",
  Uploading: "uploading",
  Success: "success",
  Error: "error",
};

const ChunkSize = 1 << 20;

async function transformFiles(relativePath, files) {
  relativePath = relativePath.replace(/^\//, "");
  const result = [];
  for (const file of files) {
    const data = await file.arrayBuffer();
    const encoded = new Uint8Array(data);
    const path = relativePath + file.name;
    if (encoded.length > ChunkSize) {
      const parts = [];
      const nonce = Math.floor(Date.now() / 1000) - 1769376240;
      for (let offset = 0; offset < encoded.length; offset += ChunkSize) {
        parts.push({
          partial: {
            relativePath: path,
            offset,
            fullSize: encoded.length,
            contentChunk: encoded.slice(
              offset,
              Math.min(offset + ChunkSize, encoded.length)
            ),
            mimeType: file.type,
            nonce,
          },
        });
      }
      result.push({
        status: Status.Pending,
        size: file.size,
        path,
        numParts: parts.length,
        ffs: parts,
      });
    } else {
      result.push({
        status: Status.Pending,
        size: file.size,
        path,
        numParts: 1,
        ffs: [
          {
            simple: {
              relativePath: path,
              content: {
                mimeType: file.type,
                content: encoded,
              },
            },
          },
        ],
      });
    }
  }
  return result;
}

export function Upload(props) {
  const { signedAccountId: accountId, callFunction } = useWalletSelector();
  const [uploading, setUploading] = useState(false);
  const [relativePath, setRelativePath] = useState("/");
  const [files, setFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState([]);

  const handleChange = (newFiles) => {
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };

  const startUpload = useCallback(
    async (files) => {
      await Promise.all(
        files.map(async (file) => {
          file.status = Status.Uploading;
          file.txIds = [];
          file.uploadedParts = 0;
          setUploadingFiles([...files]);
          for (const part of file.ffs) {
            const ffs64 = encodeFfs(part);
            let txId;
            txId = await callFunction({
              contractId: Constants.CONTRACT_ID,
              method: "__fastdata_fastfs",
              args: ffs64,
              gas: "1",
            })
              .catch(() => {})
              .finally(() => {
                file.uploadedParts += 1;
                setUploadingFiles([...files]);
                console.log("uploaded", txId);

                if (file.uploadedParts === file.numParts) {
                  file.uploads = file.status = Status.Success;
                  file.url = `https://${accountId}.fastfs.io/${Constants.CONTRACT_ID}/${file.path}`;

                  setUploadingFiles([...files]);
                }
              });
            file.txIds.push(txId);
          }
        })
      );
    },
    [accountId]
  );

  return (
    <div>
      <div className="mb-3 text-center">
        <h1>Upload to FastFS</h1>
      </div>

      <div className="mb-5">
        <h4>Select Files to upload</h4>
        <div>
          <Files
            inputProps={{
              disabled: !!uploading,
            }}
            className="file-upload-zone"
            dragActiveClassName="file-upload-zone-active"
            onChange={handleChange}
            multiple
            maxFiles={10}
            maxFileSize={32_000_000}
            minFileSize={0}
            clickable
          >
            <div className="upload-content-wrapper">
              <p className="file-upload-text">
                Drop files here to start uploading
              </p>
              <p className="file-upload-subtext">or click to browse</p>
            </div>
          </Files>
        </div>
      </div>

      <div
        className={`mb-5 ${files.length === 0 ? "d-none" : ""}`}
        key="relative-path"
      >
        <h4>Relative path (optional)</h4>
        <div>
          <input
            disabled={uploading}
            className="form-control"
            onChange={(e) => setRelativePath(e.target.value)}
            placeholder={"/"}
            value={relativePath}
          />
        </div>
      </div>

      <div className={`mb-5 ${files.length === 0 ? "d-none" : ""}`}>
        <button
          disabled={uploading || files.length === 0}
          className="btn btn-primary btn-lg"
          onClick={async () => {
            setUploading(true);
            const uploadingFiles = await transformFiles(relativePath, files);
            setUploadingFiles(uploadingFiles);
            setFiles([]);
            await startUpload(uploadingFiles);
            setUploading(false);
          }}
        >
          Upload!
        </button>
      </div>

      <div className={`mb-5 ${files.length === 0 ? "d-none" : ""}`}>
        <h4>Files to upload</h4>
        <div>
          {files.map((file, index) => (
            <div key={`f-${index}`} className="mb-1">
              <button
                className="btn btn-outline-dark border-0"
                title="remove"
                onClick={() => {
                  setFiles((prevFiles) =>
                    prevFiles.filter((_, i) => i !== index)
                  );
                }}
              >
                ❌
              </button>
              <code className="text-black">{relativePath + file.name}</code>
              <code className="text-secondary ms-2">{file.type}</code>
              <code className="text-secondary ms-2">{file.size} bytes</code>
            </div>
          ))}
        </div>
      </div>
      <div className={`mb-5 ${uploadingFiles.length === 0 ? "d-none" : ""}`}>
        <h4>Uploaded files</h4>
        {uploadingFiles.map((file, index) => (
          <div key={`up-${index}`}>
            {file.status === Status.Success ? (
              <a href={file.url} target="_blank">
                {file.url}
              </a>
            ) : (
              <>
                <code className="text-black">{file.path}</code>
                <code className="text-secondary ms-2">{file.type}</code>
                <code className="text-secondary ms-2">{file.size} bytes</code>
                {file.status === Status.Uploading ? (
                  <>
                    <div
                      className="spinner-border spinner-border-sm align-middle ms-2"
                      role="status"
                    >
                      <span className="visually-hidden">Uploading...</span>
                    </div>
                    ({file.uploadedParts} / {file.numParts})
                  </>
                ) : (
                  <span className="ms-2">{file.status}</span>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
