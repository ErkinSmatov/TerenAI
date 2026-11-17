---
phase: 78-confirmed-observation
plan: 05
subsystem: convex/observers
tags: [observers, pending, push, cron, rate-limit]
requires: [78-01, 78-02, 78-03]
provides: [redeemCode-pending, expirePendingLinks-cron]
affects: [convex/observers/redeemCode.ts, convex/observers/expirePendingLinks.ts, convex/crons.ts]
key-files:
  created: [convex/observers/expirePendingLinks.ts]
  modified: [convex/observers/redeemCode.ts, convex/crons.ts, convex/_generated/api.d.ts]
decisions:
  - "redeemCode после списания лимитов возвращает { ok:false, error } вместо броска (бросок откатил бы лимиты)"
metrics:
  tasks: 2
  completed: 2026-11-17
---

# Phase 78 Plan 05: запрос наблюдения и авто-истечение Summary

redeemCode теперь создаёт pending-связь (cooldown 24 ч после отказа, push OBS-01 с дедупом и тихими часами), возвращает только linkId/status или код ошибки; ежечасный cron переводит pending старше 14 дней в expired пачками по 200.

## Выполнено
- Задача 1: переписан redeemCode.ts (REDEEM_ERRORS, resolveTransition, loadPairLinks/patchPairLinks, push через sendPushNotification, без данных пациента в ответе).
- Задача 2: expirePendingLinks.ts (internalMutation, byStatusAndRequestedAt, take(200), самопланирование продолжения) и cron "expire pending observer links" в crons.ts.

## Отклонения от плана
**[Rule 3 - Blocking]** `npx convex codegen` недоступен в worktree (нужен деплоймент), поэтому в `convex/_generated/api.d.ts` вручную добавлена запись модуля `observers/expirePendingLinks` (по образцу соседних). tsc и eslint проходят, код 0. Оркестратору стоит при необходимости перегенерировать codegen после merge.

## Проверки
tsc --noEmit: 0; eslint по трём файлам: 0. Скрипты verifyLinkStatus/verifyPushRules не запускались (не требуются правками этого плана, чистые модули не менялись).

## Known Stubs
Нет. UI (maps.tsx) пока игнорирует новый результат redeemCode — обрабатывается планом 07.

## Self-Check: PASSED
