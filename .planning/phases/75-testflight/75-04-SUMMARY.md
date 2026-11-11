---
phase: 75-testflight
plan: 04
subsystem: deploy
tags: [convex, deploy, decision]
requires: [75-01]
provides:
  - Решение о prod-деплое серверной валидации из 75-01: not-applicable
key-files:
  modified: []
decisions:
  - "not-applicable: отдельного prod-деплоя Convex нет, TestFlight смотрит на тот же деплой, что и dev"
metrics:
  completed: 2026-11-11
  tasks: 2
requirements: [75-SC-3]
---

# Phase 75 Plan 04: Решение о prod-деплое Summary

Пользователь выбрал **not-applicable**. Деплой не выполнялся.

## Основания

- `.env.production.local` (результат `npm run env:pull:production`) указывает на `EXPO_PUBLIC_CONVEX_URL` того же деплоя, что и `.env.local` (dev, проект `terenai-dev`).
- В 71-03-SUMMARY уже записано, что отдельного production-деплоя у проекта нет.
- Серверные изменения 75-01 (`convex/glucose/createReading.ts`, `convex/bloodPressure/createReading.ts`, `convex/glucose/importHealthKitReadings.ts`) выкачены на этот деплой командой `npx convex dev --once` в плане 75-01.

## Выполнено

1. Task 1: решение получено от пользователя (not-applicable).
2. Task 2: команды деплоя не запускались, причина выше.

## Оговорка

Вывод о том, что TestFlight указывает на этот же деплой, основан на локальной копии окружения. Актуальное значение `EXPO_PUBLIC_CONVEX_URL` в EAS (окружение production) в рамках плана не сверялось. Если prod-деплой появится, серверные проверки диапазонов нужно выкатить на него командой `npx convex deploy` отдельным решением.
