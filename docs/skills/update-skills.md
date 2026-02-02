# Update Skills

Reconcile all skill docs under `docs/skills/` with the actual codebase. Each skill doc describes a slice of the project — this process ensures they stay accurate.

## Process

For each skill file listed below:

1. **Read the skill doc**
2. **Read the source files it describes** (listed in the mapping below)
3. **Diff** — identify statements in the doc that don't match the code: wrong signatures, missing exports, deleted functions, outdated patterns, missing new files or features
4. **Update the doc** — fix inaccuracies, add missing items, remove references to deleted code
5. **Don't add new sections** — only correct what's already documented. If a major new feature exists with no coverage, note it at the end as a suggestion but don't write a full section unprompted.

## Skill → Source Mapping

| Skill doc | Source files to check |
|---|---|
| `client-sdk.md` | `src/client/FastData.ts`, `src/client/Social.ts`, `src/client/builders.ts`, `src/client/utils.ts`, `src/client/types.ts`, `src/client/constants.ts`, `src/client/index.ts`, `src/hooks/useClient.ts` |
| `architecture.md` | `src/router.tsx`, `src/App.tsx`, `src/main.tsx`, `src/hooks/constants.ts`, `src/hooks/useClient.ts`, `src/providers/WalletProvider.tsx`, `src/Header/Header.tsx`, `src/Profile/ProfilePage.tsx`, `src/Profile/ProfileView.tsx`, `src/Profile/ProfileEditor.tsx`, directory listing of `src/` |
| `quality.md` | `src/client/__tests__/`, `src/client/builders.ts`, `biome.json`, `package.json` (scripts) |
| `add-feature.md` | `src/client/builders.ts`, `src/client/Social.ts`, `src/client/types.ts`, `src/router.tsx`, `src/Header/Header.tsx` |
| `operations.md` | `src/client/FastData.ts`, `src/hooks/useClient.ts`, `src/hooks/constants.ts`, `package.json` (scripts) |
| `design-system.md` | `src/index.css` (Tailwind v4 inline theme), `src/components/ui/`, `src/Header/Header.tsx`, `package.json` (dependencies) |
| `fastdata.md` | `src/client/FastData.ts`, `src/client/constants.ts`, `src/hooks/fastfs.ts` |
| `near-kit.md` | `src/providers/WalletProvider.tsx`, `package.json` (near-kit deps) |
| `update-skills.md` | All entries in this mapping table — verify listed source files still exist, check for new skill docs not in the table, check for new source directories not mapped to any skill |

## Common things that drift

- Function signatures (params changed from positional to options object, params renamed)
- Exports added or removed from `src/client/index.ts`
- Builder `signerId` usage (which builders use it vs prefix with `_`)
- `useClient()` implementation pattern (singleton vs context)
- `useNear()` return shape (returns `near` directly, not `{ near }`)
- Navigation location (nav links in `src/Header/Header.tsx`, not App.tsx)
- New files added to `src/client/` or new page directories not reflected in architecture
- package.json scripts added or removed
- Test file coverage descriptions

## Output

After updating, list the changes made per file as a summary so the user can review.
