# Quality: Code Review, Testing, Security

## Code Review Conventions

### KV Keys
- Follow the existing schema in `docs/skills/architecture.md`
- Keys use `/` separators: `profile/name`, `graph/follow/{target}`
- `null` value = deletion. Empty string `""` = existence marker
- Index keys always have `{key, value}` JSON structure
- Single item = object, multiple items = array (check `builders.ts` for the pattern)

### Builders
- First param is `signerId` — used by most builders to embed `accountId` in notification index values. Prefixed with `_` only in builders that don't generate notifications (`buildProfileArgs`, `buildUnfollowArgs`, `buildUnlikeArgs`)
- All builders validate required inputs with `requireNonEmpty()` — throws on empty/whitespace strings
- Return `Record<string, string>` for most builders. Deletion builders (`buildUnfollowArgs`, `buildUnlikeArgs`) return `Record<string, string | null>`
- Use `JSON.stringify()` for complex values
- Omit keys for empty/undefined fields (don't set them to empty string unless that's the convention)

### Linting & Formatting
- **Biome** (`biome.json`) — linter + formatter. Schema 2.3.13
- `bun run lint` — check, `bun run lint:fix` — auto-fix, `bun run format` — format
- Rules: recommended + `noUnusedVariables: warn`, `noUnusedImports: warn`, `noConsole: warn`
- Double quotes, trailing commas, 2-space indent, 100 char line width

### React Patterns
- `useClient()` for SDK reads and write builders
- `useWallet()` for account state and `near` instance (transaction signing)
- Routes extract `accountId` from URL params or `useWallet()` — no `RequireWallet` gate
- Optimistic updates with delayed refresh (see `src/Profile/ProfileView.tsx` — updates local state, then re-fetches after 3 seconds)

### TypeScript
- Strict mode
- All SDK types in `src/client/types.ts`
- App-level types in `src/types/index.ts`

## Testing

### Running Tests

```bash
bun test src/client/__tests__/   # SDK unit tests (Bun native runner, must specify path)
bun run test:e2e        # Playwright E2E tests
```

### Test Location

Unit tests live in `src/client/__tests__/`. `builders.test.ts` covers all builder functions, `FastData.test.ts` covers all SDK read methods, `utils.test.ts` covers extractMentions/extractHashtags. E2E tests live in `playwright-tests/tests/`.

### Test Pattern

```ts
import { describe, expect, test } from "bun:test";
import { buildFollowArgs } from "../builders";

describe("buildFollowArgs", () => {
  test("follow sets key to empty string", () => {
    const args = buildFollowArgs("alice.near", "bob.near");
    expect(args["graph/follow/bob.near"]).toBe("");
  });
});
```

Key assertions:
- Check that expected keys exist
- Parse JSON values and check structure: `JSON.parse(args["index/post"])`
- Verify null for deletion: `expect(args[key]).toBeNull()`
- Verify array vs object for single vs multiple items

### Adding Tests

Create a new file in `src/client/__tests__/` or add to `builders.test.ts`. Use `bun:test` imports.

## Security Concerns

- **Account validation**: Always validate NEAR account IDs with `isValidNearAccount()` from `src/utils/validation.ts` before using them in keys or paths
- **JSON injection**: Builder args are serialized with `JSON.stringify()` — don't concatenate user input into JSON strings manually
- **FastFS paths**: Validate no `..` segments in file paths, max 1024 characters
- **Wallet disconnect**: Handle mid-transaction disconnects gracefully — check `isConnected` before signing
