---
phase: 78-confirmed-observation
plan: 02
subsystem: notifications
tags: [push, catalog, deep-link]
requires: []
provides:
  - "OBS-01 push (класс A) в каталоге"
  - "ScheduledPushId для плановой рассылки"
  - "deep link /app/(tabs)/maps по белому списку"
affects: [78-05]
key-files:
  modified:
    - lib/notifications/pushCatalog.ts
    - convex/notifications/checkScheduledPushes.ts
    - scripts/verifyPushRules.ts
    - components/notifications/NotificationsProvider.tsx
decisions:
  - "OBS-01 класса A, вне LIMITED_PUSH_CLASSES и вне counts плановой рассылки"
  - "Имя наблюдателя в тексте push не используется"
metrics:
  completed: 2026-11-17
---

# Phase 78 Plan 02: push OBS-01 Summary

Транзакционный push OBS-01 («Запрос на наблюдение», класс A) встроен в каталог; плановая рассылка типизирована ScheduledPushId; нажатие ведёт на вкладку maps строго по белому списку.

## Задачи

1. OBS-01 в каталоге, ScheduledPushId в checkScheduledPushes, assert класса A в verifyPushRules — коммит с `feat(78-02): add OBS-01 class A push and ScheduledPushId`.
2. Ветка deep link `/app/(tabs)/maps` в navigateFromNotificationUrl (сравнение с литералом, без `router.push(url)`) — коммит `feat(78-02): whitelist deep link ...`.

## Проверка

verifyPushRules: OK; tsc --noEmit код 0; eslint по четырём файлам чист.

## Deviations from Plan

- Worktree был на другой базе — выполнен `git reset --hard 89ef1a1` по инструкции. Для проверок временно использован симлинк node_modules (не закоммичен).

## Known Stubs

Нет. Отправку OBS-01 реализует план 05.
