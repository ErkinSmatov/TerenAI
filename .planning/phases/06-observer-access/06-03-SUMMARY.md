---
phase: 06-observer-access
plan: 03
subsystem: api
tags: [convex, authorization, rate-limiting, bola, observer-access]

# Dependency graph
requires:
  - phase: 06-observer-access
    provides: "observerLinks table, assertObserverAccess gateway, localDayBoundaries, thresholds module (plan 01)"
provides:
  - "redeemCode mutation — observer redeems patient's 6-digit code, idempotent link creation, self-observation and format checks, 10/hour rate limit"
  - "getObservedPatients query — single-call list of all linked patients with today's meals/calories/glucose/steps summary and server-computed warning flags"
  - "getPatientToday query — single-patient detail view gated by assertObserverAccess, whitelisted field set, scoped to [startUtc, endUtc)"
  - "observerCodeRedeem rate limit config in convex/rateLimit.ts"
affects: [06-04, 06-05, 06-06, 06-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Rate limit applied by caller identity (observerId), not by the guessable secret itself (code) — prevents key-rotation bypass of the limiter"
    - "Ambiguous-error pattern: malformed code input and 'code not found' both throw the identical Error('Code not found') string, so the response never discloses which failure mode occurred"
    - "assertObserverAccess is the first await inside try, before any ctx.db call touching patient data — enforced by review in this plan (see key-decisions)"

key-files:
  created:
    - convex/observers/redeemCode.ts
    - convex/observers/getObservedPatients.ts
    - convex/observers/getPatientToday.ts
  modified:
    - convex/rateLimit.ts
    - convex/_generated/api.d.ts

key-decisions:
  - "'Today' for observer-facing queries is computed from the OBSERVER's timezoneOffsetMinutes, not the patient's — profiles has no timezone field and adding one was out of the discussed decisions for this phase. Accepted consequence: near-midnight, a card may show an incomplete day when observer and patient are in materially different timezones (e.g. the 'doctor' persona). Self-correcting once local midnight passes on the observer's device. This is the RESOLVED Open Question 1 from 06-RESEARCH.md, carried into this plan's <context> block verbatim."
  - "observerCodeRedeem rate limit: 10 attempts/hour per caller (fixed window), keyed by observerId not by the code being tried — code space is 1,000,000 (6 digits) and the code is permanent/non-expiring (D-02), so an unrated mutation is a practical brute-force target for another user's medical data"
  - "displayName resolution (name -> email -> phone -> 'Гость') was reimplemented independently in getObservedPatients.ts and getPatientToday.ts rather than imported from convex/observers/getMyObservers.ts, because that file belongs to plan 06-02 which runs in a sibling worktree not yet merged into this one at execution time. Both implementations are identical 4-line functions against the same @convex-dev/auth users table fields (name?/email?/phone?, confirmed via node_modules/@convex-dev/auth/dist/server/implementation/types.d.ts) — no divergence risk, but flagging for the merge step in case a future refactor wants to hoist this into a shared helper"

patterns-established:
  - "Cross-user read queries that resolve their own patient set from a link table (getObservedPatients) do not need assertObserverAccess — the link row itself, filtered by the caller's own observerId, is the proof of access. assertObserverAccess is reserved for queries that accept a targetUserId/patientId argument directly from the client (getPatientToday)."

requirements-completed: [OBSV-01, OBSV-03, OBSV-04, OBSV-05, OBSV-06, OBSV-07]

# Metrics
duration: 35min
completed: 2026-08-15
---

# Phase 6 Plan 03: Observer-Side Server Functions Summary

**Three Convex functions (redeemCode, getObservedPatients, getPatientToday) plus a new 10/hour rate limit close the phase's highest-risk surface: the first place in the codebase where one authenticated user's client sends another user's id as an argument**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-08-15T13:15:00Z (approx.)
- **Completed:** 2026-08-15T13:24:29Z
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 modified — one of which is a generated file)

