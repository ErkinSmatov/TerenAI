---
phase: 76-theme-switching
plan: 03
subsystem: ui
tags: [theme, getColor, useThemedStyles, paywall, onboarding]
requires: [76-01]
provides:
  - "Камера, журналы давления и глюкозы, вход, Pro, пейволл и два шага онбординга подписаны на тему"
affects: [76-04, 76-05, 76-06]
key-files:
  modified:
    - app/app/(add)/camera.tsx
    - app/app/(home)/bloodPressureLog.tsx
    - app/app/(home)/glucoseLog.tsx
    - app/auth/index.tsx
    - components/auth/SignInButtons.tsx
    - components/ProLabel.tsx
    - components/paywall/Paywall.tsx
    - components/onboarding/steps/goal/OnboardingWeightChangeRate.tsx
    - components/onboarding/steps/end/OnboardingCreatingPlan.tsx
requirements-completed: [76-SC-1, 76-SC-2]
duration: 15min
completed: 2026-11-12
---

# Phase 76 Plan 03: Фабрики стилей для камеры, входа, пейволла и онбординга Summary

Девять файлов переведены с модульного `StyleSheet.create` с `getColor` на фабрики `createStyles(theme)` + `useThemedStyles`, все `getColor` получают `theme` из `useThemeContext()`; на лайме текст `primaryForeground`, лайм на светлом фоне заменён на `accentText`.

## Коммиты
- 64059c1: камера, журналы давления и глюкозы, экран и кнопки входа
- 0d42ed3: ProLabel, Paywall (без getActiveTheme), OnboardingWeightChangeRate, OnboardingCreatingPlan

## Ключевое
- ProLabel и бейдж выбранного тарифа: текст `primaryForeground` на заливке `primary`.
- Обводка выбранного тарифа и иконки готовности/спиннер в создании плана: `accentText`; заливка индикатора прогресса осталась `primary`.
- Из пейволла удалён `getActiveTheme` и устаревший комментарий про отсутствие live-переключения.
- Литералы стилей в фабриках помечены `as const`; логика входа и покупок не менялась (в diff нет правок onPress/покупок).

## Deviations from Plan
None - plan executed exactly as written. Замечание: на экране входа граница скриншота теперь `secondary` с прозрачностью 0.08 в тёмной теме (раньше в тёмной теме рисовалась сплошным белым, так как secondary там сплошной белый) — это исправление ошибки по п. 4 плана.

## Проверки
`npx tsc --noEmit` зелёный после каждого коммита, `npx eslint .` без ошибок, `themeColors.check.mjs` по файлам плана — OK (18 + 22 вызова).

## Self-Check: PASSED
