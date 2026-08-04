<!-- refreshed: 2026-08-04 -->
# Architecture

**Analysis Date:** 2026-08-04

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        Expo Router App (client)                      │
│  `app/_layout.tsx` → auth gate → `app/app`, `app/auth`,`app/onboarding`│
├──────────────────────┬──────────────────────┬────────────────────────┤
│   Screens (routes)   │  Feature Components   │   Context Providers    │
│   `app/**/*.tsx`      │  `components/**`      │   `context/*.tsx`      │
└──────────┬────────────┴──────────┬────────────┴───────────┬───────────┘
           │                       │                          │
           ▼                       ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Shared client logic (`lib/**`, `config/**`, `zod/**`)    │
│  pure functions: nutrition math, unit conversion, food/nutrient       │
│  extraction, image processing, MMKV storage wrapper, zod schemas      │
└──────────────────────────────┬────────────────────────────────────────┘
                                │  convex/react hooks (useQuery/useMutation/
                                │  useAction) via generated `api` object
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Convex Backend (`convex/**`)                    │
│  queries / mutations / actions, grouped by domain folder              │
│  `meals/`, `mealItems/`, `foods/`, `profiles/`, `home/`, `nutrition/`,│
│  `storage/`, `users/`, `auth.ts`, `http.ts`                           │
└───────┬───────────────────────┬───────────────────────┬───────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐   ┌─────────────────────┐   ┌───────────────────────┐
│ Convex table   │   │ External AI/food     │   │ Convex components      │
│ storage        │   │ providers            │   │ (installed apps)        │
│ `convex/schema │   │ Google Gemini / grok  │   │ `@convex-dev/auth`,     │
│ .ts`,          │   │ via `ai` SDK          │   │ `@convex-dev/migrations`│
│ `convex/tables`│   │ (`convex/ai.ts`,      │   │ `@convex-dev/rate-      │
│                │   │ `convex/meals/        │   │ limiter`                │
│                │   │ analyze/*`), USDA FDC │   │ `convex/convex.config.ts`│
│                │   │ + Open Food Facts     │   │                          │
└───────────────┘   └─────────────────────┘   └───────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Root layout | Wires all context providers (Convex auth, safe area, keyboard, bottom sheet, toast, portal) around the whole app | `components/RootLayoutProvider.tsx` |
| Root navigator | Decides which top-level Stack group (`app`, `auth`, `onboarding`) is visible based on auth state | `app/_layout.tsx` |
| Protected app layout | Redirects to `/auth` or `/onboarding` depending on auth + profile completion, otherwise renders the authenticated stack | `app/app/_layout.tsx` |
| Tabs layout | Bottom tab navigation for Home / Add / Settings | `app/app/(tabs)/_layout.tsx` |
| AppContext | Local (MMKV-persisted) app data such as onboarding progress / UI preferences, validated with Zod | `context/AppContext.tsx`, `zod/schemas/AppDataSchema.ts` |
| AuthContext | Thin wrapper exposing Convex Auth's `isAuthenticated`, `signIn`, `signOut` | `context/AuthContext.tsx` |
| SubscriptionContext | RevenueCat subscription/paywall state | `context/SubscriptionContext.tsx` |
| OnboardingContext | Multi-step onboarding wizard state | `context/OnboardingContext.tsx` |
| Convex schema | Single source of truth for all tables (`foods`, `meals`, `mealItems`, `profiles`, plus Convex Auth tables) | `convex/schema.ts`, `convex/tables/*.ts` |
| Meal analysis pipeline | Multi-step AI pipeline that turns a photo/description/barcode into a structured meal with matched foods | `convex/meals/analyze/*.ts` |
| Foods domain | CRUD + lookup + FDC/OFF ingestion for the shared `foods` table (nutrition reference data) | `convex/foods/*.ts` |
| Profiles domain | User profile, onboarding completion, macro/calorie targets, subscription sync | `convex/profiles/*.ts`, `convex/nutrition/computeNutritionTargets.ts` |
| Rate limiting | Shared rate limiter instance guarding AI-powered actions | `convex/rateLimit.ts` (uses `@convex-dev/rate-limiter`) |
| Auth | Convex Auth config (OTP email + Apple sign-in) | `convex/auth.ts`, `convex/auth.config.ts`, `convex/ResendOTP.ts` |

