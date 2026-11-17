---
phase: 78-confirmed-observation
plan: 08
subsystem: components/observer, components/home
tags: [observers, bottom-sheet, home-header]
requires: [78-04, 78-06]
provides: [IncomingRequestCard, ObservationRequestSheet, кнопка наблюдения с бейджем]
affects: [78-09]
key-files:
  created:
    - components/observer/IncomingRequestCard.tsx
    - components/observer/ObservationRequestSheet.tsx
  modified:
    - components/home/HomeHeader.tsx
    - app/app/(tabs)/index.tsx
requirements: [LINK-02, LINK-05]
metrics:
  completed: 2026-11-17
---

# Phase 78 Plan 08: Запросы наблюдения на главной Summary

Bottom-sheet входящих запросов (всплывает один раз на новый linkId через seenRef) и кнопка наблюдения с бейджем-числом в HomeHeader; пометка «Врач · {клиника}» рисуется только из серверного поля doctor.

## Выполнено
- Задача 1: IncomingRequestCard (Разрешить/Отклонить, пометка врача, дата запроса) и ObservationRequestSheet (список, respondToRequest, Toast без деталей сервера).
- Задача 2: EyeIcon-кнопка с бейджем (9+) в HomeHeader ведёт на /app/(tabs)/maps; лист смонтирован в HomeScreen рядом с BadgeCelebrationModal.

## Deviations from Plan
- Базу worktree пришлось сбросить на 0b2e1d0 (по инструкции worktree_branch_check): HEAD стоял на старом коммите без файлов фазы 78.
- Добавлен `void` перед вызовами handleRespond в обработчиках (правило eslint no-misused-promises).

## Проверки
tsc --noEmit, eslint, themeColors.check: код 0.

## Known Stubs
Нет.

## Self-Check: PASSED
