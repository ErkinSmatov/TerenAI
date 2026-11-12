---
phase: 76-theme-switching
plan: 05
subsystem: ui
tags: [theme, getColor, calendar]
requires: [76-01]
provides:
  - "Экраны app/ и компоненты блюда подписаны на тему"
affects: [76-06, 76-07]
key-files:
  modified:
    - app/app/(home)/day/[date].tsx
    - app/app/(home)/movementLog.tsx
    - app/app/(home)/streak.tsx
    - app/app/(settings)/badges.tsx
    - app/app/(settings)/changeGoal.tsx
    - app/app/(settings)/weeklyWeighIn.tsx
    - app/auth/confirm-email.tsx
    - app/auth/confirm-phone.tsx
    - components/camera/CameraModeSelector.tsx
    - components/meal/Meal.tsx
    - components/meal/MealItems.tsx
    - components/meal/MealMacros.tsx
    - components/meal/MealMicros.tsx
    - components/onboarding/steps/end/PlanInfoSheet.tsx
requirements-completed: [76-SC-1, 76-SC-2]
completed: 2026-11-12
---

# Phase 76 Plan 05: Оставшиеся экраны и компоненты на теме Summary

14 файлов получили `useThemeContext()` и `theme` третьим аргументом каждого `getColor`. Календарь серии: выбранный день `primary` с цифрой `primaryForeground`, сегодняшний день `accentText`, `key={theme}` на Calendar (локальный ремаунт; месяц сохраняется через уже существующий проп `current` от `visibleMonth`), `theme` добавлен в зависимости `markedDates`.

## Коммиты
- 656b28a: 8 экранов app/
- 3d7de49: Meal, MealItems, MealMacros, MealMicros, CameraModeSelector, PlanInfoSheet

## Deviations from Plan
None - plan executed exactly as written. Правки фазы 77 в day/[date].tsx сохранены (diff только импорт, подписка в EmptyState и аргументы getColor). Worklet-функции не тронуты.

## Проверки
`npx tsc --noEmit` и `npx eslint .` чистые; `themeColors.check.mjs`: OK (31 вызов в 8 файлах, 18 в 6 файлах).

## Служебное
Заголовок STATE.md (Phase 74) не менялся.

## Self-Check: PASSED
