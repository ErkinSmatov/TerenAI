---
phase: 78-confirmed-observation
plan: 07
subsystem: observer-ui
tags: [observers, pending, getObservedPatients, maps]
requires: [78-04, 78-05]
provides: [pending-stub-for-observer, PendingObservedCard, redeemCode-result-handling]
affects: [convex/observers/getObservedPatients.ts, app/app/(tabs)/maps.tsx]
key-files:
  created: [components/observer/PendingObservedCard.tsx]
  modified: [convex/observers/getObservedPatients.ts, app/app/(tabs)/maps.tsx, scripts/checks/observerGate.check.mjs]
metrics:
  tasks: 2
  completed: 2026-11-17
---

# Phase 78 Plan 07: сторона наблюдателя Summary

getObservedPatients отдаёт для pending только { status, linkId, requestedAt } без единого чтения данных пациента; на вкладке «Наблюдаемые» появилась карточка ожидания с отменой, ошибки redeemCode показываются нейтрально.

## Выполнено
- Задача 1 (1e2bdc5): связи группируются по пациенту через pickEffectiveLink, pending-ветка стоит до первого ctx.db.get, просроченные pending, declined, revoked, expired не возвращаются; сортировка по sortTime (confirmedAt или requestedAt). observerGate.check дополнен проверками порядка чтения и отсутствия throw после rateLimiter.limit в redeemCode.
- Задача 2: PendingObservedCard (без имени/email/телефона, отмена через AlertDialog); maps.tsx ветвит список, handleFilled обрабатывает { ok, error }, REQUEST_NOT_ACCEPTED показывается как «Запрос не принят.», добавлен handleCancel.

## Отклонения от плана
None - plan executed exactly as written. (Worktree был сброшен на базу 0b2e1d0 по штатной проверке.)

## Проверки
tsc --noEmit: 0; eslint по трём файлам: 0; themeColors.check: OK; observerGate.check: OK.

## Known Stubs
Нет.

## Self-Check: PASSED
