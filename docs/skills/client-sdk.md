# Client SDK

## Class Hierarchy

```
FastData (src/client/FastData.ts)
  └── Social (src/client/Social.ts)
```

`FastData` has all low-level KV and social read methods plus `buildCommit()`. `Social` extends it with domain-specific methods for profiles, posts, follows, likes, feeds.

## Exports

`src/client/index.ts` re-exports everything:

```ts
export { FastData } from "./FastData";
export { Social } from "./Social";
export * from "./builders";     // all build*Args functions
export * from "./utils";        // extractMentions, extractHashtags
export type * from "./types";   // all interfaces
```

## Instantiation

```ts
// src/hooks/useClient.ts
import { createContext, useContext } from "react";
import { Social } from "../client";
import { Constants } from "./constants";

const client = new Social({
  apiUrl: Constants.API_BASE_URL,      // Railway prod or localhost:3001
  contractId: Constants.KV_CONTRACT_ID, // "contextual.near"
});

const ClientContext = createContext<Social>(client);

export function useClient(): Social {
  return useContext(ClientContext);
}

export const ClientProvider = ClientContext.Provider;
export { client };
```

Uses React context — `ClientProvider` wraps the app so the client is testable and configurable. Default instance is shared across all components.

## Config

```ts
interface FastDataConfig {
  apiUrl: string;        // fastkv-server URL
  contractId?: string;   // defaults to "contextual.near"
}
```

## Read Methods (FastData)

All reads hit the fastkv-server REST API. 10-second timeout (`AbortSignal.timeout`). Errors throw `Error` with `FastData API {status}: {body}`.

### KV Reads

**`kvGet(opts)`** → `KvEntry | null`
GET /v1/kv/get — Single key lookup.
```ts
opts: {
  predecessorId: string;
  currentAccountId: string;
  key: string;
  fields?: string;
}
```

**`kvQuery(opts)`** → `KvEntry[]`
GET /v1/kv/query — Range query by prefix.
```ts
opts: {
  predecessorId: string;          // required
  currentAccountId: string;       // required
  keyPrefix?: string;
  limit?: number;
  offset?: number;
  excludeNull?: boolean;          // filter out deleted keys
  fields?: string;
  format?: string;
}
```

**`kvHistory(predecessorId, currentAccountId, key, opts?)`** → `KvEntry[]`
GET /v1/kv/history — Key version history.
```ts
opts?: { limit?: number; order?: "asc" | "desc"; fromBlock?: number; toBlock?: number; fields?: string }
```

**`kvReverse(currentAccountId, key, opts?)`** → `KvEntry[]`
GET /v1/kv/reverse — Reverse lookup: find all `predecessor_id`s that wrote this key.
```ts
opts?: { limit?: number; offset?: number; excludeNull?: boolean; fields?: string }
```

**`kvByKey(key, opts?)`** → `KvEntry[]`
GET /v1/kv/by-key — All accounts with this key, across all predecessors.
```ts
opts?: { currentAccountId?: string; limit?: number; offset?: number; fields?: string }
```

**`kvBatch(predecessorId, currentAccountId, keys[])`** → `KvBatchResult[]`
POST /v1/kv/batch — Multi-key fetch. Returns `{ key, found, value?, error? }` per key.

**`kvAccounts(currentAccountId, key, opts?)`** → `string[]`
GET /v1/kv/accounts — List predecessor accounts that have data for a key.
```ts
opts?: { limit?: number; offset?: number; excludeNull?: boolean }
```

**`kvDiff(predecessorId, currentAccountId, key, blockHeightA, blockHeightB, opts?)`** → `KvDiffResponse`
GET /v1/kv/diff — Compare a key's value at two block heights. Returns `{ a: KvEntry | null, b: KvEntry | null }`.
```ts
opts?: { fields?: string }
```

**`kvTimeline(predecessorId, currentAccountId, opts?)`** → `KvEntry[]`
GET /v1/kv/timeline — All writes by an account in chronological order.
```ts
opts?: { limit?: number; offset?: number; order?: "asc" | "desc"; fromBlock?: number; toBlock?: number; fields?: string }
```

**`health()`** → `boolean`
GET /health — Returns `true` if API is reachable, `false` on any error.

### Social Reads

**`socialGet(keys[], opts?)`** → `SocialTree`
POST /v1/social/get — Tree query. Keys use glob patterns like `"alice.near/profile/**"`.
```ts
opts?: { contractId?: string; options?: { returnDeleted?: boolean; withBlockHeight?: boolean } }
```

**`socialKeys(keys[], opts?)`** → `SocialTree`
POST /v1/social/keys — Key structure without values.
```ts
opts?: { contractId?: string; options?: { returnType?: string; returnDeleted?: boolean; valuesOnly?: boolean } }
```

**`socialIndex(action, key, opts?)`** → `IndexEntry[]`
GET /v1/social/index — Query indexed data (posts, hashtags, notifications).
```ts
opts?: { contractId?: string; accountId?: string; limit?: number; from?: number; order?: "asc" | "desc" }
```

## Read Methods (Social)

All accept optional `contractId` as last param. Default is `config.contractId` (`"contextual.near"`).

| Method | Signature | Returns | Uses |
|---|---|---|---|
| `getProfile` | `(accountId, contractId?)` | `Profile \| null` | GET /v1/social/profile |
| `getFollowers` | `(accountId, opts?)` | `FollowResponse` | GET /v1/social/followers |
| `getFollowing` | `(accountId, opts?)` | `FollowResponse` | GET /v1/social/following |
| `getAccountFeed` | `(accountId, opts?)` | `FeedResponse` | GET /v1/social/feed/account |
| `getHashtagFeed` | `(hashtag, opts?)` | `IndexEntry[]` | `socialIndex("hashtag", tag)` |
| `getActivityFeed` | `(opts?)` | `IndexEntry[]` | `socialIndex("post", "main")` |
| `getMentionedFeed` | `(accountId, opts?)` | `IndexEntry[]` | `socialIndex("notify", accountId)` |
| `getNotifications` | `(accountId, opts?)` | `IndexEntry[]` | `socialIndex("notify", accountId)` |

