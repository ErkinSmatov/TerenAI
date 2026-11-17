---
phase: 78-confirmed-observation
plan: 04
subsystem: convex/observers
tags: [observers, access-gate, link-lifecycle]
requires: [78-01, 78-03]
provides: [assertObserverAccess только для active, respondToRequest, cancelRequest, revokeLink со сменой статуса]
affects: [convex/utils/observerAuth.ts, convex/observers]
key-files:
  created:
    - convex/observers/respondToRequest.ts
    - convex/observers/cancelRequest.ts
    - scripts/checks/observerGate.check.mjs
  modified:
    - convex/utils/observerAuth.ts
    - convex/observers/revokeLink.ts
    - convex/_generated/api.d.ts
metrics:
  completed: 2026-11-17
---

# Phase 78 Plan 04: шлюз active и мутации жизненного цикла Summary

assertObserverAccess пускает наблюдателя только при активной связи (collect + some(isActiveLink)); пациент отвечает через respondToRequest, наблюдатель отменяет через cancelRequest, revokeLink меняет статус вместо удаления строк.

## Выполнено
- Задача 1 (b51bfa0): шлюз на collect + isActiveLink, observerGate.check.mjs.
- Задача 2 (2e42faa): respondToRequest (accept/decline, проверка пациента, истечение 14 дней), cancelRequest (revoked, endedBy observer), revokeLink (revoked, endedBy по роли, без delete).

## Deviations from Plan

**1. [Rule 3 - Blocking] npx convex codegen не запускался**
- Причина: требует деплоймент, в worktree недоступен. В api.d.ts вручную добавлены cancelRequest и respondToRequest (по алфавиту, как делает codegen); tsc проходит. Оркестратору можно перегенерировать codegen после слияния.

## Проверки
- node scripts/checks/observerGate.check.mjs: OK
- npx tsc --noEmit: 0 ошибок
- eslint convex/observers и observerAuth.ts: чисто
- npm run script:verifyLinkStatus: OK

## Known Stubs
Нет.

## Self-Check: PASSED
