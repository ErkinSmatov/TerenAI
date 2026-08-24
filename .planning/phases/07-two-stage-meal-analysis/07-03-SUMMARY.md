---
phase: 07-two-stage-meal-analysis
plan: 03
subsystem: backend
tags: [convex, scheduler, mutation, internalAction, rate-limiter]

# Dependency graph
requires:
  - phase: 07-01
    provides: "confirmedItems/description meals schema fields, mealRetry rate-limit bucket, updateMealInternal/replaceMealItemsInternal internalMutations"
  - phase: 07-02
    provides: "userId-aware processDetectedItems callable from a scheduled context"
provides:
  - "confirmMeal mutation: validates+clamps client items, inserts meals row (status processing), schedules background processing, returns mealId immediately (D-05, MEAL-03)"
  - "processDetectedItemsAction internalAction: scheduler entry point that resolves imageUrl and marks the meal error on failure instead of leaving it stuck in processing (D-15)"
  - "retryProcessDetectedItems mutation: re-schedules processing for an error-status meal from its persisted confirmedItems, ownership+state+rate-limit gated, no aiFeatures charge (D-16, D-17, D-18)"
  - "getMeal/getWeekMeals no longer hide status===error meals — a retry UI has something to attach to (Pitfall 2 fix)"
affects: [07-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ctx.scheduler.runAfter(0, internal.meals.analyze.processDetectedItemsAction.default, {...}) as the fire-and-forget confirm -> background-processing handoff"
    - "internalAction wrapping a plain async helper (processDetectedItems), with a nested try/catch around the error-marking mutation so a failure to mark error does not mask the original error"

key-files:
  created:
    - convex/meals/analyze/processDetectedItemsAction.ts
    - convex/meals/confirmMeal.ts
    - convex/meals/retryProcessDetectedItems.ts
  modified:
    - convex/meals/getMeal.ts
    - convex/meals/getWeekMeals.ts
    - convex/_generated/api.d.ts

key-decisions:
  - "Regenerated convex/_generated/api.d.ts via codegen against the documented dev deployment (keen-meerkat-110), same approach plan 07-02 used, so internal.meals.analyze.processDetectedItemsAction resolves for confirmMeal.ts's scheduler call"

patterns-established:
  - "mealRetry rate-limit bucket keyed by mealId (not userId), enforced before re-scheduling, closing the uncounted-AI-call abuse surface for retry (T-07-08)"

requirements-completed: [MEAL-03, MEAL-05]

# Metrics
duration: 33min
completed: 2026-08-24
---

# Phase 7 Plan 03: Wire confirm -> background processing + fix error-meal visibility Summary

**confirmMeal.ts now creates the meals row and returns instantly while processDetectedItemsAction runs the heavy FDC/translation/health-score work in the background via the Convex scheduler; retryProcessDetectedItems.ts re-fires that same background step from persisted confirmedItems without touching the 50/day AI limit; getMeal.ts/getWeekMeals.ts stopped hiding error-status meals so the retry flow has something to attach to.**

## Performance

- **Duration:** 33 min
- **Started:** 2026-08-24T10:48:00Z (approx, worktree init)
- **Completed:** 2026-08-24T11:21:08Z
- **Tasks:** 3 completed
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments
- Confirming an ingredient list now creates the `meals` row and returns `mealId` to the caller immediately, without waiting for FDC search/translation/health-score/totals to finish (D-05) — the client-visible MEAL-03 unlock
- The heavy analysis step runs via `ctx.scheduler.runAfter(0, ...)` after confirm, and `processDetectedItemsAction.ts` marks the meal `error` (via `updateMealInternal`) on any failure instead of leaving it stuck in `processing` forever (D-15)
- A meal that errored is now visible in `getMeal` and `getWeekMeals` instead of silently disappearing (Pitfall 2 fix), giving a future Retry UI (plan 07-05) something to attach to
- Retrying a failed meal re-runs only the heavy step from the persisted `confirmedItems`, never touches the `aiFeatures` bucket, and is itself rate-limited via the dedicated `mealRetry` bucket (10/hour, keyed by `mealId`) — D-16, D-17, D-18

## Task Commits

Each task was committed atomically:

1. **Task 1: Create processDetectedItemsAction.ts — the scheduler entry point** - `e1d9deb` (feat)
2. **Task 2: Create confirmMeal.ts — validate, persist, schedule (D-05, D-12, Security V5/A2)** - `1cb24e8` (feat)
3. **Task 3: Create retryProcessDetectedItems.ts + fix getMeal.ts/getWeekMeals.ts error-status visibility (D-15/D-16/D-17/D-18)** - `5fd282c` (fix)

**Plan metadata:** (this commit, pending)

## Files Created/Modified
- `convex/meals/analyze/processDetectedItemsAction.ts` (new) - `internalAction`; resolves optional `photoStorageId` to `imageUrl`, delegates to `processDetectedItems` with `userId`, and marks the meal `error` on any failure via `internal.meals.updateMealInternal.default` (nested try/catch preserves the original error for rethrow)
- `convex/meals/confirmMeal.ts` (new) - public `mutation`; filters/trims/clamps items (`Math.max(1, Math.min(1500, ...))`, `.slice(0, 30)`), inserts the `meals` row with `status: "processing"` and `confirmedItems`/`description`, schedules `processDetectedItemsAction`, returns `mealId` without awaiting the scheduled call
- `convex/meals/retryProcessDetectedItems.ts` (new) - public `mutation`; checks ownership (`Forbidden`), `status !== "error"` rejection, presence of `confirmedItems`, applies the `mealRetry` rate limit keyed by `mealId`, patches status back to `processing`, and re-schedules `processDetectedItemsAction` from the persisted `confirmedItems`
- `convex/meals/getMeal.ts` - null-return guard no longer excludes `status === "error"`; only `deleted` (and missing) meals return `null`
- `convex/meals/getWeekMeals.ts` - filter clause simplified from excluding both `"error"` and `"deleted"` to excluding only `"deleted"`
- `convex/_generated/api.d.ts` - regenerated via `npx convex codegen` so `internal.meals.analyze.processDetectedItemsAction` resolves in `confirmMeal.ts`'s `ctx.scheduler.runAfter` call

## Decisions Made
- Regenerated Convex codegen against the dev deployment `keen-meerkat-110` (same deployment name plan 07-02 used, taken from `.planning/STATE.md`'s documented TestFlight dev-deployment decision) — no secrets invented, no functions manually deployed beyond what `convex codegen` itself uploads

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Regenerated `convex/_generated/api.d.ts` via `npx convex codegen`**
- **Found during:** Task 2 (confirmMeal.ts)
- **Issue:** `npx tsc --noEmit` failed with `Property 'processDetectedItemsAction' does not exist on type ...` because Task 1's new `internalAction` was not yet reflected in the generated `internal.*` API surface
- **Fix:** Ran `CONVEX_DEPLOYMENT=dev:keen-meerkat-110 npx convex codegen --typecheck disable`, same approach documented as a deviation in plan 07-02's summary
- **Files modified:** `convex/_generated/api.d.ts` (tracked in git, not gitignored)
- **Committed in:** `1cb24e8` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for type-checking to pass; no scope creep — the codegen step was already anticipated by plan 07-02's own precedent.

## Issues Encountered
None beyond the codegen gap documented above.

## User Setup Required

None - no external service configuration required. (Codegen used an already-authenticated local Convex CLI session against the documented dev deployment; no new credentials were created or needed.)

## Next Phase Readiness
- Plan 07-05 can now call `confirmMeal.default` from the client after `detectMealFromPhoto`/`detectMealFromText` (plan 07-02), and can build a Retry UI against `retryProcessDetectedItems.default` for any meal whose `status === "error"` — both `getMeal` and `getWeekMeals` will now surface such meals
- `npx tsc --noEmit` passes cleanly except for the two expected transient errors in `app/app/(meal)/meal.tsx` referencing the deleted `api.meals.analyze.analyzeMealPhoto`/`analyzeMealDescription` — explicitly anticipated by plan 07-02's Task 3 and owned by plan 07-05
- No blockers for downstream plans in this wave

---
*Phase: 07-two-stage-meal-analysis*
*Completed: 2026-08-24*
