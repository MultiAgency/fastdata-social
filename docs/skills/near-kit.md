# near-kit: Wallet and Transaction Signing

## What near-kit Is

near-kit is a lightweight TypeScript SDK for NEAR. It provides human-readable units (`"1 NEAR"`, `"50 Tgas"`), a fluent transaction builder, type safety, and works across backend scripts, frontend dApps, and tests. Same business logic everywhere — only the signer source changes.

Full docs: https://kit.near.tools/llms-full.txt

## Packages Used in This App

- `near-kit` — `Near` class, `fromHotConnect` adapter, `Contract` type. Also exports error classes (`FunctionCallError`, `AccountDoesNotExistError`, `NetworkError`) not currently used in this app
- `@near-kit/react` — `NearProvider` context wrapper. Also exports hooks (`useNear`, `useView`, `useCall`, `useSend`, `useBalance`, `useAccountExists`, `useAccount`, `useContract`) — but **this app uses none of them**. We use a custom `useWallet()` hook instead (see below).
- `@hot-labs/near-connect` — HOT wallet connector (replaces NEAR Wallet Selector)

## Why useWallet() Instead of useNear()

`@near-kit/react` provides `useNear()` which returns the `Near` instance from `NearProvider` context. This app doesn't use it because:

- We need wallet-specific state (`isConnected`, `isInitializing`, `error`) that `useNear()` doesn't provide
- We need `connectWallet()` / `disconnectWallet()` methods tied to the HOT connector lifecycle
- `useWallet().near` gives you the same `Near` instance that `useNear()` would return

The `NearProvider` is still used — `WalletProvider` conditionally wraps children in it when a `near` instance exists (lines 208–215). This means `useNear()` and all `@near-kit/react` hooks *would* work inside components, but the app consistently uses `useWallet()` for everything.

## The Near Class

near-kit has one central class. The `network` option determines RPC endpoints, and the optional `wallet` or `privateKey` option determines who signs:

```ts
// Backend / scripts — signs with private key
const near = new Near({ network: "mainnet", privateKey: "ed25519:..." })

// Frontend with HOT Connector (what this app uses)
const connector = new NearConnector({ network: "mainnet" })
const near = new Near({ network: "mainnet", wallet: fromHotConnect(connector) })

// Frontend with Wallet Selector (alternative)
const near = new Near({ network: "mainnet", wallet: fromWalletSelector(wallet) })

// Read-only (no signer — view calls only)
const near = new Near({ network: "mainnet" })
```

Adapter functions (`fromHotConnect`, `fromWalletSelector`) normalize wallet implementations into near-kit's interface.

## How This App Wires It Up

`src/providers/WalletProvider.tsx` handles the full lifecycle:

1. Creates `NearConnector` for mainnet
2. Checks for existing wallet connection via `connector.getConnectedWallet()`
3. Listens for `wallet:signIn` / `wallet:signOut` events
4. Creates `Near` instance with `fromHotConnect(connector)`
5. Wraps children in `NearProvider` (from `@near-kit/react`)
6. Exposes `useWallet()` context hook

```tsx
// Available from useWallet()
interface WalletContextType {
  accountId: string | null;
  near: Near | null;
  isConnected: boolean;
  isInitializing: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  error: Error | null;
  clearError: () => void;
}
```

## Reading Data (view calls)

View methods don't require a signer — they call read-only contract methods via RPC:

```ts
const messages = await near.view<Message[]>("contract.near", "get_messages", { limit: 10 })
```

Note: This app doesn't use `near.view()` — all reads go through the FastData SDK (`client.kvGet()`, `client.socialGet()`, etc.) which hits the fastkv-server REST API, not NEAR RPC.

## Writing Data (function calls)

### near.call() — Simple Shortcut

Shortcut for `.transaction().functionCall().send()` — one method, one transaction:

```ts
await near.call("contract.near", "method_name", { arg: "value" }, { gas: "50 Tgas", attachedDeposit: "1 NEAR" })
```

This is valid near-kit API but **this app doesn't use it** — we use the transaction builder exclusively for consistency.

### Fluent Transaction Builder

Chain multiple actions in one transaction:

```ts
await near
  .transaction("alice.near")           // signerId
  .functionCall("contract.near", "method", { arg: "value" })
  .transfer("bob.near", "1 NEAR")
  .send()
```

Available actions: `.functionCall()`, `.transfer()`, `.createAccount()`, `.deployContract()`, `.stake()`, `.deleteAccount()`, `.addKey()`, `.deleteKey()`, `.signedDelegateAction()`.

For batch operations, chain multiple `.functionCall()` on the same transaction — they execute atomically.

### How This App Signs Transactions

All writes use the transaction builder pattern — `near.transaction(signerId).functionCall(...).send()`:

```tsx
import { useWallet } from "../providers/WalletProvider";

function MyComponent({ accountId }: { accountId: string }) {
  const { near } = useWallet();
  const client = useClient();

  // Follow/unfollow:
  const handleFollow = async () => {
    const args = buildFollowArgs(accountId, "target.near");
    await near
      .transaction(accountId)
      .functionCall(Constants.KV_CONTRACT_ID, "__fastdata_kv", args, { gas: "10 Tgas" })
      .send();
  };

  // Profile edits:
  const handleSave = async () => {
    const kvArgs = buildProfileArgs(accountId, profileInput);
    await near
      .transaction(accountId)
      .functionCall(Constants.KV_CONTRACT_ID, "__fastdata_kv", kvArgs, { gas: "10 Tgas" })
      .send();
  };
}
```

