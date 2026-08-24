---
phase: 07-two-stage-meal-analysis
plan: 01
subsystem: database
tags: [convex, schema, rate-limiter, internalMutation, scheduler]

# Dependency graph
requires: []
provides:
  - "confirmedItems + description optional fields on meals schema"
  - "mealRetry fixed-window rate-limit bucket (10/hour, keyed by mealId)"
  - "updateMealInternal internalMutation (explicit userId arg, no request auth)"
  - "replaceMealItemsInternal internalMutation (explicit userId arg, no request auth)"
affects: [07-02, 07-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "internalMutation dual-export (named + default) variant of a public mutation, taking an explicit userId arg instead of deriving it via getAuthUserId(ctx), for use from ctx.scheduler.runAfter which does not propagate caller identity"

key-files:
  created:
    - convex/meals/updateMealInternal.ts
    - convex/meals/replaceMealItemsInternal.ts
  modified:
    - convex/tables/meals.ts
    - convex/rateLimit.ts

key-decisions:
  - "No new meals.status literal added — no DB row exists before confirm (D-05), per CONTEXT.md/RESEARCH.md A3"
  - "mealRetry bucket will be keyed by mealId (not userId) when wired in plan 07-03, per D-18"

patterns-established:
  - "internal.meals.updateMealInternal.default / internal.meals.replaceMealItemsInternal.default callable from scheduled internalAction, with ownership re-verified against explicit userId arg since scheduled calls carry no request-auth identity"

requirements-completed: [MEAL-03]

# Metrics
duration: 20min
completed: 2026-08-24
---

# Phase 7 Plan 01: Backend contracts for confirm→retry flow Summary

**Extended `meals` schema with `confirmedItems`/`description`, added a `mealRetry` rate-limit bucket, and created `internalMutation` variants of `updateMeal`/`replaceMealItems` that take an explicit `userId` arg instead of deriving it from request auth.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-08-24T10:48:00Z (approx.)
- **Completed:** 2026-08-24T11:08:42Z
- **Tasks:** 2 completed
- **Files modified:** 4 (2 modified, 2 created)

## Accomplishments
- `meals` table can now persist the confirmed ingredient list and free-text description needed for background retry (D-16, D-17)
- Dedicated `mealRetry` rate-limit bucket exists, separate from the main 50/day `aiFeatures` limit (D-18)
- `updateMealInternal.ts` and `replaceMealItemsInternal.ts` exist as scheduler-safe mirrors of their public counterparts, closing the `ctx.scheduler.runAfter` auth-propagation gap identified in RESEARCH.md

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend meals schema + add mealRetry rate-limit bucket** - `2024b77` (feat)
2. **Task 2: Create updateMealInternal.ts and replaceMealItemsInternal.ts** - `9a8da18` (feat)

**Plan metadata:** (this commit, pending)

## Files Created/Modified
- `convex/tables/meals.ts` - Added `description: v.optional(v.string())` and `confirmedItems: v.optional(v.array(v.object({name, grams})))` to `mealsFields`
- `convex/rateLimit.ts` - Added `mealRetry` fixed-window bucket (rate 10, period HOUR) to the `rateLimiter` config
- `convex/meals/updateMealInternal.ts` (new) - `internalMutation` mirror of `updateMeal.ts`; takes `userId: v.id("users")` as an explicit arg instead of calling `getAuthUserId(ctx)`; keeps the same `Not found`/`Forbidden` ownership checks and `logError` try/catch
- `convex/meals/replaceMealItemsInternal.ts` (new) - `internalMutation` mirror of `replaceMealItems.ts`; takes `userId: v.id("users")` as an explicit arg; preserves the full macros/micros/nutrients aggregation loop and `Forbidden` ownership check verbatim

## Decisions Made
- Did not add a new `meals.status` literal, per plan instruction and CONTEXT.md/RESEARCH.md — no DB row exists before confirm (D-05)
- `mealRetry` bucket is defined now (this plan) but not yet wired to any caller — it will be keyed by `mealId` when `retryProcessDetectedItems.ts` is built in plan 07-03

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plans 07-02 and 07-03 can now schedule background work via `internal.meals.updateMealInternal.default` / `internal.meals.replaceMealItemsInternal.default` once Convex codegen (`npx convex dev`) has regenerated `_generated/api.d.ts` to include the two new files — this is expected to happen automatically when the dev server is next running, per the plan's `<verification>` note
- `npx tsc --noEmit` passes with no new type errors after both tasks
- No blockers for downstream plans in this wave

---
*Phase: 07-two-stage-meal-analysis*
*Completed: 2026-08-24*
