---
phase: 74-onboarding-push-notifications
plan: 06
subsystem: notifications
tags: [push, cron, convex, dedupe, retention]
requires: [74-01, 74-02]
provides:
  - convex/notifications/checkScheduledPushes.ts (единый cron FOOD-01 / HLT-14 / RET-01..03)
  - convex/notifications/skipMealReminder.ts (mutation «Пропускаю»)
  - 8 новых optional-полей profiles
  - categoryId и data.mealPoint в sendPushNotification
affects: [74-07, 74-08]
tech-stack:
  added: []
  patterns: [один проход cron по уникальным токенам, приоритет FOOD-01 → HLT-14 → RET]
key-files:
  created:
    - convex/notifications/checkScheduledPushes.ts
    - convex/notifications/skipMealReminder.ts
  modified:
    - convex/tables/profiles.ts
    - convex/notifications/sendPushNotification.ts
    - convex/crons.ts
    - convex/_generated/api.d.ts
    - lib/notifications/pushRules.ts
  deleted:
    - convex/notifications/checkMealReminders.ts
    - convex/notifications/checkWeighInReminders.ts
key-decisions:
  - "Последний вход = pushTokens.updatedAt, нового поля нет"
  - "На устройство за тик не более одного push; если копирайт кандидата не прошёл validatePushCopy, берётся следующий кандидат"
  - "FOOD-01 и HLT-14 (класс B) в лимит C/D не входят, RET (класс D) входят"
requirements-completed: [PUSH-DEDUP, PUSH-RULES, PUSH-TYPES]
duration: 15min
completed: 2026-10-21
---

# Phase 74 Plan 06: Единый cron push Summary

Один cron `checkScheduledPushes` каждые 30 минут: дедуп по expoPushToken (pickLatestTokenRows до чтения профилей), тихие часы, лимиты, ротация текстов и проверка копирайта; шлёт FOOD-01, HLT-14 и RET-01..03 с тумблерами и кнопкой «Пропускаю».

## Задачи

1. Поля профиля, categoryId в push, skipMealReminder — `9cfa5a1`
2. Единый cron checkScheduledPushes, удаление старых cron — `c1e31e6`
3. Предварительно: исправлены 3 lint-ошибки pushRules.ts — `aa5487d`

## Deviations from Plan

**1. [Rule 3 - Blocking] Исправление lint в pushRules.ts (по указанию оркестратора)**
- 3 ошибки prefer-optional-chain / nullish-coalescing из 74-01, verifyPushRules проходит. Commit: aa5487d.

**2. [Rule 3 - Blocking] Ручное обновление convex/_generated/api.d.ts**
- Добавлены skipMealReminder и checkScheduledPushes, удалены записи старых cron (codegen требует деплоя).

**3. Проверка `npx convex dev --once` не выполнялась**
- Она деплоит код на dev-деплоймент; не запускалась без явного разрешения. tsc, eslint, verifyPushRules, verifyMealReminderWindows проходят. Рекомендуется выполнить на этапе 74-08 вместе с запуском dedupeTokens.

## Замечания

- Стрик в тексте FOOD-01 больше не используется (тексты по xlsx), computeStreakFromMealTimes в cron не вызывается.
- Пользовательские незакоммиченные правки в рабочем дереве не затронуты.

## Known Stubs

None. Клиентские тумблеры retentionRemindersEnabled и категория «food-reminder» (обработчик кнопки, вызов skipMealReminder) — в последующих планах.

## Self-Check: PASSED
