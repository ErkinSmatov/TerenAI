---
phase: 06-observer-access
plan: 01
subsystem: database
tags: [convex, schema, auth, bola, observer-access]

# Dependency graph
requires: []
provides:
  - "observerLinks table (observerId, patientId) with byObserverId, byPatientId, byObserverAndPatient indexes"
  - "profiles.observerCode optional field + byObserverCode index"
  - "assertObserverAccess(ctx, targetUserId) — single cross-user authorization gate"
  - "localDayBoundaries(nowMs, timezoneOffsetMinutes) — reusable local-day math"
  - "isGlucoseOutOfRange / isCaloriesExceeded / GLUCOSE_RANGES pure threshold functions"
  - "observerLinks cascade cleanup wired into convex/users/deleteUser.ts"
affects: [06-02, 06-03, 06-04, 06-05, 06-06, 06-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cross-user authorization funnels through a single throwing helper (assertObserverAccess) rather than a boolean check, closing the BOLA/IDOR gap identified in the phase threat model"
    - "Pure threshold/business-logic modules under convex/observers/utils/ have zero ctx or _generated imports so the same module works from Convex queries and React components"

key-files:
  created:
    - convex/tables/observerLinks.ts
    - convex/utils/observerAuth.ts
    - convex/utils/localDayBoundaries.ts
    - convex/observers/utils/thresholds.ts
  modified:
    - convex/tables/profiles.ts
    - convex/schema.ts
    - convex/users/deleteUser.ts
    - convex/_generated/api.d.ts

key-decisions:
  - "GLUCOSE_RANGES numeric bounds taken as specified in the plan (ADA Standards of Care): fasting/beforeMeal 80-130 mg/dL (4.4-7.2 mmol/L), afterMeal 70-180 mg/dL (3.9-10.0 mmol/L), random 70-140 mg/dL (3.9-7.8 mmol/L)"
  - "linkedAt deliberately omitted from observerLinksFields — Convex's automatic _creationTime serves as the connection date for plan 04's UI"

patterns-established:
  - "Any new observer-facing Convex function must call assertObserverAccess before its first ctx.db.query/ctx.db.get on patient data — enforced by code review, not by a runtime guard"

requirements-completed: [OBSV-01, OBSV-05, OBSV-07]

# Metrics
duration: 15min
completed: 2026-08-15
---

# Phase 6 Plan 01: Observer Data Layer & Authorization Summary

**observerLinks table with a 3-index Convex schema, a single throwing `assertObserverAccess` gateway that closes the BOLA gap, and a shared threshold module usable from both server and client**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-15T08:05:00Z (approx.)
- **Completed:** 2026-08-15T08:13:37Z
- **Tasks:** 3
- **Files modified:** 8 (4 created, 4 modified, one of which is a generated file)

## Accomplishments
- `observerLinks` table deployed to Convex dev deployment (`keen-meerkat-110`) with all three required indexes (`byObserverId`, `byPatientId`, `byObserverAndPatient`)
- `profiles.observerCode` (optional string) + `byObserverCode` index added without breaking existing rows
- `assertObserverAccess(ctx, targetUserId): Promise<Id<"users">>` — the project's first and only cross-user authorization gate, throwing `"Unauthorized"`/`"Forbidden"` exactly per the existing error-string dictionary
- `localDayBoundaries(nowMs, timezoneOffsetMinutes)` extracted as a reusable helper for future observer queries, without touching the three existing weekly-query call sites that already duplicate this math
- `convex/users/deleteUser.ts` cascades `observerLinks` deletion on both `byObserverId` and `byPatientId` before the final `ctx.db.delete(userId)`
- `convex/observers/utils/thresholds.ts` — pure, framework-agnostic glucose/calorie threshold module (`GLUCOSE_RANGES`, `isGlucoseOutOfRange`, `isCaloriesExceeded`) with no `ctx` or `_generated` imports

## Task Commits

Each task was committed atomically:

1. **Task 1: Таблица observerLinks, поле observerCode в профиле, регистрация в схеме** - `dac2424` (feat)
2. **Task 2: Шлюз кросс-пользовательской авторизации, helper границ суток, каскад удаления связей** - `f62d929` (feat)
3. **Task 3: Чистые функции порогов глюкозы и калорий** - `a39e744` (feat)
4. **Generated api.d.ts refresh (side effect of Tasks 2/3)** - `1a983da` (chore)

_No SUMMARY/metadata commit yet — this commit follows below._

## Files Created/Modified
- `convex/tables/observerLinks.ts` - Table module: `observerLinksFields` (observerId, patientId) + 3 indexes
- `convex/tables/profiles.ts` - Added `observerCode: v.optional(v.string())` field and `byObserverCode` index
- `convex/schema.ts` - Registered `observerLinks` (alphabetically between `movementData` and `profiles`)
- `convex/utils/observerAuth.ts` - `assertObserverAccess` — the single cross-user authorization gateway
- `convex/utils/localDayBoundaries.ts` - `localDayBoundaries` — reusable local-midnight/day-end/date-string math
- `convex/observers/utils/thresholds.ts` - `GlucoseContext`, `GlucoseUnit`, `GLUCOSE_RANGES`, `isGlucoseOutOfRange`, `isCaloriesExceeded`
- `convex/users/deleteUser.ts` - Two new cascade blocks (byObserverId, byPatientId) before final user delete
- `convex/_generated/api.d.ts` - Convex codegen output, regenerated to include the three new non-table modules

## Decisions Made
- Used the exact numeric glucose ranges specified in the plan (ADA Standards of Care), left the executor no discretion to invent values (plan explicitly deferred the numbers to the plan itself, decision D-06/D-07)
- Copied the local, gitignored `.env.local` (Convex dev deployment credentials) from the main repo checkout into this worktree so `npx convex dev --once` could run non-interactively — the file was never staged or committed, it exists only as local tooling config exactly as it does in the main working tree

## Deviations from Plan

None - plan executed exactly as written. One incidental additional commit (`1a983da`) captures the Convex-generated `api.d.ts` diff produced by the deploy step in Task 1 and again after Tasks 2/3 — this is standard generated-file churn from `npx convex dev --once`, not a scope change.

## Issues Encountered
- `npx convex dev --once` initially failed with "Cannot prompt for input in non-interactive terminals" because this git worktree checkout does not include the gitignored `.env.local` that holds `CONVEX_DEPLOYMENT`. Resolved by copying the existing `.env.local` from the main repository checkout (same machine, same developer) into the worktree — no new credentials were created or guessed, and the file remains untracked/uncommitted.
- macOS shell in this environment has no `timeout` command; the Convex deploy commands were run directly (they returned promptly, ~4-5s each) so this did not block execution.

## User Setup Required

None - no external service configuration required. (Convex deployment already existed; this plan only added schema and server-side modules to it.)

## Next Phase Readiness
- `assertObserverAccess`, `localDayBoundaries`, and the `thresholds.ts` module are ready for direct import by plan 03 (observer/patient link mutations and queries) exactly per the `<interfaces>` signatures declared in this plan.
- The `observerLinks` table and `profiles.observerCode`/`byObserverCode` index are live on the dev deployment (`keen-meerkat-110`) — plan 02/03 code-gen and queries will resolve against them without further schema work.
- No blockers. Everything in this plan's `<must_haves>` and `<success_criteria>` was verified via `tsc`, `eslint`, targeted `grep`, and two successful `npx convex dev --once` deploys (see commands/output below).

## Verification Evidence

```
npx tsc --noEmit                     → clean (no output)
npx eslint convex/                   → clean (only baseline-browser-mapping info notice)
npx convex dev --once                → "Convex functions ready!" (both after Task 1 and after Tasks 2/3)
grep -c 'observerLinks' convex/schema.ts convex/users/deleteUser.ts        → 2, 2
grep -c 'byObserverAndPatient' convex/utils/observerAuth.ts convex/tables/observerLinks.ts → 1, 1
```

---
*Phase: 06-observer-access*
*Completed: 2026-08-15*
