---
phase: 68-apple-health
plan: 06
subsystem: ui
tags: [expo-router, day-screen, month-history, readonly-cards]

# Dependency graph
requires:
  - phase: 68-apple-health (plan 03)
    provides: "Four month-scoped Convex queries: getMonthMeals, glucose/getMonthReadings, movement/getMonthMovement, bloodPressure/getMonthReadings"
provides:
  - "Route app/app/(home)/day/[date].tsx — day-detail screen parameterized by arbitrary YYYY-MM-DD date"
affects: [68-07, 68-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Arbitrary-date route reuses observedPatient/[patientId].tsx's readOnly-Home*Summary shape, but slices month-scoped queries by day-of-month index instead of fetching a dedicated per-patient snapshot"
    - "Manual YYYY-MM-DD parsing (split + local Date constructor + round-trip reconstruction check) instead of new Date(string) to avoid UTC-midnight parsing bug in negative-offset timezones"

key-files:
  created:
    - "app/app/(home)/day/[date].tsx"
  modified: []

key-decisions:
  - "Route param validity gates all four month-scoped Convex queries via useQuery's \"skip\" sentinel (not conditional hook calls) — hook call order stays identical across renders, but no query executes with invalid/unbounded input, per T-68-18 DoS mitigation"
  - "Loading state keys off only the meals query (rawMonthMeals === undefined), matching the observedPatient precedent exactly — glucose/blood-pressure/movement queries fall back to empty-length arrays immediately so a non-glucometer or non-iOS day still renders promptly"
  - "Empty-state and error-state render the same EmptyState component/heading (\"Нет данных за этот день\"), differing only in body text, per the plan's explicit \"тот же блок\" instruction"
  - "estimate prop deliberately never passed to HomeGlucoseSummary on this screen — the glucose estimate is computed relative to \"now\" and is meaningless attached to a historical date"

patterns-established: []

requirements-completed: [HIST-01]

# Metrics
duration: ~20min
completed: 2026-08-25
---

# Phase 68 Plan 06: Day-Screen Route for Arbitrary-Date Analytics Summary

**New route `app/app/(home)/day/[date].tsx` — a thin, read-only wrapper around the existing `Home*Summary` cards, parameterized by an arbitrary `YYYY-MM-DD` date and backed entirely by the month-scoped Convex queries from plan 68-03.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-25
- **Tasks:** 1/1 completed
- **Files modified:** 1 (created)

## Accomplishments

- `app/app/(home)/day/[date].tsx` — new route parsing the `date` search param, computing local month bounds via `getLocalMonthBounds`, and fetching the four month-scoped queries (`meals.getMonthMeals`, `glucose.getMonthReadings`, `bloodPressure.getMonthReadings`, `movement.getMonthMovement`), then slicing the result to the requested day by index.
- Manual date parsing (`date.split("-").map(Number)` + `new Date(year, month - 1, day)` + string round-trip reconstruction) — never passes the raw route string into the `Date` constructor, which would UTC-midnight-shift the date in negative-offset timezones.
- Validates the parsed date against a strict `^\d{4}-\d{2}-\d{2}$` regex, rejects `NaN` components, and rejects out-of-range values (e.g. "2026-02-31") via the reconstruction-mismatch check — invalid input renders an error state without ever issuing a month-scoped query (all four `useQuery` calls receive `"skip"`).
- All six cards (`HomeMacroSummary`, `HomeMicroSummary`, `HomeRecentlyLogged`, `HomeMovementSummary`, `HomeGlucoseSummary`, `HomeBloodPressureSummary`) rendered with `readOnly`, exactly mirroring the `observedPatient/[patientId].tsx` precedent — no new card UI written.
- `HomeMacroSummary` receives an explicit `targets={profile?.targets ?? undefined}` prop, since `readOnly` mode skips the internal profile query and would otherwise silently fall back to `profilesConfig` defaults instead of the user's real targets.
- Empty-day state (no meals, readings, blood pressure, or movement) and the invalid-parameter error state both render the same centered two-`Text` block, differing only in body copy, per the plan's UI-SPEC and copy contract.

## Task Commits

Each task was committed atomically:

1. **Task 1: Маршрут сводки дня по произвольной дате** - `5346596` (feat)

## Files Created/Modified

- `app/app/(home)/day/[date].tsx` - New route, 247 lines. Date-param parsing/validation, four month-scoped `useQuery` calls gated by route validity (and by `isGlucometerTrack`/`Platform.OS === "ios"` for the glucose/BP/movement queries), loading/error/empty states, and the read-only card composition.

## Decisions Made

- Loading state gates on `rawMonthMeals === undefined` only (not all four queries) — matches the `observedPatient/[patientId].tsx` precedent and keeps the screen responsive for users on the non-glucometer track (whose glucose/BP queries are permanently skipped and would otherwise never resolve to a truthy "loaded" signal).
- No `ErrorBoundary` export added — per the pattern map's explicit note, that convention is specific to "observer access revoked mid-session" (a `Forbidden` throw from a Convex query) and doesn't apply to a self-owned day screen with no such throw path.
- Header title is "Ошибка" for the invalid-date-parameter case (no formattable date exists to show); the loading-state title is "Загрузка…", copied verbatim from the `observedPatient` precedent.

## Deviations from Plan

None - plan executed exactly as written. The only adjustment was a lint-driven simplification during self-verification: `bounds` does not need a redundant `&& bounds` truthiness check alongside `isValidRoute` in the four `useQuery` argument expressions, because TypeScript's aliased-condition control-flow narrowing (the `isValidRoute` boolean is itself derived from `bounds !== null`) already narrows `bounds` to non-null wherever `isValidRoute` is checked truthy. `@typescript-eslint/no-unnecessary-condition` caught this; the redundant checks were removed, and a duplicate `new Date(date)` reference inside an explanatory code comment (not executable code) was reworded so the plan's automated verification grep (`! grep -qE 'new Date\(date\)'`) — which scans the whole file, not just code — passes.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

- The day-detail route is live at `/app/(home)/day/{YYYY-MM-DD}` and ready to be the navigation target for the calendar screen (`app/app/(home)/calendar.tsx`, expected from a sibling plan in this same wave/phase).
- No week-scoped query, no existing card component, and no other route was modified — `git status --short` after the task commit shows only the new file.

---
*Phase: 68-apple-health*
*Completed: 2026-08-25*

## Self-Check: PASSED

File `app/app/(home)/day/[date].tsx` verified present. Commit `5346596` verified present in `git log`.
