---
phase: 07-two-stage-meal-analysis
plan: 05
subsystem: frontend
tags: [react-native, expo-router, convex, ui, toast, error-handling]

# Dependency graph
requires:
  - phase: 07-02
    provides: "processDetectedItems scheduler-safe, analyzeMealPhoto/analyzeMealDescription deleted"
  - phase: 07-03
    provides: "confirmMeal mutation, retryProcessDetectedItems mutation, getMeal/getWeekMeals surfacing error-status meals"
  - phase: 07-04
    provides: "confirm-meal.tsx screen (D-01), mealId fast-path"
provides:
  - "meal.tsx: barcode-only trigger path + mealId-driven display + error passthrough, no photo/description analysis of its own"
  - "Meal.tsx: dedicated error branch (icon/heading/body/Retry) with rate-limit-aware retry, no infinite loading skeleton on error"
  - "camera.tsx/describe.tsx: photo and description paths route to confirm-meal.tsx; barcode path unchanged"
  - "MealCompletionWatcher.tsx: layout-level, screen-independent completion/error toast, fires exactly once per genuine transition"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isRateLimitError(error) from \"@convex-dev/rate-limiter\" (client export) used to distinguish a rate-limit rejection from a generic mutation failure on the client, instead of message-string matching"
    - "Layout-level side-effect-only watcher component (renders null, mounted alongside <Stack>) as the pattern for cross-screen reactive notifications that must survive navigation"
    - "Map<mealId, prevStatus> ref, seeded silently on first observation, as the guard against both same-mount duplicate fires and spurious first-render fires for already-resolved data"

key-files:
  created:
    - components/meal/MealCompletionWatcher.tsx
  modified:
    - app/app/(meal)/meal.tsx
    - components/meal/Meal.tsx
    - app/app/(add)/camera.tsx
    - app/app/(add)/describe.tsx
    - app/app/_layout.tsx
    - convex/_generated/api.d.ts

key-decisions:
  - "Regenerated convex/_generated/api.d.ts via codegen against the documented dev deployment (keen-meerkat-110) — retryProcessDetectedItems (created in plan 07-03, committed 5fd282c) was not yet reflected in the generated API surface, blocking Meal.tsx's useMutation call from type-checking"
  - "Used @convex-dev/rate-limiter's exported isRateLimitError(error) helper (checks error instanceof ConvexError && error.data.kind === \"RateLimited\") instead of parsing the error message string, for a more reliable rate-limit-vs-generic-failure distinction in Meal.tsx's retry handler"
  - "Suppressed ScreenMainTitle's loading skeleton entirely when status === \"error\" (Rule 1 fix) — the title has no name to show for a failed meal and isDone is false, so the skeleton would otherwise spin forever, contradicting the plan's own 'no infinite loading skeleton' success criterion"

patterns-established:
  - "Toast-firing for meal completion is owned exclusively by MealCompletionWatcher.tsx, never by a per-screen effect — any future screen-scoped meal state should not duplicate this responsibility"

requirements-completed: [MEAL-03, MEAL-04]

# Metrics
duration: 55min
completed: 2026-08-24
---

# Phase 7 Plan 05: Finish rewiring — meal.tsx split, Meal.tsx error branch, camera/describe routing, layout-level completion watcher Summary

**meal.tsx no longer runs photo/description analysis (that moved to confirm-meal.tsx in plan 07-04); Meal.tsx gained its first-ever error branch with a working, rate-limit-aware Retry button; camera.tsx/describe.tsx now route photo and description flows to confirm-meal.tsx while the barcode path stays untouched; and a new layout-level MealCompletionWatcher fires the completion/error toast exactly once per genuine transition regardless of which screen the user is on.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-08-24T16:29:00Z (approx, worktree init)
- **Completed:** 2026-08-24T17:24:00Z (approx)
- **Tasks:** 4 completed
- **Files modified:** 7 (1 created, 6 modified, including a regenerated codegen artifact)

## Accomplishments

