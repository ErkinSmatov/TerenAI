---
phase: 68-apple-health
plan: 07
subsystem: ui
tags: [expo-router, react-native-calendars, home-header, month-history]

# Dependency graph
requires:
  - phase: 68-apple-health (plan 03)
    provides: "getMonthMeals month-scoped Convex query"
  - phase: 68-apple-health (plan 06)
    provides: "Route app/app/(home)/day/[date].tsx — day-detail screen parameterized by arbitrary YYYY-MM-DD date"
provides:
  - "Route app/app/(home)/calendar.tsx — full-screen Russian-localized month calendar, Monday-start, marks days with meal data, blocks future dates, navigates to day/[date] on tap"
  - "Calendar-entry icon button in components/home/HomeHeader.tsx (44x44, grouped with streak counter)"
affects: [68-08]

# Tech tracking
tech-stack:
  added: ["react-native-calendars@1.1314.0"]
  patterns:
    - "Local type assertion (CalendarLocaleConfig) works around react-native-calendars' broken .d.ts, which re-exports LocaleConfig's type from the untyped xdate package, resolving to TypeScript's internal error type under typescript-eslint's type-aware rules"
    - "HomeHeader's two-child SafeArea layout (justifyContent: space-between) preserved by wrapping both header-right buttons in a new row View rather than adding a third direct child"

key-files:
  created:
    - "app/app/(home)/calendar.tsx"
  modified:
    - "components/home/HomeHeader.tsx"
    - "package.json"
    - "package-lock.json"

key-decisions:
  - "react-native-calendars chosen and installed per RESEARCH.md's pre-approved legitimacy audit — no additional human checkpoint needed before npm install (T-68-SC mitigation already satisfied at planning time)"
  - "Data-day dots use getColor(\"mutedForeground\", 0.4) (gray), not the primary/blue accent — UI-SPEC reserves accent color exclusively for the selected-date fill and today's text color on this screen"
  - "maxDate computed via manual getFullYear/getMonth+1/getDate + padStart (same pattern as getLocalMonthBounds' toLocalDateString), not toISOString(), to avoid a UTC-midnight shift disallowing today's date in negative UTC offsets"
  - "No lower date bound (no minDate) — backward month navigation is unrestricted; only future dates are blocked"

patterns-established: []

requirements-completed: [HIST-02]

# Metrics
duration: ~30min
completed: 2026-08-25
---

# Phase 68 Plan 07: Calendar Entry Point and Month History Route Summary

**New full-screen `app/app/(home)/calendar.tsx` route (react-native-calendars, Russian locale, Monday-start week) reachable via a new 44×44 icon button in `HomeHeader.tsx`, closing the HIST-02 path: home screen → calendar → tap a date → existing day-detail screen (plan 68-06).**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-08-25
- **Tasks:** 3/3 completed
- **Files modified:** 3 (1 created, 2 modified: HomeHeader.tsx, package.json/package-lock.json)

## Accomplishments

- Installed `react-native-calendars@1.1314.0` (pure JS, no native module — legitimacy pre-audited in `68-RESEARCH.md`, no rebuild required).
- `app/app/(home)/calendar.tsx` — new full-screen route using the same `ScreenMain`/`ScreenHeader`/`ScreenMainScrollView` shell as `glucoseLog.tsx`. Sets `LocaleConfig.locales.ru` (Russian month/day names) once at module scope, `firstDay={1}` for Monday-start weeks, `maxDate` blocking future dates, `markedDates` from `getMonthMeals` (gray dot, not accent color) recomputed per visible month via `onMonthChange`, and `onDayPress` routing to `/app/(home)/day/[date]` with the tapped `dateString`.
- `components/home/HomeHeader.tsx` — added a `CalendarDaysIcon` button (44×44, `accessibilityLabel="Открыть календарь"`) grouped with the existing streak-counter button inside a new row `View`, preserving the root `SafeArea`'s exactly-two-direct-children `justifyContent: "space-between"` layout. Calendar button is leftmost in the group; streak counter remains rightmost (unchanged position).

## Task Commits

Each task was committed atomically:

1. **Task 1: Установить react-native-calendars** - `01f0823` (chore)
2. **Task 2: Маршрут календаря** - `2a527f2` (feat)
3. **Task 3: Вход в календарь в шапке главного экрана** - `4724607` (feat)

## Files Created/Modified

- `app/app/(home)/calendar.tsx` - New route, 177 lines. Locale config, month-bounds state, `getMonthMeals`-derived marks, theme mapped to `getColor()` tokens, day-press navigation.
- `components/home/HomeHeader.tsx` - Added `iconGroup` wrapper View and `calendarContainer` style; new calendar button; no other logic changed.
- `package.json` / `package-lock.json` - `react-native-calendars` dependency added (single line in `dependencies`, zero other changes).

