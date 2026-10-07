---
phase: 70-maps-page
plan: 02
subsystem: ui
tags: [observer, react-native, maps-tab, segmented-control]
requires: ["70-01"]
provides:
  - "Вкладка «Карты» как центр наблюдения: код, ввод, табы, списки"
affects: [70-03]
key-files:
  modified:
    - app/app/(tabs)/maps.tsx
key-decisions:
  - "Начальный таб «Наблюдаемые»; успешный ввод кода без toast, ошибка — вспышка + toast + очистка поля"
requirements-completed: []
duration: 8min
completed: 2026-10-08
---

# Phase 70 Plan 02: Страница «Карты» Summary

Заглушка вкладки «Карты» заменена страницей наблюдения: «Поделитесь кодом», всегда видимые 5 ячеек ввода, табы «Наблюдаемые / Наблюдатели» (SegmentedControl), карточки, пустые состояния с подсказками и удаление/отзыв через revokeLink.

## Задачи

1. Каркас, блок кода, ввод кода наблюдателя — c762971
2. Табы, списки карточек, пустые состояния, удаление/отзыв — 7956e79

## Deviations from Plan

None - plan executed exactly as written.

## Verification

`npx tsc --noEmit` чистый, eslint по maps.tsx без ошибок, convex/ не изменён.

## Known Stubs

None.

## Self-Check: PASSED