- `meal.tsx` is now barcode-only-trigger + mealId-driven display: removed `analyzeMealPhoto`/`analyzeMealDescription` actions, the upload/crop pipeline, and all associated imports; kept the barcode flow and the `initialMealId` fast-path exactly as before (this is the path `confirm-meal.tsx` uses) — closes the transient gap explicitly left open by plan 07-02's Task 3 (MEAL-03)
- `meal.tsx` passes `status` through to `<Meal>` unconditionally, so an `error`-status meal (no longer hidden by `getMeal.ts` since plan 07-03) reaches the error branch instead of being redirected home
- `Meal.tsx` gained a sibling error branch (`status === "error"`): `TriangleAlertIcon`, exact UI-SPEC heading/body copy, and a single `"Повторить"`/`"Повторяем…"` `ScreenFooterButton` wired to `retryProcessDetectedItems`, disabled while in flight, with a rate-limit-specific toast via `isRateLimitError` when the `mealRetry` bucket is exhausted (D-15, D-16)
- `camera.tsx` (`takePhoto`, `handleUpload`) and `describe.tsx` now `router.replace` to `/app/(meal)/confirm-meal` instead of `/app/(meal)/meal`; the barcode branch in `camera.tsx`'s `handleBarcodeScanned` is untouched
- New `components/meal/MealCompletionWatcher.tsx`: side-effect-only (`return null`), subscribes to `getWeekMeals`, and fires `"Блюдо распознано и записано"` / `"Не удалось распознать блюдо"` toasts exactly once per observed `processing → done`/`processing → error` transition via a `Map<mealId, prevStatus>` ref that seeds silently on first sight of any meal — no spurious toast on reopening an already-resolved meal, and the toast survives the user navigating away from `meal.tsx` entirely (MEAL-04, checker BLOCKER fix)
- `app/app/_layout.tsx` mounts `<MealCompletionWatcher />` alongside `<Stack>`, only in the branch reached after both the loading and unauthenticated/onboarding early-return guards
- Repo-wide `analyzeMealPhoto`/`analyzeMealDescription` references: zero. `npx tsc --noEmit`: zero errors project-wide (confirmed after all 4 tasks + the follow-up fix).

## Task Commits

Each task was committed atomically:

1. **Task 1: Surgically split meal.tsx — remove photo/description analysis, keep barcode, pass status through** - `4355954` (feat)
2. **Task 2: Add error branch + Retry button to Meal.tsx (D-15/D-16)** - `e3b6817` (feat)
3. **Task 3: Point camera.tsx and describe.tsx at confirm-meal.tsx** - `24ebb12` (feat)
4. **Task 4: Create MealCompletionWatcher.tsx and mount it at the layout level (MEAL-04)** - `73753ca` (feat)
5. **Follow-up fix: suppress ScreenMainTitle skeleton on the error branch** - `3194fd3` (fix)

**Plan metadata:** (this commit, pending)

## Files Created/Modified

- `app/app/(meal)/meal.tsx` - removed `photoUri`/`description` params, `analyzeMealPhoto`/`analyzeMealDescription` actions, upload/crop pipeline (`generateUploadUrl`, `dimensions`, `fromCamera`, `createMealFromPhoto`, `createMealFromDescription`) and now-unused imports (`useWindowDimensions`, `z`, `processLibraryImage`, `cropImageToAspect`); `startMealAnalysis` simplified to barcode-only; `<Meal>` now receives `status={meal?.status}`
- `components/meal/Meal.tsx` - `Props` gained optional `status`; new `isError` branch renders `TriangleAlertIcon` + heading + body instead of `MealMacros`/`Carousel`/`MealItems`, and a single `"Повторить"` footer button instead of the normal `"Исправить"`/`"Готово"` pair; `handleRetry` wraps `retryProcessDetectedItems` in `tryCatch`, uses `isRateLimitError` to pick the correct toast copy; `ScreenMainTitle` suppressed entirely when `isError` (follow-up fix, see Deviations)
- `app/app/(add)/camera.tsx` - `takePhoto`/`handleUpload` `router.replace` calls point at `/app/(meal)/confirm-meal`; `handleBarcodeScanned` unchanged
- `app/app/(add)/describe.tsx` - single `router.replace` call points at `/app/(meal)/confirm-meal`
- `app/app/_layout.tsx` - imports and mounts `<MealCompletionWatcher />` as a sibling of `<Stack>` in the final authenticated+onboarded return
- `components/meal/MealCompletionWatcher.tsx` (new) - default component, `useQuery(api.meals.getWeekMeals.default, ...)` + `useRef<Map<Id<"meals">, Doc<"meals">["status"]>>` + `useEffect` transition-detection loop + map pruning; `return null`
- `convex/_generated/api.d.ts` - regenerated via `npx convex codegen` so `api.meals.retryProcessDetectedItems.default` resolves in `Meal.tsx`'s `useMutation` call (see Deviations)

## Decisions Made

- Used the rate-limiter package's own `isRateLimitError` export rather than inspecting the thrown error's message string — more robust against future copy changes and matches the package's intended usage pattern
- Regenerated Convex codegen against the same documented dev deployment (`keen-meerkat-110`) used by plans 07-02/07-03, no secrets invented, no functions manually deployed beyond what `convex codegen` itself uploads

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Regenerated `convex/_generated/api.d.ts` via `npx convex codegen`**
- **Found during:** Task 2 (Meal.tsx)
- **Issue:** `npx tsc --noEmit` failed with `Property 'retryProcessDetectedItems' does not exist on type ...` — plan 07-03's `retryProcessDetectedItems.ts` (committed `5fd282c`) had not yet been reflected in the generated `api.*` surface at the time this plan started executing
- **Fix:** Ran `CONVEX_DEPLOYMENT=dev:keen-meerkat-110 npx convex codegen --typecheck disable`, identical approach documented as a deviation in plans 07-02 and 07-03
- **Files modified:** `convex/_generated/api.d.ts` (tracked in git, not gitignored)
- **Commit:** `e3b6817` (Task 2 commit)

