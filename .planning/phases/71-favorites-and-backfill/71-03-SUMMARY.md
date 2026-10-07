---
phase: 71-favorites-and-backfill
plan: 03
status: complete
completed: 2026-10-08
---

# Plan 71-03 Summary: бэкфилл eatenAt (деплой A)

## Что сделано
- Функции фазы (схема `eatenAt` + индекс `byUserIdAndEatenAt`, `favoriteMeals`, `backfillMealEatenAt`, `countMealsWithoutEatenAt`) залиты на dev-деплой `terenai-dev` (`npx convex dev --once`).
- Миграция `migrations:backfillMealEatenAt`: dry-run (processed 100, изменения не записаны), затем боевой запуск — статус `success`, `isDone: true`, `processed: 127`.
- Проверка полноты `meals/countMealsWithoutEatenAt`: `scanned: 127`, `missing: 0`, `isDone: true`.

## Решение пользователя (checkpoint: human-action)
Отдельного production-деплоя у проекта нет — работа ведётся только на `terenai-dev`. Prod-шаг (`npx convex deploy`, `--prod` миграция) **не применим**; dev-проверка `missing == 0` принята как достаточная. Переход к плану 71-04 разрешён.

## Отклонения
Задача 2 (prod) пропущена по решению пользователя: prod-деплоя не существует. Если он появится, перед выкладкой повторить миграцию с флагом `--prod` (команды в `convex/migrations.ts`).