## Pattern Overview

**Overall:** Client-server "BaaS" architecture. The mobile app (Expo Router + React Native) is a thin, mostly-presentational client; almost all business logic, data access, validation, and AI orchestration lives in Convex serverless functions (`convex/**`). The client talks to Convex exclusively through the generated `api`/`internal` objects and Convex React hooks (`useQuery`, `useMutation`, `useAction`) — there is no separate REST/GraphQL layer.

**Key Characteristics:**
- File-based routing via `expo-router`; every screen route is a thin wrapper that fetches data with Convex hooks and renders a `components/**` feature component.
- Convex functions are organized by domain folder (`meals`, `mealItems`, `foods`, `profiles`, `home`, `nutrition`, `storage`, `users`, `utils`, `testing`), each file exporting one `query`/`mutation`/`action` as `default`.
- The AI meal-analysis pipeline (`convex/meals/analyze/`) is a distinct sub-domain implementing a multi-stage pipeline (detect → search candidates → select → translate/health-score → persist).
- Reference nutrition data (`foods` table) is shared and deduplicated across users; it's populated from USDA FoodData Central (FDC) and Open Food Facts (OFF), plus vector-embedding search for candidate matching.
- Client-only pure logic (unit conversions, macro/nutrient math, image processing, storage) is isolated in `lib/**`, independent of React and Convex, and imported by both `components/**` and (for nutrient math) `convex/**` via the `@/lib/...` path alias.
- Global client state uses React Context (`context/**`) backed by MMKV for local persistence (`lib/storage/mmkv.ts`) and Convex/React Query-style hooks for server state — no separate global state library (no Redux/Zustand).

## Layers

**Routing / Screens layer:**
- Purpose: Map URLs (file paths) to screens, read route params, fetch/subscribe to Convex data, delegate rendering
- Location: `app/`
- Contains: Expo Router route files and layout files (`_layout.tsx`), grouped by feature via parenthesized route groups (e.g. `(tabs)`, `(meal)`, `(add)`)
- Depends on: `components/**`, `context/**`, `convex/_generated/api`
- Used by: Expo Router (framework-driven, not directly imported elsewhere)

**Feature components layer:**
- Purpose: Presentational + interactive UI, broken down by feature domain
- Location: `components/`
- Contains: Feature folders (`meal/`, `mealItem/`, `home/`, `onboarding/`, `camera/`, `settings/`, `paywall/`, `weight/`, `nutrients/`, `tabs/`, `auth/`) plus a generic `ui/` design-system folder and `icons/`
- Depends on: `lib/**`, `config/**`, `context/**`, `convex/_generated/api` (for hooks), `components/ui/**`
- Used by: `app/**` route files, and other components

**Shared client logic layer (`lib/`):**
- Purpose: Pure, framework-agnostic domain logic reusable across UI and (partially) backend
- Location: `lib/`
- Contains: `nutrition/` (BMR, calorie/macro targets, day totals), `food/` (macro/micro/nutrient extraction from a `foods` doc), `fdc/` and `off/` (external data source field mapping), `units/` (conversions), `image/` (crop/process), `hooks/` (React hooks e.g. `useProfileStatus`), `storage/mmkv.ts`, `utils/` (misc helpers, error logging, retry/tryCatch)
- Depends on: Nothing app-specific (no React Native imports except `lib/hooks/*` and `lib/storage/mmkv.ts`)
- Used by: `components/**`, `context/**`, `app/**`, and select `convex/**` files (nutrition/food math is duplicated-in-use, not duplicated-in-code, via `@/lib/...` imports)

**Backend layer (`convex/`):**
- Purpose: All data persistence, authorization, and server-side business logic including AI orchestration
- Location: `convex/`
- Contains: `schema.ts` + `tables/` (data model), domain folders each with one function per file, `meals/analyze/` (AI pipeline), `auth.ts`/`auth.config.ts`/`http.ts` (auth), `rateLimit.ts`, `migrations.ts`, `convex.config.ts` (installed Convex components), `_generated/` (framework-generated API/types, not hand-edited)
- Depends on: `lib/**` (nutrient math), external SDKs (`ai`, `@ai-sdk/google`, `@openrouter/ai-sdk-provider`, `@convex-dev/auth`, `@convex-dev/rate-limiter`, `@convex-dev/migrations`)
- Used by: Client via generated `api`/`internal` objects (`convex/_generated/api.ts`)

