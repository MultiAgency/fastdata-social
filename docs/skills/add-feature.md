# Adding Features and Routes

## Adding a Social Feature

Follow this pattern used by every existing feature (follow, post, like, comment):

### 1. Add builder in `src/client/builders.ts`

```ts
export function buildMyFeatureArgs(
  signerId: string,
  input: MyInput
): Record<string, string | null> {
  requireNonEmpty(signerId, "signerId");
  const a: Record<string, string> = {};
  a["some/key"] = JSON.stringify({ ... });
  // Add index entries if the data needs to be queryable
  a["index/myfeature"] = JSON.stringify({ key: "...", value: { type: "..." } });
  // If this action should notify someone, embed signerId so they know who did it
  a["index/notify"] = JSON.stringify({ key: targetAccountId, value: { type: "myfeature", path: "some/key", accountId: signerId } });
  return a;
}
```

Conventions:
- First param is `signerId` — embed it as `accountId` in notification index values so recipients know who performed the action. Use `_signerId` prefix only if the builder generates no notifications.
- Return `Record<string, string | null>` — null values mean deletion
- Use `JSON.stringify()` for complex values
- Omit keys for undefined/empty fields (don't set them to empty string unless that's the convention)
- Add `index/*` keys for anything that needs to be queried later
- Single item = JSON object. Multiple items (hashtags, mentions) = JSON array of objects.

No manual export needed — `src/client/index.ts` uses `export * from "./builders"` so new functions are auto-exported.

### 2. Add types in `src/client/types.ts`

```ts
export interface MyInput {
  // fields
}
```

### 3. Add SDK methods in `src/client/Social.ts`

Write method (wraps builder + `buildCommit`):

```ts
buildMyFeature(signerId: string, input: MyInput, contractId?: string): FastDataTransaction {
  return this.buildCommit(buildMyFeatureArgs(signerId, input), contractId ?? this.cid);
}
```

Read method (wraps appropriate `kv*` or `social*` call):

```ts
async getMyData(accountId: string, contractId?: string): Promise<MyResult> {
  const cid = contractId ?? this.cid;
  const entries = await this.kvQuery({
    predecessorId: accountId,
    currentAccountId: cid,
    keyPrefix: "myfeature/",
    excludeNull: true,
  });
  return entries.map(e => ({ id: e.key, value: e.value }));
}
```

### 4. Add tests in `src/client/__tests__/`

```ts
import { describe, expect, test } from "bun:test";
import { buildMyFeatureArgs } from "../builders";

describe("buildMyFeatureArgs", () => {
  test("produces expected keys", () => {
    const args = buildMyFeatureArgs("alice.near", { text: "hello" });
    // Parse JSON values before asserting structure
    expect(JSON.parse(args["some/key"])).toEqual({ text: "hello" });
  });

  test("single item is object, multiple are array", () => {
    const single = buildMyFeatureArgs("alice.near", { items: ["one"] });
    expect(Array.isArray(JSON.parse(single["index/myfeature"]))).toBe(false);

    const multi = buildMyFeatureArgs("alice.near", { items: ["one", "two"] });
    expect(Array.isArray(JSON.parse(multi["index/myfeature"]))).toBe(true);
  });

  test("deletion returns null value", () => {
    const args = buildMyFeatureArgs("alice.near", { delete: true });
    expect(args["some/key"]).toBeNull();
  });

  test("omits keys for empty input", () => {
    const args = buildMyFeatureArgs("alice.near", {});
    expect(args["optional/key"]).toBeUndefined();
  });

  test("empty input returns no keys", () => {
    const args = buildMyFeatureArgs("alice.near", {});
    expect(Object.keys(args)).toHaveLength(0);
  });
});
```

Run with `bun test`.

### 5. Wire up in a React component

```tsx
import { useClient } from "../hooks/useClient";
import { useNear } from "@near-kit/react";
import { useWallet } from "../providers/WalletProvider";
import { isValidNearAccount } from "../utils/validation";

export function MyFeature({ accountId }: { accountId: string }) {
  const client = useClient();
  const near = useNear();

  // Separate states for reads vs writes
  const [loading, setLoading] = useState(false);
  const [transacting, setTransacting] = useState(false);
  const [data, setData] = useState<MyData[]>([]);

  // --- Data loading with localStorage fallback ---
  const CACHE_KEY = `fastnear_mydata_${accountId}`;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const isHealthy = await client.health();
      if (isHealthy) {
        const result = await client.getMyData(accountId);
        setData(result);
        localStorage.setItem(CACHE_KEY, JSON.stringify(result));
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem(CACHE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) setData(parsed);
          } catch {
            localStorage.removeItem(CACHE_KEY);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [accountId, client]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- Write with optimistic update ---
  const handleAction = useCallback(async (input: MyInput) => {
    setTransacting(true);
    try {
      const tx = client.buildMyFeature(accountId, input);
      await near.call(tx.contractId, tx.methodName, tx.args, tx.gas);

      // Optimistic update: change local state immediately
      setData(prev => [...prev, newItem]);
      localStorage.setItem(CACHE_KEY, JSON.stringify([...data, newItem]));
    } catch (err) {
      console.error(err);
    } finally {
      setTransacting(false);
      // Re-fetch after indexer lag (3 seconds)
      setTimeout(() => loadData(), 3000);
    }
  }, [accountId, near, client, data, loadData]);

  return (
    <div className="animate-fade-up">
      <Button onClick={() => handleAction(input)} disabled={transacting} className="glow-primary font-mono">
        {transacting ? "submitting..." : "Submit"}
      </Button>
    </div>
  );
}
```

