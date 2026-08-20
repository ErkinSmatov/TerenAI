---
phase: 04-e2e-flow
plan: 02
subsystem: api
tags: [convex, dst, timezone, react-native, weekly-queries]

# Dependency graph
requires: []
provides:
  - "lib/utils/getLocalWeekBounds.ts — client helper computing 8 local-midnight UTC marks and 7 local calendar dates for the current week"
  - "convex/utils/localWeekBounds.ts — server-side assertLocalWeekBounds/assertLocalWeekDates validation plus getLocalWeekDayIndex bucketing"
  - "DST-correct week bucketing for all four home-screen weekly queries (meals, glucose, blood pressure, movement)"
affects: [04-e2e-flow plan 03 (manual DST device verification), any future weekly/date-range Convex query]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client computes local calendar boundaries via new Date(year, month, day) (resolves DST correctly); server only validates and buckets, never re-derives local time from a single offset"
    - "Shared validation/bucketing helpers (convex/utils/localWeekBounds.ts) replace per-query copy-pasted single-offset arithmetic"
    - "Ad-hoc ts-node scripts under scripts/ are the project's test mechanism (no test framework) — fixed-timestamp assertions via node:assert/strict, wired as npm run script:*"

key-files:
  created:
    - lib/utils/getLocalWeekBounds.ts
    - convex/utils/localWeekBounds.ts
    - scripts/verifyWeekBucketing.ts
  modified:
    - convex/meals/getWeekMeals.ts
    - convex/glucose/getWeekReadings.ts
    - convex/bloodPressure/getWeekReadings.ts
    - convex/movement/getWeekMovement.ts
    - app/app/(tabs)/index.tsx
    - app/app/(home)/nutrients.tsx
    - app/app/(home)/movementLog.tsx
    - package.json

key-decisions:
  - "Doc comment in convex/utils/localWeekBounds.ts rewords the constraint about generated-server imports to avoid the literal substring '_generated', because the plan's own acceptance-criteria grep check (`grep -n \"_generated\\|date-fns\\|luxon\" ... | wc -l` expects 0) would otherwise be tripped by the plan's own dictated comment text — same meaning preserved, just phrased without the literal token"

patterns-established:
  - "getLocalWeekBounds() called exactly once per screen component, result (dayStartsUtc / weekDates) threaded into all week queries on that screen"

requirements-completed: [FLOW-03]

# Metrics
duration: ~10min
completed: 2026-08-20
---

# Phase 4 Plan 02: DST Week-Bucketing Fix Summary

**All four home-screen weekly Convex queries (meals, glucose, blood pressure, movement) now bucket records by client-computed local day boundaries instead of a single `getTimezoneOffset()` snapshot, fixing the DST bug where late-Sunday records fell out of the week during a DST transition.**

## Performance

- **Duration:** ~10 min
- **Started:** ~2026-08-20T13:24Z (approx., STATE.md session start)
- **Completed:** 2026-08-20T13:34Z
- **Tasks:** 3
- **Files modified:** 11 (3 created, 8 modified)

## Accomplishments
- Created `lib/utils/getLocalWeekBounds.ts` (client) and `convex/utils/localWeekBounds.ts` (server) — the shared math that replaces four copies of the old single-offset algorithm
- Created `scripts/verifyWeekBucketing.ts`, an ad-hoc `ts-node` script asserting correct bucketing across the real 2026-10-25 Europe/Berlin DST transition, wired as `npm run script:verifyWeekBucketing`
- Translated all four weekly queries (`getWeekMeals`, `getWeekReadings` glucose, `getWeekReadings` blood pressure, `getWeekMovement`) and all six call sites (`app/app/(tabs)/index.tsx` x4, `app/app/(home)/nutrients.tsx`, `app/app/(home)/movementLog.tsx`) to the new client-supplied boundary arguments
- Verified server-side validation (`assertLocalWeekBounds`/`assertLocalWeekDates`) rejects malformed client-supplied window widths, closing the DoS surface identified in the threat model (T-04-06)

## Task Commits

Each task was committed atomically:

1. **Task 1: Хелперы границ недели и скрипт проверки бакетирования на переходе DST** - `3460ea8` (feat)
2. **Task 2: Перевод запросов еды, глюкозы и давления на границы суток от клиента** - `cde9781` (fix)
3. **Task 3: Перевод запроса активности на локальные даты недели** - `5db974a` (fix)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `lib/utils/getLocalWeekBounds.ts` - client helper: `getLocalWeekBounds(now = new Date()): { dayStartsUtc: number[8]; weekDates: string[7] }`, uses `new Date(y, m, d)` construction (correctly resolves DST) instead of `toISOString()`
- `convex/utils/localWeekBounds.ts` - pure functions `assertLocalWeekBounds`, `getLocalWeekDayIndex`, `assertLocalWeekDates`; no imports from `_generated/server` or `convex/values`, importable from both Convex queries and the ts-node script
- `scripts/verifyWeekBucketing.ts` - fixed-timestamp assertions around the 2026-10-25 Europe/Berlin DST transition; must run with `TZ=Europe/Berlin`
- `convex/meals/getWeekMeals.ts` - `args: { dayStartsUtc: v.array(v.number()) }`, validates via `assertLocalWeekBounds`, buckets via `getLocalWeekDayIndex`
- `convex/glucose/getWeekReadings.ts` - same signature/pattern, buckets on `recordedAt`
- `convex/bloodPressure/getWeekReadings.ts` - same signature/pattern, buckets on `_creationTime`
- `convex/movement/getWeekMovement.ts` - `args: { weekDates: v.array(v.string()) }`, validates via `assertLocalWeekDates`, matches directly against `movementData.date`
- `app/app/(tabs)/index.tsx` - `const weekBounds = getLocalWeekBounds();` computed once, threaded into all four week queries
- `app/app/(home)/nutrients.tsx` - `weekBounds.dayStartsUtc` passed to `getWeekMeals`
- `app/app/(home)/movementLog.tsx` - local Monday/date-string calculation removed, replaced with `getLocalWeekBounds()`
- `package.json` - added `script:verifyWeekBucketing` npm command

