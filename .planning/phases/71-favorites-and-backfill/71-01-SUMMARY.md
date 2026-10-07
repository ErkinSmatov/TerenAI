---
phase: 71-favorites-and-backfill
plan: 01
subsystem: database
tags: [convex, meals, eatenAt, migration, date-utils]

requires: []
provides:
  - "meals.eatenAt (optional, мс UTC) + индекс byUserIdAndEatenAt"
  - "Валидация eatenAt на сервере (resolveEatenAt, не в будущем)"
  - "Миграция backfillMealEatenAt и internalQuery countMealsWithoutEatenAt"
  - "Чистые модули getMealTime, parseLocalDate, mealSlots"
affects: [71-02, 71-03, 71-04, 71-06, 71-07]

tech-stack:
  added: []
  patterns:
    - "Чистые модули даты/времени без react-native/convex импортов с ts-node проверкой"

key-files:
  created:
    - lib/meals/getMealTime.ts
    - convex/utils/resolveEatenAt.ts
    - lib/utils/parseLocalDate.ts
    - lib/meals/mealSlots.ts
    - scripts/verifyEatenAt.ts
    - convex/meals/countMealsWithoutEatenAt.ts
  modified:
    - package.json
    - convex/tables/meals.ts
    - convex/meals/confirmMeal.ts
    - convex/meals/createMeal.ts
    - convex/meals/analyze/analyzeMealBarcode.ts
    - convex/meals/updateMeal.ts
    - convex/meals/updateMealInternal.ts
    - convex/migrations.ts
    - convex/_generated/api.d.ts

key-decisions:
  - "Чтения остаются на _creationTime до бэкфилла (деплой A безопасен)"
  - "eatenAt исключён из args updateMeal/updateMealInternal"

requirements-completed: []

duration: 10min
completed: 2026-10-08
---

# Phase 71 Plan 01: eatenAt schema, validation and backfill Summary

**Поле meals.eatenAt с индексом, валидируемая запись во всех insert, закрытие от updateMeal, миграция-бэкфилл и чистые модули даты приёма.**

## Accomplishments
- Чистые модули getMealTime, resolveEatenAt, parseLocalDate, mealSlots + `npm run script:verifyEatenAt` (TZ=Europe/Berlin) проходит.
- confirmMeal и createMeal (штрихкод через analyzeMealBarcode) пишут eatenAt; без аргумента = Date.now(); будущее (> now + 5 мин), NaN, <= 0 отклоняются до insert.
- backfillMealEatenAt и internalQuery countMealsWithoutEatenAt (постраничный, numItems <= 4000) готовы к запуску в плане 71-03. Бэкфилл на проде НЕ запускался.

## Task Commits
1. Task 1: 1666a33
2. Task 2: 93a39bc
3. Task 3: a24dfe2

## Deviations from Plan
None - plan executed exactly as written. Мелочь: модули написаны до первого запуска скрипта (отдельного RED-коммита нет); `npx convex codegen` обновил convex/_generated/api.d.ts, он закоммичен.

## Known Stubs
None.

## Self-Check: PASSED
