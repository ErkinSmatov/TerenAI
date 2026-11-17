---
phase: 78-confirmed-observation
plan: 01
subsystem: observers
tags: [state-machine, tdd, link-status]
requires: []
provides:
  - "lib/observers/linkStatus.ts: чистый автомат статусов связи наблюдателя"
  - "npm run script:verifyLinkStatus"
affects: [78-03, 78-04, 78-05, 78-06, 78-07, 78-08, 78-09, 78-10, 78-11]
tech-stack:
  added: []
  patterns: ["чистый модуль без convex и Date.now()", "verify-скрипт на node:assert"]
key-files:
  created:
    - lib/observers/linkStatus.ts
    - scripts/verifyLinkStatus.ts
  modified:
    - package.json
key-decisions:
  - "Отмена запроса наблюдателем хранится как revoked (допущение A6)"
  - "Legacy-строка без статуса трактуется как active до миграции D-13"
requirements-completed: [LINK-01, LINK-02, LINK-03, LINK-05]
metrics:
  tasks: 2
  files: 3
  completed: 2026-11-17
---

# Phase 78 Plan 01: Автомат статусов связи Summary

Чистый модуль `lib/observers/linkStatus.ts` с таблицей переходов по ролям, сроками pending/cooldown (D-08, D-10), выбором эффективной связи и пометкой врача только при verified (D-11), плюс verify-скрипт на 64 assert.

## Выполнение

- Задача 1 (RED): `ced139a` — verify-скрипт, npm-скрипт, заглушка; скрипт падал с "not implemented".
- Задача 2 (GREEN): реализация модуля; `verifyLinkStatus: OK`, `npx tsc --noEmit` без ошибок.

## Deviations from Plan

- Базовый коммит worktree был не 89ef1a1, выполнен предписанный `git reset --hard 89ef1a1` после проверки ветки.
- В worktree не было node_modules: временно использован симлинк на node_modules основного репозитория (не закоммичен, удалён после проверок).

В остальном план выполнен как написан.

## Known Stubs

Нет.

## Threat Flags

Нет.

## Self-Check: PASSED
