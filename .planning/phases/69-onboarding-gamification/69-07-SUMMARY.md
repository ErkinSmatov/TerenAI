---
phase: 69-onboarding-gamification
plan: 07
subsystem: notifications
tags: [convex, cron, internalMutation, push, reminders]

requires:
  - phase: 69-onboarding-gamification/69-01
    provides: "lib/notifications/reminderSchedule.ts (isWeighInDue, resolveDueMealPoint, isMealReminderDeduped), pushTokens/profiles schema fields"
  - phase: 69-onboarding-gamification/69-04
    provides: "convex/utils/streakDays.ts (computeStreakFromMealTimes)"
  - phase: 69-onboarding-gamification/69-06
    provides: "internal.notifications.sendPushNotification.default transport"
provides:
  - "convex/notifications/checkWeighInReminders.ts — internalMutation selecting users due for a weigh-in reminder, on a 7-day recurring cadence"
  - "convex/notifications/checkMealReminders.ts — internalMutation selecting users at a due meal point with no meal recorded in that window, streak-aware copy"
  - "convex/crons.ts — first cron file in the project, registers both checks on a 30-minute interval"
affects: [69-08]

tech-stack:
  added: []
  patterns:
    - "internalMutation (not internalAction) for cron-driven selection logic that must atomically patch a dedup timestamp alongside message formation, then hand off the actual network call to a scheduled internalAction via ctx.scheduler.runAfter(0, ...)"
    - "All reminder time arithmetic sourced exclusively from lib/notifications/reminderSchedule.ts — zero duplicated constants in Convex code, verified by grep-based acceptance criteria"

key-files:
  created:
    - convex/notifications/checkWeighInReminders.ts
    - convex/notifications/checkMealReminders.ts
    - convex/crons.ts
  modified:
    - convex/_generated/api.d.ts

key-decisions:
  - "Both checks iterate ctx.db.query(\"pushTokens\").collect() as the candidate list — one row per user (upsert from plan 69-06), so users without a token are simply unreachable and correctly excluded"
  - "Dedup timestamp (lastWeighInReminderSentAt/lastMealReminderSentAt) is patched in the same transaction as message formation, before scheduling delivery — prevents a second cron tick within the same window from re-selecting the same user"
  - "Zero-streak fallback body (\"Запишите приём пищи, чтобы начать серию\") applied uniformly across all three meal points per plan's Claude's Discretion clause — title stays point-specific"
  - "crons.ts interval fixed at 30 minutes to exactly match MEAL_REMINDER_WINDOW_MINUTES, with an inline comment explaining why (drift either direction causes double-send attempts or missed points for 30/45-minute-offset timezones)"

patterns-established:
  - "Pattern: cron-driven selection logic in Convex always splits into an internalMutation (atomic read+dedup-patch) that schedules a separate internalAction for any external network call — never fetch() directly from a mutation"

requirements-completed: [WEIGH-01, MEALPUSH-01, MEALPUSH-02]

duration: ~4min
completed: 2026-08-31
---

# Phase 69 Plan 07: Reminder Delivery Cron Summary

**Two `internalMutation` checks (`checkWeighInReminders`, `checkMealReminders`) select due users by delegating all time arithmetic to the plan-69-01 pure module, then queue delivery through the plan-69-06 push transport; `convex/crons.ts` (first cron file in the project) runs both every 30 minutes.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-08-31T04:59:04Z
- **Completed:** 2026-08-31T05:02:20Z
- **Tasks:** 2/2
- **Files modified:** 4 (3 created, 1 codegen-regenerated)

## Accomplishments

- `checkWeighInReminders`: iterates all `pushTokens`, resolves each user's profile by `byUserId`, honors the `weighInRemindersEnabled === false` toggle (undefined = enabled, matching the plan 69-03 settings screen), falls back to `profile._creationTime` for profiles predating `weightUpdatedAt`, and delegates the entire "due" decision to `isWeighInDue` from `lib/notifications/reminderSchedule.ts` — no duplicated day/window constants in the Convex file
- `checkMealReminders`: resolves the due meal point via `resolveDueMealPoint`, applies `isMealReminderDeduped`, checks for an existing non-deleted meal inside the point's time window (D-12 window-based interpretation — no `mealType` field introduced), computes streak via `computeStreakFromMealTimes` only for users who pass every prior gate, and builds streak-aware copy per point with a shared zero-streak fallback body
- `convex/crons.ts` created as the project's first cron file: two `crons.interval(..., { minutes: 30 }, ...)` registrations with an inline comment tying the 30-minute cadence to `MEAL_REMINDER_WINDOW_MINUTES`
- Both mutations patch their respective dedup timestamp in the same transaction as message formation, then hand off delivery via `ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification.default, { messages })` — no direct `fetch` in either mutation

## Task Commits

Each task was committed atomically:

1. **Task 1: Проверка и постановка напоминаний о взвешивании** - `ea7b256` (feat)
2. **Task 2: Проверка напоминаний о приёмах пищи и регистрация cron** - `7e7b824` (feat)

## Files Created/Modified

- `convex/notifications/checkWeighInReminders.ts` - internalMutation, weigh-in reminder selection + dedup patch + scheduled delivery
- `convex/notifications/checkMealReminders.ts` - internalMutation, meal reminder selection with window-based "already ate" check and streak-aware copy
- `convex/crons.ts` - registers both checks on a 30-minute interval
- `convex/_generated/api.d.ts` - regenerated via `npx convex codegen` (twice, after each task)

## Decisions Made

All prescribed values (texts verbatim from 69-UI-SPEC.md, toggle semantics, dedup mechanism, cron interval) were fixed by the plan and implemented as written. The one Claude's Discretion point (zero-streak fallback copy, uniform across all three meal points) was applied exactly as specified in the plan's action block.

## Deviations from Plan

None — plan executed exactly as written. Both tasks' acceptance criteria greps (internalMutation-only, no duplicated time constants, no `mealType` field, no duplicated hour literals, verbatim copy strings, `crons.interval` count of 2) passed on first verification without adjustment.

## Issues Encountered

None new. Pre-existing, out-of-scope eslint errors in `confirm-meal.tsx`/`confirm-phone.tsx`/`ConfirmMealItems.tsx` (documented in 69-01-SUMMARY.md and 69-06-SUMMARY.md) remain unchanged — confirmed via repo-wide `npx eslint .`, none of these files are touched by this plan.

## User Setup Required

None — no external service configuration required. End-to-end push delivery on a real device is explicitly deferred to plan 69-08 per this plan's own `<verification>` section (Convex actions/cron have no test harness in this project).

## Next Phase Readiness

- Both reminder checks are live in `convex/crons.ts` and will fire automatically once deployed — no further wiring needed
- Plan 69-08 (real-device verification) can rely on `checkWeighInReminders`/`checkMealReminders` being fully functional; the only untested path is the actual Expo Push API round-trip, which requires a physical device
- No blockers for plan 69-08

---
*Phase: 69-onboarding-gamification*
*Completed: 2026-08-31*

## Self-Check: PASSED

All created files verified present on disk (`convex/notifications/checkWeighInReminders.ts`, `convex/notifications/checkMealReminders.ts`, `convex/crons.ts`); both task commit hashes (`ea7b256`, `7e7b824`) verified present in `git log`.
