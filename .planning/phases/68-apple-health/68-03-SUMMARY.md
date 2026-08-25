---
phase: 68-apple-health
plan: 03
subsystem: api
tags: [convex, date-math, dst, query, month-history]

# Dependency graph
requires:
  - phase: 68-apple-health (plan 02)
    provides: "assertLocalMonthBounds, assertLocalMonthDates, getLocalMonthDayIndex (convex/utils/localMonthBounds.ts)"
provides:
  - "Four month-scoped Convex queries: getMonthMeals, glucose/getMonthReadings, movement/getMonthMovement, bloodPressure/getMonthReadings"
  - "Exact month analogs of the existing week queries — same auth/authorization/soft-delete/sort conventions, variable-length (28-31 day) instead of fixed 7"
affects: [68-04, 68-05, 68-06, 68-07, 68-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Month query = week query analog with fixed-7 constants replaced by dayStartsUtc.length - 1 (or monthDates.length - 1), otherwise byte-for-byte identical structure (auth check, index clause, sort, try/catch/logError)"

key-files:
  created:
    - convex/meals/getMonthMeals.ts
    - convex/glucose/getMonthReadings.ts
    - convex/movement/getMonthMovement.ts
    - convex/bloodPressure/getMonthReadings.ts
  modified:
    - convex/_generated/api.d.ts

key-decisions:
  - "Manually patched convex/_generated/api.d.ts instead of running npx convex codegen — this worktree sandbox has no CONVEX_DEPLOYMENT configured (auth gate, cannot be invented), so the CLI cannot connect. api.d.ts entries are a deterministic transform of the convex/ file tree (module path -> import alias -> map key), reproduced by hand exactly matching the existing entries' format. api.js needs no changes (uses the anyApi runtime proxy, not per-function codegen). Also added the utils/localMonthBounds entry that plan 68-02 left un-codegen'd for the same reason."

patterns-established: []

requirements-completed: [HIST-01]

# Metrics
duration: ~25min
completed: 2026-08-25
---

# Phase 68 Plan 03: Month-Scoped Convex Queries Summary

**Four Convex queries (`getMonthMeals`, `glucose/getMonthReadings`, `movement/getMonthMovement`, `bloodPressure/getMonthReadings`) that are byte-for-byte structural analogs of the existing week queries, generalized to variable month length via the plan-68-02 validators.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-08-25
- **Tasks:** 2/2 completed
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments
- `convex/meals/getMonthMeals.ts` — variable-length month analog of `getWeekMeals`, buckets by `_creationTime` via `getLocalMonthDayIndex`, preserves the `q.neq(q.field("status"), "deleted")` soft-delete filter verbatim
- `convex/glucose/getMonthReadings.ts` — variable-length month analog of `glucose/getWeekReadings`, buckets by `recordedAt` via the `byUserIdAndRecordedAt` index
- `convex/movement/getMonthMovement.ts` — variable-length month analog of `getWeekMovement`, uses the date-string index directly (`byUserIdAndDate`) with a `Map` lookup, no timestamp bucketing needed (matches the plan's noted shape difference from the meals/glucose queries)
- `convex/bloodPressure/getMonthReadings.ts` — variable-length month analog of `bloodPressure/getWeekReadings`, buckets by `_creationTime` (table has no `recordedAt` field, confirmed via the week analog)
- All four enforce `getAuthUserId(ctx)` + `throw new Error("Unauthorized")` first in the handler, and a mandatory `.eq("userId", userId)` clause in every `withIndex` call (T-68-07 IDOR mitigation)
- All four validate client-supplied bounds via `assertLocalMonthBounds`/`assertLocalMonthDates` before touching the database (T-68-08 DoS mitigation)
- `npm run script:verifyMonthBucketing` still green after the new queries were added

## Task Commits

Each task was committed atomically:

1. **Task 1: Месячные запросы блюд и показаний глюкозы** - `762b7d6` (feat)
2. **Task 2: Месячные запросы движения и давления** - `ff66695` (feat)
   - Includes manual `convex/_generated/api.d.ts` patch (see Deviations)

## Files Created/Modified
- `convex/meals/getMonthMeals.ts` - Month analog of `getWeekMeals`, `dayStartsUtc: v.array(v.number())` args
- `convex/glucose/getMonthReadings.ts` - Month analog of `glucose/getWeekReadings`, same args shape
- `convex/movement/getMonthMovement.ts` - Month analog of `getWeekMovement`, `monthDates: v.array(v.string())` args
- `convex/bloodPressure/getMonthReadings.ts` - Month analog of `bloodPressure/getWeekReadings`, `dayStartsUtc: v.array(v.number())` args, buckets by `_creationTime`
- `convex/_generated/api.d.ts` - Manually added entries for the four new modules plus `utils/localMonthBounds` (see Deviations)

## Decisions Made
- No structural deviation from the plan's byte-for-byte "copy the week query, replace the fixed-7 constants" instruction — each file was written directly against the read week analog with only the documented substitutions (import source, bounds variable names, array length expression, index bound expression).
- `convex/_generated/api.d.ts` patched manually rather than via `npx convex codegen` (see Deviations below) — this is a mechanical reproduction of what codegen would output, not an invented value.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `npx convex codegen` cannot run in this worktree (no CONVEX_DEPLOYMENT)**
- **Found during:** Task 2 verification (`npx tsc --noEmit && npx eslint ... && npx convex codegen`)
- **Issue:** `npx convex codegen` failed with `No CONVEX_DEPLOYMENT set, run 'npx convex dev' to configure a Convex project`. This worktree has no `.env.local` (gitignored, per PROJECT.md) and no deployment credentials — this is an authentication/configuration gate, not something the executor can fabricate. Plan 68-02's summary confirms the same gap existed then: `convex/utils/localMonthBounds.ts` (a plain utility, no Convex function) was never added to `api.d.ts` either, because codegen could not run in that execution either.
- **Fix:** Manually edited `convex/_generated/api.d.ts` (a git-tracked generated file) to add the five missing entries — `meals/getMonthMeals`, `glucose/getMonthReadings`, `movement/getMonthMovement`, `bloodPressure/getMonthReadings` (this plan's four new functions) and `utils/localMonthBounds` (missed by 68-02 for the same reason) — using the exact same `import type * as <alias> from "../<path>.js";` / `"<path>": typeof <alias>;` pattern as every existing entry, in alphabetical order matching the file's existing sort convention. Did not touch `convex/_generated/api.js`, which uses the runtime `anyApi` proxy and requires no per-function changes.
- **Files modified:** `convex/_generated/api.d.ts`
- **Verification:** `npx tsc --noEmit` passes cleanly (imports resolve, `typeof` references are valid); the acceptance criterion's grep checks for all four new query paths pass; the generated file's structure was diffed against the existing entries to confirm the pattern match is exact.
- **Committed in:** `ff66695` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking, environment limitation)
**Impact on plan:** Necessary to satisfy the plan's stated acceptance criterion ("После `npx convex codegen` в `convex/_generated/api.d.ts` присутствуют записи ...") given the sandboxed worktree cannot reach a Convex deployment. No invented values — the patch is a deterministic, mechanical transform of the file tree that any real `npx convex dev`/`npx convex codegen` run (once a deployment is configured) would reproduce identically. Flagging this so a real codegen run happens the next time someone has `CONVEX_DEPLOYMENT` configured, as a sanity check.

## Issues Encountered
None beyond the codegen environment limitation documented above.

## User Setup Required

None - no external service configuration required for this plan's own scope. (Pre-existing gap, not introduced by this plan: whoever next runs `npx convex dev` with real deployment credentials should let codegen regenerate `api.d.ts` once, to confirm the manual patch above matches byte-for-byte.)

## Next Phase Readiness
- All four month-scoped queries exist, are typed, auth-checked, and validate bounds before hitting the database — ready to be called from the calendar/day-screen UI plans later in this wave sequence (68-04 onward, per `affects`).
- No week query was modified — `getWeekMeals.ts`, `glucose/getWeekReadings.ts`, `movement/getWeekMovement.ts`, `bloodPressure/getWeekReadings.ts` are byte-identical to their pre-plan state (confirmed via `git status --short` showing no changes to those paths).
- Flag for whoever runs the next real `npx convex codegen`: verify the manually-patched `api.d.ts` entries match exactly (they should, but this is a hand-authored reproduction of a generated artifact).

---
*Phase: 68-apple-health*
*Completed: 2026-08-25*

## Self-Check: PASSED

All created files verified present: `convex/meals/getMonthMeals.ts`, `convex/glucose/getMonthReadings.ts`, `convex/movement/getMonthMovement.ts`, `convex/bloodPressure/getMonthReadings.ts`. `convex/_generated/api.d.ts` modification verified present. All task commits verified present in `git log`: `762b7d6`, `ff66695`.
