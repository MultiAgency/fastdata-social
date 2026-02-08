# FastData Protocol

## What It Is

FastData stores raw data using the NEAR blockchain as a ledger. Data is **not** stored in smart contract state — it lives in the transaction ledger itself. This is **not** a cache of `social.near` — it's an independent data layer.

To store data, send a transaction with a function call method starting with `__fastdata_`. The suffix indicates the format/purpose:

| Method | Format | Purpose |
|---|---|---|
| `__fastdata_raw` | Binary blob | Raw data storage, retrieved by tx hash + action index |
| `__fastdata_kv` | JSON `{key: value}` | Key-value store. Full key = (predecessor_id, current_account_id, key) |
| `__fastdata_fastfs` | Borsh binary | File hosting with relative paths, MIME types, and content |
| `__fastdata_chat` | JSON `{channel_id, message}` | Messaging. Messages aggregated by channel, ordered by block height |

## How It Works

- **Owner**: The `predecessor_id` (whoever sent the transaction)
- **Namespace**: The `current_account_id` (the execution/receiver account)
- Executing on your own account is cheaper (no cross-shard receipt)
- `contextual.near` has `__fastdata_kv` defined (see [fd_contract](https://github.com/niccolozy/fd_contract)). Transactions succeed normally. The contract method is minimal (accepts and returns), while the indexer extracts the args from the receipt.

```
Wallet signs tx → NEAR RPC → contextual.near (succeeds)
                                    ↓
                      FastData indexer reads receipt args
                                    ↓
                      Writes to ScyllaDB for retrieval
```

## Infrastructure

- **Indexer**: [fastdata-indexer](https://github.com/fastnear/fastdata-indexer) (kv-sub-indexer branch) — watches NEAR blocks, extracts `__fastdata_*` args from receipts
- **KV Server**: [fastkv-server](https://github.com/MultiAgency/fastkv-server) — REST API for KV reads
- **FastFS Server**: [fastfs-server](https://github.com/fastnear/fastfs-server) — serves uploaded files via HTTP
- **Storage**: ScyllaDB

## KV Protocol

- **Method**: `__fastdata_kv`
- **Args**: Plain JSON object — keys are paths like `profile/name`, values are strings or `null`
- **Contract**: `contextual.near` (configurable — any account works as a namespace)
- **Limit**: 256 keys per transaction
- **Gas**: 10 Tgas (hardcoded in SDK)

Setting a value to `null` means deletion. The indexer records the null and the key is treated as removed in queries.

KV also supports a SocialDB-compatible tree structure — a scalable, cheaper alternative to existing socialdb contracts. The SDK implements this via `socialGet`, `socialKeys`, and `socialIndex` endpoints.

## FastFS Protocol

- **Method**: `__fastdata_fastfs`
- **Args**: Borsh-encoded binary
- **Contract**: `fastfs.near` (or any account as namespace)
- **Max file**: 32 MB
- **Max path**: 1,024 characters

### URL Pattern

```
https://{predecessor_id}.fastfs.io/{receiver_id}/{relative_path}
```

Example: `https://mob.near.fastfs.io/fastfs.near/fastnear.png`

### Upload Variants

**SimpleFastfs** — small files, single transaction:

```ts
const data = {
  simple: {
    relativePath: "images/logo.png",
    content: {
      mimeType: "image/png",
      content: new Uint8Array(fileBuffer)
    }
  }
};
```

**PartialFastfs** — files > 1 MB, chunked across multiple transactions:

Each chunk includes `offset` (aligned to 1 MB), `fullSize`, `mimeType`, `contentChunk` (up to 1 MB), and a `nonce` (shared across all chunks of the same file, used for deduplication). See `src/hooks/fastfs.ts` for the Borsh schema.

### File Deletion

Set `content` to `null`:

```ts
const deleteFile = {
  simple: {
    relativePath: "path/to/file.json",
    content: null
  }
};
```

### Validation

- `relative_path`: max 1,024 chars, no `..` segments
- `mime_type`: required and non-empty when content is provided
- `content`: optional (null = deletion)

### Borsh Schema

```ts
// src/hooks/fastfs.ts
FastfsFileContent: {
  struct: {
    mimeType: "string",
    content: { array: { type: "u8" } },
  },
},
SimpleFastfs: {
  struct: {
    relativePath: "string",
    content: { option: FastfsFileContent },  // null for deletion
  },
},
PartialFastfs: {
  struct: {
    relativePath: "string",
    offset: "u32",          // aligned to 1 MB
    fullSize: "u32",        // up to 32 MB
    mimeType: "string",
    contentChunk: { array: { type: "u8" } },  // up to 1 MB
    nonce: "u32",           // shared across chunks, min 1
  },
},
FastfsData: {
  enum: [
    { struct: { simple: SimpleFastfs } },
    { struct: { partial: PartialFastfs } },
  ],
},
```

## Key Files

- `src/hooks/constants.ts` — contract IDs, API URLs, protocol docs
- `src/hooks/fastfs.ts` — Borsh schema and `encodeFfs()` function
- `src/client/FastData.ts` — KV read methods and `buildCommit()`
- `src/Profile/ProfileView.tsx` — avatar upload uses FastFS with Borsh encoding

## Related Repositories

- [fastdata-indexer](https://github.com/fastnear/fastdata-indexer) — block indexer
- [fastkv-server](https://github.com/MultiAgency/fastkv-server) — KV API server
- [fastfs-server](https://github.com/fastnear/fastfs-server) — file serving
- [fastdata-drag-and-drop](https://github.com/fastnear/fastdata-drag-and-drop) — simple upload UI
