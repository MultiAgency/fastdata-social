# Playwright E2E Test Suite

End-to-end tests for fastdata-social using Playwright.

## Setup

```sh
bun install                        # install @playwright/test
npx playwright install chromium    # install browser
```

## Running Tests

```sh
bun run test:e2e          # headless
bun run test:e2e:headed   # with browser window
bun run test:e2e:ui       # interactive UI mode
bun run test:e2e:debug    # step-through debugger
bun run test:e2e:report   # open last HTML report

# Run a specific test file
npx playwright test -c playwright-tests/playwright.config.ts playwright-tests/tests/smoke/routes-render.spec.ts
```

## Test Structure

```
playwright-tests/
├── playwright.config.ts
├── util/
│   ├── webServer.ts                    # Server start config
│   ├── selectors.ts                    # Stable locators + test wallet injection
│   └── mocks/
│       ├── fastdata-api.ts             # Route interceptor for FastData API
│       └── fixtures.ts                 # Deterministic response payloads
├── tests/
│   ├── smoke/
│   │   └── routes-render.spec.ts       # [Smoke] Routes render + survive refresh
│   ├── read-only-mocked/
│   │   ├── social-empty.spec.ts        # [Read-only] Empty followers/following
│   │   ├── social-followers.spec.ts    # [Read-only] Fixture follower data
│   │   ├── directory.spec.ts            # [Read-only] Directory with mocked accounts
│   │   └── profile-view.spec.ts         # [Read-only] Profile view with mocked data
│   └── integration-mocked/
│       └── social-follow.spec.ts       # [Integration] Follow button behavior
└── README.md
```

## Test Categories

### Smoke Tests (`tests/smoke/`)
Visit each route, assert the app shell renders. No mocking, no wallet.

### Read-Only with API Mocking (`tests/read-only-mocked/`)
Intercept FastData API calls (`/v1/social/*`, `/v1/kv/*`, `/health`) and return fixture data. Tests UI rendering with controlled, deterministic payloads.

### Integration with Mocking (`tests/integration-mocked/`)
Inject a test wallet via `window.__E2E_ACCOUNT_ID`, mock API responses, and exercise UI flows (follow, validation). No real transaction signing.

## Configuration

- **Base URL**: `http://localhost:3000`
- **Server**: `bun run build && bun run start` (production-like)
- **Browser**: Chromium only (expand later)
- **Reporter**: HTML (output to `playwright-tests/playwright-report`)

## Wallet Stub

Tests that need an authenticated state use `injectTestWallet(page)` from `util/selectors.ts`. This sets `window.__E2E_ACCOUNT_ID` before page load, which WalletProvider reads to skip real wallet initialization.

No real wallet signing is automated. Transaction-dependent flows will show error alerts, which the tests assert.

## Debugging Tips

1. `bun run test:e2e:headed` — watch the browser
2. `bun run test:e2e:debug` — Playwright Inspector with step-through
3. `await page.screenshot({ path: 'debug.png' })` — capture state
4. Check `playwright-tests/test-results/` for failure artifacts
