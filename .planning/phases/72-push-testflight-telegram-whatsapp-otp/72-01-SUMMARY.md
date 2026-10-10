---
phase: 72-push-testflight-telegram-whatsapp-otp
plan: 01
subsystem: notifications
tags: [push, expo, convex, diagnostics]
requires: []
provides:
  - checkPushReceipts internalAction (Expo receipts)
  - sendTestPush internalAction (тестовый push на prod)
  - scripts/checks/pushConfig.check.mjs
affects: [72-05]
key-files:
  created:
    - convex/notifications/checkPushReceipts.ts
    - convex/notifications/sendTestPush.ts
    - scripts/checks/pushConfig.check.mjs
  modified:
    - convex/notifications/sendPushNotification.ts
    - convex/notifications/recordPushToken.ts
    - convex/_generated/api.d.ts
requirements-completed: [PUSH-01, MEALPUSH-01, WEIGH-01]
completed: 2026-10-10
---

# Phase 72 Plan 01: Диагностика push (receipts, тестовая отправка, проверка конфига) Summary

После каждой отправки push планируется проверка Expo receipts (по умолчанию через 15 минут), ошибки APNs пишутся в логи Convex читаемым текстом, есть internalAction тестовой отправки и скрипт проверки push-конфига.

## Что сделано

1. checkPushReceipts: getReceipts чанками по 300, DeviceNotRegistered удаляет токен через deleteInvalidToken, прочие ошибки логируются с маской токена, итоговая сводка в лог. sendPushNotification собирает ticket id, получил аргумент receiptsDelayMs, ticket-ошибки логируются через new Error с текстом.
2. sendTestPush: internalQuery getPushTokenForUser и internalAction (NO_PUSH_TOKEN либо планирование отправки с проверкой receipts через 60 с). Публичных функций нет.
3. pushConfig.check.mjs: проверяет bundle id, плагин, projectId, передачу projectId в getExpoPushTokenAsync, eas.json (credentialsSource), introspect-конфиг. Результат: OK, projectId 616f0145-400b-4a1e-99d8-efea2681653f, aps-environment в introspect = development (в подписанной сборке подставляется production, проверка в 72-05). Лог "recordPushToken registered" добавлен в recordPushToken.

## Коммиты

- 79bd82b: checkPushReceipts + сбор ticket id
- 129bb18: sendTestPush
- 4de4140: pushConfig.check.mjs + лог регистрации токена

## Deviations from Plan

**[Rule 3 - Blocking] convex/_generated/api.d.ts обновлён вручную** (добавлены checkPushReceipts и sendTestPush), так как npx convex codegen требует деплоймент. Типы проходят, при следующем codegen файл совпадёт. Также в worktree временно создан симлинк node_modules (не закоммичен).

Конфиг-исправлений не потребовалось: все проверки скрипта прошли.

## Verification

- npx tsc --noEmit: OK
- npx eslint convex/notifications: OK
- node scripts/checks/pushConfig.check.mjs: OK

## Known Stubs

Нет.

## Self-Check: PASSED
