---
phase: 07-two-stage-meal-analysis
plan: 07
subsystem: backend
tags: [convex, internalQuery, scheduler, gap-closure]

# Dependency graph
requires:
  - phase: 07-two-stage-meal-analysis (plan 07-06)
    provides: root-caused `Unauthorized` failure in the scheduled background-processing path
provides:
  - "getFoodByIdentityInternal internalQuery (auth-less mirror of getFoodByIdentity, callable from ctx.scheduler context)"
  - "processDetectedItems.ts repointed at the internal query — confirmed meals no longer crash background processing"
affects: [07-06 (must be re-run in full once 07-08 also lands), any future caller of ctx.scheduler.runAfter that reads foods]

tech-stack:
  added: []
  patterns:
    - "internalQuery mirror of a public auth-gated query, with the getAuthUserId check removed entirely (not replaced with an explicit userId arg) because the underlying table (foods) is shared reference data with no per-user ownership column — contrast with the internalMutation pattern from 07-01 (updateMealInternal/replaceMealItemsInternal), which DOES take an explicit userId because meals rows are user-owned"

key-files:
  created:
    - convex/foods/getFoodByIdentityInternal.ts
  modified:
    - convex/meals/analyze/processDetectedItems.ts
    - convex/_generated/api.d.ts (codegen regeneration, not hand-edited)

key-decisions:
  - "getFoodByIdentityInternal takes no userId argument at all (unlike updateMealInternal/replaceMealItemsInternal) — foods rows are shared FDC/OFF reference data with no owning user, so there is nothing to authorize against; this was explicitly called out and accepted in the plan's threat model (T-07-02)"

patterns-established:
  - "internal.foods.getFoodByIdentityInternal.default callable from any server-side context (scheduled action, mutation, other query) without requiring getAuthUserId"

requirements-completed: [MEAL-03, MEAL-04, MEAL-05]

# Metrics
duration: ~50min
completed: 2026-08-25
---

# Phase 7 Plan 07: Fix scheduler-context Unauthorized bug in food lookup Summary

**Added `getFoodByIdentityInternal` (an `internalQuery` with no auth check) and repointed `processDetectedItems.ts`'s scheduled call site at it, closing the `Unauthorized` crash that broke every confirmed meal's background processing — proven via three live `processDetectedItemsAction` invocations against a real dev-deployment `meals` row, all completing with `status: "done"` and zero `Unauthorized` errors in `npx convex logs`.**

## Performance

- **Duration:** ~50 min
- **Completed:** 2026-08-25
- **Tasks:** 2/2

## Accomplishments

- `convex/foods/getFoodByIdentityInternal.ts` created: an `internalQuery` mirror of the public `getFoodByIdentity` query, args validator and index lookup copied verbatim, with `getAuthUserId` removed entirely (not replaced by an explicit `userId` arg — `foods` rows have no owner)
- `convex/meals/analyze/processDetectedItems.ts` line 44's call site repointed from `ctx.runQuery(api.foods.getFoodByIdentity.default, ...)` to `ctx.runQuery(internal.foods.getFoodByIdentityInternal.default, ...)`; the now-unused `api` import removed
- `convex/foods/getFoodByIdentity.ts` (public, client/barcode-facing) and `convex/meals/analyze/analyzeMealBarcode.ts` left byte-identical — confirmed via `git diff --stat` producing no output for either file
- Fix proven at runtime against the real `keen-meerkat-110` dev deployment (not just `tsc`), per the plan's explicit anti-blind-spot instruction

## Task Commits

1. **Task 1: Add getFoodByIdentityInternal and repoint the scheduled call site** - `a03f44d` (fix) — includes the new file, the call-site edit, and the regenerated `convex/_generated/api.d.ts` (Convex codegen picking up the new module)
2. **Task 2: Prove the fix at runtime in the real scheduler context** — no source changes; runtime-only verification, documented below

## Runtime Verification (Task 2)

Pushed code with `npx convex dev --once` (succeeded, no deployment errors — this also regenerated `api.d.ts` with the `getFoodByIdentityInternal` binding, matching the codegen already committed in Task 1).

Found a real fixture left over from the 07-06 failed human-verification run: `meals` row `k57e8915s3w9n099b9d9sfh6s98d2dsy` (userId `kd70zjd2hhbx6rdq3z5p2mehc98cm6jn`), `status: "error"`, with a populated `confirmedItems` array (5 items: wheat flour, Lumb, potato, onion, orange soda).

