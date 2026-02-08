# Architecture

## System Flow

Two protocols share the same indexing infrastructure but use different contracts and encoding:

```
KV (social data):
  SDK builds JSON args → near.transaction(signerId)
    .functionCall("contextual.near", "__fastdata_kv", args, { gas: "10 Tgas" }).send()
      ↓
  NEAR RPC → contextual.near (tx succeeds, method is minimal)
      ↓
  FastData indexer extracts args from receipt → ScyllaDB
      ↓
  fastkv-server REST API → SDK reads → React app

FastFS (file storage):
  Borsh-encode file data → near.transaction(signerId)
    .functionCall("fastfs.near", "__fastdata_fastfs", encoded, { gas: "10 Tgas" }).send()
      ↓
  Same indexer pipeline → fastfs-server serves files at
  https://{accountId}.fastfs.io/fastfs.near/{path}
```

`near` comes from `useWallet().near`. See `docs/skills/near-kit.md`.
For protocol details (why transactions "fail", what the indexer does), see `docs/skills/fastdata.md`.

## Application Initialization

```
src/main.tsx
  └── ErrorBoundary          (src/ErrorBoundary.tsx — catches render errors, shows reload UI)
       └── WalletProvider     (src/providers/WalletProvider.tsx — HOT wallet + NearProvider)
            └── RouterProvider (TanStack Router — src/router.tsx)
                 └── App      (src/App.tsx — layout wrapper)
                      └── Outlet (active route component)
```

## Routes

| Path | Component | Requires Wallet | Purpose |
|---|---|---|---|
| `/` | `Directory` | No | Account directory with tag filtering and pagination |
| `/graph/$accountId` | `GraphView` | No | 3D social graph visualization |
| `/profile` | `ProfilePage` | No | Own profile (edit mode if signed in, sign-in prompt otherwise) |
| `/profile/$accountId` | `ProfilePage` | No | View any account's profile, follow/unfollow |
| `/profile/$accountId/followers` | `Connections` | No | Paginated followers list |
| `/profile/$accountId/following` | `Connections` | No | Paginated following list |

## API Server

- **Production**: `https://fastdata.up.railway.app`
- **Development**: `http://localhost:3001`
- Set via `import.meta.env.PROD` in `src/hooks/constants.ts`

## KV Data Model

Every KV entry has: `predecessor_id` (who wrote it), `current_account_id` (which contract), `key`, `value`, `block_height`, `block_timestamp`, `receipt_id`, `tx_hash`.

### Key Schema

| Key pattern | Value | Purpose |
|---|---|---|
| `profile/name` | `"Alice"` | Display name |
| `profile/image/url` | `"https://..."` | Avatar URL |
| `profile/about` | `"Bio text"` | Bio |
| `profile/tags/{tag}` | `""` (empty string) | Tag existence |
| `profile/linktree/{platform}` | `"handle"` | Social link |
| `graph/follow/{target}` | `""` (follow) or `null` (unfollow) | Social graph edge |
| `post/main` | `{"text": "..."}` (JSON) | Post content |
| `post/comment` | `{"text": "..."}` (JSON) | Comment content |
| `index/post` | `{"key": "main", "value": {"type": "md"}}` | Post index entry |
| `index/comment` | `{"key": "{author}/post/main\n{blockHeight}", "value": {"type": "md"}}` | Comment index |
| `index/hashtag` | `{"key": "{tag}", "value": {"type": "mention", "path": "post/main"}}` | Hashtag index |
| `index/notify` | `{"key": "{accountId}", "value": {"type": "mention\|comment\|like\|repost", "path": "..."}}` | Notification index |
| `index/like` | `{"key": "{path}\n{blockHeight}", "value": {"type": "like"}}` | Like index |
| `index/repost` | `{"key": "{path}\n{blockHeight}", "value": {"type": "repost"}}` | Repost index |

### Conventions

- `null` value = deletion (unfollow, unlike)
- Empty string `""` = existence marker (tags, follows)
- Index keys store JSON with `{key, value}` structure for queryability
- Single item = JSON object. Multiple items = JSON array of objects (see hashtag/mention handling in `src/client/builders.ts`)
- Path references use `\n` (newline) to separate account path from block height

## App Structure

