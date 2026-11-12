---
phase: 76-theme-switching
plan: 04
subsystem: ui
tags: [theme, getColor, useThemedStyles, skia, badges]
requires: [76-01]
provides:
  - "Компоненты блюда, награды и выбор веса подписаны на тему"
affects: [76-05, 76-06, 76-07]
key-files:
  modified:
    - components/meal/ConfirmMealItems.tsx
    - components/meal/GramsStepper.tsx
    - components/meal/MealSummaryCard.tsx
    - components/meal/MealSummaryCardBig.tsx
    - components/badges/BadgeCelebrationModal.tsx
    - components/badges/BadgeTile.tsx
    - components/weight/WeightPicker.tsx
requirements-completed: [76-SC-1, 76-SC-2]
duration: 10min
completed: 2026-11-12
---

# Phase 76 Plan 04: Блюдо, награды и выбор веса на теме Summary

Семь файлов переведены с модульного `StyleSheet.create` с `getColor` на фабрики `createStyles(theme)` + `useThemedStyles`; все `getColor` получают `theme` из `useThemeContext()`. В WeightPicker тема берётся в React-области и передаётся в градиенты и Skia-цвета, указатель текущего веса теперь `accentText`.

## Коммиты
- 4b4d4dc: ConfirmMealItems (без getActiveTheme), GramsStepper, MealSummaryCard, MealSummaryCardBig
- 11ae311: BadgeCelebrationModal, BadgeTile, WeightPicker

## Ключевое
- В ConfirmMealItems обе компоненты (список и IngredientRow) получают стили и тему самостоятельно; пунктирная рамка: `secondary` с прозрачностью 0.08 в тёмной теме.
- WeightPicker: логика прокрутки и расчёта веса не менялась (в diff только цвета и стили, T-76-07). Также модульный `color: foreground` у текста веса перенесён в фабрику.
- Анимация iconAnimatedStyle в BadgeCelebrationModal не тронута.

## Deviations from Plan
None - plan executed exactly as written.

## Проверки
`npx tsc --noEmit` зелёный после каждого коммита, `npx eslint .` без ошибок, `themeColors.check.mjs` по файлам плана: OK (13 + 21 вызов). Проверка worklet/Skia на устройстве в 76-07.

## Служебное
Заголовок STATE.md (Phase 74) не менялся.

## Self-Check: PASSED