**2. [Rule 1 - Bug] Suppressed `ScreenMainTitle`'s loading skeleton on the error branch**
- **Found during:** Post-Task-2 review, before writing this summary
- **Issue:** `ScreenMainTitle` was rendered unconditionally above the (loading/done/error) content block, receiving `loading={loading}`. For an `error`-status meal, `meal.name` is undefined and `isDone` is `false` in `meal.tsx`, so `isLoading` stays `true` forever — the title's skeleton would spin indefinitely on the error screen, directly contradicting this plan's own success criterion ("A meal in error status renders a dedicated error view ... instead of an infinite loading skeleton")
- **Fix:** Wrapped the `ScreenMainTitle` block in `{!isError && (...)}` so it is not rendered at all when `status === "error"` — the error branch's own heading/body already communicates state, no title is needed
- **Files modified:** `components/meal/Meal.tsx`
- **Commit:** `3194fd3` (separate follow-up commit, not folded into Task 2's original commit since it was found after that commit had already landed)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both necessary for correctness — the codegen gap blocked type-checking entirely, and the skeleton fix closes a direct violation of the plan's own stated success criterion. No scope creep beyond what the plan already anticipated (codegen) or explicitly required (no infinite loading skeleton).

## Issues Encountered

- This worktree had no `node_modules` installed (fresh worktree, `node_modules` is gitignored and not shared across worktrees by default). Verified `package.json` is byte-identical to the main repo's checkout, then created a local, untracked symlink (`node_modules -> /Users/smatov/GitLab/CalYo/node_modules`) so `npx tsc --noEmit` and `npx convex codegen` could run without a full `npm install`. The symlink is untracked and was never staged/committed — `git status --short` shows it as `?? node_modules`, which is expected and harmless (matches `.gitignore`'s `node_modules/` pattern in spirit; the symlink itself just isn't matched by the trailing-slash pattern, so it shows as untracked rather than being silently ignored — either way it was never added to any commit).

## User Setup Required

None - no external service configuration required. Codegen used an already-authenticated local Convex CLI session against the documented dev deployment; no new credentials were created or needed.

## Verification

- `npx tsc --noEmit`: zero errors, project-wide — confirms the two previously-expected transient errors in `meal.tsx` (referencing the now-deleted `analyzeMealPhoto`/`analyzeMealDescription`, flagged by plans 07-02/07-03/07-04 as owned by this plan) are fully resolved
- `grep -rn "analyzeMealPhoto\|analyzeMealDescription"` across the repo (excluding `node_modules`): zero matches
- `meal.tsx`'s only remaining `status === "done"` occurrence is the pre-existing `isDone` computation, not a toast-firing effect — confirms no per-screen toast logic was reintroduced
- `camera.tsx` contains exactly two `"/app/(meal)/confirm-meal"` occurrences (`takePhoto`, `handleUpload`) and exactly one remaining `pathname: "/app/(meal)/meal"` (the barcode branch); `describe.tsx` contains one `"/app/(meal)/confirm-meal"` occurrence and zero remaining `"/app/(meal)/meal"` occurrences
- `app/app/_layout.tsx` imports and renders `<MealCompletionWatcher />` alongside `<Stack>`

## Next Phase Readiness

- This was the final plan in phase 07's wave 5 dependency chain (`depends_on: ["07-02", "07-03", "07-04"]`); no downstream plans in this phase depend on 07-05's output per its frontmatter
- The full photo/description → confirm → background-process → toast → retry cycle is now reachable end-to-end from the camera/describe screens, and the completion notification survives the user leaving `meal.tsx` (MEAL-03/MEAL-04 both closed)
- No blockers

---
*Phase: 07-two-stage-meal-analysis*
*Completed: 2026-08-24*

## Self-Check: PASSED

All created/modified files verified present on disk (`meal.tsx`, `Meal.tsx`, `camera.tsx`, `describe.tsx`, `_layout.tsx`, `MealCompletionWatcher.tsx`, this SUMMARY.md); all commit hashes (`4355954`, `e3b6817`, `24ebb12`, `73753ca`, `3194fd3`) verified present in `git log`; `npx tsc --noEmit` re-run immediately before writing this summary and confirmed to produce zero output (zero errors) project-wide.
