---
phase: 07-two-stage-meal-analysis
plan: 06
subsystem: testing
tags: [e2e, human-verify, convex, uat]

requires:
  - phase: 07-two-stage-meal-analysis (plans 07-01 through 07-08)
    provides: confirm-meal screen, background processing scheduler, retry/error UI, completion toast, getFoodByIdentityInternal, nameRu localization
provides:
  - Human-run E2E verification of the two-stage meal analysis flow — attempt 1 FAILED (root cause found, routed to gap-closure plans 07-07/07-08); attempt 2 PASSED after gap-closure
  - Two post-verification UX follow-ups requested by the human and implemented directly (not part of the original MEAL-01…05 acceptance criteria)
affects: [phase 7 closure, any future phase touching the confirm-meal screen or post-confirm navigation]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - "app/app/(meal)/confirm-meal.tsx — post-confirm navigation now targets /app (home) instead of the meal detail screen"
    - "components/meal/ConfirmMealItems.tsx — ingredient row layout: full-width name row with trash icon, grams stepper on its own row below"

key-decisions:
  - "Attempt 1: did NOT patch the discovered bugs inline — per plan 07-06's explicit instruction, routed to /gsd:plan-phase 07 --gaps instead (see 07-07-SUMMARY.md, 07-08-SUMMARY.md)"
  - "Attempt 2: human confirmed the flow works, then requested two UX changes (post-confirm destination, ingredient row layout) mid-checkpoint. Treated as direct, well-specified follow-up work rather than spinning up another full plan-phase cycle — implemented immediately, atomically committed, tsc+lint verified. Visual/on-device confirmation of these two specific changes is still owed by the human (React Native UI, not verifiable by the agent)."

patterns-established: []

requirements-completed: [MEAL-01, MEAL-02, MEAL-03, MEAL-04, MEAL-05]

duration: ~30min (attempt 1) + ~15min (attempt 2 + follow-up UX changes)
completed: 2026-08-25
---

# Phase 7: Two-Stage Meal Analysis — Human Verification Summary

**Attempt 1 FAILED at step 5 (Unauthorized in scheduler context + English ingredient names), root-caused and routed to gap-closure. Attempt 2 (after plans 07-07/07-08 fixed both bugs) PASSED — human confirmed the full flow works, then requested two follow-up UX changes (post-confirm destination, ingredient row layout) which were implemented immediately.**

## Performance

- **Duration:** ~30 min (attempt 1: human run-through + root-cause investigation) + ~15 min (attempt 2: human re-run + two follow-up UX edits)
- **Completed:** 2026-08-25
- **Tasks:** 1/1 (checkpoint executed twice; second attempt passed)

## Attempt 1 (2026-08-24) — FAILED

Steps 1–4 of the how-to-verify checklist passed (confirm-meal screen appeared with skeleton→list transition, inline editing worked, leave-confirmation dialog worked). Step 5 failed: confirming a meal always resolved to the error state instead of the finished result. Steps 6–11 were unreachable.

**Root cause 1 (found via `npx convex logs --history 500`):** `convex/foods/getFoodByIdentity.ts` was a public `query` calling `getAuthUserId(ctx)`, throwing `Unauthorized` when invoked from the scheduled/auth-less `processDetectedItemsAction` context (`processDetectedItems.ts:44` → `getFoodByIdentity.ts:22`). Same class of bug plans 07-01/07-02/07-03 already fixed for `updateMeal`/`replaceMealItems`, but this query was missed.

**Root cause 2:** `convex/meals/analyze/detectMealItems.ts`'s zod schema constrained `mealName` to Russian but left `items[].name` unconstrained — the AI returned ingredient names in English on the new confirm-meal screen (the first surface where raw AI-detected names are shown directly to the user).

Per plan 07-06's explicit instruction, neither bug was patched inline. Routed to `/gsd:plan-phase 07 --gaps`, which produced plans `07-07-PLAN.md` (fixed root cause 1 with genuine runtime proof via `npx convex logs`) and `07-08-PLAN.md` (fixed root cause 2 by adding a required `nameRu` field, keeping English `name` as the FDC vector-search key — see `07-07-SUMMARY.md`/`07-08-SUMMARY.md` for full detail).

