# E2E Tests (Playwright)

## Setup

```sh
bun add -D @playwright/test
npx playwright install chromium
```

## Run

```sh
bun run test:e2e          # headless
bun run test:e2e:headed   # with browser window
bun run test:e2e:ui       # interactive UI mode
bun run test:e2e:debug    # step-through debugger
bun run test:e2e:report   # open last HTML report
```

## Notes

- Tests run against a production build (`bun run build && bun run start`).
- Wallet signing is not automated; protected routes assert the app shell renders in disconnected state.
