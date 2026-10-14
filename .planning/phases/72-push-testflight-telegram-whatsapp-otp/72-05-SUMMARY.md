---
phase: 72-push-testflight-telegram-whatsapp-otp
plan: 05
subsystem: push-notifications
tags: [push, android, fcm, apns, eas, google-services]
requires: []
provides:
  - Android push channel "default" в sendPushNotification
  - sendTestPush с аргументом platform (internal)
  - EAS-профиль production-apk
  - scripts/checks/pushConfig.check.mjs
  - google-services.json с пакетами prod и dev
affects: [72-06, 72-07]
tech-stack:
  added: []
  patterns: [клиентский google-services.json в git, ключ Admin SDK вне git]
key-files:
  created: [google-services.json, scripts/checks/pushConfig.check.mjs]
  modified: [app.config.ts, convex/notifications/sendPushNotification.ts, convex/notifications/sendTestPush.ts, eas.json, .gitignore]
key-decisions:
  - "google-services.json коммитится (клиентский конфиг, D-19); private_key отсутствует"
  - "Коммит Task 3 только google-services.json и app.config.ts (D-20)"
requirements-completed: [PUSH-01, MEALPUSH-01, WEIGH-01]
duration: n/a
completed: 2026-10-14
---

# Phase 72 Plan 05: Android push и конфигурация консолей Summary

Код и конфигурация для push на iOS и Android готовы: канал Android, выбор платформы в тестовом push, профиль production-apk, проверочный скрипт и закоммиченный google-services.json с двумя пакетами (prod и dev).

## Выполненные задачи

| Задача | Тип | Результат | Коммит |
|---|---|---|---|
| 1 | auto | channelId, sendTestPush platform, production-apk, маска в .gitignore, pushConfig.check.mjs | d5b74f3 |
| 2 | checkpoint:human-action | Консоли Apple/EAS/Firebase выполнены пользователем | (без коммита) |
| 3 | auto | google-services.json и googleServicesFile в app.config.ts | 1df4c23 |

## Результат ручного шага (Task 2)

- APNs-ключ: создан новый.
- Push в App ID: был включён ранее.
- projectId: совпадает.
- google-services.json: перекачан с двумя пакетами (com.codetau.terenai, com.codetau.terenai.dev).
- FCM V1 ключ: загружен для production и development.

## Проверки

- `node scripts/checks/pushConfig.check.mjs`: код 0, "pushConfig: OK", firebaseProjectId terenai.
- `grep -c private_key google-services.json` = 0.
- Diff app.config.ts в Task 3: одна добавленная строка `googleServicesFile: "./google-services.json"`.
- `git ls-files | grep -c firebase-adminsdk` = 0.
- Незакоммиченная работа D-20 не тронута (convex/auth.ts, app/auth/*, config/testingConfig.ts, api.d.ts, docs/*.html и др.).

## Отклонения от плана

Нет, план выполнен как написан.

## Наблюдения

- В app.config.ts не найдено явного значения apsEnvironment (поиск `aps-environment` / `apsEnv` пусто); оно, вероятно, задаётся конфигурацией плагина или профилем EAS, и для production-сборки должно быть `production`. Если в конфиге пуша окажется `apsEnvironment: 'development'`, это только наблюдение: проверить на устройстве в 72-07. Здесь ничего не менялось.
- Проверка на устройстве не выполнялась (это 72-07).

## Known Stubs

Нет.

## Threat Flags

Нет новых поверхностей. T-72-27 (клиентский ключ в google-services.json) принят по D-19.

## Self-Check: PASSED

- google-services.json, scripts/checks/pushConfig.check.mjs: найдены.
- Коммиты d5b74f3, 1df4c23: существуют.