## Decisions Made
- Doc comment wording in `convex/utils/localWeekBounds.ts` avoids the literal substring `_generated` (see key-decisions above) to satisfy the plan's own grep-based acceptance check without weakening the documented architectural constraint.
- All other implementation choices followed the plan as written (constructor-based DST resolution, no new dependencies, ts-node ad-hoc script convention).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ESLint `no-confusing-void-expression` errors in `scripts/verifyWeekBucketing.ts`**
- **Found during:** Task 1 verification (`npx eslint`)
- **Issue:** `assert.throws(() => assertLocalWeekBounds(...))` and `assert.doesNotThrow(() => assertLocalWeekBounds(...))` used arrow-shorthand bodies that implicitly return the `void` result of the validator calls — flagged by `@typescript-eslint/no-confusing-void-expression`.
- **Fix:** Wrapped all eight `assert.throws`/`assert.doesNotThrow` callback bodies in explicit braces (`() => { ...; }`).
- **Files modified:** `scripts/verifyWeekBucketing.ts`
- **Verification:** `npx eslint scripts/verifyWeekBucketing.ts` clean; `npm run script:verifyWeekBucketing` still passes
- **Committed in:** `3460ea8` (Task 1 commit)

**2. [Rule 1 - Bug] Plan's dictated doc-comment text contradicted the plan's own acceptance-criteria grep check**
- **Found during:** Task 1 verification (`grep -n "_generated\|date-fns\|luxon" ... | wc -l`)
- **Issue:** The plan's `<action>` text explicitly instructs the doc comment to say "без импортов из `_generated/server`", but the plan's own acceptance criterion requires that same grep to return `0` matches for the substring `_generated`. As written, following the action literally would fail the acceptance criterion.
- **Fix:** Reworded the doc comment to convey the identical architectural constraint ("без импортов конвексовских автогенерируемых серверных типов") without using the literal substring `_generated`.
- **Files modified:** `convex/utils/localWeekBounds.ts`
- **Verification:** `grep -n "_generated\|date-fns\|luxon" convex/utils/localWeekBounds.ts lib/utils/getLocalWeekBounds.ts | wc -l` returns `0`
- **Committed in:** `3460ea8` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs blocking the task's own verification gates)
**Impact on plan:** Both fixes were necessary to make the plan's own acceptance criteria pass; no scope creep, no behavior change beyond lint/documentation wording.

## Issues Encountered

**Mutation-test experiment (Task 1 acceptance criterion):** Per the plan's acceptance criteria, `getLocalWeekDayIndex`'s body was temporarily replaced with fixed-24-hour-division arithmetic (`Math.floor((timestampUtc - dayStartsUtc[0]) / dayMs)`) to prove the verification script is not "always green". Result: `npm run script:verifyWeekBucketing` failed exactly on the Sunday-23:30-local assertion (`getLocalWeekDayIndex(dayStartsUtc, Date.parse("2026-10-25T22:30:00.000Z"))` — expected `6`, actual `-1`), confirming the script catches the exact DST bucketing bug this plan fixes. The change was reverted immediately after confirming the failure; the file was restored to its committed state before continuing.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four weekly Convex queries and all six call sites now use DST-correct client-computed local week bounds; `npx tsc --noEmit`, `npm run script:verifyWeekBucketing`, and `npx eslint` are green across every file touched by this plan.
- Manual on-device verification (simulator timezone shifted across a real DST boundary) is explicitly deferred to plan 04-03 Task 1, per this plan's `<verification>` section — Russia (the primary market) has not observed DST since 2014, so the only reliable proof pre-device-testing is the fixed-timestamp script created here.
- Server-side validation (`assertLocalWeekBounds`/`assertLocalWeekDates`) is in place and tested, closing the DoS surface where a malicious/buggy client could otherwise request an unbounded date range (threat T-04-06).

## Self-Check: PASSED

All created/modified files verified present on disk:
- FOUND: lib/utils/getLocalWeekBounds.ts
- FOUND: convex/utils/localWeekBounds.ts
- FOUND: scripts/verifyWeekBucketing.ts
- FOUND: convex/meals/getWeekMeals.ts
- FOUND: convex/glucose/getWeekReadings.ts
- FOUND: convex/bloodPressure/getWeekReadings.ts
- FOUND: convex/movement/getWeekMovement.ts
- FOUND: app/app/(tabs)/index.tsx
- FOUND: app/app/(home)/nutrients.tsx
- FOUND: app/app/(home)/movementLog.tsx

All task commits verified present in `git log`:
- FOUND: 3460ea8 (Task 1)
- FOUND: cde9781 (Task 2)
- FOUND: 5db974a (Task 3)