`getProfile` takes `contractId` as a positional param. All other methods embed it inside `opts`.
`getFollowers`/`getFollowing` opts: `{ limit?: number; offset?: number; contractId?: string }`.
Feed opts: `{ limit?: number; from?: number; order?: "asc" | "desc"; contractId?: string }`.
`getAccountFeed` also accepts `includeReplies?: boolean`.

## Write Pattern

Writes are two steps: build args, then sign and submit.

### Step 1: Build

All `build*` methods on `Social` return a `FastDataTransaction`:

```ts
interface FastDataTransaction {
  contractId: string;    // "contextual.near"
  methodName: string;    // "__fastdata_kv"
  args: Record<string, string | null>;
  gas: string;           // "10000000000000" (10 Tgas)
}
```

| Social method | Builder it wraps | Purpose |
|---|---|---|
| `buildSetProfile(signerId, profile, contractId?)` | `buildProfileArgs` | Set profile fields |
| `buildCreatePost(signerId, post, contractId?)` | `buildPostArgs` | Create a post |
| `buildCreateComment(signerId, comment, contractId?)` | `buildCommentArgs` | Comment on a post |
| `buildFollow(signerId, target, contractId?)` | `buildFollowArgs` | Follow an account |
| `buildUnfollow(signerId, target, contractId?)` | `buildUnfollowArgs` | Unfollow an account |
| `buildLike(signerId, item, contractId?)` | `buildLikeArgs` | Like a post |
| `buildUnlike(signerId, item, contractId?)` | `buildUnlikeArgs` | Unlike a post |
| `buildRepost(signerId, item, contractId?)` | `buildRepostArgs` | Repost |

The base class also exposes `buildCommit(kvPairs, contractId?)` directly for custom KV writes.

### Step 2: Submit

```tsx
const near = useNear();
const tx = client.buildFollow(accountId, "target.near");
await near.call(tx.contractId, tx.methodName, tx.args, tx.gas);
```

See `docs/skills/near-kit.md` for signing details.

## Builders (src/client/builders.ts)

Pure functions that produce `Record<string, string | null>`:

| Builder | Keys produced |
|---|---|
| `buildProfileArgs(signerId, profile)` | `profile/name`, `profile/image/url`, `profile/about`, `profile/tags/*`, `profile/linktree/*` — omits keys for undefined fields |
| `buildPostArgs(signerId, post)` | `post/main`, `index/post`, `index/hashtag` (if any), `index/notify` (if any) |
| `buildCommentArgs(signerId, comment)` | `post/comment`, `index/comment`, `index/notify` (to target author) |
| `buildFollowArgs(signerId, target)` | `graph/follow/{target}` → `""`, `index/notify` (to target, type: "follow") |
| `buildUnfollowArgs(signerId, target)` | `graph/follow/{target}` → `null` |
| `buildLikeArgs(signerId, item)` | `index/like`, `index/notify` |
| `buildUnlikeArgs(signerId, item)` | `index/like` (type: "unlike") — no notification |
| `buildRepostArgs(signerId, item)` | `index/repost`, `index/notify` |

Note: `signerId` is used by most builders to embed `accountId` in notification index values (so recipients know who performed the action). Builders that don't generate notifications (`buildProfileArgs`, `buildUnfollowArgs`, `buildUnlikeArgs`) accept `_signerId` with underscore prefix. All builders validate required inputs with `requireNonEmpty()` and throw on empty strings.

## Utilities (src/client/utils.ts)

```ts
extractMentions(text: string): string[]    // finds @account.near and @account.tg
extractHashtags(text: string): string[]    // finds #tags, returns lowercase, deduped
```

Auto-extraction in `buildPostArgs`: hashtags and mentions are extracted from post text. Single match = JSON object, multiple = JSON array.

## Return Types (src/client/types.ts)

```ts
interface KvEntry {
  predecessor_id: string;
  current_account_id: string;
  key: string;
  value: string | null;
  block_height: number;
  block_timestamp: number;
  receipt_id: string;
  tx_hash: string;
}

interface KvBatchResult { key: string; found: boolean; value: string | null; error?: string | null }

interface KvDiffResponse { a: KvEntry | null; b: KvEntry | null }

type SocialTree = Record<string, Record<string, unknown>>   // nested tree from socialGet/socialKeys

interface IndexEntry { accountId: string; blockHeight: number; value?: unknown }

interface FollowResponse { accounts: string[]; count: number }

interface FeedResponse { posts: IndexEntry[] }

interface Profile {
  name?: string;
  image?: { url?: string; ipfs_cid?: string };
  description?: string;
  about?: string;
  linktree?: Record<string, string>;
  tags?: Record<string, string>;
  [key: string]: unknown;
}
```

## Input Types (src/client/types.ts)

```ts
interface FastDataConfig { apiUrl: string; contractId?: string }

interface ProfileInput { name?: string; image_url?: string; about?: string; tags?: string[]; linktree?: Record<string, string> }
interface PostInput { text: string; type?: string }
interface CommentInput { text: string; targetAuthor: string; targetBlockHeight: string }
interface ActionItem { type: string; path: string; blockHeight: string }
interface FeedOptions { limit?: number; from?: number; order?: "asc" | "desc" }
```