**Config/schema layer:**
- Purpose: Central tunables and cross-cutting validation schemas
- Location: `config/` (app-wide constants: `appConfig.ts`, `nutrientsConfig.ts`, `profilesConfig.ts`, `revenueCatConfig.ts`, `testingConfig.ts`), `zod/schemas/` (client-local persisted-data schema)
- Depends on: Nothing
- Used by: `components/**`, `context/**`, `lib/**`

## Data Flow

### Primary Request Path (query/mutation)

1. Screen component calls `useQuery(api.<domain>.<file>.default, args)` or `useMutation(...)` (e.g. `app/app/(mealItem)/mealItem.tsx:8-12`)
2. Convex client subscribes/executes against the deployed function in `convex/<domain>/<file>.ts`
3. Function handler authenticates via `getAuthUserId(ctx)` (from `@convex-dev/auth/server`), reads/writes `ctx.db`, and returns typed data (e.g. `convex/meals/createMeal.ts`)
4. Convex pushes reactive updates back to subscribed `useQuery` hooks automatically; screen re-renders

### Meal Photo Analysis Pipeline (action)

1. Client uploads a photo to Convex storage, then calls the `analyzeMealPhoto` action (`convex/meals/analyze/analyzeMealPhoto.ts`)
2. Action authenticates, checks Pro subscription via `api.profiles.getProfile`, and rate-limits via `rateLimiter.limit(ctx, "aiFeatures", ...)` (`convex/rateLimit.ts`)
3. Creates a `meals` row with `status: "processing"` (`api.meals.createMeal`)
4. Calls `detectMealItems` (`convex/meals/analyze/detectMealItems.ts`) — sends the image URL to an LLM (`analyzeMealConfig.imageProcessingModel`, currently `openrouter.chat("x-ai/grok-4.1-fast")`) via the `ai` SDK's `generateObject`, constrained by a Zod schema, using prompts from `convex/meals/analyze/analyzeMealConfig.ts`
5. Delegates to `processDetectedItems` (`convex/meals/analyze/processDetectedItems.ts`), which:
   - Searches candidate reference foods via `searchFdcCandidates` (vector/embedding search against the `foods` table)
   - Picks one candidate per detected item via `selectCandidates` (another LLM call, image-grounded)
   - Looks up the chosen food (`api.foods.getFoodByIdentity`), lazily translating (`translateFood`) and computing a health score (`calculateHealthScore`) if missing, persisting via `internal.foods.*` mutations
   - Replaces the meal's items (`api.meals.replaceMealItems`) and marks the meal `status: "done"` with a generated name (`api.meals.updateMeal`)
6. On any error at any stage, the meal is marked `status: "error"` and the error is re-thrown (caught centrally in the action, logged via `lib/utils/logError.ts`)
7. Parallel sibling pipelines exist for barcode (`analyzeMealBarcode.ts`, uses Open Food Facts via `lib/off/*`) and free-text description (`analyzeMealDescription.ts`, `detectMealItemsFromText.ts`) input, and for correcting an existing meal (`correctMeal.ts`, `correctMealItems.ts`)

**State Management:**
- Server state (meals, foods, profile) lives entirely in Convex and is accessed reactively via `useQuery`/`useMutation`/`useAction`; no client-side caching layer beyond Convex's own reactive query cache.
- Local-only UI/app state (onboarding progress, preferences) is held in React Context (`context/AppContext.tsx`) and persisted to on-device MMKV storage (`lib/storage/mmkv.ts`), validated on load with Zod (`zod/schemas/AppDataSchema.ts`).
- Auth state is derived from Convex Auth (`useConvexAuth`, `useAuthActions`) and exposed via `context/AuthContext.tsx`.
- Subscription/paywall state is managed by RevenueCat SDK, wrapped in `context/SubscriptionContext.tsx`.

## Key Abstractions

