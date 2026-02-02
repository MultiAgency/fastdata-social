# near-kit: Wallet and Transaction Signing

## What near-kit Is

near-kit is a lightweight TypeScript SDK for NEAR. It provides human-readable units (`"1 NEAR"`, `"50 Tgas"`), a fluent transaction builder, type safety, and works across backend scripts, frontend dApps, and tests. Same business logic everywhere — only the signer source changes.

Full docs: https://kit.near.tools/llms-full.txt

## Packages Used in This App

- `near-kit` — `Near` class, `fromHotConnect` adapter
- `@near-kit/react` — `NearProvider`, `useNear()` hook
- `@hot-labs/near-connect` — HOT wallet connector (replaces NEAR Wallet Selector)

## The Near Class

```ts
// Backend / scripts
const near = new Near({ network: "mainnet", privateKey: "ed25519:..." })

// Frontend with HOT Connector (what this app uses)
const connector = new NearConnector({ network: "mainnet" })
const near = new Near({ network: "mainnet", wallet: fromHotConnect(connector) })

// Frontend with Wallet Selector (alternative)
const near = new Near({ network: "mainnet", wallet: fromWalletSelector(wallet) })
```

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
  isConnected: boolean;
  isInitializing: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  error: Error | null;
  clearError: () => void;
}
```

## Reading Data (view calls)

View methods don't require a signer:

```ts
const messages = await near.view<Message[]>("contract.near", "get_messages", { limit: 10 })
```

## Writing Data (function calls)

### near.call()

```ts
await near.call("contract.near", "method_name", { arg: "value" }, { gas: "50 Tgas", attachedDeposit: "1 NEAR" })
```

### Fluent Transaction Builder

Chain multiple actions in one transaction:

```ts
await near
  .transaction("alice.near")
  .functionCall("contract.near", "method", { arg: "value" })
  .transfer("bob.near", "1 NEAR")
  .send()
```

### How This App Signs Transactions

KV writes use the FastData SDK to build args, then `near.call()` to submit:

```tsx
import { useNear } from "@near-kit/react";

function MyComponent({ accountId }: { accountId: string }) {
  const near = useNear();
  const client = useClient();

  const handleFollow = async () => {
    const tx = client.buildFollow(accountId, "target.near");
    // tx = { contractId, methodName, args, gas }
    await near.call(tx.contractId, tx.methodName, tx.args, tx.gas);
  };
}
```

FastFS uploads use Borsh-encoded binary args:

```tsx
await near.call(
  Constants.CONTRACT_ID,        // "fastfs.near"
  "__fastdata_fastfs",
  encodeFfs(ffsData),           // Borsh-encoded Uint8Array
  "1000000000000"               // 1 Tgas per chunk
);
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

```ts
try {
  await near.call(...)
} catch (e) {
  if (e instanceof FunctionCallError) {
    console.log("Panic:", e.panic)
  } else if (e instanceof AccountDoesNotExistError) {
    console.log("Account not found:", e.accountId)
  }
}
```

Note: `contextual.near` has `__fastdata_kv` defined — transactions succeed normally. See `docs/skills/fastdata.md`.

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

```ts
const sandbox = await Sandbox.start()
const near = new Near({ network: sandbox })
// Tests run against a local NEAR node — no testnet needed
```

## RequireWallet Gate

Routes that need a wallet use `RequireWallet` in `src/router.tsx`:

```tsx
const myRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mypage",
  component: () => <RequireWallet>{(id) => <MyPage accountId={id} />}</RequireWallet>,
});
```

Shows a spinner until wallet is connected, then passes `accountId` as a render prop.

## Network Config

```ts
// src/hooks/constants.ts
NETWORK: {
  networkId: "mainnet",
  nodeUrl: "https://rpc.mainnet.fastnear.com",
}
```

## Account Validation

`src/utils/validation.ts` exports `isValidNearAccount(accountId)`. The wallet provider validates account IDs before accepting them.