Invoked `npx convex run meals/analyze/processDetectedItemsAction` directly against this fixture **three separate times** (to get a clean, non-buffered log capture — the first two attempts used `npx convex logs --history N` in the background but the stream produced no output at all without `--success`, which turned out to be *expected* behavior: Convex's log streamer only prints error/explicit-log lines by default, and a successful run emits neither. Re-running with `--success` confirmed the stream was live and the fix worked; see below).

**Log evidence (`npx convex logs --success --history 200`, full transcript captured):**

- All 7 occurrences of `getFoodByIdentity.ts` (the OLD public-query file with the auth check) in the 200-entry history are timestamped `8/24/2026, 9:33:02 PM` — that is the original 07-06 failed-verification run, **before** this plan's fix was deployed. Zero occurrences after the fix was pushed (`8/25/2026, 2:18:11 AM` onward).
- All three live post-fix invocations (`2:18:50–2:19:05 AM`, `2:22:48–2:22:55 AM`, `2:23:51–2:23:59 AM`) show the **new** `foods/getFoodByIdentityInternal` query executing successfully (5 calls per run, one per confirmed item), followed by `foods/updateFoodTranslation`, `foods/updateFoodHealthScore`, `meals/replaceMealItemsInternal`, `meals/updateMealInternal`, and finally `meals/analyze/processDetectedItemsAction Function executed in {7489,7935,15455} ms` — i.e. the action returned successfully with **no thrown error**, each time.

**Terminal meal state:** `npx convex data meals` confirms row `k57e8915s3w9n099b9d9sfh6s98d2dsy` moved from `status: "error"` to **`status: "done"`**, with full `totalMacros`/`totalNutrients`/`totalMicros` computed (e.g. `calories: 655.66`, `protein: 27.38`).

**Unrelated post-auth failures:** **None observed.** All three runs completed cleanly end-to-end, including the AI-backed `translateFood` and `calculateHealthScore` calls (evidenced by the `updateFoodTranslation`/`updateFoodHealthScore` mutations firing) — the OpenRouter negative-balance risk flagged in STATE.md did not manifest during this test. This does not guarantee it won't manifest under different load/timing; it is simply not what blocked these three runs.

`npx tsc --noEmit` re-confirmed clean after the runtime test (no drift from the deployed code).

## Files Created/Modified

- `convex/foods/getFoodByIdentityInternal.ts` (new) — `internalQuery`, same args validator and `byIdentitySourceId` index lookup as the public query, zero `getAuthUserId` occurrences, `export const` + `export default` per the `updateFoodTranslation.ts` in-directory convention
- `convex/meals/analyze/processDetectedItems.ts` — import line narrowed to `internal` only; line 44 call repointed to `internal.foods.getFoodByIdentityInternal.default`
- `convex/_generated/api.d.ts` — Convex codegen output, regenerated by `npx convex codegen`/`npx convex dev --once` to register the new module; not hand-edited

## Decisions Made

- `getFoodByIdentityInternal` takes **no** `userId` argument, unlike the `internalMutation` precedent from plan 07-01 (`updateMealInternal`/`replaceMealItemsInternal`). Those mutate user-owned `meals` rows and need an explicit ownership check since scheduled calls carry no request-auth identity. `foods` rows are shared, non-user-scoped reference data (FDC/OFF identities) — there is no ownership to check, so the auth guard is removed outright rather than swapped for an explicit-arg check. This mirrors the plan's threat-model disposition (T-07-01/T-07-02: accept, not reachable from any client, no PII/ownership to leak).

## Deviations from Plan

None — plan executed exactly as written. One minor operational note (not a deviation from the plan's file/code instructions): the plan's suggested verify command `npx convex logs --history 200 | grep -c "getFoodByIdentity.ts" | grep -qx 0` cannot complete as a single pipeline because `npx convex logs` is a persistent stream that never exits on its own (confirmed: it ran past a 120s background timeout with no EOF). Task 2 was still satisfied per the plan's `<action>` step 4 intent ("inspect the logs") by capturing a bounded window of the stream to a file (`npx convex logs --success --history 200 > file`, backgrounded, then killed after the target runs completed) and grepping the resulting file — which is a superset of the literal verify command's evidence (it additionally captures the full historical `Unauthorized` entries from before the fix, for direct before/after comparison).

## Issues Encountered

None blocking. One environment gap handled inline: the worktree had no `.env.local` (it's gitignored per project convention), so `npx convex dev --once` initially failed with "No CONVEX_DEPLOYMENT set." Copied `.env.local` from the main repo checkout (`/Users/smatov/GitLab/CalYo/.env.local`, containing only the dev deployment's `CONVEX_DEPLOYMENT`/`EXPO_PUBLIC_CONVEX_URL`/`SITE_URL`/`CONVEX_INGEST_TOKEN` — no code changes, gitignored, not committed) to unblock the runtime verification, then deleted it after Task 2 completed.

## User Setup Required

None — no external service configuration required. This plan needed only the existing dev deployment (`keen-meerkat-110`), already configured in the main checkout's `.env.local`.

## Next Phase Readiness

This plan closes gap-closure item 1 of 2 from 07-06-SUMMARY.md (the `Unauthorized` scheduler bug). Item 2 (Russian ingredient names, `detectMealItems.ts`) is plan 07-08, scheduled for wave 8.

**Do NOT re-run the 07-06 human-verify checkpoint yet.** Per 07-07-PLAN.md's `<output>` instruction: after BOTH 07-07 and 07-08 land, the existing 07-06 human-verify plan must be re-run in full, including the previously-unreached steps 6–11 (toast timing, reopen-without-spurious-toast, leave-before-completion toast, retry-on-error, barcode-flow regression). No new human-verify plan should be created — the user re-invokes the existing one via `/gsd-execute-phase 7 --wave 6`.

---
*Phase: 07-two-stage-meal-analysis*
*Completed: 2026-08-25*

## Self-Check: PASSED

All created/modified files verified present on disk (`convex/foods/getFoodByIdentityInternal.ts`, this SUMMARY); both commit hashes (`a03f44d`, `7c88f4a`) verified present in `git log`.
