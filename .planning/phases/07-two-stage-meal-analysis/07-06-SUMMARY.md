---
phase: 07-two-stage-meal-analysis
plan: 06
subsystem: testing
tags: [e2e, human-verify, convex, uat]

requires:
  - phase: 07-two-stage-meal-analysis (plans 07-01 through 07-05)
    provides: confirm-meal screen, background processing scheduler, retry/error UI, completion toast
provides:
  - Human-run E2E verification of the two-stage meal analysis flow — FAILED at step 5/6
  - Root-caused failure via `npx convex logs`: `convex/foods/getFoodByIdentity.ts` (public query) still calls `getAuthUserId(ctx)` and throws `Unauthorized` when invoked from the scheduled/auth-less `processDetectedItemsAction` context
  - Identified a second gap: `detectMealItems.ts`'s zod schema constrains `mealName` to Russian but leaves `items[].name` unconstrained, so the AI returns ingredient names in English on the new confirm-meal screen
affects: [gap-closure plan for phase 07, any future phase touching convex/foods/*, meal analysis prompts]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: []

key-decisions:
  - "Did NOT patch the discovered bugs — per plan 07-06's explicit instruction, a human-reported failure at this checkpoint must be recorded and routed to gap-closure (/gsd:plan-phase 07 --gaps), not silently fixed by the verifying agent"

patterns-established: []

requirements-completed: []

duration: ~25min
completed: 2026-08-24
---

# Phase 7: Two-Stage Meal Analysis — Human Verification Summary

**End-to-end human run FAILED at step 5 (confirm → background processing): background processing throws `Unauthorized` because `getFoodByIdentity` query wasn't converted to an internal/userId-explicit variant alongside `updateMeal`/`replaceMealItems`; ingredient names on the new confirm screen also render in English instead of Russian.**

## Performance

- **Duration:** ~25 min (human run-through + orchestrator root-cause investigation via `npx convex logs`)
- **Completed:** 2026-08-24
- **Tasks:** 1/1 (checkpoint executed; verification did NOT pass)

## What Was Verified

Steps 1–4 of the how-to-verify checklist passed:
- Confirm-meal screen (`Проверьте блюдо`) appeared within seconds of sending a photo, skeleton-then-list transition worked (MEAL-01)
- Inline ingredient editing (name, grams stepper) rendered and was interactive (MEAL-02)
- Leave-confirmation dialog ("Уйти без подтверждения?") appeared correctly on back-navigation before confirming

Step 5 (tap "Подтвердить" → land on meal detail screen) **failed**: the meal detail screen showed its loading skeleton, then resolved directly to the error state ("Не удалось распознать блюдо") instead of the finished result. Steps 6–11 were not reachable/verifiable as a result.

## Root Cause (found via `npx convex logs --history 500`)

```
[CONVEX A(meals/analyze/processDetectedItemsAction)] [ERROR] 'processDetectedItemsAction error'
'Uncaught Error: Unauthorized\n    at handler (../../convex/foods/getFoodByIdentity.ts:22:20)\n'
    at async <anonymous> (../../convex/meals/analyze/processDetectedItems.ts:44:6)
    at async processDetectedItems (../../convex/meals/analyze/processDetectedItems.ts:83:12)
    at async handler (../../../convex/meals/analyze/processDetectedItemsAction.ts:25:8)
```

`convex/foods/getFoodByIdentity.ts` is a public `query` that calls `getAuthUserId(ctx)` and throws `"Unauthorized"` when no user session is present. `processDetectedItems.ts:44` calls it via `ctx.runQuery(api.foods.getFoodByIdentity.default, ...)`. `processDetectedItemsAction` runs inside the Convex **scheduler** (fired by `confirmMeal`/`retryProcessDetectedItems` via `ctx.scheduler.runAfter`), which has no authenticated user context — exactly the class of bug RESEARCH.md's Pitfall 2 warned about, and which plans 07-01/07-02/07-03 fixed for `updateMeal`/`replaceMealItems` by adding `internalMutation` variants with an explicit `userId` parameter. `getFoodByIdentity` was missed — it needs the same treatment (an `internalQuery` variant, or refactor `processDetectedItems` to call it without the auth check since food records are not user-scoped data).

## Second Issue: Ingredient Names Not Localized

`convex/meals/analyze/detectMealItems.ts`'s zod schema:
```ts
mealName: z.string().describe("Short, appetizing, generic meal name in Russian"),
items: z.array(z.object({ name: z.string().min(1), grams: ... })),
```
`mealName` explicitly instructs the model to respond in Russian; `items[].name` has no such constraint, so the model is free to return ingredient names in English. This is newly user-visible because plan 07-04's confirm-meal screen is the first place raw AI-detected item names are shown directly to the user (the old single-shot flow only ever surfaced items after FDC candidate matching/translation). Needs a schema/prompt fix mirroring the `mealName` constraint.

## Decisions Made

- Per plan 07-06's explicit instruction ("If the human reports a failure, do not close this plan; convert the report into a gap-closure plan... instead of silently patching"), no code changes were made in response to this failure. The orchestrator used `npx convex logs` to root-cause the failure for a faster gap-closure plan, but did not touch `convex/foods/getFoodByIdentity.ts`, `processDetectedItems.ts`, or `detectMealItems.ts`.

## Deviations from Plan

None — plan executed exactly as written (the checkpoint's job was to surface exactly this kind of integration failure).

## Issues Encountered

**Two unresolved blocking items, both required before MEAL-01…05 can be marked complete:**

1. **[Blocking] `getFoodByIdentity` throws `Unauthorized` in scheduled/background context** — every confirmed meal fails background processing and lands in the error state. This is the single blocker preventing the entire two-stage flow from working. Fix: add an `internalQuery` variant of `getFoodByIdentity` (or equivalent) callable from `processDetectedItems.ts` without requiring `getAuthUserId`, following the pattern already established by `updateMealInternal`/`replaceMealItemsInternal` in plan 07-01.
2. **[Blocking, UX] Detected ingredient names render in English on the confirm-meal screen** — `detectMealItems.ts`'s schema needs a Russian-language constraint on `items[].name` matching the existing constraint on `mealName`.

Steps 6–11 of the verification checklist (toast timing, reopen-no-spurious-toast, leave-before-completion toast, retry-on-error, barcode-flow regression) were **not verified** — they were unreachable once step 5 failed. These must be re-run once the two items above are fixed.

## User Setup Required

None — no external service configuration required. Both issues are code-level fixes within the existing Convex codebase.

## Next Phase Readiness

**Not ready.** Phase 7 (MEAL-01 through MEAL-05) is NOT complete — the primary "log a meal" path is currently broken end-to-end (every confirmed meal errors out). Next step: run `/gsd:plan-phase 07 --gaps` to create a gap-closure plan covering:
1. `getFoodByIdentity` internal-query variant for the scheduled-action context
2. Russian-language constraint on detected ingredient item names

After the gap-closure plan executes, this human-verify checkpoint (07-06) must be re-run in full, including the previously-unreached steps 6–11.

---
*Phase: 07-two-stage-meal-analysis*
*Completed: 2026-08-24 (verification FAILED — see gap-closure items above)*