**Convex function-per-file:**
- Purpose: Every query/mutation/action is its own file exporting a single `default` (query|mutation|action)
- Examples: `convex/meals/createMeal.ts`, `convex/profiles/getProfile.ts`, `convex/mealItems/updateMealItem.ts`
- Pattern: `export default query({ args, handler })` / `mutation({...})` / `action({...})`; referenced from the client and other functions as `api.<folder>.<file>.default` or `internal.<folder>.<file>.default`

**Table field definitions (`convex/tables/*.ts`):**
- Purpose: Decouple Convex `v.*` validator field sets from `defineTable` calls, and let the same field group (e.g. `macrosFields`, `microsFields`, `nutrientsFields` from `convex/tables/mealItems.ts`) be reused across `meals` and `mealItems` tables
- Examples: `convex/tables/foods.ts`, `convex/tables/meals.ts`, `convex/tables/mealItems.ts`, `convex/tables/profiles.ts`
- Pattern: export a `xFields` object plus a `defineTable(xFields).index(...)` table; `convex/schema.ts` composes all tables

**AI pipeline steps as pure async functions:**
- Purpose: Each stage of meal analysis (detect, search, select, translate, score, name, correct) is an independently testable async function taking explicit params and returning typed data, orchestrated by a top-level action
- Examples: `convex/meals/analyze/detectMealItems.ts`, `convex/meals/analyze/searchFdcCandidates.ts`, `convex/meals/analyze/selectCandidates.ts`
- Pattern: `generateObject({ model, schema, system, messages })` from the `ai` SDK, model/prompt centrally configured in `convex/meals/analyze/analyzeMealConfig.ts`

**Screen = data-fetch shell + feature component:**
- Purpose: Keep route files thin; all real UI logic lives in `components/**`
- Examples: `app/app/(mealItem)/mealItem.tsx` (fetches via `useQuery`, renders `<MealItem />`), `app/app/(meal)/meal.tsx`
- Pattern: route file owns `useLocalSearchParams`, `useQuery`/`useMutation` calls and loading-state derivation; passes results as props to a `components/<domain>/<Domain>.tsx` component

**Context + MMKV-backed local state:**
- Purpose: Persist non-server app state across launches without a backend round-trip
- Examples: `context/AppContext.tsx` + `lib/storage/mmkv.ts` + `zod/schemas/AppDataSchema.ts`
- Pattern: Zod schema defines/validates shape and defaults; Context provider hydrates from MMKV on mount, syncs back on every change via `useEffect`

## Entry Points

**App bootstrap:**
- Location: `index.ts` (package.json `"main"`) → `app/_layout.tsx`
- Triggers: App launch (Expo Router root)
- Responsibilities: Wrap app in `RootLayoutProvider` (all context/providers), then render `RootNavigator`, which gates `app` / `auth` / `onboarding` stacks based on `useAuthContext().isAuthenticated`

**Protected app shell:**
- Location: `app/app/_layout.tsx`
- Triggers: Once authenticated
- Responsibilities: Redirect to `/onboarding` if profile incomplete (`useProfileStatus` hook), otherwise render the authenticated `Stack` (tabs, meal detail, settings, add-meal flows)

**Convex HTTP entry:**
- Location: `convex/http.ts`
- Triggers: Convex Auth HTTP callbacks (OTP/OAuth flows)
- Responsibilities: Registers `auth.addHttpRoutes(http)` from `convex/auth.ts`

**Convex function entry points:**
- Location: every file under `convex/<domain>/*.ts` (excluding `_generated`)
- Triggers: Client calls via `api.*`/`internal.*`, or scheduled/internal calls from other Convex functions
- Responsibilities: One `query`/`mutation`/`action` per file, described in Component Responsibilities above

**Standalone data-import scripts:**
- Location: `scripts/importFdcData.ts`, `scripts/syncFoodsData.ts`
- Triggers: Manually via `npm run script:importFdc` / `script:syncFoods` (ts-node, not part of the running app)
- Responsibilities: Bulk import/sync of USDA FDC reference nutrition data into the Convex `foods` table (via `convex/foods/ingestFoods.ts` / `upsertFoods.ts`)

## Architectural Constraints

