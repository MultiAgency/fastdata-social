// NEAR Wallet Types
export interface WalletCallFunctionArgs {
  contractId: string;
  method: string;
  args: Uint8Array | Record<string, unknown>;
  gas: string;
  deposit?: string;
}

// FastFS Types
export interface FastfsFileContent {
  mimeType: string;
  content: Uint8Array;
}

export interface SimpleFastfs {
  relativePath: string;
  content: FastfsFileContent | null;
}

export interface PartialFastfs {
  relativePath: string;
  offset: number;
  fullSize: number;
  mimeType: string;
  contentChunk: Uint8Array;
  nonce: number;
}

export type FastfsData =
  | { simple: SimpleFastfs }
  | { partial: PartialFastfs };

export type FileStatus = "pending" | "uploading" | "success" | "error";

export interface FileToUpload {
  status: FileStatus;
  size: number;
  type: string;
  path: string;
  numParts: number;
  ffs: FastfsData[];
  txIds?: (string | void)[];
  uploadedParts?: number;
  url?: string;
}

// KV API Types
export interface KVEntry {
  predecessor_id: string;
  key: string;
  value: string | null;
}

export interface KVQueryResponse {
  entries: KVEntry[];
}

// Social Graph Types
export type TransactionType = "follow" | "unfollow";
export type TransactionStatus = "success" | "processing";

export interface Transaction {
  type: TransactionType;
  account: string;
  txId: string | null;
  status: TransactionStatus;
  error?: boolean;
}

// Network Configuration
export interface NetworkConfig {
  networkId: string;
  nodeUrl: string;
}

// Constants Configuration
export interface AppConstants {
  CONTRACT_ID: string;
  KV_CONTRACT_ID: string;
  KV_GAS: string;
  MAX_KV_KEYS_PER_TX: number;
  API_BASE_URL: string;
  EXPLORER_URL: string;
  NETWORK: NetworkConfig;
}
