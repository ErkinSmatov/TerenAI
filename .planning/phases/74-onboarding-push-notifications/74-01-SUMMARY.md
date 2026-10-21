---
phase: 74-onboarding-push-notifications
plan: 01
subsystem: notifications
tags: [push, rules, catalog, tdd, pure-functions]
requires: []
provides:
  - lib/notifications/pushRules.ts (тихие часы, суточные лимиты, ротация, слоты, стадии RET, валидация копирайта)
  - lib/notifications/pushCatalog.ts (FOOD-01, HLT-14, RET-01..03, renderPushText)
  - npm-скрипты verifyPushRules, verifyPushTokenDedupe, verifyHealthBlocks
affects: [74-02, 74-03, 74-06]
tech-stack:
  added: []
  patterns: [чистые модули без convex/react, assert-скрипты через ts-node]
key-files:
  created:
    - lib/notifications/pushRules.ts
    - lib/notifications/pushCatalog.ts
    - scripts/verifyPushRules.ts
  modified:
    - package.json
key-decisions:
  - "FOOD-01 и HLT-14 — класс B (вне лимита C/D), RET-01..03 — класс D (в лимите 3/сутки)"
  - "Тихие часы фиксированы 22:00–08:00, время недельного взвешивания остаётся 10:00 (воскресенье)"
requirements-completed: [PUSH-RULES, PUSH-TYPES]
duration: 10min
completed: 2026-10-21
---

# Phase 74 Plan 01: Правила push и каталог Summary

Чистые функции правил push (тихие часы, лимиты C/D ≤3 и FOOD-01 ≤2 в сутки, ротация без повтора, стадии возврата RET, валидация копирайта) и каталог FOOD-01/HLT-14/RET-01..03 с дословными текстами из xlsx, покрытые 77 assert-проверками.

## Задачи

1. Task 1 (RED): scripts/verifyPushRules.ts и три npm-скрипта, скрипт падает с TS2307 — `95cef5e`
2. Task 2 (GREEN): pushRules.ts и pushCatalog.ts, `verifyPushRules: OK` — `547ad34`

## Верификация

verifyPushRules, verifyWeighInReminder, verifyMealReminderWindows проходят; `npx tsc --noEmit` без ошибок; модули не импортируют convex/react.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. Скрипты verifyPushTokenDedupe.ts и verifyHealthBlocks.ts будут созданы планами 74-02 и 74-03 (npm-записи добавлены по плану).

## Self-Check: PASSED
