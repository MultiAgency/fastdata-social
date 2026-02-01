import Files from "react-files";
import { useCallback, useState } from "react";
import type { ReactFilesFile } from "react-files";
import "./Upload.css";
import { encodeFfs } from "../hooks/fastfs";
import { Constants } from "../hooks/constants";
import { useWallet } from "../providers/WalletProvider";
import { useNear } from "@near-kit/react";
import type { FileToUpload, FileStatus, FastfsData } from "../types";

const Status: Record<string, FileStatus> = {
  Pending: "pending",
  Uploading: "uploading",
  Success: "success",
  Error: "error",
};

const ChunkSize = 1 << 20;
const MAX_RELATIVE_PATH_LENGTH = 1024;

async function transformFiles(
  relativePath: string,
  files: ReactFilesFile[]
): Promise<FileToUpload[]> {
  if (relativePath.includes("..")) {
    throw new Error("Invalid path: '..' segments not allowed");
  }
  relativePath = relativePath.replace(/^\//, "");
  const result: FileToUpload[] = [];
  for (const file of files) {
    const mimeType = file.type || "application/octet-stream";
    const data = await file.arrayBuffer();
    const encoded = new Uint8Array(data);
    const path = relativePath + file.name;
    if (path.length > MAX_RELATIVE_PATH_LENGTH) {
      throw new Error(`Path too long (${path.length} chars, max ${MAX_RELATIVE_PATH_LENGTH}): ${path}`);
    }
    if (encoded.length > ChunkSize) {
      const parts: FastfsData[] = [];
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
            mimeType,
            nonce,
          },
        });
      }
      result.push({
        status: Status.Pending,
        size: file.size,
        type: mimeType,
        path,
        numParts: parts.length,
        ffs: parts,
      });
    } else {
      result.push({
        status: Status.Pending,
        size: file.size,
        type: mimeType,
        path,
        numParts: 1,
        ffs: [
          {
            simple: {
              relativePath: path,
              content: {
                mimeType,
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

export function Upload() {
  const { accountId } = useWallet();
  const near = useNear();
  const [uploading, setUploading] = useState<boolean>(false);
  const [relativePath, setRelativePath] = useState<string>("/");
  const [files, setFiles] = useState<ReactFilesFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<FileToUpload[]>([]);
  const [error, setError] = useState<string>("");

  const handleChange = (newFiles: ReactFilesFile[]) => {
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };

  const startUpload = useCallback(
    async (files: FileToUpload[]) => {
      if (!near) throw new Error("Wallet not connected");

      const initial = files.map((f) => ({ ...f, status: Status.Uploading, txIds: [] as (string | void)[], uploadedParts: 0 }));
      setUploadingFiles(initial);

      await Promise.all(
        initial.map(async (file, fileIndex) => {
          const update = (updater: (file: FileToUpload) => Partial<FileToUpload>) => {
            setUploadingFiles((prev) =>
              prev.map((f, i) => (i === fileIndex ? { ...f, ...updater(f) } : f))
            );
          };

          for (const part of file.ffs) {
            const ffs64 = encodeFfs(part);

            try {
              const result = await near.call(
                Constants.CONTRACT_ID,
                "__fastdata_fastfs",
                ffs64,
                { gas: "1 Tgas" }
              );

              const txId = result?.transaction?.hash as string | void;

              update((f) => {
                const newUploaded = (f.uploadedParts ?? 0) + 1;
                const done = newUploaded === f.numParts;
                return {
                  uploadedParts: newUploaded,
                  txIds: [...(f.txIds ?? []), txId],
                  ...(done
                    ? { status: Status.Success, url: `https://${accountId}.fastfs.io/${Constants.CONTRACT_ID}/${f.path}` }
                    : {}),
                };
              });
            } catch (error) {
              console.error("Upload error:", error);
              update((f) => ({
                status: Status.Error,
                txIds: [...(f.txIds ?? []), undefined],
              }));
              break;
            }
          }
        })
      );
    },
    [accountId, near]
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
            setError("");
            try {
              setUploading(true);
              const uploadingFiles = await transformFiles(relativePath, files);
              setUploadingFiles(uploadingFiles);
              setFiles([]);
              await startUpload(uploadingFiles);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Upload failed");
            } finally {
              setUploading(false);
            }
          }}
        >
          Upload!
        </button>
        {error && <div className="text-danger mt-2">{error}</div>}
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
              <a href={file.url} target="_blank" rel="noopener noreferrer">
                {file.url}
              </a>
            ) : file.status === Status.Error ? (
              <>
                <code className="text-black">{file.path}</code>
                <code className="text-danger ms-2">Upload failed</code>
              </>
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