Key patterns:
- **`loading`** for data fetches, **`transacting`** for blockchain writes — disable different UI elements
- **Optimistic updates**: update state + localStorage immediately after `near.call()`, then re-fetch after 3 seconds to get the indexed result
- **Health check fallback**: `client.health()` → API fetch → localStorage if API down
- **`useCallback`** for handlers with proper dependency arrays

### 6. Input validation

```tsx
const [validationError, setValidationError] = useState("");

const validate = useCallback((input: string): boolean => {
  if (!input) { setValidationError("Required"); return false; }
  if (!isValidNearAccount(input)) { setValidationError("Invalid NEAR account"); return false; }
  if (input === accountId) { setValidationError("Cannot target yourself"); return false; }
  setValidationError("");
  return true;
}, [accountId]);

// Clear error on input change
<Input onChange={(e) => { setTarget(e.target.value); setValidationError(""); }} />
{validationError && <p className="text-sm text-destructive mt-2 font-mono">{validationError}</p>}
```

### 7. Transaction feedback

Use `TransactionAlert` from `src/Social/TransactionAlert.tsx`:

```tsx
const [lastTx, setLastTx] = useState<Transaction | null>(null);

// After near.call():
setLastTx({ type: "myaction", account: target, txId: result?.transaction?.hash || null, status: "success" });

// On error:
setLastTx({ type: "myaction", account: target, txId: null, status: "error", error: true });

// In JSX:
<TransactionAlert transaction={lastTx} onDismiss={() => setLastTx(null)} />
```

Note: `error: true` means the transaction failed (wallet rejected, insufficient gas, network error). The alert shows the failure to the user.

### 8. Add to Playground for testing

Add a section in `src/Playground/Playground.tsx`. Follow the existing card pattern:

```tsx
// Use useMemo for live JSON preview of builder args
const myArgs = useMemo(() => {
  return buildMyFeatureArgs(accountId, {
    field: myField || undefined,  // || undefined to omit empty strings
  });
}, [accountId, myField]);

// Card UI
<div className="p-5 rounded-xl border border-border bg-card/50">
  <CardHeader title="my feature_" endpoints="→ myfeature/*" />
  <Input value={myField} onChange={e => setMyField(e.target.value)} placeholder="..." />
  <Button
    onClick={() => commitKv(myArgs, "myfeature")}
    disabled={transacting || Object.keys(myArgs).length === 0}
    className="glow-primary font-mono"
  >
    {activeLabel === "myfeature" ? "submitting..." : "Submit"}
  </Button>
  <JsonPreview args={myArgs} />
</div>
```

The playground uses a single `commitKv(args, label)` helper for all sections — it submits the tx, logs it to the transaction history (last 20 entries), and manages the `transacting`/`activeLabel` state.

## Adding a New Route

### 1. Create the component

```tsx
// src/MyPage/MyPage.tsx
export function MyPage({ accountId }: { accountId: string }) {
  const client = useClient();
  // ...
}
```

### 2. Add route in `src/router.tsx`

Two patterns depending on whether the component needs `accountId`:

```tsx
// Pattern A: Requires wallet — component receives accountId as prop
const myRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mypage",
  component: () => <RequireWallet>{(id) => <MyPage accountId={id} />}</RequireWallet>,
});

// Pattern B: Handles auth internally — component uses useWallet() directly
const myRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mypage",
  component: MyPage,
});
```

Use pattern A (RequireWallet) when the component can't render at all without an account. Use pattern B when the component can show a partial UI or handles its own auth state (like Social.tsx and Upload.tsx).

Add to route tree:
```tsx
const routeTree = rootRoute.addChildren([
  // ...existing routes,
  myRoute,
]);
```

### 3. Add nav link in `src/Header/Header.tsx`

```tsx
const navLinks = [
  // ...existing links,
  { to: "/mypage" as const, label: "MyPage" },
];
```

Navigation lives in the Header component. Links render inline on desktop, in a hamburger dropdown on mobile. Active state is detected via `useRouterState` comparing `pathname === link.to`.

### 4. Hooks available in components

- `useClient()` — returns `Social` SDK instance (reads + write builders)
- `useNear()` — from `@near-kit/react`, returns the `near` instance directly for `near.call()` or `near.transaction().send()`
- `useWallet()` — returns `{ accountId, isConnected, isInitializing, connectWallet, disconnectWallet, error, clearError }`
