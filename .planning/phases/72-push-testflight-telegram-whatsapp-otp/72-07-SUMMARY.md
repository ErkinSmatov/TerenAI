---
phase: 72-push-testflight-telegram-whatsapp-otp
plan: 07
subsystem: push-notifications
tags: [push, apns, fcm, testflight, eas, verification]
requires: [72-05]
provides:
  - Подтверждённая доставка push на iOS (TestFlight) и Android (production-apk)
  - Рабочий APNs-ключ в EAS для com.codetau.terenai
affects: [72-08]
key-files:
  created: []
  modified: []
key-decisions:
  - "Источник сборок: HEAD bb52b57/e2463c1 с phone-review (принятый риск T-72-31): рабочее дерево к моменту плана было закоммичено пользователем"
  - "Сборки смотрят на dev-деплоймент Convex keen-meerkat-110, не на prod tangible-lemur-465: на prod пока нет пользователей. Prod-деплой Convex пропущен"
  - "72-06 (Telegram) отложен пользователем; Telegram-проверки (10-13) перенесены в долг"
requirements-completed: [PUSH-01, MEALPUSH-01, WEIGH-01]
completed: 2026-10-19
---

# Phase 72 Plan 07: Проверка push на устройствах Summary

Push доставляется на iOS и Android. Telegram OTP и крон-напоминания не проверены (отложено).

## Результаты проверки

| Пункт | Результат | Подтверждение |
|---|---|---|
| iOS: aps-environment подписанной сборки | PASS | codesign: aps-environment = production, application-identifier YR2BT9R9W2.com.codetau.terenai |
| iOS: токен в pushTokens | PASS | platform ios, пользователь +77630000000, лог recordPushToken registered |
| iOS: доставка push | PASS | sendTestPush sent:true, checkPushReceipts summary {total:1, ok:1, error:0} |
| Android: токен в pushTokens | PASS | platform android, лог recordPushToken registered |
| Android: доставка push | PASS | checkPushReceipts summary {total:1, ok:1, error:0} |
| Крон напоминаний (9) | отложен | ждёт ближайшего напоминания |
| Telegram OTP на чужом номере (10), ошибки (11-13) | отложены | 72-06 пропущен, баланс Gateway не пополнен (минимум $100 на Fragment) |
| EAS preview без ошибки пакета .dev (D-18) | не проверялось | необязательно |

## Причина сбоя push на iOS (D-13) и как исправлено

Сервер и клиент были исправны. Сбой был в APNs-ключе, привязанном к проекту в EAS. Цепочка ошибок квитанций:

1. InvalidProviderToken (403): ключ 8ZJW7KPY2J недействителен/отозван.
2. BadEnvironmentKeyInToken (403): ключ 39375WBPFS ограничен по окружению (не Sandbox & Production).
3. TopicDisallowed (400): ключ GYUGYW724U ограничен по топику.
4. Рабочий ключ: 3L2AKRG2DC (Team Scoped, Sandbox & Production), привязан к com.codetau.terenai в EAS.

Пересборка приложения не потребовалась: Expo берёт ключ с сервера.

## Сборки

- iOS: профиль production, --auto-submit, отправлено в TestFlight.
- Android: профиль production-apk, установлен на устройство.
- git: HEAD до и после сборок совпадает (e2463c1), EAS ничего не закоммитил (D-20).
- Коммит e2463c1: отдельный фикс eslint в confirm-meal.tsx (ошибки из фазы 71, блокировали pre-deploy проверки).

## Отклонения от плана

- Prod-деплой Convex (`npx convex deploy`) не выполнялся: сборки направлены на dev. Dev обновлялся через `npx convex dev --once`.
- Task 1 (источник деплоя): вариант clean-head стал невозможен (phone-review закоммичен в HEAD); выбран HEAD с phone-review.

## Долг и риски

- Перед выходом в production: переключить EXPO_PUBLIC_CONVEX_URL в EAS environment production и .env.production.local с keen-meerkat-110 на tangible-lemur-465 и выполнить `npx convex deploy`.
- Вход phone-review (+77630000000 без кода) попадёт на prod вместе с кодом (риск T-72-31, принят).
- Telegram OTP: пополнить Gateway (минимум $100) или принять решение об альтернативе; затем проверки 10-13.
- Проверка крон-напоминаний на устройстве.