FastFS uploads use Borsh-encoded binary args with the transaction builder:

```tsx
await near
  .transaction(accountId)
  .functionCall(Constants.CONTRACT_ID, "__fastdata_fastfs", encodeFfs(ffsData), { gas: "1 Tgas" })
  .send();
```

## Type-Safe Contracts

Define contract interfaces for compile-time safety:

```ts
type Guestbook = Contract<{
  view: {
    get_messages: (args: { limit: number }) => Promise<Message[]>
  }
  call: {
    add_message: (args: { text: string }) => Promise<void>
  }
}>

const guestbook = near.contract<Guestbook>("guestbook.near")
await guestbook.view.get_messages({ limit: 5 })
await guestbook.call.add_message({ text: "Hello" })
```

## Error Handling

near-kit exports typed error classes (`FunctionCallError`, `AccountDoesNotExistError`, `NetworkError`). **This app doesn't use them** — all error handling uses generic `try/catch` with `Error` instances. They're documented here for reference:

```ts
import { FunctionCallError, AccountDoesNotExistError, NetworkError } from "near-kit"

try {
  await near.transaction(accountId)
    .functionCall("contract.near", "method", args, { gas: "10 Tgas" })
    .send()
} catch (e) {
  if (e instanceof FunctionCallError) {
    // Contract panicked or method failed
    console.log("Panic:", e.panic)        // panic message from contract
    console.log("Type:", e.errorType)     // e.g. "MethodNotFound", "ExecutionError"
  } else if (e instanceof AccountDoesNotExistError) {
    console.log("Account not found:", e.accountId)
  } else if (e instanceof NetworkError) {
    console.log("RPC unreachable")
  }
}
```

In this app, components use plain `try/catch` (see `ProfileView.tsx`). `contextual.near` has `__fastdata_kv` defined — transactions succeed normally. See `docs/skills/fastdata.md`.

## Message Signing (Authentication)

"Log in with NEAR" — off-chain signature verification:

```ts
// Client
const signedMessage = await near.signMessage({
  message: "Log in to MyApp",
  recipient: "myapp.com",
  nonce: generateNonce()
})

// Server
const isValid = await verifyNep413Signature(signedMessage, { message, recipient, nonce }, { near })
```

## Meta-Transactions (Gasless)

Users sign off-chain; a relayer submits:

```ts
// Client
const { payload } = userNear.transaction("user.near")
  .functionCall("game.near", "move", { x: 1, y: 2 })
  .delegate()

// Relayer
const userAction = decodeSignedDelegateAction(payload)
await relayer.transaction("relayer.near").signedDelegateAction(userAction).send()
```

## Testing with Sandbox

near-kit includes a built-in sandbox for integration testing — no testnet needed:

```ts
import { Sandbox, KeyPair } from "near-kit"

const sandbox = await Sandbox.start()
const near = new Near({ network: sandbox })

// Create test accounts
const alice = KeyPair.random()
await near.transaction("alice.test.near")
  .createAccount()
  .transfer("alice.test.near", "10 NEAR")
  .addKey("alice.test.near", alice.publicKey)
  .send()

// Deploy and test contracts
await near.transaction("alice.test.near")
  .deployContract("contract.test.near", "./contract.wasm")
  .send()
```

This app doesn't use sandbox testing — E2E tests use Playwright with mocked API responses instead.

## @near-kit/react Hooks Reference

These hooks are exported by `@near-kit/react` and available inside `NearProvider`. **This app doesn't use them** (we use `useWallet()` instead), but they're documented here for reference:

| Hook | Returns | Purpose |
|---|---|---|
| `useNear()` | `Near` | The `Near` instance from `NearProvider` context |
| `useView(contractId, method, args?)` | `{ data, loading, error }` | Auto-fetching view call with React state |
| `useCall()` | `(contractId, method, args?, opts?) => Promise` | Function to execute a call |
| `useSend()` | `(transaction) => Promise` | Send a pre-built transaction |
| `useBalance(accountId?)` | `{ available, staked, total }` | Account balance |
| `useAccountExists(accountId)` | `boolean` | Check if account exists |
| `useAccount(accountId?)` | `AccountView` | Full account info |
| `useContract<T>(contractId)` | `{ view, call }` | Type-safe contract handle |

If a future refactor drops the custom `useWallet()` wrapper, these hooks could replace most of its functionality — but wallet connect/disconnect lifecycle would still need custom handling.

## Network Config

```ts
// src/hooks/constants.ts
NETWORK: {
  networkId: "mainnet",
  nodeUrl: "https://rpc.mainnet.fastnear.com",
}
```

`networkId` is passed to both `NearConnector({ network })` and `Near({ network })`. The `nodeUrl` is used for direct RPC calls (not currently used — reads go through FastData API).

## Account Validation

`src/utils/validation.ts` exports `isValidNearAccount(accountId)`. The wallet provider validates account IDs before accepting them from the connector (lines 91, 120).
