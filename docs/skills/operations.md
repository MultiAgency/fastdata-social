# Operations: Deployment, Debugging, Performance

## Environment Config

| Environment | API URL | Set by |
|---|---|---|
| Production | `https://fastdata.up.railway.app` | `import.meta.env.PROD` in `src/hooks/constants.ts` |
| Development | `http://localhost:3001` | Same check, false in dev |

NEAR RPC: `https://rpc.mainnet.fastnear.com`
Block explorer: `https://nearblocks.io/txns/{txHash}`

## Debugging a Write

Trace a write end-to-end:

1. **Wallet** — `near.call()` submits transaction. Check browser console for errors.
2. **NEAR RPC** — Transaction is broadcast. Look up tx hash on nearblocks.io.
3. **Transaction succeeds** — `contextual.near` has `__fastdata_kv` defined. The receipt args are recorded on-chain.
4. **Indexer** — Watches blocks, extracts `__fastdata_kv` args from the receipt. There may be lag (seconds to minutes).
5. **ScyllaDB** — Indexer writes KV pairs. If ScyllaDB times out, data won't appear.
6. **fastkv-server** — Query the API directly to verify data was indexed:
   ```
   GET {API_BASE_URL}/v1/kv/get?predecessor_id={accountId}&current_account_id=contextual.near&key={key}
   ```
7. **SDK** — `client.kvGet()` wraps this call. Check for 10-second timeout errors.
8. **UI** — Component renders the data. Check React state updates.

### Failure Debugging

If `near.call()` throws, it's a real failure (wallet rejected, insufficient gas, network error). These won't produce a receipt and data won't be indexed.

### Debugging with Diff and Timeline

Two SDK methods help trace data changes after a write:

**`kvDiff`** — Compare a key's value at two different block heights:
```ts
const diff = await client.kvDiff(accountId, "contextual.near", "profile/name", blockA, blockB);
// diff.a = entry at blockA (or null), diff.b = entry at blockB (or null)
```

**`kvTimeline`** — View all writes by an account in chronological order:
```ts
const entries = await client.kvTimeline(accountId, "contextual.near", {
  order: "desc",
  limit: 20,
});
// Returns recent KV writes across all keys
```

Both are useful for confirming the indexer processed a transaction correctly.

## Debugging a Read

Trace a read end-to-end:

1. **SDK call** — `client.kvGet()`, `client.socialGet()`, etc. All go through `fetchJson()` in `FastData.ts`.
2. **HTTP request** — `fetch()` to `{API_BASE_URL}/v1/...` with 10-second `AbortSignal.timeout`.
3. **API response** — Check status code. Non-2xx throws `Error("FastData API {status}: {body}")`.
4. **JSON parsing** — Response parsed as typed object. Empty arrays (`entries: []`) are valid.
5. **Component state** — React state updated. Check that the component handles empty results.

### Common Read Issues

| Symptom | Cause | Fix |
|---|---|---|
| Empty results after confirmed write | Indexer lag | Wait, or use `kvHistory` to check if the key exists at any block height |
| `AbortError` in console | API took >10 seconds | Check server load. The timeout is hardcoded in `FastData.ts` (`TIMEOUT_MS`). |
| `TypeError: Cannot read properties of null` | Component not handling null return from `kvGet` | Add null check before accessing entry fields |
| `SocialTree` has no matching account key | Wrong contract ID or glob pattern | Verify `contractId` param and key pattern match what was written |

## Error Handling

The SDK throws on all API errors — it does **not** return `null` or swallow exceptions. Every call site needs try/catch.

**Pattern used in components:**

```ts
// ExplorerView.tsx, Social.tsx — wrap SDK calls in try/catch
try {
  const data = await client.socialKeys([pattern], { contractId });
  setData(data);
} catch (e) {
  setError("Failed to fetch data");
}
```

**`health()` is the exception** — it returns `false` on error instead of throwing, since it's a boolean check.

## Common Failure Modes

| Problem | Symptom | Fix |
|---|---|---|
| Indexer lag | Data doesn't appear immediately after tx | Wait. App uses 3-second delayed refresh in Social.tsx |
| ScyllaDB timeout | API returns 500 or empty results | Check server logs. Retry. |
| CORS | Browser console shows CORS errors | Verify API_BASE_URL matches the server's allowed origins |
| Wallet disconnect mid-tx | Promise rejection in near.call() | Check `isConnected` before signing. Show error to user. |
| Stale localStorage | Old following list shows after changes | App caches to `fastnear_following_{accountId}`. Clear or wait for refresh. |
| API unreachable | `health()` returns false | App falls back to localStorage cache. Check if server is running. |
| SDK throws on error | Unhandled promise rejection in console | Wrap all SDK calls in try/catch. Only `health()` is safe to call without try/catch. |

## Health Check

```ts
const client = useClient();
const isHealthy = await client.health(); // GET /health
```

The app checks health on load and shows a warning badge if the API is down. See `src/Social/Social.tsx` for the pattern.

## Monitoring

**SDK client** — `useClient()` in `src/hooks/useClient.ts` returns a `Social` instance via React context (`ClientProvider`). Default is a shared singleton. All components share the same config unless a different provider value is injected (e.g. in tests).

**Timeouts** — All API calls use a 10-second timeout (`AbortSignal.timeout(10_000)` in `FastData.ts`). If the server is slow, reads will fail across the entire app simultaneously.

**Indexer lag** — After a write, the app refreshes data with a 3-second `setTimeout` in `Social.tsx`. If the indexer is behind, the UI will still show stale data after this refresh.

**localStorage cache** — Following lists are cached at `fastnear_following_{accountId}`. This acts as a fallback when the API is unreachable. Stale cache can cause the UI to show outdated following lists until the next successful API fetch.

## Running Locally

```bash
bun install
bun dev          # Vite dev server
bun test         # Run SDK unit tests
bun run typecheck  # TypeScript strict check
bun run lint     # Biome lint check
bun run format   # Biome format check
bun run build    # Full production build (tsc + vite)
```

The app expects a fastkv-server running at `localhost:3001` for development.
