---
phase: 76-theme-switching
plan: 01
subsystem: ui
tags: [theme, palette, wcag, checks]
requires: []
provides:
  - "Светлая палитра с лаймовым акцентом, ключи primaryForeground и accentText в обеих палитрах"
  - "scripts/checks/palette.check.mjs (снимок dark, контраст WCAG)"
  - "scripts/checks/themeColors.check.mjs (R1/R2/R3, режим по списку файлов)"
affects: [76-02, 76-03, 76-04, 76-05, 76-06, 76-07]
key-files:
  created:
    - scripts/checks/palette.check.mjs
    - scripts/checks/themeColors.check.mjs
  modified:
    - lib/ui/palettes.ts
    - components/home/HomeDaySelector.tsx
    - components/tabs/TabsAddButton.tsx
    - components/observer/ObserverCard.tsx
    - components/profile/ProfileHeader.tsx
    - components/home/HomeGlucoseHeroCard.tsx
requirements-completed: [76-SC-2, 76-SC-3]
duration: 15min
completed: 2026-11-12
---

# Phase 76 Plan 01: Светлая палитра и проверки Summary

Светлая тема получила лаймовый акцент #C9F14C, ключи `primaryForeground` и `accentText` в обеих палитрах, серый фон по референсам, а также две детерминированные проверки (контраст WCAG и регрессии темы).

## Коммиты
- 1afb9a1: палитра и palette.check.mjs
- 2585233: themeColors.check.mjs
- 7700684: правки 5 компонентов

## Итоговые значения светлой палитры (на утверждение пользователем)

| Ключ | Было | Стало | Комментарий |
|------|------|-------|-------------|
| primary | [59,130,246] #3B82F6 | [201,241,76] #C9F14C | лайм |
| primaryLight | [191,219,254] | [228,248,165] #E4F8A5 | мягкий лайм |
| primaryForeground | нет | [3,7,18] #030712 | текст на лайме |
| accentText | нет | [77,99,9] #4D6309 | акцент текста/линий на светлом |
| background | [249,250,251] | [238,239,242] #EEEFF2 | серый фон по референсам |
| base | [255,255,255] | без изменений | белые карточки |
| mutedForeground | [107,114,128] | [96,103,117] #606775 | на сером фоне давал 4.20:1, затемнён до >= 4.5 |
| health | [34,197,94] | [22,163,74] #16A34A | контраст >= 3 на белом |
| green | [34,197,94] | [22,163,74] #16A34A | то же |

В dark: добавлены только `primaryForeground` [10,13,18] и `accentText` [201,241,76]; 34 прежних значения совпадают со снимком HEAD (проверено, в diff нет удалений в dark).

В palette.check.mjs дополнительно проверяются `foreground` на `background` и `mutedForeground` на `background`/`base` (>= 4.5), порог не ослаблялся.

## Базовая линия themeColors
Полный запуск без аргументов: 184 нарушения (162 R1, остальные R2/R3) в 49 файлах, как и ожидалось. На 5 файлах задачи 3 проверка зелёная. Исключений (ALLOWED_FILES) нет.

## Deviations from Plan
- [Design reference] background светлой темы посерен, mutedForeground затемнён (по указанию заказчика и CONTEXT). Добавлены лишние контрастные проверки foreground/mutedForeground.
- Остальное выполнено как в плане.

## Проверки
`palette: OK`, `npx tsc --noEmit`, `npx eslint .` без ошибок.

## Служебное
STATE.md: заголовок (Phase 74) не менялся; прогресс обновлён командами roadmap.update-plan-progress 76 и state.update-progress (см. итоговый коммит).

## Self-Check: PASSED