```
src/
  main.tsx               Entry point (createRoot)
  ErrorBoundary.tsx      Catches render errors with reload UI
  App.tsx                Layout wrapper: Header + Outlet
  router.tsx             TanStack Router route definitions

  client/                SDK
    FastData.ts          Base class: KV reads, social reads, buildCommit()
    Social.ts            Extends FastData: profiles, posts, follows, likes, feeds
    builders.ts          Pure functions that build KV args
    utils.ts             extractMentions(), extractHashtags()
    constants.ts         DEFAULT_CONTRACT_ID, DEFAULT_GAS, TIMEOUT_MS
    types.ts             All SDK interfaces
    index.ts             Re-exports builders, FastData, Social, types, utils (not constants)
    __tests__/           FastData.test.ts, builders.test.ts, utils.test.ts

  hooks/
    useClient.ts         Social client via React context (ClientProvider + useClient())
    constants.ts         Contract IDs (contextual.near, fastfs.near), API URLs, network
    fastfs.ts            Borsh schema and encodeFfs() for FastFS uploads

  providers/
    WalletProvider.tsx   HOT wallet connector → Near instance → NearProvider + useWallet()

  Header/
    Header.tsx           App header with logo + nav links (desktop inline, mobile hamburger)
    SignIn/              AccountNavbar, SignInNavbar, SignedInNavbar

  Directory/
    Directory.tsx        Account directory with multi-contract scan, tag filtering, cursor pagination

  Social/
    GraphView.tsx        3D force-directed graph (react-force-graph-3d)
    AccountList.tsx      Follower/following list with account formatting
    TransactionAlert.tsx Transaction feedback ("failed" tx explanation)

  Profile/
    ProfilePage.tsx      Route wrapper: own profile (edit) or other (view) or sign-in prompt
    ProfileView.tsx      Full profile with inline editing, avatar upload, follow/unfollow, tabs
    Connections.tsx      Paginated followers/following lists with unfollow on own profile

  components/
    AccountCard.tsx      Profile cards for directory listing
    FollowButton.tsx     Reusable follow/unfollow button
    ProfileHeader.tsx    Avatar + name display component
    TagBadge.tsx         Clickable tag badges
    ui/                  shadcn/ui: Alert, Badge, Button, Input, Tabs
  types/
    index.ts             App-level types: AppConstants, NetworkConfig, FastFS types (FastfsData, SimpleFastfs, etc.), Transaction types
    borsh.ts             BorshFieldType, BorshSchema, BorshSchemaDefinition
  utils/
    validation.ts        isValidNearAccount(), formatAccountId(), getTxExplorerUrl()
  lib/
    utils.ts             cn() — clsx + tailwind-merge
```

## Graph Visualization

The 3D graph (`/graph/$accountId`) visualizes the social network:

- **Library**: `react-force-graph-3d`
- **Node cap**: 200 nodes maximum
- **Colors**: Root node amber (`#f59e0b`), other nodes green (`#00ff87`). Following edges green, follower edges amber.
- **Interaction**: Click any node to expand — loads `getFollowing()` and `getFollowers()` in parallel
- **Responsive**: Uses `ResizeObserver` for container sizing

## Key Dependencies

| Package | Purpose |
|---|---|
| `near-kit` | NEAR SDK: `Near` class, `fromHotConnect`, transaction signing |
| `@near-kit/react` | `NearProvider` wrapper + hooks (app uses custom `useWallet()` instead) |
| `@hot-labs/near-connect` | HOT wallet connector |
| `@tanstack/react-router` | Client-side routing |
| `react-force-graph-3d` | 3D graph visualization |
| `borsh` | Binary serialization for FastFS |
| `@radix-ui/*` | Headless UI primitives (foundation for shadcn/ui) |

For styling dependencies, see `docs/skills/design-system.md`.

## Key Files

- `src/client/FastData.ts` — base SDK class, all KV/social read methods, `buildCommit()`
- `src/client/Social.ts` — high-level social methods (profiles, posts, follows, likes, feeds)
- `src/client/builders.ts` — pure functions that build KV args for all social actions
- `src/client/types.ts` — all SDK TypeScript interfaces
- `src/hooks/constants.ts` — two contract IDs (`contextual.near` for KV, `fastfs.near` for files), API URLs
- `src/router.tsx` — route definitions (all routes handle auth internally via `useWallet()`)
- `src/providers/WalletProvider.tsx` — wallet connection lifecycle and signing context
- `src/utils/validation.ts` — NEAR account validation, display formatting, explorer URLs
