---
phase: 78-confirmed-observation
plan: 03
subsystem: convex-data-layer
tags: [convex, schema, migration, observerLinks, doctors]
requires: []
provides:
  - observerLinks status lifecycle fields (step 1, optional) and byStatusAndRequestedAt index
  - doctors table, internal createDoctor
  - backfillObserverLinkStatus migration
  - loadPairLinks / patchPairLinks helpers
affects: [78-04, 78-05, 78-06, 78-07, 78-11]
tech-stack:
  added: []
  patterns: [two-step schema migration, internalMutation upsert]
key-files:
  created:
    - convex/tables/doctors.ts
    - convex/doctors/createDoctor.ts
    - convex/observers/utils/pairLinks.ts
  modified:
    - convex/tables/observerLinks.ts
    - convex/schema.ts
    - convex/migrations.ts
    - convex/users/deleteUser.ts
    - convex/_generated/api.d.ts
key-decisions:
  - "status опционален до миграции (шаг 1), обязательность — план 11"
requirements-completed: [LINK-04, LINK-05]
duration: 10min
completed: 2026-11-17
---

# Phase 78 Plan 03: слой данных подтверждаемого наблюдения Summary

Схема observerLinks шага 1 (опциональные status/requestedAt/confirmedAt/respondedAt/endedBy/lastNotifiedAt + индекс byStatusAndRequestedAt), таблица doctors, идемпотентная миграция backfillObserverLinkStatus, internal createDoctor, очистка doctors в deleteUser и хелпер пары.

## Коммиты
- 67ef063: схема observerLinks, doctors, schema.ts, pairLinks
- 2ab9908: миграция, createDoctor, deleteUser

## Deviations from Plan

**1. [Rule 3 - Blocking] Верификация и codegen не выполнены**
- В worktree нет node_modules и деплоймента, поэтому `npx convex codegen`, `tsc` и `eslint` не запускались.
- `convex/_generated/api.d.ts` обновлён вручную (модули doctors/createDoctor и observers/utils/pairLinks). Рекомендуется прогнать codegen + tsc + eslint после слияния.
- Также: worktree был создан от неверной базы, выполнен `git reset --hard 89ef1a1` согласно инструкции.

## Known Stubs
Нет.

## Self-Check: PASSED (файлы созданы, коммиты существуют; tsc не запускался)