## Attempt 2 (2026-08-25) — PASSED, with follow-up requests

After `07-07`/`07-08` merged (`tsc --noEmit` and `npm run lint` clean project-wide, `npx convex dev --once` deployed cleanly), the full 11-step checklist was re-run by the human. Result: **"Вроде все работает"** (confirmed working) — no acceptance-criteria failures reported. The originally-blocking Unauthorized error is gone; ingredient names render correctly.

The human then raised two UX follow-ups discovered during this run (not failures of the phase's locked acceptance criteria, but usability observations):

1. **Post-confirm destination:** after "Подтвердить", the app landed on the meal-detail loading screen. Requested: land on the home screen instead by default (equivalent to what already happens if the user manually dismisses early — the completion toast still reaches them via the layout-level `MealCompletionWatcher` regardless of which screen they're on).
2. **Ingredient row layout:** on the confirm-meal screen, long ingredient names didn't display in full (squeezed between the grams stepper and remove button in a single row). Requested: name on its own full-width row with a trash icon to its right, grams stepper on a second row below, left-aligned.

Both were implemented directly in this session (not spun into a separate plan-phase cycle, given they were small, unambiguous, and directly requested mid-checkpoint):
- `app/app/(meal)/confirm-meal.tsx`: `handleConfirm` now calls `router.replace("/app")` instead of navigating to `/app/(meal)/meal` with the new `mealId` (commit `3531027`).
- `components/meal/ConfirmMealItems.tsx`: `IngredientRow` restructured — `topRow` (name input + trash icon) as its own flex row, `GramsStepper` moved to a second row below it; loading skeleton updated to match the new two-row shape (commit `a22861f`).

Both changes verified with `npx tsc --noEmit` (clean) and `npx eslint` on the touched files (only the 7 pre-existing violations already logged in `deferred-items.md` remain, none newly introduced — confirmed by line-count comparison before/after).

**Not verified by the agent:** actual on-device visual/interaction confirmation of these two specific UI changes — this is a React Native app with no browser or simulator access available to the agent in this environment. The human should do a quick visual check (open the confirm-meal screen, confirm a meal) before considering phase 7 fully closed.

## Root Cause Detail (retained from attempt 1, for reference)

```
[CONVEX A(meals/analyze/processDetectedItemsAction)] [ERROR] 'processDetectedItemsAction error'
'Uncaught Error: Unauthorized\n    at handler (../../convex/foods/getFoodByIdentity.ts:22:20)\n'
    at async <anonymous> (../../convex/meals/analyze/processDetectedItems.ts:44:6)
    at async processDetectedItems (../../convex/meals/analyze/processDetectedItems.ts:83:12)
    at async handler (../../../convex/meals/analyze/processDetectedItemsAction.ts:25:8)
```

## Decisions Made

- Attempt 1: no code changes made in response to the failure — routed to gap-closure per plan 07-06's explicit instruction.
- Attempt 2: the two human-requested UX follow-ups were treated as direct implementation work rather than formal gap-closure planning, since they were small, unambiguous, and requested mid-conversation with full context already loaded. Both changes stayed within files already touched by this phase (`confirm-meal.tsx`, `ConfirmMealItems.tsx`).

## Deviations from Plan

Attempt 1: None — plan executed exactly as written.
Attempt 2: Scope addition (2 UX changes) beyond the original plan's `<how-to-verify>` checklist — both were human-directed, not agent-initiated, and are documented above rather than silently folded into the phase's original acceptance criteria.

## Issues Encountered

None outstanding. Both blocking bugs from attempt 1 are resolved and confirmed by the human. The two follow-up UX changes are implemented but await the human's visual confirmation.

## User Setup Required

None.

## Next Phase Readiness

**Ready, pending a quick visual check.** MEAL-01 through MEAL-05 are confirmed working end-to-end by the human. The two post-verification UX changes (post-confirm navigation, ingredient row layout) are implemented and pass `tsc`/`lint`, but have not been visually confirmed on-device. Once the human confirms those look right, phase 7 can be closed.

---
*Phase: 07-two-stage-meal-analysis*
*Completed: 2026-08-25 (attempt 2 PASSED; 2 follow-up UX changes implemented, pending visual confirmation)*
