---
phase: 71-favorites-and-backfill
plan: 04
subsystem: database
tags: [convex, meals, eatenAt, streak, reminders, observers]

requires:
  - phase: 71-01
    provides: "meals.eatenAt, индекс byUserIdAndEatenAt, getMealTime"
  - phase: 71-03
    provides: "бэкфилл eatenAt (dev: scanned 127, missing 0)"
provides:
  - "Все чтения времени приёма пищи идут по eatenAt (D-09, D-10)"
  - "verifyStreakDays: сценарий добавления задним числом"
affects: [71-06, 71-07]

key-files:
  modified:
    - convex/meals/getWeekMeals.ts
    - convex/meals/getMonthMeals.ts
    - convex/home/getStreak.ts
    - convex/badges/checkAndAwardBadges.ts
    - convex/notifications/checkMealReminders.ts
    - convex/observers/getPatientToday.ts
    - convex/observers/getPatientHistory.ts
    - convex/observers/getObservedPatients.ts
    - convex/reports/getMonthlyReport.ts
    - components/home/HomeRecentlyLogged.tsx
    - components/charts/SugarByHourChart.tsx
    - components/home/HomeGlucoseSummary.tsx
    - lib/nutrition/estimateGlucoseFromMeals.ts
    - scripts/verifyStreakDays.ts

key-decisions:
  - "Серия/бейджи/напоминания/наблюдатель берут блюда по byUserIdAndEatenAt с order(desc)"

requirements-completed: []
duration: 12min
completed: 2026-10-08
---

# Phase 71 Plan 04: Чтения времени приёма на eatenAt Summary

**9 серверных и 4 клиентских мест переведены с _creationTime на eatenAt/getMealTime; серия считается по eatenAt desc, verifyStreakDays покрывает «задним числом».**

## Commits
- 95aaefc: неделя, месяц, серия, бейджи, напоминания
- 70db866: наблюдатель и месячный отчёт
- db8c1db: клиент (HomeRecentlyLogged key=meal._id, SugarByHourChart, HomeGlucoseSummary, estimateGlucoseFromMeals) + verifyStreakDays

## Verification
tsc, eslint, convex codegen чисто; verifyWeekBucketing, verifyMonthBucketing, verifyMealReminderWindows, verifyBadgeThresholds, verifyStreakDays, verifyGlucoseEstimate — OK.

## Остаток _creationTime (аудит)
Только не-meals и допустимые места: convex/migrations.ts (бэкфилл), tables/profiles.ts (комментарий), getMyObservers/getObservedPatients (link), getPatientToday и getMonthlyReport (давление), checkWeighInReminders (профиль), Pick/тип-вход в SugarByHourChart, HomeGlucoseSummary, EstimateMealInput, lib/meals/getMealTime.ts (fallback).

## Deviations from Plan
**[Rule 1 - Bug]** В commit 70db866 в getObservedPatients.ts остался неиспользуемый импорт getMealTime (eslint error; там блюда только считаются). Удалён в db8c1db. Также в HomeRecentlyLogged убран ставший неиспользуемым параметр index.

## Known Stubs
None.

## Self-Check: PASSED