## Decisions Made

- Data-day dots are gray (`mutedForeground` at 0.4 opacity), not accent-colored, per UI-SPEC's reservation of `primary`/`blue` for the selected-date fill and today's text only.
- `maxDate` uses the same manual local-date-string construction as `getLocalMonthBounds.toLocalDateString`, avoiding `toISOString()`'s UTC-midnight shift bug.
- No `minDate` — backward navigation through history is unrestricted, matching the planner's explicit resolution of the "how far back" discretion point.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Worked around react-native-calendars' broken `LocaleConfig` type declaration**
- **Found during:** Task 2, first `eslint` verification pass
- **Issue:** `react-native-calendars`'s `index.d.ts` re-exports `LocaleConfig`'s type from the untyped `xdate` package (`export { default as LocaleConfig } from 'xdate'`), which has no `.d.ts` of its own. TypeScript resolves this to its internal `error` type, and `@typescript-eslint/no-unsafe-member-access` flags every `.locales`/`.defaultLocale` access as unsafe. This is an upstream declaration bug in the package itself, not a codebase issue — `npx tsc --noEmit` alone didn't surface it (implicit-any-like behavior), but the project's lint config's type-aware rules did.
- **Fix:** Imported the raw export as `RawLocaleConfig`, defined a local `CalendarLocaleConfig` type describing the actual runtime shape (`locales: Record<string, {monthNames, monthNamesShort, dayNames, dayNamesShort}>`, `defaultLocale: string`), and cast via `as unknown as CalendarLocaleConfig`. Also switched `LocaleConfig.locales["ru"]` to dot notation (`LocaleConfig.locales.ru`) per `@typescript-eslint/dot-notation`.
- **Files modified:** `app/app/(home)/calendar.tsx`
- **Commit:** `2a527f2`

**2. [Rule 1 - Bug] Reworded a comment to avoid the literal string "toISOString" tripping the plan's automated verify grep**
- **Found during:** Task 2, plan verification (`! grep -q "toISOString"`)
- **Issue:** An explanatory comment about why `toISOString()` is not used for local-date formatting itself contained the literal substring `toISOString`, causing the plan's automated no-UTC-shift check to fail even though the actual code never calls it — the same class of self-referential grep issue documented in plan 68-06's SUMMARY for a similar `new Date(date)` comment.
- **Fix:** Reworded the comment to describe the avoided API ("Стандартный ISO-сериализатор Date") without using the literal method name.
- **Files modified:** `app/app/(home)/calendar.tsx`
- **Commit:** `2a527f2`

**3. [Rule 1 - Bug] Added explicit `padding: 0` to the new calendar-button `Card` style**
- **Found during:** Task 3, implementation
- **Issue:** `Card`'s base style sets `padding: 20`, which is not fully overridden by a fixed `height: 44, width: 44` box — left uncorrected, the 20px icon would be nearly fully clipped inside the 44×44 touch target (only ~4px of vertical space would remain after the default padding).
- **Fix:** Added `padding: 0` to `calendarContainer` alongside `height`/`width: 44`, matching the effective sizing approach already used for the `removeButton` precedent in `ObservedPatientCard.tsx` (plain `Button`, not `Card`-wrapped, so it never had this issue — the plan's cited precedent didn't carry the padding pitfall over, requiring this addition).
- **Files modified:** `components/home/HomeHeader.tsx`
- **Commit:** `4724607`

## Issues Encountered

None beyond the three auto-fixed items above.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

- HIST-02 is fully closed end-to-end at the code level: home header → calendar → day screen (plan 68-06's route).
- End-to-end human verification (header → calendar → date → day screen, per the plan's own `<verification>` section item 5) is explicitly deferred to plan 68-08, matching the plan's stated scope boundary.
- `npx tsc --noEmit`, `npx eslint app/app/(home)/calendar.tsx`, `npx eslint components/home/HomeHeader.tsx`, and all three `script:verify*` scripts (`verifyMonthBucketing`, `verifyWeekBucketing`, `verifyGlucoseEstimate`) pass clean. A project-wide `npx eslint .` surfaces 8 pre-existing errors in three unrelated files (`confirm-meal.tsx`, `confirm-phone.tsx`, `ConfirmMealItems.tsx`) not touched by this plan — out of scope per the deviation-rules scope boundary, not fixed here.

---
*Phase: 68-apple-health*
*Completed: 2026-08-25*
