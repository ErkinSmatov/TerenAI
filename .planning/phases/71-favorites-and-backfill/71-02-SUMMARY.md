---
phase: 71-favorites-and-backfill
plan: 02
subsystem: database
tags: [convex, favorites, favoriteMeals, deleteUser]

requires: []
provides:
  - "Таблица favoriteMeals (индексы byUserId, byUserIdAndSourceMealId)"
  - "addFavoriteFromMeal, removeFavorite, listFavorites, getFavorite, getMealFavorite"
  - "favoriteSignature, FAVORITES_LIMIT (50)"
  - "deleteUser чистит избранное, фото удаляются один раз"
affects: [71-03, 71-05]

key-files:
  created:
    - convex/tables/favoriteMeals.ts
    - convex/favorites/favoritesConfig.ts
    - convex/favorites/favoriteSignature.ts
    - convex/favorites/addFavoriteFromMeal.ts
    - convex/favorites/removeFavorite.ts
    - convex/favorites/listFavorites.ts
    - convex/favorites/getFavorite.ts
    - convex/favorites/getMealFavorite.ts
  modified:
    - convex/schema.ts
    - convex/users/deleteUser.ts
    - convex/_generated/api.d.ts

key-decisions:
  - "Снимок блюда берётся на сервере из собственного meals; клиент передаёт только mealId"
  - "Лимит 50 через ConvexError({ code: FAVORITES_LIMIT })"
  - "removeFavorite не удаляет файл из storage (общий photoStorageId)"

requirements-completed: []
duration: 8min
completed: 2026-10-08
---

# Phase 71 Plan 02: Бэкенд избранного Summary

**Таблица favoriteMeals со снимком блюда, 5 convex-функций с проверкой владельца, дедупом и лимитом 50, deleteUser с очисткой избранного и однократным удалением общих фото.**

## Task Commits
1. Task 1 (таблица, конфиг, подпись, add/remove): 8b1e644
2. Task 2 (listFavorites, getFavorite, getMealFavorite): e30814a
3. Task 3 (deleteUser): 5e34765

## Deviations from Plan
Мелочь: в getMealFavorite проверка записана как `meal?.userId !== userId || ...` (требование правила prefer-optional-chain), поведение то же. `npx convex codegen` обновил convex/_generated/api.d.ts, он закоммичен.

## Known Stubs
None.

## Self-Check: PASSED