- **Threading:** Standard React Native JS thread for UI; Convex functions run as isolated serverless invocations (queries are read-only/transactional, mutations are transactional, actions may call external network APIs and are not transactional). No custom worker threads in the app.
- **Global state:** MMKV instance is a module-level singleton (`lib/storage/mmkv.ts`); the `openrouter` client is a module-level singleton (`convex/ai.ts`); the `rateLimiter` instance is module-level (`convex/rateLimit.ts`). Convex's `ConvexReactClient` is instantiated once at module scope in `components/RootLayoutProvider.tsx`.
- **Convex action/mutation boundary:** Actions (e.g. `analyzeMealPhoto`) cannot directly touch `ctx.db`; they must call queries/mutations via `ctx.runQuery`/`ctx.runMutation` using the generated `api`/`internal` objects — this is enforced by the Convex runtime, not just convention.
- **`_generated/` is framework output:** `convex/_generated/*` is regenerated by `convex dev`/`convex deploy`; never hand-edit it.
- **Pro-gating:** AI-powered meal analysis (`analyzeMealPhoto`, likely also barcode/description variants) requires `profile.isPro`, checked server-side inside the action before doing any paid LLM work.

## Anti-Patterns

### Mixed-responsibility route + inline data derivation

**What happens:** Some route files compute derived loading/error state inline (e.g. `isLoading = mealItem === undefined`) rather than centralizing this in a hook.
**Why it's wrong:** Duplicated `undefined`-checking logic across many screens (`app/app/(mealItem)/mealItem.tsx`, `app/app/(meal)/meal.tsx`, etc.) increases the chance of inconsistent loading-state handling if the convention isn't followed everywhere.
**Do this instead:** Where a pattern repeats across ≥3 screens, extract a small shared hook in `lib/hooks/` (the codebase already does this for profile status via `lib/hooks/useProfileStatus.ts`).

### Deeply nested provider tree

**What happens:** `components/RootLayoutProvider.tsx` nests 10 providers (Gesture handler → Convex Auth → Auth Context → SafeArea → Keyboard → BottomSheetModal → AppContext → Subscription → Onboarding → SplashScreenController).
**Why it's wrong:** Deep nesting makes provider ordering dependencies implicit; a new provider inserted in the wrong place can silently break context availability for children.
**Do this instead:** Keep provider order changes deliberate and documented; if the tree grows further, consider composing via a small `composeProviders` helper to make ordering explicit and reduce visual nesting.

## Error Handling

**Strategy:** Try/catch per Convex function handler, logging via a shared helper and re-throwing so Convex surfaces the error to the client; user-facing domain errors (e.g. "Unauthorized", "Pro subscription required") are thrown as plain `Error` with descriptive messages.

**Patterns:**
- Every Convex handler wraps its body in `try { ... } catch (error) { logError("<fnName> error", error); throw error; }` (see `convex/meals/createMeal.ts`, `convex/meals/analyze/detectMealItems.ts`)
- Long-running actions (meal analysis) additionally catch failures to transition the associated `meals` row to `status: "error"` before re-throwing, so the client can render an error state reactively (`convex/meals/analyze/analyzeMealPhoto.ts:52-65`)
- `lib/utils/tryCatch.ts` provides a generic result-tuple wrapper for call sites that want to avoid try/catch boilerplate on the client

## Cross-Cutting Concerns

**Logging:** `lib/utils/logError.ts` is the single logging entry point, used uniformly across `convex/**` handlers.
**Validation:** Convex `v.*` validators define all function args and table schemas (`convex/tables/*.ts`); Zod (`zod/`, and `z` schemas inline in `convex/meals/analyze/*.ts`) validates AI model outputs and locally-persisted client data.
**Authentication:** `@convex-dev/auth` (Convex Auth) with email OTP (`convex/ResendOTP.ts`) and Apple Sign-In (`expo-apple-authentication`); every Convex function that requires a user calls `getAuthUserId(ctx)` and throws `"Unauthorized"` if null.
**Authorization:** Pro/paywall gating checked server-side per-action (`profile.isPro`) plus a shared rate limiter (`convex/rateLimit.ts`, backed by `@convex-dev/rate-limiter`) protecting AI-cost-incurring actions.

---

*Architecture analysis: 2026-08-04*
