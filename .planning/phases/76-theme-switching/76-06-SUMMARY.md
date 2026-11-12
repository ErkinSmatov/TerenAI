---
phase: 76-theme-switching
plan: 06
subsystem: ui
tags: [theme, getColor, icons]
requires: [76-01]
provides:
  - "Иконки components/icons/** подписаны на тему"
affects: [76-07]
key-files:
  modified:
    - components/icons/dots/Dot1Icon.tsx
    - components/icons/dots/Dot3Icon.tsx
    - components/icons/dots/Dot6Icon.tsx
    - components/icons/macros/CalorieIcon.tsx
    - components/icons/macros/CarbIcon.tsx
    - components/icons/macros/FatIcon.tsx
    - components/icons/macros/ProteinIcon.tsx
    - components/icons/micros/FiberIcon.tsx
    - components/icons/micros/HealthIcon.tsx
    - components/icons/micros/SodiumIcon.tsx
    - components/icons/micros/SugarIcon.tsx
requirements-completed: [76-SC-1]
completed: 2026-11-12
---

# Phase 76 Plan 06: Иконки на теме Summary

11 иконок получили `useThemeContext()` и `getColor(<ключ>, undefined, theme)`. Проп `color` по-прежнему перекрывает значение по умолчанию (в обёртках lucide порядок `color` до `{...props}` сохранён; в Dot-иконках `color ?? getColor("foreground", undefined, theme)`).

## Коммиты
- 34fd3b2: точки и макро
- 3aa7f6b: микро

## Deviations from Plan
Dot1/3/6 использовали значение по умолчанию в параметре (`color = getColor("foreground")`), а не обёртку: параметр переименован в `colorProp`, внутри `const color = colorProp ?? getColor(...)`. Поведение прежнее.

## Проверки
`npx tsc --noEmit`, `npx eslint .` чистые; `themeColors.check.mjs` по components/icons: OK.

## Self-Check: PASSED
