# NEAR Directory

Social Graph built using [FastData](https://hackmd.io/@fastnear/__fastdata)

> courtesy of [FastNear](https://fastnear.com)

**Live Demo:** https://fastnear-social.up.railway.app

## Overview

NEAR Directory enables connecting your NEAR account with others by "following" them.

All data goes on-chain, written to the transaction ledger, not contract state.

## How It Works

```
User Action (Follow/Unfollow)
        ↓
NEAR Transaction → Contract
        ↓
FastData Indexer → ScyllaDB
        ↓
FastKV API → This Frontend
```

**Key Insight:** FastData stores data in the transaction ledger, not contract state. The indexer captures this data regardless of transaction success/failure.

## Features

- **Follow/Unfollow** - Track who you follow on NEAR
- **Followers List** - See who follows you (reverse lookup)
- **Network Visualization** (coming soon)

### FastFS File Upload

- Drag & drop files up to 32,000,000 bytes (~30.5 MB)
- Automatic chunking for files >1MB
- Files hosted at `https://{accountId}.fastfs.io/fastfs.near/{path}`
- Contract: fastfs.near, Method: \_\_fastdata_fastfs, Gas: 1 Tgas/chunk

### FastFS Technical Details

- **Chunk Size:** 1,048,576 bytes (1 MiB) exactly
- **Nonce:** Unix timestamp offset for upload deduplication
- **Alignment:** Chunk offsets must align to 1 MB boundaries

## Tech Stack

- TypeScript + React + Vite
- @hot-labs/near-connect (wallet integration)
- FastData Indexer
- FastKV API

| Environment | API URL                           |
| ----------- | --------------------------------- |
| Development | `http://localhost:3001`           |
| Production  | `https://fastdata.up.railway.app` |

### Available Endpoints

- `GET /health` - Check API server status
- `GET /v1/kv/query` - Query key-value pairs
- `GET /v1/kv/reverse` - Reverse lookup (followers)

### Example Query

```bash
curl "https://fastdata.up.railway.app/v1/kv/query?predecessor_id=james.near&current_account_id=social.near&key_prefix=graph/follow/&exclude_null=true"
```

## Development

### Prerequisites

- Node.js 18+ recommended
- Yarn 1.22.22 (specified in package.json)

### Local Setup

**1. Start the FastKV API Server (optional but recommended)**

The app requires a local API server for social graph features:

```bash
# Clone the API server
git clone https://github.com/MultiAgency/fastkv-server
cd fastkv-server

# Follow setup instructions in that repository
# Server should run on http://localhost:3001
```

**Note:** The frontend will work without the API server, but social graph features will use localStorage fallback and won't sync with the blockchain.

**2. Start the Frontend**

```bash
# Install dependencies
yarn install

# Run locally (connects to localhost:3001 API)
yarn dev

# Build for production (connects to https://fastdata.up.railway.app)
yarn build
```

## FastData KV Protocol

Follow/unfollow actions use the `__fastdata_kv` method:

```javascript
// Follow
{ "graph/follow/root.near": "" }

// Unfollow
{ "graph/follow/root.near": null }
```

**Configuration:**

- Contract: `social.near`
- Method: `__fastdata_kv`
- Gas: 10 Tgas per transaction
- **Max Keys:** 256 key-value pairs per transaction

## Transaction Behavior

KV transactions may show as "failed" in your wallet - this is expected. The `__fastdata_kv` method doesn't exist on the contract, but FastData indexer still captures the data from transaction arguments.

## Related Repositories

- [fastkv-server](https://github.com/MultiAgency/fastkv-server) - API for key-value queries
- [fastfs-server](https://github.com/fastnear/fastfs-server) - API for file system queries
- [fastdata-indexer](https://github.com/fastnear/fastdata-indexer) - Blockchain data pipeline

## License

MIT
