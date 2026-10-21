---
phase: 74-onboarding-push-notifications
plan: 02
subsystem: notifications
tags: [push, dedupe, pushTokens, convex]
requires: []
provides:
  - lib/notifications/tokenDedupe.ts (pickLatestTokenRows)
  - convex/notifications/dedupeTokens.ts (internalMutation, dryRun)
  - convex/notifications/removePushToken.ts
affects: [74-06, 74-08]
tech-stack:
  added: []
  patterns: [инвариант один токен = одна строка на записи]
key-files:
  created:
    - lib/notifications/tokenDedupe.ts
    - scripts/verifyPushTokenDedupe.ts
    - convex/notifications/dedupeTokens.ts
    - convex/notifications/removePushToken.ts
  modified:
    - convex/notifications/recordPushToken.ts
    - convex/notifications/sendPushNotification.ts
    - convex/users/deleteUser.ts
    - app/app/(tabs)/settings.tsx
    - convex/_generated/api.d.ts
key-decisions:
  - "Владелец токена — последний вошедший на устройстве пользователь; recordPushToken удаляет строки того же токена у других userId"
  - "Ошибка removePushToken при выходе только логируется, выход не блокируется"
requirements-completed: [PUSH-DEDUP]
duration: 10min
completed: 2026-10-21
---

# Phase 74 Plan 02: Дедупликация push-токенов Summary

Инвариант «один expoPushToken = одна строка» на записи, чистка токенов при выходе и удалении аккаунта, удаление всех строк при DeviceNotRegistered и internalMutation разовой чистки дублей с dryRun.

## Задачи

1. pickLatestTokenRows + dedupeTokens + verify-скрипт (RED подтверждён, затем OK) — `977b476`
2. recordPushToken, deleteInvalidToken (.collect()), deleteUser — `10ab804`
3. removePushToken + вызов в handleSignOut — `84eddde`

## Запуск миграции (план 74-08)

`npx convex run notifications/dedupeTokens:default '{"dryRun":true}'`, затем без dryRun; для prod добавить `--prod`.

## Deviations from Plan

**1. [Rule 3 - Blocking] Ручное обновление convex/_generated/api.d.ts**
- **Issue:** сгенерированные типы api закоммичены, без записи removePushToken tsc падал в settings.tsx.
- **Fix:** добавлены записи dedupeTokens и removePushToken вручную (codegen требует деплоя).
- **Commit:** 84eddde

## Deferred Issues

`npm run lint` выдаёт 3 ошибки в lib/notifications/pushRules.ts (план 74-01, prefer-optional-chain / nullish-coalescing) — вне объёма плана, не исправлялись. Файлы плана 74-02 lint-чистые, `npx tsc --noEmit` без ошибок.

Пользовательские незакоммиченные правки в рабочем дереве не затронуты.

## Known Stubs

None.

## Self-Check: PASSED
