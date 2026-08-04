# Coding Conventions

**Analysis Date:** 2026-08-04

## Naming Patterns

**Files:**
- React components: `PascalCase.tsx` matching the default export name, e.g. `components/ui/Button.tsx`, `components/meal/MealSummaryCard.tsx`
- Convex functions: `camelCase.ts` named after the exported function, one function per file, default-exported, e.g. `convex/profiles/updateProfile.ts` exports `updateProfile`
- Hooks: `camelCase.ts` prefixed with `use`, e.g. `lib/hooks/useProfileStatus.ts`
- Plain utilities: `camelCase.ts`, one function per file matching the file name, e.g. `lib/utils/logError.ts`, `lib/utils/tryCatch.ts`, `lib/utils/getAge.ts`
- Zod schemas: `PascalCase` + `Schema` suffix, e.g. `zod/schemas/AppDataSchema.ts` exports `AppDataSchema`
- Convex table definitions: `lib/convex/tables/<table>.ts` (plural, lowercase), export both the `defineTable` fields object (`<table>Fields`) and the table (`<table>`), e.g. `convex/tables/profiles.ts` exports `profilesFields` and `profiles`
- Route files under `app/` follow Expo Router conventions: parenthesized group folders (`app/app/(home)/`, `app/app/(meal)/`), file name = route segment

**Functions:**
- `camelCase` for all functions, including Convex handlers and React components' internal helpers
- Convex CRUD functions named by verb + noun: `getProfile`, `updateProfile`, `createMeal`, `getWeekMeals`, `replaceMealItems`
- Boolean-returning/derived hook fields prefixed `is`/`has`: `isProfileLoading`, `hasCompletedOnboarding`, `isAuthenticated`

**Variables:**
- `camelCase` throughout; no Hungarian notation
- Convex document IDs typed via generated `Id<"table">` and named `<entity>Id` (`userId`, `mealId`, `storageId`)
- Refs named with `Ref` suffix (`pressStartRef`, `outTimerRef`, `inputRef`)

**Types:**
- `type` aliases preferred over `interface` — enforced by ESLint rule `@typescript-eslint/consistent-type-definitions: ["error", "type"]` (`eslint.config.mjs`)
- Component prop types named `Props` (local to file), e.g. `components/ui/Button.tsx`, `components/ui/Card.tsx`
- Domain types derived from Convex generated types via `Doc<"table">` / `Id<"table">` from `convex/_generated/dataModel`, not hand-written duplicates
- Union/enum-like values modeled as Zod `v.union(v.literal(...))` in Convex table schemas (see `convex/tables/profiles.ts`)

## Code Style

**Formatting:**
- No dedicated Prettier config file found (no `.prettierrc*`) — formatting is implicitly governed by `eslint-config-expo` and default editor settings
- 2-space indentation, double quotes, semicolons — consistent throughout the codebase (observed, not configured via Prettier)

**Linting:**
- ESLint flat config at `eslint.config.mjs` using `defineConfig()`
- Base: `@eslint/js` recommended + `eslint-config-expo/flat.js` + `eslint-plugin-react-compiler` recommended
- TypeScript: `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked` (full type-aware strict linting)
- Convex-specific: `@convex-dev/eslint-plugin` recommended, plus explicit rule `@convex-dev/import-wrong-runtime: "error"` scoped to `convex/**/*.{ts,tsx,js,jsx}`
- Custom rules enabled:
  - `@typescript-eslint/consistent-type-definitions: ["error", "type"]` — always use `type`, never `interface`
  - `@typescript-eslint/no-deprecated: "error"`
  - `@typescript-eslint/restrict-template-expressions: ["error", { allowNumber: true }]`
- Ignored paths: `convex/_generated/**`, `babel.config.js`, `metro.config.js`
- Run via `npm run lint` (`npx eslint .`)
- Type-checking run separately via `npm run tsc` (`tsc`, no emit config beyond `tsconfig.json`)

**TypeScript config (`tsconfig.json`):**
- Extends `expo/tsconfig.base`
- `strict: true`
- Path alias `@/*` → project root (e.g. `@/lib/utils/logError`, `@/components/ui/Button`, `@/convex/_generated/api`)
- `allowJs`/`checkJs` enabled

## Import Organization

**Order (observed, not enforced by an import-order plugin):**
1. Third-party/framework imports (`react`, `react-native`, `expo-*`, `convex/*`, `@convex-dev/*`)
2. Convex generated/server imports (`../_generated/server`, `../../_generated/api`)
3. Internal aliased imports (`@/lib/...`, `@/components/...`, `@/context/...`, `@/config/...`)
4. Relative sibling imports (`./detectMealItems`, `./Text`)

