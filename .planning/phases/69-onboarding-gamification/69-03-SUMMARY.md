---
phase: 69-onboarding-gamification
plan: 03
subsystem: ui+profile
tags: [expo-router, convex, react-native-switch, weight-picker, push-settings]

requires:
  - phase: 69-onboarding-gamification/69-01
    provides: "profilesFields.weightUpdatedAt/weighInRemindersEnabled/mealRemindersEnabled top-level fields"
provides:
  - "SettingsToggleItem — first Switch-based settings row primitive in the codebase"
  - "app/app/(settings)/weeklyWeighIn.tsx — single-purpose weight update screen with auto target recalculation"
  - "app/app/(settings)/notificationSettings.tsx — two independent push-reminder toggles"
  - "Two new entries in app/app/(tabs)/settings.tsx top settings group"
affects: [69-06, 69-07, 69-08]

tech-stack:
  added: []
  patterns:
    - "SettingsToggleItem row (no Button/onPress wrapper, only Switch is interactive) — reusable inside SettingsGroup alongside SettingsItem"
    - "Full data-object spread before profiles.data patch (data: { ...profile.data, weight }) to avoid convex ctx.db.patch shallow-merge data loss"

key-files:
  created:
    - components/settings/SettingsToggleItem.tsx
    - app/app/(settings)/weeklyWeighIn.tsx
    - app/app/(settings)/notificationSettings.tsx
  modified:
    - app/app/(tabs)/settings.tsx

key-decisions:
  - "weeklyWeighIn.tsx uses WeightPicker directly (not OnboardingWeight) to avoid overwriting targetWeight on every weigh-in, per RESEARCH.md anti-pattern"
  - "notificationSettings.tsx toggles patch top-level profilesFields directly (no data spread needed — not subject to Pitfall 1)"
  - "Both reminder toggles default to true via `?? true` when the optional field is undefined on existing profiles"

patterns-established:
  - "Pattern: Switch-based settings toggle rows follow SettingsItem's container/border/height-52 shape but never wrap in Button — avoids accidental double-toggle from label taps"

requirements-completed: [WEIGH-02, PUSH-02]

duration: 25min
completed: 2026-08-30
---

# Phase 69 Plan 03: Weekly Weigh-In Screen + Notification Settings Summary

**New `SettingsToggleItem` Switch primitive backing two screens: a single-picker weight-update screen with automatic KБЖУ recalculation, and a notification-settings screen with two independent push-reminder toggles.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3/3
- **Files modified:** 4

## Accomplishments
- Built the project's first `Switch`-based settings row (`SettingsToggleItem`), row-compatible with `SettingsGroup`, with no `Button`/`onPress` on the row itself (only the `Switch` is interactive)
- Built `weeklyWeighIn.tsx`: single `WeightPicker` + one save button, reactive `computeNutritionTargets` recalculation gated by `"skip"`, full `profile.data` spread before patch, `weightUpdatedAt: Date.now()` stamped on every save
- Built `notificationSettings.tsx`: two `SettingsToggleItem` rows independently toggling `weighInRemindersEnabled`/`mealRemindersEnabled`, defaulting to `true` when unset
- Added "Обновить вес" and "Уведомления" entries to the top settings group in `app/app/(tabs)/settings.tsx`

## Task Commits

Each task was committed atomically:

1. **Task 1: Примитив SettingsToggleItem** - `380441f` (feat)
2. **Task 2: Лёгкий экран обновления веса с автопересчётом целей** - `917ccee` (feat)
3. **Task 3: Экран настроек уведомлений и точки входа в списке настроек** - `18f20d3` (feat)

## Files Created/Modified
- `components/settings/SettingsToggleItem.tsx` - Switch-based settings row, no Button wrapper
- `app/app/(settings)/weeklyWeighIn.tsx` - weight-only update screen with auto target recalculation
- `app/app/(settings)/notificationSettings.tsx` - two independent push-reminder toggles
- `app/app/(tabs)/settings.tsx` - two new `Link`+`SettingsItem` entries added to the top group

## Decisions Made
- All key decisions were already fixed by the plan (D-07, D-08, D-09, D-14) — executed as written without deviating from prescribed values

## Deviations from Plan

None — plan executed exactly as written. Two minor local corrections during implementation, neither a Rule 1-4 case:
1. Initial `onChange` callbacks in `weeklyWeighIn.tsx` used arrow-shorthand returning a `void` expression, which `@typescript-eslint/no-confusing-void-expression` (project ESLint config) rejects — wrapped in braces. Pure lint-compliance formatting, no logic change.
2. `app.config.ts`'s `experiments.typedRoutes: true` requires Expo Router's typed-routes manifest (`.expo/types/router.d.ts`, gitignored, machine-local) to be regenerated before `tsc --noEmit` recognizes the two new routes. Ran a one-shot `npx expo start --web` (started, waited for initial bundle, killed) to force regeneration — no source files were changed by this step, and the generated file is not tracked by git.

## Issues Encountered
- `.expo/types/router.d.ts` (gitignored, Expo Router codegen artifact) was stale relative to the two new route files added in Task 3, causing `tsc --noEmit` to report `TS2322` on the new `Link href="..."` usages until regenerated (see Deviations above). Resolved, not a code defect.
- Confirmed 8 pre-existing `eslint .` errors in `confirm-meal.tsx`/`confirm-phone.tsx`/`ConfirmMealItems.tsx` (documented in 69-01-SUMMARY.md as out-of-scope, introduced in unrelated earlier commits) remain present and untouched — none of these files are in this plan's `files_modified`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `weeklyWeighIn.tsx` is reachable both from Settings and as the deep-link target `/app/(settings)/weeklyWeighIn` that plan 69-06's push notifications will navigate to
- `weighInRemindersEnabled`/`mealRemindersEnabled` toggles are wired and default to `true`, ready for plan 69-07's cron to read with the same "undefined = enabled" interpretation
- `SettingsGroup` was not modified — no risk to existing settings screens
- No blockers for the next plan

---
*Phase: 69-onboarding-gamification*
*Completed: 2026-08-30*

## Self-Check: PASSED

All created/modified files verified present on disk (`components/settings/SettingsToggleItem.tsx`, `app/app/(settings)/weeklyWeighIn.tsx`, `app/app/(settings)/notificationSettings.tsx`, `app/app/(tabs)/settings.tsx`); all three task commit hashes (`380441f`, `917ccee`, `18f20d3`) verified present in `git log`.
