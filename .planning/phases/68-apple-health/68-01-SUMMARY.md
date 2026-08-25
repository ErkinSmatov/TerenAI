---
phase: 68-apple-health
plan: 01
subsystem: infra
tags: [react-native, healthkit, appstate, sentry, convex]

# Dependency graph
requires: []
provides:
  - "AppState-driven HealthKit re-sync with in-memory 5-minute throttle, replacing the permanent hasSyncedRef lock"
  - "logHealthKitSync diagnostic helper (Sentry breadcrumb always, console.log in __DEV__) for on-device HEALTH-01 root-cause diagnosis"
affects: [68-apple-health]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AppState.addEventListener('change', ...) foreground-triggered re-sync with useRef<number> in-memory throttle (no SecureStore persistence — cold start always syncs)"
    - "Diagnostic breadcrumb helper pattern: Sentry.addBreadcrumb always + console.log gated on __DEV__, fully wrapped in try/catch"

key-files:
  created:
    - lib/health/logHealthKitSync.ts
  modified:
    - lib/hooks/useHealthKitSync.ts

key-decisions:
  - "Throttle timestamp updates before the isHealthKitConnected() check (not after success) so repeated foreground transitions within 5 minutes never re-issue the SecureStore read or native queries, closing T-68-01 (DoS) as tightly as possible"
  - "Diagnostic payloads carry only aggregates (count, latest date/ISO timestamp) — never raw glucose values or healthKitUuid — per T-68-02 mitigation"

patterns-established:
  - "Diagnostic breadcrumb helper pattern (lib/health/logHealthKitSync.ts) for future non-UI observability needs: Sentry.addBreadcrumb always, console.log gated on __DEV__, try/catch swallowing errors"

requirements-completed: [HEALTH-01]

duration: 5min
completed: 2026-08-25
---

# Phase 68 Plan 01: Apple Health Sync Reliability Fix Summary

**Removed the permanent `hasSyncedRef` lock that silently blocked glucose import on the glucometer track, and added AppState-driven re-sync with a 5-minute in-memory throttle plus three-stage diagnostic breadcrumbs to distinguish the remaining native-staleness hypothesis on-device.**

## Performance

- **Duration:** ~5 min (commit-to-commit)
- **Started:** 2026-08-25T14:46Z
- **Completed:** 2026-08-25T14:50Z
- **Tasks:** 2 completed
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Deleted `hasSyncedRef` — the verified root cause of glucose HealthKit import never firing when `includeGlucose` was still `false` on the first render (profile query not yet resolved)
- Added `AppState.addEventListener("change", ...)`-driven re-sync so movement/glucose sync re-runs on every foreground transition, not just once per process life, with proper `subscription.remove()` cleanup
- Added an in-memory `SYNC_THROTTLE_MS = 5 * 60 * 1000` guard (T-68-01 DoS mitigation) — no persistence, so cold starts always sync
- Added `lib/health/logHealthKitSync.ts`, a diagnostic helper that leaves an aggregate-only trail (sample counts + latest timestamps, never raw values or `healthKitUuid` — T-68-02) at three sync stages, observable via Sentry breadcrumbs in TestFlight and console in dev

## Task Commits

1. **Task 1: Диагностический хелпер синхронизации HealthKit** - `35b62a3` (feat)
2. **Task 2: Убрать постоянную ref-блокировку и добавить ре-синхронизацию по возврату из фона** - `eaed872` (fix)

**Plan metadata:** (pending — this commit)

## Files Created/Modified
- `lib/health/logHealthKitSync.ts` - New diagnostic helper: `logHealthKitSync(stage, payload)`, Sentry breadcrumb always + `console.log` in dev, fully try/catch-wrapped
- `lib/hooks/useHealthKitSync.ts` - Rewritten: no `hasSyncedRef`, `AppState`-driven re-sync on foreground, 5-minute in-memory throttle, three diagnostic log points (`movement-fetched`, `glucose-fetched`, `skipped-throttle`); public signature `useHealthKitSync(includeGlucose: boolean): void` unchanged; `app/app/(tabs)/index.tsx` untouched

## Decisions Made
- Throttle timestamp is updated before the `isHealthKitConnected()` check, not only after a successful sync, so the 5-minute window applies to every foreground-triggered attempt uniformly (tighter DoS mitigation, T-68-01)
- Diagnostic breadcrumb payloads are aggregate-only (`count`, `latestDate`/`latestRecordedAt`) — no raw glucose values or `healthKitUuid`, per T-68-02 in the plan's threat model

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- HEALTH-01's JS-level fixes (ref-lock removal + AppState re-sync + throttle) are in place and verified via `tsc`/`eslint`/grep-based acceptance criteria
- Real on-device verification (multi-day observation window without force-quit, comparing `logHealthKitSync` breadcrumb output across sessions to confirm/rule out the remaining native-staleness hypothesis, upstream issue #330) is explicitly deferred to plan 68-08 per this plan's `success_criteria` — requires a human with a physical iOS device
- `hasSyncedRef` fully removed; no known blockers for the remaining phase 68 plans (GLU-01, HIST-01, HIST-02)

## Deferred Issues

Pre-existing `npx eslint .` failures in files not touched by this plan (out of scope, logged to `.planning/phases/68-apple-health/deferred-items.md`):
- `app/app/(meal)/confirm-meal.tsx` (5 `@typescript-eslint/no-confusing-void-expression`)
- `app/auth/confirm-phone.tsx` (1 `@typescript-eslint/no-floating-promises`)
- `components/meal/ConfirmMealItems.tsx` (2 `@typescript-eslint/no-confusing-void-expression`)

## Known Stubs

None.

---
*Phase: 68-apple-health*
*Completed: 2026-08-25*

## Self-Check: PASSED

- FOUND: lib/health/logHealthKitSync.ts
- FOUND: lib/hooks/useHealthKitSync.ts
- FOUND: .planning/phases/68-apple-health/68-01-SUMMARY.md
- FOUND: commit 35b62a3
- FOUND: commit eaed872
