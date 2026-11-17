---
phase: 78-confirmed-observation
plan: 09
subsystem: mobile-ui
tags: [observers, maps, incoming-requests, doctor-label]
requires: [78-06, 78-07, 78-08]
provides:
  - "Блок «Запросы на наблюдение» на вкладке наблюдения"
  - "Пометка «Врач · Клиника» в ObserverCard"
key-files:
  modified:
    - components/observer/ObserverCard.tsx
    - app/app/(tabs)/maps.tsx
metrics:
  tasks: 2
  files: 2
  completed: 2026-11-17
---

# Phase 78 Plan 09: Запросы на наблюдение во вкладке наблюдения Summary

Блок входящих запросов с кнопками «Разрешить»/«Отклонить» на вкладке наблюдения и пометка «Врач · Клиника» у наблюдателей из серверного поля doctor.

## Задачи

1. ObserverCard: необязательный проп `doctorClinic`, пометка «Врач · {клиника}» (коммит 9089932).
2. maps.tsx: `getIncomingRequests` + `respondToRequest`, `handleRespond` с теми же Toast, что в ObservationRequestSheet, блок между вводом кода и табами (только при непустом списке), каждая карточка подтверждается отдельно; `doctorClinic={o.doctor?.clinic ?? null}` в списке наблюдателей (коммит 89f5205). handleRevoke не менялся.

## Проверка

tsc, eslint, themeColors.check — код 0.

## Deviations from Plan

Базовый коммит worktree был не тем (bb52b57); выполнен `git reset --hard 241af0f` по инструкции. Иначе плана исполнения: нет.

## Known Stubs

Нет.

## Self-Check: PASSED
