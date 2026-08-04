# Codebase Concerns

**Analysis Date:** 2026-08-04

## Tech Debt

**No automated test suite:**
- Issue: No test runner is configured anywhere in the project. `package.json` has no `test` script and no `jest`/`vitest` devDependency. The only test-adjacent file is `convex/testing/getOrCreateTestUser.ts`, a helper with no actual test that calls it.
- Files: `package.json`, `convex/testing/getOrCreateTestUser.ts`
- Impact: All Convex mutations/queries (money-relevant logic like `replaceMealItems`, `computeNutritionTargets`, `syncSubscriptionStatus`) and UI logic ship unverified. Regressions are only caught manually.
- Fix approach: Add Vitest (or Convex's own test tooling `convex-test`) for `convex/` business logic first (highest ROI: nutrition math, meal totals, rate limiting), then add component/unit tests for `lib/` utilities.

**60+ open TODOs tracked only in a flat markdown file:**
- Issue: `TODO.md` contains ~115 unstructured checklist items spanning bugs, missing features, and polish work, with no priority, owner, or linkage to code.
- Files: `TODO.md`
- Impact: No visibility into which debt items are load-bearing vs. cosmetic; several items describe outright broken/incomplete behavior (see Known Bugs below) mixed in with polish items like animations.
- Fix approach: Triage into issues/backlog with severity labels; treat correctness items (`Fix getMeal`, `Fix getWeekMeals`, `Make Convex functions safe`, `Clean replaceMealItems and scaleNutrientsPer100g`) as immediate priorities.

**Two-step meal creation instead of atomic write:**
- Issue: `TODO.md` explicitly flags "Add meal items when creating meal, instead of doing it in 2 steps." `convex/meals/createMeal.ts` and `convex/meals/replaceMealItems.ts` are separate mutations; a meal can exist with zero items if the second call fails or is slow.
- Files: `convex/meals/createMeal.ts`, `convex/meals/replaceMealItems.ts`
- Impact: Partially-created meals with no items can be visible to the user (empty meal cards) until manually cleaned up.
- Fix approach: Combine into a single mutation, or make the client treat a meal with 0 items as `status: "error"`/hide it until items exist.

**Convex query/mutation argument validation inconsistently applied:**
- Issue: `TODO.md` lists "Make Convex functions safe" and "Fix convex functions" (referencing Convex's guide on argument validation without repetition) as unresolved. `convex/foods/upsertFoods.ts` has an explicit `// TODO: Validate doc` with no validation performed before insert/patch.
- Files: `convex/foods/upsertFoods.ts:37`, all of `convex/**/*.ts`
- Impact: Malformed food documents (e.g., from `ingestFdcFoods` or user-triggered upserts) can be written to the `foods` table without shape validation, later crashing nutrient calculations (`lib/food/getFoodMacros.ts`, `lib/food/getFoodNutrients.ts`) that assume well-formed data.
- Fix approach: Apply `convex-helpers` validators consistently across all mutations; add schema-level `v.object(...)` validators matching `convex/tables/foods.ts`.

**Business logic lives inside `convex/` and ships to bundling scope unnecessarily:**
- Issue: `TODO.md`: "Lib functions inside convex folder so it's not shipped to the client?" Several pure helper functions (nutrient math, food scaling) currently live under `convex/` alongside server functions rather than in `lib/`.
- Files: `convex/` (mixed with `lib/food/`, `lib/utils/nutrition/`)
- Impact: Unclear separation between server-only code and shared utilities; risk of accidentally importing server-only modules (with `process.env` secrets) into client bundles.
- Fix approach: Audit `convex/*.ts` imports from `lib/`, ensure no client code imports `convex/foods/*.ts`-style server functions directly, move pure functions fully into `lib/`.

**Duplicate/leftover asset files not cleaned up:**
- Issue: Working tree contains `assets/images/icon-old.png`, `assets/images/splash-icon-end.png`, and an entire untracked `assets/img/` directory (with a `Web/` subfolder and two loose WhatsApp-exported JPEGs) alongside the actively used `assets/images/`.
- Files: `assets/images/icon-old.png`, `assets/images/splash-icon-end.png`, `assets/img/`
- Impact: Confusing asset directory with two parallel image folders (`assets/images` vs `assets/img`); increases repo size and risk of referencing the wrong/stale icon during rebranding (app was recently renamed CalYo → TerenAI, see `c2c0a59` and `2603063`).
- Fix approach: Remove unused leftover files, consolidate into a single `assets/images/` directory, and add `.gitignore` rule to prevent re-adding `.DS_Store` files already present in `assets/images/.DS_Store` and `assets/img/.DS_Store`.

**Locale is hardcoded to Russian in food-database integration:**
- Issue: `lib/off/fetchProduct.ts` accepts a `locale` parameter but ignores it: `languageCode` is hardcoded to `"ru"` with the real derivation commented out (`// const languageCode = parts[0].toLowerCase();`), and `countryCode` defaults to `"ru"`. The not-found fallback string is hardcoded Russian (`"Неизвестный продукт"`).
- Files: `lib/off/fetchProduct.ts:16-21,75`
- Impact: Despite `expo-localization` being wired up for i18n, the OpenFoodFacts barcode lookup only ever queries Russian-language/region data regardless of device locale, effectively hardcoding the whole app to the Russian market at the data layer.
- Fix approach: Restore locale-derived `languageCode`/`countryCode`, add i18n-aware fallback strings instead of hardcoded Russian literals.

**Duplicate migrations/rate-limit boilerplate not exercised:**
- Issue: `convex/migrations.ts` sets up `@convex-dev/migrations` runner but no migration functions exist in the codebase yet; `convex/rateLimit.ts` only defines a single `aiFeatures` limiter (50/day) used inconsistently — `convex/meals/analyze/*` actions rely on it, but not all AI-adjacent mutations do.
- Files: `convex/migrations.ts`, `convex/rateLimit.ts`
- Impact: Low immediate risk, but signals infra set up ahead of need; if a schema migration is required later, there's no established pattern/example in-repo to follow.
- Fix approach: N/A until first real migration is needed; keep in mind when schema changes land.

## Known Bugs

**Sign-in-with-Apple button shown but native capability disabled:**
- Symptoms: iOS users see a "Продолжить с Apple" (Continue with Apple) button in `components/auth/SignInButtons.tsx` (rendered whenever `Platform.OS === "ios"`), which calls `signIn("apple", ...)`. However `app.config.ts` sets `usesAppleSignIn: false` (with an inline Russian comment `// было true`, i.e. "was true") and comments out the `expo-apple-authentication` Expo plugin (`// "expo-apple-authentication", TODO`), while the `expo-apple-authentication` package remains in `package.json` dependencies.
- Files: `components/auth/SignInButtons.tsx:77-95`, `app.config.ts:37,49`
- Trigger: Tap "Continue with Apple" on an iOS build produced after the config change; the native Apple Sign-In entitlement/capability will not be present.
- Workaround: None currently — this will likely fail at runtime or (worse) get flagged during App Store review, since Apple requires Sign in with Apple to be offered and functional whenever other third-party sign-in (Google) is offered.

**`getWeekMeals` timezone/DST edge cases likely incorrect:**
- Symptoms: `TODO.md` explicitly lists "Fix getWeekMeals" as open. The query computes week boundaries using a client-supplied fixed `timezoneOffsetMinutes` applied uniformly across the whole week (`convex/meals/getWeekMeals.ts:17-27`), which will misbucket meals around DST transitions, and also uses a post-index `.filter()` (`q.neq(...status...)`) rather than encoding status in the index, which is a documented Convex anti-pattern for query performance.
- Files: `convex/meals/getWeekMeals.ts:29-42`
- Trigger: Any week containing a DST transition, or querying near midnight around a timezone boundary.
- Workaround: None — flagged but unresolved in `TODO.md`.

**`getMeal` marked as broken/incomplete by the team:**
- Symptoms: `TODO.md` lists "Fix getMeal" as open. Current implementation (`convex/meals/getMeal.ts`) throws a hard error if any referenced `food` document is missing (`if (!food) throw new Error("Food not found")`), which will surface as a full query failure/crash for the whole meal (including its other, valid items) rather than degrading gracefully.
- Files: `convex/meals/getMeal.ts:26-31`
- Trigger: Any meal referencing a `foods` document that has since been deleted or is otherwise unavailable.
- Workaround: None.

**Fire-and-forget AI correction call swallows async errors:**
- Symptoms: `app/app/(meal)/fix-meal.tsx` calls `void correctMeal({ mealId, correction })` without awaiting, inside a `try { ... } catch` block, then immediately calls `router.dismiss()`. Because the action is not awaited, a rejected promise from `correctMeal` will not be caught by the surrounding `try/catch` (it only catches synchronous throws), so the `console.error` + `alert("Ошибка при исправлении блюда")` path is effectively dead code for the common async-failure case, and the user is always navigated away regardless of success.
- Files: `app/app/(meal)/fix-meal.tsx:44-51`
- Trigger: Any failure inside `correctMeal` (e.g., AI provider error, rate limit race, network failure) after the rate-limit pre-check passes.
- Workaround: None — user sees no error feedback when the correction silently fails server-side.

**`WeightPicker` has an explicit unresolved TODO in validation logic:**
- Symptoms: `components/weight/WeightPicker.tsx:208` contains `// TODO: Check` inline in logic, indicating unverified/unfinished validation or bounds-checking.
- Files: `components/weight/WeightPicker.tsx:208`
- Trigger: Needs direct code review of the surrounding block to confirm exact failure mode; flagged here as a known incomplete area.
- Workaround: Unknown — requires follow-up investigation before onboarding/weight-tracking flows are considered stable.

## Security Considerations

**No centralized error/crash reporting (no Sentry or equivalent):**
- Risk: All error handling funnels through `lib/utils/logError.ts`, which only does `console.error(message, error.message)`. In production React Native builds, `console.*` output is not collected anywhere, meaning production crashes/failures (auth errors, AI action failures, subscription sync failures) are invisible to the team unless a user reports them.
- Files: `lib/utils/logError.ts`, all call sites (`convex/meals/updateMeal.ts`, `convex/meals/getMeal.ts`, `context/SubscriptionContext.tsx`, etc.)
- Current mitigation: None.
- Recommendations: Integrate a crash/error reporting SDK (e.g., Sentry Expo integration) and route `logError` through it in addition to `console.error`.

**RevenueCat subscription status trusts client-invoked sync with no server-side webhook cross-check:**
- Risk: `convex/profiles/syncSubscriptionStatus.ts` is a Convex `action` that the client presumably calls after purchase/restore (`context/SubscriptionContext.tsx`) to pull entitlement state from RevenueCat and write `isPro` via `updateProStatus`. There is no RevenueCat webhook handler visible in `convex/http.ts` (which only wires up `auth.addHttpRoutes`), meaning Pro status is only refreshed when the client proactively calls this action — if the app isn't opened, expirations/cancellations aren't reflected server-side.
- Files: `convex/profiles/syncSubscriptionStatus.ts`, `convex/http.ts`, `context/SubscriptionContext.tsx`
- Current mitigation: Client calls sync on app foreground/after purchase flows (implementation in `SubscriptionContext.tsx`).
- Recommendations: Add a RevenueCat webhook endpoint to `convex/http.ts` so subscription state changes (renewals, cancellations, refunds) are reflected server-side without depending on client activity.

**`deleteUser` mutation is not wrapped in `logError`/try-catch and does unindexed table scans for session/account cleanup:**
- Risk: `convex/users/deleteUser.ts` queries `authSessions` and `authAccounts` using `.filter((q) => q.eq(q.field("userId"), userId))` rather than an index, which is both a performance anti-pattern (full table scan on every account deletion) and, unlike sibling mutations, has no try/catch/logError wrapper, so partial-failure states (e.g., meals deleted but auth records not) are not logged anywhere.
- Files: `convex/users/deleteUser.ts:41-55`
- Current mitigation: Auth checks are present (`getAuthUserId` gate at the top).
- Recommendations: Add indexed lookups for `authSessions`/`authAccounts` by `userId` if available in the Convex Auth component schema, wrap in try/catch + `logError` for observability, and consider wrapping the whole deletion in a way that surfaces partial failures to the caller.

**Ingest endpoint relies on a single static bearer-style token compared with `!==`:**
- Risk: `convex/foods/ingestFoods.ts` authorizes bulk food-database writes via `if (token !== process.env.INGEST_TOKEN) throw new Error("Unauthorized")`. This is a plain string equality check (not constant-time), and the token is a single shared secret with no rotation/expiry mechanism visible in the codebase.
- Files: `convex/foods/ingestFoods.ts:16-18`
- Current mitigation: Token is stored as an env var, not hardcoded.
- Recommendations: Low priority given this is an internal ingest action (not currently a concern-critical path), but consider constant-time comparison and token rotation if this endpoint becomes more broadly used or exposed.

## Performance Bottlenecks

**`getWeekMeals` uses post-index `.filter()` instead of encoding status in the index:**
- Problem: The query fetches meals by `userId` + `_creationTime` range via index, then applies `.filter((q) => q.and(q.neq(...status..., "error"), q.neq(...status..., "deleted")))` — Convex's own guidance recommends avoiding `.filter()` on queries in favor of compound indexes, since `.filter()` still scans every row matched by the index before discarding non-matching ones.
- Files: `convex/meals/getWeekMeals.ts:37-42`
- Cause: `status` is not part of the `byUserId` index used here.
- Improvement path: Add a compound index (e.g., `byUserId_status_creationTime`) or a separate index that excludes soft-deleted/error meals, avoiding the row-by-row filter.

**`replaceMealItems` performs delete-then-reinsert with unbounded `Promise.all` fan-out:**
- Problem: On every meal-item edit, all existing `mealItems` for a meal are deleted and all new ones re-inserted via `Promise.all` (`convex/meals/replaceMealItems.ts:34,97-99`), rather than diffing and patching only changed rows. For meals with many items this multiplies read/write operations unnecessarily on every edit.
- Files: `convex/meals/replaceMealItems.ts`
- Cause: Simplicity of implementation over efficiency; `TODO.md` explicitly calls this out ("Clean replaceMealItems and scaleNutrientsPer100g").
- Improvement path: Diff incoming `foods` array against existing `mealItems` and only insert/update/delete the delta.

**Eager loading strategy called out as unresolved in `TODO.md`:**
- Problem: "Eager loading all data?" and "Local first?" appear as open, unanswered architectural questions in `TODO.md`, suggesting the current data-fetching strategy (via Convex's reactive queries) has not been evaluated for whether it over-fetches on app load.
- Files: `TODO.md` (unlinked to specific implementation), `app/app/**` screens using `useQuery`
- Cause: No caching/local-first layer beyond Convex's built-in reactivity; MMKV (`react-native-mmkv`) is a dependency but its usage for local caching (vs. simple key-value storage) is unclear without deeper investigation.
- Improvement path: Audit which screens call `useQuery` for full datasets (e.g., week of meals, full food list) versus paginated/scoped queries.

## Fragile Areas

**Onboarding flow (`components/onboarding/`) has the largest concentration of unresolved TODOs:**
- Files: `components/onboarding/Onboarding.tsx` (377 lines), `components/onboarding/steps/end/OnboardingCreatingPlan.tsx` (402 lines), `components/onboarding/steps/goal/OnboardingWeightChangeRate.tsx`, `components/weight/WeightPicker.tsx` (293 lines, contains a `TODO: Check`)
- Why fragile: `TODO.md` lists at least 15 distinct unresolved onboarding issues (measurement-unit switching smoothness, back-navigation animation bugs, cropped target-weight display, pre-rendering, section-overview animation, wheel-picker performance). This is one of the largest, most animation-heavy components in the app (`Onboarding.tsx` at 377 lines orchestrating many sub-steps) and is the first thing every new user experiences.
- Safe modification: Test on both iOS and Android physical devices after any change here, particularly around measurement-system (metric/imperial) toggling and back-navigation, since multiple TODOs specifically call out animation/state bugs when going backward through steps.
- Test coverage: None (no test suite exists at all — see Test Coverage Gaps below).

**Paywall/subscription integration (`components/paywall/Paywall.tsx`, `context/SubscriptionContext.tsx`):**
- Files: `components/paywall/Paywall.tsx` (370 lines), `context/SubscriptionContext.tsx`
- Why fragile: Directly touches revenue — RevenueCat SDK integration, restore-purchases flow (`context/SubscriptionContext.tsx:130` catches errors but the broader effect on UI state after a failed restore is not obviously handled), and server-side sync (`syncSubscriptionStatus`) that has no webhook backstop (see Security Considerations above).
- Safe modification: Any change to purchase/restore flows should be manually verified against both Apple and Google sandbox purchases, since there is no automated test coverage of entitlement logic (`isPro` derivation in `convex/profiles/syncSubscriptionStatus.ts:51-63`).
- Test coverage: None.

**Nutrient calculation pipeline (`config/nutrientsConfig.ts`, `lib/food/*`, `lib/fdc/fdcExtractNutrients.ts`):**
- Files: `config/nutrientsConfig.ts` (417 lines, largest file in the codebase), `lib/fdc/fdcExtractNutrients.ts` (279 lines), `lib/food/getFoodMacros.ts`, `lib/food/getFoodNutrients.ts`, `lib/food/getFoodMicros.ts`
- Why fragile: Core business logic (turning raw FDC/OpenFoodFacts data into per-100g macros/micros/nutrients, then scaling by grams) is concentrated in a few large, untested files with no schema validation on the input `foods` documents (see `upsertFoods.ts` TODO above). A malformed or missing nutrient field can silently propagate to totals shown to users (calorie/macro tracking is the app's core value proposition).
- Safe modification: Add unit tests before making structural changes here; verify against known reference foods (e.g., a small set of foods with hand-verified expected macros).
- Test coverage: None.

## Scaling Limits

**Rate limiter configured for a single global AI-features bucket:**
- Current capacity: `convex/rateLimit.ts` defines one `aiFeatures` limiter at 50 requests/user/day across all AI-driven flows (meal photo analysis, barcode-triggered analysis, meal correction via `fix-meal.tsx`).
- Limit: All AI feature types share the same 50/day budget; a user who scans many barcodes has less budget left for photo-based meal analysis or corrections, with no per-feature breakdown.
- Scaling path: Consider splitting into per-feature limiters (e.g., `mealAnalysis`, `mealCorrection`, `barcodeScan`) if usage patterns show one feature starving another, and revisit the flat 50/day cap against actual AI provider (OpenRouter/Google Generative AI) cost data as usage grows.

## Dependencies at Risk

**`react-native-reanimated` performance flagged as an open concern by the team:**
- Risk: `TODO.md` explicitly lists "react-native-reanimated performance" as an unresolved item, alongside multiple UI animation bugs (onboarding, circular progress, carousel auto-scroll) that may stem from Reanimated 4.x + `react-native-worklets` interaction on the New Architecture (`newArchEnabled: true` in `app.config.ts`).
- Impact: Animation jank/bugs across onboarding, home macro summary, and progress indicators; several TODO items ("Circular progress animation stopping too soon," "Number animation on change," "Cropped circular progress") likely trace back to this.
- Migration plan: N/A — same major dependency, requires targeted debugging rather than replacement; watch Reanimated release notes for New Architecture fixes given `expo: ^54.0.21` and `newArchEnabled: true`.

**Planned auth migration away from `@convex-dev/auth`:**
- Risk: `TODO.md` explicitly lists "Migrate to convex-better-auth for auth" as a planned but unstarted migration, meaning the current auth implementation (`convex/auth.ts`, `convex/auth.config.ts`, `context/AuthContext.tsx`) is considered a stepping-stone, not the final architecture.
- Impact: Any auth-related feature work built now (e.g., "Implement OTP sign-in," "Sign in with email" — both also open TODOs) risks being partially redone during the eventual migration.
- Migration plan: Team-acknowledged future work; no migration plan documented beyond the TODO line item.

## Missing Critical Features

**Email/OTP sign-in is incomplete:**
- Problem: Multiple related TODOs are open: "Implement OTP sign-in," "Email sign-in," "Test email sign-in safe," "Fix OTP resend," "Otp disabled button before entering code," "Email disabled button while input is empty." The email-login UI path in `components/auth/SignInButtons.tsx` is commented out entirely (`// const handleEmailLogin = ...` and the corresponding button JSX, lines 70-123).
- Blocks: Users without Google/Apple accounts (or who prefer not to use them) currently have no way to sign in; `convex/ResendOTP.ts` exists (Resend email provider is wired up) but the end-to-end OTP UI flow is not exposed to users.

**No congratulations/confirmation screen after subscription purchase:**
- Problem: "Congrats screen after buying subscription" is an open TODO; users who complete a purchase via `Paywall.tsx` get no explicit success confirmation screen.
- Blocks: Reduced perceived value/confirmation for a monetization-critical moment in the funnel.

## Test Coverage Gaps

**Entire codebase — no automated tests exist:**
- What's not tested: Every Convex function (auth-gated mutations/queries, nutrition math, AI action orchestration, subscription sync), every React Native component, and every `lib/` utility.
- Files: Entire repository — `convex/`, `app/`, `components/`, `lib/`
- Risk: Regressions in monetization (`Paywall.tsx`, `syncSubscriptionStatus.ts`), core nutrition calculations (`replaceMealItems.ts`, `nutrientsConfig.ts`), and auth (`SignInButtons.tsx`, `convex/auth.ts`) can ship undetected. `TODO.md` explicitly names two functions as needing tests ("Test selectCandidates.tsx/ensureSelection," "Test email sign-in safe") confirming the team is aware of this gap for at least these two areas.
- Priority: High — recommend starting with Convex business-logic tests (`convex-test` package) for `replaceMealItems`, `computeNutritionTargets`, and `getWeekMeals`, since these are pure-ish functions with auth/data dependencies that are straightforward to mock, and directly affect the numbers users see and trust.

---

*Concerns audit: 2026-08-04*
