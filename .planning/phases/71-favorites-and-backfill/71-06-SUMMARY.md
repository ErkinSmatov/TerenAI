---
phase: 71-favorites-and-backfill
plan: 06
subsystem: ui
tags: [expo-router, eatenAt, backfill, meal-time-picker]

requires:
  - phase: 71-01
    provides: "eatenAt на сервере, resolveAddDate, mealSlots"
  - phase: 71-05
    provides: "favorites UI, режим favoriteId в confirm-meal"
provides:
  - "Проброс date через describe / camera / favorites / штрихкод"
  - "MealTimePicker (слоты + часы/минуты для «Другое»)"
  - "confirm-meal: eatenAt для прошлой даты и возврат на экран дня"
affects: [71-07]

key-files:
  created:
    - components/meal/MealTimePicker.tsx
  modified:
    - app/app/(add)/describe.tsx
    - app/app/(add)/camera.tsx
    - app/app/(add)/favorites.tsx
    - app/app/(meal)/meal.tsx
    - app/app/(meal)/confirm-meal.tsx

key-decisions:
  - "Штрихкод за прошлую дату: getDefaultBarcodeEatenAt без пикера"
  - "Для сегодня/без даты eatenAt не передаётся, возврат на /app"

requirements-completed: []
duration: 15min
completed: 2026-10-08
---

# Phase 71 Plan 06: Проброс даты и выбор времени приёма Summary

**Параметр date проходит всю цепочку добавления; confirm-meal для прошлого дня показывает «Время приёма» (по умолчанию Ужин 20:00), отправляет eatenAt и возвращает на экран дня.**

## Task Commits
1. Task 1 (проброс date, штрихкод eatenAt): beafed8
2. Task 2 (MealTimePicker, confirm-meal) + откат prettier-шума: 8cbece5

## Verification
- `npx tsc --noEmit` чисто; `npm run script:verifyEatenAt` OK.
- eslint: MealTimePicker и остальные файлы 0 новых ошибок; confirm-meal.tsx 5 (базовая линия 5). isTransientConnectionError == 2, retry и режим favoriteId не тронуты.

## Deviations from Plan
- [Rule 1] Prettier (trailing-comma all) добавил запятые в нетронутых строках в коммите beafed8; исправлено в 8cbece5 (`--trailing-comma es5`).
- Экран дня `app/app/(home)/day/[date].tsx` уже существует, dismissTo использует его.

## Known Stubs
None.

## Self-Check: PASSED