## Accomplishments
- `redeemCode` mutation: 6-digit format validation before any DB access, rate-limited 10/hour keyed by `observerId` (applied before the `profiles.byObserverCode` lookup so the limiter can't be bypassed by varying the guessed code), rejects self-observation with a distinct error string, and is idempotent via `byObserverAndPatient` (repeated redemption of the same code returns the existing link id instead of inserting a duplicate row)
- `getObservedPatients` query: single call returns every linked patient's today summary (meal count, calories total/target, latest glucose reading, steps, `isGlucometerTrack`) with `isCaloriesExceeded`/`isGlucoseOutOfRange` computed server-side via the plan-01 `thresholds.ts` module — `isGlucoseOutOfRange` aggregates over ALL of today's readings (`.some(...)`), not just the latest, so an earlier out-of-range value doesn't disappear behind a later normal one
- `getPatientToday` query: the only function in the phase that accepts a foreign `patientId` from the client — `assertObserverAccess(ctx, patientId)` is the first `await` inside `try`, before any `ctx.db` call on patient data, with no conditional bypass path. Response is a hand-written whitelist (`meals`, `glucoseReadings`, `bloodPressureReadings`, `movement`, `targets`, `isGlucometerTrack`, `displayName`) — `observerCode` and the rest of `profile.data` (anthropometry, goals, glucometer type) are never included
- `convex/rateLimit.ts` gained a second rate limit key (`observerCodeRedeem`, fixed window, 10/hour) alongside the existing `aiFeatures` limit, which was left untouched

## Task Commits

Each task was committed atomically:

1. **Task 1: Погашение кода с защитой от перебора и самонаблюдения** - `f963557` (feat)
2. **Task 2: Список наблюдаемых со сводкой за сегодня и флагами предупреждений** - `abf52fe` (feat)
3. **Task 3: Детальные данные одного пациента за сегодня через шлюз авторизации** - `dad9cae` (feat)

_No SUMMARY/metadata commit yet — this commit follows below._

## Files Created/Modified
- `convex/observers/redeemCode.ts` - Mutation: code format check -> rate limit -> profile lookup by `byObserverCode` -> self-observation guard -> idempotent link lookup/insert
- `convex/observers/getObservedPatients.ts` - Query: iterates `observerLinks.byObserverId`, computes today's summary + warning flags per linked patient, zero writes
- `convex/observers/getPatientToday.ts` - Query: `assertObserverAccess` gate then whitelisted today-scoped read of one patient's data
- `convex/rateLimit.ts` - Added `observerCodeRedeem: { kind: "fixed window", rate: 10, period: HOUR }` next to unchanged `aiFeatures`
- `convex/_generated/api.d.ts` - Convex codegen output, regenerated after each of the three deploys

## Decisions Made
- Timezone approximation for "patient's today" uses the observer's `timezoneOffsetMinutes` — this was a RESOLVED open question from RESEARCH.md carried verbatim into the plan's `<context>` block, not a decision made during this execution. Documented here per the plan's `<output>` instruction.
- Rate limit parameters (10/hour, keyed by `observerId`) exactly as specified in the plan — no discretion exercised.
- `displayName` resolution logic was written independently in both new query files rather than imported from `getMyObservers.ts` (plan 06-02's output), because that file does not exist in this worktree at execution time (06-02 runs in a parallel, not-yet-merged worktree per the wave-2 fan-out). Verified the underlying `@convex-dev/auth` `users` table exposes optional `name`/`email`/`phone` fields directly (via `node_modules/@convex-dev/auth/dist/server/implementation/types.d.ts`), so the reimplementation is not a guess — it's the same 4-line priority chain the plan specifies, applied at the source.

## Deviations from Plan

None - plan executed exactly as written. Two incidental setup steps were required and are not scope deviations:
1. Symlinked `node_modules` and copied the gitignored `.env.local` from the main repository checkout into this worktree (same pattern documented in `06-01-SUMMARY.md`'s "Issues Encountered") — required for `npx convex dev --once` to run non-interactively. Neither file is tracked or committed.
2. This worktree's `git reset --hard` correction at spawn time (HEAD was behind the expected wave-2 base commit `90b7958`, confirmed as a strict ancestor before resetting — no commits were at risk).

## Issues Encountered
- Initial `getObservedPatients.ts` draft used `Array<T>` for the results accumulator's type annotation, which the project's `@typescript-eslint/array-type` rule rejects in favor of `T[]`. Fixed inline before the Task 2 commit; no functional change.
- Worktree had no `node_modules` and no `.env.local` (both gitignored, so absent from any fresh git checkout/worktree). Resolved as described in Decisions Made — this is expected worktree setup, not a plan gap.

## User Setup Required

None - no external service configuration required. (Convex dev deployment `keen-meerkat-110` already existed with the schema from plan 01; this plan only adds functions and one rate-limit key to it.)

## Next Phase Readiness
- `redeemCode`, `getObservedPatients`, and `getPatientToday` are live on the dev deployment and ready for the observer-side UI screens (plans 05/06) to call as `api.observers.redeemCode.default`, `api.observers.getObservedPatients.default`, `api.observers.getPatientToday.default`.
- `linkId` is present on every `getObservedPatients` result item, so the observer-side "remove from observed list" action (plan 06/07, `revokeLink`) has what it needs without an extra lookup.
- **Known limitation carried forward, not a blocker:** the observer-timezone approximation for "today" (see Decisions Made) means a patient card can show an incomplete day near midnight when observer and patient are in different timezones. This is a documented, accepted, self-correcting tradeoff — not something plans 04-07 need to work around, but worth surfacing if a future milestone revisits `profiles.timezone`.
- No blockers. Everything in this plan's `<must_haves>` and `<success_criteria>` was verified via `tsc`, `eslint`, targeted `grep`, and three successful `npx convex dev --once` deploys (see Verification Evidence below).

## Verification Evidence

```
npx tsc --noEmit                                                          -> clean (no output), all three times (once per task)
npx eslint convex/observers/ convex/rateLimit.ts                          -> clean (only baseline-browser-mapping info notice)
npx convex dev --once                                                     -> "Convex functions ready!" x3 (after each task)
grep -c 'observerCodeRedeem' convex/rateLimit.ts convex/observers/redeemCode.ts     -> 1, 1
grep -c 'Cannot observe yourself' convex/observers/redeemCode.ts                    -> 1
grep -c 'byObserverAndPatient' convex/observers/redeemCode.ts                       -> 1
grep -c 'aiFeatures' convex/rateLimit.ts                                            -> 2 (unchanged, present)
grep -c 'byObserverId' convex/observers/getObservedPatients.ts                      -> 1
grep -c 'isGlucoseOutOfRange\|isCaloriesExceeded' convex/observers/getObservedPatients.ts -> 7
grep -c 'localDayBoundaries' convex/observers/getObservedPatients.ts                -> 2 (import + single call, before the loop)
grep -c 'ctx.db.insert\|ctx.db.patch\|ctx.db.delete' convex/observers/getObservedPatients.ts convex/observers/getPatientToday.ts -> 0, 0
grep -c 'assertObserverAccess' convex/observers/getPatientToday.ts                  -> 2 (import + single call, first line in try)
grep -c 'getAuthUserId' convex/observers/getPatientToday.ts                         -> 0
grep -c 'observerCode' convex/observers/getPatientToday.ts                          -> 0
```

## Self-Check: PASSED

- `[ -f convex/observers/redeemCode.ts ]` -> FOUND
- `[ -f convex/observers/getObservedPatients.ts ]` -> FOUND
- `[ -f convex/observers/getPatientToday.ts ]` -> FOUND
- `git log --oneline` contains `f963557`, `abf52fe`, `dad9cae` -> all FOUND
- All task-level `<acceptance_criteria>` re-run and passing (see Verification Evidence)
- Plan-level `<verification>` block re-run and passing

---
*Phase: 06-observer-access*
*Completed: 2026-08-15*
