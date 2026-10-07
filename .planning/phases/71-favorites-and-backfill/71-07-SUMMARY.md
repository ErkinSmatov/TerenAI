---
phase: 71-favorites-and-backfill
plan: 07
subsystem: ui
tags: [backfill, bottom-sheet, day-screen, add-options]

requires:
  - phase: 71-04
    provides: "чтение eatenAt"
  - phase: 71-05
    provides: "карточка Избранное, favorites UI"
  - phase: 71-06
    provides: "проброс date через цепочку добавления"
provides:
  - "Общие модули опций добавления (addMealOptions, useAddOptionPress, AddOptionsGrid)"
  - "Кнопка + и лист выбора способа в Рационе на экране дня"
affects: []

key-files:
  created:
    - components/tabs/addMealOptions.ts
    - components/tabs/useAddOptionPress.ts
    - components/tabs/AddOptionsGrid.tsx
    - components/home/DayAddMealSheet.tsx
  modified:
    - components/tabs/TabsAddOptions.tsx
    - components/ui/BottomSheet.tsx
    - components/home/HomeEmptyState.tsx
    - components/home/HomeRecentlyLogged.tsx
    - app/app/(home)/day/[date].tsx

key-decisions:
  - "В TabsAddOptions сетка обёрнута в View с шириной, т.к. PopoverContent asChild требует нативный дочерний элемент"
  - "Для будущей даты кнопки и листа нет (canAdd = !isFutureLocalDay)"

requirements-completed: []
duration: 12min
completed: 2026-10-08
---

# Phase 71 Plan 07: Добавление за прошлый день с экрана дня Summary

**Кнопка «+» в «Рационе» экрана дня (и в пустом состоянии) открывает лист Описать / Сканировать / Избранное с параметром date; Pro-гейт и ИИ-лимит общие с меню «+» через хук useAddOptionPress.**

## Task Commits
1. Task 1 (общие опции, хук, сетка, рефактор TabsAddOptions): 859a29e
2. Task 2 (лист, кнопка, пустое состояние, запрет будущего): 8a3b6d9

## Verification
- `npx tsc --noEmit` чисто; eslint по изменённым файлам без ошибок.
- Меню «+»: тот же состав карточек (Сахар/Давление для glucometer), та же геометрия сетки.

## Deviations from Plan
- Сетка в popover обёрнута в View (width=containerWidth), чтобы не ломать asChild-слот; визуально идентично.
- Prettier не применялся к файлам целиком (в репо уже есть расхождения форматирования), чтобы не создавать шум в диффе.

## Known Stubs
None.

## Self-Check: PASSED
