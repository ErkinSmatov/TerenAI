---
phase: 76-theme-switching
plan: 02
subsystem: ui
tags: [theme, primitives, getColor, useThemedStyles]
requires: [76-01]
provides:
  - "Text, Button, ScreenMain, ScreenFooter, Popover, Carousel, SettingsItem, SettingsToggleItem подписаны на тему"
affects: [76-03, 76-04, 76-05, 76-06, 76-07]
key-files:
  modified:
    - components/ui/Text.tsx
    - components/ui/Button.tsx
    - lib/ui/useThemedStyles.ts
    - components/ui/screen/ScreenMain.tsx
    - components/ui/screen/ScreenFooter.tsx
    - components/ui/Popover.tsx
    - components/ui/Carousel.tsx
    - components/settings/SettingsItem.tsx
    - components/settings/SettingsToggleItem.tsx
requirements-completed: [76-SC-1, 76-SC-2]
duration: 10min
completed: 2026-11-12
---

# Phase 76 Plan 02: Примитивы интерфейса на теме Summary

Базовые примитивы берут тему из `useThemeContext()` и передают её третьим аргументом в `getColor`, поэтому цвета меняются вживую (в том числе под React Compiler); у accent-кнопки надпись `primaryForeground` (тёмная на лайме).

## Коммиты
- 10fbd03: Text и Button (цвет Text по умолчанию вычисляется в теле, `getAccentShadow(theme)`, accent-текст `primaryForeground`), комментарий в useThemedStyles.ts обновлён
- 15f4819: ScreenMain, ScreenFooter, Popover, Carousel, SettingsItem и SettingsToggleItem (фабрики `createStyles` + `useThemedStyles`, литералы `as const`)

## Deviations from Plan
None - plan executed exactly as written. Мелочь: после переноса стилей в фабрики убран неиспользуемый импорт `StyleSheet` в обоих файлах настроек.

## Проверки
`npx tsc --noEmit`, `npx eslint .`, `themeColors.check.mjs` по файлам плана (`themeColors: OK`), `palette: OK`.

## Служебное
Заголовок STATE.md (Phase 74) не менялся; прогресс обновлён командами roadmap.update-plan-progress 76 и state.update-progress.

## Self-Check: PASSED