**Path Aliases:**
- `@/*` maps to project root — used pervasively for `lib/`, `components/`, `context/`, `config/`, `convex/` imports outside the `convex/` directory itself
- Inside `convex/`, functions use relative imports (`../_generated/server`, `../../rateLimit`) rather than the `@/` alias, except when reaching into `@/lib` or `@/config` (e.g. `convex/profiles/updateProfile.ts` imports `@/lib/utils/logError`)

## Error Handling

**Convex functions (queries/mutations/actions):**
- Wrap the entire `handler` body in `try { ... } catch (error) { logError(...); throw error; }` — see `convex/profiles/getProfile.ts`, `convex/profiles/updateProfile.ts`, `convex/meals/analyze/analyzeMealPhoto.ts`
- Authorization check pattern: `const userId = await getAuthUserId(ctx); if (userId === null) throw new Error("Unauthorized");`
- Domain validation via explicit `throw new Error("<message>")` for not-found/invalid-state cases (e.g. `"Profile not found"`, `"Pro subscription required"`, `"Image not found"`)
- Actions that create a record before a long-running operation track the created ID in a `let` variable declared before the `try` block, and on catch attempt a best-effort cleanup/status update wrapped in its own nested `try/catch` (see `analyzeMealPhoto.ts`: sets meal `status: "error"` on failure, logging any secondary failure separately)
- All caught errors are logged via the shared `logError(message, error)` helper (`lib/utils/logError.ts`) before being re-thrown — never swallowed silently

**Client-side (React components/hooks):**
- Use the `tryCatch` result-wrapper utility (`lib/utils/tryCatch.ts`) for awaiting promises without try/catch blocks in UI code: `const { data, error } = await tryCatch(promise)`, returns `{ data: T; error: null }` or `{ data: null; error: E }`
- Example: `app/auth/confirm-email.tsx` — `const { error } = await tryCatch(signIn("resend-otp", { email, code }));` then branches on `if (error)`
- Context hooks throw a descriptive error if used outside their provider: `if (context === undefined) throw new Error("useXContext must be used within an XContextProvider");` (see `context/AuthContext.tsx`)

**Logging:**
- Central helper: `lib/utils/logError.ts` — `logError(message: string, error: unknown)`, logs via `console.error(message, error instanceof Error ? error.message : "Unknown error")`
- Always call with a short static string identifying the operation, e.g. `logError("updateProfile error", error)`, `logError("Failed to mark meal as error", updateError)`
- Prefer `logError` over raw `console.error`/`console.log` in new code; raw console calls exist in ~17 places across the codebase but are not the established pattern

## Comments

- Minimal inline comments; code favors self-descriptive naming over comments
- No JSDoc/TSDoc convention observed on exported functions — types communicate intent instead

## Function Design

**Convex functions:**
- One exported function per file, always `export default`
- Defined via `query({ args, handler })`, `mutation({ args, handler })`, or `action({ args, handler })` from `convex/_generated/server` (or `../_generated/server` relative form)
- `args` use `convex/values` validators (`v.object`, `v.string`, `v.id(...)`, `v.union(v.literal(...))`); partial updates use `partial()` from `convex-helpers/validators` (see `convex/profiles/updateProfile.ts`: `v.object(partial(profilesFields))`)
- Handlers that call other Convex functions do so via `ctx.runQuery(api....)` / `ctx.runMutation(api....)`, referencing the generated `api` object, not direct imports of the handler function

**React components:**
- Functional components only, `export default function ComponentName(props: Props) { ... }`
- Props destructured in the function signature; `style`/other passthrough props spread via `...rest`
- Local `styles` built with `StyleSheet.create({...})` at the bottom of the file, referencing shared helpers `getColor()` (`lib/ui/getColor`) and `getShadow()` (`lib/ui/getShadow`) for theme values rather than hardcoded colors

**Return Values:**
- Convex mutations that don't need to return data explicitly `return null;`
- Queries return `null` (not `undefined`) when no record is found, so client code can safely use `??` fallback chains

## Module Design

**Exports:**
- Default export is the standard for components, hooks, Convex functions, and single-purpose utilities
- Named exports used for context providers/hooks pairs (`AuthContextProvider` + `useAuthContext`) and for grouped table definitions (`profilesFields` + `profiles` + `ProfileData` type in `convex/tables/profiles.ts`)

**Barrel Files:**
- Not used — no `index.ts` re-export barrels observed in `components/`, `lib/`, or `convex/` feature folders; each file is imported directly by path

---

*Convention analysis: 2026-08-04*
