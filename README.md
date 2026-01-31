# NEAR Directory

## Social Graph on FastData

Community Networking Experience

**Live Demo:** https://fastnear-social.up.railway.app

## Overview

NEAR Directory enables connecting your NEAR account with others by "following" them using [FastData](https://hackmd.io/@fastnear/__fastdata) (created by [FastNear](https://fastnear.com)).

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

## Tech Stack

- React + Vite
- NEAR Wallet Selector
- FastData Indexer
- FastKV API

| Environment | API URL                           |
| ----------- | --------------------------------- |
| Development | `http://localhost:3001`           |
| Production  | `https://fastdata.up.railway.app` |

### Example Query

```bash
curl "https://fastdata.up.railway.app/v1/kv/query?predecessor_id=james.near&current_account_id=social.near"
```

## Development

```bash
# Install dependencies
yarn install

# Run locally (uses localhost:3001 API)
yarn dev

# Build for production
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

## Related Repositories

- [fastkv-server](https://github.com/MultiAgency/fastkv-server) - API for key-value queries
- [fastfs-server](https://github.com/fastnear/fastfs-server) - API for file system queries
- [fastdata-indexer](https://github.com/fastnear/fastdata-indexer) - Blockchain data pipeline

## License

MIT
