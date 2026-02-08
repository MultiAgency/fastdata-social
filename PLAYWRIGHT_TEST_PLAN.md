# Playwright Test Plan — fastdata-social

## Overview

Phased plan for E2E test coverage of fastdata-social, a NEAR wallet-gated app with routes: `/` (Directory), `/profile`, `/profile/$accountId`, `/profile/$accountId/followers`, `/profile/$accountId/following`, `/graph/$accountId`.

## Phases

### Phase 1 — Smoke Tests (done)
- Routes render (/, /profile, /profile/$accountId, /profile/$accountId/followers, /profile/$accountId/following, /graph/$accountId)
- No mocking, no wallet
- 6 tests

### Phase 2 — Read-Only with API Mocking (done)
- Intercept FastData API via `page.route()`
- Fixture data for followers, following, directory accounts, profiles
- Empty state + populated state coverage
- Wallet stub via `window.__E2E_ACCOUNT_ID`
- Tests:
  - `directory.spec.ts` — Directory page (scan + empty state)
  - `social-empty.spec.ts` — Connections empty state
  - `social-followers.spec.ts` — Connections populated state
  - `profile-view.spec.ts` — Profile view (data, counts, tags, edit controls)

### Phase 3 — Integration with Mocking (done)
- Follow button behavior (own profile, other profile, not signed in)
- Uses wallet stub + API mocks
- 3 tests

### Phase 4 — Expanded Coverage (future)
- Graph page: 3D visualization loads with mocked social data
- API unavailable banner when `/health` returns 503
- Error boundary rendering on API failures
- Profile view: avatar upload, name/bio editing, tag management (in ProfileView.tsx)

### Phase 5 — Real Wallet Integration (future, optional)
- near-sandbox for isolated blockchain state
- Inject test wallet that can sign transactions
- Verify on-chain state after follow/unfollow
- Only if test reliability justifies the setup cost

## API Endpoints Mocked

| Endpoint | Method | Used By |
|----------|--------|---------|
| `/health` | GET | Various (API availability check) |
| `/v1/kv/accounts` | GET | Directory (scan mode) |
| `/v1/kv/by-key` | GET | Directory (tag filter) |
| `/v1/social/profile` | GET | AccountCard, ProfileView |
| `/v1/social/followers` | GET | ProfileView, Connections |
| `/v1/social/following` | GET | ProfileView, Connections |

Production base: `https://fastdata.up.railway.app`
Local base: `http://localhost:3001`

## Wallet Stub Strategy

`WalletProvider.tsx` checks `window.__E2E_ACCOUNT_ID` at init time. When set:
- Skips real `NearConnector` initialization
- Creates a read-only `Near({ network: "mainnet" })` instance (for NearProvider)
- Sets `accountId`, `isConnected = true`, `isInitializing = false`

Tests inject it via:
```ts
await page.addInitScript((id) => {
  window.__E2E_ACCOUNT_ID = id;
}, "e2e-test.near");
```

## Decision Tree: Choosing Test Category

**Creating blockchain state?** → Phase 5 (near-sandbox)
**Testing current/changing data?** → Read-only with mocking (Phase 2)
**Testing historical/stable data?** → Read-only with real API (not implemented)
**Testing UI flow without signing?** → Integration with mocking (Phase 3)
**Testing component logic in isolation?** → Unit tests (bun:test, not Playwright)
