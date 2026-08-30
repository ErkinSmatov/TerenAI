---
phase: 69-onboarding-gamification
plan: 02
subsystem: home-navigation
tags: [streak, calendar, home-header, navigation]
requires: []
provides:
  - "app/app/(home)/streak.tsx — combined streak + month calendar screen"
  - "components/home/HomeHeader.tsx — streak button entry point"
affects:
  - "components/home/HomeHeader.tsx"
tech-stack:
  added: []
  patterns:
    - "Screen reuses Phase 68 calendar logic verbatim (markedDates, day-tap navigation)"
key-files:
  created:
    - app/app/(home)/streak.tsx
  modified:
    - components/home/HomeHeader.tsx
  deleted:
    - app/app/(home)/calendar.tsx
decisions: []
metrics:
  duration: "~20 min"
  completed: 2026-08-30
---

# Phase 69 Plan 02: Streak + Calendar Header Consolidation Summary

Merged the stand-alone month-calendar screen into a new "Серия" (streak) screen and repointed the home header's two buttons: streak now opens the combined screen, the second button now opens the observed-list.

## What Was Built

- `app/app/(home)/streak.tsx`: new route combining a streak header (flame icon + count, or an empty state when the streak is 0) above the Phase 68 month calendar. Calendar rendering (`markedDates`, locale config, `onDayPress` → `day/[date]`) is reused verbatim from the old `calendar.tsx`.
- `app/app/(home)/calendar.tsx`: deleted — no longer has any entry point after the header rewire; confirmed via `grep -rn "(home)/calendar" app components lib context` (no matches after the change).
- `components/home/HomeHeader.tsx`: first button (previously `CalendarDaysIcon` → `/app/(home)/calendar`) now shows the flame + streak count and navigates to `/app/(home)/streak` (`accessibilityLabel="Открыть серию и календарь"`). Second button now shows `UsersIcon` and navigates to `/app/(settings)/observedList` (`accessibilityLabel="Кого я наблюдаю"`), reusing the existing `calendarContainer` style slot.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Worktree branch was stale, missing all of Phase 68**
- **Found during:** Task 1 setup (reading `read_first` files)
- **Issue:** This worktree's branch (`worktree-agent-a7edd7b74e4339cf8`) was created from a commit that predates Phase 68 merging into `main`. None of the plan's required files existed (`app/app/(home)/calendar.tsx`, `convex/meals/getMonthMeals.ts`, `app/app/(home)/day/[date].tsx`, the current `HomeHeader.tsx` with two buttons, `lib/utils/getLocalMonthBounds.ts`).
- **Fix:** Verified the relationship was a clean fast-forward (worktree HEAD was a strict ancestor of `main`, zero divergent commits), then ran `git merge --ff-only main` to bring the worktree up to date. This is non-destructive — purely additive, no rewriting of history, no risk to the sibling worktree.
- **Files affected:** none directly (git history update only)
- **Commit:** N/A (fast-forward, not a new commit — `main` tip `584276c` became the new base)

**2. [Task ordering] Combined Task 1 + Task 2 verification before splitting commits**
- **Found during:** Task 1 verification
- **Issue:** The plan's Task 1 automated verification (`npx tsc --noEmit`) would fail transiently if run right after deleting `calendar.tsx` but before Task 2 repoints `HomeHeader.tsx` away from it — typed routes (`experiments.typedRoutes: true`) would reject the dangling `"/app/(home)/calendar"` string literal still present in `HomeHeader.tsx` at that point.
- **Fix:** Implemented both tasks' file changes together, ran `tsc`/`eslint`/all acceptance-criteria greps once against the combined result (all passed), then staged and committed each task's files separately to preserve one-commit-per-task history.
- **Files affected:** `app/app/(home)/streak.tsx`, `app/app/(home)/calendar.tsx` (Task 1 commit); `components/home/HomeHeader.tsx` (Task 2 commit)
- **Commits:** `85068a0` (Task 1), `811a23f` (Task 2)

None - no auto-fixed bugs or missing functionality beyond the above.

## Deferred Issues (out of scope, pre-existing)

`npx eslint .` reports 8 pre-existing errors in files this plan did not touch, unrelated to Phase 68/69 work:
- `app/app/(meal)/confirm-meal.tsx` (5 `no-confusing-void-expression` errors)
- `app/auth/confirm-phone.tsx` (1 `no-floating-promises` error)
- `components/meal/ConfirmMealItems.tsx` (2 `no-confusing-void-expression` errors)

Per scope boundary rules, these are logged here and left unfixed — they predate this plan and are outside `files_modified`.

## Verification

- `npx tsc --noEmit` — clean, no errors
- `npx eslint "app/app/(home)/streak.tsx" components/home/HomeHeader.tsx` — clean, no errors (only an unrelated `baseline-browser-mapping` data-staleness notice)
- `grep -rn "(home)/calendar" app components lib context` — no matches
- All acceptance-criteria greps from both tasks passed (streak.tsx contains `getStreak`, `title="Серия"`, does not contain `title="Календарь"`, contains the three copy strings, `size="40"` appears once, `dayMeals.length > 0` appears once; HomeHeader.tsx has 0 `CalendarDaysIcon`, 2 `UsersIcon`, correct `router.push` targets and accessibility labels, still exactly 2 `<Button`)

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or trust-boundary changes. Both `getStreak` and `getMonthMeals` queries reused verbatim (already user-scoped per Phase 68).

## Self-Check: PASSED

- FOUND: `app/app/(home)/streak.tsx`
- CONFIRMED ABSENT: `app/app/(home)/calendar.tsx`
- FOUND commit: `85068a0`
- FOUND commit: `811a23f`
