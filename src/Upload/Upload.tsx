import { useNear } from "@near-kit/react";
import { useCallback, useState } from "react";
import type { ReactFilesFile } from "react-files";
import Files from "react-files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Constants } from "../hooks/constants";
import { encodeFfs } from "../hooks/fastfs";
import { useWallet } from "../providers/WalletProvider";
import type { FastfsData, FileStatus, FileToUpload } from "../types";

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
  files: ReactFilesFile[],
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
      throw new Error(
        `Path too long (${path.length} chars, max ${MAX_RELATIVE_PATH_LENGTH}): ${path}`,
      );
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
            contentChunk: encoded.slice(offset, Math.min(offset + ChunkSize, encoded.length)),
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

      const initial = files.map((f) => ({
        ...f,
        status: Status.Uploading,
        txIds: [] as (string | undefined)[],
        uploadedParts: 0,
      }));
      setUploadingFiles(initial);

      await Promise.all(
        initial.map(async (file, fileIndex) => {
          const update = (updater: (file: FileToUpload) => Partial<FileToUpload>) => {
            setUploadingFiles((prev) =>
              prev.map((f, i) => (i === fileIndex ? { ...f, ...updater(f) } : f)),
            );
          };

          for (const part of file.ffs) {
            const ffs64 = encodeFfs(part);

            try {
              const result = await near.call(Constants.CONTRACT_ID, "__fastdata_fastfs", ffs64, {
                gas: "1 Tgas",
              });

              const txId = result?.transaction?.hash as string | undefined;

              update((f) => {
                const newUploaded = (f.uploadedParts ?? 0) + 1;
                const done = newUploaded === f.numParts;
                return {
                  uploadedParts: newUploaded,
                  txIds: [...(f.txIds ?? []), txId],
                  ...(done
                    ? {
                        status: Status.Success,
                        url: `https://${accountId}.fastfs.io/${Constants.CONTRACT_ID}/${f.path}`,
                      }
                    : {}),
                };
              });
            } catch (error) {
              // biome-ignore lint/suspicious/noConsole: upload errors need logging
              console.error("Upload error:", error);
              update((f) => ({
                status: Status.Error,
                txIds: [...(f.txIds ?? []), undefined],
              }));
              break;
            }
          }
        }),
      );
    },
    [accountId, near],
  );

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Upload to FastFS</h1>
        <p className="text-sm text-muted-foreground font-mono">
          decentralized file storage on NEAR
        </p>
      </div>

      <div className="mb-8">
        <Files
          inputProps={{
            disabled: !!uploading,
          }}
          className="group w-full min-h-[200px] mx-auto mb-6 p-8 border border-dashed border-border rounded-xl bg-card/50 flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
          dragActiveClassName="!border-primary !bg-primary/10 scale-[1.01]"
          onChange={handleChange}
          multiple
          maxFiles={10}
          maxFileSize={32_000_000}
          minFileSize={0}
          clickable
        >
          <div className="flex flex-col items-center justify-center w-full h-full p-4">
            <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center mb-4 group-hover:border-primary/30 transition-colors">
              <span className="text-2xl leading-none text-muted-foreground group-hover:text-primary transition-colors">
                ↑
              </span>
            </div>
            <p className="text-base font-medium text-foreground/80">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-mono">max 32MB per file</p>
          </div>
        </Files>
      </div>

      <div className={`mb-6 ${files.length === 0 ? "hidden" : ""}`}>
        <label
          htmlFor="upload-path"
          className="text-sm font-medium text-muted-foreground mb-2 block font-mono"
        >
          path_
        </label>
        <Input
          id="upload-path"
          disabled={uploading}
          onChange={(e) => setRelativePath(e.target.value)}
          placeholder={"/"}
          value={relativePath}
          className="font-mono bg-secondary/50"
        />
      </div>

      <div className={`mb-8 ${files.length === 0 ? "hidden" : ""}`}>
        <Button
          size="lg"
          disabled={uploading || files.length === 0}
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
          className="glow-primary font-mono"
        >
          {uploading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              uploading_
            </span>
          ) : (
            "upload_"
          )}
        </Button>
        {error && <p className="text-destructive mt-2 text-sm">{error}</p>}
      </div>

      <div className={`mb-8 ${files.length === 0 ? "hidden" : ""}`}>
        <h4 className="text-sm font-medium text-muted-foreground mb-3 font-mono">queued_</h4>
        <div className="rounded-xl border border-border bg-card/50 divide-y divide-border">
          {files.map((file, index) => (
            <div key={`f-${file.name}`} className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-2 focus-visible:outline-ring rounded"
                aria-label={`Remove ${file.name}`}
                onClick={() => {
                  setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
                }}
              >
                ×
              </button>
              <code className="text-sm font-mono text-foreground/90">
                {relativePath + file.name}
              </code>
              <span className="text-xs text-muted-foreground font-mono ml-auto">{file.type}</span>
              <span className="text-xs text-muted-foreground font-mono">{file.size}b</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`mb-8 ${uploadingFiles.length === 0 ? "hidden" : ""}`}>
        <h4 className="text-sm font-medium text-muted-foreground mb-3 font-mono">results_</h4>
        <div className="rounded-xl border border-border bg-card/50 divide-y divide-border">
          {uploadingFiles.map((file) => (
            <div key={`up-${file.path}`} className="px-4 py-3">
              {file.status === Status.Success ? (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-mono text-sm break-all"
                >
                  {file.url}
                </a>
              ) : file.status === Status.Error ? (
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono">{file.path}</code>
                  <span className="text-xs text-destructive font-mono ml-auto">error_</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <code className="text-sm font-mono text-foreground/90">{file.path}</code>
                  <span className="text-xs text-muted-foreground font-mono ml-auto">
                    {file.type}
                  </span>
                  {file.status === Status.Uploading && (
                    <span className="flex items-center gap-2 text-xs text-primary font-mono">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      {file.uploadedParts}/{file.numParts}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
