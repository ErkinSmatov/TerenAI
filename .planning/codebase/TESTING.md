# Testing Patterns

**Analysis Date:** 2026-08-04

## Test Framework

**Runner:**
- None configured. No Jest, Vitest, or other test runner is present in `package.json` `devDependencies`, and no `jest.config.*` / `vitest.config.*` file exists anywhere in the repository.
- No `test` script exists in `package.json` (`scripts` only defines `dev:client`, `dev:server`, `prebuild`, `android`, `ios`, `env:pull`, `eas:dev`, `eas:prod`, `lint`, `tsc`, and two `script:*` data-import scripts).

**Assertion Library:**
- Not applicable — none installed.

**Run Commands:**
```bash
npm run lint    # ESLint (eslint.config.mjs) — closest thing to an automated quality gate
npm run tsc     # TypeScript type-check (tsc, no emit)
```
There is no `npm test` / `npm run test` command. Type-checking (`tsc`) and linting (`eslint`) are the only automated verification steps in this codebase today.

## Test File Organization

**Location:**
- Not applicable — no `*.test.*` or `*.spec.*` files exist anywhere under the project (excluding `node_modules`).

**Naming:**
- No convention established.

**Structure:**
```
Not applicable — no test directory or co-located test files exist.
```

## Manual/Ad Hoc Verification Aids

The codebase substitutes for automated tests with a few manual-testing helpers, notably in the Convex backend:

**`convex/testing/getOrCreateTestUser.ts`:**
- A `mutation` gated by a shared secret comparison against `config/testingConfig.ts` (`testingConfig.testEmail` / `testingConfig.testPassword`)
- Looks up or creates a `users` row plus a default `profiles` row (using `profilesConfig.defaultValues` from `config/profilesConfig.ts`)
- Intended for use from Convex dashboard/dev tooling to seed a known test account, not part of an automated test suite

**Manual QA notes:**
- `TODO.md` at repo root contains a running list of manual QA items and known issues — treat as an informal test checklist, not automation

## Mocking

Not applicable — no mocking framework (e.g. `jest.mock`, `vi.mock`, `msw`) is installed or used.

## Fixtures and Factories

Not applicable — no fixture/factory files or directories exist. The closest analog is the hardcoded default profile in `config/profilesConfig.ts` used by `convex/testing/getOrCreateTestUser.ts` to seed a consistent test account in the live Convex dev deployment.

## Coverage

**Requirements:** None enforced — no coverage tool configured.

**View Coverage:**
```bash
Not applicable.
```

## Test Types

**Unit Tests:** Not present.

**Integration Tests:** Not present.

**E2E Tests:** Not present. No Detox, Maestro, or Playwright configuration found.

## Common Patterns

**Async Testing:** Not applicable.

**Error Testing:** Not applicable.

## Recommendations for Introducing Tests

If test coverage is added to this project, align with existing conventions observed in the codebase:

- **Convex functions** (`convex/**/*.ts`) are pure `handler(ctx, args)` functions exported as default — well suited to `convex-test` (the official Convex testing library) for unit-testing queries/mutations/actions against a simulated backend without hitting a real deployment.
- **Utility functions** in `lib/utils/` (e.g. `tryCatch.ts`, `getAge.ts`, `macrosToKcal.ts`, `lib/utils/nutrition/*`) are small, pure, and side-effect-free — good first candidates for Vitest/Jest unit tests since they require no React Native or Convex runtime mocking.
- **React components** use `react-native-reanimated`, `expo-*` native modules, and Convex hooks (`useQuery`/`useMutation`) throughout, which would require `@testing-library/react-native` plus jest-expo preset and mocks for native modules — a heavier lift than backend/util testing and likely lower priority to introduce first.
- Any new test setup should add a `test` script to `package.json` and a corresponding config file (`jest.config.js` or `vitest.config.ts`) at the repo root; none currently exist to extend.

---

*Testing analysis: 2026-08-04*
