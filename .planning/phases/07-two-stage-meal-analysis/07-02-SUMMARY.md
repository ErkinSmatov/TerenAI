---
phase: 07-two-stage-meal-analysis
plan: 02
subsystem: backend
tags: [convex, action, internalMutation, rate-limiter, refactor]

# Dependency graph
requires: ["07-01"]
provides:
  - "detectMealFromPhoto public action: storageId -> {mealName, items}, no DB write"
  - "detectMealFromText public action: description -> {mealName, items}, no DB write"
  - "processDetectedItems now userId-aware and writes exclusively through internal.meals.updateMealInternal / internal.meals.replaceMealItemsInternal"
affects: [07-03, 07-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stage-1 detect action: auth + pro-gate + single aiFeatures rate-limit charge, then delegate straight to the existing detectMealItems*/detectMealItemsFromText helper, returning its result directly to the client with zero ctx.runMutation calls"
    - "processDetectedItems takes an explicit userId param and writes only through internal.meals.*Internal mutations, making it safe to invoke later from a ctx.scheduler.runAfter context that carries no request auth"

key-files:
  created:
    - convex/meals/analyze/detectMealFromPhoto.ts
    - convex/meals/analyze/detectMealFromText.ts
  modified:
    - convex/meals/analyze/processDetectedItems.ts
    - convex/meals/analyze/correctMeal.ts
    - convex/_generated/api.d.ts
  deleted:
    - convex/meals/analyze/analyzeMealPhoto.ts
    - convex/meals/analyze/analyzeMealDescription.ts

key-decisions:
  - "No try/catch in detectMealFromPhoto.ts/detectMealFromText.ts — no mealId exists yet to mark as error (D-05), thrown errors propagate to the client's useAction caller as designed"
  - "correctMeal.ts's own two direct api.meals.updateMeal.default calls (processing/error status patches) left unchanged — those run inside its own authenticated client-invoked action context, not a scheduled context"

patterns-established:
  - "Stage-1 detect actions charge the aiFeatures rate limit exactly once and never touch the meals table, matching D-05 (no DB row before confirm)"

requirements-completed: [MEAL-01, MEAL-03]

# Metrics
duration: 25min
completed: 2026-08-24
---

# Phase 7 Plan 02: Split fast detection from heavy processing; make processDetectedItems scheduler-safe Summary

**Created `detectMealFromPhoto.ts`/`detectMealFromText.ts` as no-DB-write stage-1 actions, routed `processDetectedItems`'s writes through the userId-explicit `internal.meals.updateMealInternal`/`internal.meals.replaceMealItemsInternal` mutations from plan 07-01, and deleted the two now-superseded single-shot `analyzeMealPhoto.ts`/`analyzeMealDescription.ts` actions.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-24T16:11:00Z (approx.)
- **Completed:** 2026-08-24T16:36:00Z (approx.)
- **Tasks:** 3 completed
- **Files modified:** 7 (2 created, 3 modified, 2 deleted)

## Accomplishments
- Client can now get `{mealName, items}` back from a photo or text description in a single fast round-trip, with no `meals` row created and no FDC/candidate search performed (D-05) — MEAL-01
- `processDetectedItems` no longer depends on ambient request auth for its writes: both trailing mutations go through `internal.meals.updateMealInternal`/`internal.meals.replaceMealItemsInternal`, which re-verify `meal.userId === userId` explicitly — this closes the one hard blocker for invoking it from a scheduled (auth-less) context in plan 07-03 (D-15) — MEAL-03
- `correctMeal.ts` passes `userId` through to `processDetectedItems` (already in scope from its own `getAuthUserId` call), otherwise unchanged
- The two single-shot actions this phase supersedes (`analyzeMealPhoto.ts`, `analyzeMealDescription.ts`) are deleted, removing the dead-code risk of anyone re-wiring them with the old public-mutation call shape

## Task Commits

Each task was committed atomically:

1. **Task 1: Create detectMealFromPhoto.ts and detectMealFromText.ts** - `6ffa948` (feat)
2. **Task 2: Route processDetectedItems through internal mutations + update correctMeal.ts call site** - `d52a70d` (fix)
3. **Task 3: Delete analyzeMealPhoto.ts and analyzeMealDescription.ts** - `198e81d` (refactor)

**Plan metadata:** (this commit, pending)

## Files Created/Modified
- `convex/meals/analyze/detectMealFromPhoto.ts` (new) - public action, `storageId -> {mealName, items}`; auth + pro-gate + `rateLimiter.limit(ctx, "aiFeatures", ...)` then `detectMealItems({ imageUrl })`, no DB writes
- `convex/meals/analyze/detectMealFromText.ts` (new) - public action, `description -> {mealName, items}`; same auth/pro-gate/rate-limit block plus the existing `maxUserInputLength` guard, then `detectMealItemsFromText({ description })`, no DB writes
- `convex/meals/analyze/processDetectedItems.ts` - `Params` type gained `userId: Id<"users">`; the two trailing `ctx.runMutation` calls moved from `api.meals.replaceMealItems.default`/`api.meals.updateMeal.default` to `internal.meals.replaceMealItemsInternal.default`/`internal.meals.updateMealInternal.default`, both now passing `userId`
- `convex/meals/analyze/correctMeal.ts` - single `processDetectedItems({...})` call now passes `userId` (already in scope); its own two `api.meals.updateMeal.default` status patches (processing/error) left unchanged
- `convex/_generated/api.d.ts` - regenerated via `npx convex codegen` (see Deviations)
- `convex/meals/analyze/analyzeMealPhoto.ts` (deleted) - fully superseded
- `convex/meals/analyze/analyzeMealDescription.ts` (deleted) - fully superseded

## Decisions Made
- Kept `correctMeal.ts`'s own direct `api.meals.updateMeal.default` calls unchanged (processing/error status patches) since it runs inside its own authenticated client-invoked action context, not the scheduler — per plan instruction and threat register T-07-05 disposition "accept"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Regenerated `convex/_generated/api.d.ts` via `npx convex codegen`**
- **Found during:** Task 2
- **Issue:** Plan 07-01's summary flagged that `internal.meals.updateMealInternal.default`/`internal.meals.replaceMealItemsInternal.default` would not type-check until Convex codegen regenerated `_generated/api.d.ts` — this had not yet happened, and `npx tsc --noEmit` failed with `Property 'replaceMealItemsInternal'/'updateMealInternal' does not exist`
- **Fix:** Ran `CONVEX_DEPLOYMENT=dev:keen-meerkat-110 npx convex codegen --typecheck disable` (dev deployment name taken from `.planning/STATE.md`'s documented TestFlight dev-deployment decision; no secrets were invented). This regenerated the bindings locally without deploying any functions to production. Ran again after Task 3's deletions to drop the now-removed `analyzeMealPhoto`/`analyzeMealDescription` bindings.
- **Files modified:** `convex/_generated/api.d.ts` (tracked in git, not gitignored)
- **Commits:** `d52a70d`, `198e81d`

Note: the transient `meal.tsx` type errors referencing `api.meals.analyze.analyzeMealPhoto`/`analyzeMealDescription` after Task 3's deletion are expected per the plan's own Task 3 note (resolved in plan 07-05) — not a deviation, not auto-fixed here.

## Issues Encountered
None beyond the codegen gap documented above.

## User Setup Required

None - no external service configuration required. (Codegen used an already-authenticated local Convex CLI session against the documented dev deployment; no new credentials were created or needed.)

## Next Phase Readiness
- Plan 07-03 can now schedule `processDetectedItems` via `ctx.scheduler.runAfter` and call it with an explicit `userId` — the scheduler-safety blocker (D-15) is closed
- Plan 07-05 needs to update `app/app/(meal)/meal.tsx` to stop importing `api.meals.analyze.analyzeMealPhoto`/`analyzeMealDescription` (now deleted) and instead call the new `detectMealFromPhoto`/`detectMealFromText` actions plus the stage-2 confirm flow from plan 07-03
- `npx tsc --noEmit` passes cleanly except for the two expected transient errors in `app/app/(meal)/meal.tsx`, explicitly anticipated by this plan's Task 3 and owned by plan 07-05
- No blockers for downstream plans in this wave

---
*Phase: 07-two-stage-meal-analysis*
*Completed: 2026-08-24*

## Self-Check: PASSED

All created files (`detectMealFromPhoto.ts`, `detectMealFromText.ts`) verified present on disk; both deleted files (`analyzeMealPhoto.ts`, `analyzeMealDescription.ts`) verified absent from disk; all task commit hashes (`6ffa948`, `d52a70d`, `198e81d`) and the plan-completion commit (`a05da5c`) verified present in `git log`.
