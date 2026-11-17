---
phase: 78-confirmed-observation
plan: 06
subsystem: convex/observers
tags: [convex, observers, doctor-badge]
requires: [78-01, 78-03]
provides: [resolveObserverSummary, getIncomingRequests, getMyObservers active-only]
affects: [78-08, 78-09]
key-files:
  created:
    - convex/observers/utils/observerSummary.ts
    - convex/observers/getIncomingRequests.ts
  modified:
    - convex/observers/getMyObservers.ts
    - convex/_generated/api.d.ts
requirements: [LINK-02, LINK-05]
---

# Phase 78 Plan 06: Запросы стороны пациента Summary

getMyObservers отдаёт только активных наблюдателей, новый getIncomingRequests — непросроченные pending-запросы; пометка врача `{ clinic }` вычисляется на сервере только для verified.

## Выполнено
- resolveObserverSummary: displayName + doctor через resolveDoctorBadge; fullName и status наружу не отдаются.
- getMyObservers: группировка по observerId, pickEffectiveLink, только isActiveLink, linkedAt = confirmedAt ?? _creationTime.
- getIncomingRequests: без входа возвращает [], pending без просроченных (D-08), сортировка по requestedAt убыв.

## Deviations from Plan
**[Rule 3 - Blocking]** `npx convex codegen` недоступен (нет деплоймента в worktree), поэтому в convex/_generated/api.d.ts добавлены две строки для getIncomingRequests вручную; tsc проходит с кодом 0. Orchestrator может перегенерировать codegen после merge.

eslint по convex/observers чистый, tsc --noEmit чистый.

## Commits
- 5688efc: хелпер и getMyObservers
- второй коммит: getIncomingRequests + api.d.ts

## Self-Check: PASSED
