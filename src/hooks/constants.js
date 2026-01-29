// FastData Protocol Configuration
// Two sub-protocols: FastFS (file storage) and KV (key-value)

export const Constants = {
  // FastFS Configuration
  CONTRACT_ID: "fastfs.near", // For FastFS file uploads

  // KV Configuration
  KV_CONTRACT_ID: "social.near", // For KV social graph operations
  KV_GAS: "10000000000000", // 10 Tgas for KV operations
  MAX_KV_KEYS_PER_TX: 256, // Maximum keys per transaction

  // API Configuration
  API_BASE_URL: import.meta.env.PROD
    ? "https://fastdata.up.railway.app"
    : "http://localhost:3001", // KV API server
  EXPLORER_URL: "https://nearblocks.io/txns",

  // Network Configuration
  NETWORK: {
    networkId: "mainnet",
    nodeUrl: "https://rpc.mainnet.fastnear.com",
  },
};
//
// export const ConstantsTestnet = {
//   CONTRACT_ID: "fastfs.testnet",
//   KV_CONTRACT_ID: "social.testnet",
//   NETWORK: {
//     networkId: "testnet",
//     nodeUrl: "https://rpc.testnet.fastnear.com",
//   },
// };

// Protocol Documentation
//
// FastFS: Binary file storage using Borsh encoding
//   Method: __fastdata_fastfs
//   Args: Borsh-encoded binary data
//   Contract: fastfs.near
//   Use case: Files up to 32MB
//
// KV: Key-value storage using plain JSON
//   Method: __fastdata_kv
//   Args: Plain JSON object (no encoding needed!)
//   Contract: Configurable (e.g., social.near)
//   Use case: Key-value pairs (max 256 keys per transaction)
//   Note: Transactions may show as "failed" but data is still indexed
